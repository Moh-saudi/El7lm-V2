import { NextRequest, NextResponse } from 'next/server';
import { BeOnSMSService } from '@/lib/beon/sms-service';

export async function POST(request: NextRequest) {
  try {
    let { phoneNumbers, singlePhone, message } = await request.json();

    console.log('📱 [API /beon/sms] اختبار إرسال SMS:', { phoneNumbers, singlePhone, messageLength: message?.length });

    // دعم singlePhone (للرسائل الفردية)
    if (singlePhone && !phoneNumbers) {
      phoneNumbers = [singlePhone];
    }

    // التحقق من البيانات
    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'يجب توفير رقم هاتف أو مصفوفة أرقام'
      }, { status: 400 });
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'يجب توفير نص الرسالة'
      }, { status: 400 });
    }

    // إرسال الرسالة
    const smsService = new BeOnSMSService();
    const result = await smsService.sendBulkSMS(phoneNumbers, message);

    console.log('📱 [API /beon/sms] نتيجة الإرسال:', result);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        data: result.data,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        code: result.code,
        retryAfter: result.retryAfter,
        data: result.data
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ [API /beon/sms] خطأ:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'حدث خطأ في إرسال الرسالة'
    }, { status: 500 });
  }
}

