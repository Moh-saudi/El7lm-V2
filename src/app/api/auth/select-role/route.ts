import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/lib/api/user-auth';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseServiceRole } from '@/lib/supabase/admin';

const ROLE_TABLES = {
  player: 'players',
  club: 'clubs',
  academy: 'academies',
  agent: 'agents',
  trainer: 'trainers',
  marketer: 'marketers',
} as const;

type PublicRole = keyof typeof ROLE_TABLES;

function isPublicRole(value: unknown): value is PublicRole {
  return typeof value === 'string' && Object.hasOwn(ROLE_TABLES, value);
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeUser(request);
  if (!authorization.ok) return authorization.response;

  try {
    const { accountType } = await request.json();
    if (!isPublicRole(accountType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid account type' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const authUser = authorization.user;
    const authHeader = request.headers.get('authorization');
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!authHeader || !url || !anonKey) {
      throw new Error('Supabase auth configuration is unavailable');
    }

    // Execute the atomic RPC in the caller's authenticated context so auth.uid()
    // is the only identity the database will accept.
    const callerDb = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: assignedRole, error: roleError } = await callerDb.rpc(
      'assign_initial_account_role',
      { p_account_type: accountType },
    );

    if (roleError) {
      if (roleError.code === '23505') {
        return NextResponse.json(
          { success: false, code: 'ROLE_ALREADY_ASSIGNED' },
          { status: 409, headers: { 'Cache-Control': 'no-store' } },
        );
      }
      throw roleError;
    }

    const admin = getSupabaseServiceRole();
    await admin.auth.admin.updateUserById(authUser.id, {
      user_metadata: {
        ...authUser.user_metadata,
        accountType: assignedRole || accountType,
      },
    });

    return NextResponse.json(
      { success: true, accountType },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('[auth/select-role]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to assign account role' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
