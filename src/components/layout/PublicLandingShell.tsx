'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Mail, Menu, X } from 'lucide-react';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import { useTranslation } from '@/lib/i18n';
import { SUPPORT_CONTACT } from '@/lib/support-contact';

type PublicLandingShellProps = {
  children: ReactNode;
};

const socialLinks = [
  { label: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61577797509887' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@meskel7lm' },
  { label: 'YouTube', href: 'https://www.youtube.com/@el7lm25' },
  { label: 'Instagram', href: 'https://www.instagram.com/hagzzel7lm/' },
];

export function PublicLandingShell({ children }: PublicLandingShellProps) {
  const { t, isRTL } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const navItems = [
    { label: t('support.navHome'), href: '/' },
    { label: t('support.navAbout'), href: '/about' },
    { label: t('support.navContact'), href: '/contact' },
    { label: t('support.title'), href: '/support', active: true },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-950" dir={isRTL ? 'rtl' : 'ltr'}>
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="EL7LM">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/el7lm-logo.png" alt="EL7LM" className="h-10 w-10 object-contain" />
            <span className="text-xl font-black tracking-tight text-indigo-700">EL7LM</span>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex" aria-label={t('support.mainNavigation')}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-bold transition-colors ${
                  item.active ? 'text-indigo-700' : 'text-slate-600 hover:text-indigo-700'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <LanguageSwitcher variant="light" compact />
            <Link href="/auth/login" className="px-3 py-2 text-sm font-bold text-slate-700 hover:text-indigo-700">
              {t('support.login')}
            </Link>
            <Link
              href="/auth/register"
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-indigo-700"
            >
              {t('support.createAccount')}
            </Link>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <LanguageSwitcher variant="light" compact />
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-700"
              aria-label={t('support.mainNavigation')}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-slate-100 bg-white px-4 py-4 lg:hidden">
            <nav className="mx-auto flex max-w-7xl flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-xl px-4 py-3 text-sm font-bold ${
                    item.active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                <Link href="/auth/login" className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-bold">
                  {t('support.login')}
                </Link>
                <Link href="/auth/register" className="rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-bold text-white">
                  {t('support.createAccount')}
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {children}

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <Link href="/" className="inline-flex items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/el7lm-logo.png" alt="EL7LM" className="h-11 w-11 object-contain" />
                <span className="text-xl font-black text-indigo-700">EL7LM</span>
              </Link>
              <p className="mt-4 max-w-md text-sm leading-7 text-slate-600">{t('support.footerTagline')}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {socialLinks.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-700"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-black text-slate-900">{t('support.footerExplore')}</h2>
              <div className="mt-4 flex flex-col gap-3 text-sm font-medium text-slate-600">
                <Link href="/about" className="hover:text-indigo-700">{t('support.navAbout')}</Link>
                <Link href="/contact" className="hover:text-indigo-700">{t('support.navContact')}</Link>
                <Link href="/privacy" className="hover:text-indigo-700">{t('support.privacyPolicy')}</Link>
                <Link href="/terms" className="hover:text-indigo-700">{t('support.termsConditions')}</Link>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-black text-slate-900">{t('support.footerHelp')}</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">{t('support.responsePromise')}</p>
              <a href={`mailto:${SUPPORT_CONTACT.email}`} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-indigo-700">
                <Mail className="h-4 w-4" />
                <span dir="ltr">{SUPPORT_CONTACT.email}</span>
              </a>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-2 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} EL7LM. {t('support.copyright')}</p>
            <p>{t('support.footerCompany')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
