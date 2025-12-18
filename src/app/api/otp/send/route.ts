/**
 * Unified OTP Send API
 * API موحد لإرسال OTP عبر جميع القنوات
 * 
 * هذا API يوحد جميع استدعاءات إرسال OTP في مكان واحد
 * ويستخدم الخدمة الموحدة (unified-otp-service)
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendOTP, SendOTPOptions } from '@/lib/otp/unified-otp-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      phoneNumber,
      name,
      purpose = 'registration',
      channel = 'auto',
      customOTP,
      instanceId
    } = body;

    if (!phoneNumber) {
      return NextResponse.json({
        success: false,
        error: 'رقم الهاتف مطلوب'
      }, { status: 400 });
    }

    const options: SendOTPOptions = {
      phoneNumber,
      name,
      purpose: purpose as any,
      channel: channel as any,
      customOTP,
      instanceId
    };

    const result = await sendOTP(options);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message || 'تم إرسال رمز التحقق بنجاح',
        channel: result.channel,
        // لا نرجع OTP في الإنتاج - هذا للتطوير فقط
        ...(process.env.NODE_ENV === 'development' && { otp: result.otp })
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'فشل في إرسال رمز التحقق',
        channel: result.channel
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('❌ [Unified OTP API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'حدث خطأ أثناء إرسال رمز التحقق'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Unified OTP Send API',
    usage: {
      method: 'POST',
      body: {
        phoneNumber: 'string (required) - رقم الهاتف',
        name: 'string (optional) - اسم المستخدم',
        purpose: 'string (optional) - registration | login | password_reset | verification',
        channel: 'string (optional) - whatsapp | sms | firebase_phone | auto',
        customOTP: 'string (optional) - OTP مخصص (إذا لم يتم توفيره، سيتم توليده تلقائياً)',
        instanceId: 'string (optional) - Instance ID لـ WhatsApp'
      }
    },
    examples: {
      whatsapp: {
        phoneNumber: '+966501234567',
        name: 'أحمد محمد',
        purpose: 'registration',
        channel: 'whatsapp'
      },
      sms: {
        phoneNumber: '+966501234567',
        name: 'أحمد محمد',
        purpose: 'password_reset',
        channel: 'sms'
      },
      auto: {
        phoneNumber: '+966501234567',
        name: 'أحمد محمد',
        purpose: 'login',
        channel: 'auto' // سيحاول WhatsApp أولاً، ثم SMS
      }
    }
  });
}



