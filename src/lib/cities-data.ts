// قاموس شامل للمدن حسب الدولة - محدث 2024
export const CITIES_BY_COUNTRY: Record<string, string[]> = {
  // المملكة العربية السعودية
  'السعودية': [
    "الرياض", "جدة", "مكة المكرمة", "المدينة المنورة", "الدمام", "الخبر", "الظهران",
    "تبوك", "بريدة", "خميس مشيط", "الهفوف", "حفر الباطن", "الطائف", "نجران", 
    "جازان", "ينبع", "القطيف", "عرعر", "سكاكا", "أبها", "القصيم", "حائل",
    "الجبيل", "رابغ", "الباحة", "عنيزة", "الرس", "الزلفي", "وادي الدواسر",
    "الافلاج", "القريات", "طريف", "رفحاء", "الخرج", "المجمعة", "شقراء"
  ],
  
  // جمهورية مصر العربية  
  'مصر': [
    "القاهرة", "الجيزة", "الإسكندرية", "بورسعيد", "السويس", "الإسماعيلية",
    "الأقصر", "أسوان", "أسيوط", "سوهاج", "قنا", "الفيوم", "بني سويف",
    "المنيا", "دمياط", "كفر الشيخ", "الغربية", "المنوفية", "القليوبية",
    "الشرقية", "الدقهلية", "البحيرة", "مطروح", "شمال سيناء", "جنوب سيناء",
    "الوادي الجديد", "البحر الأحمر", "طنطا", "المحلة الكبرى", "شبين الكوم",
    "بنها", "الزقازيق", "المنصورة", "كفر الشيخ", "دمنهور"
  ],

  // دولة الإمارات العربية المتحدة
  'الإمارات': [
    "أبو ظبي", "دبي", "الشارقة", "عجمان", "أم القيوين", "رأس الخيمة", "الفجيرة",
    "العين", "الذيد", "خورفكان", "دبا الفجيرة", "كلباء", "مدينة زايد",
    "ليوا", "غياثي", "مزيرع", "دلما", "صير بني ياس", "جبل علي"
  ],

  // دولة قطر
  'قطر': [
    "الدوحة", "الريان", "الوكرة", "أم صلال", "الخور", "الضعاين", "الشيحانية",
    "الغويرية", "الشمال", "مسيعيد", "دخان", "الكعبان", "الزبارة", "فويرط",
    "أبو ظلوف", "رأس لفان", "الرويس"
  ],

  // دولة الكويت
  'الكويت': [
    "مدينة الكويت", "الأحمدي", "حولي", "الفروانية", "الجهراء", "مبارك الكبير",
    "الفحيحيل", "الفنطاس", "أبو حليفة", "المهبولة", "صباح السالم", "بيان",
    "السالمية", "الجابرية", "الشعب", "الدعية", "الصليبيخات", "الرقة",
    "كيفان", "الشامية", "الصوابر", "أم الهيمان", "العدان", "المسيلة"
  ],

  // مملكة البحرين
  'البحرين': [
    "المنامة", "المحرق", "الرفاع", "مدينة حمد", "مدينة عيسى", "سترة", "المالكية",
    "الحد", "البديع", "عالي", "سار", "توبلي", "جد حفص", "الدراز", "باربار",
    "عراد", "الحورة", "كرباباد", "سنابس", "الماحوز", "كرزكان", "عسكر"
  ],

  // سلطنة عمان
  'عمان': [
    "مسقط", "صلالة", "نزوى", "صحار", "صور", "البريمي", "عبري", "الرستاق",
    "إبراء", "بهلاء", "إزكي", "بدبد", "المضيبي", "الحمراء", "منح", "ادم",
    "الكامل والوافي", "جعلان بني بو علي", "جعلان بني بو حسن", "مصيرة",
    "الدقم", "هيماء", "ثمريت", "مرباط", "طاقة", "ضلكوت"
  ],

  // المملكة الأردنية الهاشمية
  'الأردن': [
    "عمان", "إربد", "الزرقاء", "الرصيفة", "القويسمة", "الطفيلة", "الكرك",
    "معان", "عجلون", "جرش", "المفرق", "مادبا", "العقبة", "الرمثا", "السلط",
    "صافوت", "الزرقاء", "أبو علندا", "البقعة", "الموقر", "ناعور", "سحاب",
    "الجيزة", "دير علا", "الأغوار الشمالية", "الكورة", "بني كنانة"
  ],

  // الجمهورية اللبنانية
  'لبنان': [
    "بيروت", "طرابلس", "صيدا", "صور", "النبطية", "بعلبك", "جونيه", "زحلة",
    "البترون", "جبيل", "بشري", "الهرمل", "عاليه", "المتن", "كسروان",
    "الشوف", "عكار", "المنية الضنية", "زغرتا", "الكورة", "البقاع الغربي",
    "راشيا", "حاصبيا", "مرجعيون", "بنت جبيل"
  ],

  // المملكة المغربية
  'المغرب': [
    "الرباط", "الدار البيضاء", "فاس", "مراكش", "أغادير", "مكناس", "وجدة",
    "القنيطرة", "تطوان", "سلا", "المحمدية", "تمارة", "طنجة", "الصويرة",
    "الجديدة", "بني ملال", "الناظور", "بركان", "تازة", "سطات", "خريبكة",
    "الحسيمة", "ورزازات", "إفران", "الراشيدية", "زاكورة", "العيون"
  ],

  // الجمهورية التونسية
  'تونس': [
    "تونس", "صفاقس", "سوسة", "القيروان", "بنزرت", "قابس", "أريانة", "قفصة",
    "المنستير", "نابل", "تطاوين", "مدنين", "المهدية", "قبلي", "سيدي بوزيد",
    "جندوبة", "الكاف", "توزر", "زغوان", "منوبة", "باجة", "سليانة", "القصرين"
  ],

  // الجمهورية الجزائرية الديمقراطية الشعبية
  'الجزائر': [
    "الجزائر", "وهران", "قسنطينة", "عنابة", "باتنة", "سطيف", "سيدي بلعباس",
    "بسكرة", "تبسة", "ورقلة", "بجاية", "تلمسان", "الشلف", "جيجل", "مستغانم",
    "المدية", "معسكر", "غرداية", "الطارف", "الوادي", "خنشلة", "سوق أهراس",
    "ميلة", "الأغواط", "غليزان", "النعامة", "البيض", "إليزي", "تندوف"
  ],

  // دولة ليبيا
  'ليبيا': [
    "طرابلس", "بنغازي", "مصراتة", "الزاوية", "البيضاء", "سبها", "توكرة",
    "زليتن", "أجدابيا", "درنة", "غريان", "صبراتة", "الكفرة", "مرزق",
    "زوارة", "يفرن", "الأصابعة", "الخمس", "ترهونة", "بني وليد", "سرت",
    "الجبل الأخضر", "الجفارة", "الجبل الغربي", "وادي الحياة"
  ],

  // جمهورية العراق
  'العراق': [
    "بغداد", "البصرة", "أربيل", "الموصل", "السليمانية", "النجف", "كربلاء",
    "الناصرية", "العمارة", "الكوت", "الرمادي", "الفلوجة", "كركوك", "دهوك",
    "الحلة", "سامراء", "بعقوبة", "تكريت", "الديوانية", "المثنى", "ميسان",
    "صلاح الدين", "الأنبار", "نينوى", "زاخو", "عقرة", "الحمدانية"
  ],

  // الجمهورية العربية السورية
  'سوريا': [
    "دمشق", "حلب", "حمص", "حماة", "اللاذقية", "دير الزور", "الرقة", "درعا",
    "السويداء", "القنيطرة", "طرطوس", "إدلب", "الحسكة", "القامشلي", "عفرين",
    "منبج", "جبلة", "بانياس", "صافيتا", "مصياف", "سلمية", "تدمر", "البوكمال"
  ],

  // الجمهورية اليمنية
  'اليمن': [
    "صنعاء", "عدن", "تعز", "الحديدة", "إب", "ذمار", "المكلا", "صعدة", "مأرب",
    "عمران", "الضالع", "لحج", "أبين", "شبوة", "الجوف", "حجة", "المحويت",
    "البيضاء", "ريمة", "الضالع", "سقطرى", "حضرموت", "المهرة"
  ],

  // جمهورية السودان
  'السودان': [
    "الخرطوم", "أم درمان", "بحري", "مدني", "القضارف", "كسلا", "الأبيض",
    "نيالا", "الفاشر", "زالنجي", "الجنينة", "بورتسودان", "عطبرة", "الدمازين",
    "كوستي", "الرنك", "ملكال", "واو", "جوبا", "رومبيك", "ياي", "توريت"
  ],

  // دولة فلسطين
  'فلسطين': [
    "القدس", "غزة", "الخليل", "نابلس", "رام الله", "بيت لحم", "أريحا", "طولكرم",
    "قلقيلية", "سلفيت", "جنين", "طوباس", "رفح", "خان يونس", "دير البلح",
    "الشمال", "الوسطى", "يافا", "حيفا", "عكا", "الناصرة", "صفد", "طبريا"
  ],

  // مملكة تايلاند
  'تايلاند': [
    "بانكوك", "تشيانغ ماي", "باتايا", "فوكيت", "كوه ساموي", "كوه بانيانج",
    "كوه تاو", "كوه لانتا", "كوه ساميت", "كوه تشانج", "كوه كود", "كوه ماك",
    "كوه ياو", "كوه نانغ يوان", "كوه سيميلان", "كوه سورين", "كوه كرادان",
    "كوه نانغ يوان", "كوه سيميلان", "كوه سورين", "كوه كرادان", "كوه نانغ يوان",
    "نونثابوري", "ساموت براكان", "ناخون راتشاسيما", "تشونبوري", "ساموت ساخون",
    "ناخون ساوان", "رايونج", "كانتشانابوري", "سورات ثاني", "فيتشابون",
    "أودون ثاني", "سيساكيت", "ناخون فانوم", "نونغ خاي", "ساكون ناخون",
    "ناخون راتشاسيما", "تشونبوري", "ساموت ساخون", "ناخون ساوان", "رايونج"
  ]
};

export const COUNTRIES_DATA = [
  {
    id: 'sa',
    name: 'المملكة العربية السعودية',
    nameEn: 'Saudi Arabia',
    code: 'SA',
    flag: '🇸🇦',
    currency: 'SAR',
    dialCode: '+966',
    isActive: true,
    cities: [
      { id: 'sa_01', name: 'الرياض', nameEn: 'Riyadh', isCapital: true, isActive: true },
      { id: 'sa_02', name: 'جدة', nameEn: 'Jeddah', isCapital: false, isActive: true },
      { id: 'sa_03', name: 'مكة المكرمة', nameEn: 'Makkah', isCapital: false, isActive: true },
      { id: 'sa_04', name: 'المدينة المنورة', nameEn: 'Madinah', isCapital: false, isActive: true },
      { id: 'sa_05', name: 'الدمام', nameEn: 'Dammam', isCapital: false, isActive: true },
      { id: 'sa_06', name: 'الخبر', nameEn: 'Khobar', isCapital: false, isActive: true },
      { id: 'sa_07', name: 'الظهران', nameEn: 'Dhahran', isCapital: false, isActive: true },
      { id: 'sa_08', name: 'الأحساء', nameEn: 'Al-Ahsa', isCapital: false, isActive: true },
      { id: 'sa_09', name: 'الطائف', nameEn: 'Taif', isCapital: false, isActive: true },
      { id: 'sa_10', name: 'تبوك', nameEn: 'Tabuk', isCapital: false, isActive: true },
      { id: 'sa_11', name: 'بريدة', nameEn: 'Buraidah', isCapital: false, isActive: true },
      { id: 'sa_12', name: 'خميس مشيط', nameEn: 'Khamis Mushait', isCapital: false, isActive: true }
    ]
  },
  {
    id: 'ae',
    name: 'الإمارات العربية المتحدة',
    nameEn: 'United Arab Emirates',
    code: 'AE',
    flag: '🇦🇪',
    currency: 'AED',
    dialCode: '+971',
    isActive: true,
    cities: [
      { id: 'ae_01', name: 'أبوظبي', nameEn: 'Abu Dhabi', isCapital: true, isActive: true },
      { id: 'ae_02', name: 'دبي', nameEn: 'Dubai', isCapital: false, isActive: true },
      { id: 'ae_03', name: 'الشارقة', nameEn: 'Sharjah', isCapital: false, isActive: true },
      { id: 'ae_04', name: 'العين', nameEn: 'Al Ain', isCapital: false, isActive: true },
      { id: 'ae_05', name: 'عجمان', nameEn: 'Ajman', isCapital: false, isActive: true },
      { id: 'ae_06', name: 'رأس الخيمة', nameEn: 'Ras Al Khaimah', isCapital: false, isActive: true },
      { id: 'ae_07', name: 'الفجيرة', nameEn: 'Fujairah', isCapital: false, isActive: true },
      { id: 'ae_08', name: 'أم القيوين', nameEn: 'Umm Al Quwain', isCapital: false, isActive: true }
    ]
  },
  {
    id: 'qa',
    name: 'قطر',
    nameEn: 'Qatar',
    code: 'QA',
    flag: '🇶🇦',
    currency: 'QAR',
    dialCode: '+974',
    isActive: true,
    cities: [
      { id: 'qa_01', name: 'الدوحة', nameEn: 'Doha', isCapital: true, isActive: true },
      { id: 'qa_02', name: 'الوكرة', nameEn: 'Al Wakrah', isCapital: false, isActive: true },
      { id: 'qa_03', name: 'الخور', nameEn: 'Al Khor', isCapital: false, isActive: true },
      { id: 'qa_04', name: 'الريان', nameEn: 'Al Rayyan', isCapital: false, isActive: true },
      { id: 'qa_05', name: 'أم صلال', nameEn: 'Umm Salal', isCapital: false, isActive: true }
    ]
  },
  {
    id: 'kw',
    name: 'الكويت',
    nameEn: 'Kuwait',
    code: 'KW',
    flag: '🇰🇼',
    currency: 'KWD',
    dialCode: '+965',
    isActive: true,
    cities: [
      { id: 'kw_01', name: 'مدينة الكويت', nameEn: 'Kuwait City', isCapital: true, isActive: true },
      { id: 'kw_02', name: 'حولي', nameEn: 'Hawalli', isCapital: false, isActive: true },
      { id: 'kw_03', name: 'الجهراء', nameEn: 'Al Jahra', isCapital: false, isActive: true },
      { id: 'kw_04', name: 'الفروانية', nameEn: 'Al Farwaniyah', isCapital: false, isActive: true },
      { id: 'kw_05', name: 'مبارك الكبير', nameEn: 'Mubarak Al-Kabeer', isCapital: false, isActive: true },
      { id: 'kw_06', name: 'الأحمدي', nameEn: 'Al Ahmadi', isCapital: false, isActive: true }
    ]
  },
  {
    id: 'bh',
    name: 'البحرين',
    nameEn: 'Bahrain',
    code: 'BH',
    flag: '🇧🇭',
    currency: 'BHD',
    dialCode: '+973',
    isActive: true,
    cities: [
      { id: 'bh_01', name: 'المنامة', nameEn: 'Manama', isCapital: true, isActive: true },
      { id: 'bh_02', name: 'المحرق', nameEn: 'Muharraq', isCapital: false, isActive: true },
      { id: 'bh_03', name: 'الرفاع', nameEn: 'Riffa', isCapital: false, isActive: true },
      { id: 'bh_04', name: 'مدينة عيسى', nameEn: 'Isa Town', isCapital: false, isActive: true },
      { id: 'bh_05', name: 'مدينة حمد', nameEn: 'Hamad Town', isCapital: false, isActive: true }
    ]
  },
  {
    id: 'om',
    name: 'عمان',
    nameEn: 'Oman',
    code: 'OM',
    flag: '🇴🇲',
    currency: 'OMR',
    dialCode: '+968',
    isActive: true,
    cities: [
      { id: 'om_01', name: 'مسقط', nameEn: 'Muscat', isCapital: true, isActive: true },
      { id: 'om_02', name: 'صلالة', nameEn: 'Salalah', isCapital: false, isActive: true },
      { id: 'om_03', name: 'صحار', nameEn: 'Sohar', isCapital: false, isActive: true },
      { id: 'om_04', name: 'نزوى', nameEn: 'Nizwa', isCapital: false, isActive: true },
      { id: 'om_05', name: 'صور', nameEn: 'Sur', isCapital: false, isActive: true }
    ]
  },
  {
    id: 'eg',
    name: 'مصر',
    nameEn: 'Egypt',
    code: 'EG',
    flag: '🇪🇬',
    currency: 'EGP',
    dialCode: '+20',
    isActive: true,
    cities: [
      { id: 'eg_01', name: 'القاهرة', nameEn: 'Cairo', isCapital: true, isActive: true },
      { id: 'eg_02', name: 'الجيزة', nameEn: 'Giza', isCapital: false, isActive: true },
      { id: 'eg_03', name: 'الإسكندرية', nameEn: 'Alexandria', isCapital: false, isActive: true },
      { id: 'eg_04', name: 'الدقهلية', nameEn: 'Dakahlia', isCapital: false, isActive: true },
      { id: 'eg_05', name: 'البحر الأحمر', nameEn: 'Red Sea', isCapital: false, isActive: true },
      { id: 'eg_06', name: 'البحيرة', nameEn: 'Beheira', isCapital: false, isActive: true },
      { id: 'eg_07', name: 'الفيوم', nameEn: 'Fayoum', isCapital: false, isActive: true },
      { id: 'eg_08', name: 'الغربية', nameEn: 'Gharbia', isCapital: false, isActive: true },
      { id: 'eg_09', name: 'الإسماعيلية', nameEn: 'Ismailia', isCapital: false, isActive: true },
      { id: 'eg_10', name: 'المنوفية', nameEn: 'Menofia', isCapital: false, isActive: true },
      { id: 'eg_11', name: 'المنيا', nameEn: 'Minya', isCapital: false, isActive: true },
      { id: 'eg_12', name: 'القليوبية', nameEn: 'Qalyubia', isCapital: false, isActive: true },
      { id: 'eg_13', name: 'الوادي الجديد', nameEn: 'New Valley', isCapital: false, isActive: true },
      { id: 'eg_14', name: 'السويس', nameEn: 'Suez', isCapital: false, isActive: true },
      { id: 'eg_15', name: 'اسوان', nameEn: 'Aswan', isCapital: false, isActive: true },
      { id: 'eg_16', name: 'اسيوط', nameEn: 'Assiut', isCapital: false, isActive: true },
      { id: 'eg_17', name: 'بني سويف', nameEn: 'Beni Suef', isCapital: false, isActive: true },
      { id: 'eg_18', name: 'بورسعيد', nameEn: 'Port Said', isCapital: false, isActive: true },
      { id: 'eg_19', name: 'دمياط', nameEn: 'Damietta', isCapital: false, isActive: true },
      { id: 'eg_20', name: 'الشرقية', nameEn: 'Sharqia', isCapital: false, isActive: true },
      { id: 'eg_21', name: 'جنوب سيناء', nameEn: 'South Sinai', isCapital: false, isActive: true },
      { id: 'eg_22', name: 'كفر الشيخ', nameEn: 'Kafr El Sheikh', isCapital: false, isActive: true },
      { id: 'eg_23', name: 'مطروح', nameEn: 'Matrouh', isCapital: false, isActive: true },
      { id: 'eg_24', name: 'الأقصر', nameEn: 'Luxor', isCapital: false, isActive: true },
      { id: 'eg_25', name: 'قنا', nameEn: 'Qena', isCapital: false, isActive: true },
      { id: 'eg_26', name: 'شمال سيناء', nameEn: 'North Sinai', isCapital: false, isActive: true },
      { id: 'eg_27', name: 'سوهاج', nameEn: 'Sohag', isCapital: false, isActive: true }
    ]
  }
];

// دالة للحصول على الدولة من المدينة
export function getCountryFromCity(city: string): string | null {
  if (!city) return null;
  
  for (const [country, cities] of Object.entries(CITIES_BY_COUNTRY)) {
    if (cities.includes(city.trim())) {
      return country;
    }
  }
  return null;
}

// دالة للحصول على المدن حسب الدولة
export function getCitiesByCountry(country: string): string[] {
  return CITIES_BY_COUNTRY[country] || [];
}

// قائمة كل الدول المدعومة
export const SUPPORTED_COUNTRIES = Object.keys(CITIES_BY_COUNTRY).sort();

// دالة البحث في المدن
export function searchCities(query: string, country?: string): string[] {
  const normalizedQuery = query.toLowerCase().trim();
  
  if (country && CITIES_BY_COUNTRY[country]) {
    return CITIES_BY_COUNTRY[country].filter(city => 
      city.toLowerCase().includes(normalizedQuery)
    );
  }
  
  // البحث في كل المدن
  const allCities: string[] = [];
  Object.values(CITIES_BY_COUNTRY).forEach(cities => {
    allCities.push(...cities);
  });
  
  return allCities.filter(city => 
    city.toLowerCase().includes(normalizedQuery)
  ).slice(0, 10); // أقصى 10 نتائج
} 
