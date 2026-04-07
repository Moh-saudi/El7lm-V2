'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trophy, Mail, Lock, User, Building2, Phone, Globe, Eye, EyeOff, Loader2 } from 'lucide-react';
// @ts-ignore
// @ts-ignore
import { signUpClient } from '@/lib/tournament-portal/auth';

const COUNTRIES = [
    'السعودية','الإمارات','قطر','الكويت','البحرين','عُمان',
    'مصر','الأردن','العراق','لبنان','سوريا','اليمن','ليبيا',
    'تونس','الجزائر','المغرب','السودان','فلسطين','موريتانيا',
];

export default function TournamentPortalRegister() {
    const router = useRouter();

    const [form, setForm] = useState({
        name:             '',
        organizationName: '',
        email:            '',
        phone:            '',
        country:          '',
        password:         '',
        confirmPassword:  '',
    });
    const [showPw,  setShowPw]  = useState(false);
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState('');

    const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm(prev => ({ ...prev, [k]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.email || !form.password) {
            setError('يرجى تعبئة الحقول المطلوبة'); return;
        }
        if (form.password.length < 8) {
            setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return;
        }
        if (form.password !== form.confirmPassword) {
            setError('كلمتا المرور غير متطابقتين'); return;
        }
        setLoading(true);
        setError('');
        try {
            await signUpClient({
                email:            form.email.trim(),
                password:         form.password,
                name:             form.name.trim(),
                organizationName: form.organizationName.trim() || undefined,
                phone:            form.phone.trim() || undefined,
                country:          form.country || undefined,
            });
            router.push('/tournament-portal');
        } catch (err: any) {
            setError(err.message || 'فشل إنشاء الحساب');
        } finally {
            setLoading(false);
        }
    };

    const Field = ({ label, icon: Icon, ...props }: any) => (
        <div>
            <label className="text-slate-300 text-sm font-medium mb-1.5 block">{label}</label>
            <div className="relative">
                <Icon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    {...props}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 pr-10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all"
                />
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 py-10" dir="rtl">
            <div className="w-full max-w-lg bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">

                {/* Header */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg mb-4">
                        <Trophy className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-black text-white">إنشاء حساب جديد</h1>
                    <p className="text-slate-400 text-sm mt-1">انضم وأدر بطولاتك باحترافية</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="الاسم الكامل *" icon={User} value={form.name} onChange={set('name')} placeholder="محمد أحمد" />
                        <Field label="اسم المؤسسة" icon={Building2} value={form.organizationName} onChange={set('organizationName')} placeholder="نادي / أكاديمية" />
                    </div>

                    <Field label="البريد الإلكتروني *" icon={Mail} type="email" value={form.email} onChange={set('email')} placeholder="example@domain.com" dir="ltr" autoComplete="email" />

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="رقم الجوال" icon={Phone} type="tel" value={form.phone} onChange={set('phone')} placeholder="+966 5xx xxx xxx" dir="ltr" />
                        <div>
                            <label className="text-slate-300 text-sm font-medium mb-1.5 block">الدولة</label>
                            <div className="relative">
                                <Globe className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <select
                                    value={form.country}
                                    onChange={set('country')}
                                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 pr-10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50 appearance-none"
                                >
                                    <option value="" className="bg-slate-800">اختر الدولة</option>
                                    {COUNTRIES.map(c => <option key={c} value={c} className="bg-slate-800">{c}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="text-slate-300 text-sm font-medium mb-1.5 block">كلمة المرور * (8 أحرف على الأقل)</label>
                        <div className="relative">
                            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type={showPw ? 'text' : 'password'}
                                value={form.password}
                                onChange={set('password')}
                                placeholder="••••••••"
                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 pr-10 pl-10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all"
                                dir="ltr"
                            />
                            <button type="button" onClick={() => setShowPw(v => !v)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors">
                                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="text-slate-300 text-sm font-medium mb-1.5 block">تأكيد كلمة المرور *</label>
                        <div className="relative">
                            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="password"
                                value={form.confirmPassword}
                                onChange={set('confirmPassword')}
                                placeholder="••••••••"
                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 pr-10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all"
                                dir="ltr"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2 mt-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
                        {loading ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب'}
                    </button>
                </form>

                <p className="text-center text-slate-400 text-sm mt-6">
                    لديك حساب بالفعل؟{' '}
                    <Link href="/tournament-portal/login" className="text-yellow-400 hover:text-yellow-300 font-semibold transition-colors">
                        تسجيل الدخول
                    </Link>
                </p>
            </div>
        </div>
    );
}
