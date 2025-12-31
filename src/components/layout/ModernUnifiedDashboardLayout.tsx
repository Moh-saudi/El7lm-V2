'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/firebase/auth-provider';
import { SidebarProvider } from '@/lib/context/SidebarContext';
import ModernUnifiedHeader from '@/components/layout/ModernUnifiedHeader';
import ModernEnhancedSidebar from '@/components/layout/ModernEnhancedSidebar';
import Footer from '@/components/layout/Footer';
import FloatingChatWidget from '@/components/support/FloatingChatWidget';
import EnhancedNotifications from '@/components/ui/EnhancedNotifications';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/firebase/config';

interface ModernUnifiedDashboardLayoutProps {
  children: React.ReactNode;
  accountType: string;
  title?: string;
  logo?: string;
  showFooter?: boolean;
  showFloatingChat?: boolean;
  showSearch?: boolean;
  searchPlaceholder?: string;
  noPadding?: boolean;
  showHeader?: boolean;
}

const ModernUnifiedDashboardLayout: React.FC<ModernUnifiedDashboardLayoutProps> = ({
  children,
  accountType,
  title = "El7lm Platform",
  logo,
  showFooter = true,
  showFloatingChat = true,
  showSearch = true,
  searchPlaceholder = "ابحث عن أي شيء...",
  noPadding = false,
  showHeader = true
}) => {
  const { user, userData, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [authCheckComplete, setAuthCheckComplete] = useState(false);

  // Give AuthProvider time to sync after login/logout
  useEffect(() => {
    if (loading) {
      setAuthCheckComplete(false);
      return;
    }

    const currentFirebaseUser = typeof window !== 'undefined' ? auth.currentUser : null;

    if (user || currentFirebaseUser) {
      setAuthCheckComplete(true);
      return;
    }

    // If no user detected yet, wait a bit for auth state to sync (in case of recent login)
    const timer = setTimeout(() => {
      setAuthCheckComplete(true);
    }, 2000); // 2 second delay to allow auth state to sync after login/refresh

    return () => clearTimeout(timer);
  }, [loading, user]);

  // صفحات مخفية (تحتاج layout مخصص) - فقط للاعبين
  const isPlayerProfilePage = pathname.includes('/player/profile');
  const isPlayerReportsPage = pathname.includes('/player/reports');
  const isEntityProfilePage = pathname.includes('/search/profile/');

  // إظهار القائمة الجانبية في صفحة ملف اللاعب أيضاً. نخفيها فقط لملفات الكيانات العامة.
  const shouldShowSidebar = !isEntityProfilePage;



  // Loading state - wait for auth to complete
  if (loading || !authCheckComplete) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-200 rounded-full border-t-blue-600 animate-spin"></div>
          <p className="text-slate-600">جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  // Authentication check - only show error after loading and auth check are complete
  if (!user && !loading && authCheckComplete) {
    // We import AuthRedirect dynamically to avoid circular dependencies if any
    const AuthRedirect = dynamic(() => import('@/components/auth/AuthRedirect'), { ssr: false });
    return <AuthRedirect />;
  }

  const effectiveAccountType = (userData?.accountType as string) || accountType;

  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50" style={{ direction: 'rtl' }}>

        {/* الإشعارات المحسنة */}
        <EnhancedNotifications />

        {/* الهيدر الحديث - يظهر باستثناء صفحات ملفات الكيانات العامة */}
        {!isEntityProfilePage && showHeader && (
          <ModernUnifiedHeader
            showSearch={showSearch}
            searchPlaceholder={searchPlaceholder}
            title={title}
            variant="gaming"
          />
        )}

        {/* المحتوى الرئيسي */}
        <div className="flex flex-1 min-h-0" style={{ direction: 'rtl' }}>

          {/* القائمة الجانبية الحديثة */}
          {shouldShowSidebar && (
            <ModernEnhancedSidebar
              accountType={effectiveAccountType}
              collapsed={collapsed}
              setCollapsed={setCollapsed}
              userData={userData}
            />
          )}

          {/* المحتوى الرئيسي */}
          <main
            className={`flex-1 min-h-0 overflow-auto transition-all duration-300 ease-in-out ${shouldShowSidebar ? (collapsed ? 'mr-20' : 'mr-[280px]') : ''
              }`}
            style={{ direction: 'rtl' }}
          >
            {/* مساحة للهيدر */}
            <div className={!isEntityProfilePage ? 'pt-20' : ''}>
              {/* مساحة للفوتر */}
              <div className={showFooter ? 'pb-20' : 'pb-4'}>
                <div className="w-full min-h-full">
                  {/* Container للمحتوى */}
                  <div className={`min-h-full ${noPadding ? 'p-0' : 'p-6'}`}>
                    {children}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>



        {/* الفوتر - يظهر باستثناء صفحات ملفات الكيانات العامة */}
        {showFooter && !isEntityProfilePage && <Footer />}

        {/* أيقونة الدعم الفني العائم */}
        {showFloatingChat && <FloatingChatWidget />}
      </div>
    </SidebarProvider>
  );
};

export default ModernUnifiedDashboardLayout; 
