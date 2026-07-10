import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/tournament-portal/advance-winner
 * Body: { match_id }
 *
 * بعد تسجيل نتيجة مباراة إقصائية، ينقل الفائز تلقائياً
 * لخانة الفريق في المباراة التالية.
 *
 * منطق الانتقال:
 *   QF match 1 winner  → SF match 1 home
 *   QF match 2 winner  → SF match 1 away
 *   QF match 3 winner  → SF match 2 home
 *   QF match 4 winner  → SF match 2 away
 *   SF match 1 winner  → F home
 *   SF match 2 winner  → F away
 *   SF match 1 loser   → 3rd home
 *   SF match 2 loser   → 3rd away
 */

const NEXT_ROUND: Record<string, string> = {
  R128: 'R64', R64: 'R32', R32: 'R16', R16: 'QF', QF: 'SF', SF: 'F',
};

export async function POST(req: NextRequest) {
  const { match_id } = await req.json();
  if (!match_id) return NextResponse.json({ error: 'match_id required' }, { status: 400 });
  const supa = getSupabaseAdmin();

  // Load the completed match
  const { data: match, error: mErr } = await supa
    .from('tournament_matches')
    .select('*')
    .eq('id', match_id)
    .single();

  if (mErr || !match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  if (match.status !== 'completed') return NextResponse.json({ error: 'Match not completed yet' }, { status: 400 });

  const { home_score: hs, away_score: as_, round, match_number, tournament_id, category_id } = match;

  // Determine winner / loser
  const winnerId = hs > as_ ? match.home_team_id : as_ > hs ? match.away_team_id : null;
  const loserId  = hs > as_ ? match.away_team_id : as_ > hs ? match.home_team_id : null;

  if (!winnerId) return NextResponse.json({ message: 'Draw — no winner to advance' });

  const results: string[] = [];

  // ── Advance winner to next knockout round ─────────────────────────────────
  const nextRound = NEXT_ROUND[round];
  if (nextRound) {
    // match_number is 1-based within each round
    // Pair: matches 1&2 → next match 1, matches 3&4 → next match 2, etc.
    const nextMatchNum  = Math.ceil(match_number / 2);
    const isHome        = match_number % 2 !== 0; // odd → home slot, even → away slot

    const { data: nextMatch } = await supa
      .from('tournament_matches')
      .select('id')
      .eq('tournament_id', tournament_id)
      .eq('category_id', category_id)
      .eq('round', nextRound)
      .eq('match_number', nextMatchNum)
      .single();

    if (nextMatch) {
      const updateField = isHome ? 'home_team_id' : 'away_team_id';
      await supa.from('tournament_matches').update({ [updateField]: winnerId }).eq('id', nextMatch.id);
      results.push(`Winner → ${nextRound} match ${nextMatchNum} (${updateField.replace('_team_id', '')})`);
    }
  }

  // ── Place SF losers in 3rd place match ────────────────────────────────────
  if (round === 'SF' && loserId) {
    const { data: thirdMatch } = await supa
      .from('tournament_matches')
      .select('id, home_team_id, away_team_id')
      .eq('tournament_id', tournament_id)
      .eq('category_id', category_id)
      .eq('round', '3rd')
      .single();

    if (thirdMatch) {
      // SF match 1 loser → home, SF match 2 loser → away
      const updateField = match_number === 1 ? 'home_team_id' : 'away_team_id';
      await supa.from('tournament_matches').update({ [updateField]: loserId }).eq('id', thirdMatch.id);
      results.push(`Loser → 3rd place match (${updateField.replace('_team_id', '')})`);
    }
  }

  return NextResponse.json({ advanced: results.length > 0, results });
}
