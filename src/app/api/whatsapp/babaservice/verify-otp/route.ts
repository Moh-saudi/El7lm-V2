import { NextRequest, NextResponse } from 'next/server';
import { verifyOTPInFirestore } from '@/lib/otp/firestore-otp-manager';

/**
 * API Route للتحقق من OTP
 * يستخدم Firestore لتخزين OTP بدلاً من الذاكرة
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, otp } = body;

    console.log('🔍 [verify-otp] Received request:', { phoneNumber, otp: otp ? '***' : 'missing' });

    if (!phoneNumber || !otp) {
      return NextResponse.json({ 
        success: false, 
        error: 'رقم الهاتف ورمز التحقق مطلوبان' 
      }, { status: 400 });
    }

    // التحقق من OTP في Firestore
    const result = await verifyOTPInFirestore(phoneNumber, otp);

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'تم التحقق من رمز التحقق بنجاح' 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error || 'رمز التحقق غير صحيح',
        attemptsRemaining: result.attemptsRemaining
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ [API /whatsapp/babaservice/verify-otp] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'حدث خطأ أثناء التحقق من رمز التحقق' 
    }, { status: 500 });
  }
}
