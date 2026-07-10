'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Trophy, Search, MapPin, Calendar, Users, ChevronLeft } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

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

const STATUS_CFG: Record<string, { labelKey: string; cls: string }> = {
    open:      { labelKey: 'tournaments.statusOpen', cls: 'bg-emerald-100 text-emerald-700' },
    ongoing:   { labelKey: 'tournaments.statusOngoing', cls: 'bg-blue-100 text-blue-700'       },
    closed:    { labelKey: 'tournaments.statusClosed', cls: 'bg-slate-100 text-slate-600'     },
    completed: { labelKey: 'tournaments.statusCompleted', cls: 'bg-purple-100 text-purple-700'   },
};

const TYPE_LABEL_KEYS: Record<string, string> = {
    knockout:        'tournaments.typeKnockout',
    league:          'tournaments.typeLeague',
    groups_knockout: 'tournaments.typeGroupsKnockout',
};

export default function TournamentsListPage() {
    const { t, isRTL } = useTranslation();
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
        <div className="min-h-screen bg-slate-50" dir={isRTL ? 'rtl' : 'ltr'}>

            {/* Hero */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white py-14 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Trophy className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-3xl font-black mb-2">{t('tournaments.title')}</h1>
                    <p className="text-slate-400 text-sm">{t('tournaments.subtitle')}</p>
                    <div className="mt-4">
                        <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-full">
                            {t('tournaments.openToRegisterCount').replace('{{count}}', String(openCount))}
                        </span>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="max-w-4xl mx-auto px-4 -mt-5">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder={t('tournaments.searchPlaceholder')}
                            className={`w-full ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-yellow-400 transition-colors`} />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {[
                            { v: 'all', label: t('tournaments.filterAll') },
                            { v: 'open', label: t('tournaments.filterOpen') },
                            { v: 'ongoing', label: t('tournaments.filterOngoing') },
                            { v: 'completed', label: t('tournaments.filterCompleted') },
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
                        <p className="text-sm">{t('tournaments.noTournaments')}</p>
                    </div>
                ) : filtered.map(tData => {
                    const cfg = STATUS_CFG[tData.status] || STATUS_CFG.closed;
                    const canRegister = tData.status === 'open';
                    return (
                        <div key={tData.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
                            <div className="flex gap-4">
                                {/* Logo */}
                                {tData.logo_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={tData.logo_url} alt={tData.name} className="w-14 h-14 rounded-xl object-cover border border-slate-100 flex-shrink-0" />
                                ) : (
                                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                                        <Trophy className="w-7 h-7 text-white" />
                                    </div>
                                )}

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3 flex-wrap">
                                        <div>
                                            <h2 className="font-black text-slate-900 text-base">{tData.name}</h2>
                                            <p className="text-xs text-slate-500 mt-0.5">{t(TYPE_LABEL_KEYS[tData.type]) || tData.type}</p>
                                        </div>
                                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${cfg.cls}`}>
                                            {t(cfg.labelKey)}
                                        </span>
                                    </div>

                                    {tData.description && (
                                        <p className="text-xs text-slate-500 mt-2 line-clamp-2">{tData.description}</p>
                                    )}

                                    <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-slate-400">
                                        {(tData.city || tData.country) && (
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" /> {tData.city || tData.country}
                                            </span>
                                        )}
                                        {tData.start_date && (
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(tData.start_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        )}
                                        {tData.max_teams && (
                                            <span className="flex items-center gap-1">
                                                <Users className="w-3 h-3" /> {t('tournaments.teamsCount').replace('{{count}}', String(tData.max_teams))}
                                            </span>
                                        )}
                                        {tData.is_paid && tData.entry_fee ? (
                                            <span className="font-bold text-yellow-600">
                                                {tData.entry_fee} {tData.currency}
                                            </span>
                                        ) : (
                                            <span className="text-emerald-600 font-bold">{t('tournaments.free')}</span>
                                        )}
                                    </div>

                                    {tData.registration_deadline && canRegister && (
                                        <p className="text-[10px] text-amber-600 font-semibold mt-2">
                                            {t('tournaments.registrationDeadline')}{new Date(tData.registration_deadline).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100">
                                <Link href={`/tournaments/${tData.slug}`}
                                    className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-yellow-600 transition-colors">
                                    {t('tournaments.details')} <ChevronLeft className={`w-3 h-3 ${isRTL ? '' : 'rotate-180'}`} />
                                </Link>
                                {canRegister && (
                                    <Link href={`/tournaments/${tData.slug}/register`}
                                        className={`${isRTL ? 'mr-auto' : 'ml-auto'} flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all`}>
                                        {t('tournaments.registerNow')}
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
