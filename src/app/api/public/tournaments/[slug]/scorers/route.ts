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
 * GET /api/public/tournaments/[slug]/scorers
 * Query params:
 *   category_id — filter by category
 *   limit       — default 20, max 100
 *   type        — 'goals' | 'assists' | 'cards' (default: goals)
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
    const limit       = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const type        = searchParams.get('type') || 'goals';

    let query = supabase
        .from('tournament_top_scorers')
        .select(`
            id, player_name, goals, assists,
            yellow_cards, red_cards, matches_played,
            team:tournament_teams!team_id(id, name, logo_url),
            category:tournament_categories!category_id(id, name)
        `)
        .eq('tournament_id', tournament.id)
        .limit(limit);

    if (category_id) query = query.eq('category_id', category_id);

    // Sort by requested stat
    if (type === 'assists') {
        query = query.order('assists', { ascending: false }).order('goals', { ascending: false });
    } else if (type === 'cards') {
        query = query.order('red_cards', { ascending: false }).order('yellow_cards', { ascending: false });
    } else {
        query = query.order('goals', { ascending: false }).order('assists', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
        return cors(NextResponse.json({ error: error.message }, { status: 500 }));
    }

    return cors(NextResponse.json({ scorers: data || [], type }));
}
