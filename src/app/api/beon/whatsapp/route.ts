import { NextRequest, NextResponse } from 'next/server';
import { BeOnWhatsAppService } from '@/lib/beon/whatsapp-service';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumbers, message } = await request.json();

    console.log('💬 [API /beon/whatsapp] اختبار إرسال WhatsApp:', { phoneNumbers, messageLength: message?.length });

    // التحقق من البيانات
    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'يجب توفير مصفوفة أرقام هواتف'
      }, { status: 400 });
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'يجب توفير نص الرسالة'
      }, { status: 400 });
    }

    // إرسال الرسالة (سيتم إرسالها كـ SMS حسب توثيق BeOn V3)
    const whatsappService = new BeOnWhatsAppService();
    const result = await whatsappService.sendBulkWhatsApp(phoneNumbers, message);

    console.log('💬 [API /beon/whatsapp] نتيجة الإرسال:', result);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        data: result.data,
        timestamp: new Date().toISOString(),
        note: 'تحذير: BeOn V3 يرسل WhatsApp كـ SMS'
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
    console.error('❌ [API /beon/whatsapp] خطأ:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'حدث خطأ في إرسال الرسالة'
    }, { status: 500 });
  }
}

