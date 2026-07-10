import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/tournament-portal/save-schedule
 * Body: {
 *   matches: Array<{
 *     id: string
 *     match_date?: string | null   (ISO datetime)
 *     venue?: string | null
 *     referee_name?: string | null
 *     home_team_id?: string | null
 *     away_team_id?: string | null
 *   }>
 * }
 *
 * Bulk-updates scheduling fields for multiple matches.
 * Does NOT touch scores or status.
 */
export async function PATCH(req: NextRequest) {
  const { matches } = await req.json();

  if (!Array.isArray(matches) || matches.length === 0)
    return NextResponse.json({ error: 'matches array required' }, { status: 400 });

  const errors: string[] = [];
  const supa = getSupabaseAdmin();

  for (const m of matches) {
    if (!m.id) continue;

    const patch: Record<string, any> = {};
    if ('match_date'    in m) patch.match_date    = m.match_date    || null;
    if ('venue'         in m) patch.venue         = m.venue         || null;
    if ('referee_name'  in m) patch.referee_name  = m.referee_name  || null;
    if ('home_team_id'  in m) patch.home_team_id  = m.home_team_id  || null;
    if ('away_team_id'  in m) patch.away_team_id  = m.away_team_id  || null;

    if (Object.keys(patch).length === 0) continue;

    const { error } = await supa.from('tournament_matches').update(patch).eq('id', m.id);
    if (error) errors.push(`${m.id}: ${error.message}`);
  }

  if (errors.length > 0)
    return NextResponse.json({ error: errors.join(', ') }, { status: 500 });

  return NextResponse.json({ updated: matches.length });
}
