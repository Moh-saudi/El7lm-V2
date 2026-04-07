import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/tournament-portal/generate-group-matches
 * Body: { tournament_id, category_id }
 *
 * For every group in the category, generates a round-robin schedule
 * (every team plays every other team once as home).
 * Existing group_stage matches for the category are deleted first.
 */
export async function POST(req: NextRequest) {
    const { tournament_id, category_id } = await req.json();
    if (!tournament_id || !category_id) {
        return NextResponse.json({ error: 'tournament_id and category_id required' }, { status: 400 });
    }

    // Fetch groups for this category
    const { data: groups, error: grpErr } = await supa
        .from('tournament_groups')
        .select('id, name')
        .eq('tournament_id', tournament_id)
        .eq('category_id', category_id)
        .order('sort_order');

    if (grpErr) return NextResponse.json({ error: grpErr.message }, { status: 500 });
    if (!groups || groups.length === 0) {
        return NextResponse.json({ error: 'لا توجد مجموعات لهذه الفئة. أجرِ القرعة أولاً.' }, { status: 400 });
    }

    // Delete existing group_stage matches for this category
    await supa
        .from('tournament_matches')
        .delete()
        .eq('tournament_id', tournament_id)
        .eq('category_id', category_id)
        .eq('round', 'group_stage');

    const toInsert: any[] = [];
    let matchNumber = 1;

    for (const group of groups) {
        // Fetch approved teams in this group
        const { data: teams } = await supa
            .from('tournament_teams')
            .select('id, name')
            .eq('tournament_id', tournament_id)
            .eq('category_id', category_id)
            .eq('group_id', group.id)
            .eq('status', 'approved');

        if (!teams || teams.length < 2) continue;

        // Round-robin: every pair plays once
        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                toInsert.push({
                    tournament_id,
                    category_id,
                    group_id:     group.id,
                    round:        'group_stage',
                    match_number: matchNumber++,
                    home_team_id: teams[i].id,
                    away_team_id: teams[j].id,
                    status:       'scheduled',
                });
            }
        }
    }

    if (toInsert.length === 0) {
        return NextResponse.json({ error: 'لا توجد فرق مقبولة في المجموعات. تأكد من أن الفرق مُوزَّعة على المجموعات.' }, { status: 400 });
    }

    const { error: insErr } = await supa.from('tournament_matches').insert(toInsert);
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

    return NextResponse.json({ generated: toInsert.length });
}
