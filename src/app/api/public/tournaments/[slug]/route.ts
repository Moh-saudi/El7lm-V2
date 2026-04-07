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
 * GET /api/public/tournaments/[slug]
 * Returns full tournament info including categories + teams count
 */
export async function GET(
    _req: NextRequest,
    { params }: { params: { slug: string } }
) {
    const { slug } = params;

    const { data: tournament, error } = await supabase
        .from('tournament_new')
        .select(`
            id, name, slug, status, description,
            start_date, end_date, location, logo_url, banner_url,
            registration_deadline, max_teams, entry_fee,
            categories:tournament_categories(
                id, name, type, age_min, age_max, max_teams,
                group_count, teams_per_group, advance_count
            )
        `)
        .eq('slug', slug)
        .single();

    if (error || !tournament) {
        return cors(NextResponse.json({ error: 'Tournament not found' }, { status: 404 }));
    }

    // Count approved teams per category
    const { data: teamCounts } = await supabase
        .from('tournament_teams')
        .select('category_id')
        .eq('tournament_id', tournament.id)
        .eq('status', 'approved');

    const countMap: Record<string, number> = {};
    for (const t of (teamCounts || [])) {
        countMap[t.category_id] = (countMap[t.category_id] || 0) + 1;
    }

    const enrichedCats = ((tournament as any).categories || []).map((c: any) => ({
        ...c,
        approved_teams: countMap[c.id] || 0,
    }));

    return cors(NextResponse.json({
        ...tournament,
        categories: enrichedCats,
    }));
}
