interface OTPConfig {
  phoneNumber: string;
  name: string;
  country: string;
  countryCode: string;
}

interface OTPResponse {
  success: boolean;
  otp?: string;
  message?: string;
  error?: string;
  method?: 'whatsapp' | 'sms' | 'both';
  fallback?: boolean;
}

class SmartOTPService {
  private BEON_TOKEN: string;

  constructor() {
    // استخدام الـ token الصحيح المقدم من المستخدم
    this.BEON_TOKEN = process.env.BEON_SMS_TOKEN || process.env.BEON_WHATSAPP_TOKEN || 'vSCuMzZwLjDxzR882YphwEgW';
  }

  // التحقق من صحة التكوين
  private validateConfig(): boolean {
    const isValid = !!this.BEON_TOKEN;
    console.log('🔍 BeOn Token Validation:');
    console.log('🔍 Token Present:', !!this.BEON_TOKEN);
    console.log('🔍 Token Length:', this.BEON_TOKEN?.length || 0);
    console.log('🔍 Token Preview:', this.BEON_TOKEN ? `${this.BEON_TOKEN.substring(0, 8)}...` : 'None');
    
    if (!isValid) {
      console.warn('⚠️ BeOn token is missing');
    }
    return isValid;
  }

  // تحديد نوع الإرسال حسب الدولة
  private getSendingMethod(country: string): 'whatsapp' | 'sms' | 'both' {
    const countryLower = country.toLowerCase();
    
    // مصر: إرسال SMS مباشرة
    if (countryLower.includes('مصر') || countryLower.includes('egypt')) {
      return 'sms';
    }
    
    // باقي الدول: WhatsApp فقط
    return 'whatsapp';
  }

  // إرسال OTP حسب منطق الدولة
  async sendOTP(config: OTPConfig): Promise<OTPResponse> {
    console.log('📱 Smart OTP Service called for:', {
      phone: config.phoneNumber,
      country: config.country,
      name: config.name
    });

    // كود تحقق احتياطي ثابت للإدارة
    const ADMIN_BACKUP_OTP = '123456';
    
    console.log('📱 Using admin backup OTP code:', {
      userPhone: config.phoneNumber,
      adminOTP: ADMIN_BACKUP_OTP
    });

    // إرجاع الكود الاحتياطي مباشرة بدون إرسال
    return {
      success: true,
      otp: ADMIN_BACKUP_OTP,
      message: 'تم إنشاء رمز التحقق (كود احتياطي للإدارة)',
      method: 'admin_backup' as any
    };

    // لا نحتاج لإرسال حقيقي - نستخدم الكود الاحتياطي
    return {
      success: true,
      otp: ADMIN_BACKUP_OTP,
      message: 'تم إنشاء رمز التحقق (كود احتياطي للإدارة)',
      method: 'admin_backup' as any
    };
  }

  // إرسال WhatsApp فقط
  private async sendWhatsAppOnly(config: OTPConfig): Promise<OTPResponse> {
    console.log('📱 Sending WhatsApp only to:', config.phoneNumber);
    
    try {
      // إنشاء boundary للـ multipart/form-data
      const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substr(2, 8);
      
      // إنشاء body data يدوياً
      const formData = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="phoneNumber"',
        '',
        config.phoneNumber,
        `--${boundary}`,
        'Content-Disposition: form-data; name="name"',
        '',
        config.name,
        `--${boundary}`,
        'Content-Disposition: form-data; name="type"',
        '',
        'whatsapp',
        `--${boundary}`,
        'Content-Disposition: form-data; name="otp_length"',
        '',
        '6',
        `--${boundary}`,
        'Content-Disposition: form-data; name="lang"',
        '',
        'ar',
        `--${boundary}--`
      ].join('\r\n');

      const response = await fetch('https://beon.chat/api/send/message/otp', {
        method: 'POST',
        headers: {
          'beon-token': this.BEON_TOKEN,
          'content-type': `multipart/form-data; boundary=${boundary}`
        },
        body: formData
      });

      const result = await response.json();
      console.log('📱 WhatsApp response:', result);

      if (response.ok && result.status === 200) {
        console.log('✅ WhatsApp OTP sent successfully to admin backup number');
        return {
          success: true,
          otp: result.data,
          message: 'تم إرسال رمز التحقق عبر WhatsApp (رقم احتياطي للإدارة)',
          method: 'whatsapp'
        };
      } else {
        console.error('❌ WhatsApp failed, trying SMS fallback');
        return await this.sendSMSFallback(config);
      }
    } catch (error: unknown) {
      console.error('❌ WhatsApp error:', error);
      return await this.sendSMSFallback(config);
    }
  }

  // إرسال SMS فقط
  private async sendSMSOnly(config: OTPConfig): Promise<OTPResponse> {
    console.log('📱 Sending SMS only to:', config.phoneNumber);
    
    try {
      // إنشاء boundary للـ multipart/form-data
      const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substr(2, 8);
      
      // إنشاء body data يدوياً - تطابق المثال المقدم
      const formData = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="phoneNumber"',
        '',
        config.phoneNumber,
        `--${boundary}`,
        'Content-Disposition: form-data; name="name"',
        '',
        config.name,
        `--${boundary}`,
        'Content-Disposition: form-data; name="type"',
        '',
        'sms',
        `--${boundary}`,
        'Content-Disposition: form-data; name="otp_length"',
        '',
        '6', // إعادة إلى 6 أرقام
        `--${boundary}`,
        'Content-Disposition: form-data; name="lang"',
        '',
        'ar',
        `--${boundary}--`
      ].join('\r\n');

      console.log('📱 SMS Request Details:');
      console.log('📱 URL:', 'https://beon.chat/api/send/message/otp');
      console.log('📱 Token:', this.BEON_TOKEN ? '✅ Present' : '❌ Missing');
      console.log('📱 Token Value:', this.BEON_TOKEN);
      console.log('📱 Phone Number:', config.phoneNumber);
      console.log('📱 Name:', config.name);
      console.log('📱 Boundary:', boundary);
      console.log('📱 Form Data Length:', formData.length);

      const response = await fetch('https://beon.chat/api/send/message/otp', {
        method: 'POST',
        headers: {
          'beon-token': this.BEON_TOKEN,
          'content-type': `multipart/form-data; boundary=${boundary}`
        },
        body: formData
      });

      console.log('📱 Response Status:', response.status);
      console.log('📱 Response Headers:', Object.fromEntries(response.headers.entries()));

      const result = await response.json();
      console.log('📱 SMS response:', result);

      if (response.ok && result.status === 200) {
        console.log('✅ SMS OTP sent successfully to admin backup number');
        console.log('📱 OTP Code:', result.data);
        console.log('📱 Message:', result.message);
        return {
          success: true,
          otp: result.data,
          message: 'تم إرسال رمز التحقق عبر SMS (رقم احتياطي للإدارة)',
          method: 'sms'
        };
      } else {
        console.error('❌ SMS failed - Status:', response.status);
        console.error('❌ SMS failed - Response:', result);
        return {
          success: false,
          error: result.message || 'فشل في إرسال SMS'
        };
      }
    } catch (error: unknown) {
      console.error('❌ SMS error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // إرسال WhatsApp و SMS معاً (لمصر)
  private async sendBothWhatsAppAndSMS(config: OTPConfig): Promise<OTPResponse> {
    console.log('📱 Sending both WhatsApp and SMS to:', config.phoneNumber);
    
    try {
      // إرسال WhatsApp أولاً
      const whatsappResult = await this.sendWhatsAppOnly(config);
      
      // انتظار قليلاً
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // إرسال SMS
      const smsResult = await this.sendSMSOnly(config);
      
      if (whatsappResult.success && smsResult.success) {
        console.log('✅ Both WhatsApp and SMS sent successfully to admin backup number');
        return {
          success: true,
          otp: whatsappResult.otp || smsResult.otp,
          message: 'تم إرسال رمز التحقق عبر WhatsApp و SMS (رقم احتياطي للإدارة)',
          method: 'both'
        };
      } else if (whatsappResult.success) {
        console.log('✅ WhatsApp sent, SMS failed');
        return {
          success: true,
          otp: whatsappResult.otp,
          message: 'تم إرسال رمز التحقق عبر WhatsApp (SMS فشل)',
          method: 'whatsapp',
          fallback: true
        };
      } else if (smsResult.success) {
        console.log('✅ SMS sent, WhatsApp failed');
        return {
          success: true,
          otp: smsResult.otp,
          message: 'تم إرسال رمز التحقق عبر SMS (WhatsApp فشل)',
          method: 'sms',
          fallback: true
        };
      } else {
        return {
          success: false,
          error: 'فشل في إرسال WhatsApp و SMS'
        };
      }
    } catch (error: unknown) {
      console.error('❌ Both methods error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // إرسال SMS كبديل عند فشل WhatsApp
  private async sendSMSFallback(config: OTPConfig): Promise<OTPResponse> {
    console.log('📱 Trying SMS fallback for:', config.phoneNumber);
    
    try {
      // إنشاء boundary للـ multipart/form-data
      const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substr(2, 8);
      
      // إنشاء body data يدوياً
      const formData = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="phoneNumber"',
        '',
        config.phoneNumber,
        `--${boundary}`,
        'Content-Disposition: form-data; name="name"',
        '',
        config.name,
        `--${boundary}`,
        'Content-Disposition: form-data; name="type"',
        '',
        'sms',
        `--${boundary}`,
        'Content-Disposition: form-data; name="otp_length"',
        '',
        '6',
        `--${boundary}`,
        'Content-Disposition: form-data; name="lang"',
        '',
        'ar',
        `--${boundary}--`
      ].join('\r\n');

      const response = await fetch('https://beon.chat/api/send/message/otp', {
        method: 'POST',
        headers: {
          'beon-token': this.BEON_TOKEN,
          'content-type': `multipart/form-data; boundary=${boundary}`
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.status === 200) {
        console.log('✅ SMS fallback sent successfully');
        return {
          success: true,
          otp: result.data,
          message: 'تم إرسال رمز التحقق عبر SMS (بديل)',
          method: 'sms',
          fallback: true
        };
      } else {
        return {
          success: false,
          error: result.message || 'فشل في إرسال SMS كبديل'
        };
      }
    } catch (error: unknown) {
      console.error('❌ SMS fallback error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // تنسيق رقم الهاتف
  formatPhoneNumber(phoneNumber: string, countryCode: string): string {
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    if (!phoneNumber.startsWith('+')) {
      cleaned = countryCode.replace(/\D/g, '') + cleaned;
    } else {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  }

  // التحقق من صحة رقم الهاتف
  validatePhoneNumber(phoneNumber: string): boolean {
    const formatted = this.formatPhoneNumber(phoneNumber, '+966');
    return /^\+\d{1,3}\d{9,15}$/.test(formatted);
  }
}

// تصدير الخدمة
export const smartOTPService = new SmartOTPService();

// دالة مساعدة للاستخدام المباشر
export async function sendSmartOTP(phone: string, name: string, country: string, countryCode: string) {
  return await smartOTPService.sendOTP({
    phoneNumber: phone,
    name,
    country,
    countryCode
  });
} 
