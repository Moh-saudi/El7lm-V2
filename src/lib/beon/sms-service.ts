/**
 * BeOn V3 SMS Service
 * خدمة الرسائل النصية BeOn V3
 */

import { BEON_V3_CONFIG, createBeOnHeaders, BeOnResponse, SMSBulkRequest } from './config';

export class BeOnSMSService {
  private baseUrl: string;
  private token: string;

  constructor() {
    this.baseUrl = BEON_V3_CONFIG.BASE_URL;
    this.token = BEON_V3_CONFIG.TOKEN;
  }

  /**
   * إرسال رسائل SMS جماعية
   * Send bulk SMS messages
   */
  async sendBulkSMS(phoneNumbers: string[], message: string): Promise<BeOnResponse> {
    try {
      console.log('📱 إرسال SMS جماعي:', { phoneCount: phoneNumbers.length, messageLength: message.length });

      const requestBody: SMSBulkRequest = {
        phoneNumbers,
        message,
        sender: BEON_V3_CONFIG.DEFAULTS.SENDER_NAME,
        lang: BEON_V3_CONFIG.DEFAULTS.LANGUAGE
      };

      // تسجيل مفصل للطلب
      console.log('📱 تفاصيل الطلب:', {
        url: `${this.baseUrl}${BEON_V3_CONFIG.ENDPOINTS.SMS_BULK}`,
        headers: createBeOnHeaders(this.token),
        body: requestBody
      });

      const response = await fetch(`${this.baseUrl}${BEON_V3_CONFIG.ENDPOINTS.SMS_BULK}`, {
        method: 'POST',
        headers: createBeOnHeaders(this.token),
        body: JSON.stringify(requestBody)
      });

      console.log('📱 استجابة SMS جماعي:', {
        status: response.status,
        statusText: response.statusText
      });

      if (response.ok) {
        const responseData = await response.json();
        
        // تسجيل مفصل للاستجابة
        console.log('📱 استجابة ناجحة:', {
          status: response.status,
          statusText: response.statusText,
          responseData: responseData,
          headers: Object.fromEntries(response.headers.entries())
        });
        
        return {
          success: true,
          message: 'تم إرسال الرسائل النصية بنجاح',
          data: {
            phoneCount: phoneNumbers.length,
            status: response.status,
            response: responseData,
            timestamp: new Date().toISOString(),
            requestDetails: {
              url: `${this.baseUrl}${BEON_V3_CONFIG.ENDPOINTS.SMS_BULK}`,
              body: requestBody
            }
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
        console.error('❌ خطأ في SMS جماعي:', errorData);
        return {
          success: false,
          error: `فشل في إرسال الرسائل النصية: ${response.status} ${response.statusText}`,
          code: `HTTP_${response.status}`,
          data: errorData
        };
      }
    } catch (error) {
      console.error('❌ خطأ في خدمة SMS:', error);
      return {
        success: false,
        error: 'حدث خطأ في إرسال الرسائل النصية',
        data: error
      };
    }
  }

  /**
   * إرسال رسالة SMS واحدة
   * Send single SMS message
   */
  async sendSingleSMS(phoneNumber: string, message: string): Promise<BeOnResponse> {
    return this.sendBulkSMS([phoneNumber], message);
  }

  /**
   * إرسال رسالة SMS باستخدام قالب
   * Send SMS using template
   */
  async sendTemplateSMS(templateId: number, phoneNumber: string, name: string, vars: string[]): Promise<BeOnResponse> {
    try {
      console.log('📱 إرسال SMS بالقالب:', { templateId, phoneNumber, name, vars });

      const requestBody = {
        template_id: templateId,
        phoneNumber,
        name,
        vars
      };

      const response = await fetch(`${this.baseUrl}${BEON_V3_CONFIG.ENDPOINTS.SMS_TEMPLATE}`, {
        method: 'POST',
        headers: createBeOnHeaders(this.token),
        body: JSON.stringify(requestBody)
      });

      console.log('📱 استجابة SMS بالقالب:', {
        status: response.status,
        statusText: response.statusText
      });

      if (response.ok) {
        return {
          success: true,
          message: 'تم إرسال الرسالة النصية بالقالب بنجاح',
          data: {
            templateId,
            phoneNumber,
            status: response.status
          }
        };
      } else {
        const errorText = await response.text();
        console.error('❌ خطأ في SMS بالقالب:', errorText);
        return {
          success: false,
          error: `فشل في إرسال الرسالة النصية بالقالب: ${response.status} ${response.statusText}`,
          data: errorText
        };
      }
    } catch (error) {
      console.error('❌ خطأ في خدمة SMS بالقالب:', error);
      return {
        success: false,
        error: 'حدث خطأ في إرسال الرسالة النصية بالقالب',
        data: error
      };
    }
  }
}

// Export singleton instance
export const beonSMSService = new BeOnSMSService();



