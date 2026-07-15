'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';

/**
 * إعادة توجيه إلى صفحة الرسائل المشتركة
 * تم توحيد صفحة الرسائل في: /dashboard/shared/messages
 */
export default function MarketerMessagesPage() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();

  useEffect(() => {
    router.replace('/dashboard/shared/messages');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">{t('sharedComponents.redirects.messages')}</p>
      </div>
    </div>
  );
}
