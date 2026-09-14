import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

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

  if (!isUuid(tid)) {
    return NextResponse.json({ venues: devVenuesMap.get(tid) || [] });
  }

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

  if (!isUuid(tournament_id)) {
    const newVenue = {
      id: `venue-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tournament_id,
      name,
      address: address || null,
      city: city || null,
      capacity: capacity || null,
      notes: notes || null,
      created_at: new Date().toISOString(),
    };
    const list = devVenuesMap.get(tournament_id) || [];
    devVenuesMap.set(tournament_id, [...list, newVenue]);
    return NextResponse.json({ venue: newVenue });
  }

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

  if (!isUuid(id)) {
    return NextResponse.json({ venue: { id, ...updates } });
  }

  try {
    const supa = getSupabaseAdmin();
    const { data, error } = await supa.from('tournament_venues').update(updates).eq('id', id).select().single();
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

  if (tid && devVenuesMap.has(tid)) {
    devVenuesMap.set(tid, (devVenuesMap.get(tid) || []).filter(v => v.id !== id));
  }

  if (!isUuid(id)) {
    return NextResponse.json({ ok: true });
  }

  try {
    const supa = getSupabaseAdmin();
    const { error } = await supa.from('tournament_venues').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
