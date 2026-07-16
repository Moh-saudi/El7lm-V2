import type { User } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

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
  if (!authHeader?.startsWith('Bearer ')) return denied(401);

  const token = authHeader.slice(7).trim();
  if (!token) return denied(401);

  try {
    const admin = getSupabaseAdmin();
    const {
      data: { user },
      error,
    } = await admin.auth.getUser(token);

    if (error || !user) return denied(401);

    const email = String(user.email || '').toLowerCase();
    if (SUPER_ADMIN_EMAILS.has(email)) return { ok: true, user };

    const userId = user.id;
    const [adminById, adminByUid, employeeByAuthId, employeeById] =
      await Promise.all([
        admin.from('admins').select('id,isActive').eq('id', userId).maybeSingle(),
        admin.from('admins').select('id,isActive').eq('uid', userId).maybeSingle(),
        admin
          .from('employees')
          .select('id,isActive,role,roleId,roleName')
          .eq('authUserId', userId)
          .maybeSingle(),
        admin
          .from('employees')
          .select('id,isActive,role,roleId,roleName')
          .eq('id', userId)
          .maybeSingle(),
      ]);

    const adminRecord = adminById.data || adminByUid.data;
    const isAdminRecord = Boolean(adminRecord?.id) && adminRecord?.isActive !== false;
    const employeeRecord = employeeByAuthId.data || employeeById.data;
    const employeeRole = String(
      employeeRecord?.roleId || employeeRecord?.role || employeeRecord?.roleName || ''
    ).toLowerCase();
    const isPrivilegedEmployee =
      Boolean(employeeRecord?.id) &&
      employeeRecord?.isActive !== false &&
      ['admin', 'supervisor', 'super_admin', 'super-admin'].includes(employeeRole);

    return isAdminRecord || isPrivilegedEmployee
      ? { ok: true, user }
      : denied(403);
  } catch {
    return denied(401);
  }
}

export function withPrivateResponseHeaders(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}
