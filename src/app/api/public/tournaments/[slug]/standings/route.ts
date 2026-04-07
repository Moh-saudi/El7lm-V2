import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function cors(res: NextResponse) {
    res.headers.set('Access-Control-Allow-Origin', '*');
    res.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    return res;
}

export async function OPTIONS() {
    return cors(new NextResponse(null, { status: 204 }));
}

/**
 * GET /api/public/tournaments/[slug]/standings
 * Query params:
 *   category_id — filter by category (optional)
 *
 * Returns standings grouped by group (for groups_knockout)
 * or flat list (for league/knockout)
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { slug: string } }
) {
    const { slug } = params;
    const { searchParams } = req.nextUrl;

    const { data: tournament } = await supabase
        .from('tournament_new')
        .select('id')
        .eq('slug', slug)
        .single();

    if (!tournament) {
        return cors(NextResponse.json({ error: 'Tournament not found' }, { status: 404 }));
    }

    const category_id = searchParams.get('category_id');

    let query = supabase
        .from('tournament_standings')
        .select(`
            id, played, won, drawn, lost,
            goals_for, goals_against, goal_diff, points,
            team:tournament_teams!team_id(id, name, logo_url),
            group:tournament_groups!group_id(id, name),
            category:tournament_categories!category_id(id, name)
        `)
        .eq('tournament_id', tournament.id)
        .order('points', { ascending: false })
        .order('goal_diff', { ascending: false })
        .order('goals_for', { ascending: false });

    if (category_id) query = query.eq('category_id', category_id);

    const { data, error } = await query;

    if (error) {
        return cors(NextResponse.json({ error: error.message }, { status: 500 }));
    }

    // Group by category → group
    const grouped: Record<string, { category: any; groups: Record<string, { group: any; standings: any[] }> }> = {};

    for (const s of (data || [])) {
        const catId  = (s as any).category?.id || 'unknown';
        const grpId  = (s as any).group?.id    || 'ungrouped';

        if (!grouped[catId]) grouped[catId] = { category: (s as any).category, groups: {} };
        if (!grouped[catId].groups[grpId]) {
            grouped[catId].groups[grpId] = { group: (s as any).group || null, standings: [] };
        }
        grouped[catId].groups[grpId].standings.push(s);
    }

    // Convert to array
    const result = Object.values(grouped).map(cat => ({
        category: cat.category,
        groups: Object.values(cat.groups),
    }));

    return cors(NextResponse.json({ standings: result }));
}
