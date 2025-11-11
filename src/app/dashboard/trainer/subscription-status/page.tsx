'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * إعادة توجيه إلى صفحة حالة الاشتراك المشتركة
 * تم توحيد صفحة حالة الاشتراك في: /dashboard/shared/subscription-status
 */
export default function TrainerSubscriptionStatusPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/shared/subscription-status');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
        <p className="text-gray-600">جاري التحويل إلى صفحة حالة الاشتراك...</p>
      </div>
    </div>
  );
}

