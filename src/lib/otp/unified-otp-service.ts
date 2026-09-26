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

import { storeOTPInFirestore, hasActiveOTP, verifyOTPInFirestore, deleteOTPFromFirestore } from './otp-manager';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// تنسيق رقم الهاتف
const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+') && cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  return cleaned.trim();
};

export type OTPChannel = 'whatsapp' | 'sms' | 'firebase_phone' | 'auto';
export type OTPPurpose = 'registration' | 'login' | 'password_reset' | 'verification';

export interface SendOTPResult {
  success: boolean;
  otp?: string;
  channel?: OTPChannel;
  error?: string;
  /** Safe, stable reason for the client. Never expose a provider response. */
  code?: OTPErrorCode;
  message?: string;
}

export type OTPErrorCode =
  | 'OTP_STORAGE_FAILED'
  | 'OTP_DELIVERY_NOT_CONFIGURED'
  | 'OTP_TEMPLATE_REJECTED'
  | 'OTP_DELIVERY_FAILED'
  | 'OTP_CHANNEL_UNAVAILABLE';

export interface SendOTPOptions {
  phoneNumber: string;
  name?: string;
  purpose?: OTPPurpose;
  channel?: OTPChannel;
  customOTP?: string; // إذا كان null، سيتم توليد OTP تلقائياً
}

/**
 * توليد OTP عشوائي من 6 أرقام
 */
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * جلب إعدادات ChatAman من Supabase system_configs
 */
async function getChatAmanConfig(): Promise<{ apiKey: string; baseUrl: string; isActive: boolean } | null> {
  try {
    const db = getSupabaseAdmin();
    const { data } = await db.from('system_configs').select('*').eq('id', 'chataman_config').limit(1);
    if (!data?.length) return null;
    return data[0] as { apiKey: string; baseUrl: string; isActive: boolean };
  } catch {
    return null;
  }
}

/**
 * إرسال OTP مباشرةً لـ ChatAman API (server-to-server)
 */
async function sendOTPViaChatAman(
  phone: string,
  otp: string,
): Promise<{ success: boolean; error?: string; code?: OTPErrorCode }> {
  try {
    const config = await getChatAmanConfig();
    if (!config || !config.isActive || !config.apiKey) {
      console.error('❌ [OTP] ChatAman configuration is missing or inactive');
      return {
        success: false,
        error: 'OTP delivery is not configured.',
        code: 'OTP_DELIVERY_NOT_CONFIGURED',
      };
    }

    // تنسيق رقم الهاتف بصيغة دولية موحدة
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.length >= 7) {
      if (cleaned.startsWith('01') && cleaned.length === 11) cleaned = `20${cleaned.substring(1)}`;
      else if (cleaned.startsWith('05') && cleaned.length === 10) cleaned = `966${cleaned.substring(1)}`;
      else if (cleaned.startsWith('0') && cleaned.length >= 9) cleaned = cleaned.substring(1);
    }
    const formattedPhone = `+${cleaned}`;

    const baseUrl = (config.baseUrl || 'https://chataman.com').trim().replace(/\/+$/, '');

    const sendTemplate = async (includeUrlButton: boolean) => {
      const components: Record<string, unknown>[] = [
        { type: 'body', parameters: [{ type: 'text', text: otp }] },
      ];
      if (includeUrlButton) {
        components.push({
          type: 'button',
          sub_type: 'url',
          index: 0,
          parameters: [{ type: 'text', text: otp }],
        });
      }

      const payload = {
        phone: formattedPhone,
        template: {
          name: 'otp_el7lmplatform',
          language: { code: 'ar' },
          components,
        },
      };

      const response = await fetch(`${baseUrl}/api/send/template`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey.trim()}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch { data = { message: text }; }

      if (response.ok && data.status !== 'error' && data.success !== false && data?.data?.success !== false) {
        return true;
      }
      console.warn('⚠️ [ChatAman] OTP template was rejected:', {
        status: response.status,
        includeUrlButton,
        providerMessage: data.message || data.error || 'Unknown error',
      });
      return false;
    };

    // A WhatsApp Business OTP is attempted through the approved template first.
    if (await sendTemplate(true) || await sendTemplate(false)) {
      console.log('✅ [OTP] Sent via ChatAman template to', formattedPhone);
      return { success: true };
    }

    // 2. Fallback: إذا تعذر إرسال القالب (مثل خطأ Validation في مزود الخدمة)، يتم الإرسال المباشر بنص الرسالة
    console.warn('⚠️ [ChatAman] Template delivery rejected, falling back to direct WhatsApp message...');
    const directMessage = `‏*${otp}*‏ هو كود التحقق الخاص بك على منصة الحلم (el7lm.com).\n\nللحفاظ على أمانك، لا تشارك هذا الكود مع أي شخص.\nتنتهي صلاحية الرمز خلال 3 دقائق.`;
    const sendResponse = await fetch(`${baseUrl}/api/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey.trim()}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        phone: formattedPhone,
        message: directMessage,
      }),
    });

    const sendText = await sendResponse.text();
    let sendData: any = {};
    try { sendData = JSON.parse(sendText); } catch { sendData = { message: sendText }; }

    if (sendResponse.ok && sendData.status !== 'error' && sendData.success !== false && sendData?.data?.success !== false) {
      console.log('✅ [OTP] Sent via ChatAman direct message to', formattedPhone);
      return { success: true };
    }

    console.error('❌ [ChatAman] Direct send failed:', sendData.message || sendData.error || 'Unknown error');
    return {
      success: false,
      error: 'The verification message could not be delivered.',
      code: 'OTP_DELIVERY_FAILED',
    };
  } catch (error: any) {
    console.error('❌ [OTP] ChatAman request failed:', error);
    return {
      success: false,
      error: 'The verification message could not be delivered.',
      code: 'OTP_DELIVERY_FAILED',
    };
  }
}

async function sendOTPViaWhatsApp(
  phoneNumber: string,
  otp: string,
): Promise<{ success: boolean; error?: string }> {
  const formattedPhone = formatPhoneNumber(phoneNumber);
  const result = await sendOTPViaChatAman(formattedPhone, otp);
  if (!result.success) console.warn('ChatAman OTP failed:', result.error);
  return result;
}

/**
 * إرسال OTP عبر SMS
 */
async function sendOTPViaSMS(
  phoneNumber: string,
  otp: string,
  name: string
): Promise<{ success: boolean; error?: string; code?: OTPErrorCode }> {
  // SMS route غير موجود حالياً - نرجع خطأ واضح
  return {
    success: false,
    error: 'SMS service is not available.',
    code: 'OTP_CHANNEL_UNAVAILABLE',
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
      console.error('❌ [OTP] Could not store the verification request:', storeResult.error);
      return {
        success: false,
        error: 'The verification request could not be prepared.',
        code: 'OTP_STORAGE_FAILED',
      };
    }

    // تحديد القناة للإرسال
    let selectedChannel: OTPChannel = channel;
    if (channel === 'auto') {
      // Auto mode: جرب WhatsApp أولاً، ثم SMS
      selectedChannel = 'whatsapp';
    }

    // إرسال OTP عبر القناة المحددة
    let sendResult: { success: boolean; error?: string; code?: OTPErrorCode } = { success: false };

    if (selectedChannel === 'whatsapp') {
      sendResult = await sendOTPViaWhatsApp(formattedPhone, otp);

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
        sendResult = await sendOTPViaWhatsApp(formattedPhone, otp);
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
        error: sendResult.error || 'The verification message could not be delivered.',
        code: sendResult.code || 'OTP_DELIVERY_FAILED',
        channel: selectedChannel,
      };
    }
  } catch (error: any) {
    console.error('❌ [Unified OTP Service] Error:', error);
    return {
      success: false,
      error: 'The verification message could not be delivered.',
      code: 'OTP_DELIVERY_FAILED',
    };
  }
}

/**
 * التحقق من OTP
 * (يستخدم Firestore OTP Manager)
 */
export { verifyOTPInFirestore as verifyOTP } from './otp-manager';

/**
 * حذف OTP
 * (يستخدم Firestore OTP Manager)
 */
export { deleteOTPFromFirestore as deleteOTP } from './firestore-otp-manager';

