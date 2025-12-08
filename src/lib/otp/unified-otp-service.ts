/**
 * Unified OTP Service
 * خدمة موحدة لإرسال OTP عبر جميع القنوات المتاحة
 * 
 * المميزات:
 * - واجهة موحدة لإرسال OTP
 * - دعم قنوات متعددة (WhatsApp, SMS, Firebase Phone Auth)
 * - Fallback تلقائي عند فشل قناة
 * - Rate Limiting مدمج
 * - تخزين في Firestore
 */

import { storeOTPInFirestore, hasActiveOTP } from './firestore-otp-manager';
import { formatPhoneNumber } from '@/lib/whatsapp/babaservice-config';
import { BABASERVICE_CONFIG } from '@/lib/whatsapp/babaservice-config';

export type OTPChannel = 'whatsapp' | 'sms' | 'firebase_phone' | 'auto';
export type OTPPurpose = 'registration' | 'login' | 'password_reset' | 'verification';

export interface SendOTPResult {
  success: boolean;
  otp?: string;
  channel?: OTPChannel;
  error?: string;
  message?: string;
}

export interface SendOTPOptions {
  phoneNumber: string;
  name?: string;
  purpose?: OTPPurpose;
  channel?: OTPChannel;
  customOTP?: string; // إذا كان null، سيتم توليد OTP تلقائياً
  instanceId?: string; // لـ WhatsApp
}

/**
 * توليد OTP عشوائي من 6 أرقام
 */
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * إرسال OTP عبر WhatsApp (Babaservice)
 */
async function sendOTPViaWhatsApp(
  phoneNumber: string,
  otp: string,
  name: string,
  instanceId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const targetInstanceId = instanceId || BABASERVICE_CONFIG.INSTANCE_ID;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const response = await fetch(`${baseUrl}/api/whatsapp/babaservice/otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: formattedPhone,
        otp: otp,
        name: name || 'عزيزي المستخدم',
        instance_id: targetInstanceId
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return { success: true };
    } else {
      return { 
        success: false, 
        error: data.error || 'فشل في إرسال OTP عبر WhatsApp' 
      };
    }
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'حدث خطأ في إرسال OTP عبر WhatsApp' 
    };
  }
}

/**
 * إرسال OTP عبر SMS (BeOn API)
 * ملاحظة: هذا الـ route غير موجود حالياً - نرجع خطأ واضح
 */
async function sendOTPViaSMS(
  phoneNumber: string,
  otp: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  // SMS route غير موجود حالياً - نرجع خطأ واضح
  return { 
    success: false, 
    error: 'SMS service غير متاح حالياً. يرجى استخدام WhatsApp' 
  };
}

/**
 * إرسال OTP عبر Firebase Phone Authentication
 * ملاحظة: Firebase Phone Auth يدعم معظم الدول لكن قد يكون هناك قيود
 */
async function sendOTPViaFirebasePhone(
  phoneNumber: string,
  recaptchaVerifier: any
): Promise<{ success: boolean; error?: string; verificationId?: string }> {
  try {
    // Firebase Phone Auth يتطلب reCAPTCHA
    // هذا يحتاج إلى إعداد في الواجهة الأمامية
    // سنتركه كـ placeholder للآن
    
    return {
      success: false,
      error: 'Firebase Phone Auth غير مفعل حالياً. يرجى استخدام WhatsApp أو SMS'
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'حدث خطأ في إرسال OTP عبر Firebase Phone'
    };
  }
}

/**
 * الخدمة الموحدة لإرسال OTP
 * 
 * @param options - خيارات إرسال OTP
 * @returns نتيجة الإرسال
 * 
 * @example
 * ```typescript
 * const result = await sendOTP({
 *   phoneNumber: '+966501234567',
 *   name: 'أحمد محمد',
 *   purpose: 'registration',
 *   channel: 'whatsapp'
 * });
 * ```
 */
export async function sendOTP(options: SendOTPOptions): Promise<SendOTPResult> {
  const {
    phoneNumber,
    name = 'عزيزي المستخدم',
    purpose = 'registration',
    channel = 'auto',
    customOTP,
    instanceId
  } = options;

  try {
    // توليد OTP إذا لم يتم توفيره
    const otp = customOTP || generateOTP();

    // تنسيق رقم الهاتف
    const formattedPhone = formatPhoneNumber(phoneNumber);

    // حفظ OTP في Firestore (سيحذف OTP القديم تلقائياً إذا كان موجوداً)
    // نحذف OTP القديم أولاً قبل التحقق من Rate Limiting
    const storeResult = await storeOTPInFirestore(formattedPhone, otp, purpose);
    if (!storeResult.success) {
      return {
        success: false,
        error: storeResult.error || 'فشل في حفظ رمز التحقق'
      };
    }

    // تحديد القناة للإرسال
    let selectedChannel: OTPChannel = channel;
    if (channel === 'auto') {
      // Auto mode: جرب WhatsApp أولاً، ثم SMS
      selectedChannel = 'whatsapp';
    }

    // إرسال OTP عبر القناة المحددة
    let sendResult: { success: boolean; error?: string } = { success: false };

    if (selectedChannel === 'whatsapp') {
      sendResult = await sendOTPViaWhatsApp(formattedPhone, otp, name, instanceId);
      
      // إذا فشل WhatsApp و channel هو auto، جرب SMS (إذا كان متاحاً)
      if (!sendResult.success && channel === 'auto') {
        console.log('⚠️ WhatsApp failed, trying SMS...');
        const smsResult = await sendOTPViaSMS(formattedPhone, otp, name);
        if (smsResult.success) {
          sendResult = smsResult;
          selectedChannel = 'sms';
        } else {
          // SMS غير متاح - نرجع خطأ WhatsApp الأصلي
          console.log('⚠️ SMS not available, returning WhatsApp error');
        }
      }
    } else if (selectedChannel === 'sms') {
      sendResult = await sendOTPViaSMS(formattedPhone, otp, name);
      
      // إذا فشل SMS و channel هو auto، جرب WhatsApp
      if (!sendResult.success && channel === 'auto') {
        console.log('⚠️ SMS failed or not available, trying WhatsApp...');
        sendResult = await sendOTPViaWhatsApp(formattedPhone, otp, name, instanceId);
        if (sendResult.success) {
          selectedChannel = 'whatsapp';
        }
      }
    } else if (selectedChannel === 'firebase_phone') {
      sendResult = await sendOTPViaFirebasePhone(formattedPhone, null as any);
    }

    if (sendResult.success) {
      return {
        success: true,
        otp: otp, // في الإنتاج، لا ترجع OTP - هذا للتطوير فقط
        channel: selectedChannel,
        message: `تم إرسال رمز التحقق عبر ${selectedChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'} بنجاح`
      };
    } else {
      // إذا فشل الإرسال، احذف OTP من Firestore
      // (يمكن الاحتفاظ به للتدقيق)
      return {
        success: false,
        error: sendResult.error || 'فشل في إرسال رمز التحقق',
        channel: selectedChannel
      };
    }
  } catch (error: any) {
    console.error('❌ [Unified OTP Service] Error:', error);
    return {
      success: false,
      error: error.message || 'حدث خطأ أثناء إرسال رمز التحقق'
    };
  }
}

/**
 * التحقق من OTP
 * (يستخدم Firestore OTP Manager)
 */
export { verifyOTPInFirestore as verifyOTP } from './firestore-otp-manager';

/**
 * حذف OTP
 * (يستخدم Firestore OTP Manager)
 */
export { deleteOTPFromFirestore as deleteOTP } from './firestore-otp-manager';

