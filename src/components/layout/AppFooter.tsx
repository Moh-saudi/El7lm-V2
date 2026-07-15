'use client';

import { cn } from '@/lib/utils';
import React from 'react';
import { useAppShell } from './AppShellContext';
import { useTranslation } from '@/lib/i18n';

export default function AppFooter() {
  const { isCollapsed, isMobile } = useAppShell();
  const { t } = useTranslation();
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
              { href: '/privacy', label: t('sharedComponents.footer.privacyShort') },
              { href: '/terms',   label: t('sharedComponents.footer.termsShort') },
              { href: '/support', label: t('sharedComponents.footer.supportShort') },
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
          <span className="opacity-60">© {year} {t('sharedComponents.footer.brand')}</span>
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
        <span>© {year} {t('sharedComponents.footer.brand')} — {t('sharedComponents.footer.rights')}</span>

        <div className="flex items-center gap-4">
          {[
            { href: '/privacy', label: t('sharedComponents.footer.privacy') },
            { href: '/terms',   label: t('sharedComponents.footer.terms') },
            { href: '/support', label: t('sharedComponents.footer.support') },
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

        <span className="opacity-50">{t('sharedComponents.footer.version')}</span>
      </div>
    </footer>
  );
}
