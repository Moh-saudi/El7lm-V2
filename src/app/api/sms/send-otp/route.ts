import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, name, otpLength = 4, lang = 'ar' } = await request.json();

    console.log('📱 [send-otp] إرسال OTP:', { phoneNumber, name, otpLength, lang });

    // التحقق من البيانات المطلوبة
    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'رقم الهاتف مطلوب' },
        { status: 400 }
      );
    }

    // تنسيق رقم الهاتف (إزالة + إذا وجد)
    const cleanPhone = phoneNumber.replace(/^\+/, '');

    // إرسال OTP عبر BeOn v3
    const beonUrl = process.env.BEON_OTP_BASE_URL || 'https://beon.chat/api/send/message/otp';
    const beonToken = process.env.BEON_OTP_TOKEN || process.env.BEON_V3_TOKEN;

    console.log('🔧 [send-otp] BeOn config:', {
      url: beonUrl,
      tokenSet: !!beonToken,
      tokenLength: beonToken?.length
    });

    const beonResponse = await fetch(beonUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'beon-token': beonToken || ''
      },
      body: JSON.stringify({
        phoneNumber: cleanPhone,
        name: name || 'El7lm',
        type: 'sms',
        otp_length: otpLength,
        lang: lang
      })
    });

    const beonData = await beonResponse.json();
    console.log('📨 [send-otp] استجابة BeOn:', beonData);

    if (beonResponse.ok && beonData.success) {
      return NextResponse.json({
        success: true,
        message: 'تم إرسال رمز التحقق بنجاح',
        reference: beonData.reference || beonData.data?.reference,
        expiresIn: 300 // 5 دقائق
      });
    } else {
      console.error('❌ [send-otp] فشل BeOn:', beonData);
      return NextResponse.json({
        success: false,
        error: beonData.error || beonData.message || 'فشل في إرسال رمز التحقق'
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ [send-otp] خطأ:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'حدث خطأ في إرسال رمز التحقق'
    }, { status: 500 });
  }
}

