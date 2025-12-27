'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarProvider } from '@/lib/context/SidebarContext';
import UnifiedHeader from './UnifiedHeader';
import Footer from './Footer';
import FloatingChatWidget from '../support/FloatingChatWidget';
import EnhancedSidebar from './EnhancedSidebar';
import EnhancedNotifications from '../ui/EnhancedNotifications';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface UnifiedDashboardLayoutProps {
  children: React.ReactNode;
  accountType?: string;
  title?: string;
  logo?: string;
  showFooter?: boolean;
  showFloatingChat?: boolean;
}

import WelcomeDialog from './WelcomeDialog';

const UnifiedDashboardLayout: React.FC<UnifiedDashboardLayoutProps> = ({
  children,
  accountType = 'player',
  title = 'لوحة التحكم',
  logo = '/el7lm-logo.png',
  showFooter = true,
  showFloatingChat = true
}) => {
  const { user, userData, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [visitorMetrics] = useState(() => {
    const randomActiveMembers = 18500 + Math.floor(Math.random() * 2200);
    const randomClubsCount = 140 + Math.floor(Math.random() * 40);
    const randomVisitorNumber = 24000 + Math.floor(Math.random() * 1800);

    return {
      activeMembers: randomActiveMembers,
      clubsCount: randomClubsCount,
      visitorNumber: randomVisitorNumber
    };
  });
  // Prefer explicitly provided accountType (e.g., admin layout) over user data
  const effectiveAccountType = accountType || (userData?.accountType as string) || 'player';

  // إخفاء عناصر معينة في صفحات الملف الشخصي
  const isProfilePage = pathname.includes('/search/profile/');
  const isReportsPage = pathname.includes('/reports');
  const isEntityProfilePage = pathname.includes('/search/profile/');

  // توحيد الشريط الجانبي: لا تُخفِ الشريط في صفحات التقارير إلا للاعب فقط
  const shouldShowSidebar = !isEntityProfilePage && !(isReportsPage && effectiveAccountType === 'player');

  // عرض شاشة تحميل
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-200 rounded-full border-t-blue-600 animate-spin"></div>
          <p className="text-gray-600">جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  // عرض رسالة خطأ إذا لم يكن هناك مستخدم
  if (!user) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-sky-50 via-white to-rose-50 px-6 py-16">
        <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden="true">
          <div className="absolute -top-24 -right-16 h-80 w-80 rounded-full bg-sky-200 blur-3xl"></div>
          <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-rose-200 blur-3xl"></div>
        </div>
        <div className="relative z-10 w-full max-w-3xl rounded-3xl border border-white/70 bg-white/80 p-10 text-center shadow-2xl backdrop-blur-md">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-rose-500 text-3xl shadow-lg">
            &#9917;
          </div>
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            مرحباً بك في حلم!
          </h1>
          <p className="mt-3 text-lg text-slate-600">
            أول متجر إلكتروني متكامل لتسويق وبيع اللاعبين في الشرق الأوسط. اكتشف أفضل المواهب، وابقَ قريباً من الأندية الطموحة، وابدأ رحلتك الاحترافية معنا.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/70 p-5 shadow-lg">
              <p className="text-sm font-medium text-slate-500">الأعضاء النشطون الآن</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {visitorMetrics.activeMembers.toLocaleString('en-US')}
              </p>
            </div>
            <div className="rounded-2xl bg-white/70 p-5 shadow-lg">
              <p className="text-sm font-medium text-slate-500">الأندية والشركاء</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {visitorMetrics.clubsCount.toLocaleString('en-US')}
              </p>
            </div>
            <div className="rounded-2xl bg-white/70 p-5 shadow-lg">
              <p className="text-sm font-medium text-slate-500">أنت الزائر اليوم رقم</p>
              <p className="mt-2 text-2xl font-bold text-rose-600">
                {visitorMetrics.visitorNumber.toLocaleString('en-US')}
              </p>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              className="w-full rounded-xl bg-gradient-to-r from-rose-500 via-sky-500 to-sky-600 px-8 py-6 text-lg font-semibold text-white shadow-xl transition-all hover:from-rose-600 hover:via-sky-600 hover:to-sky-700 sm:w-auto"
              onClick={() => router.push('/auth/login')}
            >
              الانتقال إلى صفحة تسجيل الدخول
            </Button>
            <p className="text-sm text-slate-500">
              لديك حساب جديد للأندية أو الوكلاء؟ انضم إلينا واستكشف فرصاً غير محدودة.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen bg-gray-50" style={{ direction: 'rtl' }}>
        {/* الإشعارات المحسنة */}
        <EnhancedNotifications />

        {/* الهيدر - ثابت في الأعلى */}
        {!isEntityProfilePage && (
          <UnifiedHeader
            variant="default"
            showLanguageSwitcher={true}
            showNotifications={true}
            showUserMenu={true}
            title={title}
            logo={logo}
          />
        )}

        {/* المحتوى الرئيسي - مع مساحة للهيدر والفوتر */}
        <div className="flex flex-1 min-h-0" style={{ direction: 'rtl' }}>
          {/* القائمة الجانبية المحسنة - ثابتة على اليمين */}
          {shouldShowSidebar && (
            <EnhancedSidebar
              accountType={effectiveAccountType}
              collapsed={collapsed}
              setCollapsed={setCollapsed}
              userData={userData}
            />
          )}

          {/* المحتوى الرئيسي */}
          <div
            className={`flex-1 min-h-0 overflow-auto transition-all duration-300 ease-in-out ${shouldShowSidebar ? (collapsed ? 'mr-20' : 'mr-64') : ''
              }`}
            style={{ direction: 'rtl' }}
          >
            {/* مساحة للهيدر */}
            <div className={!isEntityProfilePage ? 'pt-16' : ''}>
              {/* مساحة للفوتر */}
              <div className={showFooter ? 'pb-20' : 'pb-4'}>
                <div className="w-full">
                  <div className="min-h-full">
                    {children}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* نافذة الترحيب */}
        <WelcomeDialog user={user} pathname={pathname} onClose={() => { }} />

        {/* الفوتر - ثابت في الأسفل */}
        {showFooter && !isEntityProfilePage && <Footer />}

        {/* أيقونة الدعم الفني */}
        {showFloatingChat && <FloatingChatWidget />}
      </div>
    </SidebarProvider>
  );
};

export default UnifiedDashboardLayout;
