/**
 * Babaservice WhatsApp API Configuration
 * تكوين API WhatsApp الجديد - Babaservice
 */

export const BABASERVICE_CONFIG = {
  // Base URL for Babaservice API
  BASE_URL: process.env.BABASERVICE_BASE_URL || 'https://wbot.babaservice.online/api',

  // Access Token
  ACCESS_TOKEN: process.env.BABASERVICE_ACCESS_TOKEN || '68f0029b4ce90',

  // Instance ID (سيتم إنشاؤه تلقائياً)
  INSTANCE_ID: process.env.BABASERVICE_INSTANCE_ID || '68F243B3A8D8D',

  // Webhook URL
  WEBHOOK_URL: process.env.BABASERVICE_WEBHOOK_URL,

  // Endpoints
  ENDPOINTS: {
    // Instance Management
    CREATE_INSTANCE: '/create_instance',
    GET_QR_CODE: '/get_qrcode',
    REBOOT: '/reboot',
    RESET_INSTANCE: '/reset_instance',
    RECONNECT: '/reconnect',

    // Messaging
    SEND_MESSAGE: '/send',
    SEND_GROUP_MESSAGE: '/send_group',
    GET_GROUPS: '/get_groups',

    // Webhook
    SET_WEBHOOK: '/set_webhook',

    // Notifications
    SEND_PEDIDO: '/send_pedido',

    // Button Messages (من API منفصل)
    SEND_BUTTON_MESSAGE: 'https://dashapi.wappbuzz.in/api/send_button_message'
  },

  // Default settings
  DEFAULTS: {
    SENDER_NAME: 'El7lm',
    LANGUAGE: 'ar',
    MESSAGE_TYPE: 'text' as const,
    BUTTON_TEMPLATE_TYPE: '2' as const, // Button Template
    LIST_TEMPLATE_TYPE: '3' as const    // List Template
  },

  // Rate limiting
  RATE_LIMITS: {
    MAX_MESSAGES_PER_MINUTE: 60,
    MAX_MESSAGES_PER_HOUR: 1000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000 // milliseconds
  },

  // Message templates
  MESSAGE_TEMPLATES: {
    WELCOME: 'مرحباً بك في منصة العلم! 🎓',
    OTP: 'رمز التحقق الخاص بك هو: {otp}',
    ORDER_CONFIRMATION: 'تم تأكيد طلبك بنجاح! رقم الطلب: {orderId}',
    ORDER_UPDATE: 'تم تحديث حالة طلبك رقم {orderId} إلى: {status}',
    PAYMENT_SUCCESS: 'تم استلام دفعتك بنجاح! شكراً لك.',
    COURSE_ENROLLMENT: 'تم تسجيلك في الدورة: {courseName}',
    NOTIFICATION: 'لديك إشعار جديد: {message}'
  },

  // Supported media types
  SUPPORTED_MEDIA_TYPES: {
    IMAGE: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    VIDEO: ['mp4', 'avi', 'mov', 'wmv'],
    AUDIO: ['mp3', 'wav', 'ogg', 'm4a'],
    DOCUMENT: ['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx']
  },

  // Error messages
  ERROR_MESSAGES: {
    INVALID_PHONE: 'رقم الهاتف غير صحيح',
    INVALID_GROUP_ID: 'معرف المجموعة غير صحيح',
    MESSAGE_TOO_LONG: 'الرسالة طويلة جداً',
    MEDIA_NOT_SUPPORTED: 'نوع الملف غير مدعوم',
    INSTANCE_NOT_FOUND: 'Instance غير موجود',
    CONNECTION_FAILED: 'فشل في الاتصال',
    RATE_LIMIT_EXCEEDED: 'تم تجاوز الحد المسموح من الرسائل',
    INVALID_CONFIG: 'تكوين API غير صحيح'
  }
};

// Helper function to create headers
export const createBabaserviceHeaders = (): HeadersInit => {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'El7lm-Platform/1.0'
  };
};

// Helper function to validate phone number
export const validatePhoneNumber = (phoneNumber: string): boolean => {
  if (!phoneNumber) return false;

  // إذا كان الرقم يحتوي على @s.whatsapp.net، استخرج الرقم قبله
  let numberToValidate = phoneNumber;
  if (phoneNumber.includes('@s.whatsapp.net')) {
    numberToValidate = phoneNumber.split('@')[0];
  }

  // Remove all non-digit characters
  const cleaned = numberToValidate.replace(/\D/g, '');

  // Check if it's a valid international format (7-15 digits)
  const isValid = /^[1-9]\d{6,14}$/.test(cleaned);

  console.log('🔍 validatePhoneNumber:', {
    input: phoneNumber,
    extracted: numberToValidate,
    cleaned: cleaned,
    isValid: isValid
  });

  return isValid;
};

// Helper function to format phone number
export const formatPhoneNumber = (phoneNumber: string): string => {
  // إزالة @s.whatsapp.net إذا كان موجوداً (لأن الـ API يتوقع أرقام فقط)
  let cleanNumber = phoneNumber;
  if (phoneNumber.includes('@s.whatsapp.net')) {
    cleanNumber = phoneNumber.split('@')[0];
  }

  // Remove all non-digit characters
  const cleaned = cleanNumber.replace(/\D/g, '');

  console.log('📞 formatPhoneNumber - Input:', phoneNumber, 'Cleaned:', cleaned);

  // إذا كان الرقم فارغ أو قصير جداً
  if (!cleaned || cleaned.length < 9) {
    console.log('📞 formatPhoneNumber - Invalid number too short');
    return cleaned;
  }

  // إذا كان الرقم يبدأ بـ 966 (السعودية) - احتفظ به كما هو
  if (cleaned.startsWith('966')) {
    console.log('📞 formatPhoneNumber - Saudi with code 966:', cleaned);
    return cleaned;
  }

  // إذا كان الرقم يبدأ بـ 20 (مصر) - احتفظ به كما هو
  if (cleaned.startsWith('20')) {
    console.log('📞 formatPhoneNumber - Egypt with code 20:', cleaned);
    return cleaned;
  }

  // إذا كان الرقم يبدأ بأكواد دول أخرى - احتفظ به كما هو
  const countryCodes = ['971', '965', '974', '973', '968', '212', '213', '216', '218', '249', '967'];
  for (const code of countryCodes) {
    if (cleaned.startsWith(code)) {
      console.log(`📞 formatPhoneNumber - Country code ${code}:`, cleaned);
      return cleaned;
    }
  }

  // حالات خاصة للسعودية
  // رقم سعودي يبدأ بـ 5 وطوله 9 أرقام
  if (cleaned.length === 9 && cleaned.startsWith('5')) {
    console.log('📞 formatPhoneNumber - Saudi 9 digits starting with 5, adding 966');
    return `966${cleaned}`;
  }

  // رقم سعودي يبدأ بـ 05 وطوله 10 أرقام
  if (cleaned.length === 10 && cleaned.startsWith('05')) {
    console.log('📞 formatPhoneNumber - Saudi 10 digits starting with 05, removing 0 and adding 966');
    return `966${cleaned.substring(1)}`;
  }

  // حالات خاصة لمصر
  // رقم مصري يبدأ بـ 1 وطوله 10 أرقام (مثل: 1017799580)
  if (cleaned.length === 10 && cleaned.startsWith('1')) {
    console.log('📞 formatPhoneNumber - Egypt 10 digits starting with 1, adding 20');
    return `20${cleaned}`;
  }

  // رقم مصري يبدأ بـ 01 وطوله 11 رقم (مثل: 01017799580)
  if (cleaned.length === 11 && cleaned.startsWith('01')) {
    console.log('📞 formatPhoneNumber - Egypt 11 digits starting with 01, removing 0 and adding 20');
    return `20${cleaned.substring(1)}`;
  }

  // في جميع الحالات الأخرى، ارجع الرقم كما هو
  console.log('📞 formatPhoneNumber - Returning as is:', cleaned);
  return cleaned;
};

// Helper function to validate group ID
export const validateGroupId = (groupId: string): boolean => {
  // WhatsApp group ID format: number-timestamp@g.us
  return /^\d+-\d+@g\.us$/.test(groupId);
};

// Helper function to validate media URL
export const validateMediaUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
};

// Helper function to get file extension
export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

// Helper function to check if media type is supported
export const isMediaTypeSupported = (filename: string): boolean => {
  const extension = getFileExtension(filename);
  const allSupportedTypes = [
    ...BABASERVICE_CONFIG.SUPPORTED_MEDIA_TYPES.IMAGE,
    ...BABASERVICE_CONFIG.SUPPORTED_MEDIA_TYPES.VIDEO,
    ...BABASERVICE_CONFIG.SUPPORTED_MEDIA_TYPES.AUDIO,
    ...BABASERVICE_CONFIG.SUPPORTED_MEDIA_TYPES.DOCUMENT
  ];

  return allSupportedTypes.includes(extension);
};

// Helper function to get media type category
export const getMediaTypeCategory = (filename: string): 'image' | 'video' | 'audio' | 'document' | 'unknown' => {
  const extension = getFileExtension(filename);

  if (BABASERVICE_CONFIG.SUPPORTED_MEDIA_TYPES.IMAGE.includes(extension)) {
    return 'image';
  }
  if (BABASERVICE_CONFIG.SUPPORTED_MEDIA_TYPES.VIDEO.includes(extension)) {
    return 'video';
  }
  if (BABASERVICE_CONFIG.SUPPORTED_MEDIA_TYPES.AUDIO.includes(extension)) {
    return 'audio';
  }
  if (BABASERVICE_CONFIG.SUPPORTED_MEDIA_TYPES.DOCUMENT.includes(extension)) {
    return 'document';
  }

  return 'unknown';
};

// Helper function to create message with template
export const createMessageFromTemplate = (
  template: keyof typeof BABASERVICE_CONFIG.MESSAGE_TEMPLATES,
  variables: Record<string, string> = {}
): string => {
  let message = BABASERVICE_CONFIG.MESSAGE_TEMPLATES[template];

  // Replace variables in the template
  Object.entries(variables).forEach(([key, value]) => {
    message = message.replace(new RegExp(`{${key}}`, 'g'), value);
  });

  return message;
};

// Helper function to check rate limits
export class RateLimiter {
  private static instance: RateLimiter;
  private messageCounts: Map<string, { count: number; resetTime: number }> = new Map();

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  canSendMessage(identifier: string = 'default'): boolean {
    const now = Date.now();
    const limit = BABASERVICE_CONFIG.RATE_LIMITS.MAX_MESSAGES_PER_MINUTE;
    const windowMs = 60 * 1000; // 1 minute

    const current = this.messageCounts.get(identifier);

    if (!current || now > current.resetTime) {
      this.messageCounts.set(identifier, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (current.count >= limit) {
      return false;
    }

    current.count++;
    return true;
  }

  getRemainingMessages(identifier: string = 'default'): number {
    const current = this.messageCounts.get(identifier);
    if (!current) {
      return BABASERVICE_CONFIG.RATE_LIMITS.MAX_MESSAGES_PER_MINUTE;
    }

    const remaining = BABASERVICE_CONFIG.RATE_LIMITS.MAX_MESSAGES_PER_MINUTE - current.count;
    return Math.max(0, remaining);
  }

  getResetTime(identifier: string = 'default'): number {
    const current = this.messageCounts.get(identifier);
    return current?.resetTime || 0;
  }
}

export default BABASERVICE_CONFIG;

