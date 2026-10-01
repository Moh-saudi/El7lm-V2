import { NextRequest, NextResponse } from 'next/server';
import { verifyOTPInFirestore } from '@/lib/otp/firestore-otp-manager';
import { consumePhoneActionRateLimit } from '@/lib/auth/phone-lookup-rate-limit';

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

    const allowed = await consumePhoneActionRateLimit(request, String(phoneNumber), {
      namespace: 'otp-verify',
      maxPerIp: 30,
      maxPerIpPhone: 5,
    });
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'عدد كبير من محاولات التحقق. حاول لاحقاً.' },
        { status: 429, headers: { 'Retry-After': '900' } },
      );
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

export const runtime = 'nodejs';
