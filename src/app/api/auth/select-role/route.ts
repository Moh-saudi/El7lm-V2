import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/lib/api/user-auth';
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
    const db = getSupabaseServiceRole();

    // A signed-in user may select a role only before any canonical role is assigned.
    const roleChecks = await Promise.all(
      Object.entries(ROLE_TABLES).map(async ([role, table]) => {
        const { data, error } = await db
          .from(table)
          .select('id')
          .or(`id.eq.${authUser.id},uid.eq.${authUser.id}`)
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        return data ? role : null;
      }),
    );

    const existingRole = roleChecks.find(Boolean);
    if (existingRole) {
      return NextResponse.json(
        { success: false, code: 'ROLE_ALREADY_ASSIGNED', accountType: existingRole },
        { status: 409, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const { data: existingUser, error: userLookupError } = await db
      .from('users')
      .select('id,uid,full_name,name,email,phone,profile_image,created_at,createdAt')
      .or(`id.eq.${authUser.id},uid.eq.${authUser.id}`)
      .limit(1)
      .maybeSingle();
    if (userLookupError) throw userLookupError;

    const now = new Date().toISOString();
    const fullName =
      existingUser?.full_name ||
      existingUser?.name ||
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      '';

    const userData = {
      id: authUser.id,
      uid: authUser.id,
      email: authUser.email || existingUser?.email || null,
      full_name: fullName,
      phone: existingUser?.phone || authUser.phone || '',
      profile_image: existingUser?.profile_image || authUser.user_metadata?.avatar_url || '',
      accountType,
      isActive: true,
      isDeleted: false,
      updated_at: now,
    };

    const { error: usersError } = await db.from('users').upsert(userData, { onConflict: 'id' });
    if (usersError) throw usersError;

    const roleData = {
      ...userData,
      created_at: existingUser?.created_at || existingUser?.createdAt || now,
    };
    const { error: roleError } = await db
      .from(ROLE_TABLES[accountType])
      .upsert(roleData, { onConflict: 'id' });

    if (roleError) {
      // Do not leave a newly-created role marker in users if the canonical role row failed.
      await db.from('users').update({ accountType: null, updated_at: now }).eq('id', authUser.id);
      throw roleError;
    }

    await db.auth.admin.updateUserById(authUser.id, {
      user_metadata: {
        ...authUser.user_metadata,
        accountType,
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
