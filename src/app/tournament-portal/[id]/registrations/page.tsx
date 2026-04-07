'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
    Users, CheckCircle, XCircle, Clock, Search,
    ChevronDown, ChevronUp, Phone, Mail, Loader2,
    Plus, Trophy, CreditCard, AlertCircle, UserPlus,
    Trash2, Download, Link2, Building2, PenLine,
} from 'lucide-react';
import { toast } from 'sonner';
import { createPortalClient } from '@/lib/tournament-portal/auth';

const CF_BASE = 'https://assets.el7lm.com';
function resolveImg(path: string | null | undefined, bucket = 'avatars'): string | null {
    if (!path) return null;
    if (path.includes('assets.el7lm.com')) return path;
    if (path.startsWith('http')) {
        if (path.includes('supabase.co/storage/v1/object/public/')) {
            const parts = path.split('supabase.co/storage/v1/object/public/');
            if (parts[1]) return `${CF_BASE}/${parts[1]}`;
        }
        return path;
    }
    const clean = path.startsWith('/') ? path.slice(1) : path;
    if (!clean.includes('/') && bucket) return `${CF_BASE}/${bucket}/${clean}`;
    return `${CF_BASE}/${clean}`;
}

type Team = {
    id: string; name: string; status: string; logo_url: string | null;
    club_name: string | null; city: string | null; country: string | null;
    contact_name: string | null; contact_phone: string | null; contact_email: string | null;
    notes: string | null; registered_at: string; approved_at: string | null; seed: number | null;
    category_id: string | null;
    players_count: number;
    registration?: { payment_status: string; payment_amount: number | null; receipt_url: string | null };
};

type Player = {
    id: string; player_name: string; position: string | null;
    date_of_birth: string | null; jersey_number: number | null;
    phone: string | null; platform_player_id: string | null;
};

type Category = { id: string; name: string };

type PlatformResult = {
    platform_user_id?: string;
    platform_player_id?: string;
    type: 'club' | 'player' | 'user';
    name: string;
    email?: string;
    phone?: string;
    city?: string;
    position?: string;
    date_of_birth?: string;
    logo_url?: string;
    account_type?: string;
};

const STATUS_CFG: Record<string, { label: string; icon: any; cls: string; dot: string }> = {
    pending:   { label: 'معلق',    icon: Clock,         cls: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-400'   },
    approved:  { label: 'مقبول',   icon: CheckCircle,   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400' },
    rejected:  { label: 'مرفوض',  icon: XCircle,       cls: 'bg-rose-50 text-rose-700 border-rose-200',          dot: 'bg-rose-400'    },
    withdrawn: { label: 'انسحب',   icon: AlertCircle,   cls: 'bg-slate-50 text-slate-500 border-slate-200',       dot: 'bg-slate-300'   },
};

const PAY_CFG: Record<string, { label: string; cls: string }> = {
    pending:  { label: 'لم يدفع',  cls: 'bg-amber-50 text-amber-700'   },
    paid:     { label: 'مدفوع',    cls: 'bg-emerald-50 text-emerald-700'},
    partial:  { label: 'جزئي',     cls: 'bg-blue-50 text-blue-700'     },
    free:     { label: 'مجاني',    cls: 'bg-slate-50 text-slate-500'   },
    refunded: { label: 'مُسترد',   cls: 'bg-purple-50 text-purple-700' },
};

const POSITIONS = ['حارس مرمى', 'مدافع', 'لاعب وسط', 'مهاجم', 'بديل'];

export default function RegistrationsPage() {
    const { id } = useParams<{ id: string }>();
    const [teams,         setTeams]         = useState<Team[]>([]);
    const [categories,    setCategories]    = useState<Category[]>([]);
    const [loading,       setLoading]       = useState(true);
    const [search,        setSearch]        = useState('');
    const [statusFilter,  setStatusFilter]  = useState<string>('all');
    const [catFilter,     setCatFilter]     = useState<string>('all');
    const [expanded,      setExpanded]      = useState<string | null>(null);
    const [activeTab,     setActiveTab]     = useState<Record<string, 'info' | 'players' | 'import'>>({});
    const [acting,        setActing]        = useState<string | null>(null);

    // Players state (per team)
    const [teamPlayers,   setTeamPlayers]   = useState<Record<string, Player[]>>({});
    const [loadingPl,     setLoadingPl]     = useState<string | null>(null);
    const [showAddPlayer, setShowAddPlayer] = useState<string | null>(null);
    const [newPlayer,     setNewPlayer]     = useState({ player_name: '', position: '', date_of_birth: '', jersey_number: '', phone: '' });

    // Platform import state
    const [importQuery,   setImportQuery]   = useState('');
    const [importType,    setImportType]    = useState<'all' | 'club' | 'player'>('all');
    const [importResults, setImportResults] = useState<PlatformResult[]>([]);
    const [importErrors,  setImportErrors]  = useState<string[]>([]);
    const [searching,     setSearching]     = useState(false);
    const [importingId,   setImportingId]   = useState<string | null>(null); // tracks which result is being imported

    // New team form
    const [showAdd,       setShowAdd]       = useState(false);
    const [addMode,       setAddMode]       = useState<'choose' | 'manual' | 'import' | null>(null);
    const [newTeam,       setNewTeam]       = useState({ name: '', contact_name: '', contact_phone: '', contact_email: '', city: '', category_id: '' });

    // Global add-via-import state
    const [globalImportQ,   setGlobalImportQ]   = useState('');
    const [globalImportType,setGlobalImportType] = useState<'all' | 'club' | 'player'>('club');
    const [globalImportRes, setGlobalImportRes]  = useState<PlatformResult[]>([]);
    const [globalImportErr, setGlobalImportErr]  = useState<string[]>([]);
    const [globalSearching, setGlobalSearching]  = useState(false);

    const supabase = createPortalClient();

    const fetchData = async () => {
        const [teamsRes, catsRes] = await Promise.all([
            supabase.from('tournament_teams')
                .select('*, registration:tournament_team_regs(payment_status, payment_amount, receipt_url), players:tournament_players(id)')
                .eq('tournament_id', id)
                .order('registered_at', { ascending: false }),
            supabase.from('tournament_categories').select('id, name').eq('tournament_id', id),
        ]);
        setTeams((teamsRes.data || []).map((t: any) => ({
            ...t,
            registration: t.registration?.[0] || null,
            players_count: Array.isArray(t.players) ? t.players.length : 0,
        })));
        setCategories(catsRes.data || []);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [id]);

    const updateStatus = async (teamId: string, status: string) => {
        setActing(teamId);
        const { error } = await supabase.from('tournament_teams')
            .update({ status, ...(status === 'approved' ? { approved_at: new Date().toISOString() } : {}) })
            .eq('id', teamId);
        if (error) { toast.error(error.message); }
        else {
            toast.success(status === 'approved' ? 'تم قبول الفريق' : 'تم رفض الفريق');
            setTeams(prev => prev.map(t => t.id === teamId ? { ...t, status } : t));
        }
        setActing(null);
    };

    const updatePayment = async (teamId: string, payStatus: string) => {
        setActing(teamId + '_pay');
        const { error } = await supabase.from('tournament_team_regs')
            .upsert({ tournament_id: id, team_id: teamId, payment_status: payStatus }, { onConflict: 'team_id' });
        if (error) { toast.error(error.message); }
        else {
            toast.success('تم تحديث حالة الدفع');
            setTeams(prev => prev.map(t => t.id === teamId
                ? { ...t, registration: { ...t.registration, payment_status: payStatus } as any }
                : t));
        }
        setActing(null);
    };

    const addTeam = async () => {
        if (!newTeam.name.trim()) { toast.error('اسم الفريق مطلوب'); return; }
        setActing('new');
        const { error } = await supabase.from('tournament_teams').insert({
            tournament_id: id,
            name:          newTeam.name,
            contact_name:  newTeam.contact_name  || null,
            contact_phone: newTeam.contact_phone || null,
            contact_email: newTeam.contact_email || null,
            city:          newTeam.city          || null,
            category_id:   newTeam.category_id   || null,
            status:        'approved',
        });
        if (error) { toast.error(error.message); }
        else {
            toast.success('تم إضافة الفريق');
            setShowAdd(false);
            setAddMode(null);
            setNewTeam({ name:'',contact_name:'',contact_phone:'',contact_email:'',city:'',category_id:'' });
            fetchData();
        }
        setActing(null);
    };

    // ── Global import search (for Add Team modal) ─────────────
    const searchGlobal = async () => {
        if (globalImportQ.length < 2) return;
        setGlobalSearching(true);
        setGlobalImportErr([]);
        try {
            const res = await fetch(`/api/tournament-portal/search-platform-users?q=${encodeURIComponent(globalImportQ)}&type=${globalImportType}`);
            const data = await res.json();
            setGlobalImportRes(data.results || []);
            if (data.errors?.length) setGlobalImportErr(data.errors);
        } catch (e: any) {
            setGlobalImportErr([e.message]);
        }
        setGlobalSearching(false);
    };

    const importGlobalAsTeam = async (result: PlatformResult, catId?: string) => {
        try {
            const res = await fetch('/api/tournament-portal/import-team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tournament_id: id,
                    name:          result.name,
                    city:          result.city || null,
                    contact_phone: result.phone || null,
                    logo_url:      result.logo_url || null,
                    category_id:   catId || null,
                    notes:         `مستورد من المنصة (${result.account_type || result.type})`,
                }),
            });
            const data = await res.json();
            if (!res.ok) { toast.error(`خطأ: ${data.error || 'فشل الاستيراد'}`); return; }
            toast.success(`تم استيراد "${result.name}" كفريق`);
            setGlobalImportRes(prev => prev.filter(r => r.name !== result.name));
            fetchData();
        } catch (e: any) {
            toast.error(`خطأ: ${e.message}`);
        }
    };

    // ── Players management ────────────────────────────────────
    const loadPlayers = useCallback(async (teamId: string) => {
        if (teamPlayers[teamId]) return;
        setLoadingPl(teamId);
        const res = await fetch(`/api/tournament-portal/team-players?team_id=${teamId}`);
        const data = await res.json();
        setTeamPlayers(prev => ({ ...prev, [teamId]: data.players || [] }));
        setLoadingPl(null);
    }, [teamPlayers]);

    const addPlayer = async (teamId: string) => {
        if (!newPlayer.player_name.trim()) { toast.error('اسم اللاعب مطلوب'); return; }
        setActing('addplayer_' + teamId);
        const res = await fetch('/api/tournament-portal/team-players', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ team_id: teamId, tournament_id: id, ...newPlayer }),
        });
        const data = await res.json();
        if (!res.ok) { toast.error(data.error); }
        else {
            setTeamPlayers(prev => ({ ...prev, [teamId]: [...(prev[teamId] || []), data.player] }));
            setNewPlayer({ player_name: '', position: '', date_of_birth: '', jersey_number: '', phone: '' });
            setShowAddPlayer(null);
            toast.success('تم إضافة اللاعب');
        }
        setActing(null);
    };

    const deletePlayer = async (teamId: string, playerId: string) => {
        const res = await fetch(`/api/tournament-portal/team-players?player_id=${playerId}`, { method: 'DELETE' });
        if (!res.ok) { toast.error('فشل الحذف'); return; }
        setTeamPlayers(prev => ({ ...prev, [teamId]: prev[teamId].filter(p => p.id !== playerId) }));
        toast.success('تم حذف اللاعب');
    };

    // ── Platform import ───────────────────────────────────────
    const searchPlatform = useCallback(async (_teamId: string) => {
        if (importQuery.length < 2) return;
        setSearching(true);
        setImportErrors([]);
        try {
            const res = await fetch(`/api/tournament-portal/search-platform-users?q=${encodeURIComponent(importQuery)}&type=${importType}`);
            const data = await res.json();
            setImportResults(data.results || []);
            if (data.errors?.length) setImportErrors(data.errors);
        } catch (e: any) {
            setImportErrors([e.message]);
        }
        setSearching(false);
    }, [importQuery, importType]);

    const importAsTeam = async (result: PlatformResult) => {
        try {
            const res = await fetch('/api/tournament-portal/import-team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tournament_id: id,
                    name:          result.name,
                    city:          result.city || null,
                    contact_phone: result.phone || null,
                    logo_url:      result.logo_url || null,
                    notes:         `مستورد من المنصة (${result.account_type || result.type})`,
                }),
            });
            const data = await res.json();
            if (!res.ok) { toast.error(`خطأ: ${data.error || 'فشل الاستيراد'}`); return; }
            toast.success(`تم استيراد "${result.name}" كفريق`);
            fetchData();
            setImportResults(prev => prev.filter(r => r.name !== result.name));
        } catch (e: any) {
            toast.error(`خطأ: ${e.message}`);
        }
    };

    const importAsPlayer = async (result: PlatformResult, teamId: string) => {
        const key = result.platform_player_id || result.name;
        setImportingId(key);
        try {
            const res = await fetch('/api/tournament-portal/team-players', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    team_id:            teamId,
                    tournament_id:      id,
                    player_name:        result.name,
                    position:           result.position || null,
                    date_of_birth:      result.date_of_birth || null,
                    phone:              result.phone || null,
                    platform_player_id: result.platform_player_id || null,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(`خطأ: ${data.error || 'فشل الإضافة'}`);
                return;
            }
            const newPlayer = data.player || { id: Date.now().toString(), player_name: result.name, name: result.name, position: result.position, phone: result.phone };
            setTeamPlayers(prev => ({ ...prev, [teamId]: [...(prev[teamId] || []), newPlayer] }));
            toast.success(`تم إضافة "${result.name}" للفريق`);
            setImportResults(prev => prev.filter(r => r.name !== result.name));
        } catch (e: any) {
            toast.error(`خطأ في الاتصال: ${e.message}`);
        } finally {
            setImportingId(null);
        }
    };

    // ── Group individuals ─────────────────────────────────────
    const groupIndividuals = async () => {
        const individuals = teams.filter(t => t.notes?.includes('[لاعب فردي]') && t.status === 'pending');
        if (individuals.length < 2) { toast.error('يجب أن يكون هناك لاعبان فرديان على الأقل'); return; }
        const groupName = `فريق مجمّع ${new Date().toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}`;
        const { data: created, error } = await supabase.from('tournament_teams').insert({
            tournament_id: id, name: groupName, status: 'approved',
            notes: 'فريق مكوّن من لاعبين فرديين',
        }).select('id').single();
        if (error || !created) { toast.error('فشل إنشاء الفريق'); return; }
        for (const ind of individuals) {
            await supabase.from('tournament_teams').update({ status: 'rejected', notes: `تم نقله إلى ${groupName}` }).eq('id', ind.id);
            await supabase.from('tournament_players').update({ team_id: created.id }).eq('team_id', ind.id);
        }
        toast.success(`تم إنشاء "${groupName}" من ${individuals.length} لاعب`);
        fetchData();
    };

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return teams.filter(t => {
            if (statusFilter === 'individual') return t.notes?.includes('[لاعب فردي]');
            if (statusFilter !== 'all' && t.status !== statusFilter) return false;
            if (catFilter    !== 'all' && t.category_id !== catFilter) return false;
            if (q && !t.name.toLowerCase().includes(q) && !t.club_name?.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [teams, statusFilter, catFilter, search]);

    const stats = {
        total:      teams.length,
        pending:    teams.filter(t => t.status === 'pending').length,
        approved:   teams.filter(t => t.status === 'approved').length,
        rejected:   teams.filter(t => t.status === 'rejected').length,
        individual: teams.filter(t => t.notes?.includes('[لاعب فردي]')).length,
    };

    const getTab = (teamId: string) => activeTab[teamId] || 'info';
    const setTab = (teamId: string, tab: 'info' | 'players' | 'import') => {
        setActiveTab(prev => ({ ...prev, [teamId]: tab }));
        if (tab === 'players') loadPlayers(teamId);
    };

    return (
        <div className="space-y-4" dir="rtl">

            {/* Stats */}
            <div className="grid grid-cols-5 gap-3">
                {[
                    { label: 'الكل',    value: stats.total,      filter: 'all',        cls: 'border-slate-200 text-slate-700'    },
                    { label: 'معلق',    value: stats.pending,    filter: 'pending',    cls: 'border-amber-200 text-amber-700'    },
                    { label: 'مقبول',   value: stats.approved,   filter: 'approved',   cls: 'border-emerald-200 text-emerald-700'},
                    { label: 'مرفوض',  value: stats.rejected,   filter: 'rejected',   cls: 'border-rose-200 text-rose-700'     },
                    { label: 'فردي',    value: stats.individual, filter: 'individual', cls: 'border-indigo-200 text-indigo-700'  },
                ].map(s => (
                    <button key={s.filter} onClick={() => setStatusFilter(s.filter)}
                        className={`bg-white border-2 rounded-xl p-3 text-center transition-all hover:shadow-sm
                            ${statusFilter === s.filter ? s.cls + ' shadow-sm' : 'border-slate-100'}`}>
                        <p className="text-xl font-black">{s.value}</p>
                        <p className="text-[11px] font-medium mt-0.5 text-slate-500">{s.label}</p>
                    </button>
                ))}
            </div>

            {/* Toolbar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="بحث بالاسم..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/30" />
                </div>
                {categories.length > 1 && (
                    <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                        className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white text-slate-700 cursor-pointer focus:outline-none">
                        <option value="all">كل الفئات</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                )}
                <div className="flex gap-2 mr-auto">
                    {stats.individual > 0 && (
                        <button onClick={groupIndividuals}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all">
                            <Users className="w-4 h-4" /> تجميع الفرديين ({stats.individual})
                        </button>
                    )}
                    <button onClick={() => { setShowAdd(true); setAddMode('choose'); setGlobalImportRes([]); setGlobalImportQ(''); }}
                        className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all">
                        <Plus className="w-4 h-4" /> إضافة فريق
                    </button>
                </div>
            </div>

            {/* Add team modal */}
            {showAdd && (
                <div className="bg-white border-2 border-yellow-300 rounded-2xl shadow-lg overflow-hidden">

                    {/* Header */}
                    <div className="bg-yellow-50 border-b border-yellow-200 px-5 py-3 flex items-center justify-between">
                        <h3 className="font-black text-yellow-900 text-sm">إضافة فريق جديد</h3>
                        <button onClick={() => { setShowAdd(false); setAddMode(null); }} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
                    </div>

                    <div className="p-5">
                        {/* Step 1: Choose mode */}
                        {addMode === 'choose' && (
                            <div className="space-y-3">
                                <p className="text-xs text-slate-500 mb-4">كيف تريد إضافة الفريق؟</p>
                                <button onClick={() => setAddMode('import')}
                                    className="w-full flex items-center gap-4 bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-200 hover:border-indigo-400 rounded-xl p-4 text-right transition-all">
                                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Building2 className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-black text-indigo-900 text-sm">استيراد من المنصة</p>
                                        <p className="text-xs text-indigo-600 mt-0.5">اختر من الأندية والأكاديميات المسجلة مسبقاً في El7lm</p>
                                    </div>
                                </button>
                                <button onClick={() => setAddMode('manual')}
                                    className="w-full flex items-center gap-4 bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 hover:border-slate-400 rounded-xl p-4 text-right transition-all">
                                    <div className="w-10 h-10 bg-slate-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <PenLine className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900 text-sm">إضافة يدوية</p>
                                        <p className="text-xs text-slate-500 mt-0.5">أدخل بيانات الفريق يدوياً (للفرق غير المسجلة)</p>
                                    </div>
                                </button>
                            </div>
                        )}

                        {/* Step 2a: Import from platform */}
                        {addMode === 'import' && (
                            <div className="space-y-3">
                                <button onClick={() => setAddMode('choose')} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
                                    ← رجوع
                                </button>
                                <div className="flex gap-2">
                                    <select value={globalImportType} onChange={e => setGlobalImportType(e.target.value as any)}
                                        className="text-xs border border-slate-200 rounded-lg px-2 py-2 bg-white text-slate-700 focus:outline-none">
                                        <option value="club">أندية/أكاديميات</option>
                                        <option value="player">لاعبون</option>
                                        <option value="all">الكل</option>
                                    </select>
                                    <div className="relative flex-1">
                                        <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                        <input
                                            value={globalImportQ}
                                            onChange={e => setGlobalImportQ(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && searchGlobal()}
                                            placeholder="ابحث بالاسم أو الجوال..."
                                            className="w-full text-sm border border-slate-200 rounded-lg pr-8 pl-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400/30" />
                                    </div>
                                    <button onClick={searchGlobal} disabled={globalSearching || globalImportQ.length < 2}
                                        className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-sm">
                                        {globalSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                        بحث
                                    </button>
                                </div>

                                {/* Category selector for import */}
                                {categories.length > 0 && (
                                    <div>
                                        <label className="form-label">الفئة (اختياري)</label>
                                        <select className="form-input" value={newTeam.category_id} onChange={e => setNewTeam(p => ({ ...p, category_id: e.target.value }))}>
                                            <option value="">بدون فئة</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                {globalImportErr.length > 0 && (
                                    <div className="text-xs bg-rose-50 border border-rose-200 rounded-lg p-3 text-rose-700 space-y-1">
                                        <p className="font-bold">أخطاء في البحث:</p>
                                        {globalImportErr.map((e, i) => <p key={i} className="font-mono">{e}</p>)}
                                    </div>
                                )}

                                {globalImportRes.length > 0 ? (
                                    <div className="space-y-1.5 max-h-72 overflow-y-auto">
                                        {globalImportRes.map((r, i) => (
                                            <div key={i} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                                                {resolveImg(r.logo_url) ? (
                                                    <img src={resolveImg(r.logo_url)!} alt={r.name}
                                                        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                                                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }} />
                                                ) : null}
                                                <div className={`w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-indigo-600 ${resolveImg(r.logo_url) ? 'hidden' : ''}`}>
                                                    {r.name.charAt(0)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-800 truncate">{r.name}</p>
                                                    <p className="text-[10px] text-slate-400">
                                                        {r.type === 'player' ? `لاعب · ${r.position || 'غير محدد'}` : r.account_type === 'academy' ? 'أكاديمية' : 'نادي'}
                                                        {r.city ? ` · ${r.city}` : ''}
                                                        {r.phone ? ` · ${r.phone}` : ''}
                                                    </p>
                                                </div>
                                                <button onClick={() => importGlobalAsTeam(r, newTeam.category_id || undefined)}
                                                    className="flex items-center gap-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg transition-all flex-shrink-0">
                                                    <Download className="w-3.5 h-3.5" /> إضافة
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : globalImportQ.length >= 2 && !globalSearching ? (
                                    <p className="text-center text-slate-400 text-sm py-4">لا توجد نتائج — جرب البحث بالجوال أو اسم مختلف</p>
                                ) : null}
                            </div>
                        )}

                        {/* Step 2b: Manual entry */}
                        {addMode === 'manual' && (
                            <div className="space-y-3">
                                <button onClick={() => setAddMode('choose')} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
                                    ← رجوع
                                </button>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="form-label">اسم الفريق *</label>
                                        <input className="form-input" value={newTeam.name} onChange={e => setNewTeam(p => ({ ...p, name: e.target.value }))} placeholder="نادي الهلال" />
                                    </div>
                                    {categories.length > 0 && (
                                        <div>
                                            <label className="form-label">الفئة</label>
                                            <select className="form-input" value={newTeam.category_id} onChange={e => setNewTeam(p => ({ ...p, category_id: e.target.value }))}>
                                                <option value="">بدون فئة</option>
                                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    <div>
                                        <label className="form-label">اسم المسؤول</label>
                                        <input className="form-input" value={newTeam.contact_name} onChange={e => setNewTeam(p => ({ ...p, contact_name: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="form-label">رقم الجوال</label>
                                        <input className="form-input" value={newTeam.contact_phone} onChange={e => setNewTeam(p => ({ ...p, contact_phone: e.target.value }))} dir="ltr" />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={addTeam} disabled={acting === 'new'}
                                        className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold px-4 py-2 rounded-xl text-sm">
                                        {acting === 'new' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} إضافة
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Teams list */}
            {loading ? (
                <div className="space-y-2">
                    {[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse border border-slate-100" />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                    <Trophy className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm">لا توجد فرق مطابقة</p>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    {filtered.map((team, idx) => {
                        const scfg = STATUS_CFG[team.status] || STATUS_CFG.pending;
                        const pcfg = PAY_CFG[team.registration?.payment_status || 'pending'];
                        const isOpen = expanded === team.id;
                        const tab = getTab(team.id);
                        const players = teamPlayers[team.id] || [];
                        const catName = categories.find(c => c.id === team.category_id)?.name;
                        const isImported = team.notes?.includes('مستورد من المنصة');
                        const regDate = team.registered_at ? new Date(team.registered_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
                        const playerCount = teamPlayers[team.id] !== undefined ? teamPlayers[team.id].length : team.players_count;

                        return (
                            <div key={team.id} className={idx > 0 ? 'border-t border-slate-100' : ''}>
                                {/* Row */}
                                <div className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                                    onClick={() => {
                                        const opening = !isOpen;
                                        setExpanded(isOpen ? null : team.id);
                                        if (opening && getTab(team.id) === 'players') loadPlayers(team.id);
                                    }}>
                                    {/* Status dot */}
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${scfg.dot}`} />

                                    {/* Logo */}
                                    {resolveImg(team.logo_url, 'clubavatar') ? (
                                        <img src={resolveImg(team.logo_url, 'clubavatar')!} alt={team.name}
                                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                    ) : (
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center flex-shrink-0 text-sm font-bold text-slate-500">
                                            {team.name.charAt(0)}
                                        </div>
                                    )}

                                    {/* Main info */}
                                    <div className="flex-1 min-w-0">
                                        {/* Name row */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-bold text-slate-900 text-sm">{team.name}</p>
                                            {catName && (
                                                <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded-md font-semibold">{catName}</span>
                                            )}
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${scfg.cls} inline-flex items-center gap-1`}>
                                                <scfg.icon className="w-3 h-3" /> {scfg.label}
                                            </span>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${pcfg.cls}`}>
                                                {pcfg.label}
                                            </span>
                                        </div>

                                        {/* Meta row */}
                                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                                            {(team.club_name || team.city) && (
                                                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                                    <Building2 className="w-3 h-3" />
                                                    {team.club_name || team.city}
                                                </span>
                                            )}
                                            <span className="text-[11px] flex items-center gap-1 font-medium"
                                                title="عدد اللاعبين المسجلين">
                                                <Users className="w-3 h-3 text-slate-400" />
                                                <span className={playerCount === 0 ? 'text-slate-400' : 'text-emerald-600 font-bold'}>
                                                    {playerCount} لاعب
                                                </span>
                                            </span>
                                            {regDate && (
                                                <span className="text-[11px] text-slate-400 flex items-center gap-1" title="تاريخ التسجيل">
                                                    <Clock className="w-3 h-3" />
                                                    {regDate}
                                                </span>
                                            )}
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold flex items-center gap-1 ${
                                                isImported
                                                    ? 'bg-violet-50 text-violet-600 border border-violet-100'
                                                    : 'bg-slate-50 text-slate-500 border border-slate-200'
                                            }`} title="مصدر التسجيل">
                                                {isImported ? (
                                                    <><Link2 className="w-3 h-3" /> مستورد من المنصة</>
                                                ) : (
                                                    <><PenLine className="w-3 h-3" /> إضافة يدوية</>
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Expand icon */}
                                    <div className="flex-shrink-0 mt-1">
                                        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                    </div>
                                </div>

                                {/* Expanded */}
                                {isOpen && (
                                    <div className="border-t border-slate-100 bg-slate-50/50">

                                        {/* Tabs */}
                                        <div className="flex gap-1 px-4 pt-3">
                                            {(['info', 'players', 'import'] as const).map(t => (
                                                <button key={t} onClick={() => setTab(team.id, t)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === t ? 'bg-yellow-500 text-white' : 'text-slate-600 hover:bg-white hover:shadow-sm'}`}>
                                                    {t === 'info' ? '📋 المعلومات' : t === 'players' ? `👤 اللاعبون${players.length ? ` (${players.length})` : ''}` : '🔗 استيراد من المنصة'}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Info tab */}
                                        {tab === 'info' && (
                                            <div className="px-4 pb-4 space-y-4 pt-3">
                                                <div className="grid grid-cols-2 gap-3">
                                                    {team.contact_phone && (
                                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                                            <Phone className="w-4 h-4 text-slate-400" />
                                                            <a href={`tel:${team.contact_phone}`} className="hover:text-blue-600">{team.contact_phone}</a>
                                                        </div>
                                                    )}
                                                    {team.contact_email && (
                                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                                            <Mail className="w-4 h-4 text-slate-400" />
                                                            <span className="truncate">{team.contact_email}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    {team.status !== 'approved' && (
                                                        <button onClick={() => updateStatus(team.id, 'approved')} disabled={!!acting}
                                                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-all disabled:opacity-50">
                                                            {acting === team.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                                            {team.status === 'rejected' ? 'إعادة القبول' : team.status === 'withdrawn' ? 'استعادة الفريق' : 'قبول الفريق'}
                                                        </button>
                                                    )}
                                                    {(team.status === 'pending' || team.status === 'approved') && (
                                                        <button onClick={() => updateStatus(team.id, 'rejected')} disabled={!!acting}
                                                            className="flex items-center gap-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold px-3 py-1.5 rounded-xl text-xs transition-all disabled:opacity-50">
                                                            <XCircle className="w-3 h-3" />
                                                            {team.status === 'approved' ? 'سحب القبول' : 'رفض'}
                                                        </button>
                                                    )}
                                                    <div className="flex items-center gap-1.5 mr-auto">
                                                        <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                                                        <select value={team.registration?.payment_status || 'pending'}
                                                            onChange={e => updatePayment(team.id, e.target.value)}
                                                            disabled={acting === team.id + '_pay'}
                                                            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 cursor-pointer focus:outline-none">
                                                            {Object.entries(PAY_CFG).map(([v, c]) => (
                                                                <option key={v} value={v}>{c.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                {team.notes && (
                                                    <p className="text-xs text-slate-500 bg-white rounded-lg p-2.5 border border-slate-100">
                                                        📝 {team.notes}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Players tab */}
                                        {tab === 'players' && (
                                            <div className="px-4 pb-4 pt-3 space-y-3">
                                                {loadingPl === team.id ? (
                                                    <div className="flex items-center gap-2 text-slate-400 text-sm py-4 justify-center">
                                                        <Loader2 className="w-4 h-4 animate-spin" /> جاري التحميل...
                                                    </div>
                                                ) : (
                                                    <>
                                                        {players.length === 0 && (
                                                            <p className="text-center text-slate-400 text-xs py-4">لا يوجد لاعبون مسجلون بعد</p>
                                                        )}
                                                        {players.length > 0 && (
                                                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                                                <table className="w-full text-xs">
                                                                    <thead className="bg-slate-50 border-b border-slate-100">
                                                                        <tr>
                                                                            <th className="px-3 py-2 text-right font-bold text-slate-500 w-8">#</th>
                                                                            <th className="px-3 py-2 text-right font-bold text-slate-500">الاسم</th>
                                                                            <th className="px-3 py-2 text-right font-bold text-slate-500">المركز</th>
                                                                            <th className="px-3 py-2 text-right font-bold text-slate-500">الجوال</th>
                                                                            <th className="px-2 py-2 w-8" />
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-50">
                                                                        {players.map(p => (
                                                                            <tr key={p.id} className="hover:bg-slate-50">
                                                                                <td className="px-3 py-2 text-center text-slate-400 font-mono">
                                                                                    {p.jersey_number || '—'}
                                                                                </td>
                                                                                <td className="px-3 py-2 font-semibold text-slate-800">
                                                                                    {p.player_name}
                                                                                    {p.platform_player_id && <Link2 className="w-3 h-3 text-indigo-400 inline mr-1" />}
                                                                                </td>
                                                                                <td className="px-3 py-2 text-slate-500">{p.position || '—'}</td>
                                                                                <td className="px-3 py-2 text-slate-500 dir-ltr">{p.phone || '—'}</td>
                                                                                <td className="px-2 py-2">
                                                                                    <button onClick={() => deletePlayer(team.id, p.id)}
                                                                                        className="text-slate-300 hover:text-rose-500 transition-colors">
                                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}

                                                        {/* Add player form */}
                                                        {showAddPlayer === team.id ? (
                                                            <div className="bg-white border border-yellow-200 rounded-xl p-3 space-y-2">
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div>
                                                                        <label className="form-label">اسم اللاعب *</label>
                                                                        <input className="form-input" value={newPlayer.player_name}
                                                                            onChange={e => setNewPlayer(p => ({ ...p, player_name: e.target.value }))}
                                                                            placeholder="محمد علي" />
                                                                    </div>
                                                                    <div>
                                                                        <label className="form-label">المركز</label>
                                                                        <select className="form-input" value={newPlayer.position}
                                                                            onChange={e => setNewPlayer(p => ({ ...p, position: e.target.value }))}>
                                                                            <option value="">اختر</option>
                                                                            {POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                                                                        </select>
                                                                    </div>
                                                                    <div>
                                                                        <label className="form-label">رقم القميص</label>
                                                                        <input type="number" className="form-input" value={newPlayer.jersey_number}
                                                                            onChange={e => setNewPlayer(p => ({ ...p, jersey_number: e.target.value }))}
                                                                            placeholder="10" min="1" max="99" />
                                                                    </div>
                                                                    <div>
                                                                        <label className="form-label">الجوال</label>
                                                                        <input className="form-input" value={newPlayer.phone}
                                                                            onChange={e => setNewPlayer(p => ({ ...p, phone: e.target.value }))}
                                                                            placeholder="+966..." dir="ltr" />
                                                                    </div>
                                                                    <div>
                                                                        <label className="form-label">تاريخ الميلاد</label>
                                                                        <input type="date" className="form-input" value={newPlayer.date_of_birth}
                                                                            onChange={e => setNewPlayer(p => ({ ...p, date_of_birth: e.target.value }))} />
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button onClick={() => addPlayer(team.id)} disabled={acting === 'addplayer_' + team.id}
                                                                        className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-white font-bold px-3 py-1.5 rounded-lg text-xs">
                                                                        {acting === 'addplayer_' + team.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                                                        إضافة
                                                                    </button>
                                                                    <button onClick={() => setShowAddPlayer(null)} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">إلغاء</button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <button onClick={() => setShowAddPlayer(team.id)}
                                                                className="flex items-center gap-2 text-xs font-semibold text-yellow-600 hover:text-yellow-500 border border-dashed border-yellow-300 hover:border-yellow-400 rounded-xl px-3 py-2 w-full justify-center transition-all">
                                                                <UserPlus className="w-3.5 h-3.5" /> إضافة لاعب يدوياً
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}

                                        {/* Import tab */}
                                        {tab === 'import' && (
                                            <div className="px-4 pb-4 pt-3 space-y-3">
                                                <p className="text-xs text-slate-500">ابحث عن أندية أو لاعبين مسجلين في المنصة واستوردهم مباشرة.</p>

                                                <div className="flex gap-2">
                                                    <select value={importType} onChange={e => setImportType(e.target.value as any)}
                                                        className="text-xs border border-slate-200 rounded-lg px-2 py-2 bg-white text-slate-700 focus:outline-none">
                                                        <option value="all">الكل</option>
                                                        <option value="club">أندية/أكاديميات</option>
                                                        <option value="player">لاعبون</option>
                                                    </select>
                                                    <div className="relative flex-1">
                                                        <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                                        <input
                                                            value={importQuery}
                                                            onChange={e => setImportQuery(e.target.value)}
                                                            onKeyDown={e => e.key === 'Enter' && searchPlatform(team.id)}
                                                            placeholder="ابحث بالاسم أو الجوال..."
                                                            className="w-full text-xs border border-slate-200 rounded-lg pr-8 pl-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400/30" />
                                                    </div>
                                                    <button onClick={() => searchPlatform(team.id)} disabled={searching || importQuery.length < 2}
                                                        className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-3 py-2 rounded-lg text-xs">
                                                        {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                                                        بحث
                                                    </button>
                                                </div>

                                                {importErrors.length > 0 && (
                                                    <div className="text-[10px] bg-rose-50 border border-rose-200 rounded-lg p-2 text-rose-700 space-y-0.5">
                                                        <p className="font-bold text-xs">أخطاء:</p>
                                                        {importErrors.map((e, i) => <p key={i} className="font-mono">{e}</p>)}
                                                    </div>
                                                )}

                                                {importResults.length > 0 && (
                                                    <div className="space-y-1.5">
                                                        {importResults.map((r, i) => (
                                                            <div key={i} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3 py-2.5">
                                                                {resolveImg(r.logo_url) ? (
                                                                    <img src={resolveImg(r.logo_url)!} alt={r.name}
                                                                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                                                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }} />
                                                                ) : null}
                                                                <div className={`w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-slate-500 ${resolveImg(r.logo_url) ? 'hidden' : ''}`}>
                                                                    {r.name.charAt(0)}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-bold text-slate-800 truncate">{r.name}</p>
                                                                    <p className="text-[10px] text-slate-400">
                                                                        {r.type === 'player' ? `لاعب · ${r.position || 'غير محدد'}` : r.account_type || 'نادي'}
                                                                        {r.city ? ` · ${r.city}` : ''}
                                                                    </p>
                                                                </div>
                                                                {r.type === 'club' || r.type === 'user' ? (
                                                                    <button
                                                                        onClick={() => importAsTeam(r)}
                                                                        disabled={importingId === (r.platform_user_id || r.name)}
                                                                        className="flex items-center gap-1 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-2.5 py-1.5 rounded-lg transition-all flex-shrink-0">
                                                                        <Download className="w-3 h-3" /> استورد كفريق
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => importAsPlayer(r, team.id)}
                                                                        disabled={importingId === (r.platform_player_id || r.name)}
                                                                        className="flex items-center gap-1 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-2.5 py-1.5 rounded-lg transition-all flex-shrink-0">
                                                                        {importingId === (r.platform_player_id || r.name)
                                                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                                                            : <UserPlus className="w-3 h-3" />}
                                                                        أضف للفريق
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {importResults.length === 0 && importQuery.length >= 2 && !searching && (
                                                    <p className="text-center text-slate-400 text-xs py-3">لا توجد نتائج</p>
                                                )}
                                            </div>
                                        )}
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
