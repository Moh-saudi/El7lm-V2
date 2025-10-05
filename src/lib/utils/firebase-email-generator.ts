/**
 * مولد البريد الإلكتروني المؤقت لـ Firebase
 * ينشئ بريد إلكتروني قصير وفريد للمستخدمين الذين لا يدخلون بريدهم الإلكتروني
 */

export interface EmailGenerationOptions {
  phone: string;
  countryCode: string;
  accountType?: string;
  useShortFormat?: boolean;
}

/**
 * إنشاء بريد إلكتروني مؤقت قصير لـ Firebase
 * @param options - خيارات إنشاء البريد الإلكتروني
 * @returns البريد الإلكتروني المؤقت
 */
export function generateFirebaseEmail(options: EmailGenerationOptions): string {
  const { phone, countryCode, accountType = 'user', useShortFormat = true } = options;
  
  // تنظيف البيانات
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const cleanCountryCode = countryCode.replace(/[^0-9]/g, '');
  
  if (useShortFormat) {
    // النسخة القصيرة: user_20_1017799580@el7lm.com
    return `${accountType}_${cleanCountryCode}_${cleanPhone}@el7lm.com`;
  } else {
    // النسخة الطويلة (للحالات الخاصة): user_20_1017799580_1234567890_abc123@el7lm.com
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${accountType}_${cleanCountryCode}_${cleanPhone}_${timestamp}_${randomSuffix}@el7lm.com`;
  }
}

/**
 * إنشاء بريد إلكتروني مؤقت فائق القصر
 * @param phone - رقم الهاتف
 * @param countryCode - كود الدولة
 * @returns البريد الإلكتروني المؤقت القصير جداً
 */
export function generateShortFirebaseEmail(phone: string, countryCode: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const cleanCountryCode = countryCode.replace(/[^0-9]/g, '');
  
  // النسخة الفائقة القصر: u20_1017799580@el7lm.com
  return `u${cleanCountryCode}_${cleanPhone}@el7lm.com`;
}

/**
 * إنشاء بريد إلكتروني مؤقت مع نوع الحساب
 * @param phone - رقم الهاتف
 * @param countryCode - كود الدولة
 * @param accountType - نوع الحساب (player, club, academy, etc.)
 * @returns البريد الإلكتروني المؤقت مع نوع الحساب
 */
export function generateTypedFirebaseEmail(
  phone: string, 
  countryCode: string, 
  accountType: string
): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const cleanCountryCode = countryCode.replace(/[^0-9]/g, '');
  
  // اختصار نوع الحساب
  const typeMap: Record<string, string> = {
    'player': 'p',
    'club': 'c', 
    'academy': 'a',
    'agent': 'ag',
    'trainer': 't',
    'marketer': 'm',
    'admin': 'ad'
  };
  
  const shortType = typeMap[accountType] || 'u';
  
  // النسخة مع نوع الحساب: p20_1017799580@el7lm.com
  return `${shortType}${cleanCountryCode}_${cleanPhone}@el7lm.com`;
}

/**
 * التحقق من صحة البريد الإلكتروني المؤقت
 * @param email - البريد الإلكتروني للتحقق
 * @returns true إذا كان البريد الإلكتروني صالح
 */
export function isValidFirebaseEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.endsWith('@el7lm.com');
}

/**
 * استخراج رقم الهاتف من البريد الإلكتروني المؤقت
 * @param email - البريد الإلكتروني المؤقت
 * @returns رقم الهاتف المستخرج أو null
 */
export function extractPhoneFromEmail(email: string): string | null {
  if (!isValidFirebaseEmail(email)) return null;
  
  const match = email.match(/^[a-z]+(\d+)_(\d+)@el7lm\.com$/);
  if (match) {
    const countryCode = match[1];
    const phone = match[2];
    return `+${countryCode}${phone}`;
  }
  
  return null;
}

/**
 * إنشاء بريد إلكتروني مؤقت مع التحقق من التكرار
 * @param options - خيارات إنشاء البريد الإلكتروني
 * @param existingEmails - قائمة البريد الإلكتروني الموجودة (اختياري)
 * @returns البريد الإلكتروني المؤقت الفريد
 */
export function generateUniqueFirebaseEmail(
  options: EmailGenerationOptions,
  existingEmails: string[] = []
): string {
  let baseEmail = generateFirebaseEmail(options);
  
  // إذا كان البريد الإلكتروني موجوداً، أضف رقم عشوائي
  if (existingEmails.includes(baseEmail)) {
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const emailParts = baseEmail.split('@');
    baseEmail = `${emailParts[0]}_${randomSuffix}@${emailParts[1]}`;
  }
  
  return baseEmail;
}

// أمثلة على الاستخدام:
/*
// النسخة القصيرة
const shortEmail = generateFirebaseEmail({
  phone: '01017799580',
  countryCode: '+20'
});
// النتيجة: user_20_1017799580@el7lm.com

// النسخة الفائقة القصر
const ultraShortEmail = generateShortFirebaseEmail('01017799580', '+20');
// النتيجة: u20_1017799580@el7lm.com

// النسخة مع نوع الحساب
const typedEmail = generateTypedFirebaseEmail('01017799580', '+20', 'player');
// النتيجة: p20_1017799580@el7lm.com
*/


