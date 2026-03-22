/**
 * Geidea Payment Client - مكتبة مركزية لجميع عمليات Geidea
 * 
 * هذه المكتبة توفر واجهة موحدة لاستخدام Geidea في جميع أنحاء التطبيق
 * (البطولات، الدفع الجماعي، إلخ)
 */

import { getGeideaMode, getGeideaEnvConfig } from './config';
import { generateGeideaSignature, formatTimestamp } from './signature';

export interface GeideaSessionRequest {
  amount: number;
  currency: string;
  customerEmail: string;
  customerName?: string;
  merchantReferenceId?: string;
  returnUrl?: string;
  callbackUrl?: string;
  metadata?: Record<string, any>; // بيانات إضافية (مثل tournamentId, bulkPaymentId)
}

export interface GeideaSessionResponse {
  success: boolean;
  sessionId?: string;
  orderId?: string;
  redirectUrl?: string;
  message?: string;
  error?: string;
  details?: string;
  responseCode?: string;
  detailedResponseCode?: string;
}

/**
 * إنشاء جلسة دفع جديدة مع Geidea
 */
export async function createGeideaSession(
  request: GeideaSessionRequest
): Promise<GeideaSessionResponse> {
  try {
    // التحقق من البيانات المطلوبة
    if (!request.amount || request.amount <= 0) {
      return {
        success: false,
        error: 'Invalid amount',
        details: 'المبلغ يجب أن يكون أكبر من 0',
      };
    }

    if (!request.customerEmail || !request.customerEmail.trim()) {
      return {
        success: false,
        error: 'Missing customer email',
        details: 'البريد الإلكتروني للعميل مطلوب',
      };
    }

    // الحصول على إعدادات Geidea
    const mode = await getGeideaMode();
    const config = getGeideaEnvConfig(mode);

    if (!config.merchantPublicKey || !config.apiPassword) {
      return {
        success: false,
        error: 'Geidea configuration missing',
        details: `يرجى إعداد ${mode === 'live' ? 'GEIDEA_LIVE' : 'GEIDEA_TEST'}_MERCHANT_PUBLIC_KEY و API_PASSWORD`,
      };
    }

    // إنشاء merchantReferenceId إذا لم يكن موجوداً
    // Geidea يتطلب: alphanumeric فقط، أقصى طول 30 حرف، على الأقل 1 حرف
    // ملاحظة: جميع merchantReferenceId يجب أن تبدأ بـ EL7LM
    let merchantReferenceId = request.merchantReferenceId;
    
    if (!merchantReferenceId || merchantReferenceId.trim().length === 0) {
      // إنشاء ID فريد: EL7LM + timestamp + random chars
      const timestamp = Date.now().toString();
      const random = Math.random().toString(36).slice(2, 6).toUpperCase();
      merchantReferenceId = `EL7LM${timestamp}${random}`;
    }
    
    // تنظيف merchantReferenceId: إزالة أي أحرف غير alphanumeric وتحويل إلى uppercase
    merchantReferenceId = merchantReferenceId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    // التأكد من أن merchantReferenceId يبدأ بـ EL7LM
    if (!merchantReferenceId.startsWith('EL7LM')) {
      // إذا لم يبدأ بـ EL7LM، نضيفه في البداية
      const cleaned = merchantReferenceId.replace(/^EL7LM/i, ''); // إزالة EL7LM إذا كان موجوداً في المنتصف
      merchantReferenceId = `EL7LM${cleaned}`;
    }
    
    // التأكد من الطول (Geidea يتطلب: 1-30 حرف)
    if (merchantReferenceId.length > 30) {
      merchantReferenceId = merchantReferenceId.slice(0, 30);
    }
    
    // إذا كان فارغاً بعد التنظيف، إنشاء واحد جديد
    if (!merchantReferenceId || merchantReferenceId.length < 1) {
      const timestamp = Date.now().toString();
      const random = Math.random().toString(36).slice(2, 6).toUpperCase();
      merchantReferenceId = `EL7LM${timestamp}${random}`.slice(0, 30);
    }
    
    console.log('🔄 [Geidea Client] Using merchantReferenceId:', merchantReferenceId, 'Length:', merchantReferenceId.length);

    // إنشاء timestamp والتوقيع
    const timestamp = formatTimestamp();
    const signature = generateGeideaSignature(
      config.merchantPublicKey,
      request.amount,
      request.currency.toUpperCase(),
      merchantReferenceId,
      config.apiPassword,
      timestamp
    );

    // تحديد callbackUrl و returnUrl
    // ملاحظة: Geidea لا يقبل localhost في callbackUrl و returnUrl، يجب استخدام URL الإنتاج دائماً
    const productionBaseUrl = 'https://www.el7lm.com';
    
    // callbackUrl يجب أن يكون دائماً URL الإنتاج (Geidea لا يقبل localhost)
    const callbackUrl = request.callbackUrl || config.callbackUrl || `${productionBaseUrl}/api/geidea/callback`;
    
    // returnUrl يجب أن يكون أيضاً URL الإنتاج (Geidea لا يقبل localhost)
    // إذا كان returnUrl المطلوب يحتوي على localhost، نستخدم URL الإنتاج بدلاً منه مع نفس المسار
    let returnUrl = request.returnUrl || `${productionBaseUrl}/dashboard/shared/bulk-payment`;
    
    console.log('🔄 [Geidea Client] Original returnUrl from request:', request.returnUrl);
    
    // إذا كان returnUrl يحتوي على localhost، نستبدله بـ URL الإنتاج مع الحفاظ على المسار
    if (returnUrl.includes('localhost') || returnUrl.includes('127.0.0.1')) {
      console.warn('⚠️ [Geidea Client] returnUrl contains localhost, replacing with production URL');
      try {
        const url = new URL(returnUrl);
        // استبدال localhost بـ production URL مع الحفاظ على المسار والـ query parameters الموجودة
        returnUrl = `${productionBaseUrl}${url.pathname}${url.search}${url.hash}`;
        console.log('🔄 [Geidea Client] Replaced returnUrl:', returnUrl);
      } catch (e) {
        // إذا فشل parsing URL، استخدم استبدال بسيط
        returnUrl = returnUrl.replace(/https?:\/\/[^/]+/, productionBaseUrl);
        console.log('🔄 [Geidea Client] Simple replacement returnUrl:', returnUrl);
      }
    } else {
      console.log('✅ [Geidea Client] Using returnUrl as-is (no localhost):', returnUrl);
    }
    
    // لا نضيف query parameters تلقائياً - نترك returnUrl كما هو
    // Geidea سيعيد المستخدم إلى returnUrl كما هو، ويمكن إضافة query parameters لاحقاً في callback
    
    // التأكد من أن callbackUrl و returnUrl هما absolute URLs
    const ensureAbsoluteUrl = (url: string): string => {
      if (!url) return '';
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      if (url.startsWith('/')) return `${productionBaseUrl}${url}`;
      return `${productionBaseUrl}/${url}`;
    };
    
    const finalCallbackUrl = ensureAbsoluteUrl(callbackUrl);
    const finalReturnUrl = ensureAbsoluteUrl(returnUrl);

    // بناء payload
    const payload = {
      amount: request.amount,
      currency: request.currency.toUpperCase(),
      merchantReferenceId,
      timestamp,
      signature,
      callbackUrl: finalCallbackUrl,
      returnUrl: finalReturnUrl,
      language: 'ar',
      customer: {
        email: request.customerEmail,
        firstName: request.customerName?.split(' ')[0] || 'Customer',
        lastName: request.customerName?.split(' ').slice(1).join(' ') || 'EL7LM',
      },
      ...(request.metadata && { metadata: request.metadata }),
    };
    
    // التحقق النهائي من payload قبل الإرسال
    console.log('📤 [Geidea Client] Sending payload to Geidea:', {
      amount: payload.amount,
      currency: payload.currency,
      merchantReferenceId: payload.merchantReferenceId,
      merchantReferenceIdLength: payload.merchantReferenceId.length,
      merchantReferenceIdValid: /^[A-Z0-9]{1,30}$/.test(payload.merchantReferenceId),
      callbackUrl: payload.callbackUrl,
      returnUrl: payload.returnUrl,
      hasSignature: !!payload.signature,
      timestamp: payload.timestamp,
    });
    
    // التحقق النهائي من merchantReferenceId قبل الإرسال
    if (!merchantReferenceId || merchantReferenceId.length < 1 || merchantReferenceId.length > 30) {
      return {
        success: false,
        error: 'Invalid merchant reference ID',
        details: `merchantReferenceId must be 1-30 alphanumeric characters. Got: "${merchantReferenceId}" (length: ${merchantReferenceId?.length || 0})`,
      };
    }
    
    console.log('🔄 [Geidea Client] Creating session with:', {
      amount: request.amount,
      currency: request.currency,
      merchantReferenceId,
      merchantReferenceIdLength: merchantReferenceId.length,
      callbackUrl: finalCallbackUrl,
      returnUrl: finalReturnUrl,
      mode,
    });

    // إرسال الطلب إلى Geidea
    const endpoint = `${config.baseUrl.replace(/\/$/, '')}/payment-intent/api/v2/direct/session`;
    const auth = Buffer.from(`${config.merchantPublicKey}:${config.apiPassword}`).toString('base64');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    // التحقق من كود الاستجابة من Geidea
    const responseCode = responseData.responseCode || responseData.code;
    const detailedResponseCode = responseData.detailedResponseCode || responseData.detailedCode;
    const responseMessage = responseData.detailedResponseMessage || responseData.responseMessage || responseData.message || responseData.error || 'Unknown error';

    // كود 000 يعني نجاح
    if (!response.ok || (responseCode && responseCode !== '000') || (detailedResponseCode && detailedResponseCode !== '000')) {
      console.error('❌ [Geidea Client] Session creation failed:', {
        status: response.status,
        responseCode,
        detailedResponseCode,
        responseMessage,
        merchantReferenceId,
        response: responseData,
        mode,
      });

      // رسالة خطأ مفصلة
      let errorDetails = responseMessage;
      if (responseMessage.includes('merchant reference') || responseMessage.includes('merchantReferenceId')) {
        errorDetails = `خطأ في معرف المرجع: ${responseMessage}. تم استخدام: "${merchantReferenceId}" (طول: ${merchantReferenceId.length})`;
      }

      return {
        success: false,
        error: responseData.message || responseData.error || 'Failed to create session',
        details: errorDetails,
        responseCode,
        detailedResponseCode,
      };
    }

    // نجاح إنشاء الجلسة - استخراج البيانات من الاستجابة
    // Geidea قد ترجع البيانات في session object أو مباشرة
    const session = responseData.session || responseData;
    const sessionId = session.id || session.sessionId || responseData.sessionId;
    const redirectUrl = session.redirectUrl || session.url || responseData.redirectUrl || responseData.url;

    return {
      success: true,
      sessionId: sessionId || merchantReferenceId,
      orderId: responseData.orderId || merchantReferenceId,
      redirectUrl: redirectUrl || `https://www.merchant.geidea.net/hpp/checkout/?${sessionId || merchantReferenceId}`,
      message: responseData.message || responseData.detailedResponseMessage || 'تم إنشاء جلسة الدفع بنجاح',
    };
  } catch (error) {
    console.error('❌ [Geidea Client] Error creating session:', error);
    return {
      success: false,
      error: 'Network error',
      details: error instanceof Error ? error.message : 'خطأ في الاتصال',
    };
  }
}

