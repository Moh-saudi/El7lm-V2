import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeAdmin, withPrivateResponseHeaders } from '@/lib/api/admin-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authorization = await authorizeAdmin(req, 'manage:tournaments');
  if (!authorization.ok) return authorization.response;
  const { id, is_active } = await req.json();
  if (!id || typeof is_active !== 'boolean') return NextResponse.json({ error: 'id and is_active required' }, { status: 400 });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from('tournament_clients').update({ is_active }).eq('id', id).select('id,is_active').maybeSingle();
  if (error) return withPrivateResponseHeaders(NextResponse.json({ error: 'Failed to update organizer' }, { status: 500 }));
  if (!data) return NextResponse.json({ error: 'Organizer not found' }, { status: 404 });
  return withPrivateResponseHeaders(NextResponse.json({ ok: true, is_active: data.is_active }));
}
