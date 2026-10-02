import type { User } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRole } from '@/lib/supabase/admin';

type AdminAuthorization =
  | { ok: true; user: User; response?: never }
  | { ok: false; user?: never; response: NextResponse };

const LEGACY_PERMISSION_MAP: Record<string, string[]> = {
  canEditUsers: ['update:users'],
  canManageUsers: ['manage:users'],
  canViewUsers: ['read:users'],
  canManageContent: ['manage:content'],
  canManageEmployees: ['manage:employees'],
  canManagePayments: ['manage:financials'],
  canViewFinancials: ['read:financials'],
  canViewReports: ['read:reports'],
  canManageSupport: ['manage:support'],
  canViewSupport: ['read:support'],
};

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

function employeePermissions(value: unknown): Set<string> {
  const permissions = new Set<string>();
  if (Array.isArray(value)) {
    for (const permission of value) {
      if (typeof permission === 'string') permissions.add(permission);
    }
    return permissions;
  }

  if (value && typeof value === 'object') {
    for (const [key, enabled] of Object.entries(value as Record<string, unknown>)) {
      if (enabled !== true) continue;
      for (const permission of LEGACY_PERMISSION_MAP[key] || []) permissions.add(permission);
    }
  }
  return permissions;
}

function hasPermission(permissions: Set<string>, required: string): boolean {
  if (permissions.has(required)) return true;
  const [, resource] = required.split(':');
  return Boolean(resource && permissions.has(`manage:${resource}`));
}

export async function authorizeAdmin(
  request: NextRequest,
  requiredPermission?: string,
): Promise<AdminAuthorization> {
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

    // Canonical admins have full authority through trusted id/uid identity only.
    const adminLookups = [
      admin.from('admins').select('id,isActive').eq('id', userId).maybeSingle(),
      admin.from('admins').select('id,isActive').eq('uid', userId).maybeSingle(),
    ];
    const adminResults = await Promise.all(adminLookups);
    for (const result of adminResults) {
      if (result.error) throw result.error;
      if (result.data?.id && result.data.isActive !== false) return { ok: true, user };
    }

    // Employee email lookup is temporary legacy identity compatibility only.
    // Authority still comes from the employee role/permission record, never the email.
    const employeeLookups = [
      admin.from('employees').select('id,isActive,role,roleId,roleName,permissions').eq('authUserId', userId).maybeSingle(),
      admin.from('employees').select('id,isActive,role,roleId,roleName,permissions').eq('id', userId).maybeSingle(),
      ...(email
        ? [admin.from('employees').select('id,isActive,role,roleId,roleName,permissions').eq('email', email).maybeSingle()]
        : []),
    ];
    const employeeResults = await Promise.all(employeeLookups);
    for (const result of employeeResults) {
      if (result.error) throw result.error;
      const row = result.data;
      if (!row || row.isActive === false) continue;

      const role = String(row.roleId || row.role || row.roleName || '').toLowerCase();
      if (['admin', 'super_admin', 'super-admin'].includes(role)) return { ok: true, user };

      if (requiredPermission && hasPermission(employeePermissions(row.permissions), requiredPermission)) {
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
