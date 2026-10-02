import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeAdmin, withPrivateResponseHeaders } from '@/lib/api/admin-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authorization = await authorizeAdmin(req, 'manage:tournaments');
  if (!authorization.ok) return authorization.response;
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const admin = getSupabaseAdmin();
  const { data: client, error: lookupError } = await admin
    .from('tournament_clients').select('id,supabase_auth_id').eq('id', id).maybeSingle();
  if (lookupError) return withPrivateResponseHeaders(NextResponse.json({ error: 'Failed to resolve organizer' }, { status: 500 }));
  if (!client) return NextResponse.json({ error: 'Organizer not found' }, { status: 404 });

  const { error: deleteError } = await admin.from('tournament_clients').delete().eq('id', client.id);
  if (deleteError) return withPrivateResponseHeaders(NextResponse.json({ error: 'Failed to delete organizer profile' }, { status: 500 }));

  if (client.supabase_auth_id) {
    const { error: authError } = await admin.auth.admin.deleteUser(client.supabase_auth_id);
    if (authError) {
      console.error('[tournament-clients/delete] profile removed but auth cleanup failed:', authError);
      return withPrivateResponseHeaders(NextResponse.json({ ok: true, warning: 'Organizer profile deleted; identity cleanup requires attention' }));
    }
  }
  return withPrivateResponseHeaders(NextResponse.json({ ok: true }));
}
