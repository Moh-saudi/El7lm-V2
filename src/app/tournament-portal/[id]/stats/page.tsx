'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, RefreshCw, Target, Shield, Award, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { createPortalClient } from '@/lib/tournament-portal/auth';

type Category = { id: string; name: string };
type TopScorer = {
    id: string;
    team_id: string;
    player_id: string | null;
    player_name: string;
    goals: number;
    assists: number;
    yellow_cards: number;
    red_cards: number;
    matches_played: number;
    team?: { name: string; logo_url: string | null };
};
type TeamStat = {
    team_id: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goals_for: number;
    goals_against: number;
    goal_diff: number;
    points: number;
    team?: { name: string; logo_url: string | null };
};

export default function StatsPage() {
    const { id } = useParams<{ id: string }>();
    const [categories,    setCategories]    = useState<Category[]>([]);
    const [selectedCat,   setSelectedCat]   = useState('');
    const [topScorers,    setTopScorers]    = useState<TopScorer[]>([]);
    const [teamStats,     setTeamStats]     = useState<TeamStat[]>([]);
    const [activeTab,     setActiveTab]     = useState<'scorers' | 'team_attack' | 'team_defense' | 'cards'>('scorers');
    const [loading,       setLoading]       = useState(true);
    const [recalculating, setRecalculating] = useState(false);

    const supabase = createPortalClient();

    useEffect(() => {
        (async () => {
            const { data: cats } = await supabase
                .from('tournament_categories')
                .select('id, name')
                .eq('tournament_id', id)
                .order('sort_order');
            setCategories(cats || []);
            if (cats && cats.length > 0) setSelectedCat(cats[0].id);
            setLoading(false);
        })();
    }, [id]);

    const loadData = useCallback(async () => {
        if (!selectedCat) return;
        const [scorersRes, standingsRes] = await Promise.all([
            supabase.from('tournament_top_scorers')
                .select('*, team:tournament_teams(name, logo_url)')
                .eq('tournament_id', id)
                .eq('category_id', selectedCat)
                .order('goals', { ascending: false })
                .order('assists', { ascending: false })
                .limit(30),
            supabase.from('tournament_standings')
                .select('*, team:tournament_teams(name, logo_url)')
                .eq('tournament_id', id)
                .eq('category_id', selectedCat)
                .order('goals_for', { ascending: false }),
        ]);
        setTopScorers((scorersRes.data as any) || []);
        setTeamStats((standingsRes.data as any) || []);
    }, [selectedCat, id]);

    useEffect(() => { loadData(); }, [loadData]);

    // ── Recalculate scorers from match events ────────────────
    const recalculate = async () => {
        setRecalculating(true);
        try {
            // Fetch all match events for this category
            const { data: events } = await supabase
                .from('tournament_match_events')
                .select(`
                    event_type, player_name, team_id, match_id,
                    match:tournament_matches!match_id(category_id)
                `)
                .eq('tournament_id', id);

            const filtered = (events || []).filter((e: any) => e.match?.category_id === selectedCat);

            // Aggregate by player_name + team_id
            const map: Record<string, {
                player_name: string; team_id: string;
                goals: number; assists: number;
                yellow_cards: number; red_cards: number;
                matches: Set<string>;
            }> = {};

            for (const ev of filtered) {
                const key = `${ev.player_name}__${ev.team_id}`;
                if (!map[key]) {
                    map[key] = {
                        player_name: ev.player_name, team_id: ev.team_id,
                        goals: 0, assists: 0, yellow_cards: 0, red_cards: 0,
                        matches: new Set(),
                    };
                }
                map[key].matches.add(ev.match_id);
                if (ev.event_type === 'goal' || ev.event_type === 'penalty_scored') map[key].goals++;
                if (ev.event_type === 'assist')                                      map[key].assists++;
                if (ev.event_type === 'yellow_card' || ev.event_type === 'second_yellow') map[key].yellow_cards++;
                if (ev.event_type === 'red_card')                                    map[key].red_cards++;
            }

            // Upsert top scorers
            for (const s of Object.values(map)) {
                if (s.goals === 0 && s.assists === 0 && s.yellow_cards === 0 && s.red_cards === 0) continue;
                await supabase.from('tournament_top_scorers').upsert({
                    tournament_id:  id,
                    category_id:    selectedCat,
                    team_id:        s.team_id,
                    player_name:    s.player_name,
                    goals:          s.goals,
                    assists:        s.assists,
                    yellow_cards:   s.yellow_cards,
                    red_cards:      s.red_cards,
                    matches_played: s.matches.size,
                }, { onConflict: 'tournament_id,category_id,team_id,player_name' });
            }

            await loadData();
            toast.success('تم تحديث الإحصائيات');
        } catch (e: any) {
            toast.error('فشل الحساب: ' + e.message);
        } finally {
            setRecalculating(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
        </div>
    );

    // Sorted team stats views
    const byAttack  = [...teamStats].sort((a, b) => b.goals_for - a.goals_for);
    const byDefense = [...teamStats].sort((a, b) => a.goals_against - b.goals_against);

    // Summary KPIs
    const totalGoals   = topScorers.reduce((s, p) => s + p.goals, 0);
    const totalMatches = [...new Set(teamStats.map(t => t.played))].reduce((a, b) => a + b, 0) / 2;
    const avgGoals     = totalMatches > 0 ? (totalGoals / totalMatches).toFixed(1) : '—';
    const topScorer    = topScorers[0];
    const mostCards    = [...topScorers].sort((a, b) => (b.yellow_cards + b.red_cards * 3) - (a.yellow_cards + a.red_cards * 3))[0];

    return (
        <div className="space-y-5" dir="rtl">

            {/* Category tabs */}
            {categories.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                    {categories.map(c => (
                        <button key={c.id} onClick={() => setSelectedCat(c.id)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all
                                ${selectedCat === c.id ? 'bg-yellow-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-yellow-300'}`}>
                            {c.name}
                        </button>
                    ))}
                </div>
            )}

            {/* KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KpiCard icon={<Target className="w-4 h-4 text-emerald-500" />} label="إجمالي الأهداف" value={totalGoals} />
                <KpiCard icon={<TrendingUp className="w-4 h-4 text-blue-500" />} label="متوسط أهداف/مباراة" value={avgGoals} />
                <KpiCard icon={<Award className="w-4 h-4 text-yellow-500" />}
                    label="الهداف الأول" value={topScorer ? `${topScorer.player_name} (${topScorer.goals})` : '—'} small />
                <KpiCard icon={<Shield className="w-4 h-4 text-slate-400" />}
                    label="الأقل استقبالاً" value={byDefense[0]?.team?.name || '—'} small />
            </div>

            {/* Recalculate + tabs */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-1 bg-slate-100 rounded-xl p-1 flex-wrap">
                    {([
                        { key: 'scorers',      label: 'الهدافون' },
                        { key: 'team_attack',  label: 'الهجوم' },
                        { key: 'team_defense', label: 'الدفاع' },
                        { key: 'cards',        label: 'البطاقات' },
                    ] as const).map(t => (
                        <button key={t.key} onClick={() => setActiveTab(t.key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                                ${activeTab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>
                <button onClick={recalculate} disabled={recalculating}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all">
                    {recalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    إعادة حساب
                </button>
            </div>

            {/* Tab content */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">

                {/* Top Scorers */}
                {activeTab === 'scorers' && (
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-3 py-2.5 text-right font-bold text-slate-500 w-8">#</th>
                                <th className="px-3 py-2.5 text-right font-bold text-slate-500">اللاعب</th>
                                <th className="px-3 py-2.5 text-right font-bold text-slate-500">الفريق</th>
                                <th className="px-2 py-2.5 text-center font-bold text-slate-500">م</th>
                                <th className="px-2 py-2.5 text-center font-black text-emerald-600">أهداف</th>
                                <th className="px-2 py-2.5 text-center font-bold text-blue-500">صنع</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {topScorers.length === 0 ? (
                                <tr><td colSpan={6} className="py-8 text-center text-slate-400">لا توجد إحصائيات — احسب أولاً</td></tr>
                            ) : topScorers.map((p, i) => (
                                <tr key={p.id} className="hover:bg-slate-50">
                                    <td className="px-3 py-2.5">
                                        {i === 0 ? <Award className="w-4 h-4 text-yellow-500" /> :
                                         i === 1 ? <span className="text-slate-400 font-bold">2</span> :
                                         i === 2 ? <span className="text-amber-600 font-bold">3</span> :
                                         <span className="text-slate-300">{i + 1}</span>}
                                    </td>
                                    <td className="px-3 py-2.5 font-semibold text-slate-800">{p.player_name}</td>
                                    <td className="px-3 py-2.5">
                                        <div className="flex items-center gap-1.5">
                                            {p.team?.logo_url && <img src={p.team.logo_url} alt="" className="w-4 h-4 rounded object-cover" />}
                                            <span className="text-slate-500 truncate max-w-[80px]">{p.team?.name || '—'}</span>
                                        </div>
                                    </td>
                                    <td className="px-2 py-2.5 text-center text-slate-500">{p.matches_played}</td>
                                    <td className="px-2 py-2.5 text-center">
                                        <span className="font-black text-emerald-600 text-sm">{p.goals}</span>
                                    </td>
                                    <td className="px-2 py-2.5 text-center text-blue-500 font-semibold">{p.assists}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Team Attack */}
                {activeTab === 'team_attack' && (
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-3 py-2.5 text-right font-bold text-slate-500 w-8">#</th>
                                <th className="px-3 py-2.5 text-right font-bold text-slate-500">الفريق</th>
                                <th className="px-2 py-2.5 text-center font-bold text-slate-500">م</th>
                                <th className="px-2 py-2.5 text-center font-black text-emerald-600">أهداف</th>
                                <th className="px-2 py-2.5 text-center font-bold text-slate-500">متوسط</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {byAttack.map((t, i) => (
                                <tr key={t.team_id} className="hover:bg-slate-50">
                                    <td className="px-3 py-2.5 text-slate-400 font-bold">{i + 1}</td>
                                    <td className="px-3 py-2.5">
                                        <div className="flex items-center gap-2">
                                            {t.team?.logo_url && <img src={t.team.logo_url} alt="" className="w-5 h-5 rounded object-cover" />}
                                            <span className="font-semibold text-slate-800">{t.team?.name || '—'}</span>
                                        </div>
                                    </td>
                                    <td className="px-2 py-2.5 text-center text-slate-500">{t.played}</td>
                                    <td className="px-2 py-2.5 text-center font-black text-emerald-600 text-sm">{t.goals_for}</td>
                                    <td className="px-2 py-2.5 text-center text-slate-500">
                                        {t.played > 0 ? (t.goals_for / t.played).toFixed(1) : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Team Defense */}
                {activeTab === 'team_defense' && (
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-3 py-2.5 text-right font-bold text-slate-500 w-8">#</th>
                                <th className="px-3 py-2.5 text-right font-bold text-slate-500">الفريق</th>
                                <th className="px-2 py-2.5 text-center font-bold text-slate-500">م</th>
                                <th className="px-2 py-2.5 text-center font-black text-rose-500">استقبل</th>
                                <th className="px-2 py-2.5 text-center font-bold text-slate-500">متوسط</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {byDefense.map((t, i) => (
                                <tr key={t.team_id} className="hover:bg-slate-50">
                                    <td className="px-3 py-2.5 text-slate-400 font-bold">{i + 1}</td>
                                    <td className="px-3 py-2.5">
                                        <div className="flex items-center gap-2">
                                            {t.team?.logo_url && <img src={t.team.logo_url} alt="" className="w-5 h-5 rounded object-cover" />}
                                            <span className="font-semibold text-slate-800">{t.team?.name || '—'}</span>
                                        </div>
                                    </td>
                                    <td className="px-2 py-2.5 text-center text-slate-500">{t.played}</td>
                                    <td className="px-2 py-2.5 text-center font-black text-rose-500 text-sm">{t.goals_against}</td>
                                    <td className="px-2 py-2.5 text-center text-slate-500">
                                        {t.played > 0 ? (t.goals_against / t.played).toFixed(1) : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Cards */}
                {activeTab === 'cards' && (
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-3 py-2.5 text-right font-bold text-slate-500 w-8">#</th>
                                <th className="px-3 py-2.5 text-right font-bold text-slate-500">اللاعب</th>
                                <th className="px-3 py-2.5 text-right font-bold text-slate-500">الفريق</th>
                                <th className="px-2 py-2.5 text-center">🟨</th>
                                <th className="px-2 py-2.5 text-center">🟥</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {[...topScorers]
                                .filter(p => p.yellow_cards > 0 || p.red_cards > 0)
                                .sort((a, b) => (b.yellow_cards + b.red_cards * 3) - (a.yellow_cards + a.red_cards * 3))
                                .map((p, i) => (
                                <tr key={p.id} className="hover:bg-slate-50">
                                    <td className="px-3 py-2.5 text-slate-400">{i + 1}</td>
                                    <td className="px-3 py-2.5 font-semibold text-slate-800">{p.player_name}</td>
                                    <td className="px-3 py-2.5 text-slate-500">{p.team?.name || '—'}</td>
                                    <td className="px-2 py-2.5 text-center font-bold text-yellow-600">{p.yellow_cards}</td>
                                    <td className="px-2 py-2.5 text-center font-bold text-red-600">{p.red_cards}</td>
                                </tr>
                            ))}
                            {topScorers.filter(p => p.yellow_cards > 0 || p.red_cards > 0).length === 0 && (
                                <tr><td colSpan={5} className="py-8 text-center text-slate-400">لا توجد بطاقات مسجلة</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

function KpiCard({ icon, label, value, small }: { icon: React.ReactNode; label: string; value: any; small?: boolean }) {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <span className="text-xs text-slate-500 font-medium">{label}</span>
            </div>
            <p className={`font-black text-slate-900 ${small ? 'text-sm truncate' : 'text-2xl'}`}>{value}</p>
        </div>
    );
}
