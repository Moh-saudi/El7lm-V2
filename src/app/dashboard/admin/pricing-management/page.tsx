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
    RefreshCcw,
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
import { Button } from "@/components/ui/button";
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
import { useAbility } from '@/hooks/useAbility';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import AccessDenied from '@/components/admin/AccessDenied';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

// ==================== INTERFACES ====================

interface SubscriptionPlan {
    id: string;
    title?: string;
    subtitle?: string;
    period?: string;
    base_currency?: string;
    base_original_price?: number;
    base_price?: number;
    features: any[];
    bonusFeatures?: any[];
    isActive: boolean;
    popular?: boolean;
    icon?: string;
    color?: string;
    overrides?: Record<string, any>;
    accountTypeOverrides?: Record<string, any>;
    order?: number;
    guidelines?: any;
    // UI/Legacy fields used in the components
    name?: string;
    key?: string;
    basePrice?: number;
    currency?: string;
    duration?: number;
    displayOrder?: number;
}

interface PromotionalOffer {
    id: string;
    title: string;
    name: string;
    description: string;
    code?: string;
    offerType?: 'flash_sale' | 'seasonal' | 'partnership' | 'early_bird';

    // Discount
    discountType: 'percentage' | 'fixed';
    discountValue: number;

    // Dates
    startDate: string | Date;
    endDate: string | Date;

    // Status
    isActive: boolean;
    status?: 'draft' | 'scheduled' | 'active' | 'expired' | 'paused';

    // Offer Scope
    scope: 'all' | 'accountTypes' | 'specificAccounts' | 'countries';
    targetAccountTypes?: ('club' | 'academy' | 'trainer' | 'agent' | 'player')[]; // if scope = accountTypes
    targetAccountIds?: string[];  // if scope = specificAccounts
    targetCountries?: string[];   // if scope = countries

    // Applicable Plans
    applicablePlans: string[];  // [] = all plans, or specific IDs

    // Usage Limits
    usageLimitType: 'unlimited' | 'total' | 'perUser';
    totalUsageLimit?: number;     // if usageLimitType = total
    perUserLimit?: number;        // if usageLimitType = perUser (usually 1)
    usageCount?: number;          // العدد الحالي للاستخدامات

    // Additional conditions
    minPlayers?: number;          // Min player count
    minAmount?: number;           // Min amount (USD)

    // display
    displayBadge?: string;
    displayColor?: string;
}

interface Partner {
    id: string;
    partnerName: string;
    partnerCode: string;
    partnerType: 'federation' | 'league' | 'government' | 'corporate';
    customPricing: {
        monthly?: number;     // شهري
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
    const { can } = useAbility();
    const { user } = useAuth();

    const [activeTab, setActiveTab] = useState<'plans' | 'custom' | 'accountTypes' | 'guidelines' | 'offers' | 'partners' | 'payments'>('plans');
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

    if (!can('read', 'pricing')) {
        return <AccessDenied resource="إدارة الأسعار" />;
    }

    const handleApplyRecommendedPlans = async () => {
        if (!confirm('This will update Kickoff, Pro, and Dream plans. Are you sure?')) return;
        setLoading(true);
        try {
            const plansToUpdate = [
                {
                    id: 'subscription_3months',
                    title: 'باقة الانطلاقة (The Kickoff)',
                    subtitle: 'للتجربة والبداية',
                    period: '3 شهور',
                    base_currency: 'USD',
                    base_original_price: 30,
                    base_price: 20,
                    features: [
                        'ملف رياضي موثق وعلامة "لاعب نشط"',
                        'مساحة تخزين تصل إلى 5 فيديوهات مهارات HD',
                        'إضافة الإحصائيات الأساسية (الطول، الوزن، المراكز)',
                        'الظهور في نتائج البحث العامة للأندية والوكلاء',
                        'إمكانية رفع وتحديث السجل الطبي الأساسي'
                    ],
                    bonusFeatures: [],
                    popular: false,
                    icon: '📅',
                    color: 'blue',
                    isActive: true,
                    order: 1
                },
                {
                    id: 'subscription_6months',
                    title: 'باقة الاحتراف (The Pro)',
                    subtitle: 'الخيار الأذكى',
                    period: '6 شهور',
                    base_currency: 'USD',
                    base_original_price: 55,
                    base_price: 35,
                    features: [
                        'ملف رياضي موثق وعلامة "لاعب نشط"',
                        'مساحة تخزين تصل إلى 5 فيديوهات مهارات HD',
                        'إضافة الإحصائيات الأساسية (الطول، الوزن، المراكز)',
                        'الظهور في نتائج البحث العامة للأندية والوكلاء',
                        'إمكانية رفع وتحديث السجل الطبي الأساسي',
                        'أولوية الظهور في مقدمة نتائج البحث للوكلاء',
                        'تحليلات أداء ذكية ورسوم بيانية تفاعلية للنقاط القوية',
                        'تنبيهات فورية عند قيام كشاف أو نادي بزيارة ملفك',
                        'معرض صور احترافي للمباريات والتدريبات الرسمية',
                        'دعم فني مخصص مع أولوية في الرد على الاستفسارات'
                    ],
                    bonusFeatures: [],
                    popular: true,
                    icon: '👑',
                    color: 'purple',
                    isActive: true,
                    order: 2
                },
                {
                    id: 'subscription_annual',
                    title: 'باقة الحلم (The Dream)',
                    subtitle: 'أفضل قيمة وتوفير',
                    period: '12 شهر',
                    base_currency: 'USD',
                    base_original_price: 80,
                    base_price: 50,
                    features: [
                        'ملف رياضي موثق وعلامة "لاعب نشط"',
                        'مساحة تخزين تصل إلى 5 فيديوهات مهارات HD',
                        'إضافة الإحصائيات الأساسية (الطول، الوزن، المراكز)',
                        'الظهور في نتائج البحث العامة للأندية والوكلاء',
                        'إمكانية رفع وتحديث السجل الطبي الأساسي',
                        'أولوية الظهور في مقدمة نتائج البحث للوكلاء',
                        'تحليلات أداء ذكية ورسوم بيانية تفاعلية للنقاط القوية',
                        'تنبيهات فورية عند قيام كشاف أو نادي بزيارة ملفك',
                        'معرض صور احترافي للمباريات والتدريبات الرسمية',
                        'دعم فني مخصص مع أولوية في الرد على الاستفسارات',
                        'ظهور مميز في قسم "مواهب الأسبوع" بالصفحة الرئيسية',
                        'خاصية التواصل المباشر وإرسال السيرة الذاتية للوكلاء',
                        'خدمة مونتاج فيديو "أفضل المهارات" بشكل احترافي',
                        'أولوية التسجيل وحجز المقاعد في تجارب الأداء الواقعية',
                        'شارة "نخبة الحلم" الذهبية لتمييز الملف أمام الكشافين',
                        'تقرير تقييم نصف سنوي مفصل مدعوم بالذكاء الاصطناعي'
                    ],
                    bonusFeatures: [],
                    popular: false,
                    icon: '⭐',
                    color: 'emerald',
                    isActive: true,
                    order: 3
                }
            ];

            for (const plan of plansToUpdate) {
                await PricingService.updatePlan(plan as any);
            }

            toast.success('Plans updated successfully');
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Error updating plans');
        } finally {
            setLoading(false);
        }
    };

    async function loadData() {
        setLoading(true);
        try {
            console.log('📦 Loading plans from Firebase...');
            const plansData = await PricingService.getAllPlans();

            if (!plansData || plansData.length === 0) {
                console.log('⚠️ No plans found - use init button');
                setPlans([]);
            } else {
                console.log(`✅ Loaded ${plansData.length} plans successfully`);
                // Convert from PricingService format to page format
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
                    period: plan.period || (plan.id.includes('3months') ? '3 شهور' :
                        plan.id.includes('6months') ? '6 شهور' :
                            plan.id.includes('annual') ? '12 شهر' : 'شهر'),
                    features: Array.isArray(plan.features)
                        ? plan.features.map((f: any, i) => ({
                            id: `f${i}`,
                            name: typeof f === 'string' ? f : f?.name || '',
                            description: typeof f === 'object' && f?.description ? f.description : undefined,
                            included: true
                        }))
                        : [],
                    bonusFeatures: Array.isArray(plan.bonusFeatures)
                        ? plan.bonusFeatures.map((b: any, i) => ({
                            id: `b${i}`,
                            name: typeof b === 'string' ? b : b?.name || '',
                            description: typeof b === 'object' && b?.description ? b.description : undefined,
                            included: true
                        }))
                        : [],
                    isActive: plan.isActive ?? true,
                    displayOrder: plan.order ?? 0
                }));

                setPlans(convertedPlans);
                console.log('📊 Data ready for display');
            }

            // Load promotional offers
            console.log('🎁 Loading promotional offers...');
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
            console.log(`✅ Loaded ${offersData.length} offers`);

            // Load partners
            console.log('🤝 Loading partners...');
            const partnersRef = collection(db, 'partners');
            const partnersQuery = query(partnersRef, orderBy('createdAt', 'desc'));
            const partnersSnapshot = await getDocs(partnersQuery);

            const partnersData = partnersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Partner[];

            setPartners(partnersData);
            console.log(`✅ Loaded ${partnersData.length} partners`);

        } catch (error) {
            console.error('❌ Error loading data:', error);
            toast.error('Failed to load data from Firebase');
            setPlans([]);
            setOffers([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            {/* 1. Dynamic Premium Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden bg-slate-900 rounded-[3rem] p-10 mx-6 mt-8 border border-white/10 shadow-2xl"
            >
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-600/10 to-transparent pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-6">
                        <div className="p-5 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[2rem] shadow-xl shadow-blue-500/20">
                            <DollarSign className="w-10 h-10 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
                                مركز التحكم <span className="text-blue-400">بالأسعار</span>
                            </h1>
                            <p className="text-slate-400 font-medium mt-2 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                إدارة الباقات، العروض الترويجية، وشركاء الاستراتيجية
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button variant="ghost" className="h-14 px-8 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 backdrop-blur-md font-bold transition-all" onClick={loadData}>
                            <RefreshCcw className={`w-5 h-5 ml-2 ${loading ? 'animate-spin' : ''}`} />
                            تحديث البيانات
                        </Button>

                        <Dialog open={showInitModal} onOpenChange={setShowInitModal}>
                            <DialogTrigger asChild>
                                <Button className="h-14 px-10 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-xl shadow-blue-500/20 font-black tracking-widest transition-all active:scale-95">
                                    تهيئة النظام
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md bg-white/95 backdrop-blur-2xl border-white rounded-[2.5rem] p-8">
                                <DialogHeader className="mb-6">
                                    <DialogTitle className="text-2xl font-black text-slate-900">نظام تهيئة الأسعار</DialogTitle>
                                    <DialogDescription className="text-slate-500 font-medium mt-2">
                                        سيتم إعادة ضبط الباقات والتعريفات المالية للنظام الافتراضي.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-6">
                                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3 items-start">
                                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                        <p className="text-xs text-amber-900 font-bold leading-relaxed">تحذير: هذا الإجراء سيقوم بتعديل جميع الباقات الحالية للقيمة الموصى بها، هل أنت متأكد؟</p>
                                    </div>
                                    <Button
                                        onClick={handleApplyRecommendedPlans}
                                        disabled={loading}
                                        className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'بدء عملية التهيئة'}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </motion.div >

            <div className="px-6 py-12 mx-auto max-w-7xl">
                {/* 2. Enhanced Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card className="rounded-[2.5rem] border-white/40 bg-white/60 backdrop-blur-xl shadow-2xl shadow-slate-200/50 overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <div className="space-y-1">
                                    <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-widest">الباقات النشطة</CardTitle>
                                    <div className="text-4xl font-black text-slate-900">{stats.activePlans}</div>
                                </div>
                                <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 group-hover:rotate-12 transition-transform">
                                    <DollarSign className="w-6 h-6" />
                                </div>
                            </CardHeader>
                            <div className="h-1.5 w-full bg-blue-100 mt-4">
                                <div className="h-full bg-blue-600 rounded-r-full" style={{ width: '70%' }} />
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card className="rounded-[2.5rem] border-white/40 bg-white/60 backdrop-blur-xl shadow-2xl shadow-slate-200/50 overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <div className="space-y-1">
                                    <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-widest">العروض الترويجية</CardTitle>
                                    <div className="text-4xl font-black text-slate-900">{stats.activeOffers}</div>
                                </div>
                                <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:rotate-12 transition-transform">
                                    <Gift className="w-6 h-6" />
                                </div>
                            </CardHeader>
                            <div className="h-1.5 w-full bg-emerald-100 mt-4">
                                <div className="h-full bg-emerald-600 rounded-r-full" style={{ width: '45%' }} />
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <Card className="rounded-[2.5rem] border-white/40 bg-white/60 backdrop-blur-xl shadow-2xl shadow-slate-200/50 overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <div className="space-y-1">
                                    <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-widest">الشركاء</CardTitle>
                                    <div className="text-4xl font-black text-slate-900">{stats.activePartners}</div>
                                </div>
                                <div className="p-4 bg-purple-50 rounded-2xl text-purple-600 group-hover:rotate-12 transition-transform">
                                    <Users className="w-6 h-6" />
                                </div>
                            </CardHeader>
                            <div className="h-1.5 w-full bg-purple-100 mt-4">
                                <div className="h-full bg-purple-600 rounded-r-full" style={{ width: '85%' }} />
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                        <Card className="rounded-[2.5rem] border-slate-900 bg-slate-900 shadow-2xl shadow-blue-900/20 overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <div className="space-y-1">
                                    <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-widest">الإيرادات المتوقعة</CardTitle>
                                    <div className="text-4xl font-black text-white">${stats.monthlyRevenue.toLocaleString()}</div>
                                </div>
                                <div className="p-4 bg-blue-500/20 rounded-2xl text-blue-400 group-hover:rotate-12 transition-transform">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                            </CardHeader>
                            <div className="px-6 pb-6">
                                <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Growth +12.5% this month</p>
                            </div>
                        </Card>
                    </motion.div>
                </div>

                {/* 3. Luxury Interactive Tabs */}
                <div className="space-y-10">
                    <div className="flex justify-center">
                        <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-[2rem] border border-white shadow-xl flex gap-1">
                            {[
                                { id: 'plans', label: 'الباقات الأساسية', icon: DollarSign },
                                { id: 'custom', label: 'التسعير الدولي', icon: Globe },
                                { id: 'offers', label: 'العروض', icon: Gift },
                                { id: 'partners', label: 'الشركاء', icon: Users },
                                { id: 'payments', label: 'إعدادات الدفع', icon: CreditCard },
                                { id: 'guidelines', label: 'الإرشادات', icon: Star },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`
                       px-6 py-3 rounded-[1.5rem] flex items-center gap-2 text-sm font-black transition-all
                       ${activeTab === tab.id
                                            ? 'bg-slate-900 text-white shadow-lg'
                                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                        }
                     `}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="min-h-[600px]"
                    >
                        {activeTab === 'plans' && <BasePlansTab plans={plans} onUpdate={loadData} />}
                        {activeTab === 'custom' && <CustomPricingTab />}
                        {activeTab === 'accountTypes' && <AccountTypePricingTab />}
                        {activeTab === 'guidelines' && <GuidelinesTab />}
                        {activeTab === 'offers' && <OffersTab offers={offers} plans={plans} onUpdate={loadData} />}
                        {activeTab === 'partners' && <PartnersTab partners={partners} onUpdate={loadData} />}
                        {activeTab === 'payments' && <PaymentSettingsTab />}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

// ==================== STATS CARD ====================
// (Removed separate component to use Card directly in grid above)

// ==================== TAB BUTTON ====================
// (Removed separate component to use inline buttons with framer-motion in grid above)

// ==================== BASE PLANS TAB ====================

interface BasePlansTabProps {
    plans: SubscriptionPlan[];
    onUpdate: () => void;
}

function BasePlansTab({ plans, onUpdate }: BasePlansTabProps) {
    const { can } = useAbility();
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-10"
        >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-900">الباقات الأساسية</h2>
                    <p className="mt-1 text-slate-500 font-medium">التعريفات المالية الشاملة لجميع أنواع العضويات</p>
                </div>
                {can('create', 'pricing') && (
                    <Button className="h-12 px-8 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-xl shadow-blue-500/20 font-bold gap-2">
                        <Plus className="w-5 h-5" />
                        إضافة باقة استراتيجية
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {plans.length > 0 ? (
                    plans.map((plan, index) => (
                        <PlanCard key={plan.id} plan={plan} onUpdate={onUpdate} index={index} />
                    ))
                ) : (
                    <div className="col-span-full py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
                        <AlertCircle className="w-16 h-16 text-slate-300 mb-4" />
                        <p className="text-slate-400 font-black text-lg">لا توجد باقات جاهزة حالياً</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// ==================== PLAN CARD ====================

interface PlanCardProps {
    plan: SubscriptionPlan;
    onUpdate: () => void;
    index: number;
}

function PlanCard({ plan, onUpdate, index }: PlanCardProps) {
    const { can } = useAbility();
    const [showPreview, setShowPreview] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Determine the theme based on plan key
    const theme = plan.key === 'yearly' ? {
        bg: 'from-slate-900 to-slate-800',
        accent: 'blue',
        text: 'text-white',
        desc: 'text-slate-400'
    } : plan.key === '6months' ? {
        bg: 'bg-white',
        accent: 'indigo',
        text: 'text-slate-900',
        desc: 'text-slate-500'
    } : {
        bg: 'bg-white',
        accent: 'blue',
        text: 'text-slate-900',
        desc: 'text-slate-500'
    };

    const handleSave = async (updatedPlan: SubscriptionPlan) => {
        try {
            const planToSave = {
                id: updatedPlan.id,
                title: updatedPlan.name,
                subtitle: plan.id.includes('3months') ? 'للتجربة والبداية' :
                    plan.id.includes('6months') ? 'الخيار الأذكى' :
                        plan.id.includes('annual') ? 'أفضل قيمة وتوفير' : '',
                period: updatedPlan.period,
                base_currency: 'USD' as const,
                base_original_price: updatedPlan.basePrice * 1.5,
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
                overrides: {},
                isActive: updatedPlan.isActive,
                order: updatedPlan.displayOrder
            };

            await PricingService.updatePlan(planToSave as any);
            toast.success('✅ تم حفظ التغييرات بنجاح');
            onUpdate();
        } catch (error) {
            console.error('Error saving plan:', error);
            toast.error('❌ فشل حفظ التغييرات');
        }
    };

    const handleDelete = async () => {
        if (!confirm('هل أنت متأكد من حذف هذه الباقة نهائياً؟')) return;
        setIsDeleting(true);
        try {
            await PricingService.deletePlan(plan.id);
            toast.success('✅ تم حذف الباقة بنجاح');
            onUpdate();
        } catch (error) {
            console.error('Error deleting plan:', error);
            toast.error('❌ فشل حذف الباقة');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -8 }}
                className="group relative"
            >
                <Card className={`overflow-hidden rounded-[3rem] border border-white/50 shadow-2xl transition-all duration-500 ${theme.bg} ${theme.text} p-2 flex flex-col h-full`}>
                    {/* Decorative Pattern */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                    <div className="relative z-10 flex flex-col h-full">
                        <CardHeader className="p-8 pb-0 space-y-0 relative">
                            <div className="flex justify-between items-start mb-10">
                                <div className={`p-4 rounded-2xl ${plan.key === 'yearly' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'} shadow-inner flex items-center justify-center`}>
                                    {plan.id.includes('annual') ? <Star className="w-8 h-8" /> : <DollarSign className="w-8 h-8" />}
                                </div>
                                {plan.id.includes('6months') && (
                                    <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-none py-2 px-5 rounded-full font-black text-[10px] tracking-widest uppercase shadow-xl shadow-blue-500/20 ring-2 ring-white/20">
                                        الأكثر طلباً
                                    </Badge>
                                )}
                            </div>

                            <div>
                                <CardTitle className="text-4xl font-black mb-2 tracking-tight">{plan.name}</CardTitle>
                                <CardDescription className={`text-[10px] font-black uppercase tracking-[0.25em] opacity-80 ${theme.desc} p-0`}>
                                    {plan.period}
                                </CardDescription>
                            </div>
                        </CardHeader>

                        <CardContent className="p-8 pt-10 flex-1">
                            <div className="flex items-baseline gap-2 mb-10">
                                <div className="flex flex-col">
                                    <span className="text-7xl font-black tabular-nums tracking-tighter leading-none">${plan.basePrice}</span>
                                    <span className={`text-[10px] font-bold opacity-40 uppercase tracking-[0.2em] italic mt-2`}>per {plan.duration} days base rate</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className={`p-5 rounded-3xl border transition-all hover:scale-[1.03] duration-300 ${plan.key === 'yearly' ? 'bg-white/5 border-white/10 hover:bg-white/10 shadow-inner' : 'bg-slate-50 border-slate-100 hover:bg-slate-100 shadow-sm'}`}>
                                    <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1.5 opacity-60 ${theme.desc}`}>الميزات</p>
                                    <p className="text-3xl font-black">{plan.features?.length || 0}</p>
                                </div>
                                <div className={`p-5 rounded-3xl border transition-all hover:scale-[1.03] duration-300 ${plan.key === 'yearly' ? 'bg-white/5 border-white/10 hover:bg-white/10 shadow-inner' : 'bg-slate-50 border-slate-100 hover:bg-slate-100 shadow-sm'}`}>
                                    <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1.5 opacity-60 ${theme.desc}`}>المكافآت</p>
                                    <p className="text-3xl font-black text-emerald-500">{plan.bonusFeatures?.length || 0}</p>
                                </div>
                            </div>
                        </CardContent>

                        <CardFooter className="p-8 pt-4 flex flex-col gap-8 relative">
                            <div className="flex gap-3 w-full">
                                <Button
                                    variant="ghost"
                                    className={`flex-1 h-16 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all active:scale-[0.98]
                                   ${plan.key === 'yearly' ? 'bg-white/10 hover:bg-white text-white hover:text-slate-900 border-white/20' : 'bg-slate-900 text-white hover:bg-slate-800'}
                                 `}
                                    onClick={() => setShowPreview(true)}
                                >
                                    <Eye className="w-4 h-4 ml-2" /> التفاصيل
                                </Button>

                                <div className="flex gap-2">
                                    <Button
                                        className="h-16 w-16 rounded-[1.5rem] bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                                        onClick={() => setShowEdit(true)}
                                    >
                                        <Edit2 className="w-5 h-5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="h-16 w-16 rounded-[1.5rem] bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 transition-all active:scale-95"
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                    >
                                        {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                                    </Button>
                                </div>
                            </div>

                            {/* Status Indicator bubble */}
                            <div className={`flex items-center self-end gap-2.5 px-4 py-2 rounded-full border shadow-sm transition-all
                              ${plan.isActive ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-slate-500/10 border-slate-500/20 text-slate-500'}
                            `}>
                                <div className={`w-2 h-2 rounded-full ${plan.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{plan.isActive ? 'active' : 'disabled'}</span>
                            </div>
                        </CardFooter>
                    </div>
                </Card>
            </motion.div>

            <EditPlanModal
                plan={plan}
                isOpen={showEdit}
                onClose={() => setShowEdit(false)}
                onSave={handleSave}
            />

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
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-2xl border-white rounded-[3rem] p-0 overflow-hidden shadow-2xl">
                <div className="relative p-10 bg-slate-900 text-white overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />
                    <DialogHeader className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <Badge className="bg-blue-600 text-white border-none py-1.5 px-4 rounded-full font-black text-[10px] tracking-widest uppercase shadow-lg shadow-blue-500/20">
                                {plan.isActive ? 'Active Plan' : 'Draft'}
                            </Badge>
                            <div className="flex items-center gap-2">
                                <span className="text-4xl font-black italic tracking-tighter">${plan.base_price}</span>
                                <span className="text-[10px] font-black uppercase text-slate-400 mt-2">/ {plan.period}</span>
                            </div>
                        </div>
                        <DialogTitle className="text-4xl font-black italic tracking-tighter">
                            {plan.title || plan.name}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 font-bold text-xs mt-2 p-0 max-w-md">
                            Strategic operational tier designed for high-performance sports management protocols.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-10 overflow-y-auto max-h-[60vh] custom-scrollbar">
                    <div className="grid grid-cols-2 gap-4 mb-10">
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center">
                            <p className="text-3xl font-black text-slate-900 italic tracking-tighter">{plan.features?.length || 0}</p>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Core Protocols</p>
                        </div>
                        <div className="p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex flex-col items-center">
                            <p className="text-3xl font-black text-emerald-600 italic tracking-tighter">{plan.bonusFeatures?.length || 0}</p>
                            <p className="text-[10px] font-black uppercase text-emerald-600/60 tracking-widest mt-1">Strategic Bonuses</p>
                        </div>
                    </div>

                    <div className="space-y-10">
                        {/* Features */}
                        {plan.features && plan.features.length > 0 && (
                            <section>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <Check className="w-4 h-4" />
                                    </div>
                                    Standard Operational Features
                                </h3>
                                <div className="grid grid-cols-1 gap-3">
                                    {plan.features.map((feature: any, index: number) => (
                                        <motion.div
                                            key={feature.id || index}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="flex gap-4 items-center p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 transition-all group"
                                        >
                                            <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                                <Check className="w-3 h-3" />
                                            </div>
                                            <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">
                                                {typeof feature === 'string' ? feature : feature?.name}
                                            </span>
                                        </motion.div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Bonus Features */}
                        {plan.bonusFeatures && plan.bonusFeatures.length > 0 && (
                            <section>
                                <h3 className="text-sm font-black text-emerald-600 uppercase tracking-widest mb-6 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                        <Star className="w-4 h-4" />
                                    </div>
                                    Performance Accelerators
                                </h3>
                                <div className="grid grid-cols-1 gap-3">
                                    {plan.bonusFeatures.map((bonus: any, index: number) => (
                                        <motion.div
                                            key={bonus.id || index}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="flex gap-4 items-center p-4 bg-emerald-50/30 border border-emerald-100/50 rounded-2xl hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 transition-all group"
                                        >
                                            <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors shadow-inner">
                                                <Star className="w-3 h-3 fill-current" />
                                            </div>
                                            <span className="text-sm font-bold text-emerald-900 transition-colors">
                                                {typeof bonus === 'string' ? bonus : bonus?.name}
                                            </span>
                                        </motion.div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                </div>

                <div className="p-10 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                    <Button onClick={onClose} className="bg-slate-900 text-white h-14 px-10 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-900/20 active:scale-95 transition-all">
                        Exit Preview
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
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
            <div className="flex justify-center items-center py-24">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-900">التسعير الدولي المخصص</h2>
                    <p className="mt-1 text-slate-500 font-medium">تخصيص التعريفات المالية لكل منطقة جغرافية وعملة</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <select
                        value={selectedPlan}
                        onChange={(e) => setSelectedPlan(e.target.value)}
                        className="h-14 px-6 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 font-bold text-slate-900 shadow-sm"
                    >
                        {plans.map(plan => (
                            <option key={plan.id} value={plan.id}>{plan.title}</option>
                        ))}
                    </select>
                    <Button
                        onClick={() => {
                            setEditingOverride(null);
                            setShowOverrideModal(true);
                        }}
                        className="h-14 px-8 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-xl shadow-blue-500/20 font-black"
                    >
                        <Plus className="w-5 h-5 ml-2" />
                        إضافة تسعير
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1 rounded-[2.5rem] bg-slate-900 text-white border-none shadow-2xl p-8 h-fit">
                    <CardHeader className="p-0 mb-8">
                        <div className="p-4 bg-white/10 rounded-2xl w-fit mb-4">
                            <Globe className="w-8 h-8 text-blue-400" />
                        </div>
                        <CardTitle className="text-2xl font-black italic">Base Configuration</CardTitle>
                        <CardDescription className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">الإصدار العالمي الافتراضي</CardDescription>
                    </CardHeader>
                    <div className="space-y-6">
                        <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Currency</p>
                            <p className="text-2xl font-black">{currentPlan?.base_currency || 'USD'}</p>
                        </div>
                        <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Standard Price</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-3xl font-black text-emerald-400 tabular-nums">${currentPlan?.base_price || 0}</p>
                                <p className="text-sm font-bold text-slate-500 line-through opacity-50">${currentPlan?.base_original_price || 0}</p>
                            </div>
                        </div>
                    </div>
                </Card>

                <div className="lg:col-span-2 space-y-6">
                    <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100 flex gap-4 items-center">
                        <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-blue-900 leading-relaxed">
                            ملاحظة استراتيجية: الأسعار المخصصة لها الأولوية القصوى. في حال غياب التعريف المخصص، سيعتمد النظام السعر القياسي مع التحويل اللحظي للعملة.
                        </p>
                    </div>

                    {currentPlan?.overrides && Object.keys(currentPlan.overrides).length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {Object.entries(currentPlan.overrides).map(([code, override]: [string, any]) => (
                                <motion.div
                                    key={code}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                >
                                    <Card className="relative overflow-hidden p-0 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl group hover:border-blue-500 transition-all">
                                        <CardHeader className="p-8 pb-4">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-4xl shadow-inner italic border border-slate-100 group-hover:scale-110 transition-transform">
                                                        {code === 'EG' ? '🇪🇬' : code === 'SA' ? '🇸🇦' : code === 'QA' ? '🇶🇦' : code === 'KW' ? '🇰🇼' : '🌍'}
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-2xl font-black text-slate-900 italic tracking-tighter">{code}</CardTitle>
                                                        <CardDescription className="text-[10px] font-black uppercase text-blue-600 tracking-widest p-0">
                                                            {override.currency} Zone
                                                        </CardDescription>
                                                    </div>
                                                </div>
                                                <Badge className={`py-1.5 px-4 rounded-full font-black text-[10px] tracking-widest uppercase border-none ring-2 ${override.active ? 'bg-emerald-500 text-white ring-emerald-500/20' : 'bg-slate-100 text-slate-400 ring-slate-100/50'}`}>
                                                    {override.active ? 'Active' : 'Disabled'}
                                                </Badge>
                                            </div>
                                        </CardHeader>

                                        <CardContent className="p-8 pt-0">
                                            <div className="flex items-baseline gap-2 mb-8 bg-slate-50/50 p-6 rounded-2xl border border-slate-100/50 group-hover:bg-blue-50/50 transition-colors">
                                                <span className="text-5xl font-black tabular-nums text-slate-900 tracking-tighter">{override.price}</span>
                                                <span className="text-sm font-bold text-slate-300 line-through">{override.original_price}</span>
                                                <span className="text-[10px] font-black text-slate-400 uppercase italic opacity-60 ml-1">{override.currency}</span>
                                            </div>
                                        </CardContent>

                                        <CardFooter className="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-2">
                                            <Button
                                                variant="ghost"
                                                className="flex-1 h-12 rounded-xl bg-white hover:bg-blue-600 hover:text-white font-black text-[10px] uppercase tracking-widest border border-slate-200 shadow-sm transition-all active:scale-95"
                                                onClick={() => {
                                                    setEditingOverride({ code, data: override });
                                                    setShowOverrideModal(true);
                                                }}
                                            >
                                                <Edit2 className="w-4 h-4 ml-2" /> تعديل التعريفة
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                className="w-12 h-12 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center p-0 active:scale-95"
                                                onClick={() => handleDeleteOverride(code)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-24 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-10">
                            <Globe className="w-16 h-16 text-slate-300 mb-6" />
                            <p className="text-xl font-black text-slate-400">لا توجد تعريفات دولية مخصصة حالياً</p>
                            <p className="text-sm text-slate-400 mt-2 font-medium max-w-md">قم بإضافة أسعار مخصصة للدول لزيادة معدل التحويل وجذب اللاعبين من مختلف المناطق الجغرافية.</p>
                        </div>
                    )}
                </div>
            </div>

            <EditOverrideModal
                isOpen={showOverrideModal}
                onClose={() => setShowOverrideModal(false)}
                onSave={handleSaveOverride}
                initialData={editingOverride}
            />
        </div>
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
        code: '',
        description: '',
        discountType: 'percentage' as 'percentage' | 'fixed',
        discountValue: 0,
        startDate: '',
        endDate: '',
        isActive: true,
        scope: 'all' as 'all' | 'accountTypes' | 'specificAccounts' | 'countries',
        targetAccountTypes: [] as ('club' | 'academy' | 'trainer' | 'agent' | 'player')[],
        targetAccountIds: [] as string[],
        targetCountries: [] as string[],
        applicablePlans: [] as string[],
        usageLimitType: 'unlimited' as 'unlimited' | 'total' | 'perUser',
        totalUsageLimit: 0,
        perUserLimit: 1,
        minPlayers: 0,
        minAmount: 0
    });

    const handleCreateOffer = () => {
        setEditingOffer(null);
        setFormData({
            title: '',
            code: '',
            description: '',
            discountType: 'percentage',
            discountValue: 0,
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            isActive: true,
            scope: 'all',
            targetAccountTypes: [],
            targetAccountIds: [],
            targetCountries: [],
            applicablePlans: [],
            usageLimitType: 'unlimited',
            totalUsageLimit: 0,
            perUserLimit: 1,
            minPlayers: 0,
            minAmount: 0
        });
        setShowCreateModal(true);
    };

    const handleEditOffer = (offer: PromotionalOffer) => {
        setEditingOffer(offer);
        setFormData({
            title: offer.title,
            code: offer.code || '',
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
        if (!confirm('هل أنت متأكد من حذف هذا العرض الترويجي؟')) return;

        try {
            const offerDoc = doc(db, 'promotional_offers', offerId);
            await deleteDoc(offerDoc);
            toast.success('✅ تم حذف العرض بنجاح');
            await onUpdate();
        } catch (error: any) {
            console.error('❌ خطأ في حذف العرض:', error);
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
                code: formData.code || null,
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
                const offerDoc = doc(db, 'promotional_offers', editingOffer.id);
                await setDoc(offerDoc, {
                    ...offerData,
                    updatedAt: serverTimestamp()
                }, { merge: true });
                toast.success('✅ تم تحديث العرض بنجاح');
            } else {
                const offersRef = collection(db, 'promotional_offers');
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
            toast.error(`❌ فشل في حفظ العرض: ${error?.message || 'خطأ غير معروف'}`);
        }
    };

    return (
        <div className="space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-900">حملات العروض الترويجية</h2>
                    <p className="mt-1 text-slate-500 font-medium">إدارة قسائم الخصم، عروض المناسبات، والحوافز المؤقتة</p>
                </div>
                <Button
                    onClick={handleCreateOffer}
                    className="h-14 px-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl shadow-xl shadow-emerald-500/20 font-black tracking-widest transition-all"
                >
                    <Plus className="w-5 h-5 ml-2" />
                    إنشاء حملة جديدة
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {offers.length > 0 ? (
                    offers.map((offer, index) => (
                        <motion.div
                            key={offer.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="group relative"
                        >
                            <Card className="rounded-[3rem] border-white/40 bg-white/60 backdrop-blur-xl shadow-2xl overflow-hidden hover:shadow-emerald-900/5 transition-all h-full flex flex-col">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                                <CardHeader className="p-8 pb-4 relative z-10">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl shadow-sm">
                                            <Gift className="w-8 h-8" />
                                        </div>
                                        <Badge className={`py-1.5 px-4 rounded-full font-black text-[10px] tracking-widest uppercase border-none
                                      ${offer.isActive ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}
                                    `}>
                                            {offer.isActive ? 'Active' : 'Expired'}
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-2xl font-black text-slate-900 leading-tight mb-2">{offer.title}</CardTitle>
                                    <CardDescription className="font-bold text-slate-500 line-clamp-2 min-h-[3rem]">{offer.description}</CardDescription>
                                </CardHeader>

                                <CardContent className="p-8 pt-0 flex-1 relative z-10">
                                    <div className="mb-8">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-5xl font-black text-emerald-600 tabular-nums">
                                                {offer.discountValue}{offer.discountType === 'percentage' ? '%' : '$'}
                                            </span>
                                            <span className="text-sm font-black text-slate-400 uppercase tracking-widest italic">Discount</span>
                                        </div>
                                        {offer.code && (
                                            <div className="mt-4 p-3 bg-slate-900 rounded-2xl flex items-center justify-between border border-white/10 shadow-lg">
                                                <code className="text-emerald-400 font-black tracking-widest">{offer.code}</code>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white" onClick={() => {
                                                    navigator.clipboard.writeText(offer.code!);
                                                    toast.success('Copied to clipboard');
                                                }}>
                                                    <Copy className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                                            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Effective Period</span>
                                            <span className="text-slate-900">{new Date(offer.startDate).toLocaleDateString('en-US')} - {new Date(offer.endDate).toLocaleDateString('en-US')}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500" style={{ width: offer.isActive ? '100%' : '0%' }} />
                                        </div>
                                    </div>
                                </CardContent>

                                <CardFooter className="p-8 bg-slate-50 border-t border-slate-100 gap-3">
                                    <Button
                                        variant="ghost"
                                        className="flex-1 h-14 rounded-2xl bg-white hover:bg-emerald-600 hover:text-white font-black text-xs uppercase tracking-widest border border-slate-200 shadow-sm transition-all"
                                        onClick={() => handleEditOffer(offer)}
                                    >
                                        <Edit className="w-4 h-4 ml-2" /> Modify
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center p-0"
                                        onClick={() => handleDeleteOffer(offer.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        </motion.div>
                    ))
                ) : (
                    <div className="col-span-full py-24 bg-emerald-50/30 rounded-[3rem] border-2 border-dashed border-emerald-200 flex flex-col items-center justify-center text-center p-10">
                        <Gift className="w-16 h-16 text-emerald-300 mb-6" />
                        <p className="text-xl font-black text-emerald-400">لا توجد حملات نشطة</p>
                        <p className="text-sm text-emerald-400 mt-2 font-medium max-w-md">ابدأ بإطلاق أول حملة ترويجية لزيادة نشاط المستخدمين في المواسم الرياضية.</p>
                    </div>
                )}
            </div>

            <CreateOfferModal
                isOpen={showCreateModal}
                formData={formData}
                availablePlans={plans}
                isEditing={!!editingOffer}
                onClose={() => setShowCreateModal(false)}
                onSave={handleSaveOffer}
                onChange={setFormData}
            />
        </div>
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
            toast.success('✅ تم حذف الشريك بنجاح');
            onUpdate();
        } catch (error) {
            toast.error('❌ خطأ في الحذف');
        }
    };

    return (
        <div className="space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-900">إدارة الشركاء الاستراتيجيين</h2>
                    <p className="mt-1 text-slate-500 font-medium">التحكم في الاتفاقيات الخاصة، الهيئات الحكومية، والأكاديميات الدولية</p>
                </div>
                <Button
                    onClick={() => { setEditingPartner(null); setShowModal(true); }}
                    className="h-14 px-10 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl shadow-xl shadow-purple-500/20 font-black tracking-widest transition-all"
                >
                    <Plus className="w-5 h-5 ml-2" />
                    إضافة شريك جديد
                </Button>
            </div>

            {partners.length === 0 ? (
                <div className="py-24 bg-purple-50/30 rounded-[3rem] border-2 border-dashed border-purple-200 flex flex-col items-center justify-center text-center p-10">
                    <Users className="w-16 h-16 text-purple-300 mb-6" />
                    <p className="text-xl font-black text-purple-400">لا يوجد شركاء مسجلين</p>
                    <p className="text-sm text-purple-400 mt-2 font-medium max-w-md">تتيح لك هذه الميزة بناء علاقات مؤسسية وتوفير اشتراكات بمبالغ مخفضة للجهات الكبرى.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {partners.map((partner, index) => (
                        <motion.div
                            key={partner.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="rounded-[3rem] border-white/40 bg-white/60 backdrop-blur-xl shadow-2xl overflow-hidden hover:shadow-purple-900/5 transition-all h-full">
                                <CardHeader className="p-8 pb-4">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="p-4 bg-purple-100 text-purple-600 rounded-2xl shadow-sm">
                                            <Users className="w-8 h-8" />
                                        </div>
                                        <Badge className={`py-1.5 px-4 rounded-full font-black text-[10px] tracking-widest uppercase border-none
                                      ${partner.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}
                                    `}>
                                            {partner.status}
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-2xl font-black text-slate-900 leading-tight mb-1">{partner.partnerName}</CardTitle>
                                    <CardDescription className="text-[10px] font-black uppercase text-purple-600 tracking-widest flex items-center gap-2">
                                        <Globe className="w-3 h-3" /> {partner.partnerType} • Code: {partner.partnerCode}
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="p-8 pt-0">
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Subscriptions</p>
                                            <p className="text-xl font-black text-slate-900">{partner.activeSubscriptions || 0}</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Public</p>
                                            <p className="text-xl font-black text-slate-900">{partner.isPublic ? 'YES' : 'NO'}</p>
                                        </div>
                                    </div>

                                    {partner.customPricing && (
                                        <div className="p-5 rounded-3xl bg-slate-900 text-white shadow-xl relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl" />
                                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">Partner Tiers</p>
                                            <div className="space-y-2">
                                                {partner.customPricing.monthly && <p className="flex justify-between text-xs"><span>Monthly</span><span className="font-black text-emerald-400">${partner.customPricing.monthly}</span></p>}
                                                {partner.customPricing.quarterly && <p className="flex justify-between text-xs"><span>Quarterly</span><span className="font-black text-emerald-400">${partner.customPricing.quarterly}</span></p>}
                                                {partner.customPricing.yearly && <p className="flex justify-between text-xs"><span>Annual</span><span className="font-black text-emerald-400">${partner.customPricing.yearly}</span></p>}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>

                                <CardFooter className="p-8 bg-slate-50 border-t border-slate-100 gap-3">
                                    <Button
                                        variant="ghost"
                                        className="flex-1 h-14 rounded-2xl bg-white hover:bg-purple-600 hover:text-white font-black text-xs uppercase tracking-widest border border-slate-200 shadow-sm transition-all"
                                        onClick={() => { setEditingPartner(partner); setShowModal(true); }}
                                    >
                                        Configure
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center p-0"
                                        onClick={() => handleDelete(partner.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}

            <CreatePartnerModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                partner={editingPartner}
                onSuccess={onUpdate}
            />
        </div>
    );
}

// ==================== MODALS ====================

function CreatePartnerModal({ isOpen, onClose, partner, onSuccess }: any) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<any>>({
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
                toast.success('✅ تم تحديث الشريك بنجاح');
            } else {
                await addDoc(collection(db, 'partners'), {
                    ...dataToSave,
                    activeSubscriptions: 0,
                    totalRevenue: 0,
                    createdAt: serverTimestamp()
                });
                toast.success('✅ تم إضافة شريك جديد بنجاح');
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('❌ حدث خطأ أثناء الحفظ');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-2xl border-white rounded-[3rem] p-0 overflow-hidden shadow-2xl">
                <div className="relative p-10 bg-slate-900 text-white overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />
                    <DialogHeader className="relative z-10">
                        <DialogTitle className="text-3xl font-black italic tracking-tighter">
                            {partner ? 'Strategic Evolution' : 'New Partnership'}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2 p-0">
                            Configure institutional collaboration protocols
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Entity Name</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.partnerName}
                                    onChange={e => setFormData({ ...formData, partnerName: e.target.value })}
                                    placeholder="e.g. SAFF International..."
                                    className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-purple-500/10 font-bold text-slate-900 transition-all"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Access Protocol (Code)</label>
                                <div className="flex gap-2">
                                    <input
                                        required
                                        type="text"
                                        value={formData.partnerCode}
                                        onChange={e => setFormData({ ...formData, partnerCode: e.target.value.toUpperCase() })}
                                        placeholder="CODE2024"
                                        className="flex-1 h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-purple-500/10 font-black tracking-widest text-slate-900 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const randomCode = `P${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
                                            setFormData({ ...formData, partnerCode: randomCode });
                                        }}
                                        className="w-14 h-14 flex items-center justify-center bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-colors"
                                    >
                                        <RefreshCcw className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Entity Class</label>
                                    <select
                                        className="w-full h-14 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-purple-500/10 font-bold text-slate-900"
                                        value={formData.partnerType}
                                        onChange={e => setFormData({ ...formData, partnerType: e.target.value })}
                                    >
                                        <option value="federation">Federation</option>
                                        <option value="league">League</option>
                                        <option value="government">Government</option>
                                        <option value="corporate">Corporate</option>
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Status</label>
                                    <select
                                        className="w-full h-14 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-purple-500/10 font-bold text-slate-900"
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option value="active">Operational</option>
                                        <option value="inactive">Suspended</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                                <p className="text-[10px] font-black uppercase text-purple-600 tracking-widest mb-6 flex items-center gap-2">
                                    <DollarSign className="w-3.5 h-3.5" /> Institutional Tiers (USD)
                                </p>
                                <div className="space-y-4">
                                    {[
                                        { label: '3 Months Rate', key: 'quarterly' },
                                        { label: '6 Months Rate', key: 'sixMonths' },
                                        { label: 'Annual Strategic', key: 'yearly' }
                                    ].map((tier) => (
                                        <div key={tier.key} className="relative">
                                            <label className="text-[10px] font-black text-slate-400 absolute left-5 top-2.5">{tier.label}</label>
                                            <input
                                                type="number"
                                                className="w-full h-14 pt-5 pb-1 px-5 bg-white border border-slate-200 rounded-2xl font-black text-slate-900 focus:ring-4 focus:ring-purple-500/10 transition-all"
                                                value={formData.customPricing?.[tier.key] || 0}
                                                onChange={e => setFormData({
                                                    ...formData,
                                                    customPricing: { ...formData.customPricing, [tier.key]: Number(e.target.value) }
                                                })}
                                            />
                                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">USD</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-6 bg-purple-50 rounded-2xl border border-purple-100">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${formData.isPublic ? 'bg-purple-500 animate-pulse' : 'bg-slate-300'}`} />
                                    <span className="text-xs font-black uppercase tracking-widest text-purple-900">Public Protocol</span>
                                </div>
                                <div
                                    className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${formData.isPublic ? 'bg-purple-500' : 'bg-slate-200'}`}
                                    onClick={() => setFormData({ ...formData, isPublic: !formData.isPublic })}
                                >
                                    <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition duration-200 ease-in-out ${formData.isPublic ? 'translate-x-6' : 'translate-x-0'}`} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex gap-4">
                        <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold transition-all">Cancel</Button>
                        <Button
                            disabled={loading}
                            type="submit"
                            className="flex-1 h-14 rounded-2xl bg-purple-600 text-white font-black uppercase tracking-widest shadow-2xl shadow-purple-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : partner ? 'Finalize Changes' : 'Execute Partnership'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
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

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md bg-white/95 backdrop-blur-2xl border-white rounded-[3rem] p-0 overflow-hidden shadow-2xl">
                <div className="relative p-10 bg-slate-900 text-white overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                    <DialogHeader className="relative z-10">
                        <DialogTitle className="text-3xl font-black italic tracking-tighter">
                            {initialData ? 'Update Protocol' : 'Regional Override'}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2 p-0">
                            Configure regional financial parameters
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">ISO Alpha-2</label>
                            <input
                                type="text"
                                required
                                value={formData.countryCode}
                                onChange={(e) => setFormData({ ...formData, countryCode: e.target.value.toUpperCase() })}
                                placeholder="SA, EG, QA..."
                                className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 font-black text-slate-900 transition-all"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Currency</label>
                            <input
                                type="text"
                                required
                                value={formData.currency}
                                onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                                placeholder="SAR, EGP, USD..."
                                className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 font-black text-slate-900 transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-6 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 shadow-inner">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Standard Price</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    required
                                    value={formData.originalPrice}
                                    onChange={(e) => setFormData({ ...formData, originalPrice: parseFloat(e.target.value) })}
                                    className="w-full h-14 px-6 bg-white border border-slate-200 rounded-2xl font-black text-slate-400 line-through transition-all"
                                />
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">{formData.currency}</div>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest ml-1">Override Price</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    required
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                    className="w-full h-16 px-6 bg-white border-2 border-blue-500/20 rounded-2xl shadow-xl shadow-blue-500/5 font-black text-3xl text-slate-900 focus:border-blue-500 transition-all"
                                />
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-blue-600 uppercase">{formData.currency}</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100 group transition-all hover:bg-emerald-50">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${formData.active ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-slate-300'}`} />
                            <span className="text-xs font-black uppercase tracking-widest text-emerald-900">Protocol Active</span>
                        </div>
                        <div
                            className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${formData.active ? 'bg-emerald-500' : 'bg-slate-200'}`}
                            onClick={() => setFormData({ ...formData, active: !formData.active })}
                        >
                            <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition duration-200 ease-in-out ${formData.active ? 'translate-x-6' : 'translate-x-0'}`} />
                        </div>
                    </div>

                    <div className="pt-6 flex gap-4">
                        <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold transition-all">Cancel</Button>
                        <Button type="submit" className="flex-1 h-14 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest shadow-2xl shadow-slate-900/20 active:scale-95 transition-all">
                            Save Override
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
