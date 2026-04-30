import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/tournament-portal/generate-fixtures
 * Body: { tournament_id, category_id }
 *
 * Generates fixtures based on category type:
 *   - league            → round-robin (home + away)
 *   - knockout          → bracket shells (QF/SF/F with TBD teams)
 *   - groups_knockout   → round-robin per group + bracket shells
 */
export async function POST(req: NextRequest) {
  const { tournament_id, category_id } = await req.json();
  if (!tournament_id || !category_id)
    return NextResponse.json({ error: 'tournament_id and category_id required' }, { status: 400 });

  // Fetch category
  const { data: cat } = await supa
    .from('tournament_categories')
    .select('id, type, group_count, teams_per_group')
    .eq('id', category_id)
    .single();

  if (!cat)
    return NextResponse.json({ error: 'الفئة غير موجودة' }, { status: 404 });

  // Delete existing scheduled matches (not completed ones)
  await supa
    .from('tournament_matches')
    .delete()
    .eq('tournament_id', tournament_id)
    .eq('category_id', category_id)
    .neq('status', 'completed');

  const toInsert: any[] = [];
  let matchNumber = 1;

  // ── LEAGUE: round-robin (each pair plays home + away) ───────────────────────
  if (cat.type === 'league') {
    const { data: teams } = await supa
      .from('tournament_teams')
      .select('id, name')
      .eq('tournament_id', tournament_id)
      .eq('category_id', category_id)
      .eq('status', 'approved');

    if (!teams || teams.length < 2)
      return NextResponse.json({ error: 'يجب وجود فريقان مقبولان على الأقل' }, { status: 400 });

    // Home + Away (double round-robin)
    for (let i = 0; i < teams.length; i++) {
      for (let j = 0; j < teams.length; j++) {
        if (i === j) continue;
        toInsert.push({
          tournament_id, category_id,
          round: 'league',
          match_number: matchNumber++,
          home_team_id: teams[i].id,
          away_team_id: teams[j].id,
          status: 'scheduled',
        });
      }
    }
  }

  // ── GROUPS: round-robin per group ───────────────────────────────────────────
  if (cat.type === 'groups' || cat.type === 'groups_knockout') {
    const { data: groups } = await supa
      .from('tournament_groups')
      .select('id, name')
      .eq('tournament_id', tournament_id)
      .eq('category_id', category_id)
      .order('sort_order');

    if (!groups || groups.length === 0)
      return NextResponse.json({ error: 'لا توجد مجموعات — أجرِ القرعة أولاً' }, { status: 400 });

    for (const group of groups) {
      const { data: teams } = await supa
        .from('tournament_teams')
        .select('id, name')
        .eq('tournament_id', tournament_id)
        .eq('category_id', category_id)
        .eq('group_id', group.id)
        .eq('status', 'approved');

      if (!teams || teams.length < 2) continue;

      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          toInsert.push({
            tournament_id, category_id,
            group_id: group.id,
            round: 'group_stage',
            match_number: matchNumber++,
            home_team_id: teams[i].id,
            away_team_id: teams[j].id,
            status: 'scheduled',
          });
        }
      }
    }
  }

  // ── KNOCKOUT BRACKET ────────────────────────────────────────────────────────
  if (cat.type === 'knockout' || cat.type === 'groups_knockout') {

    // For pure knockout — fetch seeded teams and fill first round
    if (cat.type === 'knockout') {
      const { data: teams } = await supa
        .from('tournament_teams')
        .select('id, name, seed')
        .eq('tournament_id', tournament_id)
        .eq('category_id', category_id)
        .eq('status', 'approved')
        .order('seed', { ascending: true, nullsFirst: false });

      const seeded = (teams || []);
      const n = seeded.length;

      // Determine first round and subsequent shells
      let firstRound = '';
      let firstCount = 0;
      let laterRounds: string[] = [];

      if (n >= 16) { firstRound = 'R16'; firstCount = 8;  laterRounds = ['QF','SF','F','3rd']; }
      else if (n >= 8) { firstRound = 'QF'; firstCount = 4;  laterRounds = ['SF','F','3rd']; }
      else if (n >= 4) { firstRound = 'SF'; firstCount = 2;  laterRounds = ['F','3rd']; }
      else              { firstRound = 'F';  firstCount = 1;  laterRounds = []; }

      // Standard seeding: 1 vs n, 2 vs n-1, 3 vs n-2 ...
      const pairings: [string|null, string|null][] = [];
      for (let i = 0; i < firstCount; i++) {
        const top = seeded[i]?.id ?? null;
        const bot = seeded[n - 1 - i]?.id ?? null;
        pairings.push([top, bot]);
      }
      // Reorder for proper bracket layout: 1v8, 4v5, 2v7, 3v6 for QF (4 matches)
      const reordered = reorderBracket(pairings);

      for (const [home, away] of reordered) {
        toInsert.push({
          tournament_id, category_id,
          round: firstRound,
          match_number: matchNumber++,
          home_team_id: home,
          away_team_id: away,
          status: 'scheduled',
        });
      }

      // Later rounds: TBD shells
      const laterCounts: Record<string,number> = { QF:4, SF:2, F:1, '3rd':1 };
      for (const round of laterRounds) {
        const cnt = round === '3rd' ? 1 : (laterCounts[round] || 1);
        for (let i = 0; i < cnt; i++) {
          toInsert.push({ tournament_id, category_id, round, match_number: matchNumber++, home_team_id: null, away_team_id: null, status: 'scheduled' });
        }
      }

    } else {
      // groups_knockout: QF onwards all TBD (winners advance from groups)
      const rounds = ['QF', 'SF', 'F', '3rd'];
      const counts: Record<string,number> = { QF:4, SF:2, F:1, '3rd':1 };
      for (const round of rounds) {
        const cnt = counts[round];
        for (let i = 0; i < cnt; i++) {
          toInsert.push({ tournament_id, category_id, round, match_number: matchNumber++, home_team_id: null, away_team_id: null, status: 'scheduled' });
        }
      }
    }
  }

  if (toInsert.length === 0)
    return NextResponse.json({ error: 'لم يتم توليد أي مباريات — تأكد من وجود فرق مقبولة' }, { status: 400 });

  const { error } = await supa.from('tournament_matches').insert(toInsert);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ generated: toInsert.length, type: cat.type });
}

/**
 * Reorders bracket pairings for proper visual layout.
 * Input:  [1v8, 2v7, 3v6, 4v5]
 * Output: [1v8, 4v5, 2v7, 3v6]  → winners of top half meet in one SF, bottom half in another
 */
function reorderBracket(pairs: [string|null, string|null][]): [string|null, string|null][] {
  const n = pairs.length;
  if (n <= 2) return pairs;
  const result: [string|null, string|null][] = [];
  // Place matches so bracket halves are balanced: 1,4,3,2 order for 4 matches
  const order: Record<number, number[]> = {
    4: [0, 3, 2, 1],
    8: [0, 7, 4, 3, 2, 5, 6, 1],
  };
  const idx = order[n] || pairs.map((_,i) => i);
  for (const i of idx) result.push(pairs[i] ?? [null, null]);
  return result;
}
