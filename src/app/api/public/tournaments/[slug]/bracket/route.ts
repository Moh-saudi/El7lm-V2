import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ROUND_ORDER = ['R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F', '3rd'];

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
 * GET /api/public/tournaments/[slug]/bracket
 * Query params:
 *   category_id — required for multi-category tournaments
 *
 * Returns knockout bracket data grouped by rounds
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
        .from('tournament_matches')
        .select(`
            id, round, match_number, status,
            match_date, venue,
            home_score, away_score,
            home_team:tournament_teams!home_team_id(id, name, logo_url),
            away_team:tournament_teams!away_team_id(id, name, logo_url),
            category:tournament_categories!category_id(id, name)
        `)
        .eq('tournament_id', tournament.id)
        .in('round', ROUND_ORDER)
        .order('match_number', { ascending: true });

    if (category_id) query = query.eq('category_id', category_id);

    const { data, error } = await query;

    if (error) {
        return cors(NextResponse.json({ error: error.message }, { status: 500 }));
    }

    const matches = data || [];

    // Group by round in correct order
    const rounds: { round: string; matches: any[] }[] = [];
    for (const r of ROUND_ORDER) {
        const roundMatches = matches.filter(m => m.round === r);
        if (roundMatches.length > 0) {
            rounds.push({ round: r, matches: roundMatches });
        }
    }

    // Determine champion
    const final = matches.find(m => m.round === 'F');
    let champion = null;
    if (final && final.status === 'finished') {
        const hs  = final.home_score ?? 0;
        const as_ = final.away_score ?? 0;
        champion = hs > as_ ? (final as any).home_team : as_ > hs ? (final as any).away_team : null;
    }

    return cors(NextResponse.json({ rounds, champion, total_matches: matches.length }));
}
