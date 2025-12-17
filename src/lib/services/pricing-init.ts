/**
 * سكريبت لتهيئة البيانات الأولية لنظام إدارة الأسعار
 * 
 * الاستخدام:
 * 1. تأكد من تسجيل الدخول كـ Super Admin
 * 2. افتح Console في المتصفح على صفحة dashboard
 * 3. انسخ والصق هذا الكود
 * 4. اضغط Enter
 */

import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

// ========================================
// البيانات الأولية
// ========================================

const INITIAL_PLANS = [
    {
        id: 'monthly-plan',
        name: 'اشتراك شهري',
        nameEn: 'Monthly Subscription',
        key: 'monthly',
        basePrice: 29.99,
        currency: 'USD',
        duration: 30,
        features: [
            {
                id: 'unlimited-players',
                name: 'عدد لاعبين غير محدود',
                description: 'أضف أي عدد من اللاعبين لمؤسستك',
                included: true,
            },
            {
                id: 'performance-tracking',
                name: 'تتبع الأداء والإحصائيات',
                description: 'تحليلات شاملة لأداء اللاعبين',
                included: true,
            },
            {
                id: 'cloud-storage',
                name: 'مساحة تخزين 10GB',
                description: 'لحفظ الفيديوهات والمستندات',
                included: true,
            },
            {
                id: 'mobile-app',
                name: 'تطبيق الجوال',
                description: 'وصول كامل من iOS و Android',
                included: true,
            },
            {
                id: 'reports',
                name: 'تقارير شهرية',
                description: 'تقارير تفصيلية عن الأداء',
                included: true,
            },
        ],
        bonusFeatures: [
            {
                id: 'email-support',
                name: 'دعم فني عبر البريد',
                description: 'رد خلال 24 ساعة',
                included: true,
            },
        ],
        isActive: true,
        displayOrder: 1,
    },
    {
        id: 'quarterly-plan',
        name: 'اشتراك ربع سنوي',
        nameEn: 'Quarterly Subscription',
        key: 'quarterly',
        basePrice: 79.99,
        currency: 'USD',
        duration: 90,
        features: [
            {
                id: 'unlimited-players',
                name: 'عدد لاعبين غير محدود',
                description: 'أضف أي عدد من اللاعبين لمؤسستك',
                included: true,
            },
            {
                id: 'performance-tracking',
                name: 'تتبع الأداء والإحصائيات',
                description: 'تحليلات شاملة لأداء اللاعبين',
                included: true,
            },
            {
                id: 'cloud-storage-25',
                name: 'مساحة تخزين 25GB',
                description: 'لحفظ الفيديوهات والمستندات',
                included: true,
            },
            {
                id: 'mobile-app',
                name: 'تطبيق الجوال',
                description: 'وصول كامل من iOS و Android',
                included: true,
            },
            {
                id: 'reports',
                name: 'تقارير أسبوعية',
                description: 'تقارير تفصيلية عن الأداء',
                included: true,
            },
            {
                id: 'video-analysis',
                name: 'تحليل الفيديو',
                description: 'أدوات متقدمة لتحليل الفيديوهات',
                included: true,
            },
        ],
        bonusFeatures: [
            {
                id: 'priority-support',
                name: 'دعم فني ذو أولوية',
                description: 'رد خلال 12 ساعة',
                included: true,
            },
            {
                id: 'monthly-consultation',
                name: 'استشارة شهرية',
                description: 'جلسة استشارية مع خبير',
                included: true,
            },
        ],
        isActive: true,
        displayOrder: 2,
    },
    {
        id: 'yearly-plan',
        name: 'اشتراك سنوي',
        nameEn: 'Yearly Subscription',
        key: 'yearly',
        basePrice: 249.99,
        currency: 'USD',
        duration: 365,
        features: [
            {
                id: 'unlimited-players',
                name: 'عدد لاعبين غير محدود',
                description: 'أضف أي عدد من اللاعبين لمؤسستك',
                included: true,
            },
            {
                id: 'performance-tracking',
                name: 'تتبع الأداء والإحصائيات المتقدمة',
                description: 'تحليلات AI شاملة لأداء اللاعبين',
                included: true,
            },
            {
                id: 'cloud-storage-100',
                name: 'مساحة تخزين 100GB',
                description: 'لحفظ الفيديوهات والمستندات',
                included: true,
            },
            {
                id: 'mobile-app',
                name: 'تطبيق الجوال',
                description: 'وصول كامل من iOS و Android',
                included: true,
            },
            {
                id: 'reports-realtime',
                name: 'تقارير فورية',
                description: 'تقارير تفصيلية لحظية',
                included: true,
            },
            {
                id: 'video-analysis-ai',
                name: 'تحليل الفيديو بالذكاء الاصطناعي',
                description: 'أدوات AI متقدمة لتحليل الفيديوهات',
                included: true,
            },
            {
                id: 'custom-branding',
                name: 'علامة تجارية مخصصة',
                description: 'شعارك وألوانك في النظام',
                included: true,
            },
            {
                id: 'api-access',
                name: 'API Access',
                description: 'للتكامل مع أنظمتك الخاصة',
                included: true,
            },
        ],
        bonusFeatures: [
            {
                id: 'premium-support',
                name: 'دعم فني VIP',
                description: 'رد فوري + خط ساخن',
                included: true,
            },
            {
                id: 'weekly-consultation',
                name: 'استشارات أسبوعية',
                description: 'جلسة استشارية كل أسبوع',
                included: true,
            },
            {
                id: 'dedicated-manager',
                name: 'مدير حساب مخصص',
                description: 'مدير يتابع حسابك بشكل شخصي',
                included: true,
            },
            {
                id: 'free-training',
                name: 'تدريب مجاني للفريق',
                description: 'جلسات تدريبية لفريقك',
                included: true,
            },
        ],
        isActive: true,
        displayOrder: 3,
    },
];

// أمثلة على الأسعار المخصصة
const SAMPLE_OVERRIDES = [
    {
        id: 'egypt-monthly',
        planKey: 'monthly',
        countryCode: 'EG',
        customPrice: 899.99,
        customCurrency: 'EGP',
        discountType: 'fixed',
        discountValue: 0,
        isActive: true,
        notes: 'سعر مخصص لمصر بالجنيه المصري',
    },
    {
        id: 'saudi-quarterly',
        planKey: 'quarterly',
        countryCode: 'SA',
        customPrice: 299.99,
        customCurrency: 'SAR',
        discountType: 'fixed',
        discountValue: 0,
        isActive: true,
        notes: 'سعر مخصص للسعودية بالريال',
    },
];

// أمثلة على العروض الترويجية
const SAMPLE_OFFERS = [
    {
        id: 'welcome-offer',
        name: 'عرض الترحيب',
        description: 'خصم خاص للمستخدمين الجدد',
        code: 'WELCOME25',
        offerType: 'early_bird',
        applicablePlans: ['monthly', 'quarterly', 'yearly'],
        discountType: 'percentage',
        discountValue: 25,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // سنة من الآن
        timezone: 'Africa/Cairo',
        conditions: {
            newUsersOnly: true,
            minPlayers: 3,
        },
        status: 'active',
        usageLimit: 1000,
        usageCount: 0,
        displayBadge: 'خصم 25%',
        displayColor: '#10B981',
        priority: 5,
    },
];

// ========================================
// دالة التهيئة
// ========================================

export async function initializePricingData(userId: string) {
    console.log('🚀 بدء تهيئة بيانات الأسعار...');

    try {
        // 1. إضافة الباقات الأساسية
        console.log('📦 إضافة الباقات الأساسية...');
        for (const plan of INITIAL_PLANS) {
            const planRef = doc(db, 'subscription_plans', plan.id);
            await setDoc(planRef, {
                ...plan,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                createdBy: userId,
            });
            console.log(`✅ تمت إضافة: ${plan.name}`);
        }

        // 2. إضافة الأسعار المخصصة (اختياري)
        console.log('\n🌍 إضافة أمثلة على الأسعار المخصصة...');
        for (const override of SAMPLE_OVERRIDES) {
            const overrideRef = doc(db, 'pricing_overrides', override.id);
            await setDoc(overrideRef, {
                ...override,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                createdBy: userId,
            });
            console.log(`✅ تمت إضافة: ${override.countryCode} - ${override.planKey}`);
        }

        // 3. إضافة العروض الترويجية (اختياري)
        console.log('\n🎁 إضافة أمثلة على العروض الترويجية...');
        for (const offer of SAMPLE_OFFERS) {
            const offerRef = doc(db, 'promotional_offers', offer.id);
            await setDoc(offerRef, {
                ...offer,
                startDate: Timestamp.fromDate(offer.startDate),
                endDate: Timestamp.fromDate(offer.endDate),
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                createdBy: userId,
            });
            console.log(`✅ تمت إضافة: ${offer.name}`);
        }

        console.log('\n✨ تمت التهيئة بنجاح!');
        console.log('\n📊 الإحصائيات:');
        console.log(`   - الباقات: ${INITIAL_PLANS.length}`);
        console.log(`   - الأسعار المخصصة: ${SAMPLE_OVERRIDES.length}`);
        console.log(`   - العروض: ${SAMPLE_OFFERS.length}`);
        console.log('\n🔗 يمكنك الآن الذهاب إلى:');
        console.log('   /dashboard/admin/pricing-management');

        return {
            success: true,
            plans: INITIAL_PLANS.length,
            overrides: SAMPLE_OVERRIDES.length,
            offers: SAMPLE_OFFERS.length,
        };

    } catch (error) {
        console.error('❌ خطأ في التهيئة:', error);
        throw error;
    }
}

// ========================================
// دالة مساعدة للتشغيل السريع
// ========================================

/**
 * استخدم هذه الدالة في Console:
 * 
 * window.initPricing = async () => {
 *   const { initializePricingData } = await import('./path/to/this/file');
 *   await initializePricingData('YOUR_USER_ID');
 * };
 * 
 * ثم:
 * window.initPricing();
 */

// Export للاستخدام
export { INITIAL_PLANS, SAMPLE_OVERRIDES, SAMPLE_OFFERS };
