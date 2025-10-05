/**
 * WhatsApp Share Utility Functions
 * دوال مساعدة لـ WhatsApp Share
 */

export interface WhatsAppShareResult {
  success: boolean;
  message: string;
  whatsappUrl?: string;
  error?: string;
  data?: {
    originalPhone: string;
    cleanPhone: string;
    messageLength: number;
  };
}

/**
 * تنظيف وتنسيق رقم الهاتف لجميع الدول
 * Clean and format phone number for all countries
 */
export function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  console.log(`🔍 الرقم الأصلي: "${phone}" (طول: ${phone.length})`);
  console.log(`🔍 الرقم الأصلي (hex): ${Array.from(phone).map(c => c.charCodeAt(0).toString(16)).join(' ')}`);
  
  // Remove all spaces, dashes, and non-digit characters except +
  let cleanPhone = phone.replace(/[\s\-\(\)]/g, '').replace(/[^\d+]/g, '');
  
  console.log(`🔍 بعد التنظيف الأولي: "${cleanPhone}" (طول: ${cleanPhone.length})`);
  
  // Handle different phone number formats
  if (cleanPhone.startsWith('+')) {
    // International format: +201017799580
    cleanPhone = cleanPhone.substring(1); // Remove +
    console.log(`🌍 رقم دولي: "${cleanPhone}"`);
  } else if (cleanPhone.startsWith('00')) {
    // International format: 00201017799580
    cleanPhone = cleanPhone.substring(2); // Remove 00
    console.log(`🌍 رقم دولي (00): "${cleanPhone}"`);
  } else if (cleanPhone.startsWith('20') && cleanPhone.length >= 12) {
    // Egyptian number without +: 201017799580
    console.log(`🇪🇬 رقم مصري: "${cleanPhone}"`);
  } else if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
    // Egyptian local format: 01017799580
    cleanPhone = '20' + cleanPhone.substring(1);
    console.log(`🇪🇬 رقم مصري محلي: "${cleanPhone}"`);
  } else if (cleanPhone.length >= 10) {
    // Other international numbers - keep as is
    console.log(`🌍 رقم دولي آخر: "${cleanPhone}"`);
  } else {
    // Default to Egyptian if unclear
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '20' + cleanPhone.substring(1);
    } else {
      cleanPhone = '20' + cleanPhone;
    }
    console.log(`🇪🇬 رقم افتراضي (مصري): "${cleanPhone}"`);
  }
  
  console.log(`📱 الرقم النهائي: "${cleanPhone}" (طول: ${cleanPhone.length})`);
  return cleanPhone;
}

/**
 * التحقق من صحة رقم الهاتف لجميع الدول
 * Validate phone number for all countries
 */
export function validatePhoneNumber(phone: string): boolean {
  const cleanPhone = cleanPhoneNumber(phone);
  
  // Egyptian numbers: 20 + 10 digits = 12 total
  if (cleanPhone.startsWith('20') && cleanPhone.length === 12) {
    return true;
  }
  
  // Saudi numbers: 966 + 9 digits = 12 total
  if (cleanPhone.startsWith('966') && cleanPhone.length === 12) {
    return true;
  }
  
  // UAE numbers: 971 + 9 digits = 12 total
  if (cleanPhone.startsWith('971') && cleanPhone.length === 12) {
    return true;
  }
  
  // Jordan numbers: 962 + 9 digits = 12 total
  if (cleanPhone.startsWith('962') && cleanPhone.length === 12) {
    return true;
  }
  
  // Kuwait numbers: 965 + 8 digits = 11 total
  if (cleanPhone.startsWith('965') && cleanPhone.length === 11) {
    return true;
  }
  
  // Qatar numbers: 974 + 8 digits = 11 total
  if (cleanPhone.startsWith('974') && cleanPhone.length === 11) {
    return true;
  }
  
  // Bahrain numbers: 973 + 8 digits = 11 total
  if (cleanPhone.startsWith('973') && cleanPhone.length === 11) {
    return true;
  }
  
  // Oman numbers: 968 + 8 digits = 11 total
  if (cleanPhone.startsWith('968') && cleanPhone.length === 11) {
    return true;
  }
  
  // Lebanon numbers: 961 + 8 digits = 11 total
  if (cleanPhone.startsWith('961') && cleanPhone.length === 11) {
    return true;
  }
  
  // Morocco numbers: 212 + 9 digits = 12 total
  if (cleanPhone.startsWith('212') && cleanPhone.length === 12) {
    return true;
  }
  
  // Algeria numbers: 213 + 9 digits = 12 total
  if (cleanPhone.startsWith('213') && cleanPhone.length === 12) {
    return true;
  }
  
  // Tunisia numbers: 216 + 8 digits = 11 total
  if (cleanPhone.startsWith('216') && cleanPhone.length === 11) {
    return true;
  }
  
  // General validation: 7-15 digits (most international numbers)
  if (cleanPhone.length >= 7 && cleanPhone.length <= 15) {
    return true;
  }
  
  return false;
}

/**
 * تحديد نوع الرقم (البلد)
 * Determine phone number type (country)
 */
export function getPhoneNumberType(phone: string): string {
  const cleanPhone = cleanPhoneNumber(phone);
  
  if (cleanPhone.startsWith('20')) return '🇪🇬 مصر';
  if (cleanPhone.startsWith('966')) return '🇸🇦 السعودية';
  if (cleanPhone.startsWith('971')) return '🇦🇪 الإمارات';
  if (cleanPhone.startsWith('962')) return '🇯🇴 الأردن';
  if (cleanPhone.startsWith('965')) return '🇰🇼 الكويت';
  if (cleanPhone.startsWith('974')) return '🇶🇦 قطر';
  if (cleanPhone.startsWith('973')) return '🇧🇭 البحرين';
  if (cleanPhone.startsWith('968')) return '🇴🇲 عمان';
  if (cleanPhone.startsWith('961')) return '🇱🇧 لبنان';
  if (cleanPhone.startsWith('212')) return '🇲🇦 المغرب';
  if (cleanPhone.startsWith('213')) return '🇩🇿 الجزائر';
  if (cleanPhone.startsWith('216')) return '🇹🇳 تونس';
  
  return '🌍 دولي';
}

/**
 * إنشاء رابط WhatsApp Share
 * Create WhatsApp Share link
 */
export function createWhatsAppShareLink(phone: string, message: string): WhatsAppShareResult {
  try {
    console.log(`🚀 بدء إنشاء رابط WhatsApp Share للرقم: "${phone}"`);
    
    // تنظيف رقم الهاتف
    const cleanPhone = cleanPhoneNumber(phone);
    
    // التحقق من صحة الرقم
    if (!validatePhoneNumber(phone)) {
      const error = `رقم الهاتف غير صحيح: ${cleanPhone} (طول: ${cleanPhone.length})`;
      console.error(`❌ ${error}`);
      return {
        success: false,
        error: error,
        data: {
          originalPhone: phone,
          cleanPhone: cleanPhone,
          messageLength: message.length
        }
      };
    }
    
    // ترميز الرسالة
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    
    console.log(`📱 رابط WhatsApp النهائي: ${whatsappUrl}`);
    console.log(`📱 طول الرابط: ${whatsappUrl.length}`);
    
    // التحقق من صحة URL
    try {
      new URL(whatsappUrl);
      console.log(`✅ رابط WhatsApp صحيح`);
    } catch (error) {
      console.error(`❌ رابط WhatsApp غير صحيح:`, error);
      return {
        success: false,
        error: 'خطأ في إنشاء رابط WhatsApp',
        data: {
          originalPhone: phone,
          cleanPhone: cleanPhone,
          messageLength: message.length
        }
      };
    }
    
    return {
      success: true,
      message: `تم إنشاء رابط WhatsApp بنجاح`,
      whatsappUrl: whatsappUrl,
      data: {
        originalPhone: phone,
        cleanPhone: cleanPhone,
        messageLength: message.length
      }
    };
    
  } catch (error) {
    console.error(`❌ خطأ في إنشاء رابط WhatsApp:`, error);
    return {
      success: false,
      error: `خطأ في إنشاء رابط WhatsApp: ${error}`,
      data: {
        originalPhone: phone,
        cleanPhone: '',
        messageLength: message.length
      }
    };
  }
}

/**
 * فتح WhatsApp Share
 * Open WhatsApp Share
 */
export function openWhatsAppShare(phone: string, message: string): WhatsAppShareResult {
  const result = createWhatsAppShareLink(phone, message);
  
  if (result.success && result.whatsappUrl) {
    console.log(`🚀 فتح WhatsApp...`);
    window.open(result.whatsappUrl, '_blank');
    return {
      ...result,
      message: 'تم فتح WhatsApp بنجاح!'
    };
  }
  
  return result;
}

/**
 * اختبار WhatsApp Share برقم ثابت
 * Test WhatsApp Share with fixed number
 */
export function testWhatsAppShare(testMessage: string = 'اختبار WhatsApp Share'): WhatsAppShareResult {
  const testPhone = '201017799580';
  console.log(`🧪 اختبار WhatsApp Share برقم ثابت: ${testPhone}`);
  
  const result = openWhatsAppShare(testPhone, testMessage);
  
  if (result.success) {
    console.log(`🧪 رابط WhatsApp للاختبار: ${result.whatsappUrl}`);
    return {
      ...result,
      message: 'تم فتح WhatsApp للاختبار بنجاح!'
    };
  }
  
  return result;
}

/**
 * إنشاء دالة WhatsApp Share للاستخدام في المكونات
 * Create WhatsApp Share function for components
 */
export function createWhatsAppShareHandler(
  phone: string,
  message: string,
  onSuccess?: (result: WhatsAppShareResult) => void,
  onError?: (result: WhatsAppShareResult) => void
) {
  return () => {
    const result = openWhatsAppShare(phone, message);
    
    if (result.success) {
      onSuccess?.(result);
    } else {
      onError?.(result);
    }
    
    return result;
  };
}

/**
 * إنشاء دالة اختبار WhatsApp Share
 * Create test WhatsApp Share function
 */
export function createTestWhatsAppShareHandler(
  testMessage: string = 'اختبار WhatsApp Share',
  onSuccess?: (result: WhatsAppShareResult) => void,
  onError?: (result: WhatsAppShareResult) => void
) {
  return () => {
    const result = testWhatsAppShare(testMessage);
    
    if (result.success) {
      onSuccess?.(result);
    } else {
      onError?.(result);
    }
    
    return result;
  };
}
