import type { User } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

type UserAuthorization =
  | { ok: true; user: User; response?: never }
  | { ok: false; user?: never; response: NextResponse };

export async function authorizeUser(request: NextRequest): Promise<UserAuthorization> {
  const authHeader = request.headers.get('authorization');
  let token: string | null = null;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  let user: User | null = null;
  let authError: any = null;

  if (token) {
    try {
      const admin = getSupabaseAdmin();
      const { data, error } = await admin.auth.getUser(token);
      user = data?.user ?? null;
      authError = error;
    } catch (err) {
      authError = err;
    }

    // Fallback to anon client if admin client fails or is unconfigured
    if (!user && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const fallbackClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );
        const { data, error } = await fallbackClient.auth.getUser(token);
        if (data?.user) {
          user = data.user;
          authError = null;
        }
      } catch (fallbackErr) {
        console.warn('Fallback token verification failed:', fallbackErr);
      }
    }
  } else {
    // Fallback to cookie-based session for web requests
    try {
      const { createSupabaseRouteClient } = await import('@/lib/supabase/server');
      const routeClient = await createSupabaseRouteClient();
      const { data, error } = await routeClient.auth.getUser();
      user = data?.user ?? null;
      authError = error;
    } catch (cookieErr) {
      authError = cookieErr;
    }
  }

  if (authError || !user) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      ),
    };
  }

  return { ok: true, user };
}
