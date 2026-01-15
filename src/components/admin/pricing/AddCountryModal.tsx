import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Globe, MapPin, Search, Check } from 'lucide-react';

interface CountryPreset {
    code: string;
    name: string;
    currency: string;
    flag: string;
    region: string;
}

// قائمة دول واسعة تشمل المنطقة العربية وأفريقيا
const COUNTRY_PRESETS: CountryPreset[] = [
    // Gulf
    { code: 'SA', name: 'السعودية', currency: 'SAR', flag: '🇸🇦', region: 'Gulf' },
    { code: 'QA', name: 'قطر', currency: 'QAR', flag: '🇶🇦', region: 'Gulf' },
    { code: 'AE', name: 'الإمارات', currency: 'AED', flag: '🇦🇪', region: 'Gulf' },
    { code: 'KW', name: 'الكويت', currency: 'KWD', flag: '🇰🇼', region: 'Gulf' },
    { code: 'BH', name: 'البحرين', currency: 'BHD', flag: '🇧🇭', region: 'Gulf' },
    { code: 'OM', name: 'عمان', currency: 'OMR', flag: '🇴🇲', region: 'Gulf' },

    // North Africa
    { code: 'EG', name: 'مصر', currency: 'EGP', flag: '🇪🇬', region: 'North Africa' },
    { code: 'LY', name: 'ليبيا', currency: 'LYD', flag: '🇱🇾', region: 'North Africa' },
    { code: 'TN', name: 'تونس', currency: 'TND', flag: '🇹🇳', region: 'North Africa' },
    { code: 'DZ', name: 'الجزائر', currency: 'DZD', flag: '🇩🇿', region: 'North Africa' },
    { code: 'MA', name: 'المغرب', currency: 'MAD', flag: '🇲🇦', region: 'North Africa' },
    { code: 'SD', name: 'السودان', currency: 'SDG', flag: '🇸🇩', region: 'North Africa' },

    // Levant / Middle East
    { code: 'IQ', name: 'العراق', currency: 'IQD', flag: '🇮🇶', region: 'Middle East' },
    { code: 'JO', name: 'الأردن', currency: 'JOD', flag: '🇯🇴', region: 'Middle East' },
    { code: 'PS', name: 'فلسطين', currency: 'ILS', flag: '🇵🇸', region: 'Middle East' },
    { code: 'LB', name: 'لبنان', currency: 'LBP', flag: '🇱🇧', region: 'Middle East' },
    { code: 'SY', name: 'سوريا', currency: 'SYP', flag: '🇸🇾', region: 'Middle East' },
    { code: 'YE', name: 'اليمن', currency: 'YER', flag: '🇾🇪', region: 'Middle East' },

    // Others
    { code: 'TR', name: 'تركيا', currency: 'TRY', flag: '🇹🇷', region: 'Other' },
    { code: 'GLOBAL', name: 'عالمي (Global)', currency: 'USD', flag: '🌍', region: 'Global' },
];

interface AddCountryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (country: any) => void;
    existingCodes: string[];
}

export default function AddCountryModal({ isOpen, onClose, onAdd, existingCodes }: AddCountryModalProps) {
    const [search, setSearch] = useState('');
    const [selectedCountry, setSelectedCountry] = useState<CountryPreset | null>(null);

    const filteredCountries = COUNTRY_PRESETS.filter(c =>
        (c.name.includes(search) || c.code.includes(search.toUpperCase())) &&
        !existingCodes.includes(c.code) // إخفاء الدول المضافة بالفعل
    );

    const handleConfirm = () => {
        if (selectedCountry) {
            onAdd({
                countryCode: selectedCountry.code,
                countryName: selectedCountry.name,
                currency: selectedCountry.currency,
                methods: [
                    // طرق دفع افتراضية ذكية بناءً على المنطقة
                    {
                        id: 'bank_transfer',
                        name: 'تحويل بنكي',
                        type: 'bank_transfer',
                        enabled: true,
                        isDefault: false,
                        accountNumber: '',
                        icon: '🏦'
                    },
                    // إضافة خيارات ذكية حسب الدولة
                    ...(selectedCountry.code === 'EG' ? [{ id: 'vodafone_cash', name: 'فودافون كاش', type: 'wallet', enabled: true, icon: '📱' }] : []),
                    ...(selectedCountry.code === 'QA' ? [{ id: 'skipcash', name: 'SkipCash', type: 'card', enabled: true, icon: '💳' }] : []),
                    ...(selectedCountry.code === 'SA' ? [{ id: 'stc_pay', name: 'STC Pay', type: 'wallet', enabled: true, icon: '📱' }] : []),
                    ...(selectedCountry.code === 'IQ' ? [{ id: 'zain_cash', name: 'Zain Cash', type: 'wallet', enabled: true, icon: '📱' }] : []),
                ]
            });
            onClose();
            setSelectedCountry(null);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden h-[600px] flex flex-col"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Globe className="w-5 h-5 text-blue-600" />
                                إضافة دولة جديدة
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">اختر الدولة لإعداد بوابات الدفع الخاصة بها</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 flex-1 flex flex-col min-h-0 bg-white">
                        {/* Search */}
                        <div className="relative mb-6 flex-shrink-0">
                            <Search className="absolute right-3 top-3 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="ابحث عن دولة (مصر، السعودية، العراق...)"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                autoFocus
                            />
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 md:grid-cols-2 gap-3 pb-4 content-start">
                            {filteredCountries.map(country => (
                                <div
                                    key={country.code}
                                    onClick={() => setSelectedCountry(country)}
                                    className={`
                                        p-4 rounded-xl border cursor-pointer flex items-center gap-4 transition-all h-[80px]
                                        ${selectedCountry?.code === country.code
                                            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }
                                    `}
                                >
                                    <div className="text-3xl filter drop-shadow-sm">{country.flag}</div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-900">{country.name}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                {country.code}
                                            </span>
                                            <span className="text-xs text-green-600 font-mono">
                                                {country.currency}
                                            </span>
                                        </div>
                                    </div>
                                    {selectedCountry?.code === country.code && (
                                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 animate-in zoom-in">
                                            <Check className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                </div>
                            ))}

                            {filteredCountries.length === 0 && (
                                <div className="col-span-2 py-12 text-center text-gray-400">
                                    <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>لم يتم العثور على دولة بهذا الاسم</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-100 bg-gray-50 flex-shrink-0 flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                            {selectedCountry ? (
                                <span className="text-blue-600 font-medium flex items-center gap-1">
                                    سيتم إضافة: {selectedCountry.name} ({selectedCountry.currency})
                                </span>
                            ) : (
                                <span>اختر دولة للمتابعة</span>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-6 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={!selectedCountry}
                                className="px-8 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-200"
                            >
                                إضافة الدولة
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
