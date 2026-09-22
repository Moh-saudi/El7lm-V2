
import { supabase } from '@/lib/supabase/config';
import { authenticatedFetch } from '@/lib/api/authenticated-fetch';
import { SubscriptionPlan, PriceResult } from '@/types/pricing';
import { convertCurrency } from '@/lib/currency-rates';

const TABLE_NAME = 'subscription_plans';

const DEFAULT_PLANS: SubscriptionPlan[] = [
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
        overrides: { 'EG': { currency: 'EGP', original_price: 150, price: 100, active: true } },
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
        overrides: { 'EG': { currency: 'EGP', original_price: 250, price: 180, active: true } },
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
        overrides: { 'EG': { currency: 'EGP', original_price: 400, price: 250, active: true } },
        isActive: true,
        order: 3
    }
];

export const PricingService = {
    async getAllPlans(): Promise<SubscriptionPlan[]> {
        try {
            const { data, error } = await supabase.from(TABLE_NAME).select('*').order('order');
            if (error) {
                console.warn('Error fetching plans via supabase client, trying API fallback:', error);
                if (typeof window !== 'undefined') {
                    const res = await fetch('/api/admin/pricing').catch(() => null);
                    if (res && res.ok) {
                        const json = await res.json();
                        if (json.data && json.data.length > 0) return json.data;
                    }
                }
            }
            if (!data?.length) {
                return DEFAULT_PLANS;
            }
            return (data as any[]).map(p => ({
                ...p,
                accountTypeOverrides: p.accountTypeOverrides || p.overrides?.accountTypeOverrides || {},
                badges: p.badges || p.overrides?.badges || [],
                highlights: p.highlights || p.overrides?.highlights || [],
                recommendedFor: p.recommendedFor || p.overrides?.recommendedFor || '',
                description: p.description || p.overrides?.description || p.subtitle || '',
            })) as SubscriptionPlan[];
        } catch (error) {
            console.error('Error fetching plans:', error);
            return DEFAULT_PLANS;
        }
    },

    async getPlan(id: string): Promise<SubscriptionPlan | null> {
        try {
            const { data } = await supabase.from(TABLE_NAME).select('*').eq('id', id).limit(1);
            if (!data?.length) return null;
            const p = data[0] as any;
            return {
                ...p,
                accountTypeOverrides: p.accountTypeOverrides || p.overrides?.accountTypeOverrides || {},
                badges: p.badges || p.overrides?.badges || [],
                highlights: p.highlights || p.overrides?.highlights || [],
                recommendedFor: p.recommendedFor || p.overrides?.recommendedFor || '',
                description: p.description || p.overrides?.description || p.subtitle || '',
            } as SubscriptionPlan;
        } catch (error) {
            console.error('Error fetching plan:', error);
            return null;
        }
    },

    async updatePlan(plan: SubscriptionPlan) {
        try {
            if (typeof window !== 'undefined') {
                const response = await authenticatedFetch('/api/admin/pricing', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(plan),
                });
                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.error || 'فشل تحديث باقة الاشتراك');
                }
                return true;
            }

            // Server-side fallback using admin client
            const { getSupabaseAdmin } = await import('@/lib/supabase/admin');
            const admin = getSupabaseAdmin();
            const ALLOWED_COLUMNS = [
                'id', 'title', 'subtitle', 'period', 'base_currency',
                'base_original_price', 'base_price', 'features', 'bonusFeatures',
                'popular', 'icon', 'color', 'overrides', 'isActive', 'order'
            ];
            const cleanPlan: Record<string, any> = {};
            for (const col of ALLOWED_COLUMNS) {
                if ((plan as any)[col] !== undefined) cleanPlan[col] = (plan as any)[col];
            }
            const overrides = typeof cleanPlan.overrides === 'object' && cleanPlan.overrides !== null
                ? { ...cleanPlan.overrides }
                : {};
            if ((plan as any).accountTypeOverrides) overrides.accountTypeOverrides = (plan as any).accountTypeOverrides;
            if ((plan as any).badges) overrides.badges = (plan as any).badges;
            if ((plan as any).highlights) overrides.highlights = (plan as any).highlights;
            if ((plan as any).recommendedFor) overrides.recommendedFor = (plan as any).recommendedFor;
            if ((plan as any).description) overrides.description = (plan as any).description;
            cleanPlan.overrides = overrides;

            const { error } = await admin.from(TABLE_NAME).upsert(cleanPlan);
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error updating plan:', error);
            throw error;
        }
    },

    async deletePlan(planId: string) {
        try {
            if (typeof window !== 'undefined') {
                const response = await authenticatedFetch(`/api/admin/pricing?id=${encodeURIComponent(planId)}`, {
                    method: 'DELETE',
                });
                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.error || 'فشل حذف الباقة');
                }
                return true;
            }

            const { getSupabaseAdmin } = await import('@/lib/supabase/admin');
            const admin = getSupabaseAdmin();
            const { error } = await admin.from(TABLE_NAME).delete().eq('id', planId);
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting plan:', error);
            throw error;
        }
    },

    getBestMatchedPlan(amount: number, packageType?: string, currentPlans?: SubscriptionPlan[]): { plan: SubscriptionPlan | null; months: number; title: string, period: string } {
        const plans = currentPlans && currentPlans.length > 0 ? currentPlans : DEFAULT_PLANS;

        if (packageType) {
            const matched = plans.find(p => p.id === packageType);
            if (matched) {
                const monthsStr = matched.period.match(/\d+/)?.[0];
                const months = monthsStr ? parseInt(monthsStr) : (matched.id.includes('annual') ? 12 : matched.id.includes('6months') ? 6 : 3);
                return { plan: matched, months, title: matched.title, period: matched.period };
            }
        }

        const numAmount = Number(amount || 0);
        if (numAmount >= 110 && numAmount < 180) {
            const semiPlan = plans.find(p => p.id === 'subscription_6months' || p.period.includes('6'));
            return { plan: semiPlan || null, months: 6, title: semiPlan?.title || 'اشتراك 6 شهور', period: semiPlan?.period || '6 شهور' };
        } else if (numAmount >= 180) {
            const annualPlan = plans.find(p => p.id === 'subscription_annual' || p.period.includes('12') || p.period.includes('سنة'));
            return { plan: annualPlan || null, months: 12, title: annualPlan?.title || 'اشتراك سنوي', period: annualPlan?.period || '12 شهر' };
        }

        const basicPlan = plans.find(p => p.id === 'subscription_3months' || p.period.includes('3'));
        return { plan: basicPlan || null, months: 3, title: basicPlan?.title || 'اشتراك 3 شهور', period: basicPlan?.period || '3 شهور' };
    },

    async initializeDefaults() {
        for (const plan of DEFAULT_PLANS) {
            await this.updatePlan(plan);
        }
        return true;
    },

    resolvePrice(
        plan: SubscriptionPlan,
        userCountryCode: string,
        targetCurrency: string,
        rates: Record<string, number>,
        accountType?: string
    ): PriceResult {
        let baseOriginalPrice = Number(plan.base_original_price ?? 0);
        let basePrice = Number(plan.base_price ?? 0);
        let accountTypeDiscount = 0;

        const allAccountOverrides = plan.accountTypeOverrides || (plan as any).overrides?.accountTypeOverrides || {};
        const normalizedType = accountType ? accountType.toLowerCase().trim() : undefined;

        if (normalizedType && allAccountOverrides[normalizedType]?.active) {
            const accountOverride = allAccountOverrides[normalizedType];
            if (accountOverride.price !== undefined && accountOverride.price !== null && !isNaN(Number(accountOverride.price))) {
                basePrice = Number(accountOverride.price);
                if (accountOverride.original_price !== undefined && !isNaN(Number(accountOverride.original_price))) {
                    baseOriginalPrice = Number(accountOverride.original_price);
                }
            } else if (accountOverride.discount_percentage) {
                accountTypeDiscount = Number(accountOverride.discount_percentage);
                basePrice = basePrice * (1 - accountTypeDiscount / 100);
            }
        }

        const countryKey = (userCountryCode || '').toUpperCase();
        if (plan.overrides && plan.overrides[countryKey] && plan.overrides[countryKey].active) {
            const override = plan.overrides[countryKey];
            let finalPrice = Number(override.price ?? basePrice);
            if (accountTypeDiscount > 0) finalPrice = finalPrice * (1 - accountTypeDiscount / 100);
            const finalOriginal = Number(override.original_price ?? baseOriginalPrice);
            return {
                currency: override.currency || targetCurrency,
                originalPrice: Math.ceil(finalOriginal),
                price: Math.ceil(finalPrice),
                isOverride: true,
                accountTypeDiscount
            };
        }

        if (targetCurrency === plan.base_currency) {
            return {
                currency: plan.base_currency || 'USD',
                originalPrice: Math.ceil(baseOriginalPrice),
                price: Math.ceil(basePrice),
                isOverride: false,
                accountTypeDiscount
            };
        }

        const convertedPrice = convertCurrency(basePrice, plan.base_currency || 'USD', targetCurrency, rates as any);
        const convertedOriginal = convertCurrency(baseOriginalPrice, plan.base_currency || 'USD', targetCurrency, rates as any);

        return {
            currency: targetCurrency,
            originalPrice: Math.ceil(convertedOriginal),
            price: Math.ceil(convertedPrice),
            isOverride: false,
            accountTypeDiscount
        };
    }
};
