import { createMessageFromTemplate, formatPhoneNumber, validatePhoneNumber } from '@/lib/whatsapp/babaservice-config';
import BabaserviceWhatsAppService from '@/lib/whatsapp/babaservice-whatsapp-service';
import { NextRequest, NextResponse } from 'next/server';
import { storeOTPInFirestore, hasActiveOTP } from '@/lib/otp/firestore-otp-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📱 [API /whatsapp/babaservice/otp] Body كامل:', JSON.stringify(body, null, 2));

    let { phoneNumber, otp, name, instance_id } = body;

    // 💡 إنشاء OTP على الخادم إذا لم يتم توفيره
    if (!otp) {
      otp = Math.floor(100000 + Math.random() * 900000).toString();
      console.log(`🔑 OTP لم يتم توفيره, تم إنشاء واحد جديد: ${otp}`);
    }

    // تنسيق رقم الهاتف أولاً قبل أي استخدام
    const formattedPhone = formatPhoneNumber(phoneNumber);

    // التحقق من وجود OTP نشط (Rate Limiting)
    const hasActive = await hasActiveOTP(formattedPhone);
    if (hasActive) {
      return NextResponse.json({
        success: false,
        error: 'يوجد رمز تحقق نشط بالفعل. يرجى الانتظار قليلاً أو استخدام الرمز المرسل سابقاً'
      }, { status: 429 }); // Too Many Requests
    }

    // تخزين الرمز في Firestore للتحقق لاحقاً
    const storeResult = await storeOTPInFirestore(formattedPhone, otp, 'registration');
    if (!storeResult.success) {
      return NextResponse.json({
        success: false,
        error: storeResult.error || 'فشل في حفظ رمز التحقق'
      }, { status: 500 });
    }

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

    const whatsappService = new BabaserviceWhatsAppService();
    const config = whatsappService.getConfig();
    const targetInstanceId = instance_id || config.instanceId;

    console.log('🔧 معلومات Instance:', {
      requested: instance_id,
      fromConfig: config.instanceId,
      final: targetInstanceId,
      baseUrl: config.baseUrl,
      hasToken: !!config.accessToken
    });

    if (!targetInstanceId) {
      console.error('❌ لا يوجد Instance ID متاح للإرسال');
      return NextResponse.json({
        success: false,
        error: 'خدمة WhatsApp غير مهيأة بشكل صحيح (رقم الجهاز غير معروف)'
      }, { status: 500 });
    }

    // التحقق من حالة الاتصال قبل الإرسال
    console.log('📡 [Critical Check] التحقق من حالة اتصال WhatsApp Instance:', targetInstanceId);
    try {
      const connectionStatus = await whatsappService.getQRCode(targetInstanceId);
      console.log('📡 [Critical Check] نتيجة فحص حالة الاتصال:', {
        success: connectionStatus.success,
        hasQrCode: !!connectionStatus.qr_code,
        error: connectionStatus.error
      });

      if (connectionStatus.success && connectionStatus.qr_code) {
        console.error('❌ [CRITICAL] Instance غير متصل بـ WhatsApp - يوجد QR Code للربط');
        console.error('❌ [CRITICAL] الرسائل ستصل للمزود لكن لن تُرسل للأرقام!');
        return NextResponse.json({
          success: false,
          error: `🔴 خدمة WhatsApp غير مربوطة برقم واتساب!

⚠️ المشكلة:
الرسائل تصل للمزود لكن لا تُرسل للأرقام لأن Instance ID (${targetInstanceId}) غير متصل بتطبيق WhatsApp.

📱 الحل الفوري:
1. افتح: /dashboard/admin/babaservice-whatsapp
2. ستجد QR Code
3. امسحه بتطبيق WhatsApp Business من هاتفك
4. بعد ظهور "متصل"، عد وجرب مرة أخرى

💡 هذه خطوة لمرة واحدة فقط!`,
          data: {
            instanceId: targetInstanceId,
            status: 'disconnected',
            needsQrScan: true,
            managementUrl: '/dashboard/admin/babaservice-whatsapp'
          }
        }, { status: 503 });
      }

      if (connectionStatus.success && !connectionStatus.qr_code) {
        console.log('✅ [Critical Check] Instance متصل بـ WhatsApp ومستعد للإرسال');
      } else if (!connectionStatus.success) {
        console.warn('⚠️ [Critical Check] تعذر التحقق من حالة الاتصال:', connectionStatus.error);
        console.warn('⚠️ سنحاول الإرسال - قد تصل أو لا تصل حسب حالة Instance الفعلية');
      }
    } catch (statusError) {
      console.warn('⚠️ [Critical Check] فشل فحص حالة اتصال WhatsApp:', statusError);
      console.warn('⚠️ سنحاول الإرسال على أي حال...');
    }

    // إرسال الرسالة
    console.log('📤 محاولة إرسال الرسالة الآن...');
    const result = await whatsappService.sendTextMessage(formattedPhone, message, targetInstanceId);

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
          service: 'Babaservice WhatsApp',
          instanceId: targetInstanceId
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'فشل في إرسال OTP',
        data: {
          ...result.data,
          instanceId: targetInstanceId
        }
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
