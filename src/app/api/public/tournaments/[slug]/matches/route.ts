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
 * GET /api/public/tournaments/[slug]/matches
 * Query params:
 *   category_id — filter by category
 *   status      — filter by match status (scheduled|ongoing|finished)
 *   limit       — default 50, max 200
 *   offset      — pagination
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { slug: string } }
) {
    const { slug } = params;
    const { searchParams } = req.nextUrl;

    // Resolve tournament id
    const { data: tournament } = await supabase
        .from('tournament_new')
        .select('id')
        .eq('slug', slug)
        .single();

    if (!tournament) {
        return cors(NextResponse.json({ error: 'Tournament not found' }, { status: 404 }));
    }

    const category_id = searchParams.get('category_id');
    const status      = searchParams.get('status');
    const limit       = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset      = parseInt(searchParams.get('offset') || '0');

    let query = supabase
        .from('tournament_matches')
        .select(`
            id, round, match_number, status,
            match_date, venue,
            home_score, away_score,
            home_team:tournament_teams!home_team_id(id, name, logo_url),
            away_team:tournament_teams!away_team_id(id, name, logo_url),
            category:tournament_categories!category_id(id, name),
            group:tournament_groups!group_id(id, name)
        `)
        .eq('tournament_id', tournament.id)
        .order('match_date', { ascending: true })
        .range(offset, offset + limit - 1);

    if (category_id) query = query.eq('category_id', category_id);
    if (status)      query = query.eq('status', status);

    const { data, error, count } = await query;

    if (error) {
        return cors(NextResponse.json({ error: error.message }, { status: 500 }));
    }

    return cors(NextResponse.json({ matches: data || [], total: count, offset, limit }));
}
