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
  Award, 
  Target, 
  Flame, 
  CheckCircle2, 
  Cpu, 
  Bot, 
  BarChart3,
  Dna,
  Share2,
  ChevronRight
} from 'lucide-react';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import { useTranslation } from '@/lib/i18n';

interface AiDemoTab {
  id: 'scouting' | 'training' | 'nutrition';
  label: string;
  icon: React.ReactNode;
  prompt: string;
  responseTitle: string;
  responseMetrics: { label: string; value: string; color: string }[];
  insights: string[];
}

const AI_TABS: AiDemoTab[] = [
  {
    id: 'scouting',
    label: 'التحليل التكتيكي والكشافة',
    icon: <BrainCircuit className="w-4 h-4" />,
    prompt: 'تحليل أسلوب اللعب في الثلث الهجومي تحت الضغط العالي',
    responseTitle: 'تقرير نسر الذكي — تقييم الجاهزية والمركز',
    responseMetrics: [
      { label: 'الذكاء التكتيكي', value: '94%', color: 'from-emerald-400 to-teal-500' },
      { label: 'دقة التمرير الحاسم', value: '88%', color: 'from-blue-400 to-cyan-500' },
      { label: 'سرعة التحول', value: '91%', color: 'from-amber-400 to-orange-500' },
      { label: 'مؤشر الكشافين', value: '9.3 / 10', color: 'from-purple-400 to-pink-500' },
    ],
    insights: [
      'تمريرات كسر الخطوط تحت الضغط أعلى بنسبة 27% من متوسط أقران الفئة السنية.',
      'تمركز مثالي في المساحات النصفية (Half-spaces) وصناعة 4 فرص محققة في كل 90 دقيقة.',
      'توصية الكشافة: مؤهل للانضمام لمعسكرات الأندية الممتازة مع التركيز على اتخاذ القرار السريع.'
    ]
  },
  {
    id: 'training',
    label: 'خطة التدريب وتطوير المركز',
    icon: <Zap className="w-4 h-4" />,
    prompt: 'تصميم برنامج رفع الانفجار البدني وسرعة الارتداد للجناح الهجومي',
    responseTitle: 'برنامج نسر التدريبي المخصص للأسبوع 1-4',
    responseMetrics: [
      { label: 'القوة الانفجارية', value: '92%', color: 'from-amber-400 to-orange-500' },
      { label: 'التسارع في 10م', value: '1.64s', color: 'from-emerald-400 to-teal-500' },
      { label: 'مقاومة الإجهاد', value: '86%', color: 'from-blue-400 to-cyan-500' },
      { label: 'تجنب الإصابات', value: 'منخفض جداً', color: 'from-teal-400 to-emerald-500' },
    ],
    insights: [
      '3 حصص Plyometrics أسبوعية مدمجة مع تمارين الرشاقة بالكرة وتغيير الاتجاه الحاد.',
      'تحسين التوازن الحركي أثناء التسديد بقدم الارتكاز لرفع دقة إنهاء الهجمات.',
      'متابعة دورية عبر استشعار الحمل التدريبي لتفادي الإجهاد العضلي قبل المباريات.'
    ]
  },
  {
    id: 'nutrition',
    label: 'التغذية والاستشفاء الذكي',
    icon: <Activity className="w-4 h-4" />,
    prompt: 'جدول تغذية استشفائي لزيادة الكتلة العضلية مع الحفاظ على الرشاقة',
    responseTitle: 'نظام التمثيل الغذائي والاستشفاء الحيوي',
    responseMetrics: [
      { label: 'معدل حرق الطاقة', value: '2,850 kcal', color: 'from-rose-400 to-red-500' },
      { label: 'بروتين نقي يومي', value: '145g', color: 'from-purple-400 to-indigo-500' },
      { label: 'زمن الاستشفاء', value: '18 ساعة', color: 'from-emerald-400 to-teal-500' },
      { label: 'مستوى الترطيب', value: 'مثالي', color: 'from-sky-400 to-blue-500' },
    ],
    insights: [
      'توزيع الكربوهيدرات المعقدة قبل 3 ساعات من التمرين لتعزيز مخازن الجليكوجين.',
      'مشروب الاستشفاء الكهرلي فور انتهاء الحصة لخفض مؤشرات حمض اللاكتيك.',
      'بروتوكول نوم عميق 8.5 ساعات مثبت بمواعيد إفراز هرمون النمو الطبيعي.'
    ]
  }
];

export default function HomePage() {
  const { locale } = useTranslation();
  const isRtl = locale === 'ar';
  const [activeTabId, setActiveTabId] = useState<'scouting' | 'training' | 'nutrition'>('scouting');

  const activeTab = AI_TABS.find(t => t.id === activeTabId) || AI_TABS[0];

  return (
    <div className={`min-h-screen bg-[#070b14] text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-300 font-sans ${isRtl ? 'rtl' : 'ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[550px] h-[550px] bg-emerald-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-[25%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[160px]" />
        <div className="absolute bottom-[-10%] right-[20%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px]" />
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#070b14]/80 border-b border-white/5 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-[1.5px] shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-all duration-300">
              <div className="w-full h-full bg-[#090f1d] rounded-[10px] flex items-center justify-center overflow-hidden">
                <Image 
                  src="/el7lm-logo.png" 
                  alt="El7lm Logo" 
                  width={34} 
                  height={34} 
                  className="object-contain transform group-hover:scale-110 transition-transform duration-300"
                  priority
                />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                {isRtl ? 'مَنَصّة الحِلْم' : 'EL7LM PLATFORM'}
              </span>
              <span className="text-[10px] font-semibold text-emerald-400 tracking-wider uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {isRtl ? 'مدعوم بنموذج نسر الذكي' : 'Powered by Nisr AI'}
              </span>
            </div>
          </Link>

          {/* Nav Quick Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#nisr-ai" className="hover:text-emerald-400 transition-colors flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              {isRtl ? 'نموذج نسر الرياضي' : 'Nisr AI Engine'}
            </a>
            <a href="#ecosystem" className="hover:text-emerald-400 transition-colors flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-teal-400" />
              {isRtl ? 'منظومة كرة القدم' : 'Ecosystem'}
            </a>
            <Link href="/tournaments" className="hover:text-emerald-400 transition-colors">
              {isRtl ? 'البطولات' : 'Tournaments'}
            </Link>
          </nav>

          {/* Header Controls & Auth */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher compact variant="dark" />
            <Link 
              href="/auth/login"
              className="relative inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              {isRtl ? 'تسجيل الدخول' : 'Sign In'}
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="relative z-10">
        
        {/* ======================================================== */}
        {/* SECTION 1: HERO & NISR AI SHOWCASE (قلب المنصة الذكي) */}
        {/* ======================================================== */}
        <section id="nisr-ai" className="relative pt-12 pb-24 md:pt-20 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs sm:text-sm font-medium backdrop-blur-md shadow-sm">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-spin-slow" />
              <span>{isRtl ? 'ثورة الذكاء الاصطناعي الرياضي وصلت — نموذج نسر الرياضي (Nisr AI)' : 'Next-Gen Sports Intelligence — Nisr AI Core'}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
          </div>

          {/* Hero Headlines */}
          <div className="text-center max-w-4xl mx-auto space-y-6">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.15]">
              <span className="bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                {isRtl ? 'حيث تلتقي الموهبة الكروية' : 'Where Football Talent'}
              </span>
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                {isRtl ? 'بقمة الذكاء الاصطناعي' : 'Meets AI Excellence'}
              </span>
            </h1>

            <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
              {isRtl 
                ? 'المنصة الرياضية الذكية الأولى لاكتشاف وتحليل وتطوير مواهب كرة القدم. حلل مهاراتك، ابنِ برنامجك البدني والغذائي المخصص، وافتح طريقك المباشر نحو الأندية والكشافين المعتمدين.'
                : 'The premier AI-powered football platform. Analyze player performance, generate tailored training and nutrition regimes with Nisr AI, and connect directly to top scouts and clubs worldwide.'}
            </p>

            {/* CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl text-base font-bold text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <span>{isRtl ? 'ابدأ رحلتك الرياضية الآن' : 'Start Your Athletic Journey'}</span>
                {isRtl ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
              </Link>
              <a
                href="#interactive-demo"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl text-base font-semibold text-slate-200 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 transition-all backdrop-blur-md"
              >
                <Bot className="w-5 h-5 text-emerald-400" />
                <span>{isRtl ? 'تجربة محاكي نسر الذكي' : 'Explore Nisr AI Engine'}</span>
              </a>
            </div>
          </div>

          {/* INTERACTIVE NISR AI SHOWCASE CARD */}
          <div id="interactive-demo" className="mt-16 sm:mt-24 max-w-5xl mx-auto">
            <div className="relative rounded-3xl bg-[#0c1322]/90 border border-slate-800 p-4 sm:p-8 backdrop-blur-2xl shadow-2xl shadow-emerald-950/20 overflow-hidden">
              {/* Card Ambient Decorator */}
              <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Showcase Top Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Cpu className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-white">{isRtl ? 'محرك نسر الرياضي (Nisr Engine v2.4)' : 'Nisr Sports Engine v2.4'}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {isRtl ? 'مباشر وتفاعلي' : 'Live & Active'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {isRtl ? 'معالجة فورية للبيانات الحركية والقياسات التكتيكية لكرة القدم' : 'Real-time kinematic & tactical football intelligence processing'}
                    </p>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800 overflow-x-auto">
                  {AI_TABS.map((tab) => {
                    const isActive = tab.id === activeTabId;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTabId(tab.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                          isActive 
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20' 
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                      >
                        {tab.icon}
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Showcase Body */}
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Simulated Prompt & Analysis */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-2">
                      <div className="w-2 h-2 rounded-full bg-slate-500" />
                      <span>{isRtl ? 'استعلام اللاعب أو المدرب:' : 'Player / Coach Query:'}</span>
                    </div>
                    <p className="text-sm text-slate-200 font-medium">
                      &quot;{activeTab.prompt}&quot;
                    </p>
                  </div>

                  {/* AI Response Card */}
                  <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-emerald-500/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-sm font-bold text-emerald-300">{activeTab.responseTitle}</h4>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">Model: Nisr-Football-LLM</span>
                    </div>

                    <div className="space-y-2.5">
                      {activeTab.insights.map((insight, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span>{insight}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Live Metrics Grid */}
                <div className="lg:col-span-5 grid grid-cols-2 gap-3">
                  {activeTab.responseMetrics.map((metric, i) => (
                    <div 
                      key={i} 
                      className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between hover:border-slate-700 transition-colors"
                    >
                      <span className="text-xs text-slate-400 mb-1">{metric.label}</span>
                      <span className={`text-2xl font-black bg-gradient-to-r ${metric.color} bg-clip-text text-transparent`}>
                        {metric.value}
                      </span>
                    </div>
                  ))}
                  
                  {/* Join to try card */}
                  <div className="col-span-2 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900/80 border border-emerald-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-emerald-300 block">{isRtl ? 'هل تريد تحليل أدائك الخاص؟' : 'Want your personalized analysis?'}</span>
                      <span className="text-[11px] text-slate-400">{isRtl ? 'سجل ملفك الرياضي مجاناً في دقائق' : 'Register your athletic profile in minutes'}</span>
                    </div>
                    <Link
                      href="/auth/register"
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-400 transition-all flex items-center gap-1 shadow-sm"
                    >
                      <span>{isRtl ? 'ابدأ الآن' : 'Start'}</span>
                      {isRtl ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                    </Link>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* SECTION 2: PLATFORM ECOSYSTEM (منظومة الحلم الرقمية المتكاملة) */}
        {/* ======================================================== */}
        <section id="ecosystem" className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/60">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-xs sm:text-sm font-bold tracking-widest text-emerald-400 uppercase">
              {isRtl ? 'منظومة كرة القدم المستقبلية' : 'The Future Football Ecosystem'}
            </h2>
            <h3 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              {isRtl ? 'ركائز منصة الحلم الرياضية' : 'Core Pillars of El7lm Platform'}
            </h3>
            <p className="text-slate-400 text-sm sm:text-base">
              {isRtl 
                ? 'بيئة رقمية شاملة تجمع اللاعبين، الأكاديميات، الكشافين، والأندية عبر أدوات احترافية وتقنيات ذكاء اصطناعي معتمدة.'
                : 'A comprehensive athletic network connecting players, clubs, scouts, and academies with certified digital standards.'}
            </p>
          </div>

          {/* 3 Main Pillar Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Pillar 1: Smart Scouting */}
            <div className="group relative rounded-3xl bg-slate-900/50 border border-slate-800 p-8 hover:border-emerald-500/50 hover:bg-slate-900/80 transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7" />
              </div>
              <h4 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-300 transition-colors">
                {isRtl ? 'شبكة الكشافين والأندية' : 'Scouting & Club Network'}
              </h4>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                {isRtl 
                  ? 'وصول مباشر لأكبر شبكة من كشافي الأندية والأكاديميات الرسمية لعرض قدراتك والتواصل المهني المباشر دون وسطاء.'
                  : 'Direct access to certified scouts and clubs to showcase your talents and secure trial opportunities transparently.'}
              </p>
              <div className="pt-4 border-t border-slate-800/80 flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>{isRtl ? 'توثيق رسمي للاعبين والأندية' : 'Verified Profiles & Clubs'}</span>
              </div>
            </div>

            {/* Pillar 2: AI Analytics */}
            <div className="group relative rounded-3xl bg-slate-900/50 border border-slate-800 p-8 hover:border-teal-500/50 hover:bg-slate-900/80 transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-7 h-7" />
              </div>
              <h4 className="text-xl font-bold text-white mb-3 group-hover:text-teal-300 transition-colors">
                {isRtl ? 'التحليل الرياضي الذكي' : 'Intelligent Athletic Profiling'}
              </h4>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                {isRtl 
                  ? 'تحويل مقاطع المهارات والمباريات والقياسات البدنية إلى تقارير رقمية معتمدة ورادارات أداء تفاعلية تقرأ إمكانياتك بدقة.'
                  : 'Transforming match footage and athletic stats into verified metrics and radar charts benchmarked to pro standards.'}
              </p>
              <div className="pt-4 border-t border-slate-800/80 flex items-center gap-2 text-xs font-semibold text-teal-400">
                <Dna className="w-4 h-4" />
                <span>{isRtl ? 'بصمة رقمية كروية موثقة' : 'Verified Football Digital DNA'}</span>
              </div>
            </div>

            {/* Pillar 3: Elite Tournaments */}
            <div className="group relative rounded-3xl bg-slate-900/50 border border-slate-800 p-8 hover:border-purple-500/50 hover:bg-slate-900/80 transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                <Trophy className="w-7 h-7" />
              </div>
              <h4 className="text-xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors">
                {isRtl ? 'البطولات والتجمعات الكبرى' : 'Elite Tournaments & Trials'}
              </h4>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                {isRtl 
                  ? 'فرص حصرية للمشاركة في أقوى البطولات والمعسكرات الرياضية بحضور كشافين وممثلين عن أندية محلية ودولية.'
                  : 'Exclusive opportunities to compete in premier tournaments with scouts and club representatives attending on-site.'}
              </p>
              <div className="pt-4 border-t border-slate-800/80 flex items-center gap-2 text-xs font-semibold text-purple-400">
                <Award className="w-4 h-4" />
                <span>{isRtl ? 'جوائز واختبارات احترافية' : 'Pro Trials & Recognition'}</span>
              </div>
            </div>

          </div>

          {/* Bottom Fast Action Banner */}
          <div className="mt-16 rounded-3xl bg-gradient-to-r from-emerald-900/40 via-teal-900/30 to-slate-900 border border-emerald-500/30 p-8 sm:p-12 text-center relative overflow-hidden">
            <div className="max-w-2xl mx-auto space-y-4">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                {isRtl ? 'جاهز للانضمام إلى جيل كرة القدم الجديد؟' : 'Ready to Join the Next Generation of Football?'}
              </h3>
              <p className="text-slate-300 text-sm">
                {isRtl 
                  ? 'أنشئ حسابك الرياضي الآن وابدأ محادثتك الأولى مع مساعد نسر الذكي.'
                  : 'Create your athletic profile now and start your first consultation with Nisr AI.'}
              </p>
              <div className="pt-2">
                <Link
                  href="/auth/register"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-lg shadow-emerald-500/30 transition-all hover:scale-105"
                >
                  <span>{isRtl ? 'سجل مجاناً في دقيقة' : 'Sign Up Free in 1 Minute'}</span>
                  {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="relative z-10 bg-[#05080f] border-t border-slate-800/60 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Image src="/el7lm-logo.png" alt="El7lm Logo" width={24} height={24} className="object-contain" />
              </div>
              <span className="text-base font-bold text-white">
                {isRtl ? 'منصة الحلم — المنظومة الذكية' : 'El7lm Athletic Platform'}
              </span>
            </div>

            <div className="flex items-center gap-6 text-xs text-slate-400">
              <Link href="/privacy" className="hover:text-slate-200 transition-colors">
                {isRtl ? 'سياسة الخصوصية' : 'Privacy Policy'}
              </Link>
              <Link href="/terms" className="hover:text-slate-200 transition-colors">
                {isRtl ? 'الشروط والأحكام' : 'Terms of Service'}
              </Link>
              <Link href="/contact" className="hover:text-slate-200 transition-colors">
                {isRtl ? 'الدعم الفني' : 'Support'}
              </Link>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p>
              &copy; {new Date().getFullYear()} {isRtl ? 'جميع الحقوق محفوظة لمنصة الحلم الرياضية.' : 'All rights reserved to El7lm Platform.'}
            </p>
            <div className="flex items-center gap-2 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{isRtl ? 'منصة موثقة ومدعومة بنموذج Nisr AI' : 'Verified & Powered by Nisr AI Model'}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
