import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const tid = req.nextUrl.searchParams.get('tournament_id');
  if (!tid) return NextResponse.json({ error: 'tournament_id required' }, { status: 400 });
  const supa = getSupabaseAdmin();
  const { data, error } = await supa
    .from('tournament_referees')
    .select('*')
    .eq('tournament_id', tid)
    .order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ referees: data || [] });
}

export async function POST(req: NextRequest) {
  const { tournament_id, name, phone, level, notes } = await req.json();
  if (!tournament_id || !name) return NextResponse.json({ error: 'tournament_id and name required' }, { status: 400 });
  const supa = getSupabaseAdmin();
  const { data, error } = await supa
    .from('tournament_referees')
    .insert({ tournament_id, name, phone: phone || null, level: level || null, notes: notes || null })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ referee: data });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const supa = getSupabaseAdmin();
  const { error } = await supa.from('tournament_referees').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
