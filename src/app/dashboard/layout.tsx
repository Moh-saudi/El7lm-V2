'use client';

import ResponsiveLayoutWrapper from '@/components/layout/ResponsiveLayout';
import PushNotificationSetup from '@/components/notifications/PushNotificationSetup';
import FloatingChatWidget from '@/components/support/FloatingChatWidget';
import { useAuth } from '@/lib/firebase/auth-provider';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import dynamic from 'next/dynamic';

const ProfessionalAdPopup = dynamic(() => import('@/components/ads/ProfessionalAdPopup'), { ssr: false });
// AuthRedirect no longer needed for logic, but fine to keep if used elsewhere. Removed here for clarity.

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userData: authUserData, loading: authLoading } = useAuth();

  const accountType = useMemo(() => {
    if (!authUserData?.accountType) return 'player';
    return authUserData.accountType;
  }, [authUserData?.accountType]);

  // 1. Loading State
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

  // 2. Unauthorized State (Redirect Logic)
  // We use explicit router.replace instead of hard reload with timeout
  if (!user) {
    if (typeof window !== 'undefined') {
      router.replace('/auth/login');
    }
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-4 w-4 bg-blue-500 rounded-full mb-2"></div>
          <span className="text-xs text-slate-400">Redirecting...</span>
        </div>
      </div>
    );
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
