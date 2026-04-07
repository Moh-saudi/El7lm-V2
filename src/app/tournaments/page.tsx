'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Trophy, Search, MapPin, Calendar, Users, ChevronLeft, Filter } from 'lucide-react';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Tournament = {
    id: string; slug: string; name: string; status: string; type: string;
    start_date: string | null; end_date: string | null;
    country: string | null; city: string | null;
    logo_url: string | null; max_teams: number | null;
    description: string | null; entry_fee: number | null;
    currency: string; is_paid: boolean;
    registration_deadline: string | null;
};

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
    open:      { label: 'مفتوح للتسجيل', cls: 'bg-emerald-100 text-emerald-700' },
    ongoing:   { label: 'جارٍ',           cls: 'bg-blue-100 text-blue-700'       },
    closed:    { label: 'مغلق',           cls: 'bg-slate-100 text-slate-600'     },
    completed: { label: 'منتهي',          cls: 'bg-purple-100 text-purple-700'   },
};

const TYPE_LABEL: Record<string, string> = {
    knockout:        'كأس إقصائي',
    league:          'دوري',
    groups_knockout: 'مجموعات + إقصاء',
};

export default function TournamentsListPage() {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading,     setLoading]     = useState(true);
    const [search,      setSearch]      = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        (async () => {
            const { data } = await supabase
                .from('tournament_new')
                .select('id, slug, name, status, type, start_date, end_date, country, city, logo_url, max_teams, description, entry_fee, currency, is_paid, registration_deadline')
                .eq('is_public', true)
                .neq('status', 'draft')
                .order('created_at', { ascending: false });
            setTournaments(data || []);
            setLoading(false);
        })();
    }, []);

    const filtered = tournaments.filter(t => {
        if (statusFilter !== 'all' && t.status !== statusFilter) return false;
        if (search && !t.name.toLowerCase().includes(search.toLowerCase()) &&
            !t.city?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const openCount = tournaments.filter(t => t.status === 'open').length;

    return (
        <div className="min-h-screen bg-slate-50" dir="rtl">

            {/* Hero */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white py-14 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Trophy className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-3xl font-black mb-2">بطولات El7lm</h1>
                    <p className="text-slate-400 text-sm">اكتشف البطولات المتاحة وسجّل فريقك الآن</p>
                    <div className="mt-4">
                        <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-full">
                            {openCount} بطولة مفتوحة للتسجيل
                        </span>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="max-w-4xl mx-auto px-4 -mt-5">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="ابحث بالاسم أو المدينة..."
                            className="w-full pr-9 pl-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-yellow-400 transition-colors" />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {[
                            { v: 'all', label: 'الكل' },
                            { v: 'open', label: 'مفتوح' },
                            { v: 'ongoing', label: 'جارٍ' },
                            { v: 'completed', label: 'منتهي' },
                        ].map(f => (
                            <button key={f.v} onClick={() => setStatusFilter(f.v)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all
                                    ${statusFilter === f.v ? 'bg-yellow-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-32 bg-white rounded-2xl animate-pulse border border-slate-100" />
                    ))
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">
                        <Trophy className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                        <p className="text-sm">لا توجد بطولات مطابقة</p>
                    </div>
                ) : filtered.map(t => {
                    const cfg = STATUS_CFG[t.status] || STATUS_CFG.closed;
                    const canRegister = t.status === 'open';
                    return (
                        <div key={t.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
                            <div className="flex gap-4">
                                {/* Logo */}
                                {t.logo_url ? (
                                    <img src={t.logo_url} alt={t.name} className="w-14 h-14 rounded-xl object-cover border border-slate-100 flex-shrink-0" />
                                ) : (
                                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                                        <Trophy className="w-7 h-7 text-white" />
                                    </div>
                                )}

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3 flex-wrap">
                                        <div>
                                            <h2 className="font-black text-slate-900 text-base">{t.name}</h2>
                                            <p className="text-xs text-slate-500 mt-0.5">{TYPE_LABEL[t.type] || t.type}</p>
                                        </div>
                                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${cfg.cls}`}>
                                            {cfg.label}
                                        </span>
                                    </div>

                                    {t.description && (
                                        <p className="text-xs text-slate-500 mt-2 line-clamp-2">{t.description}</p>
                                    )}

                                    <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-slate-400">
                                        {(t.city || t.country) && (
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" /> {t.city || t.country}
                                            </span>
                                        )}
                                        {t.start_date && (
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(t.start_date).toLocaleDateString('ar-SA', { month: 'long', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        )}
                                        {t.max_teams && (
                                            <span className="flex items-center gap-1">
                                                <Users className="w-3 h-3" /> {t.max_teams} فريق
                                            </span>
                                        )}
                                        {t.is_paid && t.entry_fee ? (
                                            <span className="font-bold text-yellow-600">
                                                {t.entry_fee} {t.currency}
                                            </span>
                                        ) : (
                                            <span className="text-emerald-600 font-bold">مجاني</span>
                                        )}
                                    </div>

                                    {t.registration_deadline && canRegister && (
                                        <p className="text-[10px] text-amber-600 font-semibold mt-2">
                                            ⏰ آخر موعد للتسجيل: {new Date(t.registration_deadline).toLocaleDateString('ar-SA')}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100">
                                <Link href={`/tournaments/${t.slug}`}
                                    className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-yellow-600 transition-colors">
                                    تفاصيل البطولة <ChevronLeft className="w-3 h-3" />
                                </Link>
                                {canRegister && (
                                    <Link href={`/tournaments/${t.slug}/register`}
                                        className="mr-auto flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all">
                                        سجّل فريقك الآن
                                    </Link>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
