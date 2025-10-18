import { createMessageFromTemplate, formatPhoneNumber, validatePhoneNumber } from '@/lib/whatsapp/babaservice-config';
import BabaserviceWhatsAppService from '@/lib/whatsapp/babaservice-whatsapp-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📱 [API /whatsapp/babaservice/otp] Body كامل:', JSON.stringify(body, null, 2));

    const { phoneNumber, otp, name, instance_id } = body;

    console.log('📱 [API /whatsapp/babaservice/otp] طلب إرسال OTP:', {
      phoneNumber,
      phoneNumberType: typeof phoneNumber,
      phoneNumberValue: phoneNumber,
      phoneNumberExists: !!phoneNumber,
      phoneNumberLength: phoneNumber?.length,
      otpLength: otp?.length,
      name,
      instance_id
    });

    // التحقق من البيانات المطلوبة
    if (!phoneNumber || phoneNumber === '' || phoneNumber === 'undefined') {
      console.error('❌ phoneNumber مفقود أو فارغ!', {
        phoneNumber,
        phoneNumberType: typeof phoneNumber,
        body: JSON.stringify(body)
      });
      return NextResponse.json({
        success: false,
        error: 'Phone number is required'
      }, { status: 400 });
    }

    if (!otp) {
      return NextResponse.json({
        success: false,
        error: 'رمز OTP مطلوب'
      }, { status: 400 });
    }

    if (!instance_id) {
      return NextResponse.json({
        success: false,
        error: 'Instance ID مطلوب'
      }, { status: 400 });
    }

    // تنسيق رقم الهاتف أولاً
    console.log('🔧 قبل formatPhoneNumber:', phoneNumber);
    const formattedPhone = formatPhoneNumber(phoneNumber);
    console.log('🔧 بعد formatPhoneNumber:', formattedPhone);

    // التحقق من صحة رقم الهاتف بعد التنسيق
    if (!validatePhoneNumber(formattedPhone)) {
      console.error('❌ رقم الهاتف غير صحيح بعد التنسيق:', formattedPhone);
      return NextResponse.json({
        success: false,
        error: 'رقم الهاتف غير صحيح'
      }, { status: 400 });
    }

    // إنشاء رسالة OTP
    const message = createMessageFromTemplate('OTP', {
      otp: otp.toString(),
      name: name || 'عزيزي المستخدم'
    });

    console.log('📤 قبل إرسال الرسالة:', {
      formattedPhone,
      message,
      instance_id
    });

    // إرسال الرسالة
    const whatsappService = new BabaserviceWhatsAppService();
    const result = await whatsappService.sendTextMessage(formattedPhone, message, instance_id);

    console.log('📱 [API /whatsapp/babaservice/otp] نتيجة الإرسال:', result);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'تم إرسال OTP عبر WhatsApp بنجاح',
        data: {
          phoneNumber: formattedPhone,
          otp: otp,
          message: message,
          timestamp: new Date().toISOString(),
          service: 'Babaservice WhatsApp'
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'فشل في إرسال OTP',
        data: result.data
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ [API /whatsapp/babaservice/otp] خطأ:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'حدث خطأ في إرسال OTP'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    console.log('📱 [API /whatsapp/babaservice/otp] GET request:', { action });

    switch (action) {
      case 'test':
        // اختبار إرسال OTP وهمي
        const testOTP = Math.floor(1000 + Math.random() * 9000).toString();
        const testPhone = '966501234567';
        const testMessage = createMessageFromTemplate('OTP', {
          otp: testOTP,
          name: 'مستخدم الاختبار'
        });

        return NextResponse.json({
          success: true,
          message: 'اختبار OTP WhatsApp',
          data: {
            phoneNumber: testPhone,
            otp: testOTP,
            message: testMessage,
            timestamp: new Date().toISOString(),
            note: 'هذا اختبار وهمي - لم يتم إرسال رسالة فعلية'
          }
        });

      case 'template':
        // عرض قالب رسالة OTP
        const template = createMessageFromTemplate('OTP', {
          otp: '1234',
          name: 'اسم المستخدم'
        });

        return NextResponse.json({
          success: true,
          message: 'قالب رسالة OTP',
          data: {
            template: template,
            variables: ['otp', 'name'],
            example: {
              otp: '1234',
              name: 'أحمد محمد'
            }
          }
        });

      default:
        return NextResponse.json({
          success: true,
          message: 'WhatsApp OTP API - Babaservice',
          endpoints: {
            POST: 'إرسال OTP عبر WhatsApp',
            GET: {
              test: 'اختبار إرسال OTP وهمي',
              template: 'عرض قالب رسالة OTP'
            }
          },
          usage: {
            POST: {
              phoneNumber: 'رقم الهاتف (مطلوب)',
              otp: 'رمز OTP (مطلوب)',
              name: 'اسم المستخدم (اختياري)',
              instance_id: 'معرف Instance (اختياري)'
            }
          }
        });
    }

  } catch (error: any) {
    console.error('❌ [API /whatsapp/babaservice/otp] خطأ GET:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'حدث خطأ في الخادم'
    }, { status: 500 });
  }
}
