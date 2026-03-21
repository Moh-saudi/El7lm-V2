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
const ProfileCompletionReminder = dynamic(() => import('@/components/profile/ProfileCompletionReminder'), { ssr: false });

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userData: authUserData, loading: authLoading } = useAuth();

  // استخراج نوع الحساب من URL — يُستخدم فقط كـ fallback أول تحميل
  // لا يُفعَّل إذا كانت userData محملة (منعاً لـ sidebar خاطئ عند التنقل لصفحات مشتركة)
  const accountTypeFromPath = useMemo(() => {
    const segment = pathname?.split('/')[2]; // /dashboard/{accountType}/...
    const known = ['player', 'academy', 'club', 'trainer', 'agent', 'marketer', 'admin'];
    return known.includes(segment) ? segment : null;
  }, [pathname]);

  const accountType = useMemo(() => {
    // الأولوية دائماً لـ userData من Firebase
    if (authUserData?.accountType) return authUserData.accountType;
    // URL fallback فقط إذا لم تُحمَّل بيانات المستخدم بعد
    if (!authLoading && accountTypeFromPath) return accountTypeFromPath;
    return 'player';
  }, [authUserData?.accountType, accountTypeFromPath, authLoading]);

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

  // إذا كان المستخدم موجوداً لكن بياناته لم تكتمل بعد ولا يوجد fallback من URL
  if (user && !authUserData && !accountTypeFromPath) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="w-12 h-12 border-4 border-blue-200 rounded-full border-t-blue-600 animate-spin" />
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

  const isCinema = pathname.includes('player-videos') || pathname.includes('shared-videos');

  return (
    <>
      <Toaster position="top-center" richColors />

      <AppShell
        accountType={accountType}
        noPadding={isCinema}
        showHeader={!isCinema}
        showFooter={!isCinema}
      >
        {children}
      </AppShell>

      <FloatingChatWidget />
      <PushNotificationSetup />
      <ProfessionalAdPopup location={accountType as any} />
      {user && accountType !== 'admin' && (
        <ProfileCompletionReminder uid={user.uid} accountType={accountType} />
      )}
    </>
  );
}
