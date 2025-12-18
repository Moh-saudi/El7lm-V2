
import { db } from '@/lib/firebase/config';
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { SubscriptionPlan, PriceResult } from '@/types/pricing';
import { convertCurrency } from '@/lib/currency-rates';

const COLLECTION_NAME = 'subscription_plans';

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
        overrides: {
            'EG': {
                currency: 'EGP',
                original_price: 150,
                price: 100,
                active: true
            }
        },
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
        overrides: {
            'EG': {
                currency: 'EGP',
                original_price: 250,
                price: 180,
                active: true
            }
        },
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
        overrides: {
            'EG': {
                currency: 'EGP',
                original_price: 400,
                price: 250,
                active: true
            }
        },
        isActive: true,
        order: 3
    }
];

export const PricingService = {
    async getAllPlans(): Promise<SubscriptionPlan[]> {
        try {
            const plansRef = collection(db, COLLECTION_NAME);
            const snapshot = await getDocs(plansRef);

            if (snapshot.empty) {
                console.log('No plans found, initializing defaults...');
                await this.initializeDefaults();
                return DEFAULT_PLANS;
            }

            return snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as SubscriptionPlan))
                .sort((a, b) => a.order - b.order);
        } catch (error) {
            console.error('Error fetching plans:', error);
            return [];
        }
    },

    async getPlan(id: string): Promise<SubscriptionPlan | null> {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() } as SubscriptionPlan;
            }
            return null;
        } catch (error) {
            console.error('Error fetching plan:', error);
            return null;
        }
    },

    async updatePlan(plan: SubscriptionPlan) {
        try {
            const docRef = doc(db, COLLECTION_NAME, plan.id);
            const { id, ...data } = plan; // Remove ID from data
            await setDoc(docRef, {
                ...data,
                updatedAt: new Date()
            }, { merge: true });
            return true;
        } catch (error) {
            console.error('Error updating plan:', error);
            throw error;
        }
    },

    async deletePlan(planId: string) {
        try {
            const docRef = doc(db, COLLECTION_NAME, planId);
            await deleteDoc(docRef);
            return true;
        } catch (error) {
            console.error('Error deleting plan:', error);
            throw error;
        }
    },

    async initializeDefaults() {
        const promises = DEFAULT_PLANS.map(plan => {
            const { id, ...data } = plan;
            return setDoc(doc(db, COLLECTION_NAME, id), data);
        });
        await Promise.all(promises);
    },


    resolvePrice(
        plan: SubscriptionPlan,
        userCountryCode: string,
        targetCurrency: string,
        rates: any,
        accountType?: 'club' | 'academy' | 'trainer' | 'agent' | 'player'
    ): PriceResult {
        let baseOriginalPrice = plan.base_original_price;
        let basePrice = plan.base_price;
        let accountTypeDiscount = 0;

        // 1. Check for Account Type Override (أعلى أولوية)
        if (accountType && plan.accountTypeOverrides?.[accountType]?.active) {
            const accountOverride = plan.accountTypeOverrides[accountType];

            if (accountOverride.price !== undefined) {
                // سعر مخصص محدد
                basePrice = accountOverride.price;
                baseOriginalPrice = accountOverride.original_price || baseOriginalPrice;
            } else if (accountOverride.discount_percentage) {
                // خصم بالنسبة المئوية
                accountTypeDiscount = accountOverride.discount_percentage;
                basePrice = basePrice * (1 - accountTypeDiscount / 100);
            }
        }

        // 2. Check for Country Override
        if (plan.overrides && plan.overrides[userCountryCode] && plan.overrides[userCountryCode].active) {
            const override = plan.overrides[userCountryCode];

            // تطبيق خصم نوع الحساب على السعر المخصص للدولة
            let finalPrice = override.price;
            if (accountTypeDiscount > 0) {
                finalPrice = finalPrice * (1 - accountTypeDiscount / 100);
            }

            return {
                currency: override.currency,
                originalPrice: override.original_price,
                price: Math.ceil(finalPrice),
                isOverride: true,
                accountTypeDiscount
            };
        }

        // 3. Fallback to Base Price (Convert if needed)
        if (targetCurrency === plan.base_currency) {
            return {
                currency: plan.base_currency,
                originalPrice: Math.ceil(baseOriginalPrice),
                price: Math.ceil(basePrice),
                isOverride: false,
                accountTypeDiscount
            };
        }

        // 4. Auto Convert
        const convertedPrice = convertCurrency(basePrice, plan.base_currency, targetCurrency, rates);
        const convertedOriginal = convertCurrency(baseOriginalPrice, plan.base_currency, targetCurrency, rates);

        return {
            currency: targetCurrency,
            originalPrice: Math.ceil(convertedOriginal),
            price: Math.ceil(convertedPrice),
            isOverride: false,
            accountTypeDiscount
        };
    }
};
