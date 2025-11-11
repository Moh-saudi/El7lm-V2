import { formatPhoneNumber, validatePhoneNumber } from '@/lib/whatsapp/babaservice-config';
import BabaserviceWhatsAppService from '@/lib/whatsapp/babaservice-whatsapp-service';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint لإرسال رسائل WhatsApp رسمية
 * يستخدم Babaservice WhatsApp API
 */
export async function POST(request: NextRequest) {
  try {
    const {
      to,
      recipientPhone,
      message,
      playerName,
      senderPhone,
      organizationName,
      accountType
    } = await request.json();

    // استخدام to أو recipientPhone (للتوافق مع كلا الاستخدامين)
    const phoneNumber = to || recipientPhone;

    console.log('📱 [API /whatsapp/send-official] طلب إرسال رسالة رسمية:', {
      phoneNumber,
      messageLength: message?.length,
      messagePreview: message?.substring(0, 100),
      playerName,
      senderPhone,
      organizationName,
      accountType
    });

    // التحقق من البيانات المطلوبة
    if (!phoneNumber) {
      return NextResponse.json({
        success: false,
        error: 'رقم الهاتف مطلوب'
      }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({
        success: false,
        error: 'الرسالة مطلوبة'
      }, { status: 400 });
    }

    // التحقق من صحة رقم الهاتف
    if (!validatePhoneNumber(phoneNumber)) {
      return NextResponse.json({
        success: false,
        error: 'رقم الهاتف غير صحيح - يجب أن يكون الرقم بصيغة دولية صحيحة'
      }, { status: 400 });
    }

    // تنسيق رقم الهاتف
    const formattedPhone = formatPhoneNumber(phoneNumber);
    console.log('📱 [API /whatsapp/send-official] تنسيق رقم الهاتف:', {
      original: phoneNumber,
      formatted: formattedPhone
    });

    // إرسال الرسالة عبر Babaservice
    const whatsappService = new BabaserviceWhatsAppService();
    const instanceId = process.env.BABASERVICE_INSTANCE_ID || '68F243B3A8D8D';
    
    console.log('📤 [API /whatsapp/send-official] إرسال الرسالة...');
    const result = await whatsappService.sendTextMessage(
      formattedPhone,
      message,
      instanceId
    );

    console.log('📱 [API /whatsapp/send-official] نتيجة الإرسال:', result);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'تم إرسال الرسالة بنجاح',
        messageId: result.data?.messageId || result.data?.id,
        service: 'Babaservice WhatsApp',
        data: {
          phoneNumber: formattedPhone,
          playerName,
          organizationName,
          accountType,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'فشل في إرسال الرسالة',
        data: result.data
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ [API /whatsapp/send-official] خطأ:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'حدث خطأ في إرسال الرسالة'
    }, { status: 500 });
  }
}

/**
 * GET endpoint للمعلومات
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'WhatsApp Official Send API',
    description: 'API endpoint لإرسال رسائل WhatsApp رسمية عبر Babaservice',
    usage: {
      method: 'POST',
      endpoint: '/api/whatsapp/send-official',
      body: {
        to: 'رقم الهاتف (مطلوب)',
        message: 'نص الرسالة (مطلوب)',
        playerName: 'اسم اللاعب (اختياري)',
        senderPhone: 'رقم المرسل (اختياري)',
        organizationName: 'اسم المنظمة (اختياري)',
        accountType: 'نوع الحساب (اختياري)'
      }
    },
    examples: {
      basic: {
        to: '+97477123456',
        message: 'مرحباً بك في منصة الحلم!'
      },
      withDetails: {
        to: '+97477123456',
        message: 'مرحباً بك في منصة الحلم!',
        playerName: 'أحمد محمد',
        organizationName: 'نادي الشباب',
        accountType: 'club'
      }
    }
  });
}

