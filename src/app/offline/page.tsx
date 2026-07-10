'use client';

import { Button } from '@/components/ui/button';
import { Home, RefreshCw, Signal, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { t, isRTL } = useTranslation();

  useEffect(() => {
    // فحص حالة الاتصال
    const checkOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    // فحص أولي
    checkOnlineStatus();

    // مراقبة تغييرات الاتصال
    if (typeof window !== 'undefined') {
      window.addEventListener('online', checkOnlineStatus);
      window.addEventListener('offline', checkOnlineStatus);

      return () => {
        window.removeEventListener('online', checkOnlineStatus);
        window.removeEventListener('offline', checkOnlineStatus);
      };
    }
  }, []);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    if (typeof window !== 'undefined') {
      // منع reload لتجنب التحديثات اللحظية
      console.log('تم منع reload في صفحة offline');
      // window.location.reload();
    }
  };

  const handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-md w-full text-center p-8">
        {/* شعاع خلفي */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-blue-400/20 blur-3xl opacity-30 animate-pulse"></div>

        <div className="relative z-10">
          {/* أيقونة عدم الاتصال */}
          <div className="mb-8">
            <div className="w-24 h-24 bg-gradient-to-r from-gray-400 to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <WifiOff className="w-12 h-12 text-white" />
            </div>
            <div className="w-16 h-1 bg-gray-500 rounded mx-auto opacity-80"></div>
          </div>

          {/* المحتوى الرئيسي */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-3">
              {t('offline.title')}
            </h1>

            <p className="text-gray-600 mb-6 leading-relaxed">
              {t('offline.description')}
            </p>

            {/* معلومات تقنية */}
            <div className={`bg-blue-50 rounded-lg p-4 mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
              <h3 className="font-semibold text-blue-800 mb-2">{t('offline.connectionStatus')}</h3>
              <div className="flex items-center justify-center gap-2 text-sm">
                <Signal className={`w-4 h-4 ${isOnline ? 'text-green-600' : 'text-red-600'}`} />
                <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
                  {isOnline ? t('offline.connected') : t('offline.disconnected')}
                </span>
              </div>
              {retryCount > 0 && (
                <p className="text-xs text-blue-600 mt-2">
                  {t('offline.retryCount')} {retryCount}
                </p>
              )}
            </div>

            {/* الأزرار */}
            <div className="space-y-3">
              <Button
                onClick={handleRetry}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                {t('offline.retry')}
              </Button>

              <Button
                variant="outline"
                onClick={handleGoHome}
                className="w-full border-2 border-gray-300 text-gray-700 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-all"
              >
                <Home className="w-4 h-4" />
                {t('offline.backToHome')}
              </Button>
            </div>
          </div>

          {/* معلومات إضافية */}
          <div className="text-sm text-gray-500">
            <p>{t('offline.persistentIssue')}</p>
            <ul className={`mt-2 space-y-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              <li>• {t('offline.checkWifi')}</li>
              <li>• {t('offline.restartRouter')}</li>
              <li>• {t('offline.tryMobileData')}</li>
              <li>• {t('offline.contactSupport')}</li>
            </ul>
            <p className="mt-4">support@el7lm.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
