/**
 * Babaservice WhatsApp API Service
 * خدمة WhatsApp API الجديدة - Babaservice
 *
 * API Base URL: https://wbot.babaservice.online/api/
 * Access Token: 68f0029b4ce90
 */

export interface BabaserviceConfig {
  accessToken: string;
  baseUrl: string;
  instanceId?: string;
  webhookUrl?: string;
}

export interface BabaserviceResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
  code?: string;
}

export interface SendMessageRequest {
  number: string;
  type: 'text' | 'media';
  message: string;
  media_url?: string;
  filename?: string;
}

export interface SendGroupMessageRequest {
  group_id: string;
  type: 'text' | 'media';
  message: string;
  media_url?: string;
  filename?: string;
}

export interface InstanceResponse {
  success: boolean;
  instance_id?: string;
  message?: string;
  error?: string;
}

export interface QRCodeResponse {
  success: boolean;
  qr_code?: string;
  message?: string;
  error?: string;
}

export interface WebhookResponse {
  success: boolean;
  message?: string;
  error?: string;
}

class BabaserviceWhatsAppService {
  private config: BabaserviceConfig;

  constructor() {
    this.config = {
      accessToken: process.env.BABASERVICE_ACCESS_TOKEN || '68f0029b4ce90',
      baseUrl: process.env.BABASERVICE_BASE_URL || 'https://wbot.babaservice.online/api',
      instanceId: process.env.BABASERVICE_INSTANCE_ID || '68F243B3A8D8D',
      webhookUrl: process.env.BABASERVICE_WEBHOOK_URL
    };
  }

  /**
   * التحقق من صحة التكوين
   */
  private validateConfig(): boolean {
    return !!(this.config.accessToken && this.config.baseUrl);
  }

  /**
   * دالة مساعدة لمعالجة استجابات API الخارجي
   */
  private async handleExternalApiResponse(response: Response, context: string): Promise<any> {
    const contentType = response.headers.get('content-type');
    console.log(`🔍 Content-Type لـ ${context}:`, contentType);
    console.log(`🔍 Status لـ ${context}:`, response.status, response.statusText);

    // محاولة قراءة النص أولاً
    const textResponse = await response.text();
    console.log(`📄 الاستجابة الكاملة لـ ${context}:`, textResponse);

    // محاولة تحليل JSON
    try {
      const data = JSON.parse(textResponse);
      console.log(`✅ تم تحليل JSON بنجاح لـ ${context}:`, data);
      return data;
    } catch (error) {
      console.error(`❌ فشل تحليل JSON لـ ${context}:`, error);
      console.error(`📋 النص الذي فشل تحليله:`, textResponse.substring(0, 1000));

      // إذا كانت الاستجابة HTML
      if (textResponse.trim().startsWith('<!DOCTYPE') || textResponse.trim().startsWith('<html')) {
        throw new Error(`API يعيد صفحة HTML بدلاً من JSON. Status: ${response.status}. يرجى التحقق من رابط API والـ Access Token.`);
      }

      // إذا كانت الاستجابة فارغة
      if (!textResponse.trim()) {
        throw new Error(`API يعيد استجابة فارغة. Status: ${response.status}. قد يكون API غير جاهز أو هناك مشكلة في الاتصال.`);
      }

      // خطأ عام في تحليل JSON
      throw new Error(`خطأ في تحليل استجابة API: ${error instanceof Error ? error.message : 'خطأ غير معروف'}. الاستجابة: ${textResponse.substring(0, 200)}...`);
    }
  }

  /**
   * إنشاء instance جديد
   */
  async createInstance(): Promise<InstanceResponse> {
    if (!this.validateConfig()) {
      return { success: false, error: 'تكوين API غير مكتمل' };
    }

    try {
      const url = `${this.config.baseUrl}/create_instance?access_token=${this.config.accessToken}`;

      console.log('🔧 Creating instance:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      });

      const data = await this.handleExternalApiResponse(response, 'Create Instance');

      if (response.ok && data.success) {
        // حفظ instance_id في التكوين
        this.config.instanceId = data.instance_id;
        return {
          success: true,
          instance_id: data.instance_id,
          message: 'تم إنشاء Instance بنجاح'
        };
      } else {
        return {
          success: false,
          error: data.message || 'فشل في إنشاء Instance'
        };
      }
    } catch (error: any) {
      console.error('❌ خطأ في إنشاء Instance:', error);
      return {
        success: false,
        error: error.message || 'حدث خطأ في إنشاء Instance'
      };
    }
  }

  /**
   * الحصول على QR Code للاتصال بـ WhatsApp
   */
  async getQRCode(instanceId?: string): Promise<QRCodeResponse> {
    if (!this.validateConfig()) {
      return { success: false, error: 'تكوين API غير مكتمل' };
    }

    const instance = instanceId || this.config.instanceId;
    if (!instance) {
      return { success: false, error: 'Instance ID مطلوب' };
    }

    try {
      const url = `${this.config.baseUrl}/get_qrcode?instance_id=${instance}&access_token=${this.config.accessToken}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      });

      const data = await this.handleExternalApiResponse(response, 'Get QR Code');

      if (response.ok && data.success) {
        return {
          success: true,
          qr_code: data.qr_code,
          message: 'تم الحصول على QR Code بنجاح'
        };
      } else {
        return {
          success: false,
          error: data.message || 'فشل في الحصول على QR Code'
        };
      }
    } catch (error: any) {
      console.error('❌ خطأ في الحصول على QR Code:', error);
      return {
        success: false,
        error: error.message || 'حدث خطأ في الحصول على QR Code'
      };
    }
  }

  /**
   * إرسال رسالة نصية
   */
  async sendTextMessage(phoneNumber: string, message: string, instanceId?: string): Promise<BabaserviceResponse> {
    console.log('🚀 sendTextMessage called with:', {
      phoneNumber,
      phoneNumberType: typeof phoneNumber,
      phoneNumberLength: phoneNumber?.length,
      message: message?.substring(0, 50),
      instanceId,
      config: {
        baseUrl: this.config.baseUrl,
        accessToken: this.config.accessToken ? 'SET' : 'NOT_SET',
        instanceId: this.config.instanceId
      }
    });

    if (!this.validateConfig()) {
      console.error('❌ تكوين API غير مكتمل:', this.config);
      return { success: false, error: 'تكوين API غير مكتمل' };
    }

    const instance = instanceId || this.config.instanceId;
    if (!instance) {
      console.error('❌ Instance ID مطلوب:', { instanceId, configInstanceId: this.config.instanceId });
      return { success: false, error: 'Instance ID مطلوب' };
    }

    try {
      // تحقق إضافي من صحة الرقم
      const phoneLength = phoneNumber.replace(/\D/g, '').length;
      console.log('📏 طول رقم الهاتف (أرقام فقط):', phoneLength);

      if (phoneLength < 10) {
        console.error('❌ رقم الهاتف قصير جداً:', phoneNumber);
        return {
          success: false,
          error: `رقم الهاتف قصير جداً (${phoneLength} أرقام). يجب أن يكون على الأقل 10 أرقام بصيغة دولية (مثال: 201017799580 للأرقام المصرية)`
        };
      }

      if (phoneLength > 15) {
        console.warn('⚠️ رقم الهاتف طويل جداً:', phoneNumber);
      }

      const requestBody = {
        number: phoneNumber,
        type: 'text',
        message: message
      };

      console.log('📦 Request body to external API:', requestBody);
      console.log('📦 Request URL:', `${this.config.baseUrl}/send?instance_id=${instance}&access_token=${this.config.accessToken}`);

      const response = await fetch(`${this.config.baseUrl}/send?instance_id=${instance}&access_token=${this.config.accessToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      console.log('📥 Response from external API:', data);
      console.log('📊 Response details:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        data: data
      });

      // معالجة الاستجابة المختلفة
      if (response.ok) {
        // التحقق من وجود خطأ في الرد حتى لو كان status 200
        const messageStr = typeof data.message === 'string' ? data.message : JSON.stringify(data.message || '');
        const hasErrorInMessage = messageStr.toLowerCase().includes('error') || messageStr.toLowerCase().includes('invalid');

        if (data && (data.status === 'error' || data.error || hasErrorInMessage)) {
          console.error('❌ المزود أرجع خطأ رغم status 200:', data);
          return {
            success: false,
            error: typeof data.message === 'string' ? data.message : (data.error || 'Instance ID Invalidated - يرجى إعادة ربط WhatsApp'),
            data: data
          };
        }

        // إذا كان response.ok وبدون أخطاء
        if (Array.isArray(data) && data.length === 0) {
          // مصفوفة فارغة - قد تكون رسالة ناجحة لكن بدون تفاصيل
          console.log('✅ المزود أرجع مصفوفة فارغة (نجاح محتمل)');
          return {
            success: true,
            message: 'تم إرسال الرسالة بنجاح ✅',
            data: {
              status: 'sent',
              note: 'تم الإرسال بنجاح - لا توجد تفاصيل إضافية',
              phoneNumber: phoneNumber
            }
          };
        } else if (data && data.key) {
          // استجابة مع تفاصيل الرسالة - نجاح مؤكد
          console.log('✅ المزود أرجع key (نجاح مؤكد):', data.key);
          return {
            success: true,
            message: 'تم إرسال الرسالة بنجاح ✅',
            data: {
              key: data.key,
              status: 'sent',
              timestamp: new Date().toISOString(),
              phoneNumber: phoneNumber
            }
          };
        } else {
          // استجابة غير متوقعة
          console.warn('⚠️ استجابة غير متوقعة من المزود:', data);
          return {
            success: true,
            message: 'تم إرسال الرسالة (استجابة غير قياسية) ⚠️',
            data: {
              ...data,
              phoneNumber: phoneNumber,
              note: 'تحقق من وصول الرسالة - الاستجابة غير قياسية'
            }
          };
        }
      } else {
        // خطأ في HTTP response
        console.error('❌ خطأ HTTP من المزود:', response.status, data);
        return {
          success: false,
          error: data?.message || data?.error || `HTTP Error: ${response.status}`,
          data: data
        };
      }
    } catch (error: any) {
      console.error('❌ خطأ في إرسال الرسالة:', error);
      return {
        success: false,
        error: error.message || 'حدث خطأ في إرسال الرسالة'
      };
    }
  }

  /**
   * إرسال رسالة مع ميديا
   */
  async sendMediaMessage(
    phoneNumber: string,
    message: string,
    mediaUrl: string,
    filename?: string,
    instanceId?: string
  ): Promise<BabaserviceResponse> {
    if (!this.validateConfig()) {
      return { success: false, error: 'تكوين API غير مكتمل' };
    }

    const instance = instanceId || this.config.instanceId;
    if (!instance) {
      return { success: false, error: 'Instance ID مطلوب' };
    }

    try {
      const requestBody = {
        number: phoneNumber,
        type: 'media',
        message: message,
        media_url: mediaUrl,
        filename: filename
      };

      console.log('📦 Media message request:', requestBody);

      const response = await fetch(`${this.config.baseUrl}/send?instance_id=${instance}&access_token=${this.config.accessToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          message: 'تم إرسال الرسالة مع الميديا بنجاح',
          data: data
        };
      } else {
        return {
          success: false,
          error: data.message || 'فشل في إرسال الرسالة مع الميديا'
        };
      }
    } catch (error: any) {
      console.error('❌ خطأ في إرسال الرسالة مع الميديا:', error);
      return {
        success: false,
        error: error.message || 'حدث خطأ في إرسال الرسالة مع الميديا'
      };
    }
  }

  /**
   * إرسال رسالة نصية لمجموعة
   */
  async sendGroupTextMessage(groupId: string, message: string, instanceId?: string): Promise<BabaserviceResponse> {
    if (!this.validateConfig()) {
      return { success: false, error: 'تكوين API غير مكتمل' };
    }

    const instance = instanceId || this.config.instanceId;
    if (!instance) {
      return { success: false, error: 'Instance ID مطلوب' };
    }

    try {
      const requestBody = {
        group_id: groupId,
        type: 'text',
        message: message
      };

      console.log('📦 Group message request:', requestBody);

      const response = await fetch(`${this.config.baseUrl}/send_group?instance_id=${instance}&access_token=${this.config.accessToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          message: 'تم إرسال الرسالة للمجموعة بنجاح',
          data: data
        };
      } else {
        return {
          success: false,
          error: data.message || 'فشل في إرسال الرسالة للمجموعة'
        };
      }
    } catch (error: any) {
      console.error('❌ خطأ في إرسال الرسالة للمجموعة:', error);
      return {
        success: false,
        error: error.message || 'حدث خطأ في إرسال الرسالة للمجموعة'
      };
    }
  }

  /**
   * إرسال رسالة مع ميديا لمجموعة
   */
  async sendGroupMediaMessage(
    groupId: string,
    message: string,
    mediaUrl: string,
    filename?: string,
    instanceId?: string
  ): Promise<BabaserviceResponse> {
    if (!this.validateConfig()) {
      return { success: false, error: 'تكوين API غير مكتمل' };
    }

    const instance = instanceId || this.config.instanceId;
    if (!instance) {
      return { success: false, error: 'Instance ID مطلوب' };
    }

    try {
      const requestBody = {
        group_id: groupId,
        type: 'media',
        message: message,
        media_url: mediaUrl,
        filename: filename
      };

      console.log('📦 Group media message request:', requestBody);

      const response = await fetch(`${this.config.baseUrl}/send_group?instance_id=${instance}&access_token=${this.config.accessToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          message: 'تم إرسال الرسالة مع الميديا للمجموعة بنجاح',
          data: data
        };
      } else {
        return {
          success: false,
          error: data.message || 'فشل في إرسال الرسالة مع الميديا للمجموعة'
        };
      }
    } catch (error: any) {
      console.error('❌ خطأ في إرسال الرسالة مع الميديا للمجموعة:', error);
      return {
        success: false,
        error: error.message || 'حدث خطأ في إرسال الرسالة مع الميديا للمجموعة'
      };
    }
  }

  /**
   * الحصول على المجموعات
   */
  async getGroups(instanceId?: string): Promise<BabaserviceResponse> {
    if (!this.validateConfig()) {
      return { success: false, error: 'تكوين API غير مكتمل' };
    }

    const instance = instanceId || this.config.instanceId;
    if (!instance) {
      return { success: false, error: 'Instance ID مطلوب' };
    }

    try {
      const url = `${this.config.baseUrl}/get_groups?instance_id=${instance}&access_token=${this.config.accessToken}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          message: 'تم الحصول على المجموعات بنجاح',
          data: data.groups || data
        };
      } else {
        return {
          success: false,
          error: data.message || 'فشل في الحصول على المجموعات'
        };
      }
    } catch (error: any) {
      console.error('❌ خطأ في الحصول على المجموعات:', error);
      return {
        success: false,
        error: error.message || 'حدث خطأ في الحصول على المجموعات'
      };
    }
  }

  /**
   * إعداد Webhook
   */
  async setWebhook(webhookUrl: string, enable: boolean = true, instanceId?: string): Promise<WebhookResponse> {
    if (!this.validateConfig()) {
      return { success: false, error: 'تكوين API غير مكتمل' };
    }

    const instance = instanceId || this.config.instanceId;
    if (!instance) {
      return { success: false, error: 'Instance ID مطلوب' };
    }

    try {
      const encodedWebhookUrl = encodeURIComponent(webhookUrl);
      const url = `${this.config.baseUrl}/set_webhook?webhook_url=${encodedWebhookUrl}&enable=${enable}&instance_id=${instance}&access_token=${this.config.accessToken}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          message: 'تم إعداد Webhook بنجاح'
        };
      } else {
        return {
          success: false,
          error: data.message || 'فشل في إعداد Webhook'
        };
      }
    } catch (error: any) {
      console.error('❌ خطأ في إعداد Webhook:', error);
      return {
        success: false,
        error: error.message || 'حدث خطأ في إعداد Webhook'
      };
    }
  }

  /**
   * إعادة تشغيل Instance
   */
  async rebootInstance(instanceId?: string): Promise<BabaserviceResponse> {
    if (!this.validateConfig()) {
      return { success: false, error: 'تكوين API غير مكتمل' };
    }

    const instance = instanceId || this.config.instanceId;
    if (!instance) {
      return { success: false, error: 'Instance ID مطلوب' };
    }

    try {
      const url = `${this.config.baseUrl}/reboot?instance_id=${instance}&access_token=${this.config.accessToken}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          message: 'تم إعادة تشغيل Instance بنجاح'
        };
      } else {
        return {
          success: false,
          error: data.message || 'فشل في إعادة تشغيل Instance'
        };
      }
    } catch (error: any) {
      console.error('❌ خطأ في إعادة تشغيل Instance:', error);
      return {
        success: false,
        error: error.message || 'حدث خطأ في إعادة تشغيل Instance'
      };
    }
  }

  /**
   * إعادة تعيين Instance
   */
  async resetInstance(instanceId?: string): Promise<BabaserviceResponse> {
    if (!this.validateConfig()) {
      return { success: false, error: 'تكوين API غير مكتمل' };
    }

    const instance = instanceId || this.config.instanceId;
    if (!instance) {
      return { success: false, error: 'Instance ID مطلوب' };
    }

    try {
      const url = `${this.config.baseUrl}/reset_instance?instance_id=${instance}&access_token=${this.config.accessToken}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          message: 'تم إعادة تعيين Instance بنجاح',
          data: data
        };
      } else {
        return {
          success: false,
          error: data.message || 'فشل في إعادة تعيين Instance'
        };
      }
    } catch (error: any) {
      console.error('❌ خطأ في إعادة تعيين Instance:', error);
      return {
        success: false,
        error: error.message || 'حدث خطأ في إعادة تعيين Instance'
      };
    }
  }

  /**
   * إعادة الاتصال
   */
  async reconnect(instanceId?: string): Promise<BabaserviceResponse> {
    if (!this.validateConfig()) {
      return { success: false, error: 'تكوين API غير مكتمل' };
    }

    const instance = instanceId || this.config.instanceId;
    if (!instance) {
      return { success: false, error: 'Instance ID مطلوب' };
    }

    try {
      const url = `${this.config.baseUrl}/reconnect?instance_id=${instance}&access_token=${this.config.accessToken}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          message: 'تم إعادة الاتصال بنجاح'
        };
      } else {
        return {
          success: false,
          error: data.message || 'فشل في إعادة الاتصال'
        };
      }
    } catch (error: any) {
      console.error('❌ خطأ في إعادة الاتصال:', error);
      return {
        success: false,
        error: error.message || 'حدث خطأ في إعادة الاتصال'
      };
    }
  }

  /**
   * إرسال إشعار حالة الطلب
   */
  async sendPedidoNotification(instanceId?: string): Promise<BabaserviceResponse> {
    if (!this.validateConfig()) {
      return { success: false, error: 'تكوين API غير مكتمل' };
    }

    const instance = instanceId || this.config.instanceId;
    if (!instance) {
      return { success: false, error: 'Instance ID مطلوب' };
    }

    try {
      const url = `${this.config.baseUrl}/send_pedido?instance_id=${instance}&access_token=${this.config.accessToken}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          message: 'تم إرسال إشعار حالة الطلب بنجاح'
        };
      } else {
        return {
          success: false,
          error: data.message || 'فشل في إرسال إشعار حالة الطلب'
        };
      }
    } catch (error: any) {
      console.error('❌ خطأ في إرسال إشعار حالة الطلب:', error);
      return {
        success: false,
        error: error.message || 'حدث خطأ في إرسال إشعار حالة الطلب'
      };
    }
  }

  /**
   * إرسال رسالة أزرار
   */
  async sendButtonMessage(
    chatId: string,
    template: string,
    type: '2' | '3' = '2',
    instanceId?: string
  ): Promise<BabaserviceResponse> {
    if (!this.validateConfig()) {
      return { success: false, error: 'تكوين API غير مكتمل' };
    }

    const instance = instanceId || this.config.instanceId;
    if (!instance) {
      return { success: false, error: 'Instance ID مطلوب' };
    }

    try {
      const url = `https://dashapi.wappbuzz.in/api/send_button_message?instance_id=${instance}&access_token=${this.config.accessToken}&chat_id=${chatId}&template=${template}&type=${type}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          message: 'تم إرسال رسالة الأزرار بنجاح',
          data: data
        };
      } else {
        return {
          success: false,
          error: data.message || 'فشل في إرسال رسالة الأزرار'
        };
      }
    } catch (error: any) {
      console.error('❌ خطأ في إرسال رسالة الأزرار:', error);
      return {
        success: false,
        error: error.message || 'حدث خطأ في إرسال رسالة الأزرار'
      };
    }
  }

  /**
   * الحصول على معلومات التكوين الحالي
   */
  getConfig(): BabaserviceConfig {
    return { ...this.config };
  }

  /**
   * تحديث Instance ID
   */
  setInstanceId(instanceId: string): void {
    this.config.instanceId = instanceId;
  }
}

export default BabaserviceWhatsAppService;

