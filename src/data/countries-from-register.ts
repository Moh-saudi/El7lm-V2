// استخدام بيانات الدول من صفحة التسجيل الموجودة
export interface Country {
  name: string;
  code: string;
  currency: string;
  currencySymbol: string;
  phoneLength: number;
  phonePattern: string;
}

// بيانات الدول من صفحة التسجيل
export const COUNTRIES_FROM_REGISTER: Country[] = [
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

// دوال مساعدة بسيطة
export const getCountryByName = (countryName: string): Country | null => {
  return COUNTRIES_FROM_REGISTER.find(country => country.name === countryName) || null;
};

export const getCountryByCode = (countryCode: string): Country | null => {
  return COUNTRIES_FROM_REGISTER.find(country => country.code === countryCode) || null;
};

export const getAllCountries = (): Country[] => {
  return COUNTRIES_FROM_REGISTER;
};

// للتوافق مع الكود الموجود
export const SUPPORTED_COUNTRIES = COUNTRIES_FROM_REGISTER.map(country => ({
  id: country.name,
  name: country.name,
  nameEn: country.name,
  code: country.code,
  flag: '🏳️'
}));

// دوال فارغة للتوافق (بدون مدن معقدة)
// خريطة مدن مبسطة لكل دولة (أشهر المدن)
export const CITIES_BY_COUNTRY: Record<string, string[]> = {
  'السعودية': ['الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام', 'الخبر', 'الظهران', 'الهفوف', 'الأحساء', 'الطائف', 'تبوك', 'حائل', 'نجران', 'جازان', 'أبها', 'خميس مشيط', 'ينبع', 'الجبيل', 'القطيف', 'عرعر', 'الباحة', 'سكاكا', 'بيشة'],
  'الإمارات': ['أبوظبي', 'دبي', 'الشارقة', 'العين', 'عجمان', 'رأس الخيمة', 'الفجيرة', 'أم القيوين'],
  'الكويت': ['مدينة الكويت', 'حولي', 'الفروانية', 'الأحمدي', 'الجهراء', 'مبارك الكبير'],
  'قطر': ['الدوحة', 'الوكرة', 'الخور', 'الريان', 'أم صلال', 'الظعاين', 'الشحانية', 'لدخان'],
  'البحرين': ['المنامة', 'المحرق', 'الرفاع', 'مدينة عيسى', 'مدينة حمد', 'سترة'],
  'عمان': ['مسقط', 'صلالة', 'صحار', 'نزوى', 'صور', 'عبري', 'البريمي', 'بدية', 'خصب', 'الرستاق', 'إبراء'],
  'مصر': ['القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'البحر الأحمر', 'البحيرة', 'الفيوم', 'الغربية', 'الإسماعيلية', 'المنوفية', 'المنيا', 'القليوبية', 'الوادي الجديد', 'السويس', 'أسوان', 'أسيوط', 'بني سويف', 'بورسعيد', 'دمياط', 'الشرقية', 'جنوب سيناء', 'كفر الشيخ', 'مطروح', 'الأقصر', 'قنا', 'شمال سيناء', 'سوهاج'],
  'الأردن': ['عمّان', 'إربد', 'الزرقاء', 'العقبة', 'السلط', 'المفرق', 'جرش', 'الكرك'],
  'لبنان': ['بيروت', 'طرابلس', 'صيدا', 'صور', 'بعلبك', 'زحلة', 'جونية'],
  'العراق': ['بغداد', 'البصرة', 'الموصل', 'أربيل', 'السليمانية', 'النجف', 'كربلاء', 'كركوك'],
  'سوريا': ['دمشق', 'حلب', 'حمص', 'حماة', 'اللاذقية', 'طرطوس', 'دير الزور', 'الرقة', 'السويداء'],
  'المغرب': ['الرباط', 'الدار البيضاء', 'فاس', 'مراكش', 'طنجة', 'مكناس', 'وجدة', 'أكادير', 'تطوان', 'آسفي'],
  'الجزائر': ['الجزائر', 'وهران', 'قسنطينة', 'عنابة', 'تلمسان', 'بجاية', 'باتنة'],
  'تونس': ['تونس', 'صفاقس', 'سوسة', 'بنزرت', 'القيروان', 'نابل'],
  'ليبيا': ['طرابلس', 'بنغازي', 'مصراتة', 'سبها', 'سرت', 'البيضاء'],
  'السودان': ['الخرطوم', 'أم درمان', 'بحري', 'مدني', 'بورتسودان', 'كسلا', 'القضارف', 'عطبرة'],
  'إسبانيا': ['مدريد', 'برشلونة', 'فالنسيا', 'إشبيلية', 'بلباو', 'ملقا'],
  'فرنسا': ['باريس', 'مارسيليا', 'ليون', 'ليل', 'نيس', 'تولوز'],
  'إنجلترا': ['لندن', 'مانشستر', 'ليفربول', 'برمنغهام', 'ليدز', 'نيوكاسل'],
  'البرتغال': ['لشبونة', 'بورتو', 'براغا', 'فارو', 'كويمبرا', 'أفيرو'],
  'إيطاليا': ['روما', 'ميلانو', 'نابولي', 'تورينو', 'فلورنسا', 'جنوة'],
  'اليونان': ['أثينا', 'سالونيك', 'باتراس', 'لاريسا'],
  'قبرص': ['نيقوسيا', 'ليماسول', 'لارنكا', 'بافوس'],
  'تركيا': ['إسطنبول', 'أنقرة', 'إزمير', 'بورصة', 'أنطاليا', 'قونية'],
  'تايلاند': ['بانكوك', 'فوكيت', 'تشيانغ ماي', 'باتايا'],
  'اليمن': ['صنعاء', 'عدن', 'تعز', 'الحديدة', 'المكلا', 'إب']
};

export const getCitiesByCountry = (countryName: string): string[] => {
  const list = CITIES_BY_COUNTRY[countryName] || [];
  return Array.from(new Set([...list, 'أخرى']));
};

export const getCountryFromCity = (cityName: string): string | null => {
  for (const [country, cities] of Object.entries(CITIES_BY_COUNTRY)) {
    if (cities.includes(cityName)) return country;
  }
  return null;
};

export const searchCities = (query: string, countryName?: string): string[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  if (countryName) {
    return getCitiesByCountry(countryName).filter(c => c.toLowerCase().includes(q));
  }
  // البحث في جميع الدول في حال لم يتم تحديد دولة
  const all: string[] = [];
  Object.values(CITIES_BY_COUNTRY).forEach(cities => all.push(...cities, 'أخرى'));
  return all.filter(c => c.toLowerCase().includes(q));
};
