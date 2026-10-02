import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeTournamentClient, authorizeTournamentOwnership } from '@/lib/api/tournament-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authorization = await authorizeTournamentClient(req);
  if (!authorization.user || !authorization.client) return authorization.response!;

  const tournamentId = req.nextUrl.searchParams.get('id');
  const admin = getSupabaseAdmin();

  if (tournamentId) {
    const ownership = await authorizeTournamentOwnership(req, tournamentId);
    if (!ownership.user) return ownership.response!;
    const { data, error } = await admin
      .from('tournament_new')
      .select('*')
      .eq('id', tournamentId)
      .eq('client_id', authorization.client.id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: 'Failed to load tournament' }, { status: 500 });
    return NextResponse.json({ tournament: data || null });
  }

  const { data, error } = await admin
    .from('tournament_new')
    .select('*')
    .eq('client_id', authorization.client.id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Failed to load tournaments' }, { status: 500 });
  return NextResponse.json({ tournaments: data || [] });
}

export async function POST(req: NextRequest) {
  const authorization = await authorizeTournamentClient(req);
  if (!authorization.user || !authorization.client) return authorization.response!;

  try {
    const body = await req.json();
    const name = String(body.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Tournament name is required' }, { status: 400 });

    const id = crypto.randomUUID();
    const slug = String(body.slug || `${name}-${Date.now()}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const { client_id: _ignoredClientId, id: _ignoredId, created_at: _ignoredCreatedAt, ...safeBody } = body;
    const record = {
      ...safeBody,
      id,
      client_id: authorization.client.id,
      name,
      slug,
      created_at: new Date().toISOString(),
      status: 'draft',
    };

    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from('tournament_new').insert(record).select('id,slug').single();
    if (error || !data) {
      console.error('[tournament-portal/tournaments] create failed:', error);
      return NextResponse.json({ error: 'Failed to create tournament' }, { status: 500 });
    }
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('[tournament-portal/tournaments] invalid request:', error);
    return NextResponse.json({ error: 'Invalid tournament request' }, { status: 400 });
  }
}
