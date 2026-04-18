'use client';

/**
 * AppShell â€” Root layout orchestrator.
 * Replaces ResponsiveLayoutWrapper from ResponsiveLayout.tsx.
 *
 * Responsibilities:
 *  - Wraps children in AppShellProvider (single context)
 *  - Sets data-account attribute for CSS accent token injection
 *  - Resolves user display name, avatar, club logo
 *  - Builds menu groups via getAccountMenuGroups()
 *  - Renders Sidebar + AppHeader + main content
 *  - Handles logout with LogoutScreen
 */

import LogoutScreen from '@/components/auth/LogoutScreen';
import { useAuth } from '@/lib/firebase/auth-provider';
import { supabase } from '@/lib/supabase/config';
import { getPlayerAvatarUrl, getSupabaseImageUrl } from '@/lib/supabase/image-utils';
import { EmployeeRole, RolePermissions } from '@/types/employees';
import { DEFAULT_ROLES } from '@/lib/permissions/types';
import { getAccountMenuGroups } from '@/config/account-menu-config';
import { cn } from '@/lib/utils';
import { AlertTriangle, LogOut } from 'lucide-react';
import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { AppShellProvider, useAppShell } from './AppShellContext';
import AppFooter from './AppFooter';
import AppHeader from './AppHeader';
import MobileBottomNav from './MobileBottomNav';
import Sidebar from './Sidebar';

// â”€â”€â”€ Default employee permissions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const DEFAULT_PERMISSIONS: Partial<Record<EmployeeRole, RolePermissions>> = {
  support: {
    canViewUsers: true, canEditUsers: false, canViewFinancials: false,
    canManagePayments: false, allowedLocations: [], canViewReports: false,
    canManageContent: false, canManageEmployees: false,
    canViewSupport: true, canManageSupport: true,
  },
  finance: {
    canViewUsers: true, canEditUsers: false, canViewFinancials: true,
    canManagePayments: true, allowedLocations: [], canViewReports: true,
    canManageContent: false, canManageEmployees: false,
    canViewSupport: false, canManageSupport: false,
  },
  content: {
    canViewUsers: false, canEditUsers: false, canViewFinancials: false,
    canManagePayments: false, allowedLocations: [], canViewReports: false,
    canManageContent: true, canManageEmployees: false,
    canViewSupport: false, canManageSupport: false,
  },
  admin: {
    canViewUsers: true, canEditUsers: true, canViewFinancials: true,
    canManagePayments: true, allowedLocations: [], canViewReports: true,
    canManageContent: true, canManageEmployees: true,
    canViewSupport: true, canManageSupport: true,
  },
  supervisor: {
    canViewUsers: true, canEditUsers: true, canViewFinancials: false,
    canManagePayments: false, allowedLocations: [], canViewReports: true,
    canManageContent: true, canManageEmployees: false,
    canViewSupport: true, canManageSupport: true,
  },
  sales: {
    canViewUsers: true, canEditUsers: false, canViewFinancials: false,
    canManagePayments: false, allowedLocations: [], canViewReports: false,
    canManageContent: false, canManageEmployees: false,
    canViewSupport: true, canManageSupport: false,
  },
};

// User display helpers

const INVALID_DISPLAY_VALUES = new Set([
  'error',
  'خطأ',
  'unknown',
  'undefined',
  'null',
  'nan',
]);

const EMPLOYEE_ROLE_LABELS: Partial<Record<EmployeeRole, string>> = {
  support: 'موظف دعم',
  finance: 'موظف مالي',
  content: 'محرر محتوى',
  admin: 'مدير النظام',
  supervisor: 'مشرف',
  sales: 'مندوب مبيعات',
};

function pickValidText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const normalized = value.trim();
    if (!normalized) continue;
    if (/^[\?\u061F\s._-]+$/.test(normalized)) continue;

    const lower = normalized.toLowerCase();
    if (INVALID_DISPLAY_VALUES.has(lower)) continue;
    if (normalized.includes('خطأ')) continue;
    if (lower.startsWith('error:') || lower.startsWith('failed')) continue;

    return normalized;
  }

  return null;
}

function getAccountFallbackLabel(accountType: string): string {
  switch (accountType) {
    case 'player':
      return 'لاعب';
    case 'club':
      return 'نادي رياضي';
    case 'academy':
      return 'أكاديمية';
    case 'agent':
      return 'وكيل';
    case 'trainer':
      return 'مدرب';
    case 'marketer':
      return 'مسوق كروي';
    case 'admin':
      return 'مدير النظام';
    case 'parent':
      return 'ولي أمر';
    case 'dream-academy':
      return 'أكاديمية الحلم';
    default:
      return 'مستخدم';
  }
}

function resolveDisplayName(userData: any, user: any, accountType: string): string {
  const fallback = getAccountFallbackLabel(accountType);
  const emailName =
    typeof user?.email === 'string' && user.email.includes('@')
      ? user.email.split('@')[0]
      : null;

  switch (accountType) {
    case 'player':
      return pickValidText(
        userData?.full_name,
        userData?.name,
        userData?.displayName,
        user?.user_metadata?.full_name,
        user?.user_metadata?.name,
        emailName,
      ) || fallback;
    case 'club':
      return pickValidText(
        userData?.club_name,
        userData?.full_name,
        userData?.name,
        userData?.displayName,
        user?.user_metadata?.full_name,
        user?.user_metadata?.name,
        emailName,
      ) || fallback;
    case 'academy':
      return pickValidText(
        userData?.academy_name,
        userData?.full_name,
        userData?.name,
        userData?.displayName,
        user?.user_metadata?.full_name,
        user?.user_metadata?.name,
        emailName,
      ) || fallback;
    case 'agent':
      return pickValidText(
        userData?.agent_name,
        userData?.full_name,
        userData?.name,
        userData?.displayName,
        user?.user_metadata?.full_name,
        user?.user_metadata?.name,
        emailName,
      ) || fallback;
    case 'trainer':
      return pickValidText(
        userData?.trainer_name,
        userData?.full_name,
        userData?.name,
        userData?.displayName,
        user?.user_metadata?.full_name,
        user?.user_metadata?.name,
        emailName,
      ) || fallback;
    case 'admin':
      return pickValidText(
        userData?.full_name,
        userData?.name,
        userData?.displayName,
        userData?.username,
        user?.user_metadata?.full_name,
        user?.user_metadata?.name,
        emailName,
      ) || 'مدير النظام';
    default:
      return pickValidText(
        userData?.full_name,
        userData?.name,
        userData?.displayName,
        user?.user_metadata?.full_name,
        user?.user_metadata?.name,
        emailName,
      ) || fallback;
  }
}

const ROLE_LABELS: Record<string, string> = {
  player: 'لاعب',
  club: 'نادي رياضي',
  academy: 'أكاديمية رياضية',
  agent: 'وكيل رياضي',
  trainer: 'مدرب',
  marketer: 'مسوق',
  admin: 'مدير',
  'dream-academy': 'أكاديمية الحلم',
  parent: 'ولي أمر',
};
// â”€â”€â”€ Inner shell (needs context) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface InnerShellProps {
  accountType: string;
  children: ReactNode;
  noPadding?: boolean;
  showHeader?: boolean;
  showSidebar?: boolean;
}

function InnerShell({ accountType, children, noPadding, showHeader = true, showSidebar = true }: InnerShellProps) {
  const { isCollapsed, isMobile } = useAppShell();
  const { user, userData, logout } = useAuth();

  const [clubLogo, setClubLogo] = useState<string | null>(null);
  const [showLogoutScreen, setShowLogoutScreen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // â”€â”€ Club logo Supabase realtime listener (single, consolidated) â”€â”€
  useEffect(() => {
    if (accountType !== 'club' || !user?.id) return;

    // Initial fetch
    const fetchClubLogo = async () => {
      const { data } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', user.id)
        .single();
      if (!data || !data.logo) { setClubLogo(null); return; }
      if (data.logo.startsWith('http')) {
        setClubLogo(data.logo);
      } else {
        const url = getSupabaseImageUrl(data.logo, 'clubavatar');
        setClubLogo(url || null);
      }
    };
    fetchClubLogo();

    const channel = supabase
      .channel(`club-logo-appshell-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'clubs', filter: `id=eq.${user.id}` },
        (payload) => {
          const data = payload.new as any;
          if (!data.logo) { setClubLogo(null); return; }
          if (data.logo.startsWith('http')) {
            setClubLogo(data.logo);
          } else {
            const url = getSupabaseImageUrl(data.logo, 'clubavatar');
            setClubLogo(url || null);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [accountType, user?.id]);

  // â”€â”€ Resolved values â”€â”€
  const displayName = useMemo(
    () => resolveDisplayName(userData, user, accountType),
    [userData, user, accountType],
  );

  const avatarUrl = useMemo(
    () => accountType === 'club' && clubLogo ? clubLogo : getPlayerAvatarUrl(userData, user),
    [accountType, clubLogo, userData, user],
  );

  const roleName = useMemo(() => {
    const resolvedEmployeeRole = pickValidText(
      userData?.roleName,
      EMPLOYEE_ROLE_LABELS[userData?.employeeRole as EmployeeRole],
      EMPLOYEE_ROLE_LABELS[userData?.role as EmployeeRole],
    );

    if (resolvedEmployeeRole && (userData?.employeeId || userData?.employeeRole || userData?.role)) {
      return `موظف - ${resolvedEmployeeRole}`;
    }

    return ROLE_LABELS[accountType] || getAccountFallbackLabel(accountType);
  }, [userData?.employeeId, userData?.employeeRole, userData?.role, userData?.roleName, accountType]);

  const employeePermissions = useMemo((): RolePermissions | null => {
    if (!userData) return null;
    if (userData.employeeId || userData.employeeRole || userData.role) {
      const role = (userData.employeeRole || userData.role) as EmployeeRole;
      return DEFAULT_PERMISSIONS[role] ?? null;
    }
    return null;
  }, [userData]);

  const menuGroups = useMemo(
    () => getAccountMenuGroups(accountType, employeePermissions),
    [accountType, employeePermissions],
  );

  const profileHref = `\/dashboard\/${accountType === 'admin' ? 'admin' : accountType}\/profile`;

  // â”€â”€ Logout â”€â”€
  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    try { await logout(); } catch { /* show screen regardless */ }
    setIsLoggingOut(false);
    setShowLogoutConfirm(false);
    setShowLogoutScreen(true);
  };

  if (showLogoutScreen) return <LogoutScreen />;

  const collapsed = !isMobile && isCollapsed;

  return (
    <div
      dir="rtl"
      className="min-h-screen"
      style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
      data-account={accountType}
    >
      {/* Sidebar */}
      {showSidebar && (
        <Sidebar
          menuGroups={menuGroups}
          displayName={displayName}
          avatarUrl={avatarUrl}
          logoUrl={accountType === 'club' ? clubLogo : null}
          roleName={roleName}
          onLogout={handleLogout}
        />
      )}

      {/* Header */}
      {showHeader && (
        <AppHeader
          displayName={displayName}
          avatarUrl={avatarUrl}
          roleName={roleName}
          profileHref={profileHref}
          onLogout={handleLogout}
        />
      )}

      {/* Main content */}
      <main
        className={cn(
          'app-main',
          collapsed && 'collapsed',
          noPadding && '!p-0',
          !showSidebar && '!ms-0',
          !showHeader && 'cinema-main',
        )}
      >
        {children}
      </main>

      {/* Footer */}
      {!noPadding && <AppFooter />}

      {/* Mobile bottom navigation */}
      {showSidebar && <MobileBottomNav accountType={accountType} />}

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/65 px-4 backdrop-blur-md">
          <div className="relative w-full max-w-md overflow-hidden rounded-[30px] border border-white/20 bg-white shadow-[0_32px_120px_rgba(15,23,42,0.35)]">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-400 via-rose-500 to-fuchsia-600" />

            <div className="p-6 sm:p-7">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-50 via-orange-50 to-amber-100 text-rose-600 shadow-inner">
                    <LogOut className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold tracking-[0.24em] text-slate-400">
                      LOGOUT
                    </p>
                    <h3 className="text-xl font-bold leading-8 text-slate-900">
                      هل أنت متأكد من تسجيل الخروج؟
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                  aria-label="إغلاق"
                >
                  ×
                </button>
              </div>

              <div className="mb-6 rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 via-white to-rose-50/40 p-4">
                <div className="mb-2 flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-semibold">تنبيه قبل المتابعة</span>
                </div>
                <p className="text-sm leading-7 text-slate-600">
                  سيتم إنهاء جلستك الحالية والخروج من لوحة التحكم. يمكنك تسجيل الدخول مجددًا في أي وقت.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={confirmLogout}
                  disabled={isLoggingOut}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(244,63,94,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <LogOut className="h-4 w-4" />
                  {isLoggingOut ? 'جاري تسجيل الخروج...' : 'تأكيد تسجيل الخروج'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ Public export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface AppShellProps {
  accountType: string;
  children: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  noPadding?: boolean;
}

export default function AppShell({
  accountType,
  children,
  noPadding,
  showHeader = true,
  showFooter = true,
}: AppShellProps) {
  return (
    <AppShellProvider>
      <InnerShell
        accountType={accountType}
        noPadding={noPadding}
        showHeader={showHeader}
        showSidebar={showFooter}
      >
        {children}
      </InnerShell>
    </AppShellProvider>
  );
}
