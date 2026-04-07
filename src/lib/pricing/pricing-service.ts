
import { supabase } from '@/lib/supabase/config';
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
            const { data } = await supabase.from(TABLE_NAME).select('*').order('order');
            if (!data?.length) {
                console.log('No plans found, initializing defaults...');
                await this.initializeDefaults();
                return DEFAULT_PLANS;
            }
            return data as SubscriptionPlan[];
        } catch (error) {
            console.error('Error fetching plans:', error);
            return [];
        }
    },

    async getPlan(id: string): Promise<SubscriptionPlan | null> {
        try {
            const { data } = await supabase.from(TABLE_NAME).select('*').eq('id', id).limit(1);
            return data?.length ? data[0] as SubscriptionPlan : null;
        } catch (error) {
            console.error('Error fetching plan:', error);
            return null;
        }
    },

    async updatePlan(plan: SubscriptionPlan) {
        try {
            await supabase.from(TABLE_NAME).upsert({ ...plan, updatedAt: new Date().toISOString() });
            return true;
        } catch (error) {
            console.error('Error updating plan:', error);
            throw error;
        }
    },

    async deletePlan(planId: string) {
        try {
            await supabase.from(TABLE_NAME).delete().eq('id', planId);
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
        await Promise.all(DEFAULT_PLANS.map(plan => supabase.from(TABLE_NAME).upsert(plan)));
    },

    resolvePrice(
        plan: SubscriptionPlan,
        userCountryCode: string,
        targetCurrency: string,
        rates: Record<string, number>,
        accountType?: 'club' | 'academy' | 'trainer' | 'agent' | 'player'
    ): PriceResult {
        let baseOriginalPrice = plan.base_original_price;
        let basePrice = plan.base_price;
        let accountTypeDiscount = 0;

        if (accountType && plan.accountTypeOverrides?.[accountType]?.active) {
            const accountOverride = plan.accountTypeOverrides[accountType];
            if (accountOverride.price !== undefined) {
                basePrice = accountOverride.price;
                baseOriginalPrice = accountOverride.original_price || baseOriginalPrice;
            } else if (accountOverride.discount_percentage) {
                accountTypeDiscount = accountOverride.discount_percentage;
                basePrice = basePrice * (1 - accountTypeDiscount / 100);
            }
        }

        if (plan.overrides && plan.overrides[userCountryCode] && plan.overrides[userCountryCode].active) {
            const override = plan.overrides[userCountryCode];
            let finalPrice = override.price;
            if (accountTypeDiscount > 0) finalPrice = finalPrice * (1 - accountTypeDiscount / 100);
            return { currency: override.currency, originalPrice: override.original_price, price: Math.ceil(finalPrice), isOverride: true, accountTypeDiscount };
        }

        if (targetCurrency === plan.base_currency) {
            return { currency: plan.base_currency, originalPrice: Math.ceil(baseOriginalPrice), price: Math.ceil(basePrice), isOverride: false, accountTypeDiscount };
        }

        const convertedPrice = convertCurrency(basePrice, plan.base_currency, targetCurrency, rates as any);
        const convertedOriginal = convertCurrency(baseOriginalPrice, plan.base_currency, targetCurrency, rates as any);

        return { currency: targetCurrency, originalPrice: Math.ceil(convertedOriginal), price: Math.ceil(convertedPrice), isOverride: false, accountTypeDiscount };
    }
};
