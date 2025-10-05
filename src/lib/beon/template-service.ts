/**
 * BeOn V3 Template Service
 * خدمة إدارة القوالب BeOn V3
 */

import { BEON_V3_CONFIG, createBeOnFormHeaders, BeOnResponse, TemplateCreateRequest } from './config';

export class BeOnTemplateService {
  private baseUrl: string;
  private token: string;

  constructor() {
    this.baseUrl = BEON_V3_CONFIG.BASE_URL;
    this.token = BEON_V3_CONFIG.TOKEN;
  }

  /**
   * إنشاء قالب جديد
   * Create new template
   */
  async createTemplate(name: string, message: string, lang: string = 'ar'): Promise<BeOnResponse> {
    try {
      console.log('📝 إنشاء قالب جديد:', { name, lang, messageLength: message.length });

      // إنشاء FormData كما هو مطلوب في الوثائق
      const formData = new FormData();
      formData.append('name', name);
      formData.append('lang', lang);
      formData.append('message', message);

      const response = await fetch(`${this.baseUrl}${BEON_V3_CONFIG.ENDPOINTS.CREATE_TEMPLATE}`, {
        method: 'POST',
        headers: createBeOnFormHeaders(this.token),
        body: formData
      });

      console.log('📝 استجابة إنشاء القالب:', {
        status: response.status,
        statusText: response.statusText
      });

      if (response.ok) {
        return {
          success: true,
          message: 'تم إنشاء القالب بنجاح',
          data: {
            name,
            lang,
            status: response.status
          }
        };
      } else {
        const errorText = await response.text();
        console.error('❌ خطأ في إنشاء القالب:', errorText);
        return {
          success: false,
          error: `فشل في إنشاء القالب: ${response.status} ${response.statusText}`,
          data: errorText
        };
      }
    } catch (error) {
      console.error('❌ خطأ في خدمة القوالب:', error);
      return {
        success: false,
        error: 'حدث خطأ في إنشاء القالب',
        data: error
      };
    }
  }

  /**
   * إنشاء قالب OTP
   * Create OTP template
   */
  async createOTPTemplate(name: string = 'OTP Template', lang: string = 'ar'): Promise<BeOnResponse> {
    const message = `رمز التحقق الخاص بك هو: {{v1}}`;
    return this.createTemplate(name, message, lang);
  }

  /**
   * إنشاء قالب ترحيب
   * Create welcome template
   */
  async createWelcomeTemplate(name: string = 'Welcome Template', lang: string = 'ar'): Promise<BeOnResponse> {
    const message = `مرحباً {{v1}}، أهلاً بك في منصة العلم!`;
    return this.createTemplate(name, message, lang);
  }

  /**
   * إنشاء قالب إشعار
   * Create notification template
   */
  async createNotificationTemplate(name: string = 'Notification Template', lang: string = 'ar'): Promise<BeOnResponse> {
    const message = `لديك إشعار جديد: {{v1}}`;
    return this.createTemplate(name, message, lang);
  }
}

// Export singleton instance
export const beonTemplateService = new BeOnTemplateService();

















