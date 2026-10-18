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

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET || 'el7lmplatform';
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

// ─── Fetch All R2 Objects Directly ───────────────────────────
async function listAllR2Videos(maxItems = 5000): Promise<{ key: string; size: number; date: Date }[]> {
    const results: { key: string; size: number; date: Date }[] = [];
    let token: string | undefined;
    try {
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
    } catch (s3Err: any) {
        console.error('[list-r2] Cloudflare R2 listing error:', s3Err?.message || s3Err);
    }
    return results;
}

// ─── Execute Fetch Core With Protection ───────────────────────
async function fetchMediaData(): Promise<{ items: any[]; total: number }> {
    // 1. جلب الفيديوهات من Cloudflare R2
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

    // 3. مطابقة بيانات اللاعبين المستهدفين (~39 لاعب فقط)
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

        const fetchTargetedPlayers = async () => {
            if (uniqueUserIds.length === 0) return;

            try {
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
            } catch (err) {
                console.warn('[list-r2] players table targeted query error:', err);
            }
        };

        const fetchModeration = async () => {
            const allR2Keys = r2Objects.map(o => o.key);
            if (allR2Keys.length === 0) return;

            try {
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
            } catch (err) {
                console.warn('[list-r2] media_moderation query warning:', err);
            }
        };

        const timeoutPromise = new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('Supabase query timeout')), 3000)
        );

        await Promise.race([
            Promise.all([fetchTargetedPlayers(), fetchModeration()]),
            timeoutPromise,
        ]).catch(err => {
            console.warn('[list-r2] DB timeout fallback activated:', err?.message);
        });
    } catch (dbErr: any) {
        console.warn('[list-r2] Supabase admin init warning:', dbErr?.message);
    }

    // 4. بناء قائمة العناصر
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

    allItems.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());

    return { items: allItems, total: allItems.length };
}

// ─── Route Handler ───────────────────────────────────────────
export async function GET(req: NextRequest) {
    const authorization = await authorizeAdmin(req);
    if (!authorization.ok) return authorization.response;

    try {
        // 1. التحقق من الكاش الساري
        const cached = getCachedMedia(3 * 60 * 1000);
        if (cached) {
            return NextResponse.json({
                success: true,
                items: cached.items,
                total: cached.total,
                cached: true,
            });
        }

        // 2. دمج الطلبات المتزامنة لمنع تكرار الاستعلامات
        let fetchPromise = getInFlightFetch();
        if (!fetchPromise) {
            fetchPromise = fetchMediaData()
                .then(result => {
                    setCachedMedia(result.items, result.total);
                    setInFlightFetch(null);
                    return result;
                })
                .catch(err => {
                    setInFlightFetch(null);
                    console.error('[list-r2] In-flight fetch error:', err);
                    const stale = getStaleCachedMedia();
                    if (stale) return { items: stale.items, total: stale.total };
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
