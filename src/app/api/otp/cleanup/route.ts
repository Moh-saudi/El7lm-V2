/**
 * API Route لتنظيف OTP المنتهية الصلاحية
 * يمكن استدعاء هذا الـ endpoint بشكل دوري (مثلاً كل ساعة) عبر cron job
 */

import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredOTPs } from '@/lib/otp/firestore-otp-manager';

export async function POST(request: NextRequest) {
  try {
    // يمكن إضافة API key للتحقق من الهوية
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.OTP_CLEANUP_TOKEN || 'cleanup-token-secret';
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const deletedCount = await cleanupExpiredOTPs();
    
    return NextResponse.json({
      success: true,
      message: `تم حذف ${deletedCount} OTP منتهي الصلاحية`,
      deletedCount
    });
  } catch (error: any) {
    console.error('❌ [OTP Cleanup] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'حدث خطأ أثناء تنظيف OTP'
    }, { status: 500 });
  }
}

// GET endpoint للاختبار
export async function GET() {
  try {
    const deletedCount = await cleanupExpiredOTPs();
    return NextResponse.json({
      success: true,
      message: `تم حذف ${deletedCount} OTP منتهي الصلاحية`,
      deletedCount,
      note: 'استخدم POST مع Bearer token للإنتاج'
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'حدث خطأ أثناء تنظيف OTP'
    }, { status: 500 });
  }
}

