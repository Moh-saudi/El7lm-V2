import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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

    return NextResponse.json({ error: 'mode يجب أن يكون players أو columns' });
}
