'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { D5, LANGUAGES, SupportedLang } from '@/lib/website-i18n';

// Social media links identical to home page
const SOCIAL_LINKS = [
  { id: 'wa', name: 'WhatsApp', color: '#25D366', url: 'https://wa.me/97470542458' },
  { id: 'gp', name: 'Google Play', color: '#34A853', url: 'https://play.google.com/store/apps/details?id=com.el7lm.el7lm_mobile&pcampaignid=web_share' },
  { id: 'ap', name: 'App Store', color: '#007AFF', url: '#' },
  { id: 'yt', name: 'YouTube', color: '#FF0000', url: 'https://www.youtube.com/@el7lm25' },
  { id: 'ig', name: 'Instagram', color: '#E4405F', url: 'https://www.instagram.com/hagzzel7lm/' },
  { id: 'fb', name: 'Facebook', color: '#1877F2', url: 'https://www.facebook.com/profile.php?id=61577797509887' },
  { id: 'tt', name: 'TikTok', color: '#fff', url: 'https://www.tiktok.com/@meskel7lm' },
];

export interface WebsiteShellProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  contentClassName?: string;
}

export function WebsiteShell({ children, title, className = '', contentClassName = '' }: WebsiteShellProps) {
  const [lang, setLang] = useState<SupportedLang>('ar');
  const [langIndex, setLangIndex] = useState(1); // default Arabic
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Read saved language on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mk_lang') as SupportedLang;
      if (saved && ['en', 'ar', 'fr', 'es', 'pt'].includes(saved)) {
        const idx = LANGUAGES.findIndex(l => l.code === saved);
        if (idx !== -1) {
          setLang(saved);
          setLangIndex(idx);
          document.documentElement.lang = saved;
          document.documentElement.dir = LANGUAGES[idx].dir;
        }
      } else {
        document.documentElement.lang = 'ar';
        document.documentElement.dir = 'rtl';
      }
    } catch {}
  }, []);

  // Update document title if title prop is supplied
  useEffect(() => {
    if (title) {
      document.title = `${title} | El7lm`;
    }
  }, [title]);

  const handleLangSelect = useCallback((code: SupportedLang) => {
    const idx = LANGUAGES.findIndex(l => l.code === code);
    if (idx === -1) return;
    setLang(code);
    setLangIndex(idx);
    try {
      localStorage.setItem('mk_lang', code);
    } catch {}
    document.documentElement.lang = code;
    document.documentElement.dir = LANGUAGES[idx].dir;
  }, []);

  const t = useCallback((key: string, fb?: string) => {
    const row = D5[key];
    if (!row) return fb ?? key;
    return row[langIndex] || row[0] || fb || key;
  }, [langIndex]);

  return (
    <div className={`el7lm-site go ${className}`}>
      {/* ─── Inline SVG Sprite ──────────────────────────────────────────────── */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <symbol id="i-wa" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52s.198-.298.298-.497c.099-.198.05-.371-.025-.52s-.669-1.612-.916-2.207c-.242-.579-.487-.5-.669-.51a13 13 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074s2.096 3.2 5.077 4.487c.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413s.248-1.289.173-1.413c-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.82 11.82 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.9 11.9 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413" />
        </symbol>
        <symbol id="i-gp" viewBox="0 0 24 24">
          <path d="m22.018 13.298-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594M1.337.924a1.5 1.5 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087zm12.207 10.065 3.258-3.238L3.45.195a1.47 1.47 0 0 0-.946-.179zm0 2.067-11 10.933c.298.036.612-.016.906-.183l13.324-7.54z" />
        </symbol>
        <symbol id="i-ap" viewBox="0 0 24 24">
          <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
        </symbol>
        <symbol id="i-yt" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.02 3.02 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.02 3.02 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.02 3.02 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.02 3.02 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814M9.545 15.568V8.432L15.818 12z" />
        </symbol>
        <symbol id="i-ig" viewBox="0 0 24 24">
          <path d="M7.03.084c-1.277.06-2.149.264-2.91.563a5.9 5.9 0 0 0-2.124 1.388 5.9 5.9 0 0 0-1.38 2.127C.321 4.926.12 5.8.064 7.076s-.069 1.688-.063 4.947.021 3.667.083 4.947c.061 1.277.264 2.149.563 2.911.308.789.72 1.457 1.388 2.123a5.9 5.9 0 0 0 2.129 1.38c.763.295 1.636.496 2.913.552 1.278.056 1.689.069 4.947.063s3.668-.021 4.947-.082c1.28-.06 2.147-.265 2.91-.563a5.9 5.9 0 0 0 2.123-1.388 5.9 5.9 0 0 0 1.38-2.129c.295-.763.496-1.636.551-2.912.056-1.28.07-1.69.063-4.948-.006-3.258-.02-3.667-.081-4.947-.06-1.28-.264-2.148-.564-2.911a5.9 5.9 0 0 0-1.387-2.123 5.86 5.86 0 0 0-2.128-1.38C19.074.322 18.202.12 16.924.066 15.647.009 15.236-.006 11.977 0S8.31.021 7.03.084m.14 21.693c-1.17-.05-1.805-.245-2.228-.408a3.7 3.7 0 0 1-1.382-.895 3.7 3.7 0 0 1-.9-1.378c-.165-.423-.363-1.058-.417-2.228-.06-1.264-.072-1.644-.08-4.848-.006-3.204.006-3.583.061-4.848.05-1.169.246-1.805.408-2.228.216-.561.477-.96.895-1.382a3.7 3.7 0 0 1 1.379-.9c.423-.165 1.057-.361 2.227-.417 1.265-.06 1.644-.072 4.848-.08 3.203-.006 3.583.006 4.85.062 1.168.05 1.804.244 2.227.408.56.216.96.475 1.382.895s.681.817.9 1.378c.165.422.362 1.056.417 2.227.06 1.265.074 1.645.08 4.848.005 3.203-.006 3.583-.061 4.848-.051 1.17-.245 1.805-.408 2.23-.216.56-.477.96-.896 1.38a3.7 3.7 0 0 1-1.378.9c-.422.165-1.058.362-2.226.418-1.266.06-1.645.072-4.85.079s-3.582-.006-4.848-.06m9.783-16.192a1.44 1.44 0 1 0 1.437-1.442 1.44 1.44 0 0 0-1.437 1.442M5.839 12.012a6.161 6.161 0 1 0 12.323-.024 6.162 6.162 0 0 0-12.323.024M8 12.008A4 4 0 1 1 12.008 16 4 4 0 0 1 8 12.008" />
        </symbol>
        <symbol id="i-fb" viewBox="0 0 24 24">
          <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a9 9 0 0 1 1.141.195v3.325a9 9 0 0 0-.653-.036 27 27 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.7 1.7 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647" />
        </symbol>
        <symbol id="i-tt" viewBox="0 0 24 24">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07" />
        </symbol>
      </svg>

      {/* ─── Unified Website Header ─────────────────────────────────────────── */}
      <header id="hd" className={`dk ${mobileMenuOpen ? 'mo' : ''}`}>
        <Link className="logo" href="/">
          <span className="lm">
            <img src="/assets/img/logo-emblem.png" alt="Logo" />
          </span>
          <span>{t('br')}</span>
        </Link>

        <button
          id="mb"
          aria-label={t('mn')}
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span />
          <span />
        </button>

        <nav id="nv" className={mobileMenuOpen ? 'open' : ''}>
          <Link
            href="/#svc"
            onClick={() => setMobileMenuOpen(false)}
          >
            {t('n_svc', 'ما نقدمه')}
          </Link>
          <Link
            href="/#nisr"
            onClick={() => setMobileMenuOpen(false)}
          >
            {t('n_nisr', 'نسر')}
          </Link>
          <Link
            href="/#offices"
            onClick={() => setMobileMenuOpen(false)}
          >
            {t('n_off', 'مكاتبنا')}
          </Link>
          <Link
            href="/#ct"
            onClick={() => setMobileMenuOpen(false)}
          >
            {t('nav_contact', 'تواصل معنا')}
          </Link>

          {/* Quick Platform Sign In link */}
          <Link
            href="/auth/login"
            className="pill"
            style={{ padding: '0.4rem 1.1rem', fontSize: '0.9rem' }}
            onClick={() => setMobileMenuOpen(false)}
          >
            {t('n_login', 'تسجيل الدخول')}
          </Link>

          {/* Quick Platform Register link */}
          <Link
            href="/auth/register"
            className="pill"
            style={{
              padding: '0.4rem 1.1rem',
              fontSize: '0.9rem',
              backgroundColor: 'var(--gold)',
              color: 'var(--navy)',
              borderColor: 'var(--gold)',
            }}
            onClick={() => setMobileMenuOpen(false)}
          >
            {t('n_register', 'إنشاء حساب')}
          </Link>

          {/* Language Switcher */}
          <select
            id="lgs"
            value={lang}
            onChange={(e) => handleLangSelect(e.target.value as SupportedLang)}
            aria-label="Language"
          >
            {LANGUAGES.map(item => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </select>
        </nav>
      </header>

      {/* ─── Page Content Area ──────────────────────────────────────────────── */}
      <main
        className={`site-content ${contentClassName}`}
        style={{
          minHeight: '70vh',
          paddingTop: 'calc(80px + env(safe-area-inset-top, 0px))',
        }}
      >
        {children}
      </main>

      {/* ─── Unified Website Footer ─────────────────────────────────────────── */}
      <footer id="ct">
        <span className="big">{t('ft_big')}</span>

        <div className="fg">
          <div>
            <Link className="logo flg" href="/">
              <span className="lm">
                <img src="/assets/img/logo-emblem.png" alt="Logo" />
              </span>
              <span>{t('br')}</span>
            </Link>
            <p className="fd">{t('s_p')}</p>

            <div className="stores">
              <a
                className="st"
                href="https://play.google.com/store/apps/details?id=com.el7lm.el7lm_mobile&pcampaignid=web_share"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="ic"><use href="#i-gp" /></svg>
                <span>
                  <small>GET IT ON</small>
                  <b>Google Play</b>
                </span>
              </a>
              <span className="st" role="link" aria-disabled="true">
                <svg className="ic"><use href="#i-ap" /></svg>
                <span>
                  <small>Download on the</small>
                  <b>App Store</b>
                </span>
                <em className="hq">{t('soon')}</em>
              </span>
            </div>

            <div className="soc" id="soc">
              {SOCIAL_LINKS.map(s => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.name}
                >
                  <svg className="ic" style={{ color: s.color }}><use href={`#i-${s.id}`} /></svg>
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4>{t('ft_h1')}</h4>
            <Link href="/#p/opps">{t('v1')}</Link>
            <Link href="/#p/clubs">{t('v2')}</Link>
            <Link href="/#p/academies">{t('v3')}</Link>
            <Link href="/#p/coaches">{t('v4')}</Link>
            <Link href="/#p/agents">{t('v5')}</Link>
          </div>

          <div>
            <h4>{t('ft_h2')}</h4>
            <Link href="/about">{t('pt_about')}</Link>
            <Link href="/#offices">{t('n_off')}</Link>
            <Link href="/careers">{t('pt_jobs')}</Link>
            <Link href="/tournaments">{t('tournaments_link')}</Link>
            <Link href="/success-stories">{t('stories_link')}</Link>
            <Link href="/#faq">{t('ft_faq')}</Link>
            <Link href="/privacy">{t('pt_priv')}</Link>
            <Link href="/terms">{t('pt_terms')}</Link>
          </div>

          <div>
            <h4>{t('ft_h3')}</h4>
            <a className="pill g" href="https://wa.me/97470542458" target="_blank" rel="noopener noreferrer">
              <svg className="ic"><use href="#i-wa" /></svg>
              <span>{t('wa_q')}</span>
            </a>
            <small>{t('avail')}</small>

            <a className="pill" href="https://wa.me/201017799580" target="_blank" rel="noopener noreferrer">
              <svg className="ic"><use href="#i-wa" /></svg>
              <span>{t('wa_e')}</span>
            </a>
            <small>{t('avail')}</small>

            <a className="pill" href="tel:+97470542458">
              {t('sponsor')}
            </a>
            <a id="ml" href="mailto:info@el7lm.com" style={{ marginTop: '1rem', display: 'block', color: '#d8d4f5' }}>
              info@el7lm.com
            </a>
          </div>
        </div>

        <div className="fb">
          <span>{t('copy')}</span>
          <span>{t('lic')}</span>
        </div>
      </footer>
    </div>
  );
}

export default WebsiteShell;
