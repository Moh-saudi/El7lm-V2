/**
 * BeOn V3 API Configuration
 * تكوين API BeOn V3
 */

export const BEON_V3_CONFIG = {
  // Base URL for BeOn V3 API
  BASE_URL: process.env.BEON_V3_BASE_URL || 'https://v3.api.beon.chat',
  
  // Your API Token
  TOKEN: process.env.BEON_V3_TOKEN || 'Yt3A3RwMQHx49trsz1EMgSKP8qOD0CSVJXdJxy6IqNNtcYblsYWtfVAtaJpv',
  
  // Endpoints
  ENDPOINTS: {
    // OTP Endpoint - The correct, dedicated endpoint for sending OTPs
    OTP_SEND: '/api/v3/send/otp',
    OTP_VERIFY: '/api/v3/verify/otp',

    // SMS Endpoints
    SMS_BULK: '/api/v3/messages/sms/bulk',
    SMS_TEMPLATE: '/api/v3/send/message/sms/template',
    
    // WhatsApp Endpoints (using SMS endpoints as per documentation)
    WHATSAPP: '/api/v3/messages/sms/bulk',
    
    // Template Management
    CREATE_TEMPLATE: '/api/v3/partner/templates/create',
    
    // Account
    ACCOUNT_DETAILS: '/api/v3/account'
  },
  
  // Default settings
  DEFAULTS: {
    SENDER_NAME: 'El7lm',
    LANGUAGE: 'ar',
    OTP_LENGTH: 4
  }
};

// Helper function to create headers
export const createBeOnHeaders = (token?: string) => {
  return {
    'beon-token': token || BEON_V3_CONFIG.TOKEN,
    'Content-Type': 'application/json; charset=utf-8'
  };
};

// Helper function to create form data headers
export const createBeOnFormHeaders = (token?: string) => {
  return {
    'beon-token': token || BEON_V3_CONFIG.TOKEN
  };
};

// Response interfaces
export interface BeOnResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
  code?: string;
  retryAfter?: number;
}

export interface BeOnError {
  code: string;
  message: string;
  details?: any;
  retryAfter?: number;
}

export interface BeOnSMSResponse {
  success: boolean;
  messageId?: string;
  phoneNumbers: string[];
  status: 'sent' | 'failed' | 'pending';
  timestamp?: string;
}

export interface SMSBulkRequest {
  phoneNumbers: string[];
  message: string;
  sender?: string;
  lang?: string;
}

export interface SMSTemplateRequest {
  template_id: number;
  phoneNumber: string;
  name: string;
  vars: string[];
}

export interface TemplateCreateRequest {
  name: string;
  lang: string;
  message: string;
}

// Utility functions
export async function retryRequest<T>(
  requestFn: () => Promise<T>, 
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // زيادة التأخير مع كل محاولة
      const currentDelay = delay * Math.pow(2, i);
      console.log(`🔄 إعادة المحاولة ${i + 1}/${maxRetries} بعد ${currentDelay}ms`);
      await new Promise(resolve => setTimeout(resolve, currentDelay));
    }
  }
  throw new Error('فشل في جميع محاولات إعادة الإرسال');
}
