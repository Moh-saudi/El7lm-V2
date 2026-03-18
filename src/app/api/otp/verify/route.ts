import { NextRequest, NextResponse } from 'next/server';
import { verifyOTPInFirestore } from '@/lib/otp/firestore-otp-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, otp } = body;

    if (!phoneNumber || !otp) {
      return NextResponse.json({
        success: false,
        error: 'رقم الهاتف ورمز التحقق مطلوبان'
      }, { status: 400 });
    }

    const result = await verifyOTPInFirestore(phoneNumber, otp);

    if (result.success) {
      return NextResponse.json({ success: true, message: 'تم التحقق بنجاح' });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'رمز التحقق غير صحيح'
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('❌ [OTP Verify API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'حدث خطأ أثناء التحقق من الرمز'
    }, { status: 500 });
  }
}
