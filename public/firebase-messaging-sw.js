// Firebase Cloud Messaging Service Worker
// هذا الملف يعمل في الخلفية للتعامل مع الإشعارات عندما يكون التطبيق مغلقاً

// تحميل Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// تكوين Firebase - يجب أن يطابق التكوين في config.ts
firebase.initializeApp({
  apiKey: "AIzaSyBq0_T9mHm7BxYKJAqLp4P4gfsfGRvYHbQ",
  authDomain: "el7lm-a9e44.firebaseapp.com",
  projectId: "el7lm-a9e44",
  storageBucket: "el7lm-a9e44.firebasestorage.app",
  messagingSenderId: "165800667855",
  appId: "1:165800667855:web:cca20eb46a8e50f6b2e957",
  measurementId: "G-QPBZF57FLH"
});

// الحصول على instance من messaging
const messaging = firebase.messaging();

// معالجة الإشعارات في الخلفية (عندما التطبيق مغلق)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  // استخراج البيانات من payload
  const notificationTitle = payload.notification?.title || payload.data?.title || 'إشعار جديد';
  const notificationBody = payload.notification?.body || payload.data?.body || '';
  const notificationIcon = payload.notification?.icon || '/icon-192x192.png';
  const notificationImage = payload.notification?.image || payload.data?.image;
  const clickAction = payload.notification?.click_action || payload.data?.click_action || '/dashboard';

  const notificationOptions = {
    body: notificationBody,
    icon: notificationIcon,
    badge: '/icon-192x192.png',
    vibrate: [200, 100, 200],
    dir: 'rtl',
    lang: 'ar',
    tag: payload.data?.tag || 'notification',
    requireInteraction: false,
    data: {
      click_action: clickAction,
      ...payload.data
    }
  };

  // إضافة الصورة إذا كانت موجودة
  if (notificationImage) {
    notificationOptions.image = notificationImage;
  }

  // عرض الإشعار
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// معالجة النقر على الإشعار
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click:', event);

  event.notification.close();

  // الحصول على الرابط من البيانات
  const clickAction = event.notification.data?.click_action || '/dashboard';

  // فتح أو التركيز على النافذة
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // البحث عن نافذة مفتوحة بالفعل
        for (const client of clientList) {
          if (client.url.includes(clickAction) && 'focus' in client) {
            return client.focus();
          }
        }
        // فتح نافذة جديدة
        if (clients.openWindow) {
          return clients.openWindow(clickAction);
        }
      })
  );
});

// معالجة أحداث التثبيت
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker installing...');
  self.skipWaiting();
});

// معالجة أحداث التفعيل
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker activating...');
  event.waitUntil(clients.claim());
});

// إضافة دعم التخزين المؤقت الأساسي للـ Offline Mode
const CACHE_NAME = 'el7lm-offline-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/offline'
];

self.addEventListener('fetch', (event) => {
  // نتجاهل طلبات Firebase و API وخدمات التحليلات
  if (event.request.url.includes('firebasestorage.googleapis.com') ||
      event.request.url.includes('firebaseio.com') ||
      event.request.url.includes('/api/') ||
      event.request.url.includes('googletagmanager.com') ||
      event.request.url.includes('clarity.ms') ||
      event.request.url.includes('google-analytics.com') ||
      event.request.url.includes('googleadservices.com') ||
      event.request.url.includes('googlesyndication.com') ||
      event.request.url.includes('google.com/analytics') ||
      event.request.url.includes('doubleclick.net')) {
    return;
  }

  // معالجة محسنة للأخطاء
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request).catch((error) => {
          console.warn('Service Worker fetch failed:', event.request.url, error);
          // إذا فشل الجلب من الشبكة، نرجع صفحة offline فقط للمستندات
          if (event.request.destination === 'document') {
            return caches.match('/offline');
          }
          // للطلبات الأخرى، نرمي الخطأ بدلاً من إرجاع undefined
          throw error;
        });
      })
      .catch((error) => {
        console.warn('Service Worker cache and fetch failed:', event.request.url, error);
        // إرجاع response فارغ بدلاً من undefined
        return new Response('', { status: 404, statusText: 'Not Found' });
      })
  );
});

