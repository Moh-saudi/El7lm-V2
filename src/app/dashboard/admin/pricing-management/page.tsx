'use client';

import React, { useState, useEffect } from 'react';
import {
    DollarSign,
    Globe,
    Gift,
    Users,
    TrendingUp,
    Calendar,
    Edit2,
    Edit,
    Plus,
    Eye,
    Trash2,
    Copy,
    Check,
    AlertCircle,
    Settings,
    BarChart3,
    Filter,
    Download,
    Search,
    X,
    Star,
    PlayCircle,
    Loader2,
    CreditCard,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import EditPlanModal from '@/components/admin/pricing/EditPlanModal';
import AccountTypePricingTab from '@/components/admin/pricing/AccountTypePricingTab';
import GuidelinesTab from '@/components/admin/pricing/GuidelinesTab';
import CreateOfferModal from '@/components/admin/pricing/CreateOfferModal';
import PaymentSettingsTab from '@/components/admin/pricing/PaymentSettingsTab';
import { useAuth } from '@/lib/firebase/auth-provider';
import { initializeRealPricingSystem } from '@/lib/services/init-real-pricing';
import { PricingService } from '@/lib/pricing/pricing-service';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';

// ==================== INTERFACES ====================

interface SubscriptionPlan {
    id: string;
    name: string;
    key: 'monthly' | 'quarterly' | 'yearly';
    basePrice: number;
    currency: 'USD';
    duration: number;
    features: Feature[];
    bonusFeatures: Feature[];
    isActive: boolean;
    displayOrder: number;
}

interface Feature {
    id: string;
    name: string;
    description?: string;
    included: boolean;
}

interface PromotionalOffer {
    id: string;
    title: string;
    name: string;
    description: string;
    code?: string;
    offerType?: 'flash_sale' | 'seasonal' | 'partnership' | 'early_bird';

    // الخصم
    discountType: 'percentage' | 'fixed';
    discountValue: number;

    // التواريخ
    startDate: string | Date;
    endDate: string | Date;

    // الحالة
    isActive: boolean;
    status?: 'draft' | 'scheduled' | 'active' | 'expired' | 'paused';

    // نطاق العرض (Scope)
    scope: 'all' | 'accountTypes' | 'specificAccounts' | 'countries';
    targetAccountTypes?: ('club' | 'academy' | 'trainer' | 'agent' | 'player')[]; // عند scope = accountTypes
    targetAccountIds?: string[];  // عند scope = specificAccounts
    targetCountries?: string[];   // عند scope = countries

    // الباقات المطبقة
    applicablePlans: string[];  // [] = جميع الباقات، أو IDs محددة

    // حدود الاستخدام
    usageLimitType: 'unlimited' | 'total' | 'perUser';
    totalUsageLimit?: number;     // عند usageLimitType = total
    perUserLimit?: number;        // عند usageLimitType = perUser (عادة 1)
    usageCount?: number;          // العدد الحالي للاستخدامات

    // شروط إضافية
    minPlayers?: number;          // حد أدنى لعدد اللاعبين
    minAmount?: number;           // حد أدنى للمبلغ (بالدولار)

    // عرض
    displayBadge?: string;
    displayColor?: string;
}

interface Partner {
    id: string;
    partnerName: string;
    partnerCode: string;
    partnerType: 'federation' | 'league' | 'government' | 'corporate';
    customPricing: {
        quarterly?: number;   // 3 شهور
        sixMonths?: number;   // 6 شهور
        yearly?: number;      // سنوي
    };
    isPublic: boolean;
    status: 'active' | 'inactive' | 'pending';
    activeSubscriptions: number;
    totalRevenue: number;
}

interface OverviewStats {
    activePlans: number;
    activeOffers: number;
    activePartners: number;
    monthlyRevenue: number;
}

// ==================== MAIN COMPONENT ====================

export default function PricingAdminPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'plans' | 'custom' | 'accountTypes' | 'guidelines' | 'offers' | 'partners'>('plans');
    const [stats, setStats] = useState<OverviewStats>({
        activePlans: 3,
        activeOffers: 2,
        activePartners: 5,
        monthlyRevenue: 15420,
    });

    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [offers, setOffers] = useState<PromotionalOffer[]>([]);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);

    // Initialization states
    const [showInitModal, setShowInitModal] = useState(false);
    const [initStatus, setInitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [initMessage, setInitMessage] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            console.log('📦 جاري تحميل الباقات من Firebase...');
            const plansData = await PricingService.getAllPlans();

            if (!plansData || plansData.length === 0) {
                console.log('⚠️ لا توجد باقات - استخدم زر التهيئة');
                setPlans([]);
            } else {
                console.log(`✅ تم تحميل ${plansData.length} باقة بنجاح`);
                // تحويل البيانات من PricingService format إلى format الصفحة
                const convertedPlans = plansData.map(plan => ({
                    id: plan.id,
                    name: plan.title,
                    key: plan.id.includes('3months') ? '3months' as const :
                        plan.id.includes('6months') ? '6months' as const :
                            plan.id.includes('annual') ? 'yearly' as const : 'monthly' as const,
                    basePrice: plan.base_price,
                    currency: 'USD' as const,
                    duration: plan.id.includes('3months') ? 90 :
                        plan.id.includes('6months') ? 180 :
                            plan.id.includes('annual') ? 365 : 30,
                    features: Array.isArray(plan.features)
                        ? plan.features.map((f, i) => ({
                            id: `f${i}`,
                            name: typeof f === 'string' ? f : f.name || '',
                            description: typeof f === 'object' && f.description ? f.description : undefined,
                            included: true
                        }))
                        : [],
                    bonusFeatures: Array.isArray(plan.bonusFeatures)
                        ? plan.bonusFeatures.map((b, i) => ({
                            id: `b${i}`,
                            name: typeof b === 'string' ? b : b.name || '',
                            description: typeof b === 'object' && b.description ? b.description : undefined,
                            included: true
                        }))
                        : [],
                    isActive: plan.isActive ?? true,
                    displayOrder: plan.order ?? 0
                }));

                setPlans(convertedPlans);
                console.log('📊 البيانات جاهزة للعرض');
            }

            // تحميل العروض الترويجية
            console.log('🎁 جاري تحميل العروض الترويجية...');
            const offersRef = collection(db, 'promotional_offers');
            const offersQuery = query(offersRef, orderBy('createdAt', 'desc'));
            const offersSnapshot = await getDocs(offersQuery);

            console.log('📊 مصدر البيانات:', offersSnapshot.metadata.fromCache ? 'Cache' : 'Server');

            const offersData = offersSnapshot.docs.map(doc => {
                const data = doc.data();
                // حذف حقل id من البيانات لتجنب التعارض مع doc.id
                const { id: _, ...restData } = data as any;
                return {
                    id: doc.id,  // استخدام Document ID الحقيقي
                    ...restData
                } as PromotionalOffer;
            });

            setOffers(offersData);
            console.log(`✅ تم تحميل ${offersData.length} عرض ترويجي`);
            console.log('📋 IDs العروض:', offersData.map(o => o.id));
            if (offersData.length > 0) {
                console.log('📑 تفاصيل العرض الأول:', {
                    id: offersData[0].id,
                    title: offersData[0].title,
                    isActive: offersData[0].isActive,
                    docExists: true
                });
            }

            // تحميل الشركاء
            console.log('🤝 جاري تحميل الشركاء...');
            const partnersRef = collection(db, 'partners');
            const partnersQuery = query(partnersRef, orderBy('createdAt', 'desc'));
            const partnersSnapshot = await getDocs(partnersQuery);

            const partnersData = partnersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Partner[];

            setPartners(partnersData);
            console.log(`✅ تم تحميل ${partnersData.length} شريك`);

        } catch (error) {
            console.error('❌ خطأ في تحميل البيانات:', error);
            toast.error('فشل تحميل البيانات من Firebase');
            setPlans([]);
            setOffers([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 shadow-sm">
                <div className="px-6 py-6 mx-auto max-w-7xl">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="flex gap-3 items-center text-3xl font-bold text-gray-900">
                                <DollarSign className="w-8 h-8 text-blue-600" />
                                إدارة الأسعار والعروض
                            </h1>
                            <p className="mt-2 text-gray-600">
                                التحكم الكامل في الباقات والأسعار والعروض الترويجية
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button className="flex gap-2 items-center px-4 py-2 text-gray-700 bg-white rounded-lg border border-gray-300 transition-colors hover:bg-gray-50">
                                <Download className="w-4 h-4" />
                                تصدير
                            </button>
                            <button className="flex gap-2 items-center px-4 py-2 text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700">
                                <BarChart3 className="w-4 h-4" />
                                التقارير
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-6 py-6 mx-auto max-w-7xl">
                {/* Overview Stats */}
                <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
                    <StatsCard
                        title="الباقات النشطة"
                        value={stats.activePlans}
                        icon={<DollarSign className="w-6 h-6" />}
                        color="blue"
                    />
                    <StatsCard
                        title="العروض الفعالة"
                        value={stats.activeOffers}
                        icon={<Gift className="w-6 h-6" />}
                        color="green"
                    />
                    <StatsCard
                        title="الشركاء النشطين"
                        value={stats.activePartners}
                        icon={<Users className="w-6 h-6" />}
                        color="purple"
                    />
                    <StatsCard
                        title="الإيرادات الشهرية"
                        value={`$${stats.monthlyRevenue.toLocaleString()}`}
                        icon={<TrendingUp className="w-6 h-6" />}
                        color="orange"
                    />
                </div>

                {/* Tabs */}
                <div className="mb-6 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex overflow-x-auto border-b border-gray-200">
                        <TabButton
                            active={activeTab === 'plans'}
                            onClick={() => setActiveTab('plans')}
                            icon={<DollarSign className="w-5 h-5" />}
                            label="الأسعار الأساسية"
                        />
                        <TabButton
                            active={activeTab === 'custom'}
                            onClick={() => setActiveTab('custom')}
                            icon={<Globe className="w-5 h-5" />}
                            label="الأسعار المخصصة"
                        />
                        <TabButton
                            active={activeTab === 'accountTypes'}
                            onClick={() => setActiveTab('accountTypes')}
                            icon={<Users className="w-5 h-5" />}
                            label="أسعار أنواع الحسابات"
                        />
                        <TabButton
                            active={activeTab === 'guidelines'}
                            onClick={() => setActiveTab('guidelines')}
                            icon={<Star className="w-5 h-5" />}
                            label="الميزات الإرشادية"
                        />
                        <TabButton
                            active={activeTab === 'offers'}
                            onClick={() => setActiveTab('offers')}
                            icon={<Gift className="w-5 h-5" />}
                            label="العروض الترويجية"
                        />
                        <TabButton
                            active={activeTab === 'partners'}
                            onClick={() => setActiveTab('partners')}
                            icon={<Users className="w-5 h-5" />}
                            label="الشركاء"
                        />
                        <TabButton
                            active={activeTab === 'payments'}
                            onClick={() => setActiveTab('payments')}
                            icon={<CreditCard className="w-5 h-5" />}
                            label="إعدادات الدفع"
                        />
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                        <AnimatePresence mode="wait">
                            {activeTab === 'plans' && <BasePlansTab plans={plans} onUpdate={loadData} />}
                            {activeTab === 'custom' && <CustomPricingTab />}
                            {activeTab === 'accountTypes' && <AccountTypePricingTab />}
                            {activeTab === 'guidelines' && <GuidelinesTab />}
                            {activeTab === 'offers' && <OffersTab offers={offers} plans={plans} onUpdate={loadData} />}
                            {activeTab === 'partners' && <PartnersTab partners={partners} onUpdate={loadData} />}
                            {activeTab === 'payments' && <PaymentSettingsTab />}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ==================== STATS CARD ====================

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: 'blue' | 'green' | 'purple' | 'orange';
}

function StatsCard({ title, value, icon, color }: StatsCardProps) {
    const colorClasses = {
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        purple: 'bg-purple-100 text-purple-600',
        orange: 'bg-orange-100 text-orange-600',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm transition-shadow hover:shadow-md"
        >
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
                </div>
                <div className={`p-3 rounded-lg ${colorClasses[color]}`}>{icon}</div>
            </div>
        </motion.div>
    );
}

// ==================== TAB BUTTON ====================

interface TabButtonProps {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`
        flex items-center gap-2 px-6 py-4 font-medium transition-all relative
        ${active
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
      `}
        >
            {icon}
            <span>{label}</span>
            {active && (
                <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                />
            )}
        </button>
    );
}

// ==================== BASE PLANS TAB ====================

interface BasePlansTabProps {
    plans: SubscriptionPlan[];
    onUpdate: () => void;
}

function BasePlansTab({ plans, onUpdate }: BasePlansTabProps) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
        >
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">الباقات الأساسية</h2>
                    <p className="mt-1 text-sm text-gray-600">الأسعار الأساسية بالدولار الأمريكي</p>
                </div>
                <button className="flex gap-2 items-center px-4 py-2 text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700">
                    <Plus className="w-4 h-4" />
                    إضافة باقة جديدة
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {plans.map((plan) => (
                    <PlanCard key={plan.id} plan={plan} onUpdate={onUpdate} />
                ))}
            </div>
        </motion.div>
    );
}

// ==================== PLAN CARD ====================

interface PlanCardProps {
    plan: SubscriptionPlan;
    onUpdate: () => void;
}

function PlanCard({ plan, onUpdate }: PlanCardProps) {
    const [showPreview, setShowPreview] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const savings = plan.key === 'quarterly' ? 10 : plan.key === 'yearly' ? 30 : 0;

    const handleSave = async (updatedPlan: SubscriptionPlan) => {
        try {
            // تحويل البيانات من format الصفحة إلى format PricingService
            const planToSave = {
                id: updatedPlan.id,
                title: updatedPlan.name,
                subtitle: plan.id.includes('3months') ? 'للتجربة والبداية' :
                    plan.id.includes('6months') ? 'الخيار الأذكى' :
                        plan.id.includes('annual') ? 'أفضل قيمة وتوفير' : '',
                period: plan.id.includes('3months') ? '3 شهور' :
                    plan.id.includes('6months') ? '6 شهور' :
                        plan.id.includes('annual') ? '12 شهر' : '',
                base_currency: 'USD' as const,
                base_original_price: updatedPlan.basePrice * 1.5, // افتراض أن السعر الأصلي أعلى
                base_price: updatedPlan.basePrice,
                features: updatedPlan.features.map(f => f.name),
                bonusFeatures: updatedPlan.bonusFeatures.map(b => b.name),
                popular: plan.id.includes('6months'),
                icon: plan.id.includes('3months') ? '📅' :
                    plan.id.includes('6months') ? '👑' :
                        plan.id.includes('annual') ? '⭐' : '📅',
                color: plan.id.includes('3months') ? 'blue' as const :
                    plan.id.includes('6months') ? 'purple' as const :
                        plan.id.includes('annual') ? 'emerald' as const : 'blue' as const,
                overrides: {}, // سيتم إدارتها من تبويب الأسعار المخصصة
                isActive: updatedPlan.isActive,
                order: updatedPlan.displayOrder
            };

            await PricingService.updatePlan(planToSave as any);
            toast.success('✅ تم حفظ التعديلات بنجاح');
            onUpdate(); // إعادة تحميل البيانات
        } catch (error) {
            console.error('خطأ في حفظ الباقة:', error);
            toast.error('❌ فشل في حفظ التعديلات');
        }
    };

    return (
        <>
            <motion.div
                whileHover={{ y: -4 }}
                className="relative p-6 bg-white rounded-xl border-2 border-gray-200 shadow-sm transition-all hover:shadow-lg"
            >
                {savings > 0 && (
                    <div className="absolute top-0 left-0 px-3 py-1 text-xs font-bold text-white bg-gradient-to-r from-green-500 to-emerald-500 rounded-tr-xl rounded-bl-xl">
                        وفر {savings}%
                    </div>
                )}

                <div className="mb-4 text-center">
                    <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                    <div className="flex justify-center items-baseline gap-1 mt-2">
                        <span className="text-4xl font-black text-blue-600">${plan.basePrice}</span>
                        <span className="text-gray-500">/</span>
                        <span className="text-sm text-gray-500">{plan.duration} يوم</span>
                    </div>
                </div>

                {/* Features Count */}
                <div className="flex gap-4 justify-center items-center py-3 mb-4 border-t border-b border-gray-100">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{plan.features?.length || 0}</p>
                        <p className="text-xs text-gray-500">ميزة</p>
                    </div>
                    <div className="w-px h-8 bg-gray-200" />
                    <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{plan.bonusFeatures?.length || 0}</p>
                        <p className="text-xs text-gray-500">مكافأة</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setShowEdit(true)}
                        className="flex flex-1 gap-2 justify-center items-center px-4 py-2 text-blue-600 bg-blue-50 rounded-lg transition-colors hover:bg-blue-100"
                    >
                        <Edit2 className="w-4 h-4" />
                        تعديل
                    </button>
                    <button
                        onClick={() => setShowPreview(true)}
                        className="flex gap-2 justify-center items-center px-4 py-2 text-gray-600 bg-gray-50 rounded-lg transition-colors hover:bg-gray-100"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex gap-2 justify-center items-center mt-4">
                    <div className={`w-2 h-2 rounded-full ${plan.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="text-sm text-gray-600">{plan.isActive ? 'نشط' : 'معطل'}</span>
                </div>
            </motion.div>

            {/* Edit Modal */}
            <EditPlanModal
                plan={plan}
                isOpen={showEdit}
                onClose={() => setShowEdit(false)}
                onSave={handleSave}
            />

            {/* Preview Modal */}
            <PlanPreviewModal
                plan={plan}
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
            />
        </>
    );
}

// ==================== PLAN PREVIEW MODAL ====================

interface PlanPreviewModalProps {
    plan: SubscriptionPlan;
    isOpen: boolean;
    onClose: () => void;
}

function PlanPreviewModal({ plan, isOpen, onClose }: PlanPreviewModalProps) {
    if (!isOpen) return null;

    const savings = plan.key === 'quarterly' ? 10 : plan.key === 'yearly' ? 30 : 0;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-black/50">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="overflow-hidden w-full max-w-3xl bg-white rounded-2xl shadow-2xl"
                >
                    {/* Header */}
                    <div className="relative p-6 bg-gradient-to-r from-blue-600 to-blue-700">
                        <button
                            onClick={onClose}
                            className="absolute top-4 left-4 p-2 text-white rounded-lg transition-colors hover:bg-white/20"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        {savings > 0 && (
                            <div className="absolute top-4 right-4 px-3 py-1 text-xs font-bold text-green-600 bg-white rounded-full">
                                وفر {savings}%
                            </div>
                        )}

                        <div className="text-center text-white">
                            <h2 className="text-3xl font-bold">{plan.name}</h2>
                            <div className="flex justify-center items-baseline gap-2 mt-4">
                                <span className="text-5xl font-black">${plan.basePrice}</span>
                                <span className="text-lg opacity-80">/ {plan.duration} يوم</span>
                            </div>
                            <p className="mt-2 text-sm opacity-90">{plan.currency}</p>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="overflow-y-auto p-6 max-h-[60vh]">
                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="p-4 text-center bg-blue-50 rounded-lg">
                                <p className="text-2xl font-bold text-blue-600">{plan.duration}</p>
                                <p className="text-xs text-gray-600">يوم</p>
                            </div>
                            <div className="p-4 text-center bg-green-50 rounded-lg">
                                <p className="text-2xl font-bold text-green-600">{plan.features?.length || 0}</p>
                                <p className="text-xs text-gray-600">ميزة</p>
                            </div>
                            <div className="p-4 text-center bg-purple-50 rounded-lg">
                                <p className="text-2xl font-bold text-purple-600">{plan.bonusFeatures?.length || 0}</p>
                                <p className="text-xs text-gray-600">مكافأة</p>
                            </div>
                        </div>

                        {/* Features */}
                        {plan.features && plan.features.length > 0 && (
                            <div className="mb-6">
                                <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-gray-900">
                                    <Check className="w-5 h-5 text-blue-600" />
                                    الميزات الأساسية
                                </h3>
                                <div className="space-y-3">
                                    {plan.features.map((feature, index) => (
                                        <motion.div
                                            key={feature.id || index}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg"
                                        >
                                            <div className="flex-shrink-0 p-1 mt-0.5 bg-blue-100 rounded-full">
                                                <Check className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900">
                                                    {typeof feature === 'string' ? feature : feature?.name || ''}
                                                </p>
                                                {typeof feature === 'object' && feature?.description && (
                                                    <p className="mt-1 text-sm text-gray-600">{feature.description}</p>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Bonus Features */}
                        {plan.bonusFeatures && plan.bonusFeatures.length > 0 && (
                            <div>
                                <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-gray-900">
                                    <Star className="w-5 h-5 text-yellow-500" />
                                    الميزات الإضافية (المكافآت)
                                </h3>
                                <div className="space-y-3">
                                    {plan.bonusFeatures.map((bonus, index) => (
                                        <motion.div
                                            key={bonus.id || index}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: (plan.features?.length || 0) * 0.05 + index * 0.05 }}
                                            className="flex gap-3 items-start p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg"
                                        >
                                            <div className="flex-shrink-0 p-1 mt-0.5 bg-yellow-100 rounded-full">
                                                <Star className="w-4 h-4 text-yellow-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900">
                                                    {typeof bonus === 'string' ? bonus : bonus?.name || ''}
                                                </p>
                                                {typeof bonus === 'object' && bonus?.description && (
                                                    <p className="mt-1 text-sm text-gray-600">{bonus.description}</p>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Empty State */}
                        {(!plan.features || plan.features.length === 0) && (!plan.bonusFeatures || plan.bonusFeatures.length === 0) && (
                            <div className="py-12 text-center text-gray-500">
                                <AlertCircle className="mx-auto mb-3 w-12 h-12 text-gray-400" />
                                <p>لم يتم إضافة ميزات لهذه الباقة بعد</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex gap-3 justify-between p-6 border-t border-gray-200 bg-gray-50">
                        <div className="flex gap-2 items-center">
                            <div className={`w-3 h-3 rounded-full ${plan.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <span className="text-sm font-medium text-gray-700">
                                {plan.isActive ? 'الباقة نشطة' : 'الباقة معطلة'}
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="px-6 py-2 font-medium text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700"
                        >
                            إغلاق
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

// ==================== CUSTOM PRICING TAB ====================

function CustomPricingTab() {
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState<string>('');
    const [showOverrideModal, setShowOverrideModal] = useState(false);
    const [editingOverride, setEditingOverride] = useState<{ code: string, data: any } | null>(null);

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

    const handleSaveOverride = async (overrideData: any) => {
        try {
            const currentPlan = plans.find(p => p.id === selectedPlan);
            if (!currentPlan) return;

            const updatedOverrides = {
                ...currentPlan.overrides,
                [overrideData.countryCode]: {
                    currency: overrideData.currency,
                    original_price: Number(overrideData.originalPrice),
                    price: Number(overrideData.price),
                    active: overrideData.active
                }
            };

            const updatedPlan = {
                ...currentPlan,
                overrides: updatedOverrides
            };

            await PricingService.updatePlan(updatedPlan);
            toast.success('✅ تم تحديث الأسعار المخصصة بنجاح');

            // تحديث الحالة المحلية
            setPlans(plans.map(p => p.id === selectedPlan ? updatedPlan : p));
            setShowOverrideModal(false);
            setEditingOverride(null);
        } catch (error) {
            console.error('Error saving override:', error);
            toast.error('❌ فشل حفظ التغييرات');
        }
    };

    const handleDeleteOverride = async (countryCode: string) => {
        if (!confirm(`هل أنت متأكد من حذف الأسعار المخصصة لدولة ${countryCode}؟`)) return;

        try {
            const currentPlan = plans.find(p => p.id === selectedPlan);
            if (!currentPlan) return;

            const updatedOverrides = { ...currentPlan.overrides };
            delete updatedOverrides[countryCode];

            const updatedPlan = {
                ...currentPlan,
                overrides: updatedOverrides
            };

            await PricingService.updatePlan(updatedPlan);
            toast.success('✅ تم حذف التسعير المخصص بنجاح');
            setPlans(plans.map(p => p.id === selectedPlan ? updatedPlan : p));
        } catch (error) {
            console.error('Error deleting override:', error);
            toast.error('❌ فشل الحذف');
        }
    };

    const currentPlan = plans.find(p => p.id === selectedPlan);

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
                    <h2 className="text-xl font-bold text-gray-900">الأسعار المخصصة حسب الدولة</h2>
                    <p className="mt-1 text-sm text-gray-600">تخصيص الأسعار لكل دولة بعملتها المحلية</p>
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
                    <button
                        onClick={() => {
                            setEditingOverride(null);
                            setShowOverrideModal(true);
                        }}
                        className="flex gap-2 items-center px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                        <Plus className="w-4 h-4" />
                        إضافة تسعير دولة
                    </button>
                </div>
            </div>

            <div className="p-4 mb-6 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex gap-3 items-start">
                    <AlertCircle className="flex-shrink-0 w-5 h-5 text-blue-600" />
                    <div className="text-sm text-blue-900">
                        <p className="font-semibold">ملاحظة مهمة</p>
                        <p className="mt-1">
                            الأسعار المخصصة لها الأولوية على الأسعار الأساسية. إذا لم يتم تحديد سعر مخصص، سيتم
                            استخدام السعر الأساسي مع التحويل التلقائي للعملة.
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-4 mb-6 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">السعر الأساسي (عالمي)</h3>
                <div className="flex gap-6 items-center">
                    <div>
                        <p className="text-xs text-gray-500">العملة</p>
                        <p className="text-lg font-bold text-gray-900">{currentPlan?.base_currency || 'USD'}</p>
                    </div>
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

            {currentPlan?.overrides && Object.keys(currentPlan.overrides).length > 0 ? (
                <div className="overflow-hidden bg-white rounded-lg border border-gray-200">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الدولة</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">العملة</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">السعر الأصلي</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">السعر</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {Object.entries(currentPlan.overrides).map(([code, override]: [string, any]) => (
                                    <tr key={code} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2 items-center">
                                                <span className="font-medium text-gray-900">{code}</span>
                                                <span className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                                                    مخصص
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-900">{override.currency}</td>
                                        <td className="px-6 py-4">
                                            <span className="text-gray-400 line-through">{override.original_price}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-lg font-bold text-green-600">{override.price}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${override.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                <div className={`w-2 h-2 rounded-full ${override.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                                                {override.active ? 'نشط' : 'معطل'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingOverride({ code, data: override });
                                                        setShowOverrideModal(true);
                                                    }}
                                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteOverride(code)}
                                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="p-12 text-center bg-gray-50 rounded-lg border-2 border-gray-200 border-dashed">
                    <Globe className="mx-auto w-12 h-12 text-gray-400" />
                    <p className="mt-4 text-gray-600">لا توجد أسعار مخصصة لهذه الباقة</p>
                    <p className="mt-2 text-sm text-gray-500">اضغط على &quot;إضافة تسعير دولة&quot; للبدء</p>
                </div>
            )}

            <EditOverrideModal
                isOpen={showOverrideModal}
                onClose={() => setShowOverrideModal(false)}
                onSave={handleSaveOverride}
                initialData={editingOverride}
            />
        </motion.div>
    );
}

// ==================== OFFERS TAB ====================

interface OffersTabProps {
    offers: PromotionalOffer[];
    plans: SubscriptionPlan[];
    onUpdate: () => void;
}

function OffersTab({ offers, plans, onUpdate }: OffersTabProps) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingOffer, setEditingOffer] = useState<PromotionalOffer | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        discountType: 'percentage' as 'percentage' | 'fixed',
        discountValue: 0,
        startDate: '',
        endDate: '',
        isActive: true,

        // نطاق العرض
        scope: 'all' as 'all' | 'accountTypes' | 'specificAccounts' | 'countries',
        targetAccountTypes: [] as ('club' | 'academy' | 'trainer' | 'agent' | 'player')[],
        targetAccountIds: [] as string[],
        targetCountries: [] as string[],

        // الباقات
        applicablePlans: [] as string[],

        // حدود الاستخدام
        usageLimitType: 'unlimited' as 'unlimited' | 'total' | 'perUser',
        totalUsageLimit: 0,
        perUserLimit: 1,

        // شروط إضافية
        minPlayers: 0,
        minAmount: 0
    });

    const handleCreateOffer = () => {
        setEditingOffer(null);
        setFormData({
            title: '',
            description: '',
            discountType: 'percentage',
            discountValue: 0,
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            isActive: true,

            // نطاق العرض
            scope: 'all',
            targetAccountTypes: [],
            targetAccountIds: [],
            targetCountries: [],

            // الباقات
            applicablePlans: [],

            // حدود الاستخدام
            usageLimitType: 'unlimited',
            totalUsageLimit: 0,
            perUserLimit: 1,

            // شروط
            minPlayers: 0,
            minAmount: 0
        });
        setShowCreateModal(true);
    };

    const handleEditOffer = (offer: PromotionalOffer) => {
        setEditingOffer(offer);
        setFormData({
            title: offer.title,
            description: offer.description || '',
            discountType: offer.discountType,
            discountValue: offer.discountValue,
            startDate: typeof offer.startDate === 'string' ? offer.startDate : new Date(offer.startDate).toISOString().split('T')[0],
            endDate: typeof offer.endDate === 'string' ? offer.endDate : new Date(offer.endDate).toISOString().split('T')[0],
            isActive: offer.isActive,
            scope: offer.scope,
            targetAccountTypes: offer.targetAccountTypes || [],
            targetAccountIds: offer.targetAccountIds || [],
            targetCountries: offer.targetCountries || [],
            applicablePlans: offer.applicablePlans || [],
            usageLimitType: offer.usageLimitType,
            totalUsageLimit: offer.totalUsageLimit || 0,
            perUserLimit: offer.perUserLimit || 1,
            minPlayers: offer.minPlayers || 0,
            minAmount: offer.minAmount || 0
        });
        setShowCreateModal(true);
    };

    const handleDeleteOffer = async (offerId: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا العرض؟')) return;

        try {
            console.log('🗑️ بدء حذف العرض:', offerId);
            const offerDoc = doc(db, 'promotional_offers', offerId);
            await deleteDoc(offerDoc);
            console.log('✅ تم حذف العرض بنجاح من Firebase');
            toast.success('✅ تم حذف العرض بنجاح');

            // إعادة تحميل البيانات
            console.log('🔄 إعادة تحميل البيانات...');
            await onUpdate();
        } catch (error: any) {
            console.error('❌ خطأ في حذف العرض:', error);
            console.error('تفاصيل الخطأ:', error?.message, error?.code);
            toast.error(`❌ فشل في حذف العرض: ${error?.message || 'خطأ غير معروف'}`);
        }
    };

    const handleSaveOffer = async () => {
        try {
            if (!formData.title || !formData.discountValue) {
                toast.error('❌ يرجى ملء جميع الحقول المطلوبة');
                return;
            }

            const offerData = {
                title: formData.title,
                name: formData.title,
                description: formData.description,
                code: formData.code || null,  // ← إضافة الكود (أو null إذا كان فارغاً)
                discountType: formData.discountType,
                discountValue: formData.discountValue,
                startDate: formData.startDate,
                endDate: formData.endDate,
                isActive: formData.isActive,
                scope: formData.scope,
                targetAccountTypes: formData.targetAccountTypes,
                targetAccountIds: formData.targetAccountIds,
                targetCountries: formData.targetCountries,
                applicablePlans: formData.applicablePlans,
                usageLimitType: formData.usageLimitType,
                totalUsageLimit: formData.totalUsageLimit,
                perUserLimit: formData.perUserLimit,
                usageCount: editingOffer?.usageCount || 0,
                minPlayers: formData.minPlayers,
                minAmount: formData.minAmount
            };

            if (editingOffer) {
                // تعديل عرض موجود
                console.log('✏️ تحديث العرض:', editingOffer.id);
                const offerDoc = doc(db, 'promotional_offers', editingOffer.id);
                // استخدام setDoc مع merge بدلاً من updateDoc
                await setDoc(offerDoc, {
                    ...offerData,
                    updatedAt: serverTimestamp()
                }, { merge: true });
                toast.success('✅ تم تحديث العرض بنجاح');
            } else {
                // إنشاء عرض جديد
                const offersRef = collection(db, 'promotional_offers');
                // لا نضيف id في البيانات - Firebase سيعطينا document ID تلقائياً
                await addDoc(offersRef, {
                    ...offerData,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
                toast.success('✅ تم إنشاء العرض الترويجي بنجاح');
            }

            setShowCreateModal(false);
            setEditingOffer(null);
            await onUpdate();
        } catch (error: any) {
            console.error('❌ خطأ في حفظ العرض:', error);
            console.error('تفاصيل الخطأ:', error?.message, error?.code);

            if (error?.code === 'not-found' || error?.message?.includes('No document')) {
                toast.error('❌ العرض غير موجود - ربما تم حذفه. جرِّب تحديث الصفحة');
            } else {
                toast.error(`❌ فشل في حفظ العرض: ${error?.message || 'خطأ غير معروف'}`);
            }
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
        >
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">العروض الترويجية</h2>
                    <p className="mt-1 text-sm text-gray-600">إدارة العروض والخصومات محددة المدة</p>
                </div>
                <button
                    onClick={handleCreateOffer}
                    className="flex gap-2 items-center px-4 py-2 text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg transition-all hover:shadow-lg"
                >
                    <Plus className="w-4 h-4" />
                    إنشاء عرض جديد
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {offers.length > 0 ? (
                    offers.map((offer) => (
                        <div key={offer.id} className="p-6 bg-white rounded-lg border shadow-sm">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="text-lg font-semibold text-gray-900">{offer.title}</h3>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${offer.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                    }`}>
                                    {offer.isActive ? 'نشط' : 'معطل'}
                                </span>
                            </div>
                            <p className="mb-3 text-sm text-gray-600">{offer.description}</p>
                            <div className="mb-4 text-sm text-gray-500">
                                <div>الخصم: {offer.discountValue}{offer.discountType === 'percentage' ? '%' : ' USD'}</div>
                                <div>من {new Date(offer.startDate).toLocaleDateString('ar-EG')} إلى {new Date(offer.endDate).toLocaleDateString('ar-EG')}</div>
                            </div>

                            {/* أزرار التعديل والحذف */}
                            <div className="flex gap-2 pt-3 border-t border-gray-200">
                                <button
                                    onClick={() => handleEditOffer(offer)}
                                    className="flex flex-1 gap-2 justify-center items-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg transition-colors hover:bg-blue-100"
                                >
                                    <Edit className="w-4 h-4" />
                                    تعديل
                                </button>
                                <button
                                    onClick={() => handleDeleteOffer(offer.id)}
                                    className="flex flex-1 gap-2 justify-center items-center px-3 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg transition-colors hover:bg-red-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    حذف
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-2 p-12 text-center bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 border-dashed">
                        <Gift className="mx-auto w-12 h-12 text-green-600" />
                        <p className="mt-4 text-gray-900 font-semibold">لا توجد عروض فعالة حالياً</p>
                        <p className="mt-2 text-sm text-gray-600">ابدأ بإنشاء عرضك الترويجي الأول</p>
                    </div>
                )}
            </div>

            {/* Modal إنشاء عرض - المكون الجديد المتقدم */}
            <CreateOfferModal
                isOpen={showCreateModal}
                formData={formData}
                availablePlans={plans}
                isEditing={!!editingOffer}
                onClose={() => setShowCreateModal(false)}
                onSave={handleSaveOffer}
                onChange={setFormData}
            />
        </motion.div>
    );
}

// ==================== PARTNERS TAB ====================

interface PartnersTabProps {
    partners: Partner[];
    onUpdate: () => void;
}

function PartnersTab({ partners, onUpdate }: PartnersTabProps) {
    const [showModal, setShowModal] = useState(false);
    const [editingPartner, setEditingPartner] = useState<Partner | null>(null);

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا الشريك؟')) return;
        try {
            await deleteDoc(doc(db, 'partners', id));
            toast.success('تم حذف الشريك');
            onUpdate();
        } catch (error) {
            toast.error('خطأ في الحذف');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
        >
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">الشركاء والأسعار الخاصة</h2>
                    <p className="mt-1 text-sm text-gray-600">إدارة الشركاء والأسعار غير المعلنة</p>
                </div>
                <button
                    onClick={() => { setEditingPartner(null); setShowModal(true); }}
                    className="flex gap-2 items-center px-4 py-2 text-white bg-purple-600 rounded-lg transition-colors hover:bg-purple-700"
                >
                    <Plus className="w-4 h-4" />
                    إضافة شريك جديد
                </button>
            </div>

            {partners.length === 0 ? (
                <div className="p-12 text-center bg-purple-50 rounded-lg border-2 border-purple-200 border-dashed">
                    <Users className="mx-auto w-12 h-12 text-purple-600" />
                    <p className="mt-4 text-gray-900 font-semibold">لا يوجد شركاء حالياً</p>
                    <p className="mt-2 text-sm text-gray-600">ميزة الشركاء تتيح لك إنشاء أسعار خاصة للهيئات والجهات الحكومية</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {partners.map(partner => (
                        <div key={partner.id} className="p-6 bg-white rounded-lg border shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                                            <Users className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">{partner.partnerName}</h3>
                                            <p className="text-xs text-gray-500 font-mono">{partner.partnerCode}</p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 text-xs rounded-full ${partner.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {partner.status === 'active' ? 'نشط' : 'غير نشط'}
                                    </span>
                                </div>
                                <div className="space-y-2 mb-4">
                                    <p className="text-sm text-gray-600 flex justify-between">
                                        <span>نوع الشراكة:</span>
                                        <span className="font-medium">{partner.partnerType}</span>
                                    </p>
                                    <p className="text-sm text-gray-600 flex justify-between">
                                        <span>الاشتراكات النشطة:</span>
                                        <span className="font-medium">{partner.activeSubscriptions || 0}</span>
                                    </p>
                                    {partner.customPricing && (
                                        <div className="bg-gray-50 p-2 rounded text-xs mt-2">
                                            <p className="font-bold mb-1">أسعار خاصة:</p>
                                            {partner.customPricing.monthly && <p>شهري: ${partner.customPricing.monthly}</p>}
                                            {partner.customPricing.quarterly && <p>3 شهور: ${partner.customPricing.quarterly}</p>}
                                            {partner.customPricing.yearly && <p>سنوي: ${partner.customPricing.yearly}</p>}
                                            {!partner.customPricing.monthly && !partner.customPricing.yearly && <p>لا توجد أسعار محددة</p>}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2 pt-3 border-t">
                                <button
                                    onClick={() => { setEditingPartner(partner); setShowModal(true); }}
                                    className="flex-1 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                                >
                                    تعديل
                                </button>
                                <button
                                    onClick={() => handleDelete(partner.id)}
                                    className="flex-1 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                                >
                                    حذف
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <CreatePartnerModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                partner={editingPartner}
                onSuccess={onUpdate}
            />
        </motion.div>
    );
}

// ==================== MODALS ====================

function CreatePartnerModal({ isOpen, onClose, partner, onSuccess }: any) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<Partner>>({
        partnerName: '',
        partnerCode: '',
        partnerType: 'league',
        status: 'active',
        isPublic: false,
        customPricing: { quarterly: 0, sixMonths: 0, yearly: 0 }
    });

    useEffect(() => {
        if (partner) {
            setFormData(partner);
        } else {
            setFormData({
                partnerName: '',
                partnerCode: '',
                partnerType: 'league',
                status: 'active',
                isPublic: false,
                customPricing: { quarterly: 0, sixMonths: 0, yearly: 0 }
            });
        }
    }, [partner, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const dataToSave = {
                ...formData,
                updatedAt: serverTimestamp()
            };

            if (partner?.id) {
                await updateDoc(doc(db, 'partners', partner.id), dataToSave);
                toast.success('تم تحديث الشريك');
            } else {
                await addDoc(collection(db, 'partners'), {
                    ...dataToSave,
                    activeSubscriptions: 0,
                    totalRevenue: 0,
                    createdAt: serverTimestamp()
                });
                toast.success('تم إضافة شريك جديد');
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('حدث خطأ');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                <div className="px-6 py-4 bg-purple-600 text-white flex justify-between items-center">
                    <h3 className="font-bold text-lg">{partner ? 'تعديل شريك' : 'إضافة شريك جديد'}</h3>
                    <button onClick={onClose}><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 max-h-[80vh] overflow-y-auto">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">اسم الشريك</label>
                            <input required type="text" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" value={formData.partnerName} onChange={e => setFormData({ ...formData, partnerName: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                كود الشريك (Partner Code)
                                <span className="text-xs text-gray-500 font-normal mr-2">• سيستخدمه العملاء للحصول على الأسعار المخصصة</span>
                            </label>
                            <div className="mt-1 flex gap-2">
                                <input
                                    required
                                    type="text"
                                    className="block flex-1 rounded-md border border-gray-300 px-3 py-2 uppercase font-mono"
                                    value={formData.partnerCode}
                                    onChange={e => setFormData({ ...formData, partnerCode: e.target.value.toUpperCase() })}
                                    placeholder="مثال: SAFF2024"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const randomCode = `PARTNER${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                                        setFormData({ ...formData, partnerCode: randomCode });
                                    }}
                                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium whitespace-nowrap"
                                >
                                    توليد كود
                                </button>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">💡 نصيحة: اختر كوداً سهل التذكر مثل اسم الشريك + السنة</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">النوع</label>
                                <select className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" value={formData.partnerType} onChange={e => setFormData({ ...formData, partnerType: e.target.value as any })}>
                                    <option value="federation">اتحاد</option>
                                    <option value="league">دوري</option>
                                    <option value="government">جهة حكومية</option>
                                    <option value="corporate">شركة</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">الحالة</label>
                                <select className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}>
                                    <option value="active">نشط</option>
                                    <option value="inactive">غير نشط</option>
                                </select>
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                    checked={formData.isPublic}
                                    onChange={e => setFormData({ ...formData, isPublic: e.target.checked })}
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    كود عام (Public Code)
                                </span>
                            </label>
                            <p className="mt-1 mr-6 text-xs text-gray-500">
                                ✅ في حالة التفعيل: يمكن للجميع استخدام الكود<br />
                                ❌ في حالة عدم التفعيل: كود خاص فقط للجهات المعتمدة
                            </p>
                        </div>

                        <div className="border-t pt-4 mt-2">
                            <h4 className="font-bold text-sm text-gray-900 mb-3">أسعار خاصة (اختياري - بالدولار)</h4>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs text-gray-500">3 شهور</label>
                                    <input type="number" className="w-full border rounded p-1" value={formData.customPricing?.quarterly || 0} onChange={e => setFormData({ ...formData, customPricing: { ...formData.customPricing, quarterly: Number(e.target.value) } })} />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">6 شهور</label>
                                    <input type="number" className="w-full border rounded p-1" value={formData.customPricing?.sixMonths || 0} onChange={e => setFormData({ ...formData, customPricing: { ...formData.customPricing, sixMonths: Number(e.target.value) } })} />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">سنوي (12 شهر)</label>
                                    <input type="number" className="w-full border rounded p-1" value={formData.customPricing?.yearly || 0} onChange={e => setFormData({ ...formData, customPricing: { ...formData.customPricing, yearly: Number(e.target.value) } })} />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-2">
                            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">إلغاء</button>
                            <button disabled={loading} type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">{loading ? 'جاري الحفظ...' : 'حفظ'}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

function EditOverrideModal({ isOpen, onClose, onSave, initialData }: any) {
    const [formData, setFormData] = useState({
        countryCode: '',
        currency: 'USD',
        originalPrice: 0,
        price: 0,
        active: true
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                countryCode: initialData.code,
                currency: initialData.data.currency,
                originalPrice: initialData.data.original_price,
                price: initialData.data.price,
                active: initialData.data.active
            });
        } else {
            setFormData({
                countryCode: '',
                currency: 'USD',
                originalPrice: 0,
                price: 0,
                active: true
            });
        }
    }, [initialData, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-900">{initialData ? 'تعديل تسعير' : 'إضافة تسعير دولة'}</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">كود الدولة (ISO)</label>
                        <input
                            type="text"
                            required
                            placeholder="مثال: EG, SA, AE"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase"
                            value={formData.countryCode}
                            disabled={!!initialData}
                            onChange={(e) => setFormData({ ...formData, countryCode: e.target.value.toUpperCase() })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">العملة</label>
                        <input
                            type="text"
                            required
                            placeholder="XXX"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase"
                            value={formData.currency}
                            onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">السعر الأصلي</label>
                            <input
                                type="number"
                                required
                                min="0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                value={formData.originalPrice}
                                onChange={(e) => setFormData({ ...formData, originalPrice: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">السعر بعد الخصم</label>
                            <input
                                type="number"
                                required
                                min="0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={formData.active}
                            onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                            id="activeOverride"
                        />
                        <label htmlFor="activeOverride" className="text-sm text-gray-700 select-none">تفعيل هذا التسعير</label>
                    </div>
                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">إلغاء</button>
                        <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">حفظ Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
