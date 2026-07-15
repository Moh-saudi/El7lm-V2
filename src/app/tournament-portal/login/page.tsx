'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Trophy, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
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
        if (!email || !password) { setError(t.login.required); return; }
        setLoading(true);
        setError('');
        try {
            await signInClient(email.trim(), password);
            router.push(redirect);
        } catch (err: any) {
            setError(err.message === 'Invalid login credentials'
                ? t.login.invalid
                : err.message || t.login.failed);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'}`}><LanguageSwitcher /></div>

            {/* Card */}
            <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">

                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg mb-4">
                        <Trophy className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-black text-white">{t.common.portal}</h1>
                    <p className="text-slate-400 text-sm mt-1">{t.login.subtitle}</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Email */}
                    <div>
                        <label className="text-slate-300 text-sm font-medium mb-1.5 block">{t.login.email}</label>
                        <div className="relative">
                            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="example@domain.com"
                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 pr-10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all"
                                autoComplete="email"
                                dir="ltr"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="text-slate-300 text-sm font-medium mb-1.5 block">{t.login.password}</label>
                        <div className="relative">
                            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type={showPw ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 pr-10 pl-10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all"
                                autoComplete="current-password"
                                dir="ltr"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw(v => !v)}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                            >
                                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2 mt-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
                        {loading ? t.login.submitting : t.login.submit}
                    </button>
                </form>

                {/* Register link */}
                <p className="text-center text-slate-400 text-sm mt-6">
                    {t.login.noAccount}{' '}
                    <Link href="/tournament-portal/register" className="text-yellow-400 hover:text-yellow-300 font-semibold transition-colors">
                        {t.login.register}
                    </Link>
                </p>
            </div>
        </div>
    );
}
