import { BEON_V3_CONFIG, createBeOnHeaders } from './config';

interface WhatsAppOTPResponse {
  success: boolean;
  otp?: string;
  link?: string;
  reference?: string;
  message?: string;
  error?: string;
  data?: any;
}

interface OTPVerificationResponse {
  success: boolean;
  otp?: string;
  reference?: string;
  status?: string;
  clientPhone?: string;
  clientName?: string;
  error?: string;
}

class BeOnWhatsAppOTPService {
  private baseUrl: string;
  private token: string;
  private callbackUrl: string;

  constructor() {
    this.baseUrl = BEON_V3_CONFIG.BASE_URL;
    this.token = BEON_V3_CONFIG.TOKEN;
    this.callbackUrl = process.env.BEON_CALLBACK_URL || 'https://el7lm.com/api/beon/callback';
  }

  // التحقق من صحة التكوين
  private validateConfig(): boolean {
    console.log('🔍 Validating WhatsApp OTP config...');
    console.log('🔍 Base URL:', this.baseUrl);
    console.log('🔍 Token:', this.token ? '✅ Set' : '❌ Missing');
    console.log('🔍 Callback URL:', this.callbackUrl);
    
    return !!this.token;
  }

  // إرسال OTP عبر WhatsApp/SMS (حسب النوع)
  async sendOTP(
    phoneNumber: string,
    reference?: string,
    options?: { type?: 'sms' | 'whatsapp_link'; name?: string; otpLength?: number; lang?: string }
  ): Promise<WhatsAppOTPResponse> {
    console.log('📱 sendOTP called with:', { phoneNumber, reference, options });
    
    if (!this.validateConfig()) {
      return { success: false, error: 'WhatsApp OTP configuration is missing' };
    }

    try {
      // إنشاء reference إذا لم يتم توفيره
      const otpReference = reference || `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const type = options?.type || 'sms';
      const name = options?.name || BEON_V3_CONFIG.DEFAULTS.SENDER_NAME || 'el7lm';
      const otpLength = options?.otpLength ?? BEON_V3_CONFIG.DEFAULTS.OTP_LENGTH ?? 4;
      const lang = options?.lang || BEON_V3_CONFIG.DEFAULTS.LANGUAGE || 'ar';

      // إنشاء FormData وفق الوثائق الرسمية
      const formData = new FormData();
      formData.append('phoneNumber', phoneNumber);
      formData.append('name', name);
      formData.append('type', type);
      formData.append('otp_length', String(otpLength));
      formData.append('lang', lang);
      if (otpReference) {
        formData.append('reference', otpReference);
      }
      // callback_url إن كانت مطلوبة في بعض البيئات
      if (this.callbackUrl) {
        formData.append('callback_url', this.callbackUrl);
      }

      const endpointUrl = `${this.baseUrl}${BEON_V3_CONFIG.ENDPOINTS.WHATSAPP}`;
      console.log('📱 WhatsApp OTP endpoint:', endpointUrl);
      console.log('📦 WhatsApp OTP form data:', { phoneNumber, name, type, otp_length: otpLength, lang, reference: otpReference });

      const response = await fetch(endpointUrl, {
        method: 'POST',
        // لا نضع Content-Type هنا كي يُضاف boundary تلقائياً
        headers: {
          'beon-token': this.token
        },
        body: formData
      });

      console.log('📱 WhatsApp OTP response status:', response.status, response.statusText);
      console.log('📱 WhatsApp OTP response headers:', Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log('📱 WhatsApp OTP response text:', responseText);

      let result: any = null;
      try {
        result = responseText ? JSON.parse(responseText) : null;
      } catch (parseError) {
        console.warn('⚠️ Non-JSON response from OTP API, proceeding with raw text.');
      }

      // حالات نجاح محتملة حسب الوثائق:
      // - { status: 200, message: 'otp send', data: '6278' }
      // - { code: '200', message: 'Otp Send', data: { link, otp } }
      const statusOk = response.ok || (result && (result.status === 200 || result.code === '200' || result.code === 200));
      if (statusOk) {
        const data = result?.data ?? null;
        let otp: string | undefined;
        let link: string | undefined;

        if (typeof data === 'string' || typeof data === 'number') {
          otp = String(data);
        } else if (data && typeof data === 'object') {
          if (typeof data.otp !== 'undefined') otp = String(data.otp);
          if (typeof data.link === 'string') link = data.link;
        }

        return {
          success: true,
          otp,
          link,
          reference: otpReference,
          message: result?.message || 'OTP sent successfully',
          data: result
        };
      }

      // حالة الفشل
      return {
        success: false,
        error: result?.message || `HTTP ${response.status}: ${response.statusText}`,
        reference: otpReference,
        data: result || responseText
      };
    } catch (error: any) {
      console.error('❌ WhatsApp OTP sending error:', error);
      return { success: false, error: error.message };
    }
  }

  // التحقق من صحة OTP (callback verification)
  async verifyOTP(otp: string, reference: string): Promise<OTPVerificationResponse> {
    console.log('📱 verifyOTP called with:', { otp, reference });
    
    if (!this.validateConfig()) {
      return { success: false, error: 'WhatsApp OTP configuration is missing' };
    }

    try {
      // في الواقع، هذا سيتم استدعاؤه من خلال callback URL
      // لكن يمكننا محاكاة التحقق هنا
      console.log('📱 Simulating OTP verification for:', { otp, reference });
      
      // محاكاة تأخير التحقق
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // محاكاة نجاح التحقق
      return {
        success: true,
        otp: otp,
        reference: reference,
        status: 'verified',
        clientPhone: '+201017799580', // سيتم توفيره من خلال callback
        clientName: 'User' // سيتم توفيره من خلال callback
      };
    } catch (error: any) {
      console.error('❌ OTP verification error:', error);
      return { success: false, error: error.message };
    }
  }

  // إنشاء WhatsApp link
  createWhatsAppLink(phoneNumber: string, message: string): string {
    const encodedMessage = encodeURIComponent(message);
    return `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`;
  }

  // معالجة callback من BeOn
  handleCallback(callbackData: any): OTPVerificationResponse {
    console.log('📱 Handling BeOn callback:', callbackData);
    
    try {
      // استخراج البيانات من callback
      const { otp, reference, status, clientPhone, clientName } = callbackData;
      
      return {
        success: status === 'verified',
        otp: otp,
        reference: reference,
        status: status,
        clientPhone: clientPhone,
        clientName: clientName
      };
    } catch (error: any) {
      console.error('❌ Callback handling error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default BeOnWhatsAppOTPService;
