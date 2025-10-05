/**
 * BeOn V3 WhatsApp Service
 * خدمة WhatsApp BeOn V3
 * 
 * ⚠️ ملاحظة مهمة: BeOn V3 لا يدعم WhatsApp فعلياً
 * جميع طلبات WhatsApp يتم إرسالها كـ SMS
 * هذا هو السلوك المتوقع حسب الوثائق الرسمية
 */

import { BEON_V3_CONFIG, createBeOnHeaders, BeOnResponse, SMSBulkRequest } from './config';

export class BeOnWhatsAppService {
  private baseUrl: string;
  private token: string;

  constructor() {
    this.baseUrl = BEON_V3_CONFIG.BASE_URL;
    this.token = BEON_V3_CONFIG.TOKEN;
  }

  /**
   * إرسال رسائل WhatsApp جماعية
   * Send bulk WhatsApp messages
   * ⚠️ تحذير: BeOn V3 يرسل جميع طلبات WhatsApp كـ SMS
   */
  async sendBulkWhatsApp(phoneNumbers: string[], message: string): Promise<BeOnResponse> {
    try {
      console.log('📱 إرسال WhatsApp جماعي (سيتم إرساله كـ SMS):', { phoneCount: phoneNumbers.length, messageLength: message.length });

      const requestBody: SMSBulkRequest = {
        phoneNumbers,
        message
      };

      const response = await fetch(`${this.baseUrl}${BEON_V3_CONFIG.ENDPOINTS.WHATSAPP}`, {
        method: 'POST',
        headers: createBeOnHeaders(this.token),
        body: JSON.stringify(requestBody)
      });

      console.log('📱 استجابة WhatsApp جماعي:', {
        status: response.status,
        statusText: response.statusText
      });

      if (response.ok) {
        const responseData = await response.json();
        return {
          success: true,
          message: 'تم إرسال الرسائل بنجاح (كـ SMS - BeOn V3 لا يدعم WhatsApp فعلياً)',
          data: {
            phoneCount: phoneNumbers.length,
            status: response.status,
            actualMethod: 'SMS',
            note: 'BeOn V3 يرسل جميع طلبات WhatsApp كـ SMS',
            response: responseData,
            timestamp: new Date().toISOString()
          }
        };
      } else {
        // معالجة محسنة للأخطاء حسب الوثائق
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = await response.text();
        }

        // معالجة Rate Limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          return {
            success: false,
            error: 'تم تجاوز حد الطلبات المسموح',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: retryAfter ? parseInt(retryAfter) : 60,
            data: errorData
          };
        }

        // معالجة أخطاء المصادقة
        if (response.status === 401) {
          return {
            success: false,
            error: 'خطأ في المصادقة - تحقق من التوكن',
            code: 'AUTHENTICATION_ERROR',
            data: errorData
          };
        }

        // معالجة أخطاء عامة
        console.error('❌ خطأ في WhatsApp جماعي:', errorData);
        return {
          success: false,
          error: `فشل في إرسال رسائل WhatsApp: ${response.status} ${response.statusText}`,
          code: `HTTP_${response.status}`,
          data: errorData
        };
      }
    } catch (error) {
      console.error('❌ خطأ في خدمة WhatsApp:', error);
      return {
        success: false,
        error: 'حدث خطأ في إرسال رسائل WhatsApp',
        data: error
      };
    }
  }

  /**
   * إرسال رسالة WhatsApp واحدة
   * Send single WhatsApp message
   */
  async sendSingleWhatsApp(phoneNumber: string, message: string): Promise<BeOnResponse> {
    return this.sendBulkWhatsApp([phoneNumber], message);
  }

  /**
   * إرسال رسالة WhatsApp مع fallback لـ SMS
   * Send WhatsApp message with SMS fallback
   */
  async sendWhatsAppWithFallback(phoneNumber: string, message: string): Promise<BeOnResponse> {
    try {
      // محاولة إرسال WhatsApp أولاً
      const whatsappResult = await this.sendSingleWhatsApp(phoneNumber, message);
      
      if (whatsappResult.success) {
        return {
          ...whatsappResult,
          method: 'whatsapp'
        };
      }

      // إذا فشل WhatsApp، نرسل SMS كبديل
      console.log('⚠️ فشل WhatsApp، محاولة إرسال SMS كبديل');
      
      // استيراد خدمة SMS
      const { beonSMSService } = await import('./sms-service');
      const smsResult = await beonSMSService.sendSingleSMS(phoneNumber, message);
      
      return {
        ...smsResult,
        method: 'sms',
        fallback: true,
        originalMethod: 'whatsapp'
      };
    } catch (error) {
      console.error('❌ خطأ في إرسال WhatsApp مع fallback:', error);
      return {
        success: false,
        error: 'حدث خطأ في إرسال الرسالة',
        data: error
      };
    }
  }
}

// Export singleton instance
export const beonWhatsAppService = new BeOnWhatsAppService();
