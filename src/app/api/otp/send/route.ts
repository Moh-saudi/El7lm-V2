/**
 * Unified OTP Send API
 * API موحد لإرسال OTP عبر جميع القنوات
 * 
 * هذا API يوحد جميع استدعاءات إرسال OTP في مكان واحد
 * ويستخدم الخدمة الموحدة (unified-otp-service)
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendOTP, SendOTPOptions } from '@/lib/otp/unified-otp-service';
import { isPlayReviewPhone } from '@/lib/otp/play-review-otp';
import { findAccountByPhone } from '@/lib/auth/phone-account-lookup';
import { getServerErrorMessage } from '@/lib/i18n/server-error-messages';
import { rateLimiter, getClientIpFromHeaders } from '@/lib/security/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      phoneNumber,
      name,
      purpose = 'registration',
      channel = 'auto',
      expectedAccountType,
    } = body;

    if (!phoneNumber) {
      return NextResponse.json({
        success: false,
        error: 'رقم الهاتف مطلوب'
      }, { status: 400 });
    }

    // 1. تقييد المعدل على مستوى عنوان IP (حماية من الإغراق وهجمات DoS)
    const clientIp = getClientIpFromHeaders(request.headers) || 'unknown';
    const ipRate = rateLimiter.check(`otp_ip:${clientIp}`, {
      windowMs: 10 * 60 * 1000, // 10 دقائق
      max: 10,                   // 10 طلبات لكل IP
      minIntervalMs: 2000,       // ثانيتان كحد أدنى بين الطلب والآخر
    });

    if (!ipRate.allowed) {
      const waitSeconds = Math.max(1, Math.ceil(ipRate.retryAfterMs / 1000));
      return NextResponse.json(
        {
          success: false,
          code: 'RATE_LIMIT_EXCEEDED',
          error: `تم تجاوز الحد المسموح به من الطلبات. يرجى المحاولة بعد ${waitSeconds} ثانية.`,
          retryAfterSeconds: waitSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(waitSeconds),
          },
        }
      );
    }

    // 2. تقييد المعدل على مستوى رقم الهاتف (حماية من استنزاف رصيد WhatsApp/SMS)
    const cleanPhone = String(phoneNumber).replace(/[^0-9]/g, '');
    const phoneRate = rateLimiter.check(`otp_phone:${cleanPhone}`, {
      windowMs: 10 * 60 * 1000, // 10 دقائق
      max: 5,                    // 5 طلبات كحد أقصى للرقم الواحد
      minIntervalMs: 30000,      // 30 ثانية كحد أدنى بين كل رسالة لنفس الرقم
    });

    if (!phoneRate.allowed) {
      const waitSeconds = Math.max(1, Math.ceil(phoneRate.retryAfterMs / 1000));
      return NextResponse.json(
        {
          success: false,
          code: 'PHONE_RATE_LIMIT_EXCEEDED',
          error: `يرجى الانتظار ${waitSeconds} ثانية قبل إعادة إرسال رمز التحقق لهذا الرقم.`,
          retryAfterSeconds: waitSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(waitSeconds),
          },
        }
      );
    }

    const account = await findAccountByPhone(phoneNumber);
    if (purpose === 'login' && !account.found) {
      const text = getServerErrorMessage(request, 'accountNotFoundRegisterFirst');
      return NextResponse.json({
        success: false,
        code: 'ACCOUNT_NOT_FOUND',
        error: text,
        message: text,
      }, { status: 404 });
    }
    if (purpose === 'registration' && account.found) {
      const text = getServerErrorMessage(request, 'accountAlreadyExistsLogin');
      return NextResponse.json({
        success: false,
        code: 'ACCOUNT_ALREADY_EXISTS',
        accountType: account.accountType,
        error: text,
        message: text,
      }, { status: 409 });
    }
    if (
      purpose === 'login' &&
      account.found &&
      expectedAccountType &&
      String(expectedAccountType).trim().toLowerCase() !== account.accountType
    ) {
      const text = getServerErrorMessage(request, 'accountTypeMismatch');
      return NextResponse.json({
        success: false,
        code: 'ACCOUNT_TYPE_MISMATCH',
        accountType: account.accountType,
        error: text,
        message: text,
      }, { status: 409 });
    }

    if (await isPlayReviewPhone(phoneNumber)) {
      return NextResponse.json({
        success: true,
        message: 'Use the permanent review code supplied in Google Play Console.',
        channel: 'review',
      });
    }

    const options: SendOTPOptions = {
      phoneNumber,
      name,
      purpose: purpose as any,
      channel: channel as any,
    };

    const result = await sendOTP(options);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message || 'تم إرسال رمز التحقق بنجاح',
        channel: result.channel,
        found: account.found,
        accountType: account.found ? account.accountType : undefined,
        // لا نرجع OTP في الإنتاج - هذا للتطوير فقط
        ...(process.env.NODE_ENV === 'development' && { otp: result.otp })
      });
    } else {
      let localizedError = result.error || 'فشل في إرسال رمز التحقق';
      if (result.code === 'OTP_TEMPLATE_REJECTED') {
        localizedError = getServerErrorMessage(request, 'otpTemplateRejected');
      } else if (result.code === 'OTP_DELIVERY_NOT_CONFIGURED') {
        localizedError = getServerErrorMessage(request, 'otpDeliveryNotConfigured');
      }

      return NextResponse.json({
        success: false,
        code: result.code || 'OTP_DELIVERY_FAILED',
        error: localizedError,
        message: localizedError,
        channel: result.channel
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('❌ [Unified OTP API] Error:', error);
    const text = getServerErrorMessage(request, 'serviceUnavailable');
    return NextResponse.json({
      success: false,
      code: 'SERVICE_UNAVAILABLE',
      error: text,
      message: text,
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
        expectedAccountType: 'string (optional) - player | club | academy | agent | trainer | marketer',
        channel: 'string (optional) - whatsapp | sms | firebase_phone | auto',
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




