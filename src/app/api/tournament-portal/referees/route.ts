import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeTournamentOwnership } from '@/lib/api/tournament-auth';

export const dynamic = 'force-dynamic';

function isUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

export async function GET(req: NextRequest) {
  const tid = req.nextUrl.searchParams.get('tournament_id');
  if (!tid) return NextResponse.json({ error: 'tournament_id required' }, { status: 400 });
  if (!isUuid(tid)) return NextResponse.json({ error: 'Invalid tournament_id' }, { status: 400 });

  const authorization = await authorizeTournamentOwnership(req, tid);
  if (!authorization.user) return authorization.response!;

  try {
    const supa = getSupabaseAdmin();
    const { data, error } = await supa
      .from('tournament_referees')
      .select('*')
      .eq('tournament_id', tid)
      .order('name');
    if (error) return NextResponse.json({ error: 'Failed to load referees' }, { status: 500 });
    return NextResponse.json({ referees: data || [] });
  } catch {
    return NextResponse.json({ error: 'Failed to load referees' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { tournament_id, name, phone, level, notes } = await req.json();
  if (!tournament_id || !name) return NextResponse.json({ error: 'tournament_id and name required' }, { status: 400 });
  if (!isUuid(tournament_id)) return NextResponse.json({ error: 'Invalid tournament_id' }, { status: 400 });

  const authorization = await authorizeTournamentOwnership(req, tournament_id);
  if (!authorization.user) return authorization.response!;

  try {
    const supa = getSupabaseAdmin();
    const { data, error } = await supa
      .from('tournament_referees')
      .insert({ tournament_id, name, phone: phone || null, level: level || null, notes: notes || null })
      .select()
      .single();
    if (error) return NextResponse.json({ error: 'Failed to create referee' }, { status: 500 });
    return NextResponse.json({ referee: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create referee' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  if (!isUuid(id)) return NextResponse.json({ error: 'Invalid referee id' }, { status: 400 });

  try {
    const supa = getSupabaseAdmin();
    const { data: resource, error: lookupError } = await supa
      .from('tournament_referees')
      .select('tournament_id')
      .eq('id', id)
      .maybeSingle();
    if (lookupError) return NextResponse.json({ error: 'Failed to load referee' }, { status: 500 });
    if (!resource?.tournament_id) return NextResponse.json({ error: 'Referee not found' }, { status: 404 });

    const authorization = await authorizeTournamentOwnership(req, resource.tournament_id);
    if (!authorization.user) return authorization.response!;

    const { error } = await supa
      .from('tournament_referees')
      .delete()
      .eq('id', id)
      .eq('tournament_id', resource.tournament_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete referee' }, { status: 500 });
  }
}
