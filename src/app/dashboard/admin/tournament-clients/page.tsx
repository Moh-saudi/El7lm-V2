'use client';

import { useEffect, useState } from 'react';
import { Loader2, Trophy, Users, Plus, Trash2, Eye, EyeOff, Search, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

type Client = {
    id: string;
    supabase_auth_id: string;
    name: string;
    organization_name: string | null;
    email: string;
    phone: string | null;
    country: string | null;
    is_active: boolean;
    created_at: string;
    _tournament_count: number;
};

const EMPTY_FORM = { name: '', org: '', email: '', phone: '', country: '', password: '' };

export default function TournamentClientsPage() {
    const [clients,    setClients]    = useState<Client[]>([]);
    const [loading,    setLoading]    = useState(true);
    const [search,     setSearch]     = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [form,       setForm]       = useState(EMPTY_FORM);
    const [creating,   setCreating]   = useState(false);

    // ── Load via service-role API ────────────────────────────
    const load = async () => {
        setLoading(true);
        try {
            const res  = await fetch('/api/admin/tournament-clients/list');
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            setClients(json.clients || []);
        } catch (e: any) {
            toast.error('فشل التحميل: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    // ── Toggle active ────────────────────────────────────────
    const toggleActive = async (client: Client) => {
        const res  = await fetch('/api/admin/tournament-clients/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: client.id, is_active: !client.is_active }),
        });
        const json = await res.json();
        if (!res.ok) { toast.error(json.error); return; }
        setClients(prev => prev.map(c => c.id === client.id ? { ...c, is_active: !c.is_active } : c));
        toast.success(client.is_active ? 'تم تعطيل الحساب' : 'تم تفعيل الحساب');
    };

    // ── Delete ───────────────────────────────────────────────
    const deleteClient = async (client: Client) => {
        if (!confirm(`حذف العميل "${client.name}"؟ سيتم حذف جميع بطولاته.`)) return;
        const res  = await fetch('/api/admin/tournament-clients/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: client.id, supabase_auth_id: client.supabase_auth_id }),
        });
        const json = await res.json();
        if (!res.ok) { toast.error(json.error); return; }
        setClients(prev => prev.filter(c => c.id !== client.id));
        toast.success('تم الحذف');
    };

    // ── Create ───────────────────────────────────────────────
    const createClient_ = async () => {
        if (!form.name || !form.email || !form.password) {
            toast.error('الاسم والبريد وكلمة المرور مطلوبة'); return;
        }
        if (form.password.length < 8) {
            toast.error('كلمة المرور 8 أحرف على الأقل'); return;
        }
        setCreating(true);
        try {
            const res  = await fetch('/api/admin/tournament-clients/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name:              form.name,
                    organization_name: form.org  || null,
                    email:             form.email,
                    phone:             form.phone || null,
                    country:           form.country || null,
                    password:          form.password,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'فشل الإنشاء');
            toast.success('تم إنشاء حساب العميل بنجاح');
            setShowCreate(false);
            setForm(EMPTY_FORM);
            await load(); // ← يعيد تحميل القائمة
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setCreating(false);
        }
    };

    // ── Filtered list ────────────────────────────────────────
    const filtered = clients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.organization_name || '').toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase())
    );

    const activeCount      = clients.filter(c => c.is_active).length;
    const totalTournaments = clients.reduce((s, c) => s + c._tournament_count, 0);

    return (
        <div className="p-6 space-y-6" dir="rtl">

            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">عملاء البطولات</h1>
                    <p className="text-sm text-slate-500 mt-0.5">إدارة حسابات منظمي البطولات الخارجيين</p>
                </div>
                <button onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all">
                    <Plus className="w-4 h-4" /> إضافة عميل
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-3xl font-black text-slate-900">{clients.length}</p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> إجمالي العملاء
                    </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-3xl font-black text-emerald-600">{activeCount}</p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" /> عملاء نشطون
                    </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-3xl font-black text-yellow-600">{totalTournaments}</p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5" /> بطولات مُنشأة
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="بحث بالاسم أو المنظمة أو البريد..."
                    className="w-full border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-sm text-slate-800 outline-none focus:border-yellow-400 transition-colors bg-white" />
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-sm">
                        {search ? 'لا توجد نتائج' : 'لم يتم إضافة أي عملاء بعد — اضغط «إضافة عميل»'}
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500">
                                <th className="px-5 py-3 text-right">العميل</th>
                                <th className="px-4 py-3 text-right hidden sm:table-cell">المنظمة</th>
                                <th className="px-4 py-3 text-center hidden md:table-cell">البطولات</th>
                                <th className="px-4 py-3 text-center">الحالة</th>
                                <th className="px-4 py-3 text-right hidden lg:table-cell">تاريخ الإضافة</th>
                                <th className="px-4 py-3 text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.map(c => (
                                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-4">
                                        <div>
                                            <p className="font-semibold text-slate-900">{c.name}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{c.email}</p>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-slate-600 hidden sm:table-cell">
                                        {c.organization_name || <span className="text-slate-300">—</span>}
                                    </td>
                                    <td className="px-4 py-4 text-center hidden md:table-cell">
                                        <span className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-700 text-xs font-bold px-2 py-1 rounded-full">
                                            <Trophy className="w-3 h-3" /> {c._tournament_count}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {c.is_active ? 'نشط' : 'معطل'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-xs text-slate-400 hidden lg:table-cell">
                                        {new Date(c.created_at).toLocaleDateString('ar-SA')}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center justify-center gap-1">
                                            <a href="/tournament-portal" target="_blank"
                                                className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="فتح البوابة">
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                            <button onClick={() => toggleActive(c)}
                                                className={`p-1.5 rounded-lg transition-colors ${c.is_active ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                                                title={c.is_active ? 'تعطيل' : 'تفعيل'}>
                                                {c.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                            </button>
                                            <button onClick={() => deleteClient(c)}
                                                className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                title="حذف">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    onClick={() => setShowCreate(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4"
                        onClick={e => e.stopPropagation()}>
                        <h3 className="font-black text-slate-900 text-lg">إضافة عميل جديد</h3>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className="text-xs font-bold text-slate-500 block mb-1">الاسم الكامل *</label>
                                <input value={form.name}
                                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-yellow-400 transition-colors"
                                    placeholder="محمد أحمد" />
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs font-bold text-slate-500 block mb-1">اسم المنظمة / النادي</label>
                                <input value={form.org}
                                    onChange={e => setForm(p => ({ ...p, org: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-yellow-400 transition-colors"
                                    placeholder="اتحاد كرة القدم" />
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs font-bold text-slate-500 block mb-1">البريد الإلكتروني *</label>
                                <input type="email" value={form.email}
                                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-yellow-400 transition-colors"
                                    placeholder="client@example.com" dir="ltr" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">رقم الهاتف</label>
                                <input value={form.phone}
                                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-yellow-400 transition-colors"
                                    placeholder="+966..." />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">الدولة</label>
                                <input value={form.country}
                                    onChange={e => setForm(p => ({ ...p, country: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-yellow-400 transition-colors"
                                    placeholder="السعودية" />
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs font-bold text-slate-500 block mb-1">كلمة المرور *</label>
                                <input type="password" value={form.password}
                                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-yellow-400 transition-colors"
                                    placeholder="8 أحرف على الأقل" dir="ltr" />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); }}
                                className="flex-1 border border-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-colors">
                                إلغاء
                            </button>
                            <button onClick={createClient_} disabled={creating}
                                className="flex-1 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                إنشاء الحساب
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
