'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
    Swords, Plus, Save, Loader2, ChevronDown, ChevronUp,
    Clock, CheckCircle, Activity, X, Goal, Shuffle,
} from 'lucide-react';
import { toast } from 'sonner';
import { createPortalClient } from '@/lib/tournament-portal/auth';

type Team  = { id: string; name: string; logo_url: string | null };
type Group = { id: string; name: string };
type Category = { id: string; name: string; type: string };
type Match = {
    id: string; round: string; match_number: number | null;
    home_team_id: string | null; away_team_id: string | null;
    home_score: number | null; away_score: number | null;
    home_penalties: number | null; away_penalties: number | null;
    venue: string | null; scheduled_at: string | null;
    status: string; group_id: string | null; category_id: string | null;
    referee_name: string | null; notes: string | null;
};
type Event = {
    id?: string; player_id: string | null; team_id: string; event_type: string;
    minute: number | null; notes: string;
};

const ROUNDS: Record<string, string> = {
    group_stage: 'دور المجموعات', round_of_32: 'دور الـ32',
    round_of_16: 'دور الـ16', quarter_final: 'ربع النهائي',
    semi_final: 'نصف النهائي', third_place: 'المركز الثالث', final: 'النهائي',
};
const EVENT_TYPES: { v: string; label: string; emoji: string }[] = [
    { v: 'goal',            label: 'هدف',            emoji: '⚽' },
    { v: 'own_goal',        label: 'هدف عكسي',       emoji: '🙈' },
    { v: 'yellow_card',     label: 'بطاقة صفراء',    emoji: '🟨' },
    { v: 'red_card',        label: 'بطاقة حمراء',    emoji: '🟥' },
    { v: 'second_yellow',   label: 'إنذار ثانٍ',     emoji: '🟨🟥' },
    { v: 'sub_in',          label: 'دخول',           emoji: '🔼' },
    { v: 'sub_out',         label: 'خروج',           emoji: '🔽' },
    { v: 'penalty_scored',  label: 'ركلة جزاء محوّلة',emoji: '✅' },
    { v: 'penalty_missed',  label: 'ركلة جزاء مُهدرة',emoji: '❌' },
];

export default function MatchesPage() {
    const { id } = useParams<{ id: string }>();
    const [categories,  setCategories]  = useState<Category[]>([]);
    const [selectedCat, setSelectedCat] = useState<string>('all');
    const [teams,       setTeams]       = useState<Team[]>([]);
    const [groups,      setGroups]      = useState<Group[]>([]);
    const [matches,     setMatches]     = useState<Match[]>([]);
    const [loading,     setLoading]     = useState(true);
    const [expanded,    setExpanded]    = useState<string | null>(null);
    const [editMatch,   setEditMatch]   = useState<Partial<Match> | null>(null);
    const [events,      setEvents]      = useState<Record<string, Event[]>>({});
    const [saving,      setSaving]      = useState(false);

    // New match form
    const [showAddMatch,    setShowAddMatch]    = useState(false);
    const [generating,      setGenerating]      = useState(false);
    const [newMatch, setNewMatch] = useState({
        home_team_id: '', away_team_id: '', scheduled_at: '', venue: '',
        round: 'group_stage', category_id: '', group_id: '', referee_name: '',
    });

    const supabase = createPortalClient();

    const fetchAll = async () => {
        const [catsR, teamsR, groupsR, matchesR] = await Promise.all([
            supabase.from('tournament_categories').select('id, name, type').eq('tournament_id', id),
            supabase.from('tournament_teams').select('id, name, logo_url').eq('tournament_id', id).eq('status', 'approved'),
            supabase.from('tournament_groups').select('id, name').eq('tournament_id', id),
            supabase.from('tournament_matches').select('*').eq('tournament_id', id).order('scheduled_at', { ascending: true }),
        ]);
        setCategories(catsR.data || []);
        setTeams(teamsR.data || []);
        setGroups(groupsR.data || []);
        setMatches(matchesR.data || []);
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, [id]);

    // جلب أحداث مباراة
    const loadEvents = async (matchId: string) => {
        if (events[matchId]) return;
        const { data } = await supabase.from('tournament_match_events')
            .select('*').eq('match_id', matchId).order('minute');
        setEvents(prev => ({ ...prev, [matchId]: data || [] }));
    };

    const teamName = (tid: string | null) => teams.find(t => t.id === tid)?.name || '—';

    // ── توليد مباريات المجموعات ───────────────────────────────
    const generateGroupMatches = async (catId: string) => {
        if (!catId || catId === 'all') { toast.error('اختر فئة أولاً لتوليد المباريات'); return; }
        const confirmed = window.confirm('سيتم حذف جميع مباريات دور المجموعات لهذه الفئة وإعادة توليدها. هل أنت متأكد؟');
        if (!confirmed) return;
        setGenerating(true);
        try {
            const res = await fetch('/api/tournament-portal/generate-group-matches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tournament_id: id, category_id: catId }),
            });
            const data = await res.json();
            if (!res.ok) { toast.error(data.error || 'فشل التوليد'); return; }
            toast.success(`تم توليد ${data.generated} مباراة بنجاح`);
            fetchAll();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setGenerating(false);
        }
    };

    // ── إضافة مباراة ─────────────────────────────────────────
    const addMatch = async () => {
        if (!newMatch.home_team_id || !newMatch.away_team_id) { toast.error('اختر الفريقين'); return; }
        if (newMatch.home_team_id === newMatch.away_team_id)   { toast.error('لا يمكن أن يلعب الفريق ضد نفسه'); return; }
        setSaving(true);
        const { error } = await supabase.from('tournament_matches').insert({
            tournament_id:  id,
            category_id:    newMatch.category_id  || null,
            group_id:       newMatch.group_id      || null,
            round:          newMatch.round,
            home_team_id:   newMatch.home_team_id,
            away_team_id:   newMatch.away_team_id,
            scheduled_at:   newMatch.scheduled_at || null,
            venue:          newMatch.venue        || null,
            referee_name:   newMatch.referee_name || null,
            status:         'scheduled',
        });
        if (error) { toast.error(error.message); }
        else { toast.success('تم إضافة المباراة'); setShowAddMatch(false); fetchAll(); }
        setSaving(false);
    };

    // ── حفظ النتيجة ──────────────────────────────────────────
    const saveResult = async (match: Match) => {
        if (editMatch === null) return;
        setSaving(true);
        const homeScore = editMatch.home_score ?? null;
        const awayScore = editMatch.away_score ?? null;
        const isCompleted = homeScore !== null && awayScore !== null;
        const winnerId = isCompleted
            ? homeScore > awayScore! ? match.home_team_id
            : awayScore! > homeScore ? match.away_team_id
            : null
            : null;

        const { error } = await supabase.from('tournament_matches').update({
            home_score:      homeScore,
            away_score:      awayScore,
            home_penalties:  editMatch.home_penalties ?? null,
            away_penalties:  editMatch.away_penalties ?? null,
            venue:           editMatch.venue       ?? match.venue,
            referee_name:    editMatch.referee_name?? match.referee_name,
            status:          isCompleted ? 'completed' : 'scheduled',
            played_at:       isCompleted ? new Date().toISOString() : null,
            winner_id:       winnerId,
        }).eq('id', match.id);

        if (error) { toast.error(error.message); }
        else {
            toast.success('تم حفظ النتيجة');
            setMatches(prev => prev.map(m => m.id === match.id
                ? { ...m, ...editMatch, status: isCompleted ? 'completed' : 'scheduled', winner_id: winnerId } as any
                : m));
            setEditMatch(null);
        }
        setSaving(false);
    };

    // ── إضافة حدث ─────────────────────────────────────────────
    const addEvent = async (matchId: string, event: Omit<Event, 'id'>) => {
        const { data, error } = await supabase.from('tournament_match_events').insert({
            match_id:   matchId,
            team_id:    event.team_id   || null,
            player_id:  event.player_id || null,
            event_type: event.event_type,
            minute:     event.minute    || null,
            notes:      event.notes     || null,
        }).select().single();
        if (error) { toast.error(error.message); return; }
        setEvents(prev => ({ ...prev, [matchId]: [...(prev[matchId] || []), data] }));
        toast.success('تم تسجيل الحدث');
    };

    const deleteEvent = async (matchId: string, eventId: string) => {
        await supabase.from('tournament_match_events').delete().eq('id', eventId);
        setEvents(prev => ({ ...prev, [matchId]: prev[matchId].filter(e => e.id !== eventId) }));
    };

    const filteredMatches = useMemo(() =>
        selectedCat === 'all' ? matches : matches.filter(m => m.category_id === selectedCat),
        [matches, selectedCat]);

    const STATUS_CFG: Record<string, { label: string; cls: string; icon: any }> = {
        scheduled:  { label: 'مجدولة',  cls: 'bg-slate-100 text-slate-600',    icon: Clock        },
        live:       { label: 'مباشر',   cls: 'bg-red-100 text-red-600',        icon: Activity     },
        completed:  { label: 'مكتملة',  cls: 'bg-emerald-100 text-emerald-700',icon: CheckCircle  },
        postponed:  { label: 'مؤجلة',   cls: 'bg-orange-100 text-orange-700',  icon: Clock        },
        cancelled:  { label: 'ملغية',   cls: 'bg-rose-100 text-rose-700',      icon: X            },
    };

    return (
        <div className="space-y-4" dir="rtl">

            {/* Category filter */}
            <div className="flex gap-2 flex-wrap items-center">
                <button onClick={() => setSelectedCat('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${selectedCat === 'all' ? 'bg-yellow-500 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                    الكل ({matches.length})
                </button>
                {categories.map(c => (
                    <button key={c.id} onClick={() => setSelectedCat(c.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${selectedCat === c.id ? 'bg-yellow-500 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                        {c.name} ({matches.filter(m => m.category_id === c.id).length})
                    </button>
                ))}
                <div className="mr-auto flex items-center gap-2">
                    {selectedCat !== 'all' && (
                        <button onClick={() => generateGroupMatches(selectedCat)} disabled={generating}
                            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-sm">
                            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shuffle className="w-4 h-4" />}
                            توليد مباريات المجموعات
                        </button>
                    )}
                    <button onClick={() => setShowAddMatch(v => !v)}
                        className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-white font-bold px-4 py-2 rounded-xl text-sm">
                        <Plus className="w-4 h-4" /> إضافة مباراة
                    </button>
                </div>
            </div>

            {/* Add match form */}
            {showAddMatch && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 space-y-3">
                    <h3 className="font-bold text-yellow-800 text-sm">مباراة جديدة</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="form-label">الفريق المضيف</label>
                            <select className="form-input" value={newMatch.home_team_id} onChange={e => setNewMatch(p => ({ ...p, home_team_id: e.target.value }))}>
                                <option value="">اختر الفريق</option>
                                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">الفريق الضيف</label>
                            <select className="form-input" value={newMatch.away_team_id} onChange={e => setNewMatch(p => ({ ...p, away_team_id: e.target.value }))}>
                                <option value="">اختر الفريق</option>
                                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">الدور</label>
                            <select className="form-input" value={newMatch.round} onChange={e => setNewMatch(p => ({ ...p, round: e.target.value }))}>
                                {Object.entries(ROUNDS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">الفئة</label>
                            <select className="form-input" value={newMatch.category_id} onChange={e => setNewMatch(p => ({ ...p, category_id: e.target.value }))}>
                                <option value="">بدون فئة</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">التاريخ والوقت</label>
                            <input type="datetime-local" className="form-input" value={newMatch.scheduled_at} onChange={e => setNewMatch(p => ({ ...p, scheduled_at: e.target.value }))} />
                        </div>
                        <div>
                            <label className="form-label">الملعب</label>
                            <input className="form-input" value={newMatch.venue} onChange={e => setNewMatch(p => ({ ...p, venue: e.target.value }))} placeholder="استاد الملك فهد" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={addMatch} disabled={saving}
                            className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold px-4 py-2 rounded-xl text-sm">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} إضافة
                        </button>
                        <button onClick={() => setShowAddMatch(false)} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100">إلغاء</button>
                    </div>
                </div>
            )}

            {/* Matches list */}
            {loading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border border-slate-100" />)}</div>
            ) : filteredMatches.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                    <Swords className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm">لا توجد مباريات بعد</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredMatches.map(match => {
                        const scfg = STATUS_CFG[match.status] || STATUS_CFG.scheduled;
                        const StatusIcon = scfg.icon;
                        const isOpen = expanded === match.id;
                        const isEditing = editMatch !== null && expanded === match.id;

                        return (
                            <div key={match.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                                {/* Match row */}
                                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                                    onClick={() => { setExpanded(isOpen ? null : match.id); if (!isOpen) { loadEvents(match.id); setEditMatch(null); } }}>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                                                {ROUNDS[match.round] || match.round}
                                            </span>
                                            {match.scheduled_at && (
                                                <span className="text-xs text-slate-400">
                                                    {new Date(match.scheduled_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                                                    {' '}
                                                    {new Date(match.scheduled_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className="font-bold text-slate-900 text-sm truncate max-w-[100px]">{teamName(match.home_team_id)}</span>
                                            <div className={`flex items-center gap-1 px-3 py-1 rounded-xl font-black text-sm
                                                ${match.status === 'completed' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                {match.status === 'completed' ? `${match.home_score} - ${match.away_score}` : 'vs'}
                                            </div>
                                            <span className="font-bold text-slate-900 text-sm truncate max-w-[100px]">{teamName(match.away_team_id)}</span>
                                        </div>
                                    </div>

                                    <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${scfg.cls}`}>
                                        <StatusIcon className="w-3 h-3" /> {scfg.label}
                                    </span>
                                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                </div>

                                {/* Expanded */}
                                {isOpen && (
                                    <div className="border-t border-slate-100 bg-slate-50/50 px-4 pb-5 pt-4 space-y-4">

                                        {/* Score entry */}
                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-xs font-bold text-slate-600">إدخال النتيجة</h4>
                                                {!isEditing && (
                                                    <button onClick={() => setEditMatch({ home_score: match.home_score, away_score: match.away_score, home_penalties: match.home_penalties, away_penalties: match.away_penalties, venue: match.venue, referee_name: match.referee_name })}
                                                        className="text-xs text-yellow-600 font-semibold hover:text-yellow-500">تعديل</button>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 text-right">
                                                    <p className="text-xs font-bold text-slate-700 mb-1">{teamName(match.home_team_id)}</p>
                                                    {isEditing ? (
                                                        <input type="number" min="0" value={editMatch?.home_score ?? ''} onChange={e => setEditMatch(p => ({ ...p, home_score: +e.target.value }))}
                                                            className="w-20 text-center text-2xl font-black border-2 border-yellow-400 rounded-xl py-2 focus:outline-none" />
                                                    ) : (
                                                        <div className="text-3xl font-black text-slate-900">{match.home_score ?? '—'}</div>
                                                    )}
                                                </div>
                                                <div className="text-slate-400 font-black text-xl">-</div>
                                                <div className="flex-1 text-left">
                                                    <p className="text-xs font-bold text-slate-700 mb-1 text-right">{teamName(match.away_team_id)}</p>
                                                    {isEditing ? (
                                                        <input type="number" min="0" value={editMatch?.away_score ?? ''} onChange={e => setEditMatch(p => ({ ...p, away_score: +e.target.value }))}
                                                            className="w-20 text-center text-2xl font-black border-2 border-yellow-400 rounded-xl py-2 focus:outline-none" />
                                                    ) : (
                                                        <div className="text-3xl font-black text-slate-900 text-right">{match.away_score ?? '—'}</div>
                                                    )}
                                                </div>
                                            </div>
                                            {isEditing && (
                                                <div className="flex gap-2 mt-3">
                                                    <button onClick={() => saveResult(match)} disabled={saving}
                                                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs">
                                                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} حفظ
                                                    </button>
                                                    <button onClick={() => setEditMatch(null)} className="px-4 py-2 rounded-xl text-xs text-slate-600 hover:bg-slate-100">إلغاء</button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Events */}
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-600 mb-2">أحداث المباراة</h4>
                                            <div className="space-y-1.5 mb-3">
                                                {(events[match.id] || []).map(ev => {
                                                    const et = EVENT_TYPES.find(e => e.v === ev.event_type);
                                                    return (
                                                        <div key={ev.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 text-xs border border-slate-100">
                                                            <span>{et?.emoji}</span>
                                                            <span className="font-semibold text-slate-700">{et?.label}</span>
                                                            {ev.minute && <span className="text-slate-400">{ev.minute}'</span>}
                                                            {ev.notes && <span className="text-slate-500 truncate flex-1">{ev.notes}</span>}
                                                            <button onClick={() => deleteEvent(match.id, ev.id!)} className="text-slate-300 hover:text-rose-500 mr-auto">
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <QuickEventForm teams={teams.filter(t => t.id === match.home_team_id || t.id === match.away_team_id)} onAdd={ev => addEvent(match.id, ev)} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <style jsx global>{`
                .form-label { display: block; font-size: 0.7rem; font-weight: 600; color: #64748b; margin-bottom: 0.3rem; }
                .form-input { width: 100%; border: 1px solid #e2e8f0; border-radius: 0.625rem; padding: 0.5rem 0.75rem; font-size: 0.8rem; color: #0f172a; background: white; outline: none; transition: all 0.15s; }
                .form-input:focus { border-color: #eab308; box-shadow: 0 0 0 3px rgba(234,179,8,0.15); }
            `}</style>
        </div>
    );
}

function QuickEventForm({ teams, onAdd }: { teams: Team[]; onAdd: (e: Omit<Event, 'id'>) => void }) {
    const [form, setForm] = useState({ team_id: teams[0]?.id || '', event_type: 'goal', minute: '', notes: '' });
    const set = (k: string) => (e: React.ChangeEvent<any>) => setForm(p => ({ ...p, [k]: e.target.value }));
    const submit = () => {
        if (!form.event_type) return;
        onAdd({ team_id: form.team_id, player_id: null, event_type: form.event_type, minute: form.minute ? +form.minute : null, notes: form.notes });
        setForm(p => ({ ...p, minute: '', notes: '' }));
    };
    return (
        <div className="flex flex-wrap gap-2 items-end bg-white rounded-xl p-3 border border-slate-200">
            <div>
                <label className="form-label">الحدث</label>
                <select className="form-input w-36" value={form.event_type} onChange={set('event_type')}>
                    {EVENT_TYPES.map(e => <option key={e.v} value={e.v}>{e.emoji} {e.label}</option>)}
                </select>
            </div>
            <div>
                <label className="form-label">الفريق</label>
                <select className="form-input w-28" value={form.team_id} onChange={set('team_id')}>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </div>
            <div>
                <label className="form-label">الدقيقة</label>
                <input type="number" min="1" max="120" className="form-input w-16" value={form.minute} onChange={set('minute')} placeholder="45" />
            </div>
            <div className="flex-1 min-w-[100px]">
                <label className="form-label">ملاحظة (اسم اللاعب...)</label>
                <input className="form-input" value={form.notes} onChange={set('notes')} placeholder="اسم اللاعب..." />
            </div>
            <button onClick={submit} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-2 rounded-xl text-xs">
                تسجيل
            </button>
        </div>
    );
}

