'use client';

/**
 * AppHeader — Sticky header spanning the content area (not behind sidebar).
 * Left:   hamburger (mobile) / page greeting
 * Center: search bar (desktop)
 * Right:  HeaderActions (notifications, messages, avatar)
 *
 * Margin-inline-start is driven by CSS classes (see layout-tokens.css).
 */

import { cn } from '@/lib/utils';
import { Menu, Search, X } from 'lucide-react';
import React, { useState } from 'react';
import { useAppShell } from './AppShellContext';
import HeaderActions from './HeaderActions';

// ─── Search bar ───────────────────────────────────────────────────────────────

function HeaderSearch() {
  const [focused, setFocused] = useState(false);

  return (
    <div
      className={cn(
        'hidden md:flex items-center gap-2 h-9 rounded-lg px-3 transition-all duration-150',
        'border text-sm',
        focused
          ? 'w-72 border-[var(--accent-current)] bg-white dark:bg-slate-900'
          : 'w-52 border-transparent bg-black/5 dark:bg-white/5',
      )}
      style={{ color: 'var(--header-text-muted)' }}
    >
      <Search size={15} className="flex-shrink-0" />
      <input
        type="text"
        placeholder="بحث..."
        className="flex-1 bg-transparent outline-none text-sm placeholder:text-inherit"
        style={{ color: 'var(--header-text)' }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {focused && (
        <button
          onMouseDown={e => e.preventDefault()}
          className="flex-shrink-0 opacity-50 hover:opacity-100"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AppHeaderProps {
  greeting?: string;
  displayName: string;
  avatarUrl?: string | null;
  roleName: string;
  profileHref: string;
  settingsHref?: string;
  onLogout: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AppHeader({
  greeting,
  displayName,
  avatarUrl,
  roleName,
  profileHref,
  settingsHref,
  onLogout,
}: AppHeaderProps) {
  const { isCollapsed, isMobile, toggleMobile } = useAppShell();

  const collapsed = !isMobile && isCollapsed;

  return (
    <header
      className={cn(
        'app-header',
        collapsed && 'collapsed',
      )}
    >
      <div className="flex items-center justify-between w-full px-4 gap-3">

        {/* ── Left side ─────────────────────────────────── */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile hamburger */}
          {isMobile && (
            <button
              onClick={toggleMobile}
              className="header-action-btn flex-shrink-0"
              aria-label="فتح القائمة"
            >
              <Menu size={20} />
            </button>
          )}

          {/* Greeting / page title */}
          {greeting && (
            <p
              className="text-sm font-medium truncate hidden sm:block"
              style={{ color: 'var(--header-text-muted)' }}
            >
              {greeting}
            </p>
          )}
        </div>

        {/* ── Center: search ────────────────────────────── */}
        <div className="flex-1 flex justify-center">
          <HeaderSearch />
        </div>

        {/* ── Right side: actions ───────────────────────── */}
        <HeaderActions
          displayName={displayName}
          avatarUrl={avatarUrl}
          roleName={roleName}
          profileHref={profileHref}
          settingsHref={settingsHref}
          onLogout={onLogout}
        />
      </div>
    </header>
  );
}
