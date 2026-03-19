'use client';

import AppShell from '@/components/layout/AppShell';
import PushNotificationSetup from '@/components/notifications/PushNotificationSetup';
import FloatingChatWidget from '@/components/support/FloatingChatWidget';
import { useAuth } from '@/lib/firebase/auth-provider';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { Toaster } from 'sonner';
import dynamic from 'next/dynamic';

const ProfessionalAdPopup = dynamic(() => import('@/components/ads/ProfessionalAdPopup'), { ssr: false });

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

  // Loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-200 rounded-full border-t-blue-600 animate-spin" />
          <p className="text-gray-600 font-medium">جار التحميل...</p>
        </div>
      </div>
    );
  }

  // Redirect if unauthenticated
  if (!user) {
    if (typeof window !== 'undefined') router.replace('/auth/login');
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-4 w-4 bg-blue-500 rounded-full mb-2" />
          <span className="text-xs text-slate-400">جار التوجيه...</span>
        </div>
      </div>
    );
  }

  const noPadding = pathname.includes('player-videos') || pathname.includes('shared-videos');

  return (
    <>
      <Toaster position="top-center" richColors />

      <AppShell
        accountType={accountType}
        noPadding={noPadding}
      >
        {children}
      </AppShell>

      <FloatingChatWidget />
      <PushNotificationSetup />
      <ProfessionalAdPopup location={accountType as any} />
    </>
  );
}
