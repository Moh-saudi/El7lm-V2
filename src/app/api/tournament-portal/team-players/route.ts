import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** GET /api/tournament-portal/team-players?team_id= */
export async function GET(req: NextRequest) {
    const team_id = req.nextUrl.searchParams.get('team_id');
    if (!team_id) return NextResponse.json({ error: 'team_id required' }, { status: 400 });

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
    const { team_id, tournament_id, player_name, position, date_of_birth, jersey_number, phone, platform_player_id } = body;

    if (!team_id || !tournament_id || !player_name?.trim()) {
        return NextResponse.json({ error: 'team_id, tournament_id, player_name required' }, { status: 400 });
    }

    // ── Duplicate check ───────────────────────────────────────
    const { data: existing } = await supa
        .from('tournament_players')
        .select('id')
        .eq('team_id', team_id)
        .ilike('name', player_name.trim())
        .limit(1)
        .single();

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

    const { error } = await supa.from('tournament_players').delete().eq('id', player_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
