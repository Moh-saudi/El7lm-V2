import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** POST /api/tournament-portal/save-draw
 * body: { groups: [{ id, teams: [{ id, category_id }] }], category_id }
 */
export async function POST(req: NextRequest) {
    const { groups, category_id } = await req.json();
    if (!groups) return NextResponse.json({ error: 'groups required' }, { status: 400 });

    try {
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
