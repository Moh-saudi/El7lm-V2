/**
 * Players Videos API — fetches all players with videos using admin client (bypasses RLS)
 */
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

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

    // Filter deleted players in JS (isDeleted may be null for old records)
    const players = (data ?? []).filter((p: any) => p.isDeleted !== true);
    return NextResponse.json({ data: players });
  } catch (err: any) {
    console.error('[/api/players/videos] unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
