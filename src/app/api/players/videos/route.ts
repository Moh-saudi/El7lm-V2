/**
 * Players Videos API — fetches players with videos using admin client with pagination and column whitelist
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function calculateAge(birthDateStr: string | null | undefined): number | null {
  if (!birthDateStr) return null;
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 && age < 100 ? age : null;
}

const PUBLIC_COLUMNS = [
  'id',
  'full_name',
  'name',
  'videos',
  'video_urls',
  'uploaded_videos',
  'birth_date',
  'primary_position',
  'position',
  'country',
  'nationality',
  'profile_image',
  'profile_image_url',
  'image',
  'isDeleted',
  'updated_at',
].join(',');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50', 10)), 100);
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));
    const country = searchParams.get('country');
    const position = searchParams.get('position');

    const db = getSupabaseAdmin();
    let query = db
      .from('players')
      .select(PUBLIC_COLUMNS)
      .or('isDeleted.is.null,isDeleted.eq.false');

    if (country) {
      query = query.ilike('country', `%${country}%`);
    }
    if (position) {
      query = query.or(`primary_position.ilike.%${position}%,position.ilike.%${position}%`);
    }

    query = query
      .order('updated_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('[/api/players/videos] error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const players = (data ?? [])
      .filter((p: any) => {
        if (p.isDeleted === true || p.is_deleted === true) return false;
        const vids = p.videos || p.video_urls || p.uploaded_videos;
        if (!vids) return false;
        if (Array.isArray(vids) && vids.length === 0) return false;
        if (typeof vids === 'string' && (vids.trim() === '[]' || vids.trim() === '')) return false;
        return true;
      })
      .map((p: any) => {
        const displayName = p.full_name || p.name || 'لاعب';
        const displayPosition = p.primary_position || p.position || 'لاعب';
        const displayImage = p.profile_image_url || p.profile_image || p.image || null;
        const effectiveVideos = p.videos && (!Array.isArray(p.videos) || p.videos.length > 0)
          ? p.videos
          : (p.video_urls || p.uploaded_videos);

        return {
          id: p.id,
          uid: p.id,
          full_name: displayName,
          name: displayName,
          videos: effectiveVideos,
          age: calculateAge(p.birth_date),
          birth_date: p.birth_date,
          birthDate: p.birth_date,
          primary_position: displayPosition,
          position: displayPosition,
          country: p.country || '',
          nationality: p.nationality || p.country || '',
          profile_image_url: displayImage,
          profileImageUrl: displayImage,
          avatar: displayImage,
        };
      });

    return NextResponse.json(
      {
        success: true,
        count: players.length,
        limit,
        offset,
        hasMore: (data?.length ?? 0) === limit,
        data: players,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
        },
      }
    );
  } catch (err: any) {
    console.error('[/api/players/videos] unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
