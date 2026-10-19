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

        // 1. استخراج مفاتيح Cloudflare R2 المستهدفة للحذف الفعلي
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

        // 2. تجميع العناصر حسب المستخدم/اللاعب لمعالجة البروفايل والإشعار
        const itemsByUser = new Map<string, DeleteItemInput[]>();
        rawItems.forEach(item => {
            const uid = item.userId || extractUserIdFromKey(item.r2Key);
            if (uid) {
                const list = itemsByUser.get(uid) || [];
                list.push(item);
                itemsByUser.set(uid, list);
            }
        });

        // 3. مهمة حذف الملفات الفعلية من Cloudflare R2 (متوازية وسريعة)
        const deleteR2Task = (async (): Promise<number> => {
            if (r2KeysToDelete.length === 0) return 0;
            let deletedCount = 0;
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
                    deletedCount += chunk.length;
                } catch (r2Err) {
                    console.error('[delete] R2 DeleteObjectsCommand batch error, trying parallel fallback:', r2Err);
                    // تنفيذ متوازي للحذف الفردي في حال تعثر الدفعة
                    const fallbacks = await Promise.allSettled(
                        chunk.map(k => s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: k })))
                    );
                    deletedCount += fallbacks.filter(r => r.status === 'fulfilled').length;
                }
            }
            return deletedCount;
        })();

        // 4. مهمة حذف السجلات من جدول media_moderation
        const deleteModerationTask = (async () => {
            if (allKeys.length === 0) return;
            const { error } = await db.from('media_moderation').delete().in('r2_key', allKeys);
            if (error) console.error('[delete] media_moderation delete error:', error);
        })();

        // 5. مهمة تنظيف مصفوفة الفيديوهات في جدول players
        const userIdsList = Array.from(itemsByUser.keys());
        const cleanupPlayersTask = (async () => {
            if (userIdsList.length === 0) return;
            try {
                // جلب اللاعبين المعنيين دفعة واحدة (بالـ id أو الـ uid)
                const [{ data: playersById }, { data: playersByUid }] = await Promise.all([
                    db.from('players').select('id, uid, videos').in('id', userIdsList),
                    db.from('players').select('id, uid, videos').in('uid', userIdsList),
                ]);

                const combinedPlayers = [...(playersById || []), ...(playersByUid || [])];
                const uniquePlayersMap = new Map<string, any>();
                combinedPlayers.forEach(p => {
                    if (p && p.id && !uniquePlayersMap.has(p.id)) {
                        uniquePlayersMap.set(p.id, p);
                    }
                });

                const playerUpdates: Promise<any>[] = [];

                for (const player of uniquePlayersMap.values()) {
                    if (!Array.isArray(player.videos) || player.videos.length === 0) continue;

                    const playerItems = [
                        ...(itemsByUser.get(player.id) || []),
                        ...(player.uid ? (itemsByUser.get(player.uid) || []) : []),
                    ];
                    if (playerItems.length === 0) continue;

                    const keysSet = new Set(playerItems.map(i => i.r2Key.toLowerCase()));
                    const urlsSet = new Set(playerItems.filter(i => i.videoUrl).map(i => i.videoUrl!.toLowerCase()));

                    const updatedVideos = player.videos.filter((v: any) => {
                        if (!v?.url) return true;
                        const vUrl = String(v.url).toLowerCase();
                        if (urlsSet.has(vUrl)) return false;
                        for (const k of keysSet) {
                            if (vUrl.includes(k)) return false;
                        }
                        return true;
                    });

                    if (updatedVideos.length !== player.videos.length) {
                        playerUpdates.push(
                            Promise.resolve(
                                db.from('players')
                                    .update({ videos: updatedVideos, updated_at: now })
                                    .eq('id', player.id)
                            )
                        );
                    }
                }

                if (playerUpdates.length > 0) {
                    await Promise.allSettled(playerUpdates);
                }
            } catch (playerErr) {
                console.error('[delete] Players cleanup error:', playerErr);
            }
        })();

        // 6. مهمة إدراج الإشعارات في جدول notifications (دفعة واحدة فائقة السرعة)
        const insertNotificationsTask = (async (): Promise<number> => {
            if (itemsByUser.size === 0) return 0;
            const notificationRecords = Array.from(itemsByUser.entries()).map(([userId, userItems]) => {
                const titles = userItems
                    .map(i => i.title?.trim() || 'مقطع فيديو')
                    .filter(Boolean)
                    .slice(0, 3)
                    .join('، ');

                const notifTitle = 'تنبيه بخصوص مقاطع الفيديو 🎬';
                const notifMessage = reason
                    ? `تمت مراجعة مقطع الفيديو (${titles}) وإزالته: ${reason}`
                    : `تمت مراجعة مقطع الفيديو (${titles}) وإزالته من المنصة لعدم استيفائه معايير النشر.`;

                return {
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
                };
            });

            try {
                const { error } = await db.from('notifications').insert(notificationRecords);
                if (error) console.error('[delete] Batch notification insert error:', error);
                return notificationRecords.length;
            } catch (err) {
                console.error('[delete] Notification insert exception:', err);
                return 0;
            }
        })();

        // تنفيذ كافة العمليات الأساسية بالتوازي الفوري (Ultra-Fast Parallel Execution)
        const [deletedFromR2Count, , , notificationsCount] = await Promise.all([
            deleteR2Task,
            deleteModerationTask,
            cleanupPlayersTask,
            insertNotificationsTask,
        ]);

        // تنظيف الكاش
        invalidateMediaCache();

        // 7. إرسال إشعارات الموبايل (FCM Push Notifications) في الخلفية دون تعطيل الرد للمستخدم
        if (userIdsList.length > 0) {
            setImmediate(async () => {
                try {
                    const [{ data: tokensById }, { data: tokensByUid }] = await Promise.all([
                        db.from('users').select('id, uid, supabase_uid, fcmToken, pushToken').in('id', userIdsList),
                        db.from('users').select('id, uid, supabase_uid, fcmToken, pushToken').in('uid', userIdsList),
                    ]);

                    const allUserRows = [...(tokensById || []), ...(tokensByUid || [])];

                    for (const [userId, userItems] of itemsByUser.entries()) {
                        const matchedUsers = allUserRows.filter(u =>
                            u.id === userId || u.uid === userId || u.supabase_uid === userId
                        );

                        const fcmTokens: string[] = [];
                        matchedUsers.forEach((r: Record<string, unknown>) => {
                            if (r.fcmToken && typeof r.fcmToken === 'string') fcmTokens.push(r.fcmToken.trim());
                            if (r.pushToken && typeof r.pushToken === 'string') fcmTokens.push(r.pushToken.trim());
                        });

                        const uniqueTokens = Array.from(new Set(fcmTokens)).filter(t => t.length > 10);
                        if (uniqueTokens.length > 0) {
                            const titles = userItems
                                .map(i => i.title?.trim() || 'مقطع فيديو')
                                .filter(Boolean)
                                .slice(0, 3)
                                .join('، ');

                            const notifTitle = 'تنبيه بخصوص مقاطع الفيديو 🎬';
                            const notifMessage = reason
                                ? `تمت مراجعة مقطع الفيديو (${titles}) وإزالته: ${reason}`
                                : `تمت مراجعة مقطع الفيديو (${titles}) وإزالته من المنصة لعدم استيفائه معايير النشر.`;

                            sendFcmPush(uniqueTokens, {
                                title: notifTitle,
                                body: notifMessage,
                                data: {
                                    type: 'media_rejected',
                                    action: 'deleted',
                                    userId,
                                },
                            }).catch(pushErr => console.error(`[delete] FCM push error for user ${userId}:`, pushErr));
                        }
                    }
                } catch (fcmBgErr) {
                    console.error('[delete] Background FCM notification error:', fcmBgErr);
                }
            });
        }

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
