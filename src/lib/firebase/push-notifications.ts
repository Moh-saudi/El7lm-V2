import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getMessaging, getToken, Messaging, onMessage } from 'firebase/messaging';
import { toast } from 'sonner';
import { db } from './config';

// VAPID Key من Firebase Console
// للحصول عليه: Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
const VAPID_KEY = 'BKxGVYqPvL8sP9xZCvRQJMzKCYHvLfYGzWJmZ9kK_2QY3xMnBpQzLvZqYHJxKmGvNnPqWzXcVbN2mKlJ3hG4sYU';

let messaging: Messaging | null = null;

/**
 * تهيئة Firebase Cloud Messaging
 */
export function initializeMessaging(): Messaging | null {
  try {
    // التحقق من دعم المتصفح
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.warn('⚠️ Service Worker not supported in this browser');
      return null;
    }

    if (!('Notification' in window)) {
      console.warn('⚠️ Notifications not supported in this browser');
      return null;
    }

    // تهيئة messaging
    const { app } = require('./config');
    messaging = getMessaging(app);

    console.log('✅ Firebase Messaging initialized');
    return messaging;
  } catch (error) {
    console.error('❌ Error initializing Firebase Messaging:', error);
    return null;
  }
}

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

    // التحقق من وجود Service Worker مسجل بالفعل
    const existingRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if (existingRegistration) {
      console.log('✅ Service Worker already registered');
      return existingRegistration;
    }

    // تسجيل Service Worker الجديد
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });

    console.log('✅ Service Worker registered:', registration);

    // الانتظار حتى يصبح Service Worker نشطاً
    await navigator.serviceWorker.ready;
    console.log('✅ Service Worker ready');

    return registration;
  } catch (error) {
    console.error('❌ Error registering Service Worker:', error);
    return null;
  }
}

/**
 * الحصول على FCM Token
 */
export async function getFCMToken(userId?: string): Promise<string | null> {
  try {
    // التحقق من دعم المتصفح
    if (!isNotificationSupported()) {
      console.warn('⚠️ Notifications not supported');
      return null;
    }

    // التحقق من الإذن
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.warn('⚠️ Notification permission denied');
      return null;
    }

    // تسجيل Service Worker
    const registration = await registerServiceWorker();
    if (!registration) {
      console.error('❌ Failed to register Service Worker');
      return null;
    }

    // تهيئة messaging
    if (!messaging) {
      messaging = initializeMessaging();
    }

    if (!messaging) {
      console.error('❌ Failed to initialize messaging');
      return null;
    }

    // الحصول على الـ Token
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      console.log('✅ FCM Token:', token);

      // حفظ الـ Token في Firestore إذا كان المستخدم مسجل دخول
      if (userId) {
        await saveFCMToken(userId, token);
      }

      return token;
    } else {
      console.warn('⚠️ No FCM token available');
      return null;
    }
  } catch (error: unknown) {
    console.error('❌ Error getting FCM token:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    return null;
  }
}

/**
 * حفظ FCM Token في Firestore
 */
export async function saveFCMToken(userId: string, token: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      fcmToken: token,
      fcmTokenUpdatedAt: serverTimestamp(),
      notificationsEnabled: true
    });

    console.log('✅ FCM Token saved to Firestore');
  } catch (error) {
    console.error('❌ Error saving FCM token:', error);
  }
}

/**
 * إعداد معالج الإشعارات في الواجهة (عندما التطبيق مفتوح)
 */
export function setupForegroundNotifications(
  onNotificationReceived?: (payload: any) => void
): (() => void) | null {
  try {
    if (!messaging) {
      messaging = initializeMessaging();
    }

    if (!messaging) {
      console.error('❌ Failed to initialize messaging');
      return null;
    }

    // معالجة الإشعارات عندما التطبيق مفتوح
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('📨 Foreground notification received:', payload);

      const notificationTitle = payload.notification?.title || 'إشعار جديد';
      const notificationBody = payload.notification?.body || '';

      // عرض Toast notification
      toast.info(notificationTitle, {
        description: notificationBody,
        duration: 5000,
        action: payload.data?.click_action ? {
          label: 'عرض',
          onClick: () => {
            window.location.href = payload.data.click_action;
          }
        } : undefined
      });

      // استدعاء callback إذا كان موجوداً
      if (onNotificationReceived) {
        onNotificationReceived(payload);
      }
    });

    console.log('✅ Foreground notifications setup complete');
    return unsubscribe;
  } catch (error) {
    console.error('❌ Error setting up foreground notifications:', error);
    return null;
  }
}

/**
 * حذف FCM Token (عند تسجيل الخروج)
 */
export async function deleteFCMToken(userId: string): Promise<void> {
  try {
    if (!messaging) return;

    // حذف Token من Firestore
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      fcmToken: null,
      fcmTokenUpdatedAt: serverTimestamp(),
      notificationsEnabled: false
    });

    console.log('✅ FCM Token deleted');
  } catch (error) {
    console.error('❌ Error deleting FCM token:', error);
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

    // إرسال إشعار تجريبي
    new Notification('🎉 تم تفعيل الإشعارات!', {
      body: 'سيتم إرسال إشعارات فورية عند وصول رسائل أو تحديثات جديدة',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [200, 100, 200],
      dir: 'rtl',
      lang: 'ar'
    } as NotificationOptions & { vibrate?: number[] });

    toast.success('تم إرسال إشعار تجريبي!');
  } catch (error) {
    console.error('❌ Error sending test notification:', error);
    toast.error('فشل إرسال الإشعار التجريبي');
  }
}

// تصدير الدوال
export default {
  initializeMessaging,
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

