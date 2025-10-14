import { NextRequest, NextResponse } from 'next/server';
import { beonOTPService } from '@/lib/beon/otp-service';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, name, otpLength = 6, lang = 'ar' } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json({ success: false, error: 'رقم الهاتف مطلوب' }, { status: 400 });
    }
    
    // Use the new centralized service to send the OTP
    const result = await beonOTPService.sendOTP(phoneNumber, otpLength);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'تم إرسال رمز التحقق بنجاح',
        reference: result.data?.reference, // Pass reference if available
      });
    } else {
      // The service has already logged the detailed error, so we can return a user-friendly message.
      return NextResponse.json({
        success: false,
        error: result.error || 'فشل في إرسال رمز التحقق',
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ [send-otp] خطأ فادح:', error);
    return NextResponse.json({
      success: false,
      error: 'حدث خطأ داخلي في الخادم',
    }, { status: 500 });
  }
}

