'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Trash2, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { PricingService } from '@/lib/pricing/pricing-service';

// ==================== ACCOUNT TYPE PRICING TAB ====================

function AccountTypePricingTab() {
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState<string>('');
    const [editingType, setEditingType] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<any>({});

    useEffect(() => {
        loadPlans();
    }, []);

    const loadPlans = async () => {
        setLoading(true);
        try {
            const plansData = await PricingService.getAllPlans();
            setPlans(plansData);
            if (plansData.length > 0 && !selectedPlan) {
                setSelectedPlan(plansData[0].id);
            }
        } catch (error) {
            console.error('خطأ في تحميل الباقات:', error);
        } finally {
            setLoading(false);
        }
    };

    const currentPlan = plans.find(p => p.id === selectedPlan);

    const ACCOUNT_TYPES = [
        { code: 'club', name: 'النوادي', icon: '⚽', color: 'blue' },
        { code: 'academy', name: 'الأكاديميات', icon: '🏫', color: 'green' },
        { code: 'trainer', name: 'المدربين', icon: '👨‍🏫', color: 'purple' },
        { code: 'agent', name: 'الوكلاء', icon: '💼', color: 'orange' },
        { code: 'player', name: 'اللاعبين', icon: '🏃', color: 'red' },
    ];

    const handleEditType = (typeCode: string) => {
        const override = currentPlan?.accountTypeOverrides?.[typeCode];

        setEditingType(typeCode);
        setEditForm({
            original_price: override?.original_price || currentPlan?.base_original_price || 0,
            price: override?.price || currentPlan?.base_price || 0,
            discount_percentage: override?.discount_percentage || 0,
            active: override?.active ?? true,
        });
    };

    const handleSaveTypePrice = async () => {
        if (!editingType || !currentPlan) return;

        try {
            const updatedOverrides = {
                ...currentPlan.accountTypeOverrides,
                [editingType]: {
                    original_price: editForm.price ? parseFloat(editForm.original_price) : undefined,
                    price: editForm.price ? parseFloat(editForm.price) : undefined,
                    discount_percentage: editForm.discount_percentage ? parseFloat(editForm.discount_percentage) : undefined,
                    active: editForm.active
                }
            };

            await PricingService.updatePlan({
                ...currentPlan,
                accountTypeOverrides: updatedOverrides
            });

            toast.success('✅ تم حفظ السعر المخصص بنجاح');
            setEditingType(null);
            loadPlans();
        } catch (error) {
            console.error('خطأ في حفظ السعر المخصص:', error);
            toast.error('❌ فشل في حفظ السعر المخصص');
        }
    };

    const handleRemoveTypePrice = async (typeCode: string) => {
        if (!currentPlan) return;

        try {
            const updatedOverrides = { ...currentPlan.accountTypeOverrides };
            delete updatedOverrides[typeCode];

            await PricingService.updatePlan({
                ...currentPlan,
                accountTypeOverrides: updatedOverrides
            });

            toast.success('✅ تم حذف السعر المخصص');
            loadPlans();
        } catch (error) {
            console.error('خطأ في حذف السعر المخصص:', error);
            toast.error('❌ فشل في حذف السعر المخصص');
        }
    };

    if (loading) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
        >
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">أسعار أنواع الحسابات</h2>
                    <p className="mt-1 text-sm text-gray-600">تخصيص الأسعار والخصومات لكل نوع حساب</p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={selectedPlan}
                        onChange={(e) => setSelectedPlan(e.target.value)}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {plans.map(plan => (
                            <option key={plan.id} value={plan.id}>{plan.title}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="p-4 mb-6 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex gap-3 items-start">
                    <AlertCircle className="flex-shrink-0 w-5 h-5 text-blue-600" />
                    <div className="text-sm text-blue-900">
                        <p className="font-semibold">كيف يعمل النظام؟</p>
                        <p className="mt-1">
                            يمكنك تحديد سعر خاص أو نسبة خصم لكل نوع حساب. الخصومات تُطبق على جميع الأسعار (الأساسية والمخصصة للدول).
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-4 mb-6 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">السعر الأساسي (بدون تخصيص)</h3>
                <div className="flex gap-6 items-center">
                    <div>
                        <p className="text-xs text-gray-500">السعر الأصلي</p>
                        <p className="text-lg font-bold text-gray-400 line-through">${currentPlan?.base_original_price || 0}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">السعر بعد الخصم</p>
                        <p className="text-lg font-bold text-green-600">${currentPlan?.base_price || 0}</p>
                    </div>
                </div>
            </div>

            <div className="overflow-hidden bg-white rounded-lg border border-gray-200">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">نوع الحساب</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">السعر المخصص</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">نسبة الخصم</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {ACCOUNT_TYPES.map(type => {
                                const override = currentPlan?.accountTypeOverrides?.[type.code];
                                const hasCustomPrice = !!override;

                                return (
                                    <tr key={type.code} className={hasCustomPrice ? 'bg-blue-50/50' : 'bg-white hover:bg-gray-50'}>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2 items-center">
                                                <span className="text-2xl">{type.icon}</span>
                                                <span className="font-medium text-gray-900">{type.name}</span>
                                                {hasCustomPrice && (
                                                    <span className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                                                        مخصص
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {override?.price ? (
                                                <span className="text-lg font-bold text-green-600">${override.price}</span>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {override?.discount_percentage ? (
                                                <span className="text-lg font-bold text-orange-600">{override.discount_percentage}%</span>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {override ? (
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${override.active
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    <div className={`w-2 h-2 rounded-full ${override.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                                                    {override.active ? 'نشط' : 'معطل'}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-gray-400">افتراضي</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEditType(type.code)}
                                                    className="flex gap-1 items-center px-3 py-1 text-sm text-blue-600 bg-blue-50 rounded-lg transition-colors hover:bg-blue-100"
                                                >
                                                    <Edit2 className="w-3 h-3" />
                                                    {hasCustomPrice ? 'تعديل' : 'إضافة'}
                                                </button>
                                                {hasCustomPrice && (
                                                    <button
                                                        onClick={() => handleRemoveTypePrice(type.code)}
                                                        className="flex gap-1 items-center px-3 py-1 text-sm text-red-600 bg-red-50 rounded-lg transition-colors hover:bg-red-100"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                        حذف
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* نافذة التعديل */}
            <AnimatePresence>
                {editingType && (
                    <div className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-black/50">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md bg-white rounded-2xl shadow-2xl"
                        >
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">
                                            {ACCOUNT_TYPES.find(t => t.code === editingType)?.icon} تخصيص السعر
                                        </h3>
                                        <p className="mt-1 text-sm text-gray-600">
                                            {ACCOUNT_TYPES.find(t => t.code === editingType)?.name}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setEditingType(null)}
                                        className="p-2 text-gray-400 rounded-lg transition-colors hover:bg-gray-100"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <p className="text-xs text-yellow-800">
                                        💡 يمكنك تحديد سعر مخصص أو نسبة خصم. الخصم يُطبق على جميع الأسعار تلقائياً.
                                    </p>
                                </div>

                                <div>
                                    <label className="block mb-2 text-sm font-medium text-gray-700">السعر الأصلي (USD)</label>
                                    <input
                                        type="number"
                                        value={editForm.original_price}
                                        onChange={(e) => setEditForm({ ...editForm, original_price: e.target.value })}
                                        className="px-4 py-2 w-full bg-gray-50 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="60"
                                    />
                                </div>

                                <div>
                                    <label className="block mb-2 text-sm font-medium text-gray-700">السعر بعد الخصم (USD)</label>
                                    <input
                                        type="number"
                                        value={editForm.price}
                                        onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                                        className="px-4 py-2 w-full bg-gray-50 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="35"
                                    />
                                </div>

                                <div className="text-center text-sm text-gray-500">— أو —</div>

                                <div>
                                    <label className="block mb-2 text-sm font-medium text-gray-700">نسبة الخصم (%)</label>
                                    <input
                                        type="number"
                                        value={editForm.discount_percentage}
                                        onChange={(e) => setEditForm({ ...editForm, discount_percentage: e.target.value })}
                                        className="px-4 py-2 w-full bg-gray-50 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="20"
                                        min="0"
                                        max="100"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        الخصم يُطبق على السعر الأساسي وأسعار الدول تلقائياً
                                    </p>
                                </div>

                                <div className="flex gap-2 items-center">
                                    <input
                                        type="checkbox"
                                        id="active-type"
                                        checked={editForm.active}
                                        onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                    />
                                    <label htmlFor="active-type" className="text-sm font-medium text-gray-700">
                                        تفعيل السعر المخصص
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-3 p-6 border-t border-gray-200">
                                <button
                                    onClick={handleSaveTypePrice}
                                    className="flex flex-1 gap-2 justify-center items-center px-4 py-2 font-medium text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700"
                                >
                                    <Check className="w-4 h-4" />
                                    حفظ
                                </button>
                                <button
                                    onClick={() => setEditingType(null)}
                                    className="px-4 py-2 font-medium text-gray-700 bg-gray-100 rounded-lg transition-colors hover:bg-gray-200"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default AccountTypePricingTab;
