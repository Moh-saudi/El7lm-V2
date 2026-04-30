import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/tournament-portal/venues?tournament_id=
export async function GET(req: NextRequest) {
  const tid = req.nextUrl.searchParams.get('tournament_id');
  if (!tid) return NextResponse.json({ error: 'tournament_id required' }, { status: 400 });
  const { data, error } = await supa
    .from('tournament_venues')
    .select('*')
    .eq('tournament_id', tid)
    .order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ venues: data || [] });
}

// POST — create venue
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { tournament_id, name, address, city, capacity, notes } = body;
  if (!tournament_id || !name) return NextResponse.json({ error: 'tournament_id and name required' }, { status: 400 });
  const { data, error } = await supa
    .from('tournament_venues')
    .insert({ tournament_id, name, address: address || null, city: city || null, capacity: capacity || null, notes: notes || null })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ venue: data });
}

// PATCH — update venue
export async function PATCH(req: NextRequest) {
  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { data, error } = await supa.from('tournament_venues').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ venue: data });
}

// DELETE — remove venue
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { error } = await supa.from('tournament_venues').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
