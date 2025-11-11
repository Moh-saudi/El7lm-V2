'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * إعادة توجيه إلى صفحة الرسائل المشتركة
 * تم توحيد صفحة الرسائل في: /dashboard/shared/messages
 */
export default function AdminMessagesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/shared/messages');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
        <p className="text-gray-600">جاري التحويل إلى مركز الرسائل...</p>
      </div>
    </div>
  );
} 
