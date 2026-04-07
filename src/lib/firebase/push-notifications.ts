import { supabase } from '@/lib/supabase/config';
import { toast } from 'sonner';

/**
 * التحقق من دعم المتصفح للإشعارات
 */
export function isNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * التحقق من حالة الإذن الحالية
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

/**
 * طلب إذن الإشعارات من المستخدم
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  try {
    if (!isNotificationSupported()) {
      console.warn('⚠️ Notifications not supported');
      return 'denied';
    }
    const permission = await Notification.requestPermission();
    console.log('📱 Notification permission:', permission);
    return permission;
  } catch (error) {
    console.error('❌ Error requesting notification permission:', error);
    return 'denied';
  }
}

/**
 * تسجيل Service Worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  try {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.warn('⚠️ Service Worker not supported');
      return null;
    }

    const existingRegistration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (existingRegistration) {
      console.log('✅ Service Worker already registered');
      return existingRegistration;
    }

    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('✅ Service Worker registered:', registration);
    await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    console.error('❌ Error registering Service Worker:', error);
    return null;
  }
}

/**
 * حفظ Push Token في Supabase
 */
export async function saveFCMToken(userId: string, token: string): Promise<void> {
  try {
    await supabase.from('users').update({
      fcmToken: token,
      fcmTokenUpdatedAt: new Date().toISOString(),
      notificationsEnabled: true
    }).eq('id', userId);

    console.log('✅ Push token saved to Supabase');
  } catch (error) {
    console.error('❌ Error saving push token:', error);
  }
}

/**
 * الحصول على Push Token عبر VAPID
 */
export async function getFCMToken(userId?: string): Promise<string | null> {
  try {
    if (!isNotificationSupported()) {
      console.warn('⚠️ Notifications not supported');
      return null;
    }

    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.warn('⚠️ Notification permission denied');
      return null;
    }

    const registration = await registerServiceWorker();
    if (!registration) {
      console.error('❌ Failed to register Service Worker');
      return null;
    }

    // Web Push subscription via VAPID
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      console.warn('⚠️ VAPID public key not configured');
      return null;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidPublicKey
    });

    const token = JSON.stringify(subscription);

    if (userId) {
      await saveFCMToken(userId, token);
    }

    return token;
  } catch (error) {
    console.error('❌ Error getting push token:', error);
    return null;
  }
}

/**
 * إعداد معالج الإشعارات في الواجهة
 */
export function setupForegroundNotifications(
  onNotificationReceived?: (payload: any) => void
): (() => void) | null {
  if (!isNotificationSupported()) return null;

  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'PUSH_NOTIFICATION') {
      const payload = event.data.payload;
      const title = payload?.title || 'إشعار جديد';
      const body = payload?.body || '';

      toast.info(title, {
        description: body,
        duration: 5000,
        action: payload?.click_action ? {
          label: 'عرض',
          onClick: () => { window.location.href = payload.click_action; }
        } : undefined
      });

      onNotificationReceived?.(payload);
    }
  };

  navigator.serviceWorker.addEventListener('message', handleMessage);
  console.log('✅ Foreground notifications setup complete');

  return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
}

/**
 * حذف Push Token (عند تسجيل الخروج)
 */
export async function deleteFCMToken(userId: string): Promise<void> {
  try {
    await supabase.from('users').update({
      fcmToken: null,
      fcmTokenUpdatedAt: new Date().toISOString(),
      notificationsEnabled: false
    }).eq('id', userId);

    console.log('✅ Push token deleted');
  } catch (error) {
    console.error('❌ Error deleting push token:', error);
  }
}

/**
 * اختبار إرسال إشعار محلي
 */
export async function testLocalNotification(): Promise<void> {
  try {
    if (!isNotificationSupported()) {
      toast.error('المتصفح لا يدعم الإشعارات');
      return;
    }

    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      toast.error('يرجى السماح بالإشعارات في إعدادات المتصفح');
      return;
    }

    new Notification('🎉 تم تفعيل الإشعارات!', {
      body: 'سيتم إرسال إشعارات فورية عند وصول رسائل أو تحديثات جديدة',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      dir: 'rtl',
      lang: 'ar'
    } as NotificationOptions);

    toast.success('تم إرسال إشعار تجريبي!');
  } catch (error) {
    console.error('❌ Error sending test notification:', error);
    toast.error('فشل إرسال الإشعار التجريبي');
  }
}

// تصدير الدوال
export default {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  registerServiceWorker,
  getFCMToken,
  saveFCMToken,
  setupForegroundNotifications,
  deleteFCMToken,
  testLocalNotification
};
