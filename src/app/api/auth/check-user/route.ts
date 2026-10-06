/**
 * Check if user exists by phone or email
 * Hardened & Optimized: Fast single lookup & Anti-enumeration protection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { findAccountByPhone } from '@/lib/auth/phone-account-lookup';
import { rateLimiter, getClientIpFromHeaders } from '@/lib/security/rate-limit';

const SEARCH_TABLES = ['users', 'players', 'clubs', 'academies', 'agents', 'trainers', 'marketers', 'admins'];

async function findByEmail(email: string): Promise<{ exists: boolean }> {
  const normalizedEmail = email.trim().toLowerCase();
  const db = getSupabaseAdmin();

  // 1. Fast check in primary users table
  const { data: primaryUser } = await db
    .from('users')
    .select('id')
    .ilike('email', normalizedEmail)
    .limit(1)
    .maybeSingle();

  if (primaryUser) {
    return { exists: true };
  }

  // 2. Parallel check across other role tables simultaneously if not in primary
  const checks = SEARCH_TABLES.slice(1).map(table =>
    db
      .from(table)
      .select('id')
      .ilike('email', normalizedEmail)
      .limit(1)
      .maybeSingle()
  );

  const results = await Promise.all(checks);
  const found = results.some(res => res.data != null);
  return { exists: found };
}

async function findByPhone(phone: string): Promise<{ exists: boolean }> {
  try {
    const account = await findAccountByPhone(phone);
    return { exists: account.found };
  } catch (error) {
    console.error('[check-user] findByPhone error:', error);
    return { exists: false };
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. IP Rate Limiting (Anti-enumeration / Brute-force protection)
    const clientIp = getClientIpFromHeaders(request.headers);
    const rateCheck = rateLimiter.check(`check_user:${clientIp}`, {
      windowMs: 60 * 1000, // 1 minute
      max: 10,             // 10 checks per minute per IP
      minIntervalMs: 300,  // minimum 300ms between checks
    });

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          exists: false,
          error: 'تم تجاوز الحد المسموح به من الطلبات. يرجى المحاولة بعد قليل.',
          retryAfterMs: rateCheck.retryAfterMs,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(rateCheck.retryAfterMs / 1000)) },
        }
      );
    }

    const body = await request.json();
    const phoneNumber = typeof body?.phoneNumber === 'string' ? body.phoneNumber.trim() : '';
    const email = typeof body?.email === 'string' ? body.email.trim() : '';

    if (!phoneNumber && !email) {
      return NextResponse.json(
        { success: false, error: 'رقم الهاتف أو البريد الإلكتروني مطلوب', exists: false },
        { status: 400 }
      );
    }

    const result = email ? await findByEmail(email) : await findByPhone(phoneNumber);

    // Anti-enumeration: Only return exists flag, never leak uid or profile metadata
    return NextResponse.json({
      success: true,
      exists: result.exists,
      message: result.exists ? 'المستخدم موجود في النظام' : 'المستخدم غير موجود في النظام',
    });
  } catch (error: any) {
    console.error('❌ [check-user]', error);
    return NextResponse.json(
      { success: false, exists: false, error: 'حدث خطأ أثناء التحقق' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Check user endpoint is working (hardened)',
    timestamp: new Date().toISOString(),
  });
}
