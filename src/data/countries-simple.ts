// بيانات بسيطة للدول والمدن - بدون تعقيدات
export interface SimpleCity {
  id: string;
  name: string;
  nameEn: string;
  isCapital: boolean;
  isActive: boolean;
}

export interface SimpleCountry {
  id: string;
  name: string;
  nameEn: string;
  code: string;
  flag: string;
  currency: string;
  dialCode: string;
  isActive: boolean;
  cities: SimpleCity[];
}

// بيانات أساسية فقط للدول الرئيسية
export const getBasicCountriesData = (): SimpleCountry[] => [
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
      { id: 'sa_10', name: 'تبوك', nameEn: 'Tabuk', isCapital: false, isActive: true }
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
      { id: 'ae_05', name: 'عجمان', nameEn: 'Ajman', isCapital: false, isActive: true }
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
      { id: 'qa_03', name: 'الخور', nameEn: 'Al Khor', isCapital: false, isActive: true }
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
      { id: 'kw_03', name: 'الجهراء', nameEn: 'Al Jahra', isCapital: false, isActive: true }
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
      { id: 'bh_02', name: 'المحرق', nameEn: 'Muharraq', isCapital: false, isActive: true }
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
      { id: 'om_02', name: 'صلالة', nameEn: 'Salalah', isCapital: false, isActive: true }
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
      { id: 'eg_04', name: 'بورسعيد', nameEn: 'Port Said', isCapital: false, isActive: true },
      { id: 'eg_05', name: 'السويس', nameEn: 'Suez', isCapital: false, isActive: true }
    ]
  },
  {
    id: 'pt',
    name: 'البرتغال',
    nameEn: 'Portugal',
    code: 'PT',
    flag: '🇵🇹',
    currency: 'EUR',
    dialCode: '+351',
    isActive: true,
    cities: [
      { id: 'pt_01', name: 'لشبونة', nameEn: 'Lisbon', isCapital: true, isActive: true },
      { id: 'pt_02', name: 'بورتو', nameEn: 'Porto', isCapital: false, isActive: true },
      { id: 'pt_03', name: 'براغا', nameEn: 'Braga', isCapital: false, isActive: true },
      { id: 'pt_04', name: 'كويمبرا', nameEn: 'Coimbra', isCapital: false, isActive: true },
      { id: 'pt_05', name: 'فارو', nameEn: 'Faro', isCapital: false, isActive: true }
    ]
  }
];

// دوال مساعدة للتوافق مع الكود الموجود
export const getCitiesByCountry = (countryId: string): SimpleCity[] => {
  const country = getBasicCountriesData().find(c => c.id === countryId);
  return country ? country.cities : [];
};

export const getCountryFromCity = (cityId: string): string | null => {
  const countries = getBasicCountriesData();
  for (const country of countries) {
    if (country.cities.some(city => city.id === cityId)) {
      return country.id;
    }
  }
  return null;
};

export const getCountryByName = (countryName: string): SimpleCountry | null => {
  const countries = getBasicCountriesData();
  return countries.find(country => 
    country.name === countryName || 
    country.nameEn === countryName ||
    country.id === countryName
  ) || null;
};

export const searchCities = (query: string): SimpleCity[] => {
  const countries = getBasicCountriesData();
  const allCities: SimpleCity[] = [];

  countries.forEach(country => {
    allCities.push(...country.cities);
  });

  return allCities.filter(city =>
    city.name.toLowerCase().includes(query.toLowerCase()) ||
    city.nameEn.toLowerCase().includes(query.toLowerCase())
  );
};

export const SUPPORTED_COUNTRIES = getBasicCountriesData().map(country => ({
  id: country.id,
  name: country.name,
  nameEn: country.nameEn,
  code: country.code,
  flag: country.flag
}));

export const CITIES_BY_COUNTRY = getBasicCountriesData().reduce((acc, country) => {
  acc[country.id] = country.cities;
  return acc;
}, {} as Record<string, SimpleCity[]>);
