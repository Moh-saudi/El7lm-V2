/**
 * API Route لتنظيف OTP المنتهية الصلاحية
 * يتم استدعاؤه تلقائياً عبر Vercel Cron أو يدورياً عبر مهام الصيانة
 */

import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredOTPs } from '@/lib/otp/firestore-otp-manager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAuthorized(request: NextRequest): boolean {
  // 1. فحص ترويسة Vercel Cron الرسمية
  if (request.headers.get('x-vercel-cron') === '1') {
    return true;
  }

  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const cleanupToken = process.env.OTP_CLEANUP_TOKEN;

  // 2. فحص Bearer Token إن وُجد في المتغيرات
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }
  if (cleanupToken && authHeader === `Bearer ${cleanupToken}`) {
    return true;
  }

  // 3. السماح في وضع التطوير المحلي
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك بتنفيذ هذه العملية' },
        { status: 401 }
      );
    }

    const deletedCount = await cleanupExpiredOTPs();

    return NextResponse.json({
      success: true,
      message: `تم حذف ${deletedCount} OTP منتهي الصلاحية بنجاح`,
      deletedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('❌ [OTP Cleanup POST Error]:', error);
    const msg = error instanceof Error ? error.message : 'حدث خطأ أثناء تنظيف OTP';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك بتنفيذ هذه العملية' },
        { status: 401 }
      );
    }

    const deletedCount = await cleanupExpiredOTPs();

    return NextResponse.json({
      success: true,
      message: `تم حذف ${deletedCount} OTP منتهي الصلاحية بنجاح عبر Cron`,
      deletedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('❌ [OTP Cleanup GET Error]:', error);
    const msg = error instanceof Error ? error.message : 'حدث خطأ أثناء تنظيف OTP';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
