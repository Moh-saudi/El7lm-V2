import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeTournamentOwnership } from '@/lib/api/tournament-auth';

export const dynamic = 'force-dynamic';

/** POST /api/tournament-portal/save-draw
 * body: { groups: [{ id, teams: [{ id, category_id }] }], category_id }
 */
export async function POST(req: NextRequest) {
    const { groups, category_id } = await req.json();
    if (!groups || !category_id) return NextResponse.json({ error: 'groups and category_id required' }, { status: 400 });

    try {
        const supa = getSupabaseAdmin();
        const { data: category, error: categoryError } = await supa
            .from('tournament_categories')
            .select('tournament_id')
            .eq('id', category_id)
            .maybeSingle();
        if (categoryError) return NextResponse.json({ error: categoryError.message }, { status: 500 });
        if (!category?.tournament_id) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

        const authorization = await authorizeTournamentOwnership(req, category.tournament_id);
        if (!authorization.user) return authorization.response!;

        // First: clear group_id for all teams in this category
        if (category_id) {
            const { error: clearError } = await supa.from('tournament_teams')
                .update({ group_id: null })
                .eq('category_id', category_id)
                .eq('tournament_id', category.tournament_id);
            if (clearError) return NextResponse.json({ error: clearError.message }, { status: 500 });
        }

        // Then assign each team to its group
        for (const group of groups) {
            for (const team of group.teams) {
                const updates: any = { group_id: group.id };
                if (!team.category_id && category_id) updates.category_id = category_id;
                const { error: updateError } = await supa.from('tournament_teams')
                    .update(updates)
                    .eq('id', team.id)
                    .eq('tournament_id', category.tournament_id)
                    .eq('category_id', category_id);
                if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
            }
        }

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
