'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
    Trophy, Mail, Lock, Eye, EyeOff, Loader2,
    ShieldCheck, Sparkles, ArrowRight, ArrowLeft,
    ChevronRight, CheckCircle2, AlertCircle
} from 'lucide-react';
import { signInClient } from '@/lib/tournament-portal/auth';
import { useTranslation } from '@/lib/i18n';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';

export default function TournamentPortalLogin() {
    const { isRTL, getTranslations } = useTranslation();
    const t = getTranslations<any>('tournamentPortal');
    const router       = useRouter();
    const searchParams = useSearchParams();
    const redirect     = searchParams.get('redirect') || '/tournament-portal';

    const [email,    setEmail]    = useState('');
    const [password, setPassword] = useState('');
    const [showPw,   setShowPw]   = useState(false);
    const [loading,  setLoading]  = useState(false);
    const [error,    setError]    = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !password) {
            setError(t?.login?.required || 'يرجى تعبئة جميع الحقول المطلوبة');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await signInClient(email.trim(), password);
            window.location.href = redirect;
        } catch (err: any) {
            setError(
                err.message === 'Invalid login credentials'
                    ? (t?.login?.invalid || 'البريد الإلكتروني أو كلمة المرور غير صحيحة')
                    : err.message || (t?.login?.failed || 'فشل تسجيل الدخول، يرجى المحاولة لاحقاً')
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="relative min-h-screen bg-[#070b1a] text-slate-100 flex flex-col justify-between overflow-hidden selection:bg-amber-500 selection:text-slate-950 font-sans"
            dir={isRTL ? 'rtl' : 'ltr'}
        >
            {/* ════════════════════════════════════════════════════════════════════════
                AESTHETIC BACKGROUND: Glow Orbs & Sport Grid Mesh
            ════════════════════════════════════════════════════════════════════════ */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Top Gold Ambient Glow */}
                <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[140px]" />
                {/* Bottom Emerald Ambient Glow */}
                <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px]" />
                {/* Center Navy Deep Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/5 rounded-full blur-[160px]" />

                {/* Tactical Sports Pitch Grid Overlay */}
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
                        backgroundSize: '36px 36px',
                    }}
                />
            </div>

            {/* ════════════════════════════════════════════════════════════════════════
                TOP NAVIGATION BAR
            ════════════════════════════════════════════════════════════════════════ */}
            <header className="relative z-10 w-full px-6 py-5 flex items-center justify-between max-w-7xl mx-auto">
                {/* Brand Logo & Name */}
                <Link href="/" className="flex items-center gap-3.5 group">
                    <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-[#111c42] to-[#1e2e6b] border border-white/15 p-2 shadow-lg shadow-indigo-950/40 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                        <Image
                            src="/el7lm-logo.png"
                            alt="مسك الحلم | El7lm"
                            width={40}
                            height={40}
                            className="object-contain drop-shadow-sm"
                            priority
                        />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-black text-lg tracking-tight text-white group-hover:text-amber-300 transition-colors">
                                مسك الحلم
                            </span>
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-400/15 border border-amber-400/30 text-amber-300">
                                البطولة
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium">
                            بوابة تنظيم وإدارة البطولات الرياضية
                        </p>
                    </div>
                </Link>

                {/* Top Actions: Language & Return to platform */}
                <div className="flex items-center gap-3">
                    <LanguageSwitcher />
                    <Link
                        href="/"
                        className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all"
                    >
                        <span>الرئيسية</span>
                        {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                    </Link>
                </div>
            </header>

            {/* ════════════════════════════════════════════════════════════════════════
                MAIN LOGIN CARD
            ════════════════════════════════════════════════════════════════════════ */}
            <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
                <div className="w-full max-w-lg">

                    {/* Glassmorphic Container */}
                    <div className="relative bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl shadow-black/80 overflow-hidden">

                        {/* Top Gradient Accent Bar */}
                        <div className="h-2 w-full bg-gradient-to-r from-emerald-500 via-amber-400 to-[#1e2e6b]" />

                        <div className="p-8 sm:p-10">

                            {/* Logo & Headline */}
                            <div className="text-center mb-8">
                                {/* Elevated Logo Badge */}
                                <div className="inline-flex relative mb-4">
                                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#0e1638] via-[#162354] to-[#1e2e6b] border border-amber-400/30 p-3.5 shadow-2xl shadow-indigo-950/60 flex items-center justify-center mx-auto">
                                        <Image
                                            src="/el7lm-logo.png"
                                            alt="شعار مسك الحلم"
                                            width={60}
                                            height={60}
                                            className="object-contain drop-shadow-md"
                                            priority
                                        />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center shadow-md border border-[#070b1a]">
                                        <Trophy className="w-3.5 h-3.5 stroke-[2.5]" />
                                    </div>
                                </div>

                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-bold mb-2">
                                    <Sparkles className="w-3 h-3" />
                                    <span>بوابة منظمي ومديري البطولات</span>
                                </div>

                                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                                    تسجيل الدخول للوحة التحكم
                                </h1>
                                <p className="text-slate-400 text-xs sm:text-sm mt-1.5 max-w-sm mx-auto leading-relaxed">
                                    أدخل بيانات حسابك المعتمد لإدارة بطولاتك، الفرق، القرعة، وتفاصيل المباريات
                                </p>
                            </div>

                            {/* Error Alert */}
                            {error && (
                                <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
                                    <span className="font-medium leading-relaxed">{error}</span>
                                </div>
                            )}

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-5">

                                {/* Field: Email */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                                        <span className="flex items-center gap-1.5">
                                            <Mail className="w-3.5 h-3.5 text-amber-400" />
                                            <span>البريد الإلكتروني الرسمي</span>
                                        </span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="email"
                                            required
                                            dir="ltr"
                                            autoComplete="email"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder="organizer@el7lm.com"
                                            className="w-full bg-slate-950/60 hover:bg-slate-950/80 focus:bg-slate-950 border border-white/15 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 rounded-2xl px-4 py-3.5 text-white placeholder:text-slate-500 text-sm font-mono outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Field: Password */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                            <Lock className="w-3.5 h-3.5 text-amber-400" />
                                            <span>كلمة المرور</span>
                                        </label>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type={showPw ? 'text' : 'password'}
                                            required
                                            dir="ltr"
                                            autoComplete="current-password"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="••••••••••••"
                                            className="w-full bg-slate-950/60 hover:bg-slate-950/80 focus:bg-slate-950 border border-white/15 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 rounded-2xl pr-12 pl-4 py-3.5 text-white placeholder:text-slate-500 text-sm font-mono outline-none transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPw(!showPw)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                            title={showPw ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                                        >
                                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full mt-2 py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 hover:shadow-2xl hover:shadow-amber-500/30 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2.5 cursor-pointer"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>جاري تسجيل الدخول والتحقق...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Trophy className="w-5 h-5 stroke-[2.5]" />
                                            <span>دخول لوحة إدارة البطولة</span>
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Security Notice */}
                            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-center gap-2 text-xs text-slate-400">
                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                <span>نظام حماية وتشفير معتمد لبيانات المنظمين والبطولات</span>
                            </div>

                            {/* Self Register or Contact Link */}
                            <div className="mt-4 text-center">
                                <p className="text-xs text-slate-400">
                                    ليس لديك حساب منظم بعد؟{' '}
                                    <Link
                                        href="/tournament-portal/register"
                                        className="text-amber-400 hover:text-amber-300 font-bold underline underline-offset-4 transition-colors"
                                    >
                                        طلب إنشاء حساب منظم
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Link to public tournaments */}
                    <div className="text-center mt-6">
                        <Link
                            href="/tournaments"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                        >
                            <span>استعراض البطولات المعلنة للجمهور</span>
                            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                        </Link>
                    </div>

                </div>
            </main>

            {/* ════════════════════════════════════════════════════════════════════════
                FOOTER
            ════════════════════════════════════════════════════════════════════════ */}
            <footer className="relative z-10 py-4 px-6 text-center text-[11px] text-slate-400 border-t border-white/5">
                <p>جميع الحقوق محفوظة © {new Date().getFullYear()} منصة مسك الحلم الرياضية الذكية</p>
            </footer>
        </div>
    );
}
