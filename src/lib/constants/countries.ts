// قائمة الدول مع أكوادها والعملات وأطوال أرقام الهاتف
// مصدر البيانات: صفحة التسجيل (أصدق مصدر للبيانات)
export interface Country {
  name: string;           // الاسم العربي
  code: string;           // كود الدولة (مثل +966)
  currency: string;       // العملة
  currencySymbol: string; // رمز العملة
  phoneLength: number;    // طول الرقم المحلي
  phonePattern: string;   // نمط الرقم المحلي
}

export const countries: Country[] = [
  { name: 'السعودية', code: '+966', currency: 'SAR', currencySymbol: 'ر.س', phoneLength: 9, phonePattern: '[0-9]{9}' },
  { name: 'الإمارات', code: '+971', currency: 'AED', currencySymbol: 'د.إ', phoneLength: 9, phonePattern: '[0-9]{9}' },
  { name: 'الكويت', code: '+965', currency: 'KWD', currencySymbol: 'د.ك', phoneLength: 8, phonePattern: '[0-9]{8}' },
  { name: 'قطر', code: '+974', currency: 'QAR', currencySymbol: 'ر.ق', phoneLength: 8, phonePattern: '[0-9]{8}' },
  { name: 'البحرين', code: '+973', currency: 'BHD', currencySymbol: 'د.ب', phoneLength: 8, phonePattern: '[0-9]{8}' },
  { name: 'عمان', code: '+968', currency: 'OMR', currencySymbol: 'ر.ع', phoneLength: 8, phonePattern: '[0-9]{8}' },
  { name: 'مصر', code: '+20', currency: 'EGP', currencySymbol: 'ج.م', phoneLength: 10, phonePattern: '[0-9]{10}' },
  { name: 'الأردن', code: '+962', currency: 'JOD', currencySymbol: 'د.أ', phoneLength: 9, phonePattern: '[0-9]{9}' },
  { name: 'لبنان', code: '+961', currency: 'LBP', currencySymbol: 'ل.ل', phoneLength: 8, phonePattern: '[0-9]{8}' },
  { name: 'العراق', code: '+964', currency: 'IQD', currencySymbol: 'د.ع', phoneLength: 10, phonePattern: '[0-9]{10}' },
  { name: 'سوريا', code: '+963', currency: 'SYP', currencySymbol: 'ل.س', phoneLength: 9, phonePattern: '[0-9]{9}' },
  { name: 'المغرب', code: '+212', currency: 'MAD', currencySymbol: 'د.م', phoneLength: 9, phonePattern: '[0-9]{9}' },
  { name: 'الجزائر', code: '+213', currency: 'DZD', currencySymbol: 'د.ج', phoneLength: 9, phonePattern: '[0-9]{9}' },
  { name: 'تونس', code: '+216', currency: 'TND', currencySymbol: 'د.ت', phoneLength: 8, phonePattern: '[0-9]{8}' },
  { name: 'ليبيا', code: '+218', currency: 'LYD', currencySymbol: 'د.ل', phoneLength: 9, phonePattern: '[0-9]{9}' },
  // مضافة حديثاً
  { name: 'السودان', code: '+249', currency: 'SDG', currencySymbol: 'ج.س', phoneLength: 9, phonePattern: '[0-9]{9}' },
  { name: 'السنغال', code: '+221', currency: 'XOF', currencySymbol: 'Fr', phoneLength: 9, phonePattern: '[0-9]{9}' },
  { name: 'ساحل العاج', code: '+225', currency: 'XOF', currencySymbol: 'Fr', phoneLength: 10, phonePattern: '[0-9]{10}' },
  { name: 'جيبوتي', code: '+253', currency: 'DJF', currencySymbol: 'Fr', phoneLength: 8, phonePattern: '[0-9]{8}' },
  { name: 'إسبانيا', code: '+34', currency: 'EUR', currencySymbol: '€', phoneLength: 9, phonePattern: '[0-9]{9}' },
  { name: 'فرنسا', code: '+33', currency: 'EUR', currencySymbol: '€', phoneLength: 9, phonePattern: '[0-9]{9}' },
  { name: 'إنجلترا', code: '+44', currency: 'GBP', currencySymbol: '£', phoneLength: 10, phonePattern: '[0-9]{10}' },
  { name: 'البرتغال', code: '+351', currency: 'EUR', currencySymbol: '€', phoneLength: 9, phonePattern: '[0-9]{9}' },
  { name: 'إيطاليا', code: '+39', currency: 'EUR', currencySymbol: '€', phoneLength: 10, phonePattern: '[0-9]{10}' },
  { name: 'اليونان', code: '+30', currency: 'EUR', currencySymbol: '€', phoneLength: 10, phonePattern: '[0-9]{10}' },
  { name: 'قبرص', code: '+357', currency: 'EUR', currencySymbol: '€', phoneLength: 8, phonePattern: '[0-9]{8}' },
  { name: 'تركيا', code: '+90', currency: 'TRY', currencySymbol: '₺', phoneLength: 10, phonePattern: '[0-9]{10}' },
  { name: 'تايلاند', code: '+66', currency: 'THB', currencySymbol: '฿', phoneLength: 9, phonePattern: '[0-9]{9}' },
  { name: 'اليمن', code: '+967', currency: 'YER', currencySymbol: 'ر.ي', phoneLength: 9, phonePattern: '[0-9]{9}' },
];

// دالة للحصول على دولة من كود الدولة
export const getCountryByCode = (code: string): Country | undefined => {
  return countries.find(country => country.code === code);
};

// دالة للحصول على دولة من الاسم
export const getCountryByName = (name: string): Country | undefined => {
  return countries.find(country => country.name === name);
};

// دالة لتطبيع رقم الهاتف
export const normalizePhone = (countryCode: string, phone: string): string => {
  // إزالة أي صفر في بداية الرقم المحلي
  let local = phone.replace(/^0+/, '');
  // إزالة أي رموز أو فراغات
  local = local.replace(/\D/g, '');
  // دمج كود الدولة مع الرقم المحلي (بدون +)
  return `${countryCode.replace(/\D/g, '')}${local}`;
};

// دالة للتحقق من صحة رقم الهاتف مع البلد
export const validatePhoneWithCountry = (phone: string, countryCode: string): { isValid: boolean; error?: string } => {
  const country = getCountryByCode(countryCode);
  if (!country) {
    return { isValid: false, error: 'البلد غير موجود' };
  }

  // تطبيع الرقم
  const normalizedPhone = normalizePhone(countryCode, phone);

  // التحقق من أن الرقم يبدأ بكود الدولة
  const expectedCountryCode = countryCode.replace(/\D/g, '');
  if (!normalizedPhone.startsWith(expectedCountryCode)) {
    return { isValid: false, error: `الرقم يجب أن يبدأ بكود الدولة ${countryCode}` };
  }

  // استخراج الرقم المحلي
  const localNumber = normalizedPhone.substring(expectedCountryCode.length);

  // التحقق من طول الرقم المحلي
  if (localNumber.length !== country.phoneLength) {
    return { isValid: false, error: `الرقم المحلي يجب أن يكون ${country.phoneLength} أرقام` };
  }

  // التحقق من نمط الرقم
  const pattern = new RegExp(`^${country.phonePattern}$`);
  if (!pattern.test(localNumber)) {
    return { isValid: false, error: `الرقم لا يطابق النمط المطلوب للبلد` };
  }

  return { isValid: true };
};

// دالة لاستخراج الرقم المحلي من الرقم الكامل
export const extractLocalNumber = (fullPhone: string, countryCode: string): string => {
  const country = getCountryByCode(countryCode);
  if (!country) return fullPhone;

  const expectedCountryCode = countryCode.replace(/\D/g, '');
  const cleanPhone = fullPhone.replace(/\D/g, '');

  if (cleanPhone.startsWith(expectedCountryCode)) {
    return cleanPhone.substring(expectedCountryCode.length);
  }

  return cleanPhone;
};

// دالة لتحديد البلد من رقم الهاتف
export const detectCountryFromPhone = (phone: string): Country | undefined => {
  const cleanPhone = phone.replace(/\D/g, '');

  for (const country of countries) {
    const countryCode = country.code.replace(/\D/g, '');
    if (cleanPhone.startsWith(countryCode)) {
      return country;
    }
  }

  return undefined;
};

// تحليل ذكي للرقم لفهم حالته
export interface PhoneAnalysis {
  originalPhone: string;
  countryCode: string;
  localNumber: string;           // الرقم المحلي (بدون كود البلد)
  fullNumber: string;            // الرقم الكامل (كود + محلي)
  isValid: boolean;
  hasCountryCodeInPhone: boolean; // هل الرقم يحتوي على كود البلد في بدايته؟
  issues: string[];              // قائمة المشاكل
  suggestions: string[];         // اقتراحات الإصلاح
  status: 'valid' | 'fixable' | 'invalid';
}

// دالة التحليل الذكي للرقم
export const analyzePhoneNumber = (phone: string, countryCode: string): PhoneAnalysis => {
  const issues: string[] = [];
  const suggestions: string[] = [];

  // تنظيف المدخلات
  const cleanPhone = (phone || '').replace(/\D/g, '');
  const cleanCode = (countryCode || '').replace(/\D/g, '');

  // البحث عن البلد
  const country = getCountryByCode(countryCode);

  if (!cleanPhone) {
    return {
      originalPhone: phone,
      countryCode,
      localNumber: '',
      fullNumber: '',
      isValid: false,
      hasCountryCodeInPhone: false,
      issues: ['رقم الهاتف فارغ'],
      suggestions: ['يجب إدخال رقم هاتف'],
      status: 'invalid'
    };
  }

  if (!country) {
    return {
      originalPhone: phone,
      countryCode,
      localNumber: cleanPhone,
      fullNumber: cleanPhone,
      isValid: false,
      hasCountryCodeInPhone: false,
      issues: ['كود البلد غير معروف أو مفقود'],
      suggestions: ['يجب تحديد كود البلد الصحيح'],
      status: 'invalid'
    };
  }

  // فحص هل الرقم يبدأ بكود البلد
  const hasCountryCodeInPhone = cleanPhone.startsWith(cleanCode);

  // استخراج الرقم المحلي
  let localNumber: string;
  if (hasCountryCodeInPhone) {
    localNumber = cleanPhone.substring(cleanCode.length);
  } else {
    // إزالة الصفر البادئ إن وجد
    localNumber = cleanPhone.replace(/^0+/, '');
  }

  // التحقق من طول الرقم المحلي
  const expectedLength = country.phoneLength;
  const actualLength = localNumber.length;

  if (actualLength !== expectedLength) {
    issues.push(`طول الرقم المحلي ${actualLength} أرقام، المتوقع ${expectedLength} لـ${country.name}`);

    if (actualLength < expectedLength) {
      suggestions.push(`الرقم قصير، يجب أن يكون ${expectedLength} أرقام`);
    } else {
      suggestions.push(`الرقم طويل، يجب أن يكون ${expectedLength} أرقام`);
    }
  }

  // إنشاء الرقم الكامل
  const fullNumber = `${cleanCode}${localNumber}`;

  // تحديد الحالة
  let status: 'valid' | 'fixable' | 'invalid';
  let isValid = false;

  if (issues.length === 0) {
    status = 'valid';
    isValid = true;
  } else if (hasCountryCodeInPhone && actualLength === expectedLength) {
    // الرقم يحتوي على الكود لكن يمكن إصلاحه
    status = 'fixable';
    issues.push('كود البلد مكرر في الرقم');
    suggestions.push('سيتم إزالة كود البلد من بداية الرقم');
  } else if (Math.abs(actualLength - expectedLength) <= 2) {
    // فرق بسيط في الطول - قابل للمراجعة
    status = 'fixable';
  } else {
    status = 'invalid';
  }

  return {
    originalPhone: phone,
    countryCode,
    localNumber,
    fullNumber,
    isValid,
    hasCountryCodeInPhone,
    issues,
    suggestions,
    status
  };
};

// دالة التطبيع الذكي - تعيد الرقم المحلي الصحيح
export const smartNormalizePhone = (phone: string, countryCode: string): {
  localPhone: string;
  fullPhone: string;
  wasFixed: boolean;
  fixDescription?: string;
} => {
  const analysis = analyzePhoneNumber(phone, countryCode);

  const wasFixed = analysis.hasCountryCodeInPhone || analysis.originalPhone !== analysis.localNumber;

  return {
    localPhone: analysis.localNumber,
    fullPhone: analysis.fullNumber,
    wasFixed,
    fixDescription: wasFixed ?
      (analysis.hasCountryCodeInPhone ? 'تم إزالة كود البلد المكرر' : 'تم تطبيع الرقم') :
      undefined
  };
};

// دالة للحصول على تفاصيل التحقق للعرض في الواجهة
export const getPhoneValidationDetails = (phone: string, countryCode: string): {
  status: 'valid' | 'warning' | 'error';
  statusText: string;
  statusColor: string;
  details: string;
  canFix: boolean;
} => {
  const analysis = analyzePhoneNumber(phone, countryCode);

  if (analysis.status === 'valid') {
    return {
      status: 'valid',
      statusText: 'صحيح',
      statusColor: 'text-green-600 bg-green-50',
      details: `رقم ${getCountryByCode(countryCode)?.name || 'غير معروف'} صحيح`,
      canFix: false
    };
  }

  if (analysis.status === 'fixable') {
    return {
      status: 'warning',
      statusText: 'يحتاج إصلاح',
      statusColor: 'text-amber-600 bg-amber-50',
      details: analysis.issues.join('، '),
      canFix: true
    };
  }

  return {
    status: 'error',
    statusText: 'غير صالح',
    statusColor: 'text-red-600 bg-red-50',
    details: analysis.issues.join('، '),
    canFix: false
  };
};

// قائمة الدول العربية
export const arabicCountries = countries.filter(country =>
  ['+966', '+971', '+965', '+974', '+973', '+968', '+20', '+962', '+961', '+964', '+963', '+212', '+213', '+216', '+218', '+249', '+967'].includes(country.code)
);

// قائمة الدول غير العربية
export const nonArabicCountries = countries.filter(country =>
  !['+966', '+971', '+965', '+974', '+973', '+968', '+20', '+962', '+961', '+964', '+963', '+212', '+213', '+216', '+218', '+249', '+967'].includes(country.code)
);



