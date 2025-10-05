'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VideosRedirectPage() {
  const router = useRouter();
  
  useEffect(() => {
    // إعادة توجيه إلى صفحة الوسائط الجديدة
    router.replace('/dashboard/admin/media');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
      <div className="text-center">
        <div className="animate-spin w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">جاري إعادة التوجيه إلى صفحة الوسائط الجديدة...</p>
      </div>
    </div>
  );
}

