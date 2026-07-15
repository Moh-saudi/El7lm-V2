'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';

/**
 * إعادة توجيه إلى صفحة حالة الاشتراك المشتركة
 * تم توحيد صفحة حالة الاشتراك في: /dashboard/shared/subscription-status
 */
export default function AgentSubscriptionStatusPage() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();

  useEffect(() => {
    router.replace('/dashboard/shared/subscription-status');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-600">{t('sharedComponents.redirects.subscription')}</p>
      </div>
    </div>
  );
}
