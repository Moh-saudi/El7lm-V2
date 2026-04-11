import { supabase } from '@/lib/supabase/config';

// إنشاء إشعار تجريبي
export async function createTestNotification(userId: string) {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase.from('notifications').insert({
      id: crypto.randomUUID(),
      userId,
      title: 'إشعار تجريبي',
      message: 'هذا إشعار تجريبي لاختبار نظام الإشعارات',
      type: 'info',
      isRead: false,
      scope: 'system',
      createdAt: now,
      updatedAt: now
    }).select('id').single();

    if (error) throw error;
    console.log('تم إنشاء إشعار تجريبي:', data.id);
    return data.id;
  } catch (error) {
    console.error('خطأ في إنشاء الإشعار التجريبي:', error);
    throw error;
  }
}

// إنشاء إشعار تفاعلي تجريبي
export async function createTestInteractionNotification(userId: string) {
  try {
    const { data, error } = await supabase.from('interaction_notifications').insert({
      id: crypto.randomUUID(),
      userId,
      viewerId: 'test-viewer',
      viewerName: 'مستخدم تجريبي',
      viewerType: 'player',
      viewerAccountType: 'player',
      type: 'profile_view',
      title: 'شخص ما شاهد ملفك الشخصي',
      message: 'مستخدم تجريبي قام بمشاهدة ملفك الشخصي',
      emoji: '👀',
      isRead: false,
      priority: 'medium',
      createdAt: new Date().toISOString()
    }).select('id').single();

    if (error) throw error;
    console.log('تم إنشاء إشعار تفاعلي تجريبي:', data.id);
    return data.id;
  } catch (error) {
    console.error('خطأ في إنشاء الإشعار التفاعلي التجريبي:', error);
    throw error;
  }
}

// إنشاء إشعار دفع تجريبي
export async function createTestPaymentNotification(userId: string) {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase.from('notifications').insert({
      id: crypto.randomUUID(),
      userId,
      title: 'تم استلام دفعة جديدة',
      message: 'تم استلام دفعة بقيمة 500 جنيه مصري',
      type: 'success',
      isRead: false,
      link: '/dashboard/subscription',
      metadata: {
        paymentId: 'test-payment-123',
        amount: 500,
        currency: 'EGP',
        paymentMethod: 'بطاقة ائتمان'
      },
      scope: 'system',
      createdAt: now,
      updatedAt: now
    }).select('id').single();

    if (error) throw error;
    console.log('تم إنشاء إشعار دفع تجريبي:', data.id);
    return data.id;
  } catch (error) {
    console.error('خطأ في إنشاء إشعار الدفع التجريبي:', error);
    throw error;
  }
}

// إنشاء إشعار تحذير تجريبي
export async function createTestWarningNotification(userId: string) {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase.from('notifications').insert({
      id: crypto.randomUUID(),
      userId,
      title: 'اشتراكك على وشك الانتهاء',
      message: 'سينتهي اشتراكك خلال 3 أيام. يرجى تجديد الاشتراك',
      type: 'warning',
      isRead: false,
      link: '/dashboard/subscription',
      metadata: {
        daysRemaining: 3
      },
      scope: 'system',
      createdAt: now,
      updatedAt: now
    }).select('id').single();

    if (error) throw error;
    console.log('تم إنشاء إشعار تحذير تجريبي:', data.id);
    return data.id;
  } catch (error) {
    console.error('خطأ في إنشاء إشعار التحذير التجريبي:', error);
    throw error;
  }
}
