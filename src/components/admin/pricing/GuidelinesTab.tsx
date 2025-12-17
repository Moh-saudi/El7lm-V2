'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Plus, Trash2, X, Check, Loader2, Tag, Star, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { PricingService } from '@/lib/pricing/pricing-service';

// ==================== GUIDELINES TAB ====================

export default function GuidelinesTab() {
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlanId, setSelectedPlanId] = useState<string>('');
    const [editForm, setEditForm] = useState<any>({
        badges: [],
        highlights: [],
        recommendedFor: '',
        description: ''
    });
    const [newBadge, setNewBadge] = useState('');
    const [newHighlight, setNewHighlight] = useState('');

    useEffect(() => {
        loadPlans();
    }, []);

    useEffect(() => {
        if (selectedPlanId) {
            const plan = plans.find(p => p.id === selectedPlanId);
            if (plan) {
                setEditForm({
                    badges: plan.badges || [],
                    highlights: plan.highlights || [],
                    recommendedFor: plan.recommendedFor || '',
                    description: plan.description || ''
                });
            }
        }
    }, [selectedPlanId, plans]);

    const loadPlans = async () => {
        setLoading(true);
        try {
            const plansData = await PricingService.getAllPlans();
            setPlans(plansData);
            if (plansData.length > 0 && !selectedPlanId) {
                setSelectedPlanId(plansData[0].id);
            }
        } catch (error) {
            console.error('خطأ في تحميل الباقات:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedPlanId) return;

        try {
            const plan = plans.find(p => p.id === selectedPlanId);
            await PricingService.updatePlan({
                ...plan,
                badges: editForm.badges,
                highlights: editForm.highlights,
                recommendedFor: editForm.recommendedFor,
                description: editForm.description
            });

            toast.success('✅ تم حفظ الميزات الإرشادية بنجاح');
            loadPlans();
        } catch (error) {
            console.error('خطأ في حفظ الميزات:', error);
            toast.error('❌ فشل في حفظ الميزات');
        }
    };

    const addBadge = () => {
        if (!newBadge.trim()) return;
        setEditForm({
            ...editForm,
            badges: [...editForm.badges, newBadge.trim()]
        });
        setNewBadge('');
    };

    const removeBadge = (index: number) => {
        setEditForm({
            ...editForm,
            badges: editForm.badges.filter((_: any, i: number) => i !== index)
        });
    };

    const addHighlight = () => {
        if (!newHighlight.trim()) return;
        setEditForm({
            ...editForm,
            highlights: [...editForm.highlights, newHighlight.trim()]
        });
        setNewHighlight('');
    };

    const removeHighlight = (index: number) => {
        setEditForm({
            ...editForm,
            highlights: editForm.highlights.filter((_: any, i: number) => i !== index)
        });
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
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">الميزات الإرشادية</h2>
                    <p className="mt-1 text-sm text-gray-600">أضف شارات، نقاط مميزة، ووصف لكل باقة</p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={selectedPlanId}
                        onChange={(e) => setSelectedPlanId(e.target.value)}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {plans.map(plan => (
                            <option key={plan.id} value={plan.id}>{plan.title}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleSave}
                        className="flex gap-2 items-center px-6 py-2 font-medium text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700"
                    >
                        <Check className="w-4 h-4" />
                        حفظ
                    </button>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* الشارات (Badges) */}
                <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex gap-2 items-center mb-4">
                        <Tag className="w-5 h-5 text-purple-600" />
                        <h3 className="text-lg font-semibold text-gray-900">الشارات</h3>
                    </div>
                    <p className="mb-4 text-sm text-gray-600">
                        مثل: "الأكثر شعبية"، "أفضل قيمة"، "جديد"، "محدود"
                    </p>

                    {/* Add Badge */}
                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={newBadge}
                            onChange={(e) => setNewBadge(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addBadge()}
                            placeholder="أضف شارة جديدة..."
                            className="flex-1 px-3 py-2 bg-gray-50 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <button
                            onClick={addBadge}
                            className="px-4 py-2 text-white bg-purple-600 rounded-lg transition-colors hover:bg-purple-700"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Badges List */}
                    <div className="space-y-2">
                        {editForm.badges.map((badge: string, index: number) => (
                            <div key={index} className="flex gap-2 items-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                                <Tag className="w-4 h-4 text-purple-600" />
                                <span className="flex-1 text-sm font-medium text-gray-900">{badge}</span>
                                <button
                                    onClick={() => removeBadge(index)}
                                    className="p-1 text-red-600 rounded transition-colors hover:bg-red-50"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        {editForm.badges.length === 0 && (
                            <p className="py-8 text-center text-sm text-gray-400">لا توجد شارات</p>
                        )}
                    </div>
                </div>

                {/* النقاط المميزة (Highlights) */}
                <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex gap-2 items-center mb-4">
                        <Star className="w-5 h-5 text-yellow-600" />
                        <h3 className="text-lg font-semibold text-gray-900">النقاط المميزة</h3>
                    </div>
                    <p className="mb-4 text-sm text-gray-600">
                        مثل: "توفير 40%"، "الأكثر مبيعاً"، "عرض محدود"
                    </p>

                    {/* Add Highlight */}
                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={newHighlight}
                            onChange={(e) => setNewHighlight(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addHighlight()}
                            placeholder="أضف نقطة مميزة..."
                            className="flex-1 px-3 py-2 bg-gray-50 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        />
                        <button
                            onClick={addHighlight}
                            className="px-4 py-2 text-white bg-yellow-600 rounded-lg transition-colors hover:bg-yellow-700"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Highlights List */}
                    <div className="space-y-2">
                        {editForm.highlights.map((highlight: string, index: number) => (
                            <div key={index} className="flex gap-2 items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                <Star className="w-4 h-4 text-yellow-600" />
                                <span className="flex-1 text-sm font-medium text-gray-900">{highlight}</span>
                                <button
                                    onClick={() => removeHighlight(index)}
                                    className="p-1 text-red-600 rounded transition-colors hover:bg-red-50"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        {editForm.highlights.length === 0 && (
                            <p className="py-8 text-center text-sm text-gray-400">لا توجد نقاط مميزة</p>
                        )}
                    </div>
                </div>
            </div>

            {/* موصى به لـ */}
            <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="flex gap-2 items-center mb-4">
                    <Users className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">موصى به لـ</h3>
                </div>
                <p className="mb-4 text-sm text-gray-600">
                    من يجب أن يستخدم هذه الباقة؟ (مثل: "المبتدئين"، "المحترفين"، "النوادي الكبيرة")
                </p>
                <input
                    type="text"
                    value={editForm.recommendedFor}
                    onChange={(e) => setEditForm({ ...editForm, recommendedFor: e.target.value })}
                    placeholder="مثلاً: الأندية الصغيرة والمتوسطة"
                    className="px-4 py-3 w-full bg-gray-50 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* الوصف التفصيلي */}
            <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">الوصف التفصيلي</h3>
                <p className="mb-4 text-sm text-gray-600">
                    وصف شامل عن الباقة وفوائدها
                </p>
                <textarea
                    rows={5}
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="اكتب وصفاً تفصيلياً عن الباقة..."
                    className="px-4 py-3 w-full bg-gray-50 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Preview */}
            <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">👁️ معاينة</h3>
                <div className="p-6 bg-white rounded-lg shadow-sm">
                    <div className="flex gap-2 mb-3">
                        {editForm.badges.map((badge: string, i: number) => (
                            <span key={i} className="px-3 py-1 text-xs font-bold text-purple-700 bg-purple-100 rounded-full">
                                {badge}
                            </span>
                        ))}
                    </div>
                    {editForm.highlights.length > 0 && (
                        <ul className="mb-3 space-y-1">
                            {editForm.highlights.map((highlight: string, i: number) => (
                                <li key={i} className="flex gap-2 items-center text-sm text-yellow-700">
                                    <Star className="w-4 h-4" fill="currentColor" />
                                    {highlight}
                                </li>
                            ))}
                        </ul>
                    )}
                    {editForm.recommendedFor && (
                        <p className="mb-2 text-sm text-blue-700">
                            <Users className="inline w-4 h-4 mr-1" />
                            موصى به لـ: <strong>{editForm.recommendedFor}</strong>
                        </p>
                    )}
                    {editForm.description && (
                        <p className="text-sm text-gray-600 leading-relaxed">
                            {editForm.description}
                        </p>
                    )}
                    {!editForm.badges.length && !editForm.highlights.length && !editForm.recommendedFor && !editForm.description && (
                        <p className="py-8 text-center text-gray-400">لم يتم إضافة أي ميزات إرشادية بعد</p>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
