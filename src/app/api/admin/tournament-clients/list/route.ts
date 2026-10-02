import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeAdmin, withPrivateResponseHeaders } from '@/lib/api/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdmin(request, 'read:tournaments');
  if (!authorization.ok) return authorization.response;

  try {
    const admin = getSupabaseAdmin();
    const { data: clients, error } = await admin
      .from('tournament_clients')
      .select('id,supabase_auth_id,name,organization_name,email,phone,country,is_active,created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const { data: tournaments, error: countError } = await admin.from('tournament_new').select('client_id');
    if (countError) throw countError;
    const counts = new Map<string, number>();
    for (const tournament of tournaments || []) {
      if (tournament.client_id) counts.set(tournament.client_id, (counts.get(tournament.client_id) || 0) + 1);
    }

    return withPrivateResponseHeaders(NextResponse.json({
      clients: (clients || []).map(client => ({ ...client, _tournament_count: counts.get(client.id) || 0 })),
    }));
  } catch (error) {
    console.error('[tournament-clients/list] failed:', error);
    return withPrivateResponseHeaders(NextResponse.json({ error: 'Failed to load organizers' }, { status: 500 }));
  }
}
