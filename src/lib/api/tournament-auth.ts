import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export interface TournamentClientAuthorization {
  user: User | null;
  client: { id: string; is_active: boolean } | null;
  response: NextResponse | null;
}

export async function authorizeTournamentClient(
  request: NextRequest
): Promise<TournamentClientAuthorization> {
  const authorization = request.headers.get('authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return {
      user: null,
      client: null,
      response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    };
  }

  const admin = getSupabaseAdmin();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) {
    return {
      user: null,
      client: null,
      response: NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 }),
    };
  }

  const { data: client } = await admin
    .from('tournament_clients')
    .select('id, is_active')
    .eq('supabase_auth_id', user.id)
    .maybeSingle();

  if (!client?.is_active) {
    return {
      user: null,
      client: null,
      response: NextResponse.json({ error: 'Tournament portal access denied' }, { status: 403 }),
    };
  }

  return { user, client, response: null };
}

export async function tournamentBelongsToClient(
  tournamentId: string,
  clientId: string
): Promise<boolean> {
  const { data } = await getSupabaseAdmin()
    .from('tournament_new')
    .select('id')
    .eq('id', tournamentId)
    .eq('client_id', clientId)
    .maybeSingle();
  return Boolean(data);
}

export function tournamentAccessDenied() {
  return NextResponse.json({ error: 'Tournament access denied' }, { status: 403 });
}
