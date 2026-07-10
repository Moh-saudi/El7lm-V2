import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/** POST /api/tournament-portal/save-draw
 * body: { groups: [{ id, teams: [{ id, category_id }] }], category_id }
 */
export async function POST(req: NextRequest) {
    const { groups, category_id } = await req.json();
    if (!groups) return NextResponse.json({ error: 'groups required' }, { status: 400 });

    try {
        const supa = getSupabaseAdmin();

        // First: clear group_id for all teams in this category
        if (category_id) {
            await supa.from('tournament_teams')
                .update({ group_id: null })
                .eq('category_id', category_id);
        }

        // Then assign each team to its group
        for (const group of groups) {
            for (const team of group.teams) {
                const updates: any = { group_id: group.id };
                if (!team.category_id && category_id) updates.category_id = category_id;
                await supa.from('tournament_teams').update(updates).eq('id', team.id);
            }
        }

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
