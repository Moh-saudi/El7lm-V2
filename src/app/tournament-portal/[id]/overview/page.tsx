'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    Users, Swords, Trophy, Calendar, MapPin,
    CheckCircle, Clock, Activity, TrendingUp,
    ChevronLeft, AlertCircle, Settings,
} from 'lucide-react';
import { createPortalClient } from '@/lib/tournament-portal/auth';

const STATUS_STEPS = ['draft','open','closed','ongoing','completed'];
const STATUS_LABEL: Record<string, string> = {
    draft: 'مسودة', open: 'مفتوح للتسجيل', closed: 'مغلق التسجيل',
    ongoing: 'جارٍ', completed: 'منتهي', cancelled: 'ملغي',
};

export default function TournamentOverviewPage() {
    const { id } = useParams<{ id: string }>();
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        (async () => {
            const supabase = createPortalClient();
            const [tRes, teamsRes, matchesRes] = await Promise.all([
                supabase.from('tournament_new').select('*').eq('id', id).single(),
                supabase.from('tournament_teams').select('id, status').eq('tournament_id', id),
                supabase.from('tournament_matches').select('id, status, scheduled_at, home_score, away_score').eq('tournament_id', id),
            ]);
            setData({
                tournament: tRes.data,
                teams:      teamsRes.data || [],
                matches:    matchesRes.data || [],
            });
        })();
    }, [id]);

    if (!data) return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-slate-100" />)}
        </div>
    );

    const { tournament: t, teams, matches } = data;
    const approvedTeams  = teams.filter((x: any) => x.status === 'approved').length;
    const pendingTeams   = teams.filter((x: any) => x.status === 'pending').length;
    const completedMatch = matches.filter((x: any) => x.status === 'completed').length;
    const upcomingMatch  = matches.filter((x: any) => x.status === 'scheduled' && x.scheduled_at && new Date(x.scheduled_at) > new Date());
    const nextMatch      = upcomingMatch.sort((a: any, b: any) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];
    const statusIdx      = STATUS_STEPS.indexOf(t.status);

    const TYPE_LABEL: Record<string, string> = {
        knockout: 'كأس (إقصائي)', league: 'دوري', groups_knockout: 'مجموعات + إقصاء',
    };

    return (
        <div className="space-y-5" dir="rtl">

            {/* Status progress */}
            {t.status !== 'cancelled' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-slate-700 mb-4">حالة البطولة</h3>
                    <div className="flex items-center gap-2">
                        {STATUS_STEPS.map((s, i) => {
                            const done    = i < statusIdx;
                            const current = i === statusIdx;
                            return (
                                <div key={s} className="flex items-center flex-1">
                                    <div className={`flex flex-col items-center flex-shrink-0`}>
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                                            ${done    ? 'bg-emerald-500 text-white' :
                                              current ? 'bg-yellow-500 text-white ring-4 ring-yellow-100' :
                                                        'bg-slate-100 text-slate-400'}`}>
                                            {done ? <CheckCircle className="w-4 h-4" /> : i + 1}
                                        </div>
                                        <span className={`text-[10px] mt-1 font-medium whitespace-nowrap
                                            ${current ? 'text-yellow-600' : done ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            {STATUS_LABEL[s]}
                                        </span>
                                    </div>
                                    {i < STATUS_STEPS.length - 1 && (
                                        <div className={`h-0.5 flex-1 mx-2 rounded mb-4 ${done ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'الفرق المعتمدة', value: approvedTeams, total: t.max_teams, icon: Users,    color: 'text-blue-600',   bg: 'bg-blue-50'   },
                    { label: 'طلبات معلقة',   value: pendingTeams,  total: null,        icon: Clock,    color: 'text-amber-600',  bg: 'bg-amber-50'  },
                    { label: 'مباريات مكتملة',value: completedMatch,total: matches.length,icon: Swords, color: 'text-emerald-600',bg: 'bg-emerald-50'},
                    { label: 'إجمالي المباريات',value: matches.length,total: null,       icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
                ].map(stat => (
                    <div key={stat.label} className="bg-white border border-slate-200 rounded-2xl p-4">
                        <div className={`w-9 h-9 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
                            <stat.icon className={`w-4 h-4 ${stat.color}`} />
                        </div>
                        <p className="text-2xl font-black text-slate-900">
                            {stat.value}
                            {stat.total !== null && <span className="text-slate-400 font-normal text-sm"> / {stat.total}</span>}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Info + Next match */}
            <div className="grid sm:grid-cols-2 gap-4">

                {/* Tournament details */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-slate-700 mb-4">تفاصيل البطولة</h3>
                    <div className="space-y-3 text-sm">
                        {[
                            { icon: Trophy,   label: 'النظام',        value: TYPE_LABEL[t.type] || t.type },
                            { icon: MapPin,   label: 'الموقع',        value: [t.city, t.country].filter(Boolean).join('، ') || '—' },
                            { icon: Calendar, label: 'تاريخ البدء',   value: t.start_date ? new Date(t.start_date).toLocaleDateString('ar-EG', { dateStyle: 'long' }) : '—' },
                            { icon: Calendar, label: 'تاريخ الانتهاء',value: t.end_date   ? new Date(t.end_date).toLocaleDateString('ar-EG', { dateStyle: 'long' })   : '—' },
                        ].map(row => (
                            <div key={row.label} className="flex items-center gap-3">
                                <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <row.icon className="w-3.5 h-3.5 text-slate-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400">{row.label}</p>
                                    <p className="font-semibold text-slate-800 text-xs">{row.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Link href={`/tournament-portal/${id}/setup`}
                        className="mt-4 flex items-center gap-2 text-xs text-yellow-600 font-semibold hover:text-yellow-500 transition-colors">
                        <Settings className="w-3.5 h-3.5" /> تعديل الإعدادات <ChevronLeft className="w-3 h-3" />
                    </Link>
                </div>

                {/* Next match / Actions */}
                <div className="space-y-4">
                    {pendingTeams > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold text-amber-800 text-sm">{pendingTeams} فريق ينتظر الموافقة</p>
                                <p className="text-xs text-amber-600 mt-0.5">راجع طلبات التسجيل وأكد قبول الفرق</p>
                                <Link href={`/tournament-portal/${id}/registrations`}
                                    className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors">
                                    مراجعة الطلبات <ChevronLeft className="w-3 h-3" />
                                </Link>
                            </div>
                        </div>
                    )}

                    {nextMatch && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-4">
                            <p className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> المباراة القادمة
                            </p>
                            <p className="font-bold text-slate-800 text-sm">
                                {new Date(nextMatch.scheduled_at).toLocaleDateString('ar-EG', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {new Date(nextMatch.scheduled_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    )}

                    {/* Quick actions */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4">
                        <p className="text-xs font-bold text-slate-400 mb-3">إجراءات سريعة</p>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { href: 'registrations', label: 'الفرق',      icon: Users       },
                                { href: 'matches',       label: 'النتائج',    icon: Swords      },
                                { href: 'groups',        label: 'الترتيب',    icon: TrendingUp  },
                                { href: 'notifications', label: 'إشعار',      icon: Activity    },
                            ].map(a => (
                                <Link key={a.href} href={`/tournament-portal/${id}/${a.href}`}
                                    className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 hover:bg-yellow-50 hover:text-yellow-700 text-slate-600 transition-all text-xs font-semibold">
                                    <a.icon className="w-3.5 h-3.5" /> {a.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
