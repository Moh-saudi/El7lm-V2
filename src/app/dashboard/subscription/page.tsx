'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';

/**
 * إعادة توجيه إلى صفحة حالة الاشتراك الموحدة
 * تم توحيد جميع صفحات حالة الاشتراك لضمان أفضل توافقية وأحدث منطار للبيانات
 */
export default function SubscriptionRedirectPage() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();

  useEffect(() => {
    router.replace('/dashboard/shared/subscription-status');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-500 font-medium">{t('sharedComponents.redirects.subscription')}</p>
    </div>
  );
}
