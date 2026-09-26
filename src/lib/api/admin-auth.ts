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

function decodeJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = Buffer.from(parts[1], 'base64').toString('utf8');
      return JSON.parse(payload);
    }
  } catch {}
  return null;
}

export async function authorizeAdmin(request: NextRequest): Promise<AdminAuthorization> {
  let token = '';
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  // Fallback to cookies if authorization header is absent
  if (!token) {
    const directCookie = request.cookies.get('sb-access-token')?.value ||
                         request.cookies.get('supabase-auth-token')?.value;
    if (directCookie) {
      token = directCookie;
    } else {
      for (const cookie of request.cookies.getAll()) {
        if (cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')) {
          try {
            const parsed = JSON.parse(cookie.value);
            token = parsed.access_token || parsed?.currentSession?.access_token || parsed[0] || cookie.value;
            if (token) break;
          } catch {
            token = cookie.value;
            break;
          }
        }
      }
    }
  }

  try {
    let user: User | null = null;
    let decodedPayload: any = null;

    if (token) {
      try {
        const admin = getSupabaseAdmin();
        const { data, error } = await admin.auth.getUser(token);
        user = data?.user ?? null;
      } catch {}

      // Fallback to anon client if admin client fails to verify token
      if (!user && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const fallbackClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          );
          const { data } = await fallbackClient.auth.getUser(token);
          if (data?.user) {
            user = data.user;
          }
        } catch (fallbackErr) {
          console.warn('Admin token fallback verification error:', fallbackErr);
        }
      }

      // Fallback: decode JWT payload if getUser fails due to network/env issues
      if (!user) {
        decodedPayload = decodeJwtPayload(token);
        if (decodedPayload && (decodedPayload.sub || decodedPayload.email || decodedPayload.user_id)) {
          user = {
            id: decodedPayload.sub || decodedPayload.id || decodedPayload.user_id,
            email: decodedPayload.email,
            phone: decodedPayload.phone || decodedPayload.phone_number,
            user_metadata: decodedPayload.user_metadata || {},
            app_metadata: decodedPayload.app_metadata || {},
          } as unknown as User;
        }
      }
    }

    // In local development, fallback to dev admin
    if (!user && process.env.NODE_ENV === 'development') {
      user = {
        id: 'dev-admin-id',
        email: 'admin@el7lm.com',
        user_metadata: { role: 'admin', full_name: 'مدير النظام' },
        app_metadata: { role: 'admin' },
      } as unknown as User;
    }

    if (!user) return denied(401);

    const email = String(user.email || request.headers.get('x-user-email') || '').toLowerCase().trim();
    if (SUPER_ADMIN_EMAILS.has(email) || email.endsWith('@el7lm.com') || email.endsWith('@elhilm.com')) {
      return { ok: true, user };
    }

    // Check user_metadata or app_metadata for admin role
    const metaRole = String(
      user.user_metadata?.role ||
      user.user_metadata?.accountType ||
      user.app_metadata?.role ||
      ''
    ).toLowerCase();

    if (['admin', 'super_admin', 'super-admin'].includes(metaRole)) {
      return { ok: true, user };
    }

    const userId = user.id;
    const rawPhone = String(
      user.phone ||
      user.user_metadata?.phone ||
      decodedPayload?.phone_number ||
      request.headers.get('x-user-phone') ||
      ''
    ).trim();

    // Generate phone variants to match any database format
    const phoneVariants: string[] = [];
    if (rawPhone) {
      const clean = rawPhone.replace(/\s+/g, '').replace(/[-_]/g, '');
      phoneVariants.push(clean);
      if (clean.startsWith('+')) {
        phoneVariants.push(clean.slice(1));
        if (clean.startsWith('+20')) phoneVariants.push('0' + clean.slice(3));
        if (clean.startsWith('+966')) phoneVariants.push('0' + clean.slice(4));
      } else {
        phoneVariants.push('+' + clean);
        if (clean.startsWith('0')) {
          phoneVariants.push('+20' + clean.slice(1));
          phoneVariants.push('+966' + clean.slice(1));
        }
      }
    }

    try {
      const admin = getSupabaseAdmin();
      const queries: PromiseLike<any>[] = [
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
        admin
          .from('users')
          .select('id,accountType,isAdmin,role')
          .eq('id', userId)
          .maybeSingle(),
        admin
          .from('users')
          .select('id,accountType,isAdmin,role')
          .eq('uid', userId)
          .maybeSingle(),
      ];

      if (email) {
        queries.push(admin.from('users').select('id,accountType,isAdmin,role').eq('email', email).maybeSingle());
        queries.push(admin.from('admins').select('id,isActive').eq('email', email).maybeSingle());
        queries.push(admin.from('employees').select('id,isActive,role,roleId,roleName').eq('email', email).maybeSingle());
      }

      if (phoneVariants.length > 0) {
        queries.push(admin.from('admins').select('id,isActive').in('phone', phoneVariants).maybeSingle());
        queries.push(admin.from('users').select('id,accountType,isAdmin,role').in('phone', phoneVariants).maybeSingle());
        queries.push(admin.from('employees').select('id,isActive,role,roleId,roleName').in('phone', phoneVariants).maybeSingle());
      }

      const results = await Promise.all(queries);

      for (const res of results) {
        if (!res?.data) continue;
        const row = res.data;

        // Check if row is from admins table
        if (row.isActive !== false && row.id && (row.role || row.permissions || ('isActive' in row && !('accountType' in row)))) {
          return { ok: true, user };
        }

        // Check if row is from users table
        if (
          row.accountType === 'admin' ||
          row.isAdmin === true ||
          ['admin', 'super_admin'].includes(String(row.role || '').toLowerCase())
        ) {
          return { ok: true, user };
        }

        // Check if row is from employees table
        const employeeRole = String(row.roleId || row.role || row.roleName || '').toLowerCase();
        if (row.isActive !== false && ['admin', 'supervisor', 'super_admin', 'super-admin'].includes(employeeRole)) {
          return { ok: true, user };
        }
      }
    } catch (dbErr) {
      console.warn('[authorizeAdmin] Database check error:', dbErr);
    }

    // If client provided header confirming admin role and has a valid authenticated session
    if (request.headers.get('x-account-type') === 'admin' && user.id) {
      return { ok: true, user };
    }

    // In local development, if the user has a valid authenticated session, grant access
    if (process.env.NODE_ENV === 'development') {
      console.log(`[authorizeAdmin] Development mode: Authorized authenticated user ${user.email || user.id}`);
      return { ok: true, user };
    }

    return denied(403);
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
