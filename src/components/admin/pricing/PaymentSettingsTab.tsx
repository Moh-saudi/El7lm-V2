import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Plus, Trash2, Globe, CreditCard, Smartphone, Banknote } from 'lucide-react';
import { doc, getDoc, setDoc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import toast from 'react-hot-toast';

interface PaymentMethod {
    id: string;
    name: string;
    type: 'card' | 'wallet' | 'bank_transfer' | 'other';
    enabled: boolean;
    isDefault: boolean;
    accountNumber?: string;
    instructions?: string;
    icon?: string;
}

interface CountrySettings {
    countryCode: string;
    countryName: string;
    currency: string;
    methods: PaymentMethod[];
}

// التكوين الافتراضي (إذا لم يوجد في قاعدة البيانات)
const DEFAULT_SETTINGS: CountrySettings[] = [
    {
        countryCode: 'EG',
        countryName: 'مصر',
        currency: 'EGP',
        methods: [
            { id: 'geidea', name: 'بطاقة بنكية', type: 'card', enabled: true, isDefault: true, icon: '💳' },
            { id: 'vodafone_cash', name: 'فودافون كاش', type: 'wallet', enabled: true, isDefault: false, accountNumber: '', icon: '📱' },
            { id: 'instapay', name: 'انستاباي', type: 'wallet', enabled: true, isDefault: false, accountNumber: '', icon: '⚡' },
            { id: 'bank_transfer', name: 'تحويل بنكي', type: 'bank_transfer', enabled: true, isDefault: false, accountNumber: '', icon: '🏦' }
        ]
    },
    {
        countryCode: 'QA',
        countryName: 'قطر',
        currency: 'QAR',
        methods: [
            { id: 'geidea', name: 'بطاقة بنكية', type: 'card', enabled: true, isDefault: true, icon: '💳' },
            { id: 'fawran', name: 'خدمة فورا', type: 'wallet', enabled: true, isDefault: false, accountNumber: '', icon: '⚡' },
            { id: 'bank_transfer', name: 'تحويل بنكي', type: 'bank_transfer', enabled: true, isDefault: false, accountNumber: '', icon: '🏦' }
        ]
    },
    {
        countryCode: 'SA',
        countryName: 'السعودية',
        currency: 'SAR',
        methods: [
            { id: 'geidea', name: 'بطاقة بنكية', type: 'card', enabled: true, isDefault: true, icon: '💳' },
            { id: 'stc_pay', name: 'STC Pay', type: 'wallet', enabled: true, isDefault: false, accountNumber: '', icon: '📱' },
            { id: 'bank_transfer', name: 'تحويل بنكي', type: 'bank_transfer', enabled: true, isDefault: false, accountNumber: '', icon: '🏦' }
        ]
    },
    {
        countryCode: 'GLOBAL',
        countryName: 'دولي (GLOBAL)',
        currency: 'USD',
        methods: [
            { id: 'geidea', name: 'بطاقة بنكية', type: 'card', enabled: true, isDefault: true, icon: '💳' },
            { id: 'paypal', name: 'PayPal', type: 'wallet', enabled: true, isDefault: false, icon: '💙' },
            { id: 'bank_transfer', name: 'تحويل بنكي', type: 'bank_transfer', enabled: true, isDefault: false, accountNumber: '', icon: '🏦' }
        ]
    }
];

export default function PaymentSettingsTab() {
    const [settings, setSettings] = useState<CountrySettings[]>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState('EG');

    // تحميل الإعدادات من Firebase
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                // نحاول تحميل كل دولة، إذا لم توجد نستخدم الافتراضي
                const loadedSettings = [...DEFAULT_SETTINGS];

                for (let i = 0; i < loadedSettings.length; i++) {
                    const country = loadedSettings[i];
                    const docRef = doc(db, 'payment_settings', country.countryCode);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        loadedSettings[i] = { ...country, ...docSnap.data() } as CountrySettings;
                    }
                }

                setSettings(loadedSettings);
            } catch (error) {
                console.error('Error fetching payment settings:', error);
                toast.error('فشل تحميل إعدادات الدفع');
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const handleSave = async (countryCode: string) => {
        setSaving(true);
        try {
            const countrySetting = settings.find(s => s.countryCode === countryCode);
            if (!countrySetting) return;

            const docRef = doc(db, 'payment_settings', countryCode);
            await setDoc(docRef, countrySetting);

            toast.success(`تم حفظ إعدادات ${countrySetting.countryName} بنجاح`);
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('حدث خطأ أثناء الحفظ');
        } finally {
            setSaving(false);
        }
    };

    const updateMethod = (countryCode: string, methodId: string, updates: Partial<PaymentMethod>) => {
        setSettings(prev => prev.map(country => {
            if (country.countryCode !== countryCode) return country;

            return {
                ...country,
                methods: country.methods.map(method => {
                    if (method.id !== methodId) return method;
                    return { ...method, ...updates };
                })
            };
        }));
    };

    const currentCountry = settings.find(s => s.countryCode === selectedCountry) || settings[0];

    if (loading) return <div className="p-8 text-center text-gray-500">جاري تحميل الإعدادات...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">إعدادات الدفع لكل دولة</h2>
                <div className="flex gap-2">
                    {settings.map(country => (
                        <button
                            key={country.countryCode}
                            onClick={() => setSelectedCountry(country.countryCode)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedCountry === country.countryCode
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                }`}
                        >
                            {country.countryName}
                        </button>
                    ))}
                </div>
            </div>

            <motion.div
                key={selectedCountry}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Globe className="w-5 h-5 text-blue-500" />
                            طرق الدفع في {currentCountry.countryName}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">قم بتفعيل الطرق المتاحة وأضف أرقام الحسابات</p>
                    </div>
                    <button
                        onClick={() => handleSave(currentCountry.countryCode)}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {currentCountry.methods.map((method) => (
                        <div
                            key={method.id}
                            className={`border rounded-xl p-4 transition-colors ${method.enabled ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-75'
                                }`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${method.enabled ? 'bg-blue-50' : 'bg-gray-200'
                                        }`}>
                                        {method.icon}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">{method.name}</h4>
                                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                            {method.type === 'card' ? 'دفع إلكتروني' : method.type === 'wallet' ? 'محفظة إلكترونية' : 'تحويل بنكي'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={method.enabled}
                                            onChange={(e) => updateMethod(currentCountry.countryCode, method.id, { enabled: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        <span className="mr-3 text-sm font-medium text-gray-700">
                                            {method.enabled ? 'مفعّلة' : 'معطّلة'}
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* الحقول الإضافية للطرق اليدوية */}
                            {method.enabled && method.id !== 'geidea' && method.id !== 'paypal' && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4"
                                >
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            رقم الحساب / المحفظة
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={method.accountNumber || ''}
                                                onChange={(e) => updateMethod(currentCountry.countryCode, method.id, { accountNumber: e.target.value })}
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-left dir-ltr"
                                                placeholder={method.id === 'bank_transfer' ? 'IBAN: SA...' : 'مثلاً: 010...'}
                                            />
                                            <div className="absolute left-3 top-2.5 text-gray-400">
                                                #
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            تعليمات الدفع (تظهر للعميل)
                                        </label>
                                        <input
                                            type="text"
                                            value={method.instructions || ''}
                                            onChange={(e) => updateMethod(currentCountry.countryCode, method.id, { instructions: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder={`مثال: حوّل المبلغ إلى الرقم أعلاه ثم ارفع الإيصال`}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
