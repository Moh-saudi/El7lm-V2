import { db } from '@/lib/firebase/config';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

/**
 * تفعيل اشتراك للمستخدم بناءً على المدفوعة
 */
export async function activateSubscription(payment: any) {
    try {
        const userId = payment.playerId || payment.userId;
        if (!userId || userId === 'unknown') {
            console.error('لا يوجد معرف مستخدم للتفعيل:', payment);
            throw new Error('لا يوجد معرف مستخدم صالح');
        }

        // تحديد مدة الاشتراك بناءً على نوع الباقة
        const packageType = payment.packageType || payment.package_type || 'subscription_3months';
        let subscriptionMonths = 3; // افتراضي 3 أشهر
        let packageName = 'اشتراك 3 شهور';
        let packageDuration = '3 شهور';

        if (packageType.includes('annual') || packageType.includes('yearly') || packageType.includes('سنوي')) {
            subscriptionMonths = 12;
            packageName = 'اشتراك سنوي';
            packageDuration = '12 شهر';
        } else if (packageType.includes('6months') || packageType.includes('6 شهور')) {
            subscriptionMonths = 6;
            packageName = 'اشتراك 6 شهور';
            packageDuration = '6 شهور';
        } else if (packageType.includes('3months') || packageType.includes('3 شهور')) {
            subscriptionMonths = 3;
            packageName = 'اشتراك 3 شهور';
            packageDuration = '3 شهور';
        }

        const expiresAt = new Date(Date.now() + subscriptionMonths * 30 * 24 * 60 * 60 * 1000);

        const subscriptionData = {
            userId: userId,
            plan_name: packageName,
            package_name: packageName,
            packageType: packageType,
            package_duration: packageDuration,
            package_price: payment.amount,
            payment_id: payment.id,
            activated_at: new Date(),
            expires_at: expiresAt,
            end_date: expiresAt,
            status: 'active',
            features: ['unlimited_access', 'premium_support', 'advanced_features'],
            invoice_number: `INV-${Date.now()}`,
            receipt_url: payment.receiptImage || payment.receiptUrl || '',
            created_at: new Date(),
            updated_at: new Date()
        };

        // حفظ الاشتراك في قاعدة البيانات
        const subscriptionRef = doc(db, 'subscriptions', userId);

        await updateDoc(subscriptionRef, subscriptionData).catch(async () => {
            // إذا لم يكن موجود، أنشئه
            await addDoc(collection(db, 'subscriptions'), {
                ...subscriptionData,
                id: userId
            });
        });

        // تحديث بيانات المستخدم
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            subscriptionStatus: 'active',
            subscriptionExpiresAt: subscriptionData.expires_at,
            subscriptionEndDate: subscriptionData.expires_at,
            lastPaymentId: payment.id,
            packageType: packageType,
            selectedPackage: packageName,
            updatedAt: new Date()
        });

        // تحديث حالة الدفع في الجدول الأصلي
        if (payment.collection) {
            try {
                const paymentRef = doc(db, payment.collection, payment.id);
                await updateDoc(paymentRef, {
                    status: 'completed',
                    subscription_status: 'active',
                    subscription_expires_at: subscriptionData.expires_at,
                    updatedAt: new Date(),
                    updated_at: new Date()
                });
            } catch (error: any) {
                console.log(`تحذير: لم نتمكن من تحديث المدفوعة الأصلية:`, error.message);
            }
        }

        console.log('✅ تم تفعيل الاشتراك بنجاح:', {
            userId,
            packageName,
            expiresAt
        });

        return {
            success: true,
            subscriptionData
        };
    } catch (error: any) {
        console.error('❌ خطأ في تفعيل الاشتراك:', error);
        throw error;
    }
}

/**
 * تحديث حالة المدفوعة
 */
export async function updatePaymentStatus(
    payment: any,
    newStatus: string,
    autoActivateSubscription: boolean = true
) {
    try {
        if (!payment.collection || !payment.id) {
            throw new Error('بيانات المدفوعة غير كاملة');
        }

        // تحديث الحالة في قاعدة البيانات
        const paymentRef = doc(db, payment.collection, payment.id);
        await updateDoc(paymentRef, {
            status: newStatus,
            updatedAt: new Date(),
            updatedBy: 'admin'
        });

        // إذا كانت الحالة "مقبولة" وتفعيل تلقائي مطلوب
        if (autoActivateSubscription && ['completed', 'accepted', 'success', 'paid'].includes(newStatus)) {
            await activateSubscription(payment);
            toast.success('✅ تم تحديث الحالة وتفعيل الاشتراك');
        } else {
            toast.success('✅ تم تحديث الحالة بنجاح');
        }

        return {
            success: true,
            newStatus
        };
    } catch (error: any) {
        console.error('❌ خطأ في تحديث حالة المدفوعة:', error);
        toast.error('فشل في تحديث الحالة');
        throw error;
    }
}

/**
 * إلغاء الاشتراك
 */
export async function deactivateSubscription(userId: string) {
    try {
        if (!userId || userId === 'unknown') {
            throw new Error('معرف مستخدم غير صالح');
        }

        // تحديث بيانات الاشتراك
        const subscriptionRef = doc(db, 'subscriptions', userId);
        await updateDoc(subscriptionRef, {
            status: 'cancelled',
            cancelled_at: new Date(),
            updated_at: new Date()
        });

        // تحديث بيانات المستخدم
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            subscriptionStatus: 'cancelled',
            updatedAt: new Date()
        });

        toast.success('✅ تم إلغاء الاشتراك بنجاح');

        return {
            success: true
        };
    } catch (error: any) {
        console.error('❌ خطأ في إلغاء الاشتراك:', error);
        toast.error('فشل في إلغاء الاشتراك');
        throw error;
    }
}
