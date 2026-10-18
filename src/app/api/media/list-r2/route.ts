/**
 * /api/media/list-r2
 * يجلب كل الميديا المرفوعة على Cloudflare R2 ويربطها ببيانات اللاعبين
 * مع نظام كاش ذكي (In-Memory Cache) وحماية فائقة لقاعدة بيانات Supabase (Nano compute)
 */

import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeAdmin } from '@/lib/api/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 45;

// ─── R2 Client ───────────────────────────────────────────────
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
    || process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID
    || '14521cdfec73fa908fbf7e760fae362a';

const CF_ENDPOINT = process.env.CLOUDFLARE_R2_ENDPOINT
    || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_ENDPOINT
    || `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const CF_ACCESS_KEY = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_ACCESS_KEY_ID;
const CF_SECRET_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_SECRET_ACCESS_KEY;

const s3 = new S3Client({
    region: 'auto',
    endpoint: CF_ENDPOINT,
    credentials: {
        accessKeyId: CF_ACCESS_KEY!,
        secretAccessKey: CF_SECRET_KEY!,
    },
    forcePathStyle: true,
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET || 'el7lmplatform';
const PUBLIC_URL = (
    process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL ||
    process.env.CLOUDFLARE_R2_PUBLIC_URL ||
    'https://assets.el7lm.com'
).replace(/\/$/, '');

// ─── In-Memory Cache & In-Flight Deduplication ────────────────
interface CacheEntry {
    items: any[];
    total: number;
    timestamp: number;
}
let cachedResponse: CacheEntry | null = null;
let inFlightFetch: Promise<{ items: any[]; total: number }> | null = null;
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 دقائق كاش

export function invalidateMediaCache() {
    cachedResponse = null;
}

// ─── Key Parser ──────────────────────────────────────────────
function parseKey(key: string): { userId: string; filename: string } | null {
    const parts = key.split('/');
    if (parts.length < 2) return null;
    const filename = parts[parts.length - 1];
    let userId = '';
    for (let i = parts.length - 2; i >= 0; i--) {
        const seg = parts[i];
        if (!['videos', 'avatars', 'additional-images', 'documents', 'uploads'].includes(seg)) {
            userId = seg;
            break;
        }
    }
    if (!userId && parts.length >= 2) {
        userId = parts[parts.length - 2];
    }
    return { userId, filename };
}

const filenameToTitle = (filename: string) =>
    filename.replace(/^\d+_?/, '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();

// ─── Fetch All R2 Objects Directly ───────────────────────────
async function listAllR2Videos(maxItems = 5000) {
    const results: { key: string; size: number; date: Date }[] = [];
    let token: string | undefined;
    do {
        const res = await s3.send(new ListObjectsV2Command({
            Bucket: BUCKET, MaxKeys: 1000, ContinuationToken: token,
        }));
        for (const obj of res.Contents || []) {
            if (!obj.Key || obj.Key.endsWith('/')) continue;
            const isVideo = /\.(mp4|mov|webm|m4v|avi|3gp|mkv)$/i.test(obj.Key) ||
                (obj.Key.includes('/videos/') && !/\.(jpg|jpeg|png|webp|gif|svg|pdf|doc|txt)$/i.test(obj.Key));
            if (isVideo) {
                results.push({ key: obj.Key, size: obj.Size || 0, date: obj.LastModified || new Date() });
            }
        }
        token = res.IsTruncated ? res.NextContinuationToken : undefined;
        if (results.length >= maxItems) break;
    } while (token);
    return results;
}

// ─── Execute Fetch Core With Protection ───────────────────────
async function fetchMediaData(): Promise<{ items: any[]; total: number }> {
    // 1. جلب الفيديوهات من Cloudflare R2 مباشرة (بدون لمس Supabase إطلاقاً)
    const r2Objects = await listAllR2Videos();

    // 2. تحليل المفاتيح واستخراج معرفات المستخدمين
    const parsedMap = new Map<string, { userId: string; filename: string }>();
    const r2UserIds = new Set<string>();
    for (const obj of r2Objects) {
        const p = parseKey(obj.key);
        if (!p) continue;
        parsedMap.set(obj.key, p);
        if (p.userId) r2UserIds.add(p.userId);
    }

    const uniqueUserIds = Array.from(r2UserIds);

    // 3. جلب بيانات اللاعبين المستهدفين فقط (~39 لاعب) بأعمدة خفيفة جداً ومع مهلة أمان
    type PlayerLight = {
        id: string;
        uid?: string;
        name: string;
        email: string;
        phone: string;
        image: string;
        country: string;
        position: string;
    };
    const playerMap = new Map<string, PlayerLight>();
    const moderationMap = new Map<string, any>();

    try {
        const db = getSupabaseAdmin();

        // استعلام خفيف جداً يقتصر على المعرفات المستخرجة من R2 فقط
        const fetchTargetedPlayers = async () => {
            if (uniqueUserIds.length === 0) return;

            // أ) البحث بالـ id
            const { data: playersById, error: errById } = await db
                .from('players')
                .select('id, uid, full_name, name, email, phone, phoneNumber, profile_image_url, profile_image, country, nationality, position, primary_position')
                .in('id', uniqueUserIds);

            if (!errById && playersById) {
                for (const p of playersById) {
                    const info: PlayerLight = {
                        id: p.id,
                        uid: p.uid,
                        name: p.full_name || p.name || 'لاعب مسجل',
                        email: p.email || '',
                        phone: p.phone || p.phoneNumber || '',
                        image: p.profile_image_url || p.profile_image || '',
                        country: p.country || p.nationality || '',
                        position: p.position || p.primary_position || 'لاعب',
                    };
                    playerMap.set(p.id, info);
                    if (p.uid) playerMap.set(p.uid, info);
                }
            }

            // ب) للـ userIds غير الموجودة في id، نبحث في عمود uid
            const remainingUids = uniqueUserIds.filter(u => !playerMap.has(u));
            if (remainingUids.length > 0) {
                const { data: playersByUid } = await db
                    .from('players')
                    .select('id, uid, full_name, name, email, phone, phoneNumber, profile_image_url, profile_image, country, nationality, position, primary_position')
                    .in('uid', remainingUids);

                if (playersByUid) {
                    for (const p of playersByUid) {
                        const info: PlayerLight = {
                            id: p.id,
                            uid: p.uid,
                            name: p.full_name || p.name || 'لاعب مسجل',
                            email: p.email || '',
                            phone: p.phone || p.phoneNumber || '',
                            image: p.profile_image_url || p.profile_image || '',
                            country: p.country || p.nationality || '',
                            position: p.position || p.primary_position || 'لاعب',
                        };
                        playerMap.set(p.id, info);
                        if (p.uid) playerMap.set(p.uid, info);
                    }
                }
            }
        };

        // استعلام الإشراف لمفاتيح R2 فقط
        const fetchModeration = async () => {
            const allR2Keys = r2Objects.map(o => o.key);
            if (allR2Keys.length === 0) return;

            for (let i = 0; i < allR2Keys.length; i += 200) {
                const chunk = allR2Keys.slice(i, i + 200);
                const { data } = await db
                    .from('media_moderation')
                    .select('r2_key, status, notes, ai_analysis, ai_rating, ai_analyzed_at')
                    .in('r2_key', chunk);

                for (const m of data || []) {
                    moderationMap.set(m.r2_key, m);
                }
            }
        };

        // تنفيذ الاستعلامين مع مهلة أمان صارمة (2.5 ثانية) لمنع أي تعليق
        const timeoutPromise = new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('Supabase query timeout')), 2500)
        );

        await Promise.race([
            Promise.all([fetchTargetedPlayers(), fetchModeration()]),
            timeoutPromise,
        ]);
    } catch (dbErr: any) {
        console.warn('[list-r2] Supabase fetch fallback (DB offline or restarting):', dbErr.message);
    }

    // 4. بناء قائمة الميديا النهائية
    const allItems: any[] = [];
    for (let idx = 0; idx < r2Objects.length; idx++) {
        const obj = r2Objects[idx];
        const parsed = parsedMap.get(obj.key);
        if (!parsed) continue;

        const { userId, filename } = parsed;
        const player = playerMap.get(userId);
        const mod = moderationMap.get(obj.key);
        const url = `${PUBLIC_URL}/${obj.key}`;

        allItems.push({
            id: `r2_${Buffer.from(obj.key).toString('base64').replace(/[+/=]/g, '').substring(0, 40)}`,
            r2Key: obj.key,
            type: 'video',
            title: filenameToTitle(filename) || `فيديو R2 ${idx + 1}`,
            description: '',
            url,
            thumbnailUrl: undefined,
            uploadDate: obj.date.toISOString(),
            status: mod?.status || 'pending',
            notes: mod?.notes || undefined,
            aiAnalysis: mod?.ai_analysis || undefined,
            aiRating: mod?.ai_rating || undefined,
            aiAnalyzedAt: mod?.ai_analyzed_at || undefined,
            userId: player?.id || userId,
            userName: player?.name || `مستخدم (${userId.substring(0, 8)})`,
            userEmail: player?.email || '',
            userPhone: player?.phone || '',
            userImage: player?.image || '',
            accountType: 'player',
            country: player?.country || '',
            position: player?.position || 'لاعب',
            views: 0,
            likes: 0,
            sourceType: 'r2',
            category: 'رفع سحابي R2',
            fileSize: obj.size,
        });
    }

    // ترتيب من الأحدث للأقدم
    allItems.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());

    return { items: allItems, total: allItems.length };
}

// ─── Route Handler ───────────────────────────────────────────
export async function GET(req: NextRequest) {
    const authorization = await authorizeAdmin(req);
    if (!authorization.ok) return authorization.response;

    try {
        const now = Date.now();
        // فحص الكاش في الذاكرة
        if (cachedResponse && (now - cachedResponse.timestamp) < CACHE_TTL_MS) {
            return NextResponse.json({
                success: true,
                items: cachedResponse.items,
                total: cachedResponse.total,
                cached: true,
            });
        }

        // دمج الطلبات المتزامنة (Deduplication) لمنع تكرار الاتصال بـ Cloudflare أو Supabase
        if (!inFlightFetch) {
            inFlightFetch = fetchMediaData()
                .then(result => {
                    cachedResponse = {
                        items: result.items,
                        total: result.total,
                        timestamp: Date.now(),
                    };
                    inFlightFetch = null;
                    return result;
                })
                .catch(err => {
                    inFlightFetch = null;
                    throw err;
                });
        }

        const data = await inFlightFetch;

        return NextResponse.json({
            success: true,
            items: data.items,
            total: data.total,
        });

    } catch (e: any) {
        console.error('[list-r2] Error:', e);
        // إذا كان هناك كاش قديم حتى وإن انتهت صلاحيته نرجعه كطوق نجاة
        if (cachedResponse) {
            return NextResponse.json({
                success: true,
                items: cachedResponse.items,
                total: cachedResponse.total,
                stale: true,
            });
        }
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
