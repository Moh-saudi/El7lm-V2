'use client';

/**
 * Sidebar — Visual shell for the sidebar.
 * - Fixed position, full height.
 * - Width transitions via CSS (no Framer Motion).
 * - Delegates menu rendering to SidebarNav.
 * - Delegates user panel to SidebarUserPanel.
 */

import { cn } from '@/lib/utils';
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { useAppShell } from './AppShellContext';
import SidebarNav, { MenuGroup } from './SidebarNav';
import SidebarUserPanel from './SidebarUserPanel';

// ─── Brand logo mark ──────────────────────────────────────────────────────────

function BrandMark({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 h-14 border-b flex-shrink-0',
        'transition-all duration-200',
        collapsed ? 'justify-center px-2' : 'px-4',
      )}
      style={{ borderColor: 'var(--sidebar-border)' }}
    >
      {/* Logo icon — always visible */}
      <Link href="/dashboard" className="flex-shrink-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-sm"
          style={{ background: 'var(--accent-current)' }}
        >
          E7
        </div>
      </Link>

      {/* Logo text — hidden when collapsed */}
      {!collapsed && (
        <span
          className="font-bold text-base tracking-tight truncate"
          style={{ color: 'var(--sidebar-text)' }}
        >
          EL7LM
        </span>
      )}
    </div>
  );
}

// ─── Collapse toggle button ────────────────────────────────────────────────────

function CollapseButton({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'flex items-center justify-center w-8 h-8 rounded-lg mx-auto my-1',
        'transition-colors duration-150 cursor-pointer',
      )}
      style={{
        color: 'var(--sidebar-text)',
        background: 'transparent',
        border: 'none',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--sidebar-bg-hover)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
    >
      {collapsed
        ? <PanelLeftOpen size={16} />
        : <PanelLeftClose size={16} />
      }
    </button>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  menuGroups: MenuGroup[];
  displayName: string;
  avatarUrl?: string | null;
  logoUrl?: string | null;
  roleName: string;
  onLogout: () => void;
}

// ─── Sidebar Component ────────────────────────────────────────────────────────

export default function Sidebar({
  menuGroups,
  displayName,
  avatarUrl,
  logoUrl,
  roleName,
  onLogout,
}: SidebarProps) {
  const { isCollapsed, isMobileOpen, toggleCollapse, closeMobile, isMobile } = useAppShell();

  const collapsed = !isMobile && isCollapsed;

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && (
        <div
          className={cn(
            'app-sidebar-backdrop',
            isMobileOpen && 'visible',
          )}
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          'app-sidebar',
          collapsed && 'collapsed',
          isMobile && isMobileOpen && 'mobile-open',
        )}
        aria-label="القائمة الجانبية"
      >
        {/* Brand */}
        <BrandMark collapsed={collapsed} />

        {/* User panel */}
        <SidebarUserPanel
          displayName={displayName}
          avatarUrl={avatarUrl}
          logoUrl={logoUrl}
          roleName={roleName}
        />

        {/* Navigation — scrollable */}
        <SidebarNav menuGroups={menuGroups} />

        {/* Bottom: logout + collapse toggle */}
        <div
          className="flex-shrink-0 border-t"
          style={{ borderColor: 'var(--sidebar-border)' }}
        >
          {/* Logout */}
          <button
            onClick={onLogout}
            className={cn(
              'w-full border-none cursor-pointer flex items-center gap-2.5 mx-2 my-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all',
              'text-red-500 hover:bg-red-50 hover:text-red-600 active:scale-95',
              collapsed ? 'justify-center mx-auto w-10 px-0' : '',
            )}
            data-tooltip={collapsed ? 'تسجيل الخروج' : undefined}
            style={{ width: collapsed ? 40 : 'calc(100% - 16px)' }}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>تسجيل الخروج</span>}
          </button>

          {/* Collapse toggle (desktop only) */}
          {!isMobile && (
            <div className="py-1">
              <CollapseButton collapsed={collapsed} onToggle={toggleCollapse} />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
