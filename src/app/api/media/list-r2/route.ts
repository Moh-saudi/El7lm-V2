/**
 * /api/media/list-r2
 * يجلب كل الميديا المرفوعة على Cloudflare R2 ويربطها ببيانات اللاعبين
 * محمي بالكامل ضد أخطاء 500 ومزود بكاش في الذاكرة وحماية فائقة لقاعدة بيانات Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeAdmin } from '@/lib/api/admin-auth';
import {
    getCachedMedia,
    getStaleCachedMedia,
    setCachedMedia,
    getInFlightFetch,
    setInFlightFetch,
} from '@/lib/media/media-cache';
import { fixReceiptUrl } from '@/lib/utils/cloudflare-r2-utils';

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

const CF_ACCESS_KEY = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
    || process.env.CLOUDFLARE_ACCESS_KEY_ID
    || '979d63a7dd50597c3e862a8449c228e5';

const CF_SECRET_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
    || process.env.CLOUDFLARE_SECRET_ACCESS_KEY
    || 'ba3be1a4f5451c3a69d138c5c7db7026f2ed44bb3ff257dd815d97cba9360ac8';

const s3 = new S3Client({
    region: 'auto',
    endpoint: CF_ENDPOINT,
    credentials: {
        accessKeyId: CF_ACCESS_KEY,
        secretAccessKey: CF_SECRET_KEY,
    },
    forcePathStyle: true,
});

const rawBucket = (
    process.env.CLOUDFLARE_R2_BUCKET ||
    process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET ||
    'el7lmplatform'
).trim();
const BUCKET = (!rawBucket || rawBucket === 'assets' || rawBucket === 'ads') ? 'el7lmplatform' : rawBucket;
const PUBLIC_URL = (
    process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL ||
    process.env.CLOUDFLARE_R2_PUBLIC_URL ||
    'https://assets.el7lm.com'
).replace(/\/$/, '');

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

// ─── External Video Helpers ───────────────────────────────────
function cleanExternalVideoUrl(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    let url = raw.trim().replace(/[\r\n]+/g, ' ');
    if (!url) return null;

    const httpIdx = url.indexOf('http');
    if (httpIdx > 0) {
        url = url.substring(httpIdx).trim();
    } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (
            url.startsWith('www.') ||
            url.includes('tiktok.com') ||
            url.includes('youtube.com') ||
            url.includes('youtu.be') ||
            url.includes('facebook.com')
        ) {
            url = `https://${url}`;
        } else {
            return null;
        }
    }

    if (
        url.includes('ekyerljzfokqimbabzxm.supabase.co') ||
        url.includes('لا/يوجد') ||
        url.startsWith('la/')
    ) {
        return null;
    }

    const firstSpace = url.search(/\s/);
    if (firstSpace > 0) {
        url = url.substring(0, firstSpace);
    }

    try {
        new URL(url);
        return url;
    } catch {
        return null;
    }
}

function extractYouTubeId(url: string): string | null {
    const patterns = [
        /youtu\.be\/([^?&\s]+)/,
        /youtube\.com\/watch\?v=([^&\s]+)/,
        /youtube\.com\/shorts\/([^?&\s]+)/,
        /youtube\.com\/embed\/([^?&\s]+)/,
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
}

// ─── Fetch All R2 Objects Directly ───────────────────────────
async function listAllR2Videos(maxItems = 5000): Promise<{ key: string; size: number; date: Date }[]> {
    const candidateBuckets = Array.from(new Set([BUCKET, 'el7lmplatform'].filter(Boolean)));
    
    for (const b of candidateBuckets) {
        try {
            const results: { key: string; size: number; date: Date }[] = [];
            let token: string | undefined;
            do {
                const res = await s3.send(new ListObjectsV2Command({
                    Bucket: b, MaxKeys: 1000, ContinuationToken: token,
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

            if (results.length > 0) {
                return results;
            }
        } catch (s3Err: any) {
            console.error(`[list-r2] Cloudflare R2 listing error for bucket "${b}":`, s3Err?.message || s3Err);
        }
    }
    return [];
}

// ─── Execute Fetch Core With Protection ───────────────────────
async function fetchMediaData(): Promise<{ items: any[]; total: number }> {
    // 1. جلب الفيديوهات من التخزين السحابي
    const r2Objects = await listAllR2Videos();

    // 2. تحليل المفاتيح واستخراج معرفات المستخدمين والروابط لمنع التكرار
    const parsedMap = new Map<string, { userId: string; filename: string }>();
    const r2UserIds = new Set<string>();
    const r2KeysSet = new Set<string>();

    for (const obj of r2Objects) {
        const p = parseKey(obj.key);
        if (!p) continue;
        parsedMap.set(obj.key, p);
        if (p.userId) r2UserIds.add(p.userId);
        r2KeysSet.add(obj.key.toLowerCase());
        r2KeysSet.add(`${PUBLIC_URL}/${obj.key}`.toLowerCase());
    }

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
    const externalVideosList: Array<{ player: PlayerLight; video: any; index: number; cleanUrl: string }> = [];

    try {
        const db = getSupabaseAdmin();

        // أ. جلب اللاعبين الذين لديهم مصفوفة فيديوهات (YouTube, TikTok, الروابط الخارجية)
        const fetchPlayersWithVideos = async () => {
            try {
                const { data: playersWithVids, error: errVids } = await db
                    .from('players')
                    .select('id, uid, full_name, name, email, phone, phoneNumber, profile_image_url, profile_image, country, nationality, position, primary_position, videos')
                    .not('videos', 'is', null)
                    .limit(1000);

                if (!errVids && playersWithVids) {
                    for (const p of playersWithVids) {
                        const info: PlayerLight = {
                            id: p.id,
                            uid: p.uid,
                            name: p.full_name || p.name || 'لاعب مسجل',
                            email: p.email || '',
                            phone: p.phone || p.phoneNumber || '',
                            image: fixReceiptUrl(p.profile_image_url || p.profile_image) || '',
                            country: p.country || p.nationality || '',
                            position: p.position || p.primary_position || 'لاعب',
                        };
                        playerMap.set(p.id, info);
                        if (p.uid) playerMap.set(p.uid, info);

                        if (Array.isArray(p.videos)) {
                            p.videos.forEach((v: any, idx: number) => {
                                const clean = cleanExternalVideoUrl(v?.url);
                                if (!clean) return;

                                // منع تكرار فيديوهات التخزين السحابي المحملة مباشرة
                                const lower = clean.toLowerCase();
                                if (r2KeysSet.has(lower) || Array.from(r2KeysSet).some(k => lower.includes(k))) {
                                    return;
                                }

                                externalVideosList.push({
                                    player: info,
                                    video: v,
                                    index: idx,
                                    cleanUrl: clean,
                                });
                            });
                        }
                    }
                }
            } catch (vErr) {
                console.warn('[list-r2] players with videos query warning:', vErr);
            }
        };

        // ب. مطابقة بيانات لاعبي التخزين السحابي الذين لم تشملهم قائمة الفيديوهات
        const fetchTargetedPlayersForR2 = async () => {
            const uniqueUserIds = Array.from(r2UserIds);
            const remainingUids = uniqueUserIds.filter(u => !playerMap.has(u));
            if (remainingUids.length === 0) return;

            try {
                const { data: playersById, error: errById } = await db
                    .from('players')
                    .select('id, uid, full_name, name, email, phone, phoneNumber, profile_image_url, profile_image, country, nationality, position, primary_position')
                    .in('id', remainingUids);

                if (!errById && playersById) {
                    for (const p of playersById) {
                        const info: PlayerLight = {
                            id: p.id,
                            uid: p.uid,
                            name: p.full_name || p.name || 'لاعب مسجل',
                            email: p.email || '',
                            phone: p.phone || p.phoneNumber || '',
                            image: fixReceiptUrl(p.profile_image_url || p.profile_image) || '',
                            country: p.country || p.nationality || '',
                            position: p.position || p.primary_position || 'لاعب',
                        };
                        playerMap.set(p.id, info);
                        if (p.uid) playerMap.set(p.uid, info);
                    }
                }

                const stillRemaining = remainingUids.filter(u => !playerMap.has(u));
                if (stillRemaining.length > 0) {
                    const { data: playersByUid } = await db
                        .from('players')
                        .select('id, uid, full_name, name, email, phone, phoneNumber, profile_image_url, profile_image, country, nationality, position, primary_position')
                        .in('uid', stillRemaining);

                    if (playersByUid) {
                        for (const p of playersByUid) {
                            const info: PlayerLight = {
                                id: p.id,
                                uid: p.uid,
                                name: p.full_name || p.name || 'لاعب مسجل',
                                email: p.email || '',
                                phone: p.phone || p.phoneNumber || '',
                                image: fixReceiptUrl(p.profile_image_url || p.profile_image) || '',
                                country: p.country || p.nationality || '',
                                position: p.position || p.primary_position || 'لاعب',
                            };
                            playerMap.set(p.id, info);
                            if (p.uid) playerMap.set(p.uid, info);
                        }
                    }
                }
            } catch (err) {
                console.warn('[list-r2] players table targeted query error:', err);
            }
        };

        // ج. جلب سجلات الإشراف (media_moderation)
        const fetchModeration = async () => {
            const allR2Keys = r2Objects.map(o => o.key);
            const allExtKeys = externalVideosList.map(item => `ext/${item.player.id}/${item.index}`);
            const allKeys = Array.from(new Set([...allR2Keys, ...allExtKeys]));
            if (allKeys.length === 0) return;

            try {
                for (let i = 0; i < allKeys.length; i += 200) {
                    const chunk = allKeys.slice(i, i + 200);
                    const { data } = await db
                        .from('media_moderation')
                        .select('r2_key, status, notes, ai_analysis, ai_rating, ai_analyzed_at')
                        .in('r2_key', chunk);

                    for (const m of data || []) {
                        moderationMap.set(m.r2_key, m);
                    }
                }
            } catch (err) {
                console.warn('[list-r2] media_moderation query warning:', err);
            }
        };

        const timeoutPromise = new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('Supabase query timeout')), 12000)
        );

        await Promise.race([
            (async () => {
                await fetchPlayersWithVideos();
                await Promise.all([fetchTargetedPlayersForR2(), fetchModeration()]);
            })(),
            timeoutPromise,
        ]).catch(err => {
            console.warn('[list-r2] DB timeout fallback activated:', err?.message);
        });
    } catch (dbErr: any) {
        console.warn('[list-r2] Supabase admin init warning:', dbErr?.message);
    }

    // 4. بناء قائمة العناصر الموحدة (الهجين: سحابي مباشر + روابط خارجية)
    const allItems: any[] = [];

    // أ. إضافة عناصر التخزين السحابي المباشر
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
            title: filenameToTitle(filename) || `فيديو المنصة ${idx + 1}`,
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
            category: 'سحابي مباشر',
            fileSize: obj.size,
        });
    }

    // ب. إضافة عناصر الروابط الخارجية (YouTube, TikTok, وغيرها)
    for (let idx = 0; idx < externalVideosList.length; idx++) {
        const ext = externalVideosList[idx];
        const { player, video, index: vidIdx, cleanUrl } = ext;
        const extKey = `ext/${player.id}/${vidIdx}`;
        const mod = moderationMap.get(extKey);

        const ytId = extractYouTubeId(cleanUrl);
        const isYouTube = !!ytId;
        const isTikTok = cleanUrl.toLowerCase().includes('tiktok.com');

        // أولوية الحالة: جدول الإشراف media_moderation > مصفوفة اللاعب > بانتظار التحليل
        let status = 'pending';
        if (mod?.status && ['pending', 'approved', 'rejected', 'flagged'].includes(mod.status)) {
            status = mod.status;
        } else if (video.status && ['pending', 'approved', 'rejected', 'flagged'].includes(video.status)) {
            status = video.status;
        }

        // تحديد تاريخ الرفع
        let uploadDate = new Date();
        const rawDate = video.createdAt || video.created_at || video.updatedAt || video.updated_at || video.reviewDate;
        if (rawDate) {
            const parsed = new Date(rawDate);
            if (!isNaN(parsed.getTime())) uploadDate = parsed;
        }

        // تحديد الصورة المصغرة
        let thumb: string | undefined = fixReceiptUrl(video.thumbnail || video.thumbnailUrl);
        if (!thumb && ytId) {
            thumb = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
        }
        if (!thumb && player.image) {
            thumb = player.image;
        }

        let title = (video.title || video.desc || '').trim();
        if (!title || title.length > 80) {
            title = isYouTube
                ? `فيديو YouTube (${player.name})`
                : isTikTok
                ? `فيديو TikTok (${player.name})`
                : `فيديو خارجي (${player.name}) ${vidIdx + 1}`;
        }

        allItems.push({
            id: `ext_${player.id}_${vidIdx}`,
            r2Key: extKey,
            type: 'video',
            title,
            description: video.desc || video.description || '',
            url: cleanUrl,
            thumbnailUrl: thumb,
            uploadDate: uploadDate.toISOString(),
            status,
            notes: mod?.notes || video.notes || undefined,
            aiAnalysis: mod?.ai_analysis || video.aiAnalysis || undefined,
            aiRating: mod?.ai_rating || video.aiRating || undefined,
            aiAnalyzedAt: mod?.ai_analyzed_at || video.aiAnalyzedAt || undefined,
            userId: player.id,
            userName: player.name,
            userEmail: player.email,
            userPhone: player.phone,
            userImage: player.image,
            accountType: 'player',
            country: player.country,
            position: player.position,
            views: typeof video.views === 'number' ? video.views : 0,
            likes: typeof video.likes === 'number' ? video.likes : 0,
            sourceType: 'external',
            category: isYouTube ? 'YouTube' : isTikTok ? 'TikTok' : 'روابط خارجية',
            fileSize: 0,
        });
    }

    // ترتيب كل الفيديوهات من الأحدث إلى الأقدم
    allItems.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());

    return { items: allItems, total: allItems.length };
}

// ─── Route Handler ───────────────────────────────────────────
export async function GET(req: NextRequest) {
    const authorization = await authorizeAdmin(req);
    if (!authorization.ok) return authorization.response;

    try {
        const isBust = req.nextUrl.searchParams.get('refresh') === '1' || req.nextUrl.searchParams.get('refresh') === 'true';

        // 1. التحقق من الكاش الساري (إذا لم يكن هناك طلب تحديث قسري)
        if (!isBust) {
            const cached = getCachedMedia(3 * 60 * 1000);
            if (cached && cached.items && cached.items.length > 0) {
                return NextResponse.json({
                    success: true,
                    items: cached.items,
                    total: cached.total,
                    cached: true,
                });
            }
        }

        // 2. دمج الطلبات المتزامنة لمنع تكرار الاستعلامات
        let fetchPromise = getInFlightFetch();
        if (!fetchPromise || isBust) {
            fetchPromise = fetchMediaData()
                .then(result => {
                    // فقط نخزن بالكاش إذا توفرت بيانات حقيقية لتجنب قفل الكاش على نتائج فارغة
                    if (result.items && result.items.length > 0) {
                        setCachedMedia(result.items, result.total);
                    }
                    setInFlightFetch(null);
                    return result;
                })
                .catch(err => {
                    setInFlightFetch(null);
                    console.error('[list-r2] In-flight fetch error:', err);
                    const stale = getStaleCachedMedia();
                    if (stale && stale.items && stale.items.length > 0) return { items: stale.items, total: stale.total };
                    return { items: [], total: 0 };
                });
            setInFlightFetch(fetchPromise);
        }

        const data = await fetchPromise;

        return NextResponse.json({
            success: true,
            items: data.items,
            total: data.total,
        });

    } catch (e: any) {
        console.error('[list-r2] Top-level handler catch:', e);
        const stale = getStaleCachedMedia();
        if (stale) {
            return NextResponse.json({
                success: true,
                items: stale.items,
                total: stale.total,
                stale: true,
            });
        }
        // إرجاع كائن فارغ ناجح دائماً بدلاً من 500 لحماية واجهة المستخدم والمتصفح
        return NextResponse.json({
            success: true,
            items: [],
            total: 0,
            warning: e?.message || 'Media list temporarily unavailable',
        });
    }
}
