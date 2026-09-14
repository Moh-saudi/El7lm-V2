import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { DEFAULT_CLIENTS } from '@/lib/tournament-clients-constants';

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

  // 1. Support portal session tokens: portal-sess-{clientId}-{timestamp} or direct client ID
  let candidateClientId: string | null = null;
  if (token.startsWith('portal-sess-')) {
    const withoutPrefix = token.slice('portal-sess-'.length);
    const lastDash = withoutPrefix.lastIndexOf('-');
    candidateClientId = lastDash > 0 ? withoutPrefix.slice(0, lastDash) : withoutPrefix;
  } else if (!token.includes('.')) {
    // Non-JWT token, e.g. client.id
    candidateClientId = token;
  }

  if (candidateClientId) {
    // A. Check default clients first (edge-safe)
    const defaultMatch = DEFAULT_CLIENTS.find(
      c => c.id === candidateClientId || c.supabase_auth_id === candidateClientId
    );

    if (defaultMatch) {
      if (defaultMatch.is_active === false) {
        return {
          user: null,
          client: null,
          response: NextResponse.json({ error: 'Tournament portal access denied' }, { status: 403 }),
        };
      }
      return {
        user: { id: defaultMatch.supabase_auth_id || defaultMatch.id, email: defaultMatch.email } as any,
        client: { id: defaultMatch.id, is_active: true },
        response: null,
      };
    }

    // B. Check DB tournament_clients
    try {
      const admin = getSupabaseAdmin();
      let query = admin.from('tournament_clients').select('id, is_active, supabase_auth_id, email');
      if (isUuid(candidateClientId)) {
        query = query.or(`id.eq.${candidateClientId},supabase_auth_id.eq.${candidateClientId}`);
      } else {
        query = query.eq('id', candidateClientId);
      }
      const { data: dbClient } = await query.maybeSingle();

      if (dbClient) {
        if (!dbClient.is_active) {
          return {
            user: null,
            client: null,
            response: NextResponse.json({ error: 'Tournament portal access denied' }, { status: 403 }),
          };
        }
        return {
          user: { id: dbClient.supabase_auth_id || dbClient.id, email: dbClient.email } as any,
          client: { id: dbClient.id, is_active: true },
          response: null,
        };
      }
    } catch {}
  }

  // 2. Validate Supabase Auth JWT token
  try {
    const admin = getSupabaseAdmin();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (!error && user) {
      const { data: client } = await admin
        .from('tournament_clients')
        .select('id, is_active')
        .eq('supabase_auth_id', user.id)
        .maybeSingle();

      if (client) {
        if (!client.is_active) {
          return {
            user: null,
            client: null,
            response: NextResponse.json({ error: 'Tournament portal access denied' }, { status: 403 }),
          };
        }
        return { user, client, response: null };
      }

      // Check default clients for this user.id
      const defaultMatch = DEFAULT_CLIENTS.find(c => c.supabase_auth_id === user.id);
      if (defaultMatch) {
        if (defaultMatch.is_active === false) {
          return {
            user: null,
            client: null,
            response: NextResponse.json({ error: 'Tournament portal access denied' }, { status: 403 }),
          };
        }
        return { user, client: { id: defaultMatch.id, is_active: true }, response: null };
      }
    }
  } catch {}

  return {
    user: null,
    client: null,
    response: NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 }),
  };
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
