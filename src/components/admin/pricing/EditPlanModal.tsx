'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

interface Feature {
    id: string;
    name: string;
    description?: string;
    included: boolean;
}

interface SubscriptionPlan {
    id: string;
    name: string;
    key: 'monthly' | 'quarterly' | 'yearly' | '3months' | '6months';
    basePrice: number;
    currency: 'USD';
    duration: number;
    period: string;
    features: Feature[];
    bonusFeatures: Feature[];
    isActive: boolean;
    displayOrder: number;
}

interface EditPlanModalProps {
    plan: SubscriptionPlan;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedPlan: SubscriptionPlan) => void;
}

export default function EditPlanModal({ plan, isOpen, onClose, onSave }: EditPlanModalProps) {
    const [editedPlan, setEditedPlan] = useState<SubscriptionPlan>(plan);
    const [newFeature, setNewFeature] = useState({ name: '', description: '' });
    const [newBonus, setNewBonus] = useState({ name: '', description: '' });
    const [activeSection, setActiveSection] = useState<'basic' | 'features' | 'bonus'>('basic');

    if (!isOpen) return null;

    const handleSave = () => {
        // TODO: Save to Firebase
        onSave(editedPlan);
        toast.success('تم تحديث الباقة بنجاح');
        onClose();
    };

    const addFeature = () => {
        if (!newFeature.name.trim()) {
            toast.error('يرجى إدخال اسم الميزة');
            return;
        }

        const feature: Feature = {
            id: Date.now().toString(),
            name: newFeature.name,
            description: newFeature.description,
            included: true,
        };

        setEditedPlan({
            ...editedPlan,
            features: [...editedPlan.features, feature],
        });

        setNewFeature({ name: '', description: '' });
        toast.success('تمت إضافة الميزة');
    };

    const removeFeature = (id: string) => {
        setEditedPlan({
            ...editedPlan,
            features: editedPlan.features.filter(f => f.id !== id),
        });
        toast.success('تم حذف الميزة');
    };

    const addBonus = () => {
        if (!newBonus.name.trim()) {
            toast.error('يرجى إدخال اسم المكافأة');
            return;
        }

        const bonus: Feature = {
            id: Date.now().toString(),
            name: newBonus.name,
            description: newBonus.description,
            included: true,
        };

        setEditedPlan({
            ...editedPlan,
            bonusFeatures: [...editedPlan.bonusFeatures, bonus],
        });

        setNewBonus({ name: '', description: '' });
        toast.success('تمت إضافة المكافأة');
    };

    const removeBonus = (id: string) => {
        setEditedPlan({
            ...editedPlan,
            bonusFeatures: editedPlan.bonusFeatures.filter(b => b.id !== id),
        });
        toast.success('تم حذف المكافأة');
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-black/50">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="overflow-hidden w-full max-w-4xl bg-white rounded-2xl shadow-2xl"
                >
                    {/* Header */}
                    <div className="relative p-6 bg-gradient-to-r from-blue-600 to-blue-700">
                        <button
                            onClick={onClose}
                            className="absolute top-4 left-4 p-2 text-white rounded-lg transition-colors hover:bg-white/20"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="text-center text-white">
                            <h2 className="text-3xl font-bold">تعديل الباقة</h2>
                            <p className="mt-2 text-blue-100">{plan.name}</p>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-200">
                        <button
                            onClick={() => setActiveSection('basic')}
                            className={`flex-1 px-6 py-3 font-medium transition-colors ${activeSection === 'basic'
                                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                        >
                            المعلومات الأساسية
                        </button>
                        <button
                            onClick={() => setActiveSection('features')}
                            className={`flex-1 px-6 py-3 font-medium transition-colors ${activeSection === 'features'
                                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                        >
                            الميزات ({editedPlan.features.length})
                        </button>
                        <button
                            onClick={() => setActiveSection('bonus')}
                            className={`flex-1 px-6 py-3 font-medium transition-colors ${activeSection === 'bonus'
                                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                        >
                            المكافآت ({editedPlan.bonusFeatures.length})
                        </button>
                    </div>

                    {/* Content */}
                    <div className="overflow-y-auto p-6 max-h-[60vh]">
                        {/* Basic Info Section */}
                        {activeSection === 'basic' && (
                            <div className="space-y-6">
                                <div>
                                    <label className="block mb-2 text-sm font-medium text-gray-700">
                                        اسم الباقة
                                    </label>
                                    <input
                                        type="text"
                                        value={editedPlan.name}
                                        onChange={(e) =>
                                            setEditedPlan({ ...editedPlan, name: e.target.value })
                                        }
                                        className="px-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block mb-2 text-sm font-medium text-gray-700">
                                            السعر (USD)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editedPlan.basePrice}
                                            onChange={(e) =>
                                                setEditedPlan({
                                                    ...editedPlan,
                                                    basePrice: parseFloat(e.target.value),
                                                })
                                            }
                                            className="px-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block mb-2 text-sm font-medium text-gray-700 text-right">
                                            النص المعروض للمدة (مثال: 6 شهور)
                                        </label>
                                        <input
                                            type="text"
                                            value={editedPlan.period}
                                            onChange={(e) =>
                                                setEditedPlan({
                                                    ...editedPlan,
                                                    period: e.target.value,
                                                })
                                            }
                                            className="px-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                                            dir="rtl"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2 items-center">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        checked={editedPlan.isActive}
                                        onChange={(e) =>
                                            setEditedPlan({ ...editedPlan, isActive: e.target.checked })
                                        }
                                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                                    />
                                    <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                                        الباقة نشطة
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Features Section */}
                        {activeSection === 'features' && (
                            <div className="space-y-6">
                                {/* Add Feature Form */}
                                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <h3 className="mb-3 font-semibold text-gray-900">إضافة ميزة جديدة</h3>
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            value={newFeature.name}
                                            onChange={(e) =>
                                                setNewFeature({ ...newFeature, name: e.target.value })
                                            }
                                            placeholder="اسم الميزة"
                                            className="px-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                                        />
                                        <input
                                            type="text"
                                            value={newFeature.description}
                                            onChange={(e) =>
                                                setNewFeature({ ...newFeature, description: e.target.value })
                                            }
                                            placeholder="الوصف (اختياري)"
                                            className="px-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button
                                            onClick={addFeature}
                                            className="flex gap-2 items-center px-4 py-2 w-full text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700"
                                        >
                                            <Plus className="w-4 h-4" />
                                            إضافة الميزة
                                        </button>
                                    </div>
                                </div>

                                {/* Features List */}
                                <div className="space-y-3">
                                    {editedPlan.features.map((feature, index) => (
                                        <div
                                            key={feature.id}
                                            className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg border border-gray-200"
                                        >
                                            <div className="flex-shrink-0 p-1 mt-0.5 bg-blue-100 rounded-full">
                                                <Check className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900">{feature.name}</p>
                                                {feature.description && (
                                                    <p className="mt-1 text-sm text-gray-600">{feature.description}</p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => removeFeature(feature.id)}
                                                className="p-1 text-red-600 rounded transition-colors hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {editedPlan.features.length === 0 && (
                                        <p className="py-8 text-center text-gray-500">لا توجد ميزات بعد</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Bonus Section */}
                        {activeSection === 'bonus' && (
                            <div className="space-y-6">
                                {/* Add Bonus Form */}
                                <div className="p-4 rounded-lg border-2 border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
                                    <h3 className="mb-3 font-semibold text-gray-900">إضافة مكافأة جديدة</h3>
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            value={newBonus.name}
                                            onChange={(e) => setNewBonus({ ...newBonus, name: e.target.value })}
                                            placeholder="اسم المكافأة"
                                            className="px-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-yellow-500"
                                        />
                                        <input
                                            type="text"
                                            value={newBonus.description}
                                            onChange={(e) =>
                                                setNewBonus({ ...newBonus, description: e.target.value })
                                            }
                                            placeholder="الوصف (اختياري)"
                                            className="px-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-yellow-500"
                                        />
                                        <button
                                            onClick={addBonus}
                                            className="flex gap-2 items-center px-4 py-2 w-full text-white bg-gradient-to-r from-yellow-600 to-orange-600 rounded-lg transition-all hover:shadow-lg"
                                        >
                                            <Plus className="w-4 h-4" />
                                            إضافة المكافأة
                                        </button>
                                    </div>
                                </div>

                                {/* Bonus List */}
                                <div className="space-y-3">
                                    {editedPlan.bonusFeatures.map((bonus, index) => (
                                        <div
                                            key={bonus.id}
                                            className="flex gap-3 items-start p-3 rounded-lg border border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50"
                                        >
                                            <div className="flex-shrink-0 p-1 mt-0.5 bg-yellow-100 rounded-full">
                                                <Check className="w-4 h-4 text-yellow-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900">{bonus.name}</p>
                                                {bonus.description && (
                                                    <p className="mt-1 text-sm text-gray-600">{bonus.description}</p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => removeBonus(bonus.id)}
                                                className="p-1 text-red-600 rounded transition-colors hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {editedPlan.bonusFeatures.length === 0 && (
                                        <p className="py-8 text-center text-gray-500">لا توجد مكافآت بعد</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex gap-3 justify-end p-6 border-t border-gray-200 bg-gray-50">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 font-medium text-gray-700 bg-white rounded-lg border border-gray-300 transition-colors hover:bg-gray-50"
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 font-medium text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700"
                        >
                            حفظ التغييرات
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
