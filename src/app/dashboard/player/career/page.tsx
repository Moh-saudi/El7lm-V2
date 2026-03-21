'use client';

import { ArrowRight, BarChart3, Calendar, Clock, FileText, Star, Target, Trophy, Zap } from 'lucide-react';
import Link from 'next/link';

const UPCOMING_FEATURES = [
  { icon: Trophy,    label: 'سجل البطولات والمسابقات' },
  { icon: BarChart3, label: 'إحصائيات الأداء الموسمية' },
  { icon: Calendar,  label: 'الجدول الزمني للمسيرة' },
  { icon: Star,      label: 'الإنجازات والجوائز' },
  { icon: Target,    label: 'الأهداف المهنية' },
  { icon: FileText,  label: 'تقارير الأداء التاريخية' },
];

export default function CareerPage() {
  return (
    <div
      className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12 text-center"
      dir="rtl"
      style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
    >
      {/* Icon */}
      <div className="relative mb-6">
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto shadow-lg"
          style={{ background: 'linear-gradient(135deg, var(--accent-current), color-mix(in srgb, var(--accent-current) 60%, #000))' }}
        >
          <Trophy className="w-12 h-12 text-white" />
        </div>
        {/* Pulse ring */}
        <div
          className="absolute inset-0 rounded-3xl animate-ping opacity-20"
          style={{ background: 'var(--accent-current)' }}
        />
      </div>

      {/* Badge */}
      <div
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-4"
        style={{ background: 'color-mix(in srgb, var(--accent-current) 12%, transparent)', color: 'var(--accent-current)' }}
      >
        <Zap size={14} />
        قيد التطوير
      </div>

      {/* Title */}
      <h1 className="text-3xl md:text-4xl font-black mb-3" style={{ color: 'var(--header-text)' }}>
        مسيرتي الرياضية
      </h1>
      <p className="text-base md:text-lg max-w-md mb-2" style={{ color: 'var(--header-text-muted)' }}>
        نبني لك صفحة احترافية تجمع كل إنجازاتك وتاريخك الرياضي في مكان واحد.
      </p>
      <p className="text-sm mb-10 flex items-center gap-2 justify-center" style={{ color: 'var(--header-text-muted)' }}>
        <Clock size={14} />
        متوقع الإطلاق قريباً
      </p>

      {/* Features grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-lg mb-10">
        {UPCOMING_FEATURES.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl text-sm font-medium"
            style={{
              background: 'var(--main-bg)',
              border: '1px solid var(--sidebar-border)',
              color: 'var(--header-text-muted)',
            }}
          >
            <Icon size={20} style={{ color: 'var(--accent-current)' }} />
            {label}
          </div>
        ))}
      </div>

      {/* Back button */}
      <Link
        href="/dashboard/player"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90"
        style={{ background: 'var(--accent-current)' }}
      >
        <ArrowRight size={18} />
        العودة للرئيسية
      </Link>
    </div>
  );
}
