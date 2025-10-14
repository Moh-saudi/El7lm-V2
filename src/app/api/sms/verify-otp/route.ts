import { NextRequest, NextResponse } from 'next/server';
import { BEON_V3_CONFIG, createBeOnHeaders } from '@/lib/beon/config';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, otp, reference } = await request.json();

    if (!phoneNumber || !otp) {
      return NextResponse.json({ success: false, error: 'رقم الهاتف ورمز التحقق مطلوبان' }, { status: 400 });
    }

    const beonUrl = `${BEON_V3_CONFIG.BASE_URL}/api/v3/verify/otp`; // Correct V3 endpoint
    const beonToken = BEON_V3_CONFIG.TOKEN;

    if (!beonToken) {
      console.error('❌ [verify-otp] BEON_V3_TOKEN is not set');
      return NextResponse.json({ success: false, error: 'خدمة التحقق غير مهيأة' }, { status: 500 });
    }

    const requestBody = {
      phoneNumber: phoneNumber.replace(/^\+/, ''),
      otp: otp,
      reference: reference, // reference is often needed for verification
    };

    const beonResponse = await fetch(beonUrl, {
      method: 'POST',
      headers: createBeOnHeaders(beonToken),
      body: JSON.stringify(requestBody),
    });

    const responseText = await beonResponse.text();
    let beonData;
    try {
      beonData = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ [verify-otp] Failed to parse BeOn response. Status:', beonResponse.status, 'Response:', responseText);
      return NextResponse.json({ success: false, error: 'Invalid response from verification service.' }, { status: 502 });
    }

    if (beonResponse.ok && (beonData.success || beonData.status === 'success')) {
      return NextResponse.json({ success: true, message: 'تم التحقق بنجاح', verified: true });
    } else {
      return NextResponse.json({
        success: false,
        verified: false,
        error: beonData.error || beonData.message || 'رمز التحقق غير صحيح'
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ [verify-otp] Fatal error:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ فادح في التحقق' }, { status: 500 });
  }
}

