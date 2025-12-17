'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X, Check, Gift, AlertCircle } from 'lucide-react';
import { COUNTRIES } from '@/constants/countries';

interface CreateOfferModalProps {
    isOpen: boolean;
    formData: any;
    onClose: () => void;
    onSave: () => void;
    onChange: (data: any) => void;
    availablePlans: any[];
    isEditing?: boolean;  // إضافة prop لوضع التعديل
}

export default function CreateOfferModal({
    isOpen,
    formData,
    onClose,
    onSave,
    onChange,
    availablePlans,
    isEditing = false  // قيمة افتراضية
}: CreateOfferModalProps) {
    if (!isOpen) return null;

    const [activeSection, setActiveSection] = React.useState<'basic' | 'scope' | 'limits' | 'conditions'>('basic');

    const ACCOUNT_TYPES = [
        { value: 'club', label: 'النوادي' },
        { value: 'academy', label: 'الأكاديميات' },
        { value: 'trainer', label: 'المدربين' },
        { value: 'agent', label: 'الوكلاء' },
        { value: 'player', label: 'اللاعبين' }
    ];

    const toggleAccountType = (type: string) => {
        const current = formData.targetAccountTypes || [];
        const updated = current.includes(type)
            ? current.filter((t: string) => t !== type)
            : [...current, type];
        onChange({ ...formData, targetAccountTypes: updated });
    };

    const toggleCountry = (code: string) => {
        const current = formData.targetCountries || [];
        const updated = current.includes(code)
            ? current.filter((c: string) => c !== code)
            : [...current, code];
        onChange({ ...formData, targetCountries: updated });
    };

    const togglePlan = (planId: string) => {
        const current = formData.applicablePlans || [];
        const updated = current.includes(planId)
            ? current.filter((p: string) => p !== planId)
            : [...current, planId];
        onChange({ ...formData, applicablePlans: updated });
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-black/50">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-600 to-emerald-600">
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-bold text-white flex gap-2 items-center">
                            <Gift className="w-6 h-6" />
                            {isEditing ? 'تعديل عرض ترويجي' : 'إنشاء عرض ترويجي جديد'}
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 text-white rounded-lg transition-colors hover:bg-white/20"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 bg-gray-50">
                    <button
                        onClick={() => setActiveSection('basic')}
                        className={`flex-1 px-4 py-3 font-medium transition ${activeSection === 'basic'
                            ? 'text-green-600 border-b-2 border-green-600 bg-white'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        المعلومات الأساسية
                    </button>
                    <button
                        onClick={() => setActiveSection('scope')}
                        className={`flex-1 px-4 py-3 font-medium transition ${activeSection === 'scope'
                            ? 'text-green-600 border-b-2 border-green-600 bg-white'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        نطاق العرض
                    </button>
                    <button
                        onClick={() => setActiveSection('limits')}
                        className={`flex-1 px-4 py-3 font-medium transition ${activeSection === 'limits'
                            ? 'text-green-600 border-b-2 border-green-600 bg-white'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        حدود الاستخدام
                    </button>
                    <button
                        onClick={() => setActiveSection('conditions')}
                        className={`flex-1 px-4 py-3 font-medium transition ${activeSection === 'conditions'
                            ? 'text-green-600 border-b-2 border-green-600 bg-white'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        الشروط والباقات
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    {/* Basic Section */}
                    {activeSection === 'basic' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block mb-2 text-sm font-medium text-gray-700">עنوان العرض *</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => onChange({ ...formData, title: e.target.value })}
                                    className="px-4 py-2 w-full bg-gray-50 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    placeholder="مثلاً: خصم العيد 50%"
                                />
                            </div>

                            <div>
                                <label className="block mb-2 text-sm font-medium text-gray-700">الوصف</label>
                                <textarea
                                    rows={3}
                                    value={formData.description}
                                    onChange={(e) => onChange({ ...formData, description: e.target.value })}
                                    className="px-4 py-2 w-full bg-gray-50 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    placeholder="وصف العرض..."
                                />
                            </div>

                            <div>
                                <label className="block mb-2 text-sm font-medium text-gray-700">
                                    رمز الخصم (Promo Code)
                                    <span className="text-xs text-gray-500 mr-2">• اختياري - إذا تركته فارغاً، سيطبق تلقائياً</span>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={formData.code || ''}
                                        onChange={(e) => onChange({ ...formData, code: e.target.value.toUpperCase() })}
                                        className="px-4 py-2 flex-1 bg-gray-50 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono uppercase"
                                        placeholder="SUMMER2024"
                                        maxLength={20}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const randomCode = `PROMO${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                                            onChange({ ...formData, code: randomCode });
                                        }}
                                        className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm font-medium whitespace-nowrap transition-colors"
                                    >
                                        توليد كود
                                    </button>
                                </div>
                                <p className="mt-1 text-xs text-gray-500">
                                    💡 مثال: RAMADAN25, SUMMER50, VIP100 (أو اتركه فارغاً للتطبيق التلقائي)
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-2 text-sm font-medium text-gray-700">نوع الخصم *</label>
                                    <select
                                        value={formData.discountType}
                                        onChange={(e) => onChange({ ...formData, discountType: e.target.value })}
                                        className="px-4 py-2 w-full bg-gray-50 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    >
                                        <option value="percentage">نسبة مئوية (%)</option>
                                        <option value="fixed">قيمة ثابتة (USD)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block mb-2 text-sm font-medium text-gray-700">قيمة الخصم *</label>
                                    <input
                                        type="number"
                                        value={formData.discountValue}
                                        onChange={(e) => onChange({ ...formData, discountValue: parseFloat(e.target.value) || 0 })}
                                        className="px-4 py-2 w-full bg-gray-50 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                                        placeholder={formData.discountType === 'percentage' ? '20' : '10'}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-2 text-sm font-medium text-gray-700">تاريخ البداية *</label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => onChange({ ...formData, startDate: e.target.value })}
                                        className="px-4 py-2 w-full bg-gray-50 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>

                                <div>
                                    <label className="block mb-2 text-sm font-medium text-gray-700">تاريخ النهاية *</label>
                                    <input
                                        type="date"
                                        value={formData.endDate}
                                        onChange={(e) => onChange({ ...formData, endDate: e.target.value })}
                                        className="px-4 py-2 w-full bg-gray-50 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 items-center">
                                <input
                                    type="checkbox"
                                    id="active-offer"
                                    checked={formData.isActive}
                                    onChange={(e) => onChange({ ...formData, isActive: e.target.checked })}
                                    className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                                />
                                <label htmlFor="active-offer" className="text-sm font-medium text-gray-700">
                                    تفعيل العرض فوراً
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Scope Section */}
                    {activeSection === 'scope' && (
                        <div className="space-y-4">
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="flex gap-2 items-start">
                                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-blue-900">
                                        <p className="font-semibold">نطاق العرض</p>
                                        <p className="mt-1">حدد من يمكنه الاستفادة من هذا العرض</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block mb-2 text-sm font-medium text-gray-700">النطاق:</label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                                        <input
                                            type="radio"
                                            name="scope"
                                            value="all"
                                            checked={formData.scope === 'all'}
                                            onChange={(e) => onChange({ ...formData, scope: e.target.value })}
                                            className="w-4 h-4 text-green-600"
                                        />
                                        <span className="text-sm font-medium">للكل (عام)</span>
                                    </label>

                                    <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                                        <input
                                            type="radio"
                                            name="scope"
                                            value="accountTypes"
                                            checked={formData.scope === 'accountTypes'}
                                            onChange={(e) => onChange({ ...formData, scope: e.target.value })}
                                            className="w-4 h-4 text-green-600"
                                        />
                                        <span className="text-sm font-medium">أنواع حسابات محددة</span>
                                    </label>

                                    <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                                        <input
                                            type="radio"
                                            name="scope"
                                            value="countries"
                                            checked={formData.scope === 'countries'}
                                            onChange={(e) => onChange({ ...formData, scope: e.target.value })}
                                            className="w-4 h-4 text-green-600"
                                        />
                                        <span className="text-sm font-medium">دول محددة</span>
                                    </label>
                                </div>
                            </div>

                            {/* Account Types Selection */}
                            {formData.scope === 'accountTypes' && (
                                <div>
                                    <label className="block mb-2 text-sm font-medium text-gray-700">اختر أنواع الحسابات:</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {ACCOUNT_TYPES.map(type => (
                                            <label
                                                key={type.value}
                                                className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer border-2 transition ${formData.targetAccountTypes?.includes(type.value)
                                                    ? 'border-green-500 bg-green-50'
                                                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={formData.targetAccountTypes?.includes(type.value)}
                                                    onChange={() => toggleAccountType(type.value)}
                                                    className="w-4 h-4 text-green-600 rounded"
                                                />
                                                <span className="text-sm font-medium">{type.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Countries Selection */}
                            {formData.scope === 'countries' && (
                                <div>
                                    <label className="block mb-2 text-sm font-medium text-gray-700">اختر الدول:</label>
                                    <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto p-2 bg-gray-50 rounded-lg">
                                        {COUNTRIES.slice(0, 12).map(country => (
                                            <label
                                                key={country.code}
                                                className={`flex items-center gap-2 p-2 rounded cursor-pointer border transition ${formData.targetCountries?.includes(country.code)
                                                    ? 'border-green-500 bg-green-50'
                                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={formData.targetCountries?.includes(country.code)}
                                                    onChange={() => toggleCountry(country.code)}
                                                    className="w-4 h-4 text-green-600 rounded"
                                                />
                                                <span className="text-sm">{country.flag} {country.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Limits Section */}
                    {activeSection === 'limits' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block mb-2 text-sm font-medium text-gray-700">نوع الحد:</label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                                        <input
                                            type="radio"
                                            name="usageLimitType"
                                            value="unlimited"
                                            checked={formData.usageLimitType === 'unlimited'}
                                            onChange={(e) => onChange({ ...formData, usageLimitType: e.target.value })}
                                            className="w-4 h-4 text-green-600"
                                        />
                                        <div>
                                            <span className="text-sm font-medium">غير محدود</span>
                                            <p className="text-xs text-gray-500">يمكن للجميع استخدامه</p>
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                                        <input
                                            type="radio"
                                            name="usageLimitType"
                                            value="total"
                                            checked={formData.usageLimitType === 'total'}
                                            onChange={(e) => onChange({ ...formData, usageLimitType: e.target.value })}
                                            className="w-4 h-4 text-green-600"
                                        />
                                        <div>
                                            <span className="text-sm font-medium">حد كلي</span>
                                            <p className="text-xs text-gray-500">عدد محدود من الاستخدامات الكلية</p>
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                                        <input
                                            type="radio"
                                            name="usageLimitType"
                                            value="perUser"
                                            checked={formData.usageLimitType === 'perUser'}
                                            onChange={(e) => onChange({ ...formData, usageLimitType: e.target.value })}
                                            className="w-4 h-4 text-green-600"
                                        />
                                        <div>
                                            <span className="text-sm font-medium">حد لكل مستخدم</span>
                                            <p className="text-xs text-gray-500">استخدام واحد لكل شخص</p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {formData.usageLimitType === 'total' && (
                                <div>
                                    <label className="block mb-2 text-sm font-medium text-gray-700">الحد الأقصى للاستخدامات:</label>
                                    <input
                                        type="number"
                                        value={formData.totalUsageLimit}
                                        onChange={(e) => onChange({ ...formData, totalUsageLimit: parseInt(e.target.value) || 0 })}
                                        className="px-4 py-2 w-full bg-gray-50 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                                        placeholder="مثلاً: 100"
                                    />
                                </div>
                            )}

                            {formData.usageLimitType === 'perUser' && (
                                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <p className="text-sm text-blue-900">
                                        سيتم تتبع استخدام كل مستخدم تلقائياً. كل مستخدم يمكنه الاستفادة من العرض مرة واحدة فقط.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Conditions Section */}
                    {activeSection === 'conditions' && (
                        <div className="space-y-4">
                            {/* Applicable Plans */}
                            <div>
                                <label className="block mb-2 text-sm font-medium text-gray-700">الباقات المطبقة:</label>
                                <p className="mb-2 text-xs text-gray-500">اترك فارغاً لتطبيق العرض على جميع الباقات</p>
                                <div className="space-y-2">
                                    {(availablePlans || []).map(plan => (
                                        <label
                                            key={plan.id}
                                            className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer border transition ${formData.applicablePlans?.includes(plan.id)
                                                ? 'border-green-500 bg-green-50'
                                                : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={formData.applicablePlans?.includes(plan.id)}
                                                onChange={() => togglePlan(plan.id)}
                                                className="w-4 h-4 text-green-600 rounded"
                                            />
                                            <span className="text-sm font-medium">{plan.title || plan.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Min Conditions */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-2 text-sm font-medium text-gray-700">حد أدنى للاعبين:</label>
                                    <input
                                        type="number"
                                        value={formData.minPlayers}
                                        onChange={(e) => onChange({ ...formData, minPlayers: parseInt(e.target.value) || 0 })}
                                        className="px-4 py-2 w-full bg-gray-50 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                                        placeholder="0 = لا يوجد حد"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">اترك 0 إذا لم يكن هناك حد أدنى</p>
                                </div>

                                <div>
                                    <label className="block mb-2 text-sm font-medium text-gray-700">حد أدنى للمبلغ (USD):</label>
                                    <input
                                        type="number"
                                        value={formData.minAmount}
                                        onChange={(e) => onChange({ ...formData, minAmount: parseFloat(e.target.value) || 0 })}
                                        className="px-4 py-2 w-full bg-gray-50 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                                        placeholder="0 = لا يوجد حد"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">اترك 0 إذا لم يكن هناك حد أدنى</p>
                                </div>
                            </div>

                            {(formData.minPlayers > 0 || formData.minAmount > 0) && (
                                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                    <p className="text-sm text-yellow-900">
                                        <strong>تنبيه:</strong> سيتم تطبيق العرض فقط إذا تحققت الشروط التالية:
                                    </p>
                                    <ul className="mt-2 text-sm text-yellow-800 list-disc list-inside">
                                        {formData.minPlayers > 0 && <li>عدد اللاعبين ≥ {formData.minPlayers}</li>}
                                        {formData.minAmount > 0 && <li>المبلغ الإجمالي ≥ ${formData.minAmount}</li>}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-gray-200">
                    <button
                        onClick={onSave}
                        className="flex flex-1 gap-2 justify-center items-center px-4 py-3 font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!formData.title || !formData.discountValue}
                    >
                        <Check className="w-5 h-5" />
                        {isEditing ? 'حفظ التعديلات' : 'إنشاء العرض'}
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-3 font-medium text-gray-700 bg-gray-100 rounded-lg transition-colors hover:bg-gray-200"
                    >
                        إلغاء
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
