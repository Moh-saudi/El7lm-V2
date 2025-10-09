import { NextRequest, NextResponse } from 'next/server';
import { BeOnSMSService } from '@/lib/beon/sms-service';

export async function POST(request: NextRequest) {
  try {
    let { phoneNumbers, singlePhone, message, type = 'sms' } = await request.json();

    console.log('📨 [API /beon/messages] اختبار إرسال رسائل موحدة:', { phoneNumbers, singlePhone, type, messageLength: message?.length });

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

    // إرسال الرسالة (نستخدم SMS دائماً لأن BeOn V3 لا يدعم WhatsApp فعلياً)
    const smsService = new BeOnSMSService();
    const result = await smsService.sendBulkSMS(phoneNumbers, message);

    console.log('📨 [API /beon/messages] نتيجة الإرسال:', result);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        data: result.data,
        type: type,
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
    console.error('❌ [API /beon/messages] خطأ:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'حدث خطأ في إرسال الرسالة'
    }, { status: 500 });
  }
}

