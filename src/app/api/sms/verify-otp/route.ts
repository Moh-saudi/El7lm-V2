import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, otp, reference } = await request.json();

    console.log('🔑 [verify-otp] التحقق من OTP:', { phoneNumber, otp, reference });

    // التحقق من البيانات المطلوبة
    if (!phoneNumber || !otp) {
      return NextResponse.json(
        { success: false, error: 'رقم الهاتف ورمز التحقق مطلوبان' },
        { status: 400 }
      );
    }

    // تنسيق رقم الهاتف (إزالة + إذا وجد)
    const cleanPhone = phoneNumber.replace(/^\+/, '');

    // التحقق من OTP عبر BeOn v3
    const beonUrl = process.env.BEON_OTP_VERIFY_URL || 'https://beon.chat/api/verify/message/otp';
    const beonToken = process.env.BEON_OTP_TOKEN || process.env.BEON_V3_TOKEN;

    if (!beonToken) {
      console.error('❌ [verify-otp] BEON_OTP_TOKEN is not set in environment variables');
      return NextResponse.json(
        { success: false, error: 'خدمة التحقق غير مهيأة بشكل صحيح' },
        { status: 500 }
      );
    }

    const beonResponse = await fetch(beonUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'beon-token': beonToken || ''
      },
      body: JSON.stringify({
        phoneNumber: cleanPhone,
        otp: otp,
        reference: reference
      })
    });

    const responseText = await beonResponse.text();
    let beonData;
    try {
      beonData = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ [verify-otp] Failed to parse BeOn response as JSON. Response text:', responseText);
      return NextResponse.json({
        success: false,
        verified: false,
        error: 'Invalid response from verification service.'
      }, { status: 502 }); // Bad Gateway, since we got a bad response from an upstream server
    }

    console.log('📨 [verify-otp] استجابة BeOn:', beonData);

    if (beonResponse.ok && beonData.success) {
      return NextResponse.json({
        success: true,
        message: 'تم التحقق من الرمز بنجاح',
        verified: true
      });
    } else {
      return NextResponse.json({
        success: false,
        verified: false,
        error: beonData.error || beonData.message || 'رمز التحقق غير صحيح'
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ [verify-otp] خطأ:', error);
    return NextResponse.json({
      success: false,
      verified: false,
      error: error.message || 'حدث خطأ في التحقق من الرمز'
    }, { status: 500 });
  }
}

