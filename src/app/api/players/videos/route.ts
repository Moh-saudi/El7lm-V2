/**
 * Players Videos API — fetches players with videos using admin client with pagination and column whitelist
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const PUBLIC_COLUMNS = [
  'id',
  'full_name',
  'name',
  'videos',
  'age',
  'birth_date',
  'primary_position',
  'position',
  'country',
  'nationality',
  'profile_image',
  'profile_image_url',
  'image',
].join(',');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '20', 10)), 50);
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));
    const country = searchParams.get('country');
    const position = searchParams.get('position');

    const db = getSupabaseAdmin();
    let query = db
      .from('players')
      .select(PUBLIC_COLUMNS)
      .not('videos', 'is', null)
      .range(offset, offset + limit - 1);

    if (country) {
      query = query.eq('country', country);
    }
    if (position) {
      query = query.or(`primary_position.eq.${position},position.eq.${position}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[/api/players/videos] error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const players = (data ?? [])
      .filter((p: any) => p.isDeleted !== true && p.is_deleted !== true && (Array.isArray(p.videos) ? p.videos.length > 0 : Boolean(p.videos)))
      .map((p: any) => ({
        id: p.id,
        full_name: p.full_name || p.name,
        name: p.name || p.full_name,
        videos: p.videos,
        age: p.age,
        birth_date: p.birth_date,
        primary_position: p.primary_position || p.position,
        position: p.position || p.primary_position,
        country: p.country,
        nationality: p.nationality,
        profile_image_url: p.profile_image_url || p.profile_image || p.image || null,
      }));

    return NextResponse.json({
      success: true,
      count: players.length,
      limit,
      offset,
      hasMore: (data?.length ?? 0) === limit,
      data: players,
    });
  } catch (err: any) {
    console.error('[/api/players/videos] unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
