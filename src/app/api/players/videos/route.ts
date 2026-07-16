/**
 * Players Videos API — fetches all players with videos using admin client (bypasses RLS)
 */
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('players')
      .select('*');

    if (error) {
      console.error('[/api/players/videos] error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Read the row first because this legacy table has different column sets between
    // environments, then return an explicit public allow-list so PII never leaves the API.
    const players = (data ?? [])
      .filter((p: any) => p.isDeleted !== true && p.is_deleted !== true)
      .map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        name: p.name,
        videos: p.videos,
        age: p.age,
        birth_date: p.birth_date ?? p.birthDate,
        primary_position: p.primary_position,
        position: p.position,
        country: p.country,
        nationality: p.nationality,
        profile_image_url: p.profile_image_url,
        profile_image: p.profile_image,
        image: p.image,
      }));
    return NextResponse.json({ data: players });
  } catch (err: any) {
    console.error('[/api/players/videos] unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
