'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PublicLandingShell } from '@/components/layout/PublicLandingShell';
import { useTranslation } from '@/lib/i18n';
import { PRIVACY_POLICY_DATA } from '@/data/privacy-policy-translations';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  UserCheck,
  FileText,
  Globe,
  Scale,
  Building,
  Phone,
  Mail,
  MapPin,
  Search,
  Printer,
  Copy,
  Check,
  Info,
  Users,
  Eye,
  RefreshCw,
  Award,
  Sparkles,
  Sun,
  Moon,
  Home,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

export default function PrivacyPage() {
  const router = useRouter();
  const { locale, isRTL } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSectionId, setActiveSectionId] = useState<string>('intro');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  // Theme state: Default to Light mode (false = light, true = dark)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('privacy_theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
    } else if (savedTheme === 'light') {
      setIsDarkMode(false);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = !isDarkMode;
    setIsDarkMode(nextTheme);
    localStorage.setItem('privacy_theme', nextTheme ? 'dark' : 'light');
  };

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      router.push('/');
    }
  };

  // Get localized dataset (fallback to Arabic if locale not found)
  const currentLocale = (locale in PRIVACY_POLICY_DATA ? locale : 'ar') as 'ar' | 'en' | 'es' | 'pt';
  const privacyData = PRIVACY_POLICY_DATA[currentLocale];

  // Navigation labels by locale
  const navLabels = {
    ar: { home: 'العودة للرئيسية', back: 'رجوع', lightMode: 'الوضع النهاري', darkMode: 'الوضع الليلي' },
    en: { home: 'Back to Home', back: 'Back', lightMode: 'Light Mode', darkMode: 'Dark Mode' },
    es: { home: 'Volver al Inicio', back: 'Volver', lightMode: 'Modo Claro', darkMode: 'Modo Oscuro' },
    pt: { home: 'Voltar ao Início', back: 'Voltar', lightMode: 'Modo Claro', darkMode: 'Modo Escuro' },
  }[currentLocale];

  // Filter sections based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return privacyData.sections;
    const query = searchQuery.toLowerCase().trim();
    return privacyData.sections.filter((section) => {
      const matchTitle = section.title.toLowerCase().includes(query);
      const matchDesc = section.description?.toLowerCase().includes(query);
      const matchParagraphs = section.paragraphs?.some((p) => p.toLowerCase().includes(query));
      const matchBullets = section.bullets?.some((b) => b.toLowerCase().includes(query));
      const matchSubsections = section.subsections?.some(
        (sub) =>
          sub.title.toLowerCase().includes(query) ||
          sub.description?.toLowerCase().includes(query) ||
          sub.items?.some((item) => item.toLowerCase().includes(query))
      );
      return matchTitle || matchDesc || matchParagraphs || matchBullets || matchSubsections;
    });
  }, [privacyData.sections, searchQuery]);

  // Track scroll position to update active section in sticky TOC
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;
      for (const section of privacyData.sections) {
        const element = document.getElementById(section.id);
        if (element) {
          const top = element.offsetTop;
          const height = element.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSectionId(section.id);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [privacyData.sections]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const sectionIcons: Record<string, React.ReactNode> = {
    intro: <Info className="w-5 h-5 text-emerald-500" />,
    'data-collected': <UserCheck className="w-5 h-5 text-indigo-500" />,
    'minors-consent': <Users className="w-5 h-5 text-purple-500" />,
    'how-we-use': <RefreshCw className="w-5 h-5 text-amber-500" />,
    'legal-basis': <Scale className="w-5 h-5 text-sky-500" />,
    'data-sharing': <Eye className="w-5 h-5 text-blue-500" />,
    'international-transfers': <Globe className="w-5 h-5 text-teal-500" />,
    'data-security': <Lock className="w-5 h-5 text-emerald-600" />,
    retention: <FileText className="w-5 h-5 text-rose-500" />,
    'your-rights': <Award className="w-5 h-5 text-indigo-600" />,
    cookies: <Sparkles className="w-5 h-5 text-amber-600" />,
    'governing-law': <Building className="w-5 h-5 text-slate-600" />,
    changes: <ShieldCheck className="w-5 h-5 text-emerald-500" />,
    contact: <Phone className="w-5 h-5 text-indigo-500" />
  };

  if (!mounted) {
    return null;
  }

  return (
    <PublicLandingShell>
      <div
        className={`min-h-screen font-sans transition-colors duration-300 selection:bg-emerald-500 selection:text-white ${
          isDarkMode
            ? 'bg-slate-950 text-slate-100'
            : 'bg-slate-50 text-slate-900'
        }`}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        
        {/* ========================================================================= */}
        {/* HERO SECTION WITH TOP NAVIGATION BAR */}
        {/* ========================================================================= */}
        <section
          className={`relative overflow-hidden border-b py-12 lg:py-16 transition-colors duration-300 ${
            isDarkMode
              ? 'border-slate-800/80 bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/40'
              : 'border-slate-200/90 bg-gradient-to-b from-indigo-50/80 via-white to-slate-50'
          }`}
        >
          {/* Ambient Lighting Orbs */}
          {isDarkMode && (
            <>
              <div className="absolute top-0 right-1/4 -z-10 h-[380px] w-[380px] rounded-full bg-emerald-500/10 blur-[130px] pointer-events-none" />
              <div className="absolute bottom-0 left-1/4 -z-10 h-[380px] w-[380px] rounded-full bg-indigo-500/15 blur-[140px] pointer-events-none" />
            </>
          )}

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            
            {/* TOP NAVIGATION & CONTROLS TOOLBAR */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
              
              {/* Back to Home & History Back Buttons */}
              <div className="flex items-center gap-2.5">
                <Link
                  href="/"
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-extrabold transition shadow-sm ${
                    isDarkMode
                      ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/20'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span>{navLabels.home}</span>
                  {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                </Link>

                <button
                  onClick={handleBack}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold transition ${
                    isDarkMode
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 shadow-sm'
                  }`}
                >
                  <span>{navLabels.back}</span>
                </button>
              </div>

              {/* Theme Switcher Toggle (Day/Night) */}
              <button
                onClick={toggleTheme}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold border transition shadow-sm ${
                  isDarkMode
                    ? 'bg-slate-900 text-amber-400 border-slate-700 hover:bg-slate-800'
                    : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50 shadow-indigo-50'
                }`}
                title={isDarkMode ? navLabels.lightMode : navLabels.darkMode}
              >
                {isDarkMode ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span>{navLabels.lightMode}</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-indigo-600" />
                    <span>{navLabels.darkMode}</span>
                  </>
                )}
              </button>

            </div>

            {/* HERO CONTENT */}
            <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
              
              {/* Badge */}
              <div
                className={`inline-flex items-center gap-2.5 rounded-full border px-4 py-1.5 text-xs sm:text-sm font-semibold backdrop-blur-md shadow-sm mb-6 ${
                  isDarkMode
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-emerald-600/30 bg-emerald-50 text-emerald-700'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{privacyData.badge}</span>
              </div>

              {/* Title */}
              <h1 className={`text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-4 leading-tight ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                {privacyData.title}
              </h1>

              {/* Subtitle */}
              <p className={`text-base sm:text-lg max-w-2xl font-medium mb-6 leading-relaxed ${
                isDarkMode ? 'text-slate-300' : 'text-slate-600'
              }`}>
                {privacyData.companyName}
              </p>

              {/* Reference & Last Updated Badge */}
              <div className="flex flex-wrap items-center justify-center gap-3 mb-8 text-xs sm:text-sm">
                <span className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium ${
                  isDarkMode
                    ? 'border-slate-700 bg-slate-900/80 text-slate-300'
                    : 'border-slate-200 bg-white text-slate-700 shadow-sm'
                }`}>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{privacyData.lastUpdated}</span>
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium ${
                  isDarkMode
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                    : 'border-amber-500/40 bg-amber-50 text-amber-800 shadow-sm'
                }`}>
                  <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>{privacyData.referenceNotice}</span>
                </span>
              </div>

              {/* Search Bar & Action Buttons */}
              <div className="w-full max-w-xl space-y-4">
                <div className="relative">
                  <Search className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-400'
                  } ${isRTL ? 'right-4' : 'left-4'}`} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={privacyData.searchPlaceholder}
                    className={`w-full rounded-2xl border py-3.5 text-sm sm:text-base shadow-lg transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                      isDarkMode
                        ? 'border-slate-700/80 bg-slate-900/90 text-white placeholder-slate-400'
                        : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 shadow-slate-100'
                    } ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'}`}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className={`absolute top-1/2 -translate-y-1/2 text-xs font-bold px-2 py-1 rounded-md ${
                        isDarkMode
                          ? 'text-slate-400 hover:text-white bg-slate-800'
                          : 'text-slate-500 hover:text-slate-900 bg-slate-100'
                      } ${isRTL ? 'left-3' : 'right-3'}`}
                    >
                      مسح
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={handlePrint}
                    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs sm:text-sm font-bold transition shadow-sm ${
                      isDarkMode
                        ? 'border-slate-700 bg-slate-800/90 text-slate-200 hover:bg-slate-700 hover:text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Printer className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>{privacyData.printButton}</span>
                  </button>
                  <Link
                    href="/account-deletion"
                    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs sm:text-sm font-bold transition ${
                      isDarkMode
                        ? 'border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                        : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-rose-500" />
                    <span>حذف الحساب والبيانات</span>
                  </Link>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* CORE PILLARS GRID SECTION */}
        {/* ========================================================================= */}
        <section className={`py-12 border-b transition-colors duration-300 ${
          isDarkMode
            ? 'border-slate-800/60 bg-slate-900/50'
            : 'border-slate-200/80 bg-white'
        }`}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className={`text-xl sm:text-2xl font-bold mb-2 ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>{privacyData.pillarsTitle}</h2>
              <p className={`text-sm sm:text-base max-w-xl mx-auto ${
                isDarkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>{privacyData.pillarsSubtitle}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {privacyData.pillars.map((pillar, idx) => (
                <div
                  key={idx}
                  className={`group relative rounded-2xl border p-6 transition duration-300 hover:-translate-y-1 ${
                    isDarkMode
                      ? 'border-slate-800 bg-slate-900/90 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10'
                      : 'border-slate-200/90 bg-slate-50/70 hover:border-indigo-300 hover:bg-white hover:shadow-xl hover:shadow-indigo-500/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold ${
                      isDarkMode
                        ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                        : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    }`}>
                      {pillar.badge}
                    </span>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold transition ${
                      isDarkMode
                        ? 'bg-slate-800 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white'
                        : 'bg-slate-200 text-slate-600 group-hover:bg-indigo-600 group-hover:text-white'
                    }`}>
                      0{idx + 1}
                    </div>
                  </div>
                  <h3 className={`text-lg font-bold mb-2 transition ${
                    isDarkMode
                      ? 'text-white group-hover:text-indigo-400'
                      : 'text-slate-900 group-hover:text-indigo-600'
                  }`}>{pillar.title}</h3>
                  <p className={`text-xs sm:text-sm leading-relaxed ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-600'
                  }`}>{pillar.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* MAIN DUAL-COLUMN CONTENT LAYOUT (STICKY TOC + SECTIONS) */}
        {/* ========================================================================= */}
        <section className="py-12 lg:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
              
              {/* --------------------------------------------------------------------- */}
              {/* STICKY TOC SIDEBAR (4 COLUMNS ON LG) */}
              {/* --------------------------------------------------------------------- */}
              <aside className="lg:col-span-4">
                <div className={`sticky top-24 rounded-2xl border p-5 shadow-xl backdrop-blur-xl transition ${
                  isDarkMode
                    ? 'border-slate-800 bg-slate-900/90'
                    : 'border-slate-200 bg-white shadow-slate-200/60'
                }`}>
                  <div className={`flex items-center justify-between pb-4 mb-4 border-b ${
                    isDarkMode ? 'border-slate-800' : 'border-slate-100'
                  }`}>
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <h3 className={`font-bold text-base ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}>{privacyData.tocTitle}</h3>
                    </div>
                    <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                      isDarkMode ? 'text-slate-400 bg-slate-800' : 'text-slate-600 bg-slate-100'
                    }`}>
                      14 بند
                    </span>
                  </div>

                  <nav className="space-y-1 max-h-[65vh] overflow-y-auto pr-1 scrollbar-thin">
                    {privacyData.sections.map((section) => {
                      const isActive = activeSectionId === section.id;
                      return (
                        <a
                          key={section.id}
                          href={`#${section.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                            setActiveSectionId(section.id);
                          }}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold transition ${
                            isActive
                              ? isDarkMode
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                                : 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                              : isDarkMode
                                ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <span className={`flex items-center justify-center shrink-0 w-6 h-6 rounded-md text-xs font-bold ${
                            isActive
                              ? 'bg-indigo-700 text-white'
                              : isDarkMode
                                ? 'bg-slate-800 text-slate-400'
                                : 'bg-slate-100 text-slate-500'
                          }`}>
                            {section.number}
                          </span>
                          <span className="truncate">{section.title}</span>
                        </a>
                      );
                    })}
                  </nav>

                  {/* Need Help Card */}
                  <div className={`mt-6 pt-4 border-t rounded-xl p-4 text-center ${
                    isDarkMode
                      ? 'border-slate-800 bg-slate-950/60'
                      : 'border-slate-100 bg-slate-50'
                  }`}>
                    <p className={`text-xs mb-2 font-medium ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>لديك استفسار حول بياناتك؟</p>
                    <a
                      href="#contact"
                      className="inline-flex items-center justify-center gap-1.5 text-xs font-extrabold text-indigo-600 dark:text-emerald-400 hover:underline"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>تواصل مع مسؤول حماية البيانات</span>
                    </a>
                  </div>
                </div>
              </aside>

              {/* --------------------------------------------------------------------- */}
              {/* MAIN CONTENT AREA (8 COLUMNS ON LG) */}
              {/* --------------------------------------------------------------------- */}
              <main className="lg:col-span-8 space-y-8 sm:space-y-10">
                {filteredSections.length === 0 ? (
                  <div className={`rounded-2xl border p-12 text-center ${
                    isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'
                  }`}>
                    <Info className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className={`text-base font-medium mb-2 ${
                      isDarkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}>{privacyData.noResultsText}</p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      عرض جميع بنود السياسة
                    </button>
                  </div>
                ) : (
                  filteredSections.map((section) => (
                    <article
                      key={section.id}
                      id={section.id}
                      className={`scroll-mt-28 rounded-2xl border p-6 sm:p-8 shadow-md transition ${
                        isDarkMode
                          ? 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                          : 'border-slate-200/90 bg-white hover:border-indigo-200 shadow-slate-100'
                      }`}
                    >
                      {/* Section Header */}
                      <div className={`flex items-start justify-between gap-4 border-b pb-5 mb-6 ${
                        isDarkMode ? 'border-slate-800' : 'border-slate-100'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center justify-center w-10 h-10 rounded-xl border shrink-0 ${
                            isDarkMode
                              ? 'bg-slate-800 border-slate-700'
                              : 'bg-indigo-50 border-indigo-100'
                          }`}>
                            {sectionIcons[section.id] || <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">البند {section.number}</span>
                            <h2 className={`text-xl sm:text-2xl font-bold ${
                              isDarkMode ? 'text-white' : 'text-slate-900'
                            }`}>{section.title}</h2>
                          </div>
                        </div>
                      </div>

                      {/* Callout Box if exists */}
                      {section.callout && (
                        <div className={`mb-6 rounded-xl border p-4 sm:p-5 ${
                          section.callout.type === 'important'
                            ? isDarkMode
                              ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                              : 'border-amber-300 bg-amber-50 text-amber-900'
                            : isDarkMode
                              ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-200'
                              : 'border-indigo-200 bg-indigo-50 text-indigo-900'
                        }`}>
                          <div className="flex items-start gap-3">
                            <ShieldAlert className={`w-5 h-5 shrink-0 mt-0.5 ${
                              section.callout.type === 'important'
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-indigo-600 dark:text-indigo-400'
                            }`} />
                            <div className="space-y-1">
                              {section.callout.title && (
                                <h4 className={`font-extrabold text-sm sm:text-base ${
                                  isDarkMode ? 'text-white' : 'text-slate-900'
                                }`}>{section.callout.title}</h4>
                              )}
                              <p className="text-xs sm:text-sm leading-relaxed font-medium">{section.callout.text}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Main Paragraphs */}
                      {section.paragraphs && (
                        <div className={`space-y-4 text-sm sm:text-base leading-relaxed font-normal ${
                          isDarkMode ? 'text-slate-300' : 'text-slate-700'
                        }`}>
                          {section.paragraphs.map((p, i) => (
                            <p key={i}>{p}</p>
                          ))}
                        </div>
                      )}

                      {/* Main Description */}
                      {section.description && (
                        <p className={`text-sm sm:text-base leading-relaxed mb-4 ${
                          isDarkMode ? 'text-slate-300' : 'text-slate-700'
                        }`}>
                          {section.description}
                        </p>
                      )}

                      {/* Subsections */}
                      {section.subsections && (
                        <div className="mt-6 space-y-5">
                          {section.subsections.map((sub, idx) => (
                            <div
                              key={idx}
                              className={`rounded-xl border p-4 sm:p-5 ${
                                isDarkMode
                                  ? 'border-slate-800/80 bg-slate-950/50'
                                  : 'border-slate-200/80 bg-slate-50/80'
                              }`}
                            >
                              <h3 className={`text-base font-bold mb-2 flex items-center gap-2 ${
                                isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
                              }`}>
                                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                {sub.title}
                              </h3>
                              {sub.description && (
                                <p className={`text-xs sm:text-sm leading-relaxed mb-3 ${
                                  isDarkMode ? 'text-slate-300' : 'text-slate-600'
                                }`}>{sub.description}</p>
                              )}
                              {sub.items && (
                                <ul className="grid grid-cols-1 gap-2 text-xs sm:text-sm">
                                  {sub.items.map((item, i) => (
                                    <li key={i} className={`flex items-start gap-2 ${
                                      isDarkMode ? 'text-slate-300' : 'text-slate-700'
                                    }`}>
                                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Bullets List */}
                      {section.bullets && (
                        <ul className="mt-4 space-y-2.5 text-xs sm:text-sm">
                          {section.bullets.map((bullet, i) => (
                            <li
                              key={i}
                              className={`flex items-start gap-3 rounded-xl border p-3 ${
                                isDarkMode
                                  ? 'border-slate-800/50 bg-slate-950/30 text-slate-300'
                                  : 'border-slate-200/70 bg-slate-50/50 text-slate-700'
                              }`}
                            >
                              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                              <span className="leading-relaxed font-medium">{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Special Rendering for Section 14 (Contact Us) */}
                      {section.id === 'contact' && (
                        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Email */}
                          <div className={`rounded-xl border p-4 flex flex-col justify-between ${
                            isDarkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'
                          }`}>
                            <div>
                              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                                <Mail className="w-4 h-4" />
                                <span>{privacyData.contactInfo.emailLabel}</span>
                              </div>
                              <p className={`text-sm font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {privacyData.contactInfo.emailValue}
                              </p>
                            </div>
                            <button
                              onClick={() => handleCopy(privacyData.contactInfo.emailValue, 'email')}
                              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                            >
                              {copiedKey === 'email' ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className="text-emerald-500 font-bold">تم النسخ!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>نسخ البريد</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Address */}
                          <div className={`rounded-xl border p-4 flex flex-col justify-between ${
                            isDarkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'
                          }`}>
                            <div>
                              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                                <MapPin className="w-4 h-4" />
                                <span>{privacyData.contactInfo.addressLabel}</span>
                              </div>
                              <p className={`text-xs font-bold leading-snug ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {privacyData.contactInfo.addressValue}
                              </p>
                            </div>
                            <button
                              onClick={() => handleCopy(privacyData.contactInfo.addressValue, 'address')}
                              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                            >
                              {copiedKey === 'address' ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className="text-emerald-500 font-bold">تم النسخ!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>نسخ العنوان</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Qatar Phone */}
                          <div className={`rounded-xl border p-4 flex flex-col justify-between ${
                            isDarkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'
                          }`}>
                            <div>
                              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                                <Phone className="w-4 h-4" />
                                <span>{privacyData.contactInfo.phoneQatarLabel}</span>
                              </div>
                              <p className={`text-sm font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`} dir="ltr">
                                {privacyData.contactInfo.phoneQatarValue}
                              </p>
                            </div>
                            <a
                              href={`tel:${privacyData.contactInfo.phoneQatarValue.replace(/\s+/g, '')}`}
                              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>اتصال مباشر</span>
                            </a>
                          </div>

                          {/* Egypt Phone */}
                          <div className={`rounded-xl border p-4 flex flex-col justify-between ${
                            isDarkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'
                          }`}>
                            <div>
                              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                                <Phone className="w-4 h-4" />
                                <span>{privacyData.contactInfo.phoneEgyptLabel}</span>
                              </div>
                              <p className={`text-sm font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`} dir="ltr">
                                {privacyData.contactInfo.phoneEgyptValue}
                              </p>
                            </div>
                            <a
                              href={`tel:${privacyData.contactInfo.phoneEgyptValue.replace(/\s+/g, '')}`}
                              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>اتصال مباشر</span>
                            </a>
                          </div>
                        </div>
                      )}

                    </article>
                  ))
                )}

                {/* Footer Copyright Notice in Main */}
                <div className={`rounded-2xl border p-6 text-center ${
                  isDarkMode
                    ? 'border-slate-800/80 bg-slate-900/40 text-slate-400'
                    : 'border-slate-200/80 bg-white text-slate-600 shadow-sm'
                }`}>
                  <p className="text-xs sm:text-sm font-medium">
                    {privacyData.copyright}
                  </p>
                </div>
              </main>

            </div>
          </div>
        </section>

      </div>
    </PublicLandingShell>
  );
}
