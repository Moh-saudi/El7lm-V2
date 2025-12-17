
export const COUNTRIES = [
    { name: 'السعودية', code: 'SA', phone: '+966', currency: 'SAR', flag: '🇸🇦' },
    { name: 'الإمارات', code: 'AE', phone: '+971', currency: 'AED', flag: '🇦🇪' },
    { name: 'الكويت', code: 'KW', phone: '+965', currency: 'KWD', flag: '🇰🇼' },
    { name: 'قطر', code: 'QA', phone: '+974', currency: 'QAR', flag: '🇶🇦' },
    { name: 'البحرين', code: 'BH', phone: '+973', currency: 'BHD', flag: '🇧🇭' },
    { name: 'عمان', code: 'OM', phone: '+968', currency: 'OMR', flag: '🇴🇲' },
    { name: 'مصر', code: 'EG', phone: '+20', currency: 'EGP', flag: '🇪🇬' },
    { name: 'الأردن', code: 'JO', phone: '+962', currency: 'JOD', flag: '🇯🇴' },
    { name: 'لبنان', code: 'LB', phone: '+961', currency: 'LBP', flag: '🇱🇧' },
    { name: 'العراق', code: 'IQ', phone: '+964', currency: 'IQD', flag: '🇮🇶' },
    { name: 'سوريا', code: 'SY', phone: '+963', currency: 'SYP', flag: '🇸🇾' },
    { name: 'المغرب', code: 'MA', phone: '+212', currency: 'MAD', flag: '🇲🇦' },
    { name: 'الجزائر', code: 'DZ', phone: '+213', currency: 'DZD', flag: '🇩🇿' },
    { name: 'تونس', code: 'TN', phone: '+216', currency: 'TND', flag: '🇹🇳' },
    { name: 'ليبيا', code: 'LY', phone: '+218', currency: 'LYD', flag: '🇱🇾' },
    { name: 'السودان', code: 'SD', phone: '+249', currency: 'SDG', flag: '🇸🇩' },
    { name: 'اليمن', code: 'YE', phone: '+967', currency: 'YER', flag: '🇾🇪' },
    { name: 'الولايات المتحدة', code: 'US', phone: '+1', currency: 'USD', flag: '🇺🇸' },
    { name: 'المملكة المتحدة', code: 'GB', phone: '+44', currency: 'GBP', flag: '🇬🇧' },
    { name: 'فرنسا', code: 'FR', phone: '+33', currency: 'EUR', flag: '🇫🇷' },
    { name: 'ألمانيا', code: 'DE', phone: '+49', currency: 'EUR', flag: '🇩🇪' },
    { name: 'إسبانيا', code: 'ES', phone: '+34', currency: 'EUR', flag: '🇪🇸' },
    { name: 'إيطاليا', code: 'IT', phone: '+39', currency: 'EUR', flag: '🇮🇹' },
    { name: 'تركيا', code: 'TR', phone: '+90', currency: 'TRY', flag: '🇹🇷' }
];

export const getCountryByCode = (code: string) => COUNTRIES.find(c => c.code === code);
