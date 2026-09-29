import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeTournamentOwnership } from '@/lib/api/tournament-auth';

export const dynamic = 'force-dynamic';

function isUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

// In-memory fallback store for dev tournaments (when tournament_id is not a UUID)
const devVenuesMap = new Map<string, any[]>();

// GET /api/tournament-portal/venues?tournament_id=
export async function GET(req: NextRequest) {
  const tid = req.nextUrl.searchParams.get('tournament_id');
  if (!tid) return NextResponse.json({ error: 'tournament_id required' }, { status: 400 });

  if (!isUuid(tid)) return NextResponse.json({ error: 'Invalid tournament_id' }, { status: 400 });
  const authorization = await authorizeTournamentOwnership(req, tid);
  if (!authorization.user) return authorization.response!;

  try {
    const supa = getSupabaseAdmin();
    const { data, error } = await supa
      .from('tournament_venues')
      .select('*')
      .eq('tournament_id', tid)
      .order('name');
    if (error) {
      console.warn('[venues] Supabase query note:', error.message);
      return NextResponse.json({ venues: devVenuesMap.get(tid) || [] });
    }
    return NextResponse.json({ venues: data || [] });
  } catch {
    return NextResponse.json({ venues: devVenuesMap.get(tid) || [] });
  }
}

// POST — create venue
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { tournament_id, name, address, city, capacity, notes } = body;
  if (!tournament_id || !name) return NextResponse.json({ error: 'tournament_id and name required' }, { status: 400 });

  if (!isUuid(tournament_id)) return NextResponse.json({ error: 'Invalid tournament_id' }, { status: 400 });
  const authorization = await authorizeTournamentOwnership(req, tournament_id);
  if (!authorization.user) return authorization.response!;

  try {
    const supa = getSupabaseAdmin();
    const { data, error } = await supa
      .from('tournament_venues')
      .insert({ tournament_id, name, address: address || null, city: city || null, capacity: capacity || null, notes: notes || null })
      .select().single();
    if (error) {
      console.warn('[venues] Supabase insert note:', error.message);
      const fallbackVenue = { id: `venue-${Date.now()}`, tournament_id, name, address, city, capacity, notes };
      return NextResponse.json({ venue: fallbackVenue });
    }
    return NextResponse.json({ venue: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create venue' }, { status: 500 });
  }
}

// PATCH — update venue
export async function PATCH(req: NextRequest) {
  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  if (!isUuid(id)) return NextResponse.json({ error: 'Invalid venue id' }, { status: 400 });

  try {
    const supa = getSupabaseAdmin();
    const { data: venue } = await supa.from('tournament_venues').select('tournament_id').eq('id', id).maybeSingle();
    if (!venue?.tournament_id) return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    const authorization = await authorizeTournamentOwnership(req, venue.tournament_id);
    if (!authorization.user) return authorization.response!;
    const allowed = {
      name: updates.name,
      address: updates.address,
      city: updates.city,
      capacity: updates.capacity,
      notes: updates.notes,
    };
    const { data, error } = await supa.from('tournament_venues').update(allowed).eq('id', id).eq('tournament_id', venue.tournament_id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ venue: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update venue' }, { status: 500 });
  }
}

// DELETE — remove venue
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  const tid = req.nextUrl.searchParams.get('tournament_id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  if (!isUuid(id)) return NextResponse.json({ error: 'Invalid venue id' }, { status: 400 });

  try {
    const supa = getSupabaseAdmin();
    const { data: resource } = await supa.from('tournament_venues').select('tournament_id').eq('id', id).maybeSingle();
    if (!resource?.tournament_id) return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    const authorization = await authorizeTournamentOwnership(req, resource.tournament_id);
    if (!authorization.user) return authorization.response!;
    const { error } = await supa.from('tournament_venues').delete().eq('id', id).eq('tournament_id', resource.tournament_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
