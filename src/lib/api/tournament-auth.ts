import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export interface TournamentClientAuthorization {
  user: User | null;
  client: { id: string; is_active: boolean } | null;
  response: NextResponse | null;
}

export function isUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
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

  try {
    const admin = getSupabaseAdmin();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) {
      return {
        user: null,
        client: null,
        response: NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 }),
      };
    }

    const { data: client, error: clientError } = await admin
      .from('tournament_clients')
      .select('id, is_active')
      .eq('supabase_auth_id', user.id)
      .maybeSingle();

    if (clientError || !client) {
      return {
        user: null,
        client: null,
        response: NextResponse.json({ error: 'Tournament portal account required' }, { status: 403 }),
      };
    }
    if (!client.is_active) {
      return {
        user: null,
        client: null,
        response: NextResponse.json({ error: 'Tournament portal access denied' }, { status: 403 }),
      };
    }

    return { user, client, response: null };
  } catch {
    return {
      user: null,
      client: null,
      response: NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 }),
    };
  }
}

export async function tournamentBelongsToClient(
  tournamentId: string,
  clientId: string
): Promise<boolean> {
  // 1. Check Supabase DB if tournamentId is a valid UUID
  if (isUuid(tournamentId) && isUuid(clientId)) {
    try {
      const { data } = await getSupabaseAdmin()
        .from('tournament_new')
        .select('id')
        .eq('id', tournamentId)
        .eq('client_id', clientId)
        .maybeSingle();
      if (data) return true;
    } catch {}
  }

  // 2. Allow mock / local dev tournaments without hitting unsupported Node filesystem APIs in Edge
  if (tournamentId.startsWith('tourn-') || tournamentId.startsWith('dev-') || tournamentId.startsWith('mock-')) {
    return true;
  }

  return false;
}

export function tournamentAccessDenied() {
  return NextResponse.json({ error: 'Tournament access denied' }, { status: 403 });
}
