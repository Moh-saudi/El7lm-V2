'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Sparkles, 
  BrainCircuit, 
  Trophy, 
  Users, 
  ShieldCheck, 
  ArrowLeft, 
  ArrowRight, 
  Zap, 
  Activity, 
  Target, 
  CheckCircle2, 
  Bot, 
  BarChart3,
  Dna,
  Sun,
  Moon,
  Menu,
  X,
  Phone,
  Mail,
  Send,
  Play,
  Download,
  Flame,
  Award
} from 'lucide-react';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import { useTranslation } from '@/lib/i18n';

// ─── Direct Contacts ────────────────────────────────────────────────────────
const CONTACT_NUMBERS = [
  { country: 'مصر', code: 'EG', flag: '🇪🇬', phone: '+20 10 1779 9580', tel: '+201017799580', whatsapp: '201017799580' },
  { country: 'قطر', code: 'QA', flag: '🇶🇦', phone: '+974 72 053 188', tel: '+97472053188', whatsapp: '97472053188' },
];

// ─── Social Channels ────────────────────────────────────────────────────────
const SOCIAL_LINKS = [
  {
    name: 'Facebook',
    href: 'https://www.facebook.com/profile.php?id=61577797509887',
    icon: (
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    name: 'Instagram',
    href: 'https://www.instagram.com/hagzzel7lm/',
    icon: (
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
  {
    name: 'X (Twitter)',
    href: 'https://twitter.com/el7lm',
    icon: (
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    name: 'YouTube',
    href: 'https://www.youtube.com/@el7lm',
    icon: (
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
  {
    name: 'LinkedIn',
    href: 'https://www.linkedin.com/company/hagzz',
    icon: (
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45c-.9 0-1.63.73-1.63 1.63s.73 1.63 1.63 1.63 1.63-.73 1.63-1.63c0-.9-.73-1.63-1.63-1.63z"/>
      </svg>
    ),
  }
];

// ─── Nisr AI Quick Demo Prompts ─────────────────────────────────────────────
const QUICK_PROMPTS = [
  {
    id: 1,
    title: 'تحليل المهارة والتسديد',
    playerMsg: 'حلل أداء تسديداتي بالقدم اليسرى وسرعة دوران الكرة',
    nisrReply: 'دقة التسديد 86% وقوة الارتطام 92 كم/ساعة. لديك زاوية تفوق ممتازة في الثلث الأخير. يُوصى بتمارين الاتزان الحركي بالقدم الثابتة.',
    metric: 'دقة 86% • ممتاز'
  },
  {
    id: 2,
    title: 'خطة المركز والتطوير',
    playerMsg: 'ما هو برنامجي لرفع سرعة التحول كجناح مهاجم؟',
    nisrReply: 'تم إعداد خطة 4 أسابيع للرشاقة والانفجار العضلي في أول 10 أمتار، مع تمارين تمركز في المساحات النصفية لصناعة الفرص.',
    metric: 'تسارع 1.62 ث • جاهز'
  },
  {
    id: 3,
    title: 'توصية الكشافين',
    playerMsg: 'هل مقاطعي تؤهلني لتجارب أداء أندية الدرجة الأولى؟',
    nisrReply: 'معدل النجاح الفردي 89%. ملفك متوافق مع معايير كشافة أندية الفئة (أ). تم تمييز بصمتك الرياضية الرقمية لظهور مميز.',
    metric: 'مؤشر الكشافين 9.2/10'
  }
];

export default function HomePage() {
  const { locale } = useTranslation();
  const isRtl = locale === 'ar';
  
  // Default to daylight white mode as requested
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedPromptIndex, setSelectedPromptIndex] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activePrompt = QUICK_PROMPTS[selectedPromptIndex];

  return (
    <div 
      className={`min-h-screen transition-colors duration-300 font-sans ${
        isDarkMode 
          ? 'bg-[#0B1120] text-slate-100' 
          : 'bg-[#F9FBF9] text-slate-800'
      } ${isRtl ? 'rtl' : 'ltr'}`} 
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* ─── 1. TOP ANNOUNCEMENT BAR ─────────────────────────────────────── */}
      <div className={`${isDarkMode ? 'bg-emerald-950/70 border-b border-emerald-800/40 text-emerald-300' : 'bg-emerald-50 border-b border-emerald-100 text-emerald-800'} py-2 px-4 text-xs font-medium`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>
              {isRtl 
                ? 'تطبيق الحلم متاح الآن على Google Play — مدعوم بمساعد نسر الذكي (Nisr AI)' 
                : 'El7lm App is now Live on Google Play — Powered by Nisr AI'}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-xs">
            <a 
              href="https://play.google.com/store/apps/details?id=com.el7lm.mobile" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:underline font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isRtl ? 'تحميل التطبيق' : 'Get Mobile App'}</span>
            </a>
            <span className="text-emerald-400/50">|</span>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5" />
              <a href="tel:+201017799580" dir="ltr" className="hover:underline">+20 10 1779 9580</a>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. MAIN HEADER & NAVIGATION ──────────────────────────────────── */}
      <header className={`sticky top-0 z-50 backdrop-blur-md transition-colors border-b ${
        isDarkMode 
          ? 'bg-[#0B1120]/90 border-slate-800 text-white' 
          : 'bg-white/95 border-slate-100 text-slate-800 shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-[2px] shadow-md group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center overflow-hidden p-1">
                <Image 
                  src="/el7lm-logo.png" 
                  alt="El7lm Logo" 
                  width={34} 
                  height={34} 
                  priority
                  className="object-contain"
                />
              </div>
            </div>
            <div>
              <span className={`text-xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {isRtl ? 'الحلـم' : 'El7lm'}
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
                AI Sports Platform
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold">
            <Link href="/" className="text-emerald-600 font-bold transition-colors">
              {isRtl ? 'الرئيسية' : 'Home'}
            </Link>
            <Link 
              href="/opportunities" 
              className={`transition-colors ${isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-emerald-600'}`}
            >
              {isRtl ? 'الفرص والتجارب' : 'Opportunities'}
            </Link>
            <Link 
              href="/services/clubs" 
              className={`transition-colors ${isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-emerald-600'}`}
            >
              {isRtl ? 'الأندية' : 'Clubs'}
            </Link>
            <Link 
              href="/services/academies" 
              className={`transition-colors ${isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-emerald-600'}`}
            >
              {isRtl ? 'الأكاديميات' : 'Academies'}
            </Link>
            <Link 
              href="/services/trainers" 
              className={`transition-colors ${isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-emerald-600'}`}
            >
              {isRtl ? 'المدربون' : 'Trainers'}
            </Link>
            <Link 
              href="/services/agents" 
              className={`transition-colors ${isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-emerald-600'}`}
            >
              {isRtl ? 'الوكلاء' : 'Agents'}
            </Link>
            <Link 
              href="/contact" 
              className={`transition-colors ${isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-emerald-600'}`}
            >
              {isRtl ? 'تواصل معنا' : 'Contact'}
            </Link>
          </nav>

          {/* Actions: Theme Toggle, Language, Auth */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle (Daylight / Dark) */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2.5 rounded-xl border transition-all ${
                isDarkMode 
                  ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' 
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
              title={isDarkMode ? 'تبديل للوضع النهاري الأبيض' : 'تبديل للوضع الليلي'}
              aria-label="Toggle Theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Auth Buttons */}
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/auth/login"
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                  isDarkMode 
                    ? 'text-slate-300 hover:text-white' 
                    : 'text-slate-700 hover:text-emerald-600'
                }`}
              >
                {isRtl ? 'دخول' : 'Sign In'}
              </Link>

              <Link
                href="/auth/register"
                className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all hover:scale-105"
              >
                {isRtl ? 'انضم الآن' : 'Get Started'}
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
              aria-label="Open Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className={`lg:hidden px-4 pt-3 pb-6 border-t ${
            isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-100'
          }`}>
            <div className="flex flex-col gap-3 font-semibold text-sm">
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className="py-2 text-emerald-600">
                {isRtl ? 'الرئيسية' : 'Home'}
              </Link>
              <Link href="/opportunities" onClick={() => setMobileMenuOpen(false)} className="py-2">
                {isRtl ? 'الفرص والتجارب' : 'Opportunities'}
              </Link>
              <Link href="/services/clubs" onClick={() => setMobileMenuOpen(false)} className="py-2">
                {isRtl ? 'الأندية' : 'Clubs'}
              </Link>
              <Link href="/services/academies" onClick={() => setMobileMenuOpen(false)} className="py-2">
                {isRtl ? 'الأكاديميات' : 'Academies'}
              </Link>
              <Link href="/services/trainers" onClick={() => setMobileMenuOpen(false)} className="py-2">
                {isRtl ? 'المدربون' : 'Trainers'}
              </Link>
              <Link href="/services/agents" onClick={() => setMobileMenuOpen(false)} className="py-2">
                {isRtl ? 'الوكلاء' : 'Agents'}
              </Link>
              <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="py-2">
                {isRtl ? 'تواصل معنا' : 'Contact'}
              </Link>
              <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-xl border border-slate-300 font-bold"
                >
                  {isRtl ? 'تسجيل الدخول' : 'Sign In'}
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-xl bg-emerald-600 text-white font-bold"
                >
                  {isRtl ? 'إنشاء حساب جديد' : 'Sign Up Free'}
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ─── 3. HERO & NISR AI SHOWCASE (CONCISE & VISUAL) ───────────────── */}
      <section className="relative overflow-hidden pt-10 pb-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Col: Concise Value Proposition */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-start">
              
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isRtl ? 'الجيل الجديد لاكتشاف المواهب الرياضية' : 'Next-Gen Sports Talent Discovery'}</span>
              </div>

              {/* Main Headline */}
              <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15] ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                {isRtl ? (
                  <>
                    احترف كـرة القدم <br />
                    بذكاء <span className="text-emerald-600">نسـر الرياضي</span>
                  </>
                ) : (
                  <>
                    Unlock Pro Football <br />
                    Powered by <span className="text-emerald-600">Nisr AI</span>
                  </>
                )}
              </h1>

              {/* Short Tagline (No long verbose text) */}
              <p className={`text-base sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed ${
                isDarkMode ? 'text-slate-300' : 'text-slate-600'
              }`}>
                {isRtl 
                  ? 'منصتك المباشرة لتحليل المهارات بالذكاء الاصطناعي، توثيق البصمة الرياضية، والتواصل الرسمي مع الأندية والكشافين دون تعقيد.'
                  : 'Your direct pathway to AI-powered skill analysis, verified athletic profiling, and direct access to clubs and certified scouts.'}
              </p>

              {/* Primary Call to Action */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3">
                <Link
                  href="/auth/register"
                  className="px-7 py-3.5 rounded-xl font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all hover:scale-105 inline-flex items-center gap-2"
                >
                  <span>{isRtl ? 'ابدأ تجربة نسر الآن' : 'Try Nisr AI Free'}</span>
                  {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </Link>

                <a
                  href="https://play.google.com/store/apps/details?id=com.el7lm.mobile"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-5 py-3.5 rounded-xl font-bold border transition-all inline-flex items-center gap-2 ${
                    isDarkMode 
                      ? 'border-slate-700 hover:bg-slate-800 text-slate-200' 
                      : 'border-slate-200 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>{isRtl ? 'تحميل تطبيق الهاتف' : 'Download Mobile App'}</span>
                </a>
              </div>

              {/* Trust stats row */}
              <div className={`pt-6 border-t grid grid-cols-3 gap-4 max-w-md mx-auto lg:mx-0 ${
                isDarkMode ? 'border-slate-800 text-slate-300' : 'border-slate-100 text-slate-700'
              }`}>
                <div>
                  <div className="text-2xl font-black text-emerald-600">+1,000</div>
                  <div className="text-xs text-slate-500">{isRtl ? 'لاعب موثق' : 'Verified Players'}</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-emerald-600">+50</div>
                  <div className="text-xs text-slate-500">{isRtl ? 'نادي وأكاديمية' : 'Clubs & Academies'}</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-emerald-600">100%</div>
                  <div className="text-xs text-slate-500">{isRtl ? 'تحليل ذكي فوري' : 'Instant AI Analysis'}</div>
                </div>
              </div>

            </div>

            {/* Right Col: Mobile App Frame (Nisr AI Interface - Clean & Direct) */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="w-full max-w-sm sm:max-w-md">
                
                {/* Interactive Prompt Selector Chips */}
                <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
                  {QUICK_PROMPTS.map((p, idx) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPromptIndex(idx)}
                      className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap font-bold transition-all ${
                        selectedPromptIndex === idx
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : isDarkMode
                            ? 'bg-slate-800 text-slate-400 hover:text-white'
                            : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-300'
                      }`}
                    >
                      {p.title}
                    </button>
                  ))}
                </div>

                {/* Simulated Mobile Device Frame */}
                <div className={`rounded-[36px] p-3 shadow-2xl border ${
                  isDarkMode 
                    ? 'bg-slate-900 border-slate-700 shadow-emerald-950/30' 
                    : 'bg-white border-slate-200 shadow-xl'
                }`}>
                  {/* Phone Notch & Status Bar */}
                  <div className={`rounded-[28px] overflow-hidden border ${
                    isDarkMode ? 'bg-[#090F1D] border-slate-800' : 'bg-[#F9F8F5] border-slate-100'
                  }`}>
                    
                    {/* Header inside Phone */}
                    <div className="bg-emerald-700 text-white px-5 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-white/20 p-1 flex items-center justify-center">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-bold text-sm leading-tight flex items-center gap-1.5">
                            <span>نسـر الذكي</span>
                            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
                          </div>
                          <div className="text-[11px] text-emerald-100">المساعد الفني الذكي لمنصة الحلم</div>
                        </div>
                      </div>
                      <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">LIVE AI</span>
                    </div>

                    {/* Chat Messages Body inside Phone */}
                    <div className="p-4 space-y-4 min-h-[310px] flex flex-col justify-end">
                      
                      {/* Player Bubble */}
                      <div className="flex items-start gap-2 justify-end">
                        <div className="bg-emerald-600 text-white text-xs sm:text-sm p-3.5 rounded-2xl rounded-tr-none max-w-[85%] shadow-sm leading-relaxed">
                          {activePrompt.playerMsg}
                        </div>
                      </div>

                      {/* Nisr AI Response Bubble */}
                      <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 flex-shrink-0 mt-1">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div className={`p-3.5 rounded-2xl rounded-tl-none max-w-[90%] text-xs sm:text-sm leading-relaxed border shadow-sm ${
                          isDarkMode 
                            ? 'bg-slate-800 text-slate-100 border-slate-700' 
                            : 'bg-white text-slate-800 border-slate-200'
                        }`}>
                          <div className="font-bold text-emerald-600 text-xs mb-1.5 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>تحليل نسر الفوري:</span>
                          </div>
                          <p>{activePrompt.nisrReply}</p>
                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-emerald-700">
                            <span>{activePrompt.metric}</span>
                            <span className="text-slate-400 font-normal">تم القياس برؤية الحاسوب</span>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Chat Input Bar inside Phone */}
                    <div className={`p-3 border-t flex items-center gap-2 ${
                      isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
                    }`}>
                      <div className={`flex-1 text-xs px-3.5 py-2 rounded-xl flex items-center justify-between text-slate-400 ${
                        isDarkMode ? 'bg-slate-800' : 'bg-slate-100'
                      }`}>
                        <span>اسأل نسر عن مركزك أو ارفع مقطعك...</span>
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                        <Send className="w-4 h-4" />
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── 4. THREE PILLARS (CLEAN & PRACTICAL) ─────────────────────────── */}
      <section className={`py-16 border-t ${
        isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className={`text-2xl sm:text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {isRtl ? 'منظومة شاملة للنجاح الكروي' : 'Complete Athletic Ecosystem'}
            </h2>
            <p className="text-slate-500 text-sm mt-2">
              {isRtl ? 'كل ما يحتاجه اللاعب والنادي في مكان واحد مدعوماً بالتقنية الحديثة' : 'Everything players and clubs need in one certified platform'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* 1. Scouting */}
            <div className={`p-7 rounded-3xl border transition-all hover:-translate-y-1 shadow-sm ${
              isDarkMode 
                ? 'bg-slate-800/80 border-slate-700' 
                : 'bg-[#FAFDF9] border-emerald-100/80 hover:shadow-md'
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-5 font-bold">
                <Users className="w-6 h-6" />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {isRtl ? 'شبكة الأندية والكشافين' : 'Clubs & Scouting Network'}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                {isRtl 
                  ? 'عرض مباشر للمواهب أمام مسؤولي التعاقدات والأكاديميات المعتمدة دون أي وسطاء مجهولين.' 
                  : 'Direct access to official club recruiters and academies without unverified intermediaries.'}
              </p>
              <Link href="/services/clubs" className="text-xs font-bold text-emerald-600 hover:underline inline-flex items-center gap-1">
                <span>{isRtl ? 'استعراض خدمات الأندية' : 'View Clubs Services'}</span>
                {isRtl ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              </Link>
            </div>

            {/* 2. Analysis */}
            <div className={`p-7 rounded-3xl border transition-all hover:-translate-y-1 shadow-sm ${
              isDarkMode 
                ? 'bg-slate-800/80 border-slate-700' 
                : 'bg-[#FAFDF9] border-emerald-100/80 hover:shadow-md'
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mb-5 font-bold">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {isRtl ? 'التحليل الفني الذكي' : 'Smart Performance Profiling'}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                {isRtl 
                  ? 'تحويل مقاطع المهارات والمباريات إلى رادارات أداء رقمية وبصمة كروية موثقة تعكس قدراتك الحقيقية.' 
                  : 'Transforming skill reels into verified football metrics and performance radars trusted by scouts.'}
              </p>
              <Link href="/auth/register" className="text-xs font-bold text-emerald-600 hover:underline inline-flex items-center gap-1">
                <span>{isRtl ? 'إنشاء بطاقة الأداء' : 'Create Player Card'}</span>
                {isRtl ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              </Link>
            </div>

            {/* 3. Opportunities */}
            <div className={`p-7 rounded-3xl border transition-all hover:-translate-y-1 shadow-sm ${
              isDarkMode 
                ? 'bg-slate-800/80 border-slate-700' 
                : 'bg-[#FAFDF9] border-emerald-100/80 hover:shadow-md'
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-5 font-bold">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {isRtl ? 'الفرص والمعسكرات الحصرية' : 'Trials & Elite Tournaments'}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                {isRtl 
                  ? 'التقديم المباشر على فترات المعايشة وتجارب الأداء والبطولات الرسمية المقامة في مصر والخليج.' 
                  : 'Direct application for trial opportunities, scouting tournaments, and official camps in MENA.'}
              </p>
              <Link href="/opportunities" className="text-xs font-bold text-emerald-600 hover:underline inline-flex items-center gap-1">
                <span>{isRtl ? 'تصفح أحدث الفرص' : 'Explore Opportunities'}</span>
                {isRtl ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              </Link>
            </div>

          </div>

        </div>
      </section>

      {/* ─── 5. FULL FOOTER (ALL LINKS, SOCIALS & PHONES) ───────────────── */}
      <footer className={`border-t transition-colors ${
        isDarkMode 
          ? 'bg-[#070C18] border-slate-800 text-slate-300' 
          : 'bg-[#F2F5F2] border-slate-200 text-slate-700'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
            
            {/* Col 1: Brand & App Download */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white p-1 border border-slate-200 flex items-center justify-center shadow-sm">
                  <Image src="/el7lm-logo.png" alt="El7lm Logo" width={32} height={32} className="object-contain" />
                </div>
                <span className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {isRtl ? 'منصة الحلـم الرياضية' : 'El7lm Sports Platform'}
                </span>
              </div>
              <p className="text-sm leading-relaxed max-w-sm text-slate-500">
                {isRtl 
                  ? 'المنصة الرقمية المتكاملة لإدارة وتطوير مواهب كرة القدم، ربط اللاعبين بالأندية المعتمدة، وتقديم استشارات ذكية مدعومة بنموذج Nisr AI.'
                  : 'Comprehensive football talent platform empowering players with verified digital profiling, scouting connections, and AI insights.'}
              </p>

              {/* Google Play Button */}
              <div className="pt-2">
                <a
                  href="https://play.google.com/store/apps/details?id=com.el7lm.mobile"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
                >
                  <Download className="w-5 h-5 text-emerald-400" />
                  <div className="text-start">
                    <div className="text-[10px] uppercase tracking-wider text-slate-300 leading-tight">GET IT ON</div>
                    <div className="text-xs font-bold leading-tight">Google Play</div>
                  </div>
                </a>
              </div>

              {/* Social Channels */}
              <div className="pt-3">
                <div className="text-xs font-bold mb-2.5 text-slate-400 uppercase tracking-wider">
                  {isRtl ? 'تابعنا على المنصات' : 'Follow Us'}
                </div>
                <div className="flex items-center gap-3">
                  {SOCIAL_LINKS.map((s) => (
                    <a
                      key={s.name}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                        isDarkMode 
                          ? 'bg-slate-800 text-slate-300 hover:bg-emerald-600 hover:text-white' 
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 shadow-sm'
                      }`}
                      aria-label={s.name}
                      title={s.name}
                    >
                      {s.icon}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Col 2: Services & Opportunities */}
            <div className="space-y-3">
              <h4 className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {isRtl ? 'الخدمات والفرص' : 'Services & Trials'}
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/opportunities" className="hover:text-emerald-600 transition-colors">
                    {isRtl ? 'الفرص والمعايشات' : 'Trials & Opportunities'}
                  </Link>
                </li>
                <li>
                  <Link href="/services/clubs" className="hover:text-emerald-600 transition-colors">
                    {isRtl ? 'خدمات الأندية' : 'Club Services'}
                  </Link>
                </li>
                <li>
                  <Link href="/services/academies" className="hover:text-emerald-600 transition-colors">
                    {isRtl ? 'خدمات الأكاديميات' : 'Academies Services'}
                  </Link>
                </li>
                <li>
                  <Link href="/services/trainers" className="hover:text-emerald-600 transition-colors">
                    {isRtl ? 'المدربون والكوادر' : 'Trainers & Coaches'}
                  </Link>
                </li>
                <li>
                  <Link href="/services/agents" className="hover:text-emerald-600 transition-colors">
                    {isRtl ? 'وكلاء اللاعبين' : 'Player Agents'}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Company & Information */}
            <div className="space-y-3">
              <h4 className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {isRtl ? 'المنصة والدعم' : 'Platform & Help'}
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/about" className="hover:text-emerald-600 transition-colors">
                    {isRtl ? 'عن منصة الحلم' : 'About El7lm'}
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-emerald-600 transition-colors">
                    {isRtl ? 'تواصل معنا' : 'Contact Us'}
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="hover:text-emerald-600 transition-colors">
                    {isRtl ? 'الأسئلة الشائعة' : 'FAQ'}
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-emerald-600 transition-colors">
                    {isRtl ? 'سياسة الخصوصية' : 'Privacy Policy'}
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-emerald-600 transition-colors">
                    {isRtl ? 'الشروط والأحكام' : 'Terms & Conditions'}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Direct Phone Contacts */}
            <div className="space-y-3">
              <h4 className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {isRtl ? 'أرقام التواصل المباشر' : 'Direct Phone Lines'}
              </h4>
              <div className="space-y-3">
                {CONTACT_NUMBERS.map((c) => (
                  <div 
                    key={c.code} 
                    className={`p-3 rounded-xl border text-xs leading-relaxed ${
                      isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      <span>{c.flag}</span>
                      <span>{c.country} (متاح 24/7)</span>
                    </div>
                    <a 
                      href={`tel:${c.tel}`} 
                      dir="ltr" 
                      className="block font-mono font-bold text-emerald-600 hover:underline text-sm"
                    >
                      {c.phone}
                    </a>
                    <a 
                      href={`https://wa.me/${c.whatsapp}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-[11px] text-slate-500 hover:text-emerald-600 inline-block mt-0.5"
                    >
                      {isRtl ? 'محادثة واتساب سريعة ←' : 'WhatsApp Chat ←'}
                    </a>
                  </div>
                ))}

                <div className="text-xs pt-1 flex items-center gap-2 text-slate-500">
                  <Mail className="w-3.5 h-3.5" />
                  <a href="mailto:contact@el7lm.com" className="hover:underline">contact@el7lm.com</a>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Bar: Copyright */}
          <div className={`mt-12 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${
            isDarkMode ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-500'
          }`}>
            <p>
              &copy; {new Date().getFullYear()} {isRtl ? 'جميع الحقوق محفوظة لمنصة الحلم الرياضية.' : 'All rights reserved to El7lm Platform.'}
            </p>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{isRtl ? 'معتمدة ومرخصة لخدمة قطاع الرياضة والشباب' : 'Licensed Sports Platform'}</span>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
