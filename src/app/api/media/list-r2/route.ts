/**
 * /api/media/list-r2
 * يجلب كل الميديا من مصدرين:
 *   1. Cloudflare R2  — فيديوهات مرفوعة مباشرة (videos/{userId}/..., avatars/videos/...)
 *   2. Supabase       — فيديوهات مسجلة في ملفات اللاعبين + صور
 */

import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeAdmin } from '@/lib/api/admin-auth';

export const runtime     = 'nodejs';
export const dynamic     = 'force-dynamic';
export const maxDuration = 45;

// ─── R2 Client ───────────────────────────────────────────────
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
    || process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID
    || '14521cdfec73fa908fbf7e760fae362a';

const CF_ENDPOINT   = process.env.CLOUDFLARE_R2_ENDPOINT
    || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_ENDPOINT
    || `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const CF_ACCESS_KEY = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_ACCESS_KEY_ID;
const CF_SECRET_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_SECRET_ACCESS_KEY;

const s3 = new S3Client({
    region: 'auto',
    endpoint: CF_ENDPOINT,
    credentials: {
        accessKeyId:     CF_ACCESS_KEY!,
        secretAccessKey: CF_SECRET_KEY!,
    },
    forcePathStyle: true,
});

const BUCKET     = process.env.CLOUDFLARE_R2_BUCKET || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET || 'el7lmplatform';
const PUBLIC_URL = (
    process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL ||
    process.env.CLOUDFLARE_R2_PUBLIC_URL ||
    'https://assets.el7lm.com'
).replace(/\/$/, '');

const PUBLIC_ORIGIN = (() => {
    try {
        return new URL(PUBLIC_URL).origin;
    } catch {
        return PUBLIC_URL;
    }
})();

// ─── URL helpers ─────────────────────────────────────────────
const resolveUrl = (val: unknown): string => {
    if (!val) return '';
    if (typeof val === 'object' && !Array.isArray(val)) {
        const obj = val as Record<string, unknown>;
        return resolveUrl(obj.url || obj.src || obj.path || obj.uri || '');
    }
    const s = String(val).trim();
    if (!s || s === 'null' || s === 'undefined') return '';
    if (s.startsWith('data:') || s.startsWith('blob:')) return s;

    // استبعاد النطاقات الوهمية والتجريبية
    const DUMMY_DOMAINS = ['test.com', 'example.com', 'sample.com', 'placeholder.com'];
    if (DUMMY_DOMAINS.some(d => s.toLowerCase().includes(d))) return '';

    // Supabase Storage → Cloudflare R2
    if (s.includes('supabase.co/storage/v1/object/public/')) {
        const after = s.split('/storage/v1/object/public/')[1] || '';
        return after ? `${PUBLIC_URL}/${after}` : '';
    }

    if (s.startsWith('http://') || s.startsWith('https://')) return s;
    if (s.startsWith('//')) return `https:${s}`;

    return `${PUBLIC_URL}/${s.replace(/^\//, '')}`;
};

const extractAssetKey = (url: string): string | null => {
    try {
        const parsed = new URL(url);
        if (parsed.origin !== PUBLIC_ORIGIN && !parsed.hostname.includes('r2.dev') && !parsed.hostname.includes('assets.el7lm.com')) return null;
        return decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
    } catch {
        return null;
    }
};

function extractArr(raw: unknown): any[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'object') {
        const vals = Object.values(raw as Record<string, unknown>);
        if (vals.length && typeof vals[0] === 'object') return vals;
    }
    if (typeof raw === 'string') {
        try { return extractArr(JSON.parse(raw)); } catch { /* ignore */ }
    }
    return [];
}

const isExternal = (url: string) =>
    url.includes('youtube.com') || url.includes('youtu.be') ||
    url.includes('tiktok.com')  || url.includes('vimeo.com') ||
    url.includes('instagram.com');

const getYtThumb = (url: string): string | undefined => {
    const m = url.match(/(?:youtu\.be\/|v=|shorts\/)([^?&\s]+)/);
    return m ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : undefined;
};

const filenameToTitle = (filename: string) =>
    filename.replace(/^\d+_?/, '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();

function shortHash(str: string): string {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) - h + str.charCodeAt(i)) >>> 0;
    }
    return h.toString(36);
}

// ─── R2 listing ──────────────────────────────────────────────
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

async function listAll(maxItems = 5000) {
    const results: { key: string; size: number; date: Date }[] = [];
    let token: string | undefined;
    do {
        const res = await s3.send(new ListObjectsV2Command({
            Bucket: BUCKET, MaxKeys: 1000, ContinuationToken: token,
        }));
        for (const obj of res.Contents || []) {
            if (!obj.Key || obj.Key.endsWith('/')) continue;
            // فحص امتدادات الفيديو أو المسارات الخاصة بالفيديوهات
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

// ─── Route ───────────────────────────────────────────────────
export async function GET(req: NextRequest) {
    const authorization = await authorizeAdmin(req);
    if (!authorization.ok) return authorization.response;
    try {
        const db = getSupabaseAdmin();

        // ══════════════════════════════════════════
        // 1. قائمة فيديوهات Cloudflare R2
        // ══════════════════════════════════════════
        let r2Objects: { key: string; size: number; date: Date }[] = [];
        try {
            r2Objects = await listAll();
        } catch (r2Err: any) {
            console.error('[list-r2] R2 listing error:', r2Err.message);
        }

        // استخراج userIds من مسارات R2
        const parsedMap = new Map<string, { userId: string; filename: string }>();
        const r2UserIds = new Set<string>();
        for (const obj of r2Objects) {
            const p = parseKey(obj.key);
            if (!p) continue;
            parsedMap.set(obj.key, p);
            if (p.userId) r2UserIds.add(p.userId);
        }

        // ══════════════════════════════════════════
        // 2. جلب بيانات اللاعبين من Supabase
        // ══════════════════════════════════════════
        const allPlayers: any[] = [];
        const pageSize = 1000;
        let from = 0;
        while (true) {
            const { data: chunk, error: chunkErr } = await db
                .from('players')
                .select(
                    'id, uid, full_name, name, email, phone, phoneNumber, ' +
                    'profile_image_url, profile_image, ' +
                    'country, nationality, position, primary_position, ' +
                    'videos, images, additional_images, media, gallery, firebaseUid'
                )
                .range(from, from + pageSize - 1);
            if (chunkErr) {
                console.error('[list-r2] players fetch error:', chunkErr.message);
                break;
            }
            if (!chunk || chunk.length === 0) break;
            allPlayers.push(...chunk);
            if (chunk.length < pageSize) break;
            from += pageSize;
        }

        type PlayerInfo = {
            supabaseId: string; name: string; email: string;
            phone: string; image: string; country: string; position: string;
            videos: unknown; images: unknown;
        };
        const playerMap = new Map<string, PlayerInfo>();

        const buildInfo = (p: any): PlayerInfo => {
            const rawImage =
                p.profile_image_url || p.profile_image ||
                p.avatar_url        || p.avatarUrl     || '';
            const images =
                p.additional_images || p.images ||
                p.media             || p.gallery || null;
            return {
                supabaseId: p.id,
                name:     p.full_name || p.name || 'غير معروف',
                email:    p.email    || '',
                phone:    p.phone    || p.phoneNumber || '',
                image:    resolveUrl(rawImage),
                country:  p.country  || p.nationality || '',
                position: p.position || p.primary_position || '',
                videos:   p.videos,
                images,
            };
        };

        for (const p of allPlayers) {
            const info = buildInfo(p);
            playerMap.set(p.id, info);
            if (p.uid)          playerMap.set(p.uid, info);
            if (p.firebaseUid)  playerMap.set(p.firebaseUid, info);
            if (p.firebase_uid) playerMap.set(p.firebase_uid, info);
        }

        // مطابقة المعرفات غير الموجودة في players مع جدول users (حسابات المدربين، الأكاديميات، إلخ)
        const unmappedUserIds = Array.from(r2UserIds).filter(uid => !playerMap.has(uid));
        if (unmappedUserIds.length > 0) {
            try {
                for (let i = 0; i < unmappedUserIds.length; i += 100) {
                    const chunkIds = unmappedUserIds.slice(i, i + 100);
                    const { data: userRows } = await db
                        .from('users')
                        .select('id, name, full_name, email, phone, phone_number, role, account_type, avatar_url, profile_image')
                        .in('id', chunkIds);
                    for (const u of userRows || []) {
                        const info: PlayerInfo = {
                            supabaseId: u.id,
                            name: u.full_name || u.name || 'مستخدم المنصة',
                            email: u.email || '',
                            phone: u.phone || u.phone_number || '',
                            image: resolveUrl(u.avatar_url || u.profile_image || ''),
                            country: '',
                            position: u.role || u.account_type || 'لاعب',
                            videos: null,
                            images: null,
                        };
                        playerMap.set(u.id, info);
                    }
                }
            } catch (uErr: any) {
                console.warn('[list-r2] unmapped users lookup warning:', uErr.message);
            }
        }

        // ══════════════════════════════════════════
        // 3. بناء MediaItems من Cloudflare R2
        // ══════════════════════════════════════════
        const allItems: any[] = [];
        const seenUrls = new Set<string>();

        for (let idx = 0; idx < r2Objects.length; idx++) {
            const obj    = r2Objects[idx];
            const parsed = parsedMap.get(obj.key);
            if (!parsed) continue;

            const { userId, filename } = parsed;
            const player = playerMap.get(userId);
            const url    = `${PUBLIC_URL}/${obj.key}`;
            seenUrls.add(url.toLowerCase());
            seenUrls.add(obj.key.toLowerCase());

            allItems.push({
                id:          `r2_${Buffer.from(obj.key).toString('base64').replace(/[+/=]/g, '').substring(0, 40)}`,
                r2Key:       obj.key,
                type:        'video',
                title:       filenameToTitle(filename) || `فيديو R2 ${idx + 1}`,
                description: '',
                url,
                thumbnailUrl: undefined,
                uploadDate:  obj.date.toISOString(),
                status:      'pending',
                userId:      player?.supabaseId || userId,
                userName:    player?.name  || `مستخدم (${userId.substring(0, 8)})`,
                userEmail:   player?.email || '',
                userPhone:   player?.phone || '',
                userImage:   player?.image || '',
                accountType: 'player',
                country:     player?.country  || '',
                position:    player?.position || '',
                views: 0, likes: 0,
                sourceType:  'r2',
                category:    'رفع سحابي R2',
                fileSize:    obj.size,
            });
        }

        // ══════════════════════════════════════════
        // 4. فيديوهات وصور مسجلة في ملفات اللاعبين
        // ══════════════════════════════════════════
        const processedIds = new Set<string>();
        for (const p of allPlayers) {
            if (processedIds.has(p.id)) continue;
            processedIds.add(p.id);
            const player = playerMap.get(p.id);
            if (!player) continue;

            // ── فيديوهات بروفايل اللاعب ──
            const vids = extractArr(player.videos);
            for (let i = 0; i < vids.length; i++) {
                const v = vids[i];
                const raw = typeof v === 'string' ? { url: v } : v;
                const url = resolveUrl(raw?.url);
                if (!url) continue;

                // تخطي الفيديوهات التي تم جلبها مباشرة من R2 لمنع التكرار
                if (seenUrls.has(url.toLowerCase())) continue;
                seenUrls.add(url.toLowerCase());

                const external = isExternal(url);
                const urlHash = shortHash(url);
                const r2Key = external
                    ? `ext/${player.supabaseId}/video/${urlHash}`
                    : (extractAssetKey(url) || `direct/${player.supabaseId}/video/${urlHash}`);

                allItems.push({
                    id:          `${external ? 'extv' : 'r2v'}_${player.supabaseId}_${urlHash}`,
                    r2Key,
                    type:        'video',
                    title:       raw.title || raw.desc?.substring(0, 60) || (external ? `فيديو خارجي ${i + 1}` : `فيديو مرفوع ${i + 1}`),
                    description: raw.desc || raw.description || '',
                    url,
                    thumbnailUrl: external ? getYtThumb(url) : undefined,
                    uploadDate:  raw.uploadedAt || raw.createdAt || new Date().toISOString(),
                    status:      raw.status || 'pending',
                    userId:      player.supabaseId,
                    userName:    player.name,
                    userEmail:   player.email,
                    userPhone:   player.phone,
                    userImage:   player.image,
                    accountType: 'player',
                    country:     player.country,
                    position:    player.position,
                    views: raw.views || 0,
                    likes: raw.likes || 0,
                    sourceType:  external ? 'firebase' : 'r2',
                    category:    external ? 'خارجي' : 'رفع سحابي R2',
                    fileSize:    undefined,
                });
            }

            // ── صور بروفايل اللاعب ──
            const imgs = extractArr(player.images);
            for (let i = 0; i < imgs.length; i++) {
                const img = imgs[i];
                const raw = typeof img === 'string' ? { url: img } : img;
                const url = resolveUrl(raw?.url);
                if (!url) continue;

                if (seenUrls.has(url.toLowerCase())) continue;
                seenUrls.add(url.toLowerCase());

                const urlHash = shortHash(url);
                const r2Key = `ext/${player.supabaseId}/image/${urlHash}`;
                allItems.push({
                    id:          `exti_${player.supabaseId}_${urlHash}`,
                    r2Key,
                    type:        'image',
                    title:       raw.title || raw.desc?.substring(0, 60) || `صورة ${i + 1}`,
                    description: raw.desc || raw.description || '',
                    url,
                    thumbnailUrl: url,
                    uploadDate:  raw.uploadedAt || raw.createdAt || new Date().toISOString(),
                    status:      raw.status || 'pending',
                    userId:      player.supabaseId,
                    userName:    player.name,
                    userEmail:   player.email,
                    userPhone:   player.phone,
                    userImage:   player.image,
                    accountType: 'player',
                    country:     player.country,
                    position:    player.position,
                    views: raw.views || 0,
                    likes: raw.likes || 0,
                    sourceType:  'r2',
                    category:    'صورة',
                    fileSize:    undefined,
                });
            }
        }

        // ══════════════════════════════════════════
        // 5. جلب حالات الإشراف من media_moderation
        // ══════════════════════════════════════════
        const allKeys = allItems.map((i: any) => i.r2Key);
        const moderationMap = new Map<string, any>();

        for (let i = 0; i < allKeys.length; i += 500) {
            const { data } = await db
                .from('media_moderation')
                .select('r2_key, status, notes, ai_analysis, ai_rating, ai_analyzed_at')
                .in('r2_key', allKeys.slice(i, i + 500));
            for (const m of data || []) moderationMap.set(m.r2_key, m);
        }

        // ══════════════════════════════════════════
        // 6. دمج بيانات الإشراف + ترتيب
        // ══════════════════════════════════════════
        const final = allItems.map((item: any) => {
            const mod = moderationMap.get(item.r2Key);
            if (!mod) return item;
            return {
                ...item,
                status:      mod.status          ?? item.status,
                notes:       mod.notes            || undefined,
                aiAnalysis:  mod.ai_analysis      || undefined,
                aiRating:    mod.ai_rating        || undefined,
                aiAnalyzedAt: mod.ai_analyzed_at  || undefined,
            };
        });

        final.sort((a: any, b: any) =>
            new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
        );

        return NextResponse.json({ success: true, items: final, total: final.length }, {
            headers: { 'Cache-Control': 'no-store' },
        });

    } catch (e: any) {
        console.error('[list-r2]', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
