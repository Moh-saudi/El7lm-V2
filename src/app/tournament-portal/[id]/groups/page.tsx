'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, RefreshCw, Trophy, ArrowUp, Minus, ArrowDown, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { createPortalClient } from '@/lib/tournament-portal/auth';

type Standing = {
    id: string;
    team_id: string;
    group_id: string | null;
    category_id: string;
    played: number; won: number; drawn: number; lost: number;
    goals_for: number; goals_against: number; goal_diff: number; points: number;
    team?: { name: string; logo_url: string | null };
};

type Group = { id: string; name: string; sort_order: number };
type Category = { id: string; name: string; type: string; group_count: number | null };

export default function GroupsPage() {
    const { id } = useParams<{ id: string }>();
    const [categories,    setCategories]    = useState<Category[]>([]);
    const [selectedCat,   setSelectedCat]   = useState('');
    const [groups,        setGroups]        = useState<Group[]>([]);
    const [standings,     setStandings]     = useState<Standing[]>([]);
    const [loading,       setLoading]       = useState(true);
    const [recalculating, setRecalculating] = useState(false);

    // Group management state
    const [newGroupName,  setNewGroupName]  = useState('');
    const [addingGroup,   setAddingGroup]   = useState(false);
    const [editingId,     setEditingId]     = useState<string | null>(null);
    const [editingName,   setEditingName]   = useState('');
    const [customCount,   setCustomCount]   = useState(4);
    const [creatingAll,   setCreatingAll]   = useState(false);

    const supabase = createPortalClient();
    const API = '/api/tournament-portal/groups';

    // ── Load categories ──────────────────────────────────────────
    useEffect(() => {
        (async () => {
            const { data: cats } = await supabase
                .from('tournament_categories')
                .select('id, name, type, group_count')
                .eq('tournament_id', id)
                .order('sort_order');
            setCategories(cats || []);
            if (cats && cats.length > 0) setSelectedCat(cats[0].id);
            setLoading(false);
        })();
    }, [id]);

    // ── Load groups + standings ──────────────────────────────────
    const loadData = useCallback(async () => {
        if (!selectedCat) return;
        const [groupsJson, standingsRes] = await Promise.all([
            fetch(`${API}?tournament_id=${id}&category_id=${selectedCat}`).then(r => r.json()),
            supabase.from('tournament_standings')
                .select('*, team:tournament_teams(name, logo_url)')
                .eq('tournament_id', id)
                .eq('category_id', selectedCat)
                .order('points', { ascending: false })
                .order('goal_diff', { ascending: false })
                .order('goals_for', { ascending: false }),
        ]);
        setGroups(groupsJson.groups || []);
        setStandings(standingsRes.data || []);
    }, [selectedCat, id]);

    useEffect(() => { loadData(); }, [loadData]);

    const currentCat = categories.find(c => c.id === selectedCat);
    const groupNames = ['أ','ب','ج','د','هـ','و','ز','ح','ط','ي'];

    // ── إنشاء كل المجموعات دفعة واحدة ──────────────────────────
    const createAllGroups = async () => {
        if (!customCount || customCount < 2) { toast.error('يجب أن يكون عدد المجموعات 2 على الأقل'); return; }
        setCreatingAll(true);
        try {
            const res = await fetch(API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tournament_id: id, category_id: selectedCat, count: customCount }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setGroups(data.groups || []);
            toast.success(`تم إنشاء ${customCount} مجموعات`);
        } catch (e: any) {
            toast.error('فشل: ' + e.message);
        } finally {
            setCreatingAll(false);
        }
    };

    // ── إضافة مجموعة واحدة ──────────────────────────────────────
    const addGroup = async () => {
        const name = newGroupName.trim() || `المجموعة ${groupNames[groups.length] || (groups.length + 1)}`;
        setAddingGroup(true);
        const res = await fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tournament_id: id, category_id: selectedCat, name }),
        });
        const data = await res.json();
        if (!res.ok) { toast.error(data.error); }
        else { setNewGroupName(''); setGroups(prev => [...prev, data.group]); toast.success('تمت إضافة المجموعة'); }
        setAddingGroup(false);
    };

    // ── حذف مجموعة ──────────────────────────────────────────────
    const deleteGroup = async (groupId: string) => {
        const res = await fetch(`${API}?id=${groupId}`, { method: 'DELETE' });
        if (!res.ok) { const d = await res.json(); toast.error(d.error); return; }
        setGroups(prev => prev.filter(g => g.id !== groupId));
        toast.success('تم الحذف');
    };

    // ── تعديل اسم المجموعة ──────────────────────────────────────
    const saveGroupName = async (groupId: string) => {
        if (!editingName.trim()) return;
        const res = await fetch(API, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: groupId, name: editingName.trim() }),
        });
        if (!res.ok) { const d = await res.json(); toast.error(d.error); return; }
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, name: editingName.trim() } : g));
        setEditingId(null);
        toast.success('تم تحديث الاسم');
    };

    // ── إعادة حساب الترتيب ──────────────────────────────────────
    const recalculate = async () => {
        setRecalculating(true);
        try {
            const { data: matches } = await supabase
                .from('tournament_matches')
                .select('id, home_team_id, away_team_id, home_score, away_score, group_id')
                .eq('tournament_id', id)
                .eq('category_id', selectedCat)
                .eq('status', 'finished');

            if (!matches || matches.length === 0) {
                toast.info('لا توجد مباريات منتهية لحسابها بعد');
                setRecalculating(false);
                return;
            }

            const { data: teams } = await supabase
                .from('tournament_teams')
                .select('id, group_id')
                .eq('tournament_id', id)
                .eq('category_id', selectedCat)
                .eq('status', 'approved');

            if (!teams) { setRecalculating(false); return; }

            const map: Record<string, {
                team_id: string; group_id: string | null;
                played: number; won: number; drawn: number; lost: number;
                goals_for: number; goals_against: number;
            }> = {};

            for (const t of teams) {
                map[t.id] = { team_id: t.id, group_id: t.group_id, played: 0, won: 0, drawn: 0, lost: 0, goals_for: 0, goals_against: 0 };
            }

            for (const m of matches) {
                const hs = m.home_score ?? 0, as_ = m.away_score ?? 0;
                if (map[m.home_team_id]) {
                    map[m.home_team_id].played++;
                    map[m.home_team_id].goals_for += hs; map[m.home_team_id].goals_against += as_;
                    if (hs > as_) map[m.home_team_id].won++;
                    else if (hs === as_) map[m.home_team_id].drawn++;
                    else map[m.home_team_id].lost++;
                }
                if (map[m.away_team_id]) {
                    map[m.away_team_id].played++;
                    map[m.away_team_id].goals_for += as_; map[m.away_team_id].goals_against += hs;
                    if (as_ > hs) map[m.away_team_id].won++;
                    else if (as_ === hs) map[m.away_team_id].drawn++;
                    else map[m.away_team_id].lost++;
                }
            }

            for (const s of Object.values(map)) {
                const points = s.won * 3 + s.drawn;
                const goal_diff = s.goals_for - s.goals_against;
                await supabase.from('tournament_standings').upsert({
                    tournament_id: id, category_id: selectedCat,
                    team_id: s.team_id, group_id: s.group_id,
                    played: s.played, won: s.won, drawn: s.drawn, lost: s.lost,
                    goals_for: s.goals_for, goals_against: s.goals_against,
                    goal_diff, points,
                }, { onConflict: 'tournament_id,category_id,team_id' });
            }

            await loadData();
            toast.success('تم تحديث الترتيب بنجاح');
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

    const standingsForGroup = (groupId: string | null) =>
        [...standings].filter(s => s.group_id === groupId)
            .sort((a, b) => b.points - a.points || b.goal_diff - a.goal_diff || b.goals_for - a.goals_for);

    const allLeagueStandings = [...standings]
        .sort((a, b) => b.points - a.points || b.goal_diff - a.goal_diff || b.goals_for - a.goals_for);

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

            {/* ── إدارة المجموعات ── */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        إدارة المجموعات
                        {groups.length > 0 && (
                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-normal">{groups.length} مجموعة</span>
                        )}
                    </h3>
                    <button onClick={recalculate} disabled={recalculating}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-all">
                        {recalculating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        إعادة حساب الترتيب
                    </button>
                </div>

                {/* إنشاء دفعة */}
                <div className="flex items-center gap-3 flex-wrap bg-slate-50 rounded-xl p-3">
                    <span className="text-xs text-slate-500 font-semibold">إنشاء دفعة:</span>
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-500">عدد المجموعات:</label>
                        <input type="number" min={2} max={16}
                            value={customCount}
                            onChange={e => setCustomCount(Number(e.target.value))}
                            className="w-14 text-center text-sm font-bold border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                        {currentCat?.group_count && customCount !== currentCat.group_count && (
                            <button onClick={() => setCustomCount(currentCat.group_count!)}
                                className="text-[10px] text-blue-600 hover:underline">
                                إعادة تعيين ({currentCat.group_count})
                            </button>
                        )}
                    </div>
                    <button onClick={createAllGroups} disabled={creatingAll}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-all">
                        {creatingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        {groups.length > 0 ? 'إعادة إنشاء' : 'إنشاء المجموعات'}
                    </button>
                </div>

                {/* إضافة مجموعة واحدة */}
                <div className="flex items-center gap-2">
                    <input
                        value={newGroupName}
                        onChange={e => setNewGroupName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addGroup()}
                        placeholder={`اسم المجموعة (مثال: المجموعة ${groupNames[groups.length] || groups.length + 1})`}
                        className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                    <button onClick={addGroup} disabled={addingGroup}
                        className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold px-3 py-2 rounded-xl text-xs transition-all">
                        {addingGroup ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        إضافة مجموعة
                    </button>
                </div>

                {/* قائمة المجموعات للتعديل/الحذف */}
                {groups.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {groups.map(g => (
                            <div key={g.id} className="flex items-center gap-1 bg-slate-100 rounded-xl px-2 py-1">
                                {editingId === g.id ? (
                                    <>
                                        <input autoFocus value={editingName} onChange={e => setEditingName(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') saveGroupName(g.id); if (e.key === 'Escape') setEditingId(null); }}
                                            className="text-xs w-28 border border-blue-300 rounded px-1.5 py-0.5 bg-white outline-none" />
                                        <button onClick={() => saveGroupName(g.id)} className="text-emerald-600 hover:text-emerald-700">
                                            <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-xs font-semibold text-slate-700">{g.name}</span>
                                        <button onClick={() => { setEditingId(g.id); setEditingName(g.name); }}
                                            className="text-slate-400 hover:text-blue-500 transition-colors">
                                            <Edit2 className="w-3 h-3" />
                                        </button>
                                        <button onClick={() => deleteGroup(g.id)}
                                            className="text-slate-400 hover:text-rose-500 transition-colors">
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* League: single table */}
            {currentCat?.type === 'league' && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-3">
                        <h3 className="text-white font-black text-sm">ترتيب الدوري</h3>
                    </div>
                    <StandingsTable standings={allLeagueStandings} showRank />
                </div>
            )}

            {/* Groups + Knockout: per-group tables */}
            {(currentCat?.type === 'groups_knockout' || currentCat?.type === 'knockout') && groups.length > 0 && (
                <div className="grid sm:grid-cols-2 gap-5">
                    {groups.map(g => (
                        <div key={g.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-3">
                                <h3 className="text-white font-black text-sm">{g.name}</h3>
                            </div>
                            <StandingsTable standings={standingsForGroup(g.id)} showRank />
                        </div>
                    ))}
                </div>
            )}

            {groups.length === 0 && currentCat?.type !== 'league' && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-sm">
                    لا توجد مجموعات بعد — أنشئها من خانة «إدارة المجموعات» أعلاه
                </div>
            )}

            {standings.length === 0 && groups.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-xs">
                    لا توجد بيانات ترتيب بعد — أدخل نتائج المباريات ثم اضغط «إعادة حساب الترتيب»
                </div>
            )}
        </div>
    );
}

// ── Standings table ───────────────────────────────────────────
function StandingsTable({ standings, showRank }: { standings: Standing[]; showRank?: boolean }) {
    if (standings.length === 0) {
        return <p className="text-center text-slate-400 text-xs py-6">لا توجد فرق بعد — وزّع الفرق من صفحة القرعة</p>;
    }
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                        {showRank && <th className="px-3 py-2 text-right font-bold text-slate-500 w-8">#</th>}
                        <th className="px-3 py-2 text-right font-bold text-slate-500">الفريق</th>
                        <th className="px-2 py-2 text-center font-bold text-slate-500 w-8">لعب</th>
                        <th className="px-2 py-2 text-center font-bold text-slate-500 w-8">ف</th>
                        <th className="px-2 py-2 text-center font-bold text-slate-500 w-8">ت</th>
                        <th className="px-2 py-2 text-center font-bold text-slate-500 w-8">خ</th>
                        <th className="px-2 py-2 text-center font-bold text-slate-500 w-12">±</th>
                        <th className="px-3 py-2 text-center font-black text-slate-700 w-10">نق</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {standings.map((s, i) => (
                        <tr key={s.id || s.team_id}
                            className={`hover:bg-slate-50 transition-colors ${i < 2 ? 'border-r-2 border-emerald-400' : ''}`}>
                            {showRank && (
                                <td className="px-3 py-2.5"><RankIcon rank={i + 1} total={standings.length} /></td>
                            )}
                            <td className="px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                    {s.team?.logo_url ? (
                                        <img src={s.team.logo_url} alt={s.team.name} className="w-5 h-5 rounded object-cover" />
                                    ) : (
                                        <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-500">
                                            {s.team?.name?.charAt(0) || '?'}
                                        </div>
                                    )}
                                    <span className="font-semibold text-slate-800 truncate max-w-[100px]">{s.team?.name || '—'}</span>
                                </div>
                            </td>
                            <td className="px-2 py-2.5 text-center text-slate-600">{s.played}</td>
                            <td className="px-2 py-2.5 text-center text-emerald-600 font-semibold">{s.won}</td>
                            <td className="px-2 py-2.5 text-center text-slate-500">{s.drawn}</td>
                            <td className="px-2 py-2.5 text-center text-rose-500 font-semibold">{s.lost}</td>
                            <td className="px-2 py-2.5 text-center">
                                <span className={`font-bold ${s.goal_diff > 0 ? 'text-emerald-600' : s.goal_diff < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                                    {s.goal_diff > 0 ? '+' : ''}{s.goal_diff}
                                </span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                                <span className="font-black text-slate-900 text-sm">{s.points}</span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function RankIcon({ rank, total }: { rank: number; total: number }) {
    if (rank === 1) return <Trophy className="w-3.5 h-3.5 text-yellow-500" />;
    if (rank <= Math.ceil(total * 0.4)) return <ArrowUp className="w-3 h-3 text-emerald-500" />;
    if (rank > Math.floor(total * 0.7)) return <ArrowDown className="w-3 h-3 text-rose-400" />;
    return <Minus className="w-3 h-3 text-slate-300" />;
}
