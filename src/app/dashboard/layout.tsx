'use client';

import ResponsiveLayoutWrapper from '@/components/layout/ResponsiveLayout';
import PushNotificationSetup from '@/components/notifications/PushNotificationSetup';
import FloatingChatWidget from '@/components/support/FloatingChatWidget';
import { useAuth } from '@/lib/firebase/auth-provider';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import dynamic from 'next/dynamic';
// import OfflineIndicator from '@/components/ui/OfflineIndicator'; // تم حذف المكون

// Lazy load ad components
const ProfessionalAdPopup = dynamic(() => import('@/components/ads/ProfessionalAdPopup'), { ssr: false });

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, userData: authUserData, loading: authLoading } = useAuth();
  const showOfflineBanner = process.env.NEXT_PUBLIC_SHOW_OFFLINE_BANNER === 'true';

  // تحديد نوع الحساب
  const accountType = useMemo(() => {
    if (!authUserData?.accountType) return 'player';
    return authUserData.accountType;
  }, [authUserData?.accountType]);

  // عرض شاشة تحميل إذا كانت المصادقة تحمل
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-200 rounded-full border-t-blue-600 animate-spin"></div>
          <p className="text-gray-600 font-medium">جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  // استيراد المكون الجديد ديناميكياً
  const AuthRedirect = dynamic(() => import('@/components/auth/AuthRedirect'), { ssr: false });

  // إعادة التوجيه لصفحة تسجيل الدخول إذا لم يكن هناك مستخدم
  if (!user) {
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.location.href = '/auth/login';
      }, 3500);
    }

    return <AuthRedirect />;
  }

  return (
    <>
      {/* مؤشر عدم الاتصال - معطل مؤقتاً */}
      {/* {showOfflineBanner && <OfflineIndicator />} */}

      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={true}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      <ResponsiveLayoutWrapper
        accountType={accountType}
        showSidebar={true}
        showHeader={true}
        showFooter={true}
      >
        {children}
      </ResponsiveLayoutWrapper>

      <FloatingChatWidget />
      <PushNotificationSetup />

      {/* Display ads based on account type */}
      <ProfessionalAdPopup location={accountType as any} />
    </>
  );
}
