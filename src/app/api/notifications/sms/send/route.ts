import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, message, type = 'notification' } = body;

    console.log('📱 استلام طلب إرسال SMS:', { phoneNumber, type });

    // التحقق من البيانات المطلوبة
    if (!phoneNumber || !message) {
      return NextResponse.json(
        { error: 'رقم الهاتف والرسالة مطلوبان' },
        { status: 400 }
      );
    }

    // تنظيف رقم الهاتف
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('20') ? `+${cleanPhone}` : `+20${cleanPhone}`;

    console.log('📞 رقم الهاتف المنظف:', formattedPhone);

    // إرسال SMS باستخدام BeOn API
    const beonResponse = await fetch('https://api.beon.com/send/message/sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'beon-token': process.env.BEON_SMS_TOKEN || 'SPb4sgedfe'
      },
      body: JSON.stringify({
        name: 'منصة الحلم',
        phoneNumber: formattedPhone,
        message: message
      })
    });

    const beonData = await beonResponse.json();
    console.log('📨 استجابة BeOn:', beonData);

    if (beonResponse.ok) {
      return NextResponse.json({
        success: true,
        message: 'تم إرسال الإشعار عبر SMS بنجاح',
        method: 'sms',
        originalPhone: phoneNumber,
        formattedPhone: formattedPhone,
        providerStatus: beonResponse.status,
        providerBody: beonData,
        responseTime: Date.now()
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'فشل في إرسال SMS',
        details: {
          status: beonResponse.status,
          statusText: beonResponse.statusText,
          providerStatus: beonResponse.status,
          providerBody: beonData
        }
      }, { status: beonResponse.status });
    }

  } catch (error) {
    console.error('❌ خطأ في إرسال SMS:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'حدث خطأ في إرسال SMS',
        details: error instanceof Error ? error.message : 'خطأ غير معروف'
      },
      { status: 500 }
    );
  }
}
