import { supabase } from '@/lib/supabase/config';
import { toast } from 'react-hot-toast';

/**
 * تفعيل اشتراك للمستخدم بناءً على المدفوعة
 */
export async function activateSubscription(payment: Record<string, unknown>) {
    try {
        const userId = String(payment.playerId || payment.userId || '');
        if (!userId || userId === 'unknown') {
            console.error('لا يوجد معرف مستخدم للتفعيل:', payment);
            throw new Error('لا يوجد معرف مستخدم صالح');
        }

        const rawDuration = String(payment.packageDuration || payment.package_duration || payment.packageName || payment.package_name || '');
        let subscriptionMonths = 3;
        const match = rawDuration.match(/(\d+)/);
        if (match) {
            subscriptionMonths = parseInt(match[1]);
        } else if (rawDuration.includes('سنة') || rawDuration.includes('سنوي') || rawDuration.includes('annual') || rawDuration.includes('year') || rawDuration.includes('12')) {
            subscriptionMonths = 12;
        }

        const packageName = String(payment.packageName || payment.package_name || `اشتراك ${subscriptionMonths} شهور`);
        const packageDuration = String(payment.packageDuration || payment.package_duration || `${subscriptionMonths} شهور`);
        const packageType = String(payment.packageType || payment.package_type || 'custom');
        const now = new Date().toISOString();
        const expiresAt = new Date(Date.now() + subscriptionMonths * 30 * 24 * 60 * 60 * 1000).toISOString();

        const subscriptionData = {
            id: userId,
            userId,
            plan_name: packageName,
            package_name: packageName,
            packageType,
            package_duration: packageDuration,
            package_price: payment.amount,
            payment_id: payment.id,
            activated_at: now,
            expires_at: expiresAt,
            end_date: expiresAt,
            status: 'active',
            features: ['unlimited_access', 'premium_support', 'advanced_features'],
            invoice_number: `INV-${Date.now()}`,
            receipt_url: String(payment.receiptImage || payment.receiptUrl || ''),
            created_at: now,
            updated_at: now,
        };

        await supabase.from('subscriptions').upsert(subscriptionData);

        await supabase.from('users').update({
            subscriptionStatus: 'active',
            subscriptionExpiresAt: expiresAt,
            subscriptionEndDate: expiresAt,
            lastPaymentId: payment.id,
            packageType,
            selectedPackage: packageName,
            updatedAt: now,
        }).eq('id', userId);

        if (payment.collection && payment.id) {
            try {
                await supabase.from(String(payment.collection)).update({
                    status: 'completed',
                    subscription_status: 'active',
                    subscription_expires_at: expiresAt,
                    updatedAt: now,
                    updated_at: now,
                }).eq('id', payment.id);
            } catch (error: unknown) {
                console.log('تحذير: لم نتمكن من تحديث المدفوعة الأصلية:', error instanceof Error ? error.message : error);
            }
        }

        console.log('✅ تم تفعيل الاشتراك بنجاح:', { userId, packageName, expiresAt });
        return { success: true, subscriptionData };
    } catch (error: unknown) {
        console.error('❌ خطأ في تفعيل الاشتراك:', error);
        throw error;
    }
}

/**
 * تحديث حالة المدفوعة
 */
export async function updatePaymentStatus(
    payment: Record<string, unknown>,
    newStatus: string,
    autoActivateSubscription: boolean = true
) {
    try {
        if (!payment.collection || !payment.id) throw new Error('بيانات المدفوعة غير كاملة');

        await supabase.from(String(payment.collection)).update({
            status: newStatus,
            updatedAt: new Date().toISOString(),
            updatedBy: 'admin',
        }).eq('id', payment.id);

        if (autoActivateSubscription && ['completed', 'accepted', 'success', 'paid'].includes(newStatus)) {
            await activateSubscription(payment);
            toast.success('✅ تم تحديث الحالة وتفعيل الاشتراك');
        } else {
            toast.success('✅ تم تحديث الحالة بنجاح');
        }

        return { success: true, newStatus };
    } catch (error: unknown) {
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
        if (!userId || userId === 'unknown') throw new Error('معرف مستخدم غير صالح');

        const now = new Date().toISOString();
        await supabase.from('subscriptions').update({ status: 'cancelled', cancelled_at: now, updated_at: now }).eq('id', userId);
        await supabase.from('users').update({ subscriptionStatus: 'cancelled', updatedAt: now }).eq('id', userId);

        toast.success('✅ تم إلغاء الاشتراك بنجاح');
        return { success: true };
    } catch (error: unknown) {
        console.error('❌ خطأ في إلغاء الاشتراك:', error);
        toast.error('فشل في إلغاء الاشتراك');
        throw error;
    }
}
