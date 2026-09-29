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


export async function authorizeTournamentOwnership(
  request: NextRequest,
  tournamentId: string,
): Promise<TournamentClientAuthorization> {
  const authorization = await authorizeTournamentClient(request);
  if (!authorization.user || !authorization.client) return authorization;

  const ownsTournament = await tournamentBelongsToClient(tournamentId, authorization.client.id);
  if (!ownsTournament) {
    return {
      user: null,
      client: null,
      response: tournamentAccessDenied(),
    };
  }
  return authorization;
}

export async function tournamentBelongsToClient(
  tournamentId: string,
  clientId: string
): Promise<boolean> {
  if (!isUuid(tournamentId) || !isUuid(clientId)) return false;
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('tournament_new')
      .select('id')
      .eq('id', tournamentId)
      .eq('client_id', clientId)
      .maybeSingle();
    return !error && !!data;
  } catch {
    return false;
  }
}

export async function categoryBelongsToTournament(
  categoryId: string,
  tournamentId: string,
): Promise<boolean> {
  if (!isUuid(categoryId) || !isUuid(tournamentId)) return false;
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('tournament_categories')
      .select('id')
      .eq('id', categoryId)
      .eq('tournament_id', tournamentId)
      .maybeSingle();
    return !error && !!data;
  } catch {
    return false;
  }
}

export function tournamentAccessDenied() {
  return NextResponse.json({ error: 'Tournament access denied' }, { status: 403 });
}
