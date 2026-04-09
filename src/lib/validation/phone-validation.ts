/**
 * 🛡️ Centralized Phone Number Validation
 * 
 * This module provides phone number format validation that MUST be used
 * across ALL auth pages (login, register, forgot-password, etc.)
 * to prevent country code / phone number mismatch attacks.
 * 
 * The validation ensures that the phone number format matches the
 * expected pattern for the selected country code, preventing scenarios
 * like a French (+33) country code being used with an Egyptian number.
 */

export interface PhoneValidationRule {
  minLen: number;
  maxLen: number;
  pattern?: RegExp;
  label: string;
}

/**
 * Phone number length and format validation rules per country code.
 * 
 * minLen/maxLen = expected number of digits AFTER removing the leading zero
 * pattern = optional regex for stricter format checking (e.g., Saudi numbers must start with 5)
 */
export const phoneValidationRules: Record<string, PhoneValidationRule> = {
  '+966': { minLen: 9, maxLen: 9, pattern: /^5\d{8}$/, label: 'السعودية' },
  '+971': { minLen: 9, maxLen: 9, label: 'الإمارات' },
  '+965': { minLen: 8, maxLen: 8, label: 'الكويت' },
  '+974': { minLen: 8, maxLen: 8, label: 'قطر' },
  '+973': { minLen: 8, maxLen: 8, label: 'البحرين' },
  '+968': { minLen: 8, maxLen: 8, label: 'عمان' },
  '+20':  { minLen: 10, maxLen: 10, pattern: /^1[0125]\d{8}$/, label: 'مصر' },
  '+962': { minLen: 9, maxLen: 9, label: 'الأردن' },
  '+961': { minLen: 7, maxLen: 8, label: 'لبنان' },
  '+964': { minLen: 10, maxLen: 10, label: 'العراق' },
  '+963': { minLen: 9, maxLen: 9, label: 'سوريا' },
  '+212': { minLen: 9, maxLen: 9, label: 'المغرب' },
  '+213': { minLen: 9, maxLen: 9, label: 'الجزائر' },
  '+216': { minLen: 8, maxLen: 8, label: 'تونس' },
  '+218': { minLen: 9, maxLen: 10, label: 'ليبيا' },
  '+249': { minLen: 9, maxLen: 9, label: 'السودان' },
  '+221': { minLen: 9, maxLen: 9, label: 'السنغال' },
  '+225': { minLen: 10, maxLen: 10, label: 'ساحل العاج' },
  '+253': { minLen: 8, maxLen: 8, label: 'جيبوتي' },
  '+34':  { minLen: 9, maxLen: 9, label: 'إسبانيا' },
  '+33':  { minLen: 9, maxLen: 9, label: 'فرنسا' },
  '+44':  { minLen: 10, maxLen: 10, label: 'إنجلترا' },
  '+351': { minLen: 9, maxLen: 9, label: 'البرتغال' },
  '+39':  { minLen: 9, maxLen: 10, label: 'إيطاليا' },
  '+30':  { minLen: 10, maxLen: 10, label: 'اليونان' },
  '+357': { minLen: 8, maxLen: 8, label: 'قبرص' },
  '+90':  { minLen: 10, maxLen: 10, label: 'تركيا' },
  '+66':  { minLen: 9, maxLen: 9, label: 'تايلاند' },
  '+967': { minLen: 9, maxLen: 9, label: 'اليمن' },
};

/**
 * Validate that the phone number matches the expected format for the selected country code.
 * 
 * @param rawPhone - The phone number as entered by the user (before adding country code)
 * @param countryCode - The selected country code (e.g., '+20', '+966')
 * @returns An error message string if invalid, or null if valid
 * 
 * @example
 * validatePhoneForCountry('1014477580', '+20');  // null (valid Egyptian number)
 * validatePhoneForCountry('1014477580', '+33');  // "رقم الهاتف طويل جداً لـفرنسا..."
 * validatePhoneForCountry('512345678', '+966');   // null (valid Saudi number)
 * validatePhoneForCountry('612345678', '+966');   // "صيغة رقم الهاتف غير صحيحة لـالسعودية" (must start with 5)
 */
export function validatePhoneForCountry(rawPhone: string, countryCode: string): string | null {
  const rule = phoneValidationRules[countryCode];
  if (!rule) return null; // Unknown country code — skip validation

  // Remove leading zeros (local format) since the country code is handled separately
  const normalized = rawPhone.replace(/^0+/, '').replace(/\s+/g, '').replace(/\D/g, '');

  if (!normalized) return null; // Empty — handled by required field validation elsewhere

  if (normalized.length < rule.minLen) {
    return `رقم الهاتف قصير جداً لـ${rule.label}. يجب أن يكون ${rule.minLen} أرقام على الأقل`;
  }
  if (normalized.length > rule.maxLen) {
    return `رقم الهاتف طويل جداً لـ${rule.label}. يجب أن يكون ${rule.maxLen} أرقام كحد أقصى`;
  }
  if (rule.pattern && !rule.pattern.test(normalized)) {
    return `صيغة رقم الهاتف غير صحيحة لـ${rule.label}`;
  }
  return null;
}

/**
 * Clean a phone number by removing leading zeros, spaces, and non-digit characters.
 * This should be used consistently before validation and before sending to APIs.
 */
export function cleanPhoneNumber(phone: string): string {
  return phone.trim().replace(/^0+/, '').replace(/\s+/g, '').replace(/\D/g, '');
}

/**
 * Build the full international phone number from country code + local number.
 */
export function buildFullPhone(countryCode: string, localPhone: string): string {
  return `${countryCode.trim()}${cleanPhoneNumber(localPhone)}`;
}

/**
 * Generate multiple possible variants of a phone number for broad database searching.
 * This helps match users regardless of how their phone was originally stored 
 * (with/without country code, with/without localized leading zero).
 */
export function generatePhoneVariants(phone: string): string[] {
  if (!phone) return [];
  
  const cleaned = cleanPhoneNumber(phone);
  const variants = new Set<string>([phone.trim(), cleaned, `+${cleaned}`]);
  
  // Handle Egypt (20)
  if (cleaned.startsWith('20')) {
    const local = cleaned.substring(2);
    variants.add(local);
    variants.add(`0${local}`);
  } else if (phone.startsWith('01') && cleaned.length === 11) {
    // Possibly Egyptian local
    variants.add(`20${cleaned.substring(1)}`);
    variants.add(cleaned.substring(1));
  }
  
  // Handle Saudi Arabia (966)
  if (cleaned.startsWith('966')) {
    const local = cleaned.substring(3);
    variants.add(local);
    variants.add(`0${local}`);
  } else if (phone.startsWith('05') && cleaned.length === 10) {
    // Possibly Saudi local
    variants.add(`966${cleaned.substring(1)}`);
    variants.add(cleaned.substring(1));
  }

  // Common cleanup variants
  if (cleaned.length > 7) {
    variants.add(cleaned);
    if (!cleaned.startsWith('+')) variants.add(`+${cleaned}`);
  }

  return Array.from(variants).filter(v => v.length >= 8);
}
