'use client';

import { useAuth } from '@/lib/firebase/auth-provider';
import {
  getFCMToken,
  getNotificationPermission,
  isNotificationSupported,
  setupForegroundNotifications,
  testLocalNotification
} from '@/lib/firebase/push-notifications';
import { Bell, BellOff, Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';

export default function PushNotificationSetup() {
  const { user } = useAuth();
  const { t, isRTL } = useTranslation();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  useEffect(() => {
    // التحقق من دعم المتصفح
    const supported = isNotificationSupported();
    setIsSupported(supported);

    if (supported) {
      const currentPermission = getNotificationPermission();
      setPermission(currentPermission);

      // عرض الـ prompt بعد 8 ثوانٍ إذا لم يختر المستخدم بعد
      if (currentPermission === 'default' && user) {
        const dismissed = localStorage.getItem('notification-prompt-dismissed');
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        if (!dismissed || Number(dismissed) < weekAgo) {
          const timer = setTimeout(() => setShowPrompt(true), 8000);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [user]);

  useEffect(() => {
    // إعداد معالج الإشعارات في الواجهة
    if (user && permission === 'granted') {
      const unsubscribe = setupForegroundNotifications((payload) => {
        console.log('📨 New notification received:', payload);
      });

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [user, permission]);

  const handleEnableNotifications = async () => {
    if (!user) {
      toast.error(t('sharedComponents.pushNotifications.loginRequired'));
      return;
    }

    setIsLoading(true);
    try {
      // الحصول على FCM Token
      const token = await getFCMToken(user.id);

      if (token) {
        setFcmToken(token);
        setPermission('granted');
        setShowPrompt(false);

        toast.success(t('sharedComponents.pushNotifications.enabled'), {
          description: t('sharedComponents.pushNotifications.enabledDescription')
        });

        // إرسال إشعار تجريبي
        await testLocalNotification();
      } else {
        toast.error(t('sharedComponents.pushNotifications.enableFailed'), {
          description: t('sharedComponents.pushNotifications.permissionHint')
        });
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error(t('sharedComponents.pushNotifications.unexpectedError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // حفظ في localStorage لعدم إظهاره مرة أخرى لمدة أسبوع
    localStorage.setItem('notification-prompt-dismissed', Date.now().toString());
  };

  // عدم عرض أي شيء إذا:
  // 1. المتصفح لا يدعم الإشعارات
  // 2. المستخدم غير مسجل دخول
  // 3. تم منح الإذن بالفعل
  // 4. تم رفض الإذن بشكل دائم
  if (!isSupported || !user || permission === 'granted' || permission === 'denied') {
    return null;
  }

  // عرض بطاقة الـ prompt
  if (showPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="bg-white rounded-xl shadow-2xl border border-purple-100 p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Bell className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{t('sharedComponents.pushNotifications.title')}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t('sharedComponents.pushNotifications.subtitle')}</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={t('sharedComponents.otp.close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <p className="text-sm text-gray-600 mb-4">
            {t('sharedComponents.pushNotifications.receiveWhen')}
          </p>
          <ul className="text-sm text-gray-600 mb-4 space-y-2">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>{t('sharedComponents.pushNotifications.newMessages')}</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>{t('sharedComponents.pushNotifications.accountUpdates')}</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>{t('sharedComponents.pushNotifications.newOffers')}</span>
            </li>
          </ul>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleEnableNotifications}
              disabled={isLoading}
              className="flex-1 bg-purple-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>{t('sharedComponents.pushNotifications.enabling')}</span>
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4" />
                  <span>{t('sharedComponents.pushNotifications.enableNow')}</span>
                </>
              )}
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2.5 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {t('sharedComponents.pushNotifications.later')}
            </button>
          </div>

          {/* Android Only Notice */}
          <p className="text-xs text-gray-400 mt-3 text-center">
            {t('sharedComponents.pushNotifications.androidOnly')}
          </p>
        </div>
      </div>
    );
  }

  // تم تعطيل الزر العائم - المستخدم يفعل الإشعارات مرة واحدة فقط ثم تصل تلقائياً
  // يمكن إضافة زر التفعيل في صفحة الإعدادات إذا لزم الأمر
  return null;
}
