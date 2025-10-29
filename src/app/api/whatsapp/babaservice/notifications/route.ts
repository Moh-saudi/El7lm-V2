import { createMessageFromTemplate, formatPhoneNumber, validatePhoneNumber } from '@/lib/whatsapp/babaservice-config';
import BabaserviceWhatsAppService from '@/lib/whatsapp/babaservice-whatsapp-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const {
      type,
      phoneNumbers,
      message,
      template,
      variables,
      instance_id,
      media_url,
      filename
    } = await request.json();

    console.log('🔔 [API /whatsapp/babaservice/notifications] طلب إرسال إشعارات:', {
      type,
      phoneNumbersCount: phoneNumbers?.length,
      phoneNumbers: phoneNumbers?.slice(0, 3), // أول 3 أرقام فقط
      messageLength: message?.length,
      messagePreview: message?.substring(0, 100),
      template,
      instance_id
    });

    // التحقق من البيانات المطلوبة
    if (!type) {
      return NextResponse.json({
        success: false,
        error: 'نوع الإشعار مطلوب'
      }, { status: 400 });
    }

    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'مصفوفة أرقام الهواتف مطلوبة'
      }, { status: 400 });
    }

    // التحقق من صحة أرقام الهواتف
    const invalidPhones = phoneNumbers.filter(phone => !validatePhoneNumber(phone));
    if (invalidPhones.length > 0) {
      return NextResponse.json({
        success: false,
        error: `أرقام هواتف غير صحيحة: ${invalidPhones.join(', ')}`
      }, { status: 400 });
    }

    // إنشاء الرسالة
    let finalMessage = message;
    if (template && variables) {
      finalMessage = createMessageFromTemplate(template as any, variables);
    }

    if (!finalMessage) {
      return NextResponse.json({
        success: false,
        error: 'الرسالة أو القالب مطلوب'
      }, { status: 400 });
    }

    // إرسال الرسائل
    const whatsappService = new BabaserviceWhatsAppService();
    const results = [];
    const errors = [];

    for (const phoneNumber of phoneNumbers) {
      try {
        console.log(`📱 معالجة رقم الهاتف: ${phoneNumber}`);
        const formattedPhone = formatPhoneNumber(phoneNumber);
        console.log(`📱 الرقم بعد التنسيق: ${formattedPhone}`);

        let result;
        if (media_url) {
          // إرسال رسالة مع ميديا
          console.log(`📱 إرسال رسالة مع ميديا لـ ${formattedPhone}`);
          result = await whatsappService.sendMediaMessage(
            formattedPhone,
            finalMessage,
            media_url,
            filename,
            instance_id
          );
        } else {
          // إرسال رسالة نصية
          console.log(`📱 إرسال رسالة نصية لـ ${formattedPhone}`);
          result = await whatsappService.sendTextMessage(
            formattedPhone,
            finalMessage,
            instance_id || '68F243B3A8D8D'
          );
        }

        console.log(`📱 نتيجة الإرسال لـ ${formattedPhone}:`, result);

        results.push({
          phoneNumber: formattedPhone,
          success: result.success,
          message: result.message,
          error: result.error
        });

        if (!result.success) {
          errors.push({
            phoneNumber: formattedPhone,
            error: result.error
          });
        }

      } catch (error: any) {
        console.error(`❌ خطأ في إرسال رسالة لـ ${phoneNumber}:`, error);
        errors.push({
          phoneNumber: formatPhoneNumber(phoneNumber),
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log('🔔 [API /whatsapp/babaservice/notifications] نتيجة الإرسال:', {
      total: phoneNumbers.length,
      success: successCount,
      failure: failureCount
    });

    return NextResponse.json({
      success: successCount > 0,
      message: `تم إرسال ${successCount} من ${phoneNumbers.length} رسالة بنجاح`,
      data: {
        total: phoneNumbers.length,
        success: successCount,
        failure: failureCount,
        results: results,
        errors: errors,
        timestamp: new Date().toISOString(),
        service: 'Babaservice WhatsApp'
      }
    });

  } catch (error: any) {
    console.error('❌ [API /whatsapp/babaservice/notifications] خطأ:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'حدث خطأ في إرسال الإشعارات'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    console.log('🔔 [API /whatsapp/babaservice/notifications] GET request:', { action });

    switch (action) {
      case 'templates':
        // عرض القوالب المتاحة
        return NextResponse.json({
          success: true,
          message: 'قوالب الرسائل المتاحة',
          data: {
            templates: {
              WELCOME: 'مرحباً بك في منصة العلم! 🎓',
              OTP: 'رمز التحقق الخاص بك هو: {otp}',
              ORDER_CONFIRMATION: 'تم تأكيد طلبك بنجاح! رقم الطلب: {orderId}',
              ORDER_UPDATE: 'تم تحديث حالة طلبك رقم {orderId} إلى: {status}',
              PAYMENT_SUCCESS: 'تم استلام دفعتك بنجاح! شكراً لك.',
              COURSE_ENROLLMENT: 'تم تسجيلك في الدورة: {courseName}',
              NOTIFICATION: 'لديك إشعار جديد: {message}'
            },
            usage: 'استخدم اسم القالب في حقل template والمتغيرات في حقل variables'
          }
        });

      case 'test':
        // اختبار إرسال إشعار وهمي
        return NextResponse.json({
          success: true,
          message: 'اختبار إرسال الإشعارات',
          data: {
            phoneNumbers: ['966501234567'],
            message: 'مرحباً بك في منصة العلم! 🎓',
            timestamp: new Date().toISOString(),
            note: 'هذا اختبار وهمي - لم يتم إرسال رسائل فعلية'
          }
        });

      default:
        return NextResponse.json({
          success: true,
          message: 'WhatsApp Notifications API - Babaservice',
          endpoints: {
            POST: 'إرسال إشعارات جماعية عبر WhatsApp',
            GET: {
              templates: 'عرض القوالب المتاحة',
              test: 'اختبار إرسال إشعار وهمي'
            }
          },
          usage: {
            POST: {
              type: 'نوع الإشعار (مطلوب)',
              phoneNumbers: 'مصفوفة أرقام الهواتف (مطلوب)',
              message: 'نص الرسالة (اختياري إذا تم استخدام template)',
              template: 'اسم القالب (اختياري)',
              variables: 'متغيرات القالب (اختياري)',
              instance_id: 'معرف Instance (اختياري)',
              media_url: 'رابط الميديا (اختياري)',
              filename: 'اسم الملف (اختياري)'
            }
          },
          examples: {
            text_notification: {
              type: 'general',
              phoneNumbers: ['966501234567', '966501234568'],
              message: 'مرحباً بك في منصة العلم!'
            },
            template_notification: {
              type: 'order_confirmation',
              phoneNumbers: ['966501234567'],
              template: 'ORDER_CONFIRMATION',
              variables: { orderId: '12345' }
            },
            media_notification: {
              type: 'announcement',
              phoneNumbers: ['966501234567'],
              message: 'إعلان مهم!',
              media_url: 'https://example.com/image.jpg'
            }
          }
        });
    }

  } catch (error: any) {
    console.error('❌ [API /whatsapp/babaservice/notifications] خطأ GET:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'حدث خطأ في الخادم'
    }, { status: 500 });
  }
}

