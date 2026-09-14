import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function isUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

// In-memory fallback store for dev tournaments
const devRefereesMap = new Map<string, any[]>();

export async function GET(req: NextRequest) {
  const tid = req.nextUrl.searchParams.get('tournament_id');
  if (!tid) return NextResponse.json({ error: 'tournament_id required' }, { status: 400 });

  if (!isUuid(tid)) {
    return NextResponse.json({ referees: devRefereesMap.get(tid) || [] });
  }

  try {
    const supa = getSupabaseAdmin();
    const { data, error } = await supa
      .from('tournament_referees')
      .select('*')
      .eq('tournament_id', tid)
      .order('name');
    if (error) {
      console.warn('[referees] Supabase query note:', error.message);
      return NextResponse.json({ referees: devRefereesMap.get(tid) || [] });
    }
    return NextResponse.json({ referees: data || [] });
  } catch {
    return NextResponse.json({ referees: devRefereesMap.get(tid) || [] });
  }
}

export async function POST(req: NextRequest) {
  const { tournament_id, name, phone, level, notes } = await req.json();
  if (!tournament_id || !name) return NextResponse.json({ error: 'tournament_id and name required' }, { status: 400 });

  if (!isUuid(tournament_id)) {
    const newRef = {
      id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tournament_id,
      name,
      phone: phone || null,
      level: level || null,
      notes: notes || null,
      created_at: new Date().toISOString(),
    };
    const list = devRefereesMap.get(tournament_id) || [];
    devRefereesMap.set(tournament_id, [...list, newRef]);
    return NextResponse.json({ referee: newRef });
  }

  try {
    const supa = getSupabaseAdmin();
    const { data, error } = await supa
      .from('tournament_referees')
      .insert({ tournament_id, name, phone: phone || null, level: level || null, notes: notes || null })
      .select().single();
    if (error) {
      console.warn('[referees] Supabase insert note:', error.message);
      const fallbackRef = { id: `ref-${Date.now()}`, tournament_id, name, phone, level, notes };
      return NextResponse.json({ referee: fallbackRef });
    }
    return NextResponse.json({ referee: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create referee' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  const tid = req.nextUrl.searchParams.get('tournament_id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  if (tid && devRefereesMap.has(tid)) {
    devRefereesMap.set(tid, (devRefereesMap.get(tid) || []).filter(r => r.id !== id));
  }

  if (!isUuid(id)) {
    return NextResponse.json({ ok: true });
  }

  try {
    const supa = getSupabaseAdmin();
    const { error } = await supa.from('tournament_referees').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
