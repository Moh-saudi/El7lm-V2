'use client';

import { cn } from '@/lib/utils';
import React from 'react';
import { useAppShell } from './AppShellContext';

export default function AppFooter() {
  const { isCollapsed, isMobile } = useAppShell();
  const collapsed = !isMobile && isCollapsed;
  const year = new Date().getFullYear();

  // ── Mobile: compact centered footer ──
  if (isMobile) {
    return (
      <footer
        className="app-footer"
        style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
      >
        <div
          className="flex flex-col items-center justify-center gap-2 w-full py-3 px-4 text-xs"
          style={{ color: 'var(--header-text-muted)' }}
        >
          {/* Quick links — horizontal row */}
          <div className="flex items-center gap-5">
            {[
              { href: '/privacy', label: 'الخصوصية' },
              { href: '/terms',   label: 'الشروط' },
              { href: '/support', label: 'الدعم' },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="hover:underline transition-colors"
                style={{ color: 'var(--header-text-muted)' }}
              >
                {label}
              </a>
            ))}
          </div>
          {/* Copyright */}
          <span className="opacity-60">© {year} EL7LM</span>
        </div>
      </footer>
    );
  }

  // ── Desktop: full footer ──
  return (
    <footer
      className={cn('app-footer', collapsed && 'collapsed')}
      style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-2 px-6 w-full text-xs"
        style={{ color: 'var(--header-text-muted)' }}
      >
        <span>© {year} EL7LM — جميع الحقوق محفوظة</span>

        <div className="flex items-center gap-4">
          {[
            { href: '/privacy', label: 'سياسة الخصوصية' },
            { href: '/terms',   label: 'الشروط والأحكام' },
            { href: '/support', label: 'الدعم الفني' },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="hover:underline transition-colors"
              style={{ color: 'var(--header-text-muted)' }}
            >
              {label}
            </a>
          ))}
        </div>

        <span className="opacity-50">v2.0</span>
      </div>
    </footer>
  );
}
