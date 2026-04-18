/**
 * Debug endpoint مؤقت لتشخيص مشكلة OTP
 * احذفه بعد حل المشكلة
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'dev only' }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  const results: Record<string, any> = {};

  // 1. تحقق من جدول otp_verifications
  try {
    const { data, error } = await db.from('otp_verifications').select('id').limit(1);
    results.otp_verifications = error ? { error: error.message, code: error.code } : { exists: true, sample: data };
  } catch (e: any) {
    results.otp_verifications = { threw: e.message };
  }

  // 2. تحقق من جدول otp_codes
  try {
    const { data, error } = await db.from('otp_codes').select('id').limit(1);
    results.otp_codes = error ? { error: error.message, code: error.code } : { exists: true, sample: data };
  } catch (e: any) {
    results.otp_codes = { threw: e.message };
  }

  // 3. تحقق من Admin API
  try {
    const { data, error } = await db.auth.admin.listUsers({ perPage: 1 });
    results.auth_admin = error ? { error: error.message } : { works: true, total: data?.users?.length };
  } catch (e: any) {
    results.auth_admin = { threw: e.message };
  }

  // 4. تحقق من جدول players بالـ phone
  const phone = request.nextUrl.searchParams.get('phone');
  if (phone) {
    try {
      const { data, error } = await db.from('players').select('id, phone, email, uid').eq('phone', phone).limit(3);
      results.players_by_phone = error ? { error: error.message } : { found: data?.length, data };
    } catch (e: any) {
      results.players_by_phone = { threw: e.message };
    }
  }

  return NextResponse.json(results, { status: 200 });
}
