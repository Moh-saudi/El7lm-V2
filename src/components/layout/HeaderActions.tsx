'use client';

/**
 * HeaderActions — Notification bell + Messages + User avatar dropdown.
 * Reuses existing UnifiedNotificationsButton and UnifiedMessagesButton.
 */

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import UnifiedMessagesButton from '@/components/shared/UnifiedMessagesButton';
import UnifiedNotificationsButton from '@/components/shared/UnifiedNotificationsButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe, LogOut, Moon, Settings, Sun, User } from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';

// ─── Dark mode toggle ─────────────────────────────────────────────────────────

function useDarkMode() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('el7lm-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved ? saved === 'dark' : prefersDark;
    setDark(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggle = () => {
    setDark(prev => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem('el7lm-theme', next ? 'dark' : 'light');
      return next;
    });
  };

  return { dark, toggle };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface HeaderActionsProps {
  displayName: string;
  avatarUrl?: string | null;
  roleName: string;
  profileHref: string;
  settingsHref?: string;
  onLogout: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HeaderActions({
  displayName,
  avatarUrl,
  roleName,
  profileHref,
  settingsHref,
  onLogout,
}: HeaderActionsProps) {
  const { dark, toggle } = useDarkMode();

  const initials = displayName
    ? displayName.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?';

  return (
    <div className="flex items-center gap-1" style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}>
      {/* Language switcher — قيد التطوير */}
      <button
        className="header-action-btn gap-1 px-2 text-xs font-semibold"
        title="تغيير اللغة (قريباً)"
        aria-label="تغيير اللغة"
        disabled
        style={{ opacity: 0.5, cursor: 'not-allowed', width: 'auto' }}
      >
        <Globe size={15} />
        <span className="hidden sm:inline">AR</span>
      </button>

      {/* Dark mode toggle */}
      <button
        onClick={toggle}
        className="header-action-btn"
        title={dark ? 'الوضع النهاري' : 'الوضع الداكن'}
        aria-label="تبديل المظهر"
      >
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Messages */}
      <div className="header-action-btn p-0">
        <UnifiedMessagesButton />
      </div>

      {/* Notifications */}
      <div className="header-action-btn p-0">
        <UnifiedNotificationsButton />
      </div>

      {/* User avatar dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors duration-150 cursor-pointer border-none bg-transparent"
            style={{ color: 'var(--header-text)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--header-icon-btn-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={avatarUrl || undefined} alt={displayName} />
              <AvatarFallback
                className="text-xs font-bold"
                style={{ background: 'var(--accent-current)', color: '#fff' }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:block text-start leading-tight">
              <p className="text-sm font-semibold" style={{ color: 'var(--header-text)' }}>
                {displayName}
              </p>
              <p className="text-xs" style={{ color: 'var(--header-text-muted)' }}>
                {roleName}
              </p>
            </div>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{roleName}</p>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <Link href={profileHref} className="cursor-pointer">
              <User className="me-2 h-4 w-4" />
              الملف الشخصي
            </Link>
          </DropdownMenuItem>

          {settingsHref && (
            <DropdownMenuItem asChild>
              <Link href={settingsHref} className="cursor-pointer">
                <Settings className="me-2 h-4 w-4" />
                الإعدادات
              </Link>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={onLogout}
            className="text-red-500 focus:text-red-500 cursor-pointer"
          >
            <LogOut className="me-2 h-4 w-4" />
            تسجيل الخروج
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
