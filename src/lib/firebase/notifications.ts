import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

export interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead?: boolean;
  link?: string;
  metadata?: Record<string, any>;
  // نطاق الإشعار: system (للكل)، club/academy/trainer (للمؤسسة)، userId (للمستخدم)
  scope: 'system' | 'club' | 'academy' | 'trainer' | string;
  // معرف المؤسسة المرتبطة (للإشعارات المؤسسية)
  organizationId?: string;
}

// إضافة إشعار جديد
export async function addNotification(data: NotificationData) {
  try {
    const notificationsRef = collection(db, 'notifications');
    const notification = {
      ...data,
      isRead: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(notificationsRef, notification);
    return docRef.id;
  } catch (error) {
    console.error('Error adding notification:', error);
    throw error;
  }
}

// إضافة إشعار للدفع
export async function addPaymentNotification({
  userId,
  amount,
  currency,
  status,
  paymentId,
  paymentMethod
}: {
  userId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected';
  paymentId: string;
  paymentMethod: string;
}) {
  let title: string;
  let message: string;
  let type: 'info' | 'success' | 'warning' | 'error';

  switch (status) {
    case 'pending':
      title = 'طلب دفع جديد';
      message = `تم استلام طلب دفع جديد بقيمة ${amount} ${currency} عبر ${paymentMethod}. في انتظار المراجعة.`;
      type = 'info';
      break;
    case 'approved':
      title = 'تم قبول الدفع';
      message = `تم قبول طلب الدفع بقيمة ${amount} ${currency} وتفعيل الاشتراكات.`;
      type = 'success';
      break;
    case 'rejected':
      title = 'تم رفض الدفع';
      message = `تم رفض طلب الدفع بقيمة ${amount} ${currency}. يرجى التواصل مع الدعم الفني.`;
      type = 'error';
      break;
  }

  return addNotification({
    userId,
    title,
    message,
    type,
    link: `/dashboard/payments/${paymentId}`,
    metadata: {
      paymentId,
      amount,
      currency,
      paymentMethod
    }
  });
}

// إضافة إشعار احتفالي ذكي لمركز الإشعارات في الهيدر (smart_notifications)
export async function addSmartCelebrationNotification({
  userId,
  amount,
  currency,
  packageName,
  playersCount
}: {
  userId: string;
  amount: number;
  currency: string;
  packageName?: string;
  playersCount?: number;
}) {
  try {
    const smartRef = collection(db, 'smart_notifications');
    const title = 'تم تفعيل اشتراكك بنجاح!';
    const details = [
      packageName ? `باقة ${packageName}` : null,
      amount ? `${amount.toLocaleString()} ${currency}` : null,
      playersCount ? `${playersCount} لاعب` : null
    ].filter(Boolean).join(' • ');

    await addDoc(smartRef, {
      userId,
      viewerId: 'system',
      viewerName: 'نظام الاشتراكات',
      viewerType: 'system',
      type: 'achievement',
      title: `${title} 🎉`,
      message: details || 'تم تفعيل اشتراكك. استمتع بالمميزات الكاملة!',
      emoji: '🎉',
      isRead: false,
      priority: 'high',
      actionUrl: '/dashboard/subscription',
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error adding smart celebration notification:', error);
  }
}

// إضافة إشعار للاشتراك
export async function addSubscriptionNotification({
  userId,
  status,
  endDate,
  daysRemaining
}: {
  userId: string;
  status: 'active' | 'expired' | 'expiring_soon';
  endDate: Date;
  daysRemaining?: number;
}) {
  let title: string;
  let message: string;
  let type: 'info' | 'success' | 'warning' | 'error';

  switch (status) {
    case 'active':
      title = 'تم تفعيل الاشتراك';
      message = `تم تفعيل اشتراكك بنجاح حتى ${endDate.toLocaleDateString('ar-EG')}.`;
      type = 'success';
      break;
    case 'expired':
      title = 'انتهى الاشتراك';
      message = 'انتهت صلاحية اشتراكك. يرجى تجديد الاشتراك للاستمرار في استخدام الخدمات.';
      type = 'error';
      break;
    case 'expiring_soon':
      title = 'اشتراكك على وشك الانتهاء';
      message = `سينتهي اشتراكك خلال ${daysRemaining} يوم. يرجى تجديد الاشتراك لتجنب انقطاع الخدمة.`;
      type = 'warning';
      break;
  }

  return addNotification({
    userId,
    title,
    message,
    type,
    link: '/dashboard/subscription',
    metadata: {
      status,
      endDate: endDate.toISOString(),
      daysRemaining
    }
  });
}

// إضافة إشعار للأخبار والتحديثات
export async function addNewsNotification({
  userId,
  title,
  message,
  link
}: {
  userId: string;
  title: string;
  message: string;
  link?: string;
}) {
  return addNotification({
    userId,
    title,
    message,
    type: 'info',
    link,
    metadata: {
      type: 'news'
    }
  });
}
