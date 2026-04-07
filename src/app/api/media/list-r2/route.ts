/**
 * /api/media/list-r2
 * يجلب كل الميديا من مصدرين:
 *   1. Cloudflare R2  — فيديوهات مرفوعة مباشرة (videos/{userId}/...)
 *   2. Supabase       — فيديوهات خارجية (YouTube/TikTok/Vimeo) + صور مخزونة في players.videos/images
 *
 * SQL مطلوب (مرة واحدة في Supabase):
 * ──────────────────────────────────
 * CREATE TABLE IF NOT EXISTS media_moderation (
 *   r2_key TEXT PRIMARY KEY,
 *   status TEXT NOT NULL DEFAULT 'pending',
 *   reviewed_by TEXT, reviewed_at TIMESTAMPTZ,
 *   ai_analysis TEXT, ai_rating NUMERIC(3,1), ai_analyzed_at TIMESTAMPTZ,
 *   created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 */

import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime     = 'nodejs';
export const dynamic     = 'force-dynamic';
export const maxDuration = 45;

// ─── R2 Client ───────────────────────────────────────────────
const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId:     process.env.NEXT_PUBLIC_CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.NEXT_PUBLIC_CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    },
});

const BUCKET     = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET || 'el7lmplatform';
const PUBLIC_URL = (process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL || 'https://assets.el7lm.com').replace(/\/$/, '');

// ─── URL helpers ─────────────────────────────────────────────
const resolveUrl = (val: unknown): string => {
    if (!val) return '';
    if (typeof val === 'object' && !Array.isArray(val)) {
        const obj = val as Record<string, unknown>;
        return resolveUrl(obj.url || obj.src || obj.path || obj.uri || '');
    }
    const s = String(val).trim();
    if (!s || s === 'null' || s === 'undefined') return '';

    // Supabase Storage → Cloudflare R2
    // مثال: https://xxx.supabase.co/storage/v1/object/public/avatars/userId.jpg
    //     → https://assets.el7lm.com/avatars/userId.jpg  (نحتفظ باسم المجلد)
    if (s.includes('supabase.co/storage/v1/object/public/')) {
        const after = s.split('/storage/v1/object/public/')[1] || '';
        return after ? `${PUBLIC_URL}/${after}` : '';
    }

    // روابط خارجية عادية (Google، Firebase Storage، إلخ) — تُعاد كما هي
    if (s.startsWith('http://') || s.startsWith('https://')) return s;
    if (s.startsWith('//')) return `https:${s}`;

    // مسار نسبي → R2
    return `${PUBLIC_URL}/${s.replace(/^\//, '')}`;
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

/** hash بسيط من string لإنشاء معرّف ثابت */
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
    if (parts.length < 3) return null;
    if (parts[0] === 'videos' && parts[1] === 'videos' && parts.length >= 4)
        return { userId: parts[2], filename: parts.slice(3).join('/') };
    if (parts[0] === 'videos')
        return { userId: parts[1], filename: parts.slice(2).join('/') };
    return null;
}

async function listAll(prefix: string, maxItems = 2000) {
    const results: { key: string; size: number; date: Date }[] = [];
    let token: string | undefined;
    do {
        const res = await s3.send(new ListObjectsV2Command({
            Bucket: BUCKET, Prefix: prefix, MaxKeys: 1000, ContinuationToken: token,
        }));
        for (const obj of res.Contents || []) {
            if (!obj.Key || obj.Key.endsWith('/') || obj.Key === prefix) continue;
            results.push({ key: obj.Key, size: obj.Size || 0, date: obj.LastModified || new Date() });
        }
        token = res.IsTruncated ? res.NextContinuationToken : undefined;
        if (results.length >= maxItems) break;
    } while (token);
    return results;
}

// ─── Route ───────────────────────────────────────────────────
export async function GET(_req: NextRequest) {
    try {
        const db = getSupabaseAdmin();

        // ══════════════════════════════════════════
        // 1. قائمة فيديوهات R2
        // ══════════════════════════════════════════
        const r2Objects = await listAll('videos/');

        // استخرج userIds من مسارات R2
        const parsedMap = new Map<string, { userId: string; filename: string }>();
        const r2UserIds = new Set<string>();
        for (const obj of r2Objects) {
            const p = parseKey(obj.key);
            if (!p) continue;
            parsedMap.set(obj.key, p);
            r2UserIds.add(p.userId);
        }

        // ══════════════════════════════════════════
        // 2. جلب بيانات اللاعبين (كلهم للصور/خارجي، + مطابقة R2)
        // ══════════════════════════════════════════
        // جلب كل اللاعبين مع كل حقول الصور المحتملة
        const { data: allPlayers } = await db
            .from('players')
            .select('id, uid, firebaseUid, full_name, email, phone, profile_image_url, profile_image, image, country, position, videos, additional_images, gallery, media')
            .limit(500);

        type PlayerInfo = {
            supabaseId: string; name: string; email: string;
            phone: string; image: string; country: string; position: string;
            videos: unknown; images: unknown;
        };
        const playerMap = new Map<string, PlayerInfo>();

        const buildInfo = (p: any): PlayerInfo => {
            // جرّب كل الحقول المحتملة للصورة بالترتيب
            const rawImage =
                p.profile_image_url ||
                p.profile_image     ||
                p.image             || '';
            // الصور: additional_images هو الحقل الفعلي، ثم gallery، ثم media
            const images = p.additional_images || p.gallery || p.media || null;
            return {
                supabaseId: p.id,
                name:     p.full_name || 'غير معروف',
                email:    p.email    || '',
                phone:    p.phone    || '',
                image:    resolveUrl(rawImage),
                country:  p.country  || '',
                position: p.position || '',
                videos:   p.videos,
                images,
            };
        };

        for (const p of allPlayers || []) {
            const info = buildInfo(p as any);
            playerMap.set(p.id, info);
            if (p.uid)         playerMap.set(p.uid, info);
            if (p.firebaseUid) playerMap.set(p.firebaseUid, info);
        }

        // ══════════════════════════════════════════
        // 3. بناء MediaItems من R2
        // ══════════════════════════════════════════
        const allItems: any[] = [];

        for (let idx = 0; idx < r2Objects.length; idx++) {
            const obj    = r2Objects[idx];
            const parsed = parsedMap.get(obj.key);
            if (!parsed) continue;

            const { userId, filename } = parsed;
            const player = playerMap.get(userId);
            const url    = `${PUBLIC_URL}/${obj.key}`;

            allItems.push({
                id:          `r2_${Buffer.from(obj.key).toString('base64').replace(/[+/=]/g, '').substring(0, 40)}`,
                r2Key:       obj.key,
                type:        'video',
                title:       filenameToTitle(filename) || `فيديو ${idx + 1}`,
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
                category:    'عام',
                fileSize:    obj.size,
            });
        }

        // ══════════════════════════════════════════
        // 4. فيديوهات خارجية + صور من Supabase
        // ══════════════════════════════════════════
        // نكرر على اللاعبين مباشرة (لا على playerMap لتجنب التكرار)
        const processedIds = new Set<string>();
        for (const p of allPlayers || []) {
            if (processedIds.has(p.id)) continue;
            processedIds.add(p.id);
            const player = playerMap.get(p.id);
            if (!player) continue;

            // ── فيديوهات خارجية (YouTube / TikTok / Vimeo) ──
            const vids = extractArr(player.videos);
            vids.forEach((v: any, i: number) => {
                const raw = typeof v === 'string' ? { url: v } : v;
                const url = resolveUrl(raw?.url);
                if (!url || !isExternal(url)) return;

                // معرّف ثابت مبني على URL (لا يتغير لو أضاف اللاعب فيديو جديد)
                const urlHash = shortHash(url);
                const r2Key = `ext/${player.supabaseId}/video/${urlHash}`;
                allItems.push({
                    id:          `extv_${player.supabaseId}_${urlHash}`,
                    r2Key,
                    type:        'video',
                    title:       raw.title || raw.desc?.substring(0, 60) || `فيديو خارجي ${i + 1}`,
                    description: raw.desc || raw.description || '',
                    url,
                    thumbnailUrl: getYtThumb(url),
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
                    sourceType:  'firebase',
                    category:    isExternal(url) ? 'خارجي' : 'عام',
                    fileSize:    undefined,
                });
            });

            // ── صور ──
            const imgs = extractArr(player.images);
            imgs.forEach((img: any, i: number) => {
                const raw = typeof img === 'string' ? { url: img } : img;
                const url = resolveUrl(raw?.url);
                if (!url) return;

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
            });
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

        return NextResponse.json({ success: true, items: final, total: final.length });

    } catch (e: any) {
        console.error('[list-r2]', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
