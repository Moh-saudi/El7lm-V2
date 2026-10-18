import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeAdmin } from '@/lib/api/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const authorization = await authorizeAdmin(req);
    if (!authorization.ok) return authorization.response;
    const db = getSupabaseAdmin();
    const mode = req.nextUrl.searchParams.get('mode') || 'players';

    if (mode === 'players') {
        // أول 5 لاعبين — نرى كل الحقول المتاحة
        const { data, error } = await db
            .from('players')
            .select('id, uid, firebaseUid, full_name, profile_image_url, profile_image, image, images, videos')
            .limit(5);

        return NextResponse.json({
            error: error?.message,
            count: data?.length,
            players: (data || []).map(p => ({
                id:                p.id,
                uid:               p.uid,
                firebaseUid:       p.firebaseUid,
                name:              p.full_name,
                profile_image_url: p.profile_image_url,
                profile_image:     (p as any).profile_image,
                image:             (p as any).image,
                // نعرض أول عنصر فقط من كل مصفوفة لتجنب الضخامة
                images_sample:     Array.isArray(p.images)  ? p.images.slice(0, 2)  : p.images,
                videos_sample:     Array.isArray(p.videos)  ? p.videos.slice(0, 2)  : p.videos,
                images_type:       typeof p.images,
                videos_type:       typeof p.videos,
            })),
        });
    }

    if (mode === 'columns') {
        // نجلب سجل واحد لنرى كل الأعمدة المتاحة في الجدول
        const { data } = await db.from('players').select('*').limit(1);
        return NextResponse.json({
            columns: data?.[0] ? Object.keys(data[0]) : [],
            sample:  data?.[0],
        });
    }

    if (mode === 'test-update') {
        const db = getSupabaseAdmin();
        const testKey = `debug/test/${Date.now()}`;
        const { data, error } = await db
            .from('media_moderation')
            .upsert({ r2_key: testKey, status: 'approved', updated_at: new Date().toISOString() }, { onConflict: 'r2_key' })
            .select();
        // cleanup
        await db.from('media_moderation').delete().eq('r2_key', testKey);
        return NextResponse.json({ success: !error, error: error?.message, code: error?.code, data });
    }

    if (mode === 'r2') {
        const { S3Client, ListObjectsV2Command } = await import('@aws-sdk/client-s3');
        const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID || '14521cdfec73fa908fbf7e760fae362a';
        const CF_ENDPOINT = process.env.CLOUDFLARE_R2_ENDPOINT || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_ENDPOINT || `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`;
        const CF_ACCESS_KEY = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_ACCESS_KEY_ID || '979d63a7dd50597c3e862a8449c228e5';
        const CF_SECRET_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_SECRET_ACCESS_KEY || 'ba3be1a4f5451c3a69d138c5c7db7026f2ed44bb3ff257dd815d97cba9360ac8';
        const BUCKET = process.env.CLOUDFLARE_R2_BUCKET || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET || 'el7lmplatform';

        const s3 = new S3Client({
            region: 'auto',
            endpoint: CF_ENDPOINT,
            credentials: { accessKeyId: CF_ACCESS_KEY, secretAccessKey: CF_SECRET_KEY },
            forcePathStyle: true,
        });

        try {
            const res = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, MaxKeys: 5 }));
            return NextResponse.json({
                success: true,
                endpoint: CF_ENDPOINT,
                bucket: BUCKET,
                count: res.Contents?.length,
                keys: res.Contents?.map(c => c.Key),
            });
        } catch (e: any) {
            return NextResponse.json({
                success: false,
                endpoint: CF_ENDPOINT,
                bucket: BUCKET,
                error: e.message,
                name: e.name,
                stack: e.stack,
            });
        }
    }

    return NextResponse.json({ error: 'mode يجب أن يكون players أو columns أو test-update أو table-info أو r2' });
}
