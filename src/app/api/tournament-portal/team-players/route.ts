import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isUuid } from '@/lib/tournament-portal/auth';
import { authorizeTournamentOwnership } from '@/lib/api/tournament-auth';

export const dynamic = 'force-dynamic';

/** GET /api/tournament-portal/team-players?team_id= */
export async function GET(req: NextRequest) {
    const team_id = req.nextUrl.searchParams.get('team_id');
    if (!team_id) return NextResponse.json({ error: 'team_id required' }, { status: 400 });

    if (!isUuid(team_id)) {
        return NextResponse.json({ error: 'Invalid team_id' }, { status: 400 });
    }

    const supa = getSupabaseAdmin();
    const { data: team, error: teamError } = await supa.from('tournament_teams').select('tournament_id').eq('id', team_id).maybeSingle();
    if (teamError) return NextResponse.json({ error: teamError.message }, { status: 500 });
    if (!team?.tournament_id) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    const authorization = await authorizeTournamentOwnership(req, team.tournament_id);
    if (!authorization.user) return authorization.response!;

    const { data, error } = await supa
        .from('tournament_players')
        .select('*')
        .eq('team_id', team_id)
        .order('created_at');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const players = (data || []).map((p: any) => ({ ...p, player_name: p.name || '' }));
    return NextResponse.json({ players });
}

/** POST /api/tournament-portal/team-players */
export async function POST(req: NextRequest) {
    const body = await req.json();
    const { team_id, tournament_id, player_name, position, date_of_birth, jersey_number, phone } = body;

    if (!team_id || !tournament_id || !player_name?.trim()) {
        return NextResponse.json({ error: 'team_id, tournament_id, player_name required' }, { status: 400 });
    }

    if (!isUuid(tournament_id) || !isUuid(team_id)) {
        return NextResponse.json({ error: 'Invalid tournament or team id' }, { status: 400 });
    }

    const authorization = await authorizeTournamentOwnership(req, tournament_id);
    if (!authorization.user) return authorization.response!;

    const supa = getSupabaseAdmin();
    const { data: team, error: teamError } = await supa.from('tournament_teams').select('id').eq('id', team_id).eq('tournament_id', tournament_id).maybeSingle();
    if (teamError) return NextResponse.json({ error: teamError.message }, { status: 500 });
    if (!team) return NextResponse.json({ error: 'Team not found in tournament' }, { status: 404 });

    const { data: existing, error: existingError } = await supa
        .from('tournament_players')
        .select('id')
        .eq('team_id', team_id)
        .ilike('name', player_name.trim())
        .limit(1)
        .maybeSingle();

    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
    if (existing) {
        return NextResponse.json({ error: `اللاعب "${player_name}" مضاف مسبقاً لهذا الفريق` }, { status: 409 });
    }

    // ── Insert — try with optional columns, fallback to base ──
    const base: Record<string, any> = {
        team_id,
        tournament_id,
        name:          player_name.trim(),
        position:      position      || null,
        date_of_birth: date_of_birth || null,
        jersey_number: jersey_number ? Number(jersey_number) : null,
        status:        'active',
    };

    const tryInsert = async (payload: Record<string, any>) =>
        supa.from('tournament_players').insert(payload).select('*').single();

    // Try with phone if available; skip platform_player_id (Firebase IDs aren't UUIDs)
    let { data, error } = await tryInsert({
        ...base,
        ...(phone ? { phone } : {}),
    });

    // If phone column doesn't exist yet, retry with base only
    if (error && error.message.includes('column')) {
        const retry = await tryInsert(base);
        data  = retry.data;
        error = retry.error;
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ player: { ...data, player_name: (data as any)?.name || player_name } });
}

/** DELETE /api/tournament-portal/team-players?player_id= */
export async function DELETE(req: NextRequest) {
    const player_id = req.nextUrl.searchParams.get('player_id');
    if (!player_id) return NextResponse.json({ error: 'player_id required' }, { status: 400 });

    const supa = getSupabaseAdmin();
    if (!isUuid(player_id)) return NextResponse.json({ error: 'Invalid player_id' }, { status: 400 });

    const { data: player, error: playerError } = await supa.from('tournament_players').select('tournament_id').eq('id', player_id).maybeSingle();
    if (playerError) return NextResponse.json({ error: playerError.message }, { status: 500 });
    if (!player?.tournament_id) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    const authorization = await authorizeTournamentOwnership(req, player.tournament_id);
    if (!authorization.user) return authorization.response!;

    const { error } = await supa.from('tournament_players').delete().eq('id', player_id).eq('tournament_id', player.tournament_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
