import type { User } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRole } from '@/lib/supabase/admin';

type UserAuthorization =
  | { ok: true; user: User; response?: never }
  | { ok: false; user?: never; response: NextResponse };

export async function authorizeUser(request: NextRequest): Promise<UserAuthorization> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      ),
    };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      ),
    };
  }

  let user: User | null = null;
  let authError: unknown = null;

  try {
    const admin = getSupabaseServiceRole();
    const { data, error } = await admin.auth.getUser(token);
    user = data?.user ?? null;
    authError = error;
  } catch (err) {
    authError = err;
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
