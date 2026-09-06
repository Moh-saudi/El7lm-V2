'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, ArrowLeft, ArrowRight, QrCode } from 'lucide-react';
import { useTranslation, Locale } from '@/lib/i18n';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.el7lm.el7lm_mobile&pcampaignid=web_share';
const SNOOZE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 Hours

type SupportedLang = 'ar' | 'en' | 'es' | 'fr' | 'pt';

interface LangOption {
  code: SupportedLang;
  label: string;
}

const AVAILABLE_LANGUAGES: LangOption[] = [
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'pt', label: 'Português' },
];

// High quality, 100% cross-platform SVG Flag Icons (Windows & Mobile compatible)
function FlagIcon({ code, className = 'w-4.5 h-3.5' }: { code: SupportedLang; className?: string }) {
  const common = { className: `${className} rounded-sm overflow-hidden flex-shrink-0 shadow-xs inline-block align-middle`, viewBox: '0 0 24 16', role: 'img' as const, 'aria-hidden': true };
  
  if (code === 'ar') {
    return (
      <svg {...common}>
        <rect width="24" height="16" rx="2" fill="#165b33" />
        <text x="12" y="6.8" textAnchor="middle" fill="#fff" fontSize="2.15" fontFamily="Arial">لا إله إلا الله</text>
        <path d="M6 10.5h12" stroke="#fff" strokeWidth=".65" strokeLinecap="round" />
        <path d="M7 9.5h10" stroke="#fff" strokeWidth=".35" strokeLinecap="round" />
      </svg>
    );
  }
  if (code === 'en') {
    return (
      <svg {...common}>
        <rect width="24" height="16" rx="2" fill="#23408e" />
        <path d="M0 0l24 16M24 0L0 16" stroke="#fff" strokeWidth="3.6" />
        <path d="M0 0l24 16M24 0L0 16" stroke="#c8102e" strokeWidth="1.4" />
        <path d="M12 0v16M0 8h24" stroke="#fff" strokeWidth="5.2" />
        <path d="M12 0v16M0 8h24" stroke="#c8102e" strokeWidth="2.6" />
      </svg>
    );
  }
  if (code === 'es') {
    return (
      <svg {...common}>
        <rect width="24" height="16" rx="2" fill="#aa151b" />
        <rect y="3.5" width="24" height="9" fill="#f1bf00" />
        <circle cx="6" cy="8" r="1.15" fill="#aa151b" opacity=".85" />
      </svg>
    );
  }
  if (code === 'fr') {
    return (
      <svg {...common}>
        <rect width="8" height="16" fill="#002395" />
        <rect x="8" width="8" height="16" fill="#ffffff" />
        <rect x="16" width="8" height="16" fill="#ed2939" />
      </svg>
    );
  }
  // pt (Portugal)
  return (
    <svg {...common}>
      <rect width="24" height="16" rx="2" fill="#046a38" />
      <rect width="9.2" height="16" fill="#d7141a" />
      <circle cx="9.2" cy="8" r="3.25" fill="#ffdf00" />
      <path d="M9.2 4.75a3.25 3.25 0 0 1 0 6.5 2.6 2.6 0 0 0 0-6.5z" fill="#d7141a" />
    </svg>
  );
}

// 5 Languages - Minimal & Direct Texts
const MODAL_TRANSLATIONS: Record<
  SupportedLang,
  {
    badge: string;
    title: string;
    subtitle: string;
    getItOn: string;
    googlePlay: string;
    dismiss: string;
    rating: string;
    scanQr: string;
    backToButton: string;
  }
> = {
  ar: {
    badge: 'تطبيق الحلم الرسمي',
    title: 'حمّل تطبيق الحلم من Google Play',
    subtitle: 'تجربة أسرع وأسهل لاستكشاف الفرص والمواهب مباشرة من هاتفك.',
    getItOn: 'تحميل من',
    googlePlay: 'Google Play',
    dismiss: 'المتابعة عبر الموقع',
    rating: '5.0 ★ مجاناً بالكامل',
    scanQr: 'امسح الرمز بكاميرا هاتفك',
    backToButton: 'العودة للزر المباشر',
  },
  en: {
    badge: 'Official El7lm App',
    title: 'Download El7lm on Google Play',
    subtitle: 'A faster, smoother experience to explore opportunities on your phone.',
    getItOn: 'GET IT ON',
    googlePlay: 'Google Play',
    dismiss: 'Continue to website',
    rating: '5.0 ★ 100% Free',
    scanQr: 'Scan with your phone camera',
    backToButton: 'Back to direct button',
  },
  es: {
    badge: 'App Oficial El7lm',
    title: 'Descarga El7lm en Google Play',
    subtitle: 'Una experiencia más rápida para descubrir talentos desde tu móvil.',
    getItOn: 'DISPONIBLE EN',
    googlePlay: 'Google Play',
    dismiss: 'Continuar en la web',
    rating: '5.0 ★ Gratis',
    scanQr: 'Escanea con la cámara de tu móvil',
    backToButton: 'Volver al botón directo',
  },
  fr: {
    badge: 'Application Officielle El7lm',
    title: 'Téléchargez El7lm sur Google Play',
    subtitle: 'Une expérience fluide pour suivre toutes les opportunités sur mobile.',
    getItOn: 'DISPONIBLE SUR',
    googlePlay: 'Google Play',
    dismiss: 'Continuer sur le site',
    rating: '5.0 ★ Gratuit',
    scanQr: 'Scannez avec votre mobile',
    backToButton: 'Retour au bouton direct',
  },
  pt: {
    badge: 'App Oficial El7lm',
    title: 'Baixe a El7lm no Google Play',
    subtitle: 'Uma experiência mais rápida para acompanhar oportunidades no celular.',
    getItOn: 'DISPONÍVEL NO',
    googlePlay: 'Google Play',
    dismiss: 'Continuar no site',
    rating: '5.0 ★ Grátis',
    scanQr: 'Escaneie com a câmera do celular',
    backToButton: 'Voltar ao botão direto',
  },
};

// Official Google Play Triangle Icon
function GooglePlayIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1z" fill="#00c0f7" />
      <path d="M47 0C34 7.5 25.1 21.3 25.1 38.3v435.3c0 17 8.9 30.9 21.9 38.4l254.3-254.3L47 0z" fill="#00e676" />
      <path d="M325.3 277.7l60.1 60.1L104.6 499l220.7-221.3z" fill="#ff3333" />
      <path d="M486.9 230.1l-101.5-59-60.1 60 60.1 60 101.5-59c17.2-9.9 25.1-23.7 25.1-31s-7.9-21.1-25.1-31z" fill="#ffbb00" />
    </svg>
  );
}

const QR_CODE_URL = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
  PLAY_STORE_URL
)}&bgcolor=ffffff&color=0f172a&margin=1&format=svg`;

interface GooglePlayAppModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export default function GooglePlayAppModal({ forceOpen, onClose }: GooglePlayAppModalProps) {
  const { locale, changeLanguage } = useTranslation();
  const [currentLang, setCurrentLang] = useState<SupportedLang>('ar');
  const [isOpen, setIsOpen] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Sync with global i18n locale with Arabic ('ar') as strict default
  useEffect(() => {
    if (locale && (locale in MODAL_TRANSLATIONS)) {
      setCurrentLang(locale as SupportedLang);
    } else {
      setCurrentLang('ar');
    }
  }, [locale]);

  const isRTL = currentLang === 'ar';
  const content = MODAL_TRANSLATIONS[currentLang] || MODAL_TRANSLATIONS.ar;

  useEffect(() => {
    setMounted(true);
    setIsDesktop(window.innerWidth >= 768);

    // Allow opening via custom event anywhere in the app
    const handleOpenEvent = () => setIsOpen(true);
    window.addEventListener('open-google-play-modal', handleOpenEvent);

    if (forceOpen !== undefined) {
      setIsOpen(forceOpen);
      return () => window.removeEventListener('open-google-play-modal', handleOpenEvent);
    }

    // In development / testing, always show on page load; in production use 24h snooze
    const isDev = process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && window.location.hostname === 'localhost');
    const dismissedAt = !isDev ? localStorage.getItem('el7lm_google_play_modal_dismissed_at') : null;
    const now = Date.now();
    const shouldShow = isDev || !dismissedAt || now - parseInt(dismissedAt, 10) > SNOOZE_DURATION_MS;

    if (shouldShow) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('open-google-play-modal', handleOpenEvent);
      };
    }

    return () => window.removeEventListener('open-google-play-modal', handleOpenEvent);
  }, [forceOpen]);

  const handleClose = () => {
    setIsOpen(false);
    try {
      localStorage.setItem('el7lm_google_play_modal_dismissed_at', Date.now().toString());
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).dataLayer?.push({
          event: 'app_download_modal_dismissed',
          source: 'homepage_modal',
        });
      }
    } catch {
      // Safe fallback
    }
    if (onClose) onClose();
  };

  const handleLanguageSelect = (langCode: SupportedLang) => {
    setCurrentLang(langCode);
    if (langCode === 'ar' || langCode === 'en' || langCode === 'es' || langCode === 'pt') {
      changeLanguage(langCode as Locale);
    }
    try {
      localStorage.setItem('locale', langCode);
    } catch {
      // Safe fallback
    }
  };

  const handleDownloadClick = () => {
    try {
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = window as any;
        win.dataLayer?.push({
          event: 'app_download_click',
          source: 'homepage_modal',
          store: 'google_play',
          language: currentLang,
        });
        if (typeof win.clarity === 'function') {
          win.clarity('event', 'app_download_click');
        }
      }
    } catch {
      // Ignore
    }
  };

  if (!mounted) return null;

  const modalElement = (
    <AnimatePresence>
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100dvh',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box',
          }}
          dir={isRTL ? 'rtl' : 'ltr'}
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            style={{
              position: 'fixed',
              inset: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(5px)',
              WebkitBackdropFilter: 'blur(5px)',
            }}
          />

          {/* Clean Daylight Card - Centered Perfectly */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 360 }}
            className="relative w-full max-w-[340px] sm:max-w-[380px] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 text-slate-900 text-center"
            style={{
              position: 'relative',
              margin: 'auto',
              maxHeight: '92dvh',
              overflowY: 'auto',
            }}
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              aria-label="Close"
              className="absolute top-3.5 end-3.5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center z-20"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Content */}
            <div className="p-5 sm:p-7 pt-6">
              {/* Top Language Switcher Bar with Real SVG Flags */}
              <div className="flex items-center justify-center gap-1 mb-3.5 p-1 rounded-full bg-slate-100/90 border border-slate-200/60 w-fit mx-auto">
                <div className="flex items-center gap-0.5 sm:gap-1">
                  {AVAILABLE_LANGUAGES.map((lang) => {
                    const isActive = currentLang === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => handleLanguageSelect(lang.code)}
                        className={`text-[11px] sm:text-xs font-semibold px-2 py-1 rounded-full transition-all duration-150 flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-slate-950 text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/70'
                        }`}
                      >
                        <FlagIcon code={lang.code} className="w-4 h-2.5" />
                        <span className="leading-none">{lang.code.toUpperCase()}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* App Icon Container - Clean & Sharp */}
              <div className="flex justify-center items-center mb-3">
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-sm p-2 flex items-center justify-center">
                  <img
                    src="/el7lm-logo.png"
                    alt="El7lm Logo"
                    className="w-14 h-14 sm:w-16 sm:h-16 object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Top Badge */}
              <div className="mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] sm:text-xs font-semibold border border-emerald-200/60">
                  <GooglePlayIcon className="w-3.5 h-3.5" />
                  <span>{content.badge}</span>
                </span>
              </div>

              {/* Title & Subtitle */}
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-snug px-1">
                {content.title}
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
                {content.subtitle}
              </p>

              {/* Rating Pill */}
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] sm:text-xs font-semibold">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{content.rating}</span>
              </div>

              {/* QR Code view for Desktop OR Direct Google Play Button */}
              {showQr ? (
                <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-200/60 flex flex-col items-center">
                  <div className="w-32 h-32 p-1.5 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center">
                    <img src={QR_CODE_URL} alt="Google Play QR Code" className="w-full h-full" />
                  </div>
                  <p className="mt-2 text-[11px] text-slate-600 font-medium">
                    {content.scanQr}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowQr(false)}
                    className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-bold"
                  >
                    {content.backToButton}
                  </button>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  <a
                    href={PLAY_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleDownloadClick}
                    className="w-full inline-flex items-center justify-center gap-3 py-3 px-5 rounded-2xl bg-slate-950 hover:bg-slate-800 text-white font-medium shadow-md shadow-slate-950/15 hover:shadow-lg transition-all duration-200 group cursor-pointer"
                  >
                    <GooglePlayIcon className="w-6 h-6 flex-shrink-0" />
                    <div className="text-start">
                      <p className="text-[9px] uppercase tracking-wider text-slate-400 font-medium leading-none mb-1">
                        {content.getItOn}
                      </p>
                      <p className="text-sm sm:text-base font-bold text-white leading-none">
                        {content.googlePlay}
                      </p>
                    </div>
                    <div className="ms-auto opacity-70 group-hover:opacity-100 transition-opacity">
                      {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                    </div>
                  </a>

                  {/* QR Toggle button only for Desktop */}
                  {isDesktop && (
                    <button
                      type="button"
                      onClick={() => setShowQr(true)}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors pt-1"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>{content.scanQr}</span>
                    </button>
                  )}
                </div>
              )}

              {/* Dismiss / Continue */}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors font-medium py-1 px-3"
                >
                  {content.dismiss}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalElement, document.body) : null;
}
