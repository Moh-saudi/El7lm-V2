'use client';

/**
 * AppFooter — Unified dashboard footer.
 * Spans the content area (same margin-inline-start as header and main).
 * Shows: copyright + version + quick links
 */

import { cn } from '@/lib/utils';
import React from 'react';
import { useAppShell } from './AppShellContext';

export default function AppFooter() {
  const { isCollapsed, isMobile } = useAppShell();
  const collapsed = !isMobile && isCollapsed;
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn(
        'app-footer',
        collapsed && 'collapsed',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 w-full text-xs"
        style={{ color: 'var(--header-text-muted)', fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
      >
        {/* Copyright */}
        <span>© {year} EL7LM — جميع الحقوق محفوظة</span>

        {/* Quick links */}
        <div className="flex items-center gap-4">
          <a
            href="/privacy"
            className="hover:underline transition-colors"
            style={{ color: 'var(--header-text-muted)' }}
          >
            سياسة الخصوصية
          </a>
          <a
            href="/terms"
            className="hover:underline transition-colors"
            style={{ color: 'var(--header-text-muted)' }}
          >
            الشروط والأحكام
          </a>
          <a
            href="/support"
            className="hover:underline transition-colors"
            style={{ color: 'var(--header-text-muted)' }}
          >
            الدعم الفني
          </a>
        </div>

        {/* Version */}
        <span className="opacity-50">v2.0</span>
      </div>
    </footer>
  );
}
