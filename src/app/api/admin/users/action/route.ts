import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin, withPrivateResponseHeaders } from '@/lib/api/admin-auth';
import { getSupabaseServiceRole } from '@/lib/supabase/admin';

const ROLE_TABLES = {
  player: 'players',
  club: 'clubs',
  academy: 'academies',
  trainer: 'trainers',
  agent: 'agents',
  marketer: 'marketers',
  parent: 'users',
  admin: 'users',
} as const;

type AccountType = keyof typeof ROLE_TABLES;
type Action = 'suspend' | 'activate' | 'soft-delete' | 'restore' | 'verify' | 'change-account-type' | 'permanent-delete';

const VERIFY_PATCHES: Partial<Record<AccountType, Record<string, unknown>>> = {
  player: { verificationStatus: 'verified' },
  trainer: { verificationStatus: 'verified', isVerified: true },
  academy: { isVerified: true },
  club: { isVerified: true },
  agent: { isVerified: true },
};

function response(body: Record<string, unknown>, status = 200) {
  return withPrivateResponseHeaders(NextResponse.json(body, { status }));
}

function isAccountType(value: unknown): value is AccountType {
  return typeof value === 'string' && Object.hasOwn(ROLE_TABLES, value);
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdmin(request, 'manage:users');
  if (!authorization.ok) return authorization.response;

  try {
    const body = await request.json();
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const accountType = body.accountType;
    const action = body.action as Action;

    if (!userId || !isAccountType(accountType)) {
      return response({ success: false, error: 'Invalid user target' }, 400);
    }

    const allowedActions: Action[] = ['suspend', 'activate', 'soft-delete', 'restore', 'verify', 'change-account-type', 'permanent-delete'];
    if (!allowedActions.includes(action)) {
      return response({ success: false, error: 'Invalid admin action' }, 400);
    }

    const db = getSupabaseServiceRole();
    const tableName = ROLE_TABLES[accountType];
    const now = new Date().toISOString();

    if (action === 'permanent-delete') {
      const { error: roleDeleteError } = await db.from(tableName).delete().or(`id.eq.${userId},uid.eq.${userId}`);
      if (roleDeleteError) throw roleDeleteError;
      if (tableName !== 'users') {
        const { error: usersDeleteError } = await db.from('users').delete().or(`id.eq.${userId},uid.eq.${userId}`);
        if (usersDeleteError) throw usersDeleteError;
      }
      return response({ success: true });
    }

    if (action === 'change-account-type') {
      if (!isAccountType(body.newAccountType)) {
        return response({ success: false, error: 'Invalid account type' }, 400);
      }
      const { error } = await db.from('users').update({ accountType: body.newAccountType }).or(`id.eq.${userId},uid.eq.${userId}`);
      if (error) throw error;
      return response({ success: true });
    }

    let rolePatch: Record<string, unknown> | null = null;
    let usersPatch: Record<string, unknown>;

    switch (action) {
      case 'suspend':
        rolePatch = { isActive: false };
        usersPatch = {
          isActive: false,
          suspendedAt: now,
          suspensionReason: typeof body.reason === 'string' ? body.reason.slice(0, 1000) : '',
        };
        break;
      case 'activate':
        rolePatch = { isActive: true };
        usersPatch = { isActive: true, suspendedAt: null, suspensionReason: null };
        break;
      case 'soft-delete':
        rolePatch = accountType === 'marketer' ? null : { isDeleted: true, deletedAt: now };
        usersPatch = { isDeleted: true, deletedAt: now };
        break;
      case 'restore':
        rolePatch = accountType === 'marketer' ? null : { isDeleted: false, deletedAt: null };
        usersPatch = { isDeleted: false, deletedAt: null };
        break;
      case 'verify':
        rolePatch = VERIFY_PATCHES[accountType] || null;
        if (accountType === 'player' && rolePatch) rolePatch.verifiedAt = now;
        usersPatch = { verificationStatus: 'verified', verifiedAt: now, isVerified: true };
        break;
      default:
        return response({ success: false, error: 'Unsupported admin action' }, 400);
    }

    if (tableName !== 'users' && rolePatch) {
      const { error: roleError } = await db.from(tableName).update(rolePatch).or(`id.eq.${userId},uid.eq.${userId}`);
      if (roleError) throw roleError;
    }

    const { error: usersError } = await db.from('users').update(usersPatch).or(`id.eq.${userId},uid.eq.${userId}`);
    if (usersError) throw usersError;

    return response({ success: true });
  } catch (error) {
    console.error('[admin/users/action]', error);
    return response({ success: false, error: 'Failed to apply admin action' }, 500);
  }
}
