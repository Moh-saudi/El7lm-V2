'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
    Shuffle, Save, Loader2, Trophy, Users, AlertCircle,
    Plus, Trash2, ArrowLeftRight, X, ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { createPortalClient } from '@/lib/tournament-portal/auth';

type Team  = { id: string; name: string; logo_url: string | null; seed: number | null; group_id: string | null; category_id: string | null };
type Group = { id: string; name: string; teams: Team[] };
type Category = { id: string; name: string; type: string; group_count: number | null; teams_per_group: number | null };

export default function DrawPage() {
    const { id } = useParams<{ id: string }>();
    const [categories,      setCategories]      = useState<Category[]>([]);
    const [selectedCat,     setSelectedCat]     = useState('');
    const [allTeams,        setAllTeams]        = useState<Team[]>([]);
    const [groups,          setGroups]          = useState<Group[]>([]);
    const [loading,         setLoading]         = useState(true);
    const [saving,          setSaving]          = useState(false);
    const [customGroupCount,setCustomGroupCount] = useState(4);
    const [creatingGroups,  setCreatingGroups]  = useState(false);

    // تحديد فريق للنقل
    const [selectedTeam,    setSelectedTeam]    = useState<{ team: Team; fromGroupId: string | null } | null>(null);

    const supabase = createPortalClient();

    // ── جلب الفئات ──────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            const { data: cats } = await supabase
                .from('tournament_categories')
                .select('id, name, type, group_count, teams_per_group')
                .eq('tournament_id', id);
            setCategories(cats || []);
            if (cats && cats.length > 0) {
                setSelectedCat(cats[0].id);
                if (cats[0].group_count) setCustomGroupCount(cats[0].group_count);
            }
            setLoading(false);
        })();
    }, [id]);

    // ── جلب الفرق والمجموعات ────────────────────────────────────
    const loadTeamsAndGroups = async (catId: string) => {
        let q = supabase.from('tournament_teams')
            .select('id, name, logo_url, seed, group_id, category_id')
            .eq('tournament_id', id).eq('status', 'approved');
        if (catId !== 'all') q = (q as any).or(`category_id.eq.${catId},category_id.is.null`);

        const [teamsRes, groupsRes] = await Promise.all([
            q,
            supabase.from('tournament_groups').select('id, name')
                .eq('tournament_id', id)
                .eq('category_id', catId === 'all' ? '' : catId)
                .order('sort_order'),
        ]);

        const teams  = (teamsRes.data || []).map((t: any) => ({
            ...t, category_id: t.category_id ?? (catId !== 'all' ? catId : null),
        }));
        const gData  = groupsRes.data || [];
        const grouped: Group[] = gData.map((g: any) => ({
            id: g.id, name: g.name,
            teams: teams.filter((t: any) => t.group_id === g.id),
        }));

        setAllTeams(teams);
        setGroups(grouped);
        setSelectedTeam(null);
    };

    useEffect(() => { if (selectedCat) loadTeamsAndGroups(selectedCat); }, [selectedCat]);

    const currentCat  = categories.find(c => c.id === selectedCat);
    // الفرق غير الموزعة
    const assignedIds = new Set(groups.flatMap(g => g.teams.map(t => t.id)));
    const unassigned  = allTeams.filter(t => !assignedIds.has(t.id));

    // ── إنشاء المجموعات ──────────────────────────────────────────
    const createGroups = async () => {
        if (customGroupCount < 2) { toast.error('يجب 2 مجموعات على الأقل'); return; }
        setCreatingGroups(true);
        const res = await fetch('/api/tournament-portal/groups', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tournament_id: id, category_id: selectedCat, count: customGroupCount }),
        });
        const data = await res.json();
        if (!res.ok) { toast.error(data.error); setCreatingGroups(false); return; }
        const newGroups: Group[] = (data.groups || []).map((g: any) => ({ ...g, teams: [] }));
        setGroups(newGroups);
        setSelectedTeam(null);
        toast.success(`تم إنشاء ${customGroupCount} مجموعات`);
        setCreatingGroups(false);
    };

    // ── حذف مجموعة ───────────────────────────────────────────────
    const deleteGroup = async (groupId: string) => {
        const res = await fetch(`/api/tournament-portal/groups?id=${groupId}`, { method: 'DELETE' });
        if (!res.ok) { const d = await res.json(); toast.error(d.error); return; }
        // الفرق الموجودة في هذه المجموعة تصبح غير موزعة
        setGroups(prev => prev.filter(g => g.id !== groupId));
        setSelectedTeam(null);
        toast.success('تم حذف المجموعة');
    };

    // ── تحديد فريق للنقل (نقر أول) ─────────────────────────────
    const selectTeam = (team: Team, fromGroupId: string | null) => {
        if (selectedTeam?.team.id === team.id) {
            setSelectedTeam(null); // إلغاء التحديد
            return;
        }
        setSelectedTeam({ team, fromGroupId });
        toast.info(`محدد: ${team.name} — اختر المجموعة المستهدفة`, { duration: 2000 });
    };

    // ── نقل الفريق المحدد إلى مجموعة (نقر ثاني على المجموعة) ──
    const moveSelectedToGroup = (toGroupId: string) => {
        if (!selectedTeam) return;
        const { team, fromGroupId } = selectedTeam;

        if (fromGroupId === toGroupId) { setSelectedTeam(null); return; }

        setGroups(prev => prev.map(g => {
            if (g.id === fromGroupId) return { ...g, teams: g.teams.filter(t => t.id !== team.id) };
            if (g.id === toGroupId)   return { ...g, teams: [...g.teams, { ...team, group_id: toGroupId }] };
            return g;
        }));
        setSelectedTeam(null);
        toast.success(`تم نقل ${team.name} إلى ${groups.find(g => g.id === toGroupId)?.name}`);
    };

    // ── إزالة فريق من مجموعة (عودة للقائمة غير الموزعة) ────────
    const removeFromGroup = (team: Team, groupId: string) => {
        if (selectedTeam?.team.id === team.id) setSelectedTeam(null);
        setGroups(prev => prev.map(g =>
            g.id === groupId ? { ...g, teams: g.teams.filter(t => t.id !== team.id) } : g
        ));
    };

    // ── إضافة فريق غير موزع إلى مجموعة ─────────────────────────
    const addUnassignedToGroup = (team: Team, toGroupId: string) => {
        setGroups(prev => prev.map(g =>
            g.id === toGroupId ? { ...g, teams: [...g.teams, { ...team, group_id: toGroupId }] } : g
        ));
    };

    // ── مبادلة فريقين بين مجموعتين ──────────────────────────────
    const swapWithTeam = (targetTeam: Team, targetGroupId: string) => {
        if (!selectedTeam) return;
        const { team: srcTeam, fromGroupId: srcGroupId } = selectedTeam;
        if (srcTeam.id === targetTeam.id) { setSelectedTeam(null); return; }

        setGroups(prev => prev.map(g => {
            if (g.id === srcGroupId && g.id === targetGroupId) {
                // نفس المجموعة — لا شيء
                return g;
            }
            if (g.id === srcGroupId) {
                return { ...g, teams: g.teams.map(t => t.id === srcTeam.id ? { ...targetTeam, group_id: g.id } : t) };
            }
            if (g.id === targetGroupId) {
                return { ...g, teams: g.teams.map(t => t.id === targetTeam.id ? { ...srcTeam, group_id: g.id } : t) };
            }
            return g;
        }));
        setSelectedTeam(null);
        toast.success(`تم تبديل ${srcTeam.name} ↔ ${targetTeam.name}`);
    };

    // ── القرعة العشوائية ─────────────────────────────────────────
    const performDraw = () => {
        if (groups.length === 0) { toast.error('أنشئ المجموعات أولاً'); return; }
        if (allTeams.length === 0) { toast.error('لا توجد فرق مقبولة'); return; }

        const seeded   = [...allTeams.filter(t => t.seed)].sort((a, b) => (a.seed || 99) - (b.seed || 99));
        const unseeded = [...allTeams.filter(t => !t.seed)].sort(() => Math.random() - 0.5);

        const distributed: Group[] = groups.map(g => ({ ...g, teams: [] }));
        seeded.forEach((team, i) => {
            if (distributed[i % groups.length]) distributed[i % groups.length].teams.push(team);
        });
        let gi = 0;
        for (const team of unseeded) {
            const max = currentCat?.teams_per_group || 999;
            let attempts = 0;
            while (distributed[gi].teams.length >= max && attempts < groups.length) {
                gi = (gi + 1) % groups.length; attempts++;
            }
            distributed[gi].teams.push(team);
            gi = (gi + 1) % groups.length;
        }
        setGroups(distributed);
        setSelectedTeam(null);
        toast.success('تمت القرعة — راجع التوزيع وعدّله إذا أردت ثم احفظ');
    };

    // ── حفظ القرعة عبر API ───────────────────────────────────────
    const saveDraw = async () => {
        setSaving(true);
        const res = await fetch('/api/tournament-portal/save-draw', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                category_id: selectedCat !== 'all' ? selectedCat : null,
                groups: groups.map(g => ({ id: g.id, teams: g.teams.map(t => ({ id: t.id, category_id: t.category_id })) })),
            }),
        });
        const data = await res.json();
        if (!res.ok) { toast.error(data.error); }
        else { toast.success('تم حفظ القرعة بنجاح'); }
        setSaving(false);
    };

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
        </div>
    );

    const isDrawn = groups.some(g => g.teams.length > 0);

    return (
        <div className="space-y-5" dir="rtl">

            {/* Category tabs */}
            {categories.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                    {categories.map(c => (
                        <button key={c.id}
                            onClick={() => { setSelectedCat(c.id); if (c.group_count) setCustomGroupCount(c.group_count); }}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all
                                ${selectedCat === c.id ? 'bg-yellow-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-yellow-300'}`}>
                            {c.name}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Toolbar ── */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-4 text-sm flex-wrap">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                        <Users className="w-4 h-4 text-slate-400" /> {allTeams.length} فريق
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-500">
                        <Trophy className="w-4 h-4 text-slate-400" /> {groups.length} مجموعة
                    </span>
                    {unassigned.length > 0 && (
                        <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                            {unassigned.length} غير موزع
                        </span>
                    )}
                </div>

                <div className="flex gap-2 mr-auto flex-wrap">
                    <button onClick={performDraw} disabled={groups.length === 0}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-4 py-2 rounded-xl text-sm transition-all">
                        <Shuffle className="w-4 h-4" /> {isDrawn ? 'إعادة القرعة' : 'قرعة عشوائية'}
                    </button>
                    {isDrawn && (
                        <button onClick={saveDraw} disabled={saving}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-50">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            حفظ القرعة
                        </button>
                    )}
                </div>
            </div>

            {/* No teams */}
            {allTeams.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold text-amber-800 text-sm">لا توجد فرق مقبولة بعد</p>
                        <p className="text-xs text-amber-600 mt-1">اذهب لصفحة التسجيلات واقبل الفرق أولاً</p>
                    </div>
                </div>
            )}

            {/* ── إنشاء المجموعات ── */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-bold text-slate-700">إنشاء مجموعات:</span>
                    <div className="flex items-center gap-1 bg-slate-100 rounded-xl px-3 py-1.5">
                        <button onClick={() => setCustomGroupCount(Math.max(2, customGroupCount - 1))}
                            className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-800 font-bold text-lg">−</button>
                        <span className="w-8 text-center font-black text-slate-800">{customGroupCount}</span>
                        <button onClick={() => setCustomGroupCount(Math.min(16, customGroupCount + 1))}
                            className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-800 font-bold text-lg">+</button>
                    </div>
                    <button onClick={createGroups} disabled={creatingGroups}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all">
                        {creatingGroups ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        {groups.length > 0 ? 'إعادة إنشاء' : 'إنشاء'}
                    </button>
                    {groups.length === 0 && (
                        <p className="text-xs text-slate-400 w-full">حدد عدد المجموعات ثم اضغط «إنشاء» — بعدها اضغط «قرعة عشوائية» أو وزّع الفرق يدوياً</p>
                    )}
                </div>
            </div>

            {/* ── Hint: team selected ── */}
            {selectedTeam && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3 flex items-center gap-3">
                    <ArrowLeftRight className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <div className="flex-1 text-sm">
                        <span className="font-bold text-indigo-800">{selectedTeam.team.name}</span>
                        <span className="text-indigo-600"> — اضغط على مجموعة لنقله إليها، أو اضغط على فريق آخر لمبادلتهما</span>
                    </div>
                    <button onClick={() => setSelectedTeam(null)} className="text-indigo-400 hover:text-indigo-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* ── Unassigned teams pool ── */}
            {unassigned.length > 0 && (
                <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-4">
                    <p className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-2">
                        <Users className="w-3.5 h-3.5" /> فرق غير موزعة ({unassigned.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {unassigned.map(team => (
                            <div key={team.id}
                                onClick={() => selectedTeam ? addUnassignedToGroup(team, selectedTeam.fromGroupId || groups[0]?.id) : selectTeam(team, null)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all text-sm font-semibold
                                    ${selectedTeam?.team.id === team.id
                                        ? 'bg-indigo-100 border-indigo-400 text-indigo-800 ring-2 ring-indigo-300'
                                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50'
                                    }`}>
                                {team.logo_url ? (
                                    <img src={team.logo_url} alt={team.name} className="w-5 h-5 rounded object-cover flex-shrink-0"
                                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                ) : (
                                    <div className="w-5 h-5 rounded bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 flex-shrink-0">
                                        {team.name.charAt(0)}
                                    </div>
                                )}
                                {team.name}
                                {team.seed && <span className="text-[10px] bg-yellow-100 text-yellow-700 font-bold px-1 py-0.5 rounded">بذرة {team.seed}</span>}
                                {/* dropdown: نقل لمجموعة */}
                                {groups.length > 0 && (
                                    <div className="relative" onClick={e => e.stopPropagation()}>
                                        <select
                                            onChange={e => { if (e.target.value) addUnassignedToGroup(team, e.target.value); e.target.value = ''; }}
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full"
                                            defaultValue="">
                                            <option value="" disabled>نقل إلى</option>
                                            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                        </select>
                                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Groups grid ── */}
            {groups.length > 0 && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {groups.map(group => {
                        const isTarget = selectedTeam && selectedTeam.fromGroupId !== group.id;
                        return (
                            <div key={group.id}
                                onClick={() => selectedTeam && selectedTeam.fromGroupId !== group.id && moveSelectedToGroup(group.id)}
                                className={`bg-white border-2 rounded-2xl overflow-hidden transition-all
                                    ${isTarget ? 'border-indigo-400 ring-2 ring-indigo-200 cursor-pointer' : 'border-slate-200'}
                                    ${selectedTeam && selectedTeam.fromGroupId === group.id ? 'border-indigo-300' : ''}`}>

                                {/* Header */}
                                <div className={`px-4 py-2.5 flex items-center justify-between transition-colors
                                    ${isTarget ? 'bg-indigo-700' : 'bg-gradient-to-r from-slate-800 to-slate-700'}`}>
                                    <div>
                                        <h3 className="text-white font-black text-sm">{group.name}</h3>
                                        <p className="text-slate-400 text-[11px]">{group.teams.length} فريق
                                            {isTarget && <span className="text-indigo-300 mr-1">← انقر لنقل الفريق هنا</span>}
                                        </p>
                                    </div>
                                    <button onClick={e => { e.stopPropagation(); deleteGroup(group.id); }}
                                        className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-rose-400 transition-colors">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                {/* Teams */}
                                <div className="divide-y divide-slate-100" onClick={e => e.stopPropagation()}>
                                    {group.teams.length === 0 ? (
                                        <div
                                            onClick={() => selectedTeam && moveSelectedToGroup(group.id)}
                                            className={`text-center text-slate-400 text-xs py-6 ${selectedTeam ? 'cursor-pointer hover:bg-indigo-50 hover:text-indigo-500' : ''}`}>
                                            {selectedTeam ? '← انقر لنقل الفريق هنا' : 'فارغة'}
                                        </div>
                                    ) : (
                                        group.teams.map((team, i) => {
                                            const isSelected = selectedTeam?.team.id === team.id;
                                            const canSwap    = selectedTeam && !isSelected && selectedTeam.fromGroupId !== null;
                                            return (
                                                <div key={team.id}
                                                    className={`flex items-center gap-2 px-3 py-2.5 transition-all
                                                        ${isSelected ? 'bg-indigo-100 ring-1 ring-inset ring-indigo-300' : ''}
                                                        ${canSwap ? 'cursor-pointer hover:bg-amber-50' : 'cursor-pointer hover:bg-slate-50'}`}
                                                    onClick={() => {
                                                        if (selectedTeam && !isSelected) {
                                                            swapWithTeam(team, group.id);
                                                        } else {
                                                            selectTeam(team, group.id);
                                                        }
                                                    }}>
                                                    <span className="text-[11px] font-black text-slate-400 w-4 flex-shrink-0">{i + 1}</span>
                                                    {team.logo_url ? (
                                                        <img src={team.logo_url} alt={team.name}
                                                            className="w-6 h-6 rounded object-cover flex-shrink-0"
                                                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 flex-shrink-0">
                                                            {team.name.charAt(0)}
                                                        </div>
                                                    )}
                                                    <span className={`text-sm font-semibold flex-1 truncate ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>
                                                        {team.name}
                                                    </span>
                                                    {team.seed && (
                                                        <span className="text-[10px] bg-yellow-100 text-yellow-700 font-bold px-1.5 py-0.5 rounded flex-shrink-0">
                                                            {team.seed}
                                                        </span>
                                                    )}
                                                    {canSwap && (
                                                        <ArrowLeftRight className="w-3 h-3 text-amber-400 flex-shrink-0" />
                                                    )}
                                                    {/* زر الإزالة من المجموعة */}
                                                    <button
                                                        onClick={e => { e.stopPropagation(); removeFromGroup(team, group.id); }}
                                                        className="p-0.5 text-slate-300 hover:text-rose-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                                                        title="إزالة من المجموعة">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Legend */}
            {groups.length > 0 && allTeams.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500 flex flex-wrap gap-4">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-indigo-100 border border-indigo-300 inline-block" /> انقر على فريق لتحديده</span>
                    <span className="flex items-center gap-1.5"><ArrowLeftRight className="w-3 h-3 text-amber-400" /> انقر على فريق آخر لمبادلتهما</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-indigo-700 inline-block" /> انقر على رأس المجموعة لنقل الفريق إليها</span>
                </div>
            )}
        </div>
    );
}
