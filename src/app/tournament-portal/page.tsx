'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Trophy, Plus, Calendar, Users, Activity,
    ChevronLeft, Clock, CheckCircle, XCircle, AlertCircle,
} from 'lucide-react';
import { getCurrentClient, TournamentClient } from '@/lib/tournament-portal/auth';
import { createPortalClient } from '@/lib/tournament-portal/auth';
import { PortalShell } from './_components/PortalShell';

type TournamentRow = {
    id: string; slug: string; name: string; status: string; type: string;
    start_date: string | null; end_date: string | null; country: string | null;
    city: string | null; logo_url: string | null; max_teams: number | null;
    created_at: string;
};

const STATUS_CONFIG: Record<string, { label: string; icon: any; cls: string }> = {
    draft:     { label: 'مسودة',    icon: Clock,         cls: 'bg-slate-100 text-slate-600'   },
    open:      { label: 'مفتوح',    icon: CheckCircle,   cls: 'bg-emerald-100 text-emerald-700' },
    closed:    { label: 'مغلق',     icon: XCircle,       cls: 'bg-rose-100 text-rose-700'     },
    ongoing:   { label: 'جارٍ',     icon: Activity,      cls: 'bg-blue-100 text-blue-700'     },
    completed: { label: 'منتهي',    icon: CheckCircle,   cls: 'bg-purple-100 text-purple-700' },
    cancelled: { label: 'ملغي',     icon: AlertCircle,   cls: 'bg-orange-100 text-orange-700' },
};

const TYPE_LABEL: Record<string, string> = {
    knockout:         'كأس (إقصائي)',
    league:           'دوري',
    groups_knockout:  'مجموعات + إقصاء',
};

export default function TournamentPortalDashboard() {
    const [client,      setClient]      = useState<TournamentClient | null>(null);
    const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
    const [loading,     setLoading]     = useState(true);
    const router = useRouter();

    useEffect(() => {
        (async () => {
            const c = await getCurrentClient();
            if (!c) {
                router.replace('/tournament-portal/login');
                return;
            }
            setClient(c);

            const supabase = createPortalClient();
            const { data } = await supabase
                .from('tournament_new')
                .select('id, slug, name, status, type, start_date, end_date, country, city, logo_url, max_teams, created_at')
                .eq('client_id', c.id)
                .order('created_at', { ascending: false });

            setTournaments((data as TournamentRow[]) || []);
            setLoading(false);
        })();
    }, []);

    if (!client) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    const stats = {
        total:    tournaments.length,
        ongoing:  tournaments.filter(t => t.status === 'ongoing').length,
        open:     tournaments.filter(t => t.status === 'open').length,
        completed:tournaments.filter(t => t.status === 'completed').length,
    };

    return (
        <PortalShell client={client}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">بطولاتي</h1>
                    <p className="text-slate-500 text-sm mt-0.5">
                        أهلاً {client.name}، إليك نظرة عامة على بطولاتك
                    </p>
                </div>
                <Link
                    href="/tournament-portal/new"
                    className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-yellow-500/20 transition-all text-sm"
                >
                    <Plus className="w-4 h-4" /> بطولة جديدة
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'إجمالي البطولات', value: stats.total,     color: 'from-slate-600 to-slate-800'   },
                    { label: 'جارية الآن',       value: stats.ongoing,   color: 'from-blue-500 to-indigo-600'   },
                    { label: 'مفتوحة للتسجيل',  value: stats.open,      color: 'from-emerald-500 to-teal-600'  },
                    { label: 'منتهية',           value: stats.completed, color: 'from-purple-500 to-violet-600' },
                ].map(s => (
                    <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-2xl p-4 text-white`}>
                        <p className="text-3xl font-black">{s.value}</p>
                        <p className="text-white/70 text-xs mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Tournaments list */}
            {loading ? (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[1,2,3].map(i => <div key={i} className="h-40 bg-white rounded-2xl animate-pulse border border-slate-100" />)}
                </div>
            ) : tournaments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                    <div className="w-20 h-20 bg-yellow-50 rounded-3xl flex items-center justify-center mb-4">
                        <Trophy className="w-10 h-10 text-yellow-500" />
                    </div>
                    <p className="font-bold text-slate-600 text-lg">لا توجد بطولات بعد</p>
                    <p className="text-sm mt-1 mb-6">ابدأ بإنشاء بطولتك الأولى</p>
                    <Link
                        href="/tournament-portal/new"
                        className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-white font-bold px-5 py-2.5 rounded-xl transition-colors"
                    >
                        <Plus className="w-4 h-4" /> إنشاء بطولة
                    </Link>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {tournaments.map(t => {
                        const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.draft;
                        const StatusIcon = cfg.icon;
                        return (
                            <Link
                                key={t.id}
                                href={`/tournament-portal/${t.id}/overview`}
                                className="group bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-lg hover:border-yellow-300 transition-all"
                            >
                                <div className="flex items-start gap-3 mb-3">
                                    {t.logo_url ? (
                                        <img src={t.logo_url} alt={t.name} className="w-12 h-12 rounded-xl object-cover border border-slate-200 flex-shrink-0" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                                            <Trophy className="w-6 h-6 text-white" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-900 text-sm truncate group-hover:text-yellow-600 transition-colors">{t.name}</h3>
                                        <p className="text-xs text-slate-400 mt-0.5">{TYPE_LABEL[t.type] || t.type}</p>
                                    </div>
                                    <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${cfg.cls}`}>
                                        <StatusIcon className="w-3 h-3" /> {cfg.label}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                                    {(t.city || t.country) && (
                                        <span className="flex items-center gap-1">
                                            📍 {t.city || t.country}
                                        </span>
                                    )}
                                    {t.start_date && (
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(t.start_date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                                        </span>
                                    )}
                                    {t.max_teams && (
                                        <span className="flex items-center gap-1">
                                            <Users className="w-3 h-3" /> {t.max_teams} فريق
                                        </span>
                                    )}
                                </div>

                                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                                    <span className="text-[10px] text-slate-400">
                                        {new Date(t.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </span>
                                    <span className="text-[11px] text-yellow-600 font-semibold flex items-center gap-0.5 group-hover:gap-1.5 transition-all">
                                        إدارة <ChevronLeft className="w-3 h-3" />
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </PortalShell>
    );
}
