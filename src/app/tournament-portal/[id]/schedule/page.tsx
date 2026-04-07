'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, CalendarDays, MapPin, Clock, Filter, ChevronDown } from 'lucide-react';
import { createPortalClient } from '@/lib/tournament-portal/auth';

type Category = { id: string; name: string };
type Match = {
    id: string;
    match_date: string | null;
    venue: string | null;
    round: string | null;
    status: string;
    home_score: number | null;
    away_score: number | null;
    home_team: { name: string; logo_url: string | null } | null;
    away_team: { name: string; logo_url: string | null } | null;
    category: { name: string } | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    scheduled: { label: 'مجدولة',  color: 'bg-blue-100 text-blue-700' },
    ongoing:   { label: 'جارية',   color: 'bg-emerald-100 text-emerald-700' },
    finished:  { label: 'انتهت',   color: 'bg-slate-100 text-slate-600' },
    postponed: { label: 'مؤجلة',   color: 'bg-amber-100 text-amber-700' },
    cancelled: { label: 'ملغاة',   color: 'bg-rose-100 text-rose-600' },
};

export default function SchedulePage() {
    const { id } = useParams<{ id: string }>();
    const [categories,  setCategories]  = useState<Category[]>([]);
    const [matches,     setMatches]     = useState<Match[]>([]);
    const [loading,     setLoading]     = useState(true);
    const [filterCat,   setFilterCat]   = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [viewMode,    setViewMode]    = useState<'list' | 'calendar'>('list');

    const supabase = createPortalClient();

    useEffect(() => {
        (async () => {
            const { data: cats } = await supabase
                .from('tournament_categories')
                .select('id, name')
                .eq('tournament_id', id)
                .order('sort_order');
            setCategories(cats || []);
            setLoading(false);
        })();
    }, [id]);

    const loadMatches = useCallback(async () => {
        const query = supabase
            .from('tournament_matches')
            .select(`
                id, match_date, venue, round, status, home_score, away_score,
                home_team:tournament_teams!home_team_id(name, logo_url),
                away_team:tournament_teams!away_team_id(name, logo_url),
                category:tournament_categories!category_id(name)
            `)
            .eq('tournament_id', id)
            .order('match_date', { ascending: true });

        if (filterCat !== 'all') query.eq('category_id', filterCat);
        if (filterStatus !== 'all') query.eq('status', filterStatus);

        const { data } = await query;
        setMatches((data as any) || []);
    }, [id, filterCat, filterStatus]);

    useEffect(() => { loadMatches(); }, [loadMatches]);

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
        </div>
    );

    // Group matches by date
    const byDate: Record<string, Match[]> = {};
    for (const m of matches) {
        const dateKey = m.match_date
            ? new Date(m.match_date).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
            : 'غير محدد';
        if (!byDate[dateKey]) byDate[dateKey] = [];
        byDate[dateKey].push(m);
    }

    const dateGroups = Object.entries(byDate);
    const upcoming = matches.filter(m => m.status === 'scheduled').length;
    const finished  = matches.filter(m => m.status === 'finished').length;

    return (
        <div className="space-y-5" dir="rtl">

            {/* Summary bar */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-black text-slate-900">{matches.length}</p>
                    <p className="text-xs text-slate-500 mt-0.5">إجمالي المباريات</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-black text-blue-600">{upcoming}</p>
                    <p className="text-xs text-slate-500 mt-0.5">مجدولة</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-black text-emerald-600">{finished}</p>
                    <p className="text-xs text-slate-500 mt-0.5">منتهية</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center gap-3">
                <CalendarDays className="w-4 h-4 text-slate-400" />

                {/* Category filter */}
                <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-yellow-400 bg-white">
                    <option value="all">كل الفئات</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                {/* Status filter */}
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-yellow-400 bg-white">
                    <option value="all">كل الحالات</option>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                    ))}
                </select>

                {/* View mode */}
                <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mr-auto">
                    <button onClick={() => setViewMode('list')}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${viewMode === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
                        قائمة
                    </button>
                    <button onClick={() => setViewMode('calendar')}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${viewMode === 'calendar' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
                        تقويم
                    </button>
                </div>
            </div>

            {/* No matches */}
            {matches.length === 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-sm">
                    لا توجد مباريات — أضف مباريات من صفحة «المباريات»
                </div>
            )}

            {/* List view: grouped by date */}
            {viewMode === 'list' && dateGroups.map(([date, dayMatches]) => (
                <div key={date} className="space-y-2">
                    {/* Date header */}
                    <div className="flex items-center gap-3">
                        <div className="bg-yellow-500 text-white text-[11px] font-black px-3 py-1 rounded-full">
                            {date}
                        </div>
                        <div className="flex-1 h-px bg-slate-100" />
                        <span className="text-[11px] text-slate-400">{dayMatches.length} مباراة</span>
                    </div>

                    {/* Matches on this day */}
                    <div className="space-y-2">
                        {dayMatches.map(m => (
                            <ScheduleCard key={m.id} match={m} />
                        ))}
                    </div>
                </div>
            ))}

            {/* Calendar view: just render a compact grid by month */}
            {viewMode === 'calendar' && <CalendarView matches={matches} />}
        </div>
    );
}

// ── Schedule match card ───────────────────────────────────────
function ScheduleCard({ match }: { match: Match }) {
    const cfg = STATUS_CONFIG[match.status] || STATUS_CONFIG.scheduled;
    const time = match.match_date
        ? new Date(match.match_date).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
        : null;
    const finished = match.status === 'finished';

    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-3">

                {/* Time + status */}
                <div className="text-center w-14 flex-shrink-0">
                    {time && <p className="text-xs font-black text-slate-700">{time}</p>}
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${cfg.color}`}>
                        {cfg.label}
                    </span>
                </div>

                {/* Teams */}
                <div className="flex-1 flex items-center gap-3">
                    {/* Home */}
                    <div className="flex-1 flex items-center gap-2 justify-end">
                        <span className={`text-sm font-bold truncate ${finished && (match.home_score ?? 0) > (match.away_score ?? 0) ? 'text-emerald-700' : 'text-slate-800'}`}>
                            {match.home_team?.name || '—'}
                        </span>
                        {match.home_team?.logo_url ? (
                            <img src={match.home_team.logo_url} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />
                        ) : (
                            <div className="w-7 h-7 rounded bg-slate-100 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                {match.home_team?.name?.charAt(0) || '?'}
                            </div>
                        )}
                    </div>

                    {/* Score / VS */}
                    <div className="flex-shrink-0 w-16 text-center">
                        {finished ? (
                            <div className="bg-slate-900 text-white rounded-xl px-2 py-1 inline-block">
                                <span className="font-black text-sm tracking-wider">
                                    {match.home_score ?? 0} - {match.away_score ?? 0}
                                </span>
                            </div>
                        ) : (
                            <span className="text-slate-400 font-black text-sm">VS</span>
                        )}
                    </div>

                    {/* Away */}
                    <div className="flex-1 flex items-center gap-2">
                        {match.away_team?.logo_url ? (
                            <img src={match.away_team.logo_url} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />
                        ) : (
                            <div className="w-7 h-7 rounded bg-slate-100 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                {match.away_team?.name?.charAt(0) || '?'}
                            </div>
                        )}
                        <span className={`text-sm font-bold truncate ${finished && (match.away_score ?? 0) > (match.home_score ?? 0) ? 'text-emerald-700' : 'text-slate-800'}`}>
                            {match.away_team?.name || '—'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer: venue + category + round */}
            <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-slate-50">
                {match.venue && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <MapPin className="w-3 h-3" /> {match.venue}
                    </div>
                )}
                {match.category?.name && (
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                        {match.category.name}
                    </span>
                )}
                {match.round && (
                    <span className="text-[10px] bg-indigo-50 text-indigo-600 font-semibold px-2 py-0.5 rounded-full">
                        {match.round}
                    </span>
                )}
            </div>
        </div>
    );
}

// ── Minimal calendar view ─────────────────────────────────────
function CalendarView({ matches }: { matches: Match[] }) {
    const [currentMonth, setCurrentMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });

    const year  = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Map date string → matches
    const dateMap: Record<string, Match[]> = {};
    for (const m of matches) {
        if (!m.match_date) continue;
        const d = new Date(m.match_date);
        if (d.getFullYear() === year && d.getMonth() === month) {
            const key = d.getDate().toString();
            if (!dateMap[key]) dateMap[key] = [];
            dateMap[key].push(m);
        }
    }

    const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
    const monthName = currentMonth.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });

    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            {/* Month nav */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <button onClick={prevMonth} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                    <ChevronDown className="w-4 h-4 rotate-90" />
                </button>
                <h3 className="font-black text-slate-800 text-sm">{monthName}</h3>
                <button onClick={nextMonth} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                    <ChevronDown className="w-4 h-4 -rotate-90" />
                </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 text-center border-b border-slate-100">
                {['أحد','إثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'].map(d => (
                    <div key={d} className="py-2 text-[10px] font-bold text-slate-400">{d}</div>
                ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7">
                {cells.map((day, i) => {
                    const dayMatches = day ? (dateMap[day.toString()] || []) : [];
                    const isToday = day && new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
                    return (
                        <div key={i} className={`min-h-[60px] border-b border-r border-slate-50 p-1.5 ${!day ? 'bg-slate-50/50' : ''}`}>
                            {day && (
                                <>
                                    <span className={`text-[11px] font-bold block w-5 h-5 flex items-center justify-center rounded-full mb-1
                                        ${isToday ? 'bg-yellow-500 text-white' : 'text-slate-600'}`}>
                                        {day}
                                    </span>
                                    <div className="space-y-0.5">
                                        {dayMatches.slice(0, 2).map(m => (
                                            <div key={m.id} className="bg-blue-100 text-blue-700 text-[9px] font-bold px-1 rounded truncate">
                                                {m.home_team?.name?.split(' ')[0]} - {m.away_team?.name?.split(' ')[0]}
                                            </div>
                                        ))}
                                        {dayMatches.length > 2 && (
                                            <div className="text-[9px] text-slate-400 font-bold">+{dayMatches.length - 2} أخرى</div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
