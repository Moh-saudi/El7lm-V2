/**
 * سكريبت تهيئة نظام التسعير الفعلي
 * بناءً على الأسعار والعروض الحالية للاعبين
 */

import { db } from '@/lib/firebase/config';
import { collection, doc, setDoc } from 'firebase/firestore';

export async function initializeRealPricingSystem(userId: string) {
    try {
        console.log('🚀 بدء تهيئة نظام التسعير الفعلي...');

        // ============================================
        // 1️⃣ إنشاء الباقات الأساسية (للاعبين فقط حالياً)
        // ============================================

        const basePlans = [
            {
                id: 'player_3months',
                name: 'باقة ثلاثة أشهر',
                key: '3months',
                accountType: 'player',
                basePrice: 40, // السعر الأساسي بالدولار
                currency: 'USD',
                duration: 90,
                features: [
                    { id: 'f1', name: 'إنشاء ملف شخصي احترافي', included: true },
                    { id: 'f2', name: 'البحث عن الفرص (أندية، أكاديميات)', included: true },
                    { id: 'f3', name: 'عرض الملف الشخصي للمدربين والأندية', included: true },
                    { id: 'f4', name: 'تتبع الإحصائيات الأساسية', included: true },
                    { id: 'f5', name: 'التواصل مع الأندية', included: true },
                ],
                bonusFeatures: [
                    { id: 'b1', name: 'دعم فني عبر البريد الإلكتroني', description: 'رد خلال 48 ساعة', included: true },
                ],
                isActive: true,
                displayOrder: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: userId
            },
            {
                id: 'player_6months',
                name: 'باقة ستة أشهر',
                key: '6months',
                accountType: 'player',
                basePrice: 70,
                currency: 'USD',
                duration: 180,
                features: [
                    { id: 'f1', name: 'إنشاء ملف شخصي احترافي', included: true },
                    { id: 'f2', name: 'البحث عن الفرص (أندية، أكاديميات)', included: true },
                    { id: 'f3', name: 'عرض الملف الشخصي للمدربين والأندية', included: true },
                    { id: 'f4', name: 'تتبع الإحصائيات المتقدمة', included: true },
                    { id: 'f5', name: 'التواصل مع الأندية', included: true },
                    { id: 'f6', name: 'تحليل الأداء الشهري', included: true },
                ],
                bonusFeatures: [
                    { id: 'b1', name: 'دعم فني ذو أولوية', description: 'رد خلال 24 ساعة', included: true },
                    { id: 'b2', name: 'تحديثات شهرية عن الفرص', included: true },
                ],
                isActive: true,
                displayOrder: 2,
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: userId
            },
            {
                id: 'player_1year',
                name: 'باقة سنة كاملة',
                key: '1year',
                accountType: 'player',
                basePrice: 100,
                currency: 'USD',
                duration: 365,
                features: [
                    { id: 'f1', name: 'إنشاء ملف شخصي احترافي', included: true },
                    { id: 'f2', name: 'البحث عن الفرص (أندية، أكاديميات)', included: true },
                    { id: 'f3', name: 'عرض الملف الشخصي للمدربين والأندية', included: true },
                    { id: 'f4', name: 'تتبع الإحصائيات المتقدمة', included: true },
                    { id: 'f5', name: 'التواصل مع الأندية', included: true },
                    { id: 'f6', name: 'تحليل الأداء الشهري', included: true },
                    { id: 'f7', name: 'تقارير سنوية مفصلة', included: true },
                ],
                bonusFeatures: [
                    { id: 'b1', name: 'دعم فني VIP', description: 'رد فوري', included: true },
                    { id: 'b2', name: 'تحديثات أسبوعية عن الفرص', included: true },
                    { id: 'b3', name: 'استشارات مجانية مع خبراء', included: true },
                ],
                isActive: true,
                displayOrder: 3,
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: userId
            }
        ];

        console.log('📦 إنشاء الباقات الأساسية...');
        for (const plan of basePlans) {
            const planRef = doc(db, 'subscription_plans', plan.id);
            await setDoc(planRef, plan);
            console.log(`  ✅ تم إنشاء: ${plan.name}`);
        }

        // ============================================
        // 2️⃣ إنشاء التخصيصات لمصر
        // ============================================

        const egyptOverrides = [
            {
                id: 'override_egypt_3months',
                countryCode: 'EG',
                planKey: '3months',
                accountType: 'player',
                price: 240, // السعر الأصلي قبل الخصم
                currency: 'EGP',
                isActive: true,
                effectiveFrom: new Date('2024-01-01'),
                effectiveTo: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: userId
            },
            {
                id: 'override_egypt_6months',
                countryCode: 'EG',
                planKey: '6months',
                accountType: 'player',
                price: 300, // السعر الأصلي قبل الخصم
                currency: 'EGP',
                isActive: true,
                effectiveFrom: new Date('2024-01-01'),
                effectiveTo: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: userId
            },
            {
                id: 'override_egypt_1year',
                countryCode: 'EG',
                planKey: '1year',
                accountType: 'player',
                price: 360, // السعر الأصلي قبل الخصم
                currency: 'EGP',
                isActive: true,
                effectiveFrom: new Date('2024-01-01'),
                effectiveTo: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: userId
            }
        ];

        console.log('🇪🇬 إنشاء تخصيصات الأسعار لمصر...');
        for (const override of egyptOverrides) {
            const overrideRef = doc(db, 'pricing_overrides', override.id);
            await setDoc(overrideRef, override);
            console.log(`  ✅ تم إنشاء: ${override.id} - ${override.price} ${override.currency}`);
        }

        // ============================================
        // 3️⃣ إنشاء العروض الترويجية (خصم 50%)
        // ============================================

        const promotionalOffers = [
            {
                id: 'offer_launch_50_egypt',
                name: 'عرض الإطلاق - مصر 50%',
                description: 'خصم 50% على جميع باقات اللاعبين في مصر',
                code: 'LAUNCH50EG',
                offerType: 'launch' as const,
                applicablePlans: ['3months', '6months', '1year'],
                applicableCountries: ['EG'],
                applicableAccountTypes: ['player'],
                discountType: 'percentage' as const,
                discountValue: 50,
                startDate: new Date('2024-01-01'),
                endDate: new Date('2025-12-31'),
                status: 'active' as const,
                usageLimit: null,
                usageCount: 0,
                displayBadge: '🎉 خصم 50%',
                displayColor: '#10B981',
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: userId
            },
            {
                id: 'offer_launch_50_global',
                name: 'عرض الإطلاق - عالمي 50%',
                description: 'خصم 50% على جميع باقات اللاعبين عالمياً',
                code: 'LAUNCH50GLOBAL',
                offerType: 'launch' as const,
                applicablePlans: ['3months', '6months', '1year'],
                applicableCountries: ['*'], // جميع الدول
                applicableAccountTypes: ['player'],
                discountType: 'percentage' as const,
                discountValue: 50,
                startDate: new Date('2024-01-01'),
                endDate: new Date('2025-12-31'),
                status: 'active' as const,
                usageLimit: null,
                usageCount: 0,
                displayBadge: '🌍 خصم عالمي 50%',
                displayColor: '#3B82F6',
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: userId
            }
        ];

        console.log('🎁 إنشاء العروض الترويجية...');
        for (const offer of promotionalOffers) {
            const offerRef = doc(db, 'promotional_offers', offer.id);
            await setDoc(offerRef, offer);
            console.log(`  ✅ تم إنشاء: ${offer.name}`);
        }

        // ============================================
        // 4️⃣ الملخص النهائي
        // ============================================

        console.log('\n' + '='.repeat(60));
        console.log('✨ تم تهيئة نظام التسعير بنجاح!');
        console.log('='.repeat(60));

        console.log('\n📊 الملخص:');
        console.log(`   ✅ ${basePlans.length} باقات أساسية`);
        console.log(`   ✅ ${egyptOverrides.length} تخصيصات لمصر`);
        console.log(`   ✅ ${promotionalOffers.length} عروض ترويجية`);

        console.log('\n💰 الأسعار النهائية:');
        console.log('\n   🇪🇬 مصر (بعد الخصم 50%):');
        console.log('   • 3 أشهر: 120 ج.م (الأصلي: 240 ج.م)');
        console.log('   • 6 أشهر: 150 ج.م (الأصلي: 300 ج.م)');
        console.log('   • سنة: 180 ج.م (الأصلي: 360 ج.م)');

        console.log('\n   🌍 عالمي (بعد الخصم 50%):');
        console.log('   • 3 أشهر: $20 (الأصلي: $40)');
        console.log('   • 6 أشهر: $35 (الأصلي: $70)');
        console.log('   • سنة: $50 (الأصلي: $100)');

        console.log('\n🔗 الخطوات التالية:');
        console.log('   1. تحديث صفحة BulkPaymentPage لاستخدام هذا النظام');
        console.log('   2. اختبار عملية الدفع كاملة');
        console.log('   3. تحديد أسعار الأندية والأكاديميات');
        console.log('   4. إطلاق النظام للعملاء');

        console.log('\n' + '='.repeat(60));

    } catch (error) {
        console.error('❌ خطأ في تهيئة نظام التسعير:', error);
        throw error;
    }
}

// مثال على الاستخدام:
// import { initializeRealPricingSystem } from '@/lib/services/init-real-pricing';
// await initializeRealPricingSystem('your-user-id');
