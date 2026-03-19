'use client';

/**
 * AppShell — Root layout orchestrator.
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
import { db } from '@/lib/firebase/config';
import { getPlayerAvatarUrl, getSupabaseImageUrl } from '@/lib/supabase/image-utils';
import { EmployeeRole, RolePermissions } from '@/types/employees';
import { DEFAULT_ROLES } from '@/lib/permissions/types';
import { getAccountMenuGroups } from '@/config/account-menu-config';
import { cn } from '@/lib/utils';
import { doc, onSnapshot } from 'firebase/firestore';
import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { AppShellProvider, useAppShell } from './AppShellContext';
import AppHeader from './AppHeader';
import Sidebar from './Sidebar';

// ─── Default employee permissions ────────────────────────────────────────────

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

// ─── User display helpers ─────────────────────────────────────────────────────

function resolveDisplayName(userData: any, user: any, accountType: string): string {
  if (!userData) return 'مستخدم';
  switch (accountType) {
    case 'player':
      return userData.full_name || userData.name || userData.displayName || user?.displayName || 'لاعب';
    case 'club':
      return userData.club_name || userData.full_name || userData.name || user?.displayName || 'نادي رياضي';
    case 'academy':
      return userData.academy_name || userData.full_name || userData.name || user?.displayName || 'أكاديمية';
    case 'agent':
      return userData.agent_name || userData.full_name || userData.name || user?.displayName || 'وكيل';
    case 'trainer':
      return userData.trainer_name || userData.full_name || userData.name || user?.displayName || 'مدرب';
    default:
      return userData.full_name || userData.name || userData.displayName || user?.displayName || 'مستخدم';
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

// ─── Inner shell (needs context) ─────────────────────────────────────────────

interface InnerShellProps {
  accountType: string;
  children: ReactNode;
  noPadding?: boolean;
}

function InnerShell({ accountType, children, noPadding }: InnerShellProps) {
  const { isCollapsed, isMobile } = useAppShell();
  const { user, userData, logout } = useAuth();

  const [clubLogo, setClubLogo] = useState<string | null>(null);
  const [showLogoutScreen, setShowLogoutScreen] = useState(false);

  // ── Club logo Firestore listener (single, consolidated) ──
  useEffect(() => {
    if (accountType !== 'club' || !user?.uid) return;

    const clubRef = doc(db, 'clubs', user.uid);
    const unsub = onSnapshot(clubRef, (snap) => {
      if (!snap.exists()) { setClubLogo(null); return; }
      const data = snap.data();
      if (!data.logo) { setClubLogo(null); return; }
      if (data.logo.startsWith('http')) {
        setClubLogo(data.logo);
      } else {
        const url = getSupabaseImageUrl(data.logo, 'clubavatar');
        setClubLogo(url || null);
      }
    }, () => setClubLogo(null));

    return unsub;
  }, [accountType, user?.uid]);

  // ── Resolved values ──
  const displayName = useMemo(
    () => resolveDisplayName(userData, user, accountType),
    [userData, user, accountType],
  );

  const avatarUrl = useMemo(
    () => accountType === 'club' && clubLogo ? clubLogo : getPlayerAvatarUrl(userData, user),
    [accountType, clubLogo, userData, user],
  );

  const roleName = useMemo(
    () => (userData?.employeeRole ? `موظف — ${userData.employeeRole}` : ROLE_LABELS[accountType] || accountType),
    [userData?.employeeRole, accountType],
  );

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

  // ── Logout ──
  const handleLogout = async () => {
    const confirmed = window.confirm('هل أنت متأكد من تسجيل الخروج؟');
    if (!confirmed) return;
    try { await logout(); } catch { /* show screen regardless */ }
    setShowLogoutScreen(true);
  };

  if (showLogoutScreen) return <LogoutScreen />;

  const collapsed = !isMobile && isCollapsed;

  return (
    <div dir="rtl" className="min-h-screen font-cairo" data-account={accountType}>
      {/* Sidebar */}
      <Sidebar
        menuGroups={menuGroups}
        displayName={displayName}
        avatarUrl={avatarUrl}
        logoUrl={accountType === 'club' ? clubLogo : null}
        roleName={roleName}
        onLogout={handleLogout}
      />

      {/* Header */}
      <AppHeader
        displayName={displayName}
        avatarUrl={avatarUrl}
        roleName={roleName}
        profileHref={profileHref}
        onLogout={handleLogout}
      />

      {/* Main content */}
      <main
        className={cn(
          'app-main',
          collapsed && 'collapsed',
          noPadding && '!p-0',
        )}
      >
        {children}
      </main>
    </div>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

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
}: AppShellProps) {
  return (
    <AppShellProvider>
      <InnerShell accountType={accountType} noPadding={noPadding}>
        {children}
      </InnerShell>
    </AppShellProvider>
  );
}
