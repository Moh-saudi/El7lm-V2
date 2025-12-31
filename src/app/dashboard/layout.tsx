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

const ProfessionalAdPopup = dynamic(() => import('@/components/ads/ProfessionalAdPopup'), { ssr: false });

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, userData: authUserData, loading: authLoading } = useAuth();

  const accountType = useMemo(() => {
    if (!authUserData?.accountType) return 'player';
    return authUserData.accountType;
  }, [authUserData?.accountType]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-200 rounded-full border-t-blue-600 animate-spin"></div>
          <p className="text-gray-600 font-medium">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  const AuthRedirect = dynamic(() => import('@/components/auth/AuthRedirect'), { ssr: false });

  if (!user) {
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.location.href = '/auth/login';
      }, 3500);
    }

    return <AuthRedirect />;
  }

  const noPadding = pathname.includes('player-videos') || pathname.includes('shared-videos');

  return (
    <>
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
        showHeader={!noPadding}
        showFooter={!noPadding}
        noPadding={noPadding}
      >
        {children}
      </ResponsiveLayoutWrapper>

      <FloatingChatWidget />
      <PushNotificationSetup />

      <ProfessionalAdPopup location={accountType as any} />
    </>
  );
}
