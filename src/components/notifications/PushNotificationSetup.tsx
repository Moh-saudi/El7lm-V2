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

export default function PushNotificationSetup() {
  const { user } = useAuth();
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

      // عرض prompt إذا لم يتم طلب الإذن بعد
      if (currentPermission === 'default' && user) {
        // تأخير عرض الـ prompt لتجنب الإزعاج الفوري
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 5000); // 5 ثوانٍ بعد تحميل الصفحة

        return () => clearTimeout(timer);
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
      toast.error('يرجى تسجيل الدخول أولاً');
      return;
    }

    setIsLoading(true);
    try {
      // الحصول على FCM Token
      const token = await getFCMToken(user.uid);

      if (token) {
        setFcmToken(token);
        setPermission('granted');
        setShowPrompt(false);

        toast.success('✅ تم تفعيل الإشعارات الفورية!', {
          description: 'ستصلك إشعارات فورية عند وجود تحديثات جديدة'
        });

        // إرسال إشعار تجريبي
        await testLocalNotification();
      } else {
        toast.error('فشل في تفعيل الإشعارات', {
          description: 'يرجى التأكد من السماح بالإشعارات في إعدادات المتصفح'
        });
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error('حدث خطأ أثناء تفعيل الإشعارات');
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
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up" dir="rtl">
        <div className="bg-white rounded-xl shadow-2xl border border-purple-100 p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Bell className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">تفعيل الإشعارات الفورية</h3>
                <p className="text-xs text-gray-500 mt-0.5">ابقَ على اطلاع دائم</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="إغلاق"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <p className="text-sm text-gray-600 mb-4">
            احصل على إشعارات فورية عند:
          </p>
          <ul className="text-sm text-gray-600 mb-4 space-y-2">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>وصول رسائل جديدة</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>تحديثات مهمة على حسابك</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>فرص وعروض جديدة</span>
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
                  <span>جاري التفعيل...</span>
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4" />
                  <span>تفعيل الآن</span>
                </>
              )}
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2.5 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              لاحقاً
            </button>
          </div>

          {/* Android Only Notice */}
          <p className="text-xs text-gray-400 mt-3 text-center">
            💡 الإشعارات الفورية متاحة على Android فقط
          </p>
        </div>
      </div>
    );
  }

  // زر صغير في الزاوية لإعادة فتح الـ prompt
  return (
    <button
      onClick={() => setShowPrompt(true)}
      className="fixed bottom-4 left-4 md:left-auto md:right-4 z-50 bg-white rounded-full shadow-lg p-3 hover:shadow-xl transition-all hover:scale-110"
      aria-label="تفعيل الإشعارات"
      title="تفعيل الإشعارات الفورية"
    >
      <BellOff className="h-5 w-5 text-gray-600" />
    </button>
  );
}

