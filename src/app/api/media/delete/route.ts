/**
 * /api/media/delete
 * يحذف ملف من Cloudflare R2 ويزيل سجله من media_moderation
 * للفيديوهات الخارجية (ext/...) يحذف السجل فقط من media_moderation
 */

import { NextRequest, NextResponse } from 'next/server';
import { S3Client, DeleteObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeAdmin } from '@/lib/api/admin-auth';
import { sendFcmPush } from '@/lib/firebase/admin-fcm';
import { invalidateMediaCache } from '@/lib/media/media-cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
    || process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID
    || '14521cdfec73fa908fbf7e760fae362a';

const s3 = new S3Client({
    region: 'auto',
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_ENDPOINT
        || `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId:     (process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_ACCESS_KEY_ID)!,
        secretAccessKey: (process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_SECRET_ACCESS_KEY)!,
    },
    forcePathStyle: true,
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET || 'el7lmplatform';

interface DeleteItemInput {
    r2Key: string;
    sourceType?: string;
    userId?: string;
    videoUrl?: string;
    title?: string;
}

function extractUserIdFromKey(key: string): string | null {
    if (!key) return null;
    const parts = key.split('/');
    for (let i = 0; i < parts.length - 1; i++) {
        const seg = parts[i];
        if (!['videos', 'avatars', 'additional-images', 'documents', 'uploads', 'ext'].includes(seg) && seg.length > 5) {
            return seg;
        }
    }
    return null;
}

export async function DELETE(req: NextRequest) {
    const authorization = await authorizeAdmin(req);
    if (!authorization.ok) return authorization.response;

    try {
        const body = await req.json();
        const reason: string = (body.reason || '').trim();

        // تجميع العناصر المستهدفة للحذف سواء كان عنصراً منفرداً أو مصفوفة
        let rawItems: DeleteItemInput[] = [];
        if (Array.isArray(body.items) && body.items.length > 0) {
            rawItems = body.items;
        } else if (body.r2Key) {
            rawItems = [{
                r2Key: body.r2Key,
                sourceType: body.sourceType,
                userId: body.userId,
                videoUrl: body.videoUrl,
                title: body.title,
            }];
        }

        if (rawItems.length === 0) {
            return NextResponse.json({ success: false, error: 'لم يتم تحديد أي عناصر للحذف' }, { status: 400 });
        }

        const db = getSupabaseAdmin();
        const now = new Date().toISOString();

        // 1. استخراج مفاتيح Cloudflare R2 المستهدفة للحذف
        const r2KeysToDelete: string[] = [];
        const allKeys: string[] = [];

        rawItems.forEach(item => {
            if (!item.r2Key) return;
            allKeys.push(item.r2Key);
            const isR2File = (item.sourceType === 'r2' || !item.sourceType) && !item.r2Key.startsWith('ext/');
            if (isR2File) {
                r2KeysToDelete.push(item.r2Key);
            }
        });

        // تنفيذ الحذف من Cloudflare R2 (على دفعات 1000)
        let deletedFromR2Count = 0;
        if (r2KeysToDelete.length > 0) {
            const CHUNK_SIZE = 1000;
            for (let i = 0; i < r2KeysToDelete.length; i += CHUNK_SIZE) {
                const chunk = r2KeysToDelete.slice(i, i + CHUNK_SIZE);
                try {
                    await s3.send(new DeleteObjectsCommand({
                        Bucket: BUCKET,
                        Delete: {
                            Objects: chunk.map(k => ({ Key: k })),
                            Quiet: true,
                        },
                    }));
                    deletedFromR2Count += chunk.length;
                } catch (r2Err) {
                    console.error('[delete] R2 DeleteObjectsCommand batch error:', r2Err);
                    // محاولة الحذف الفردي كإجراء احتياطي
                    for (const k of chunk) {
                        try {
                            await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: k }));
                            deletedFromR2Count++;
                        } catch {}
                    }
                }
            }
        }

        // 2. إزالة السجلات من جدول media_moderation
        if (allKeys.length > 0) {
            await db.from('media_moderation').delete().in('r2_key', allKeys);
        }

        // 3. تجميع العناصر حسب المستخدم/اللاعب لتنظيف ملف اللاعب وإرسال الإشعار
        const itemsByUser = new Map<string, DeleteItemInput[]>();
        rawItems.forEach(item => {
            const uid = item.userId || extractUserIdFromKey(item.r2Key);
            if (uid) {
                const list = itemsByUser.get(uid) || [];
                list.push(item);
                itemsByUser.set(uid, list);
            }
        });

        // 4. تنظيف مصفوفة الفيديوهات في جدول players وإرسال الإشعارات
        let notificationsCount = 0;
        for (const [userId, userItems] of itemsByUser.entries()) {
            try {
                // أ. جلب فيديوهات اللاعب وتنظيف العناصر المحذوفة
                const { data: playerData } = await db
                    .from('players')
                    .select('id, uid, videos')
                    .or(`id.eq.${userId},uid.eq.${userId}`)
                    .limit(1)
                    .maybeSingle();

                if (playerData && Array.isArray(playerData.videos)) {
                    const keysSet = new Set(userItems.map(i => i.r2Key.toLowerCase()));
                    const urlsSet = new Set(userItems.filter(i => i.videoUrl).map(i => i.videoUrl!.toLowerCase()));

                    const updatedVideos = playerData.videos.filter((v: any) => {
                        if (!v?.url) return true;
                        const vUrl = String(v.url).toLowerCase();
                        if (urlsSet.has(vUrl)) return false;
                        for (const k of keysSet) {
                            if (vUrl.includes(k)) return false;
                        }
                        return true;
                    });

                    if (updatedVideos.length !== playerData.videos.length) {
                        await db
                            .from('players')
                            .update({ videos: updatedVideos, updated_at: now })
                            .eq('id', playerData.id);
                    }
                }

                // ب. إنشاء إشعار داخلي في جدول notifications لتطبيق الموبايل
                const titles = userItems
                    .map(i => i.title?.trim() || 'مقطع فيديو')
                    .filter(Boolean)
                    .slice(0, 3)
                    .join('، ');

                const notifTitle = 'تنبيه بخصوص مقاطع الفيديو 🎬';
                const notifMessage = reason
                    ? `تمت مراجعة مقطع الفيديو (${titles}) وإزالته: ${reason}`
                    : `تمت مراجعة مقطع الفيديو (${titles}) وإزالته من المنصة لعدم استيفائه معايير النشر.`;

                await db.from('notifications').insert({
                    id: crypto.randomUUID(),
                    userId,
                    title: notifTitle,
                    message: notifMessage,
                    body: notifMessage,
                    type: 'media_rejected',
                    priority: 'high',
                    read: false,
                    isRead: false,
                    metadata: {
                        action: 'deleted',
                        itemCount: userItems.length,
                        reason: reason || 'عدم استيفاء معايير النشر',
                    },
                    createdAt: now,
                    updatedAt: now,
                });
                notificationsCount++;

                // ج. إرسال إشعار فوري لتطبيق الجوال (FCM Push Notification)
                const { data: userTokens } = await db
                    .from('users')
                    .select('fcmToken, pushToken')
                    .or(`id.eq.${userId},uid.eq.${userId},supabase_uid.eq.${userId}`);

                const fcmTokens: string[] = [];
                (userTokens || []).forEach((r: Record<string, unknown>) => {
                    if (r.fcmToken && typeof r.fcmToken === 'string') fcmTokens.push(r.fcmToken);
                    if (r.pushToken && typeof r.pushToken === 'string') fcmTokens.push(r.pushToken);
                });

                const uniqueTokens = Array.from(new Set(fcmTokens)).filter(t => t.length > 10);
                if (uniqueTokens.length > 0) {
                    sendFcmPush(uniqueTokens, {
                        title: notifTitle,
                        body: notifMessage,
                        data: {
                            type: 'media_rejected',
                            action: 'deleted',
                            userId,
                        },
                    }).catch(pushErr => console.error('[delete] Push notification error:', pushErr));
                }
            } catch (userCleanupErr) {
                console.error(`[delete] Cleanup and notify error for user ${userId}:`, userCleanupErr);
            }
        }

        invalidateMediaCache();

        return NextResponse.json({
            success: true,
            count: rawItems.length,
            deletedFromR2: deletedFromR2Count,
            notificationsSent: notificationsCount,
            message: `تم حذف ${rawItems.length} عنصر بنجاح وإرسال الإشعارات للمستخدمين`,
        });

    } catch (e: any) {
        console.error('[delete]', e);
        return NextResponse.json({ success: false, error: e.message || 'حدث خطأ أثناء الحذف' }, { status: 500 });
    }
}
