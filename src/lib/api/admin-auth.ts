import type { User } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRole } from '@/lib/supabase/admin';

type AdminAuthorization =
  | { ok: true; user: User; response?: never }
  | { ok: false; user?: never; response: NextResponse };

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
    const userId = user.id;

    // Authorization is DB-backed only. Auth metadata and email domains are not privileges.
    const adminLookups = [
      admin.from('admins').select('id,isActive').eq('id', userId).maybeSingle(),
      ...(email
        ? [admin.from('admins').select('id,isActive').eq('email', email).maybeSingle()]
        : []),
    ];
    const adminResults = await Promise.all(adminLookups);
    for (const result of adminResults) {
      if (result.error) throw result.error;
      if (result.data?.id && result.data.isActive !== false) {
        return { ok: true, user };
      }
    }

    const employeeLookups = [
      admin.from('employees').select('id,isActive,role,roleId,roleName').eq('authUserId', userId).maybeSingle(),
      admin.from('employees').select('id,isActive,role,roleId,roleName').eq('id', userId).maybeSingle(),
      ...(email
        ? [admin.from('employees').select('id,isActive,role,roleId,roleName').eq('email', email).maybeSingle()]
        : []),
    ];
    const employeeResults = await Promise.all(employeeLookups);
    for (const result of employeeResults) {
      if (result.error) throw result.error;
      const row = result.data;
      if (!row || row.isActive === false) continue;
      const role = String(row.roleId || row.role || row.roleName || '').toLowerCase();
      if (['admin', 'supervisor', 'super_admin', 'super-admin'].includes(role)) {
        return { ok: true, user };
      }
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
