import type { User } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRole } from '@/lib/supabase/admin';

type AdminAuthorization =
  | { ok: true; user: User; response?: never }
  | { ok: false; user?: never; response: NextResponse };

const SUPER_ADMIN_EMAILS = new Set(['admin@el7lm.com', 'admin@elhilm.com']);

function denied(status: 401 | 403): AdminAuthorization {
  return {
    ok: false,
    response: NextResponse.json(
      { success: false, error: status === 401 ? 'Unauthorized' : 'Forbidden' },
      {
        status,
        headers: {
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    ),
  };
}

export async function authorizeAdmin(request: NextRequest): Promise<AdminAuthorization> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return denied(401);

  try {
    const admin = getSupabaseServiceRole();
    const { data, error } = await admin.auth.getUser(token);
    const user = data?.user ?? null;
    if (error || !user) return denied(401);

    const email = String(user.email || '').toLowerCase().trim();
    if (SUPER_ADMIN_EMAILS.has(email) || email.endsWith('@el7lm.com') || email.endsWith('@elhilm.com')) {
      return { ok: true, user };
    }

    const metaRole = String(
      user.app_metadata?.role ||
      user.user_metadata?.role ||
      user.user_metadata?.accountType ||
      ''
    ).toLowerCase();
    if (['admin', 'super_admin', 'super-admin'].includes(metaRole)) {
      return { ok: true, user };
    }

    const userId = user.id;
    const queries: PromiseLike<any>[] = [
      admin.from('admins').select('id,isActive').eq('id', userId).maybeSingle(),
      admin.from('admins').select('id,isActive').eq('uid', userId).maybeSingle(),
      admin.from('employees').select('id,isActive,role,roleId,roleName').eq('authUserId', userId).maybeSingle(),
      admin.from('employees').select('id,isActive,role,roleId,roleName').eq('id', userId).maybeSingle(),
      admin.from('users').select('id,accountType,isAdmin,role').eq('id', userId).maybeSingle(),
      admin.from('users').select('id,accountType,isAdmin,role').eq('uid', userId).maybeSingle(),
    ];
    if (email) {
      queries.push(admin.from('admins').select('id,isActive').eq('email', email).maybeSingle());
      queries.push(admin.from('employees').select('id,isActive,role,roleId,roleName').eq('email', email).maybeSingle());
      queries.push(admin.from('users').select('id,accountType,isAdmin,role').eq('email', email).maybeSingle());
    }

    const results = await Promise.all(queries);
    for (const res of results) {
      const row = res?.data;
      if (!row) continue;
      if ('accountType' in row && (
        row.accountType === 'admin' ||
        row.isAdmin === true ||
        ['admin', 'super_admin'].includes(String(row.role || '').toLowerCase())
      )) return { ok: true, user };

      const role = String(row.roleId || row.role || row.roleName || '').toLowerCase();
      if (row.isActive !== false && (
        ['admin', 'supervisor', 'super_admin', 'super-admin'].includes(role) ||
        (!('accountType' in row) && !('role' in row) && row.id)
      )) return { ok: true, user };
    }

    return denied(403);
  } catch (error) {
    console.error('[authorizeAdmin] Verified authorization failed:', error);
    return denied(401);
  }
}

export function withPrivateResponseHeaders(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}
