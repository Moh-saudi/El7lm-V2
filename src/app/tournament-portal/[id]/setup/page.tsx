'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Trash2, Save, Loader2, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { createPortalClient } from '@/lib/tournament-portal/auth';

type Category = {
    id?: string; name: string; age_min: string; age_max: string;
    max_teams: string; type: string; group_count: string;
    teams_per_group: string; advance_count: string; sort_order: number;
};

const EMPTY_CAT = (): Category => ({
    name: '', age_min: '', age_max: '', max_teams: '', type: 'knockout',
    group_count: '', teams_per_group: '', advance_count: '', sort_order: 0,
});

const STATUS_FLOW: Record<string, { next: string; label: string; color: string }> = {
    draft:   { next: 'open',      label: 'فتح باب التسجيل',   color: 'bg-emerald-600 hover:bg-emerald-500' },
    open:    { next: 'closed',    label: 'إغلاق التسجيل',     color: 'bg-orange-500 hover:bg-orange-400'   },
    closed:  { next: 'ongoing',   label: 'بدء البطولة',        color: 'bg-blue-600 hover:bg-blue-500'       },
    ongoing: { next: 'completed', label: 'إنهاء البطولة',      color: 'bg-purple-600 hover:bg-purple-500'   },
};

export default function TournamentSetupPage() {
    const { id } = useParams<{ id: string }>();
    const [tournament,  setTournament]  = useState<any>(null);
    const [categories,  setCategories]  = useState<Category[]>([]);
    const [saving,      setSaving]      = useState(false);
    const [statusLoading, setStatusLoading] = useState(false);
    const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

    const supabase = createPortalClient();

    useEffect(() => {
        (async () => {
            const { data: t } = await supabase.from('tournament_new').select('*').eq('id', id).single();
            setTournament(t);

            const { data: cats } = await supabase
                .from('tournament_categories')
                .select('*')
                .eq('tournament_id', id)
                .order('sort_order');

            if (cats && cats.length > 0) {
                setCategories(cats.map((c: any) => ({
                    id:              c.id,
                    name:            c.name        || '',
                    age_min:         c.age_min?.toString()        || '',
                    age_max:         c.age_max?.toString()        || '',
                    max_teams:       c.max_teams?.toString()      || '',
                    type:            c.type        || 'knockout',
                    group_count:     c.group_count?.toString()    || '',
                    teams_per_group: c.teams_per_group?.toString()|| '',
                    advance_count:   c.advance_count?.toString()  || '',
                    sort_order:      c.sort_order  || 0,
                })));
            }
        })();
    }, [id]);

    const setField = (idx: number, k: keyof Category) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
            setCategories(prev => prev.map((c, i) => i === idx ? { ...c, [k]: e.target.value } : c));

    const addCategory = () => {
        setCategories(prev => [...prev, { ...EMPTY_CAT(), sort_order: prev.length }]);
        setExpandedIdx(categories.length);
    };

    const removeCategory = async (idx: number) => {
        const cat = categories[idx];
        if (cat.id) {
            await supabase.from('tournament_categories').delete().eq('id', cat.id);
        }
        setCategories(prev => prev.filter((_, i) => i !== idx));
    };

    const saveCategories = async () => {
        setSaving(true);
        try {
            for (const cat of categories) {
                if (!cat.name.trim()) continue;
                const payload = {
                    tournament_id:   id,
                    name:            cat.name,
                    age_min:         cat.age_min         ? +cat.age_min         : null,
                    age_max:         cat.age_max         ? +cat.age_max         : null,
                    max_teams:       cat.max_teams       ? +cat.max_teams       : null,
                    type:            cat.type,
                    group_count:     cat.group_count     ? +cat.group_count     : null,
                    teams_per_group: cat.teams_per_group ? +cat.teams_per_group : null,
                    advance_count:   cat.advance_count   ? +cat.advance_count   : null,
                    sort_order:      cat.sort_order,
                };
                if (cat.id) {
                    await supabase.from('tournament_categories').update(payload).eq('id', cat.id);
                } else {
                    const { data } = await supabase.from('tournament_categories').insert(payload).select('id').single();
                    if (data) cat.id = data.id;
                }
            }
            toast.success('تم حفظ الفئات');
        } catch (e: any) {
            toast.error('فشل الحفظ: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    const advanceStatus = async () => {
        if (!tournament || !STATUS_FLOW[tournament.status]) return;
        setStatusLoading(true);
        const next = STATUS_FLOW[tournament.status].next;
        const { error } = await supabase
            .from('tournament_new')
            .update({ status: next })
            .eq('id', id);
        if (error) { toast.error(error.message); }
        else {
            toast.success(`تم تغيير الحالة إلى: ${next}`);
            setTournament((prev: any) => ({ ...prev, status: next }));
        }
        setStatusLoading(false);
    };

    if (!tournament) return (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
        </div>
    );

    const nextAction = STATUS_FLOW[tournament.status];

    return (
        <div className="space-y-6 max-w-2xl" dir="rtl">

            {/* Status control */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" /> حالة البطولة
                </h3>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-600">
                            الحالة الحالية: <span className="font-bold text-slate-900">{tournament.status}</span>
                        </p>
                        {nextAction && (
                            <p className="text-xs text-slate-400 mt-0.5">الخطوة التالية: {nextAction.next}</p>
                        )}
                    </div>
                    {nextAction && (
                        <button
                            onClick={advanceStatus}
                            disabled={statusLoading}
                            className={`flex items-center gap-2 ${nextAction.color} disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all`}
                        >
                            {statusLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                            {nextAction.label}
                        </button>
                    )}
                </div>
            </div>

            {/* Categories */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-sm">الفئات العمرية</h3>
                    <button onClick={addCategory}
                        className="flex items-center gap-1.5 text-xs font-bold text-yellow-600 hover:text-yellow-500 transition-colors">
                        <Plus className="w-4 h-4" /> إضافة فئة
                    </button>
                </div>

                {categories.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                        <p className="text-sm mb-3">لم تُضف أي فئات بعد</p>
                        <button onClick={addCategory}
                            className="text-xs font-bold text-yellow-600 hover:text-yellow-500 underline underline-offset-2">
                            إضافة أول فئة
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {categories.map((cat, idx) => (
                            <div key={idx}>
                                {/* Row header */}
                                <div
                                    className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                                    onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                                >
                                    <div className="w-7 h-7 bg-yellow-100 rounded-lg flex items-center justify-center text-xs font-black text-yellow-700">
                                        {idx + 1}
                                    </div>
                                    <span className="flex-1 font-semibold text-slate-800 text-sm">
                                        {cat.name || 'فئة جديدة'}
                                    </span>
                                    <span className="text-xs text-slate-400">{cat.type}</span>
                                    <button onClick={e => { e.stopPropagation(); removeCategory(idx); }}
                                        className="text-slate-300 hover:text-rose-500 transition-colors p-1">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                    {expandedIdx === idx ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                </div>

                                {/* Expanded fields */}
                                {expandedIdx === idx && (
                                    <div className="px-5 pb-5 space-y-3 bg-slate-50/50">
                                        <div className="grid grid-cols-2 gap-3 pt-3">
                                            <div>
                                                <label className="form-label">اسم الفئة *</label>
                                                <input className="form-input" value={cat.name} onChange={setField(idx, 'name')} placeholder="الكبار / U17 / U14..." />
                                            </div>
                                            <div>
                                                <label className="form-label">نظام المنافسة</label>
                                                <select className="form-input" value={cat.type} onChange={setField(idx, 'type')}>
                                                    <option value="knockout">كأس (إقصائي)</option>
                                                    <option value="league">دوري</option>
                                                    <option value="groups_knockout">مجموعات + إقصاء</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="form-label">العمر الأدنى</label>
                                                <input type="number" className="form-input" value={cat.age_min} onChange={setField(idx, 'age_min')} placeholder="14" />
                                            </div>
                                            <div>
                                                <label className="form-label">العمر الأقصى</label>
                                                <input type="number" className="form-input" value={cat.age_max} onChange={setField(idx, 'age_max')} placeholder="17" />
                                            </div>
                                            <div>
                                                <label className="form-label">الحد الأقصى للفرق</label>
                                                <input type="number" className="form-input" value={cat.max_teams} onChange={setField(idx, 'max_teams')} placeholder="16" />
                                            </div>
                                        </div>

                                        {cat.type === 'groups_knockout' && (
                                            <div className="grid grid-cols-3 gap-3 border-t border-slate-200 pt-3">
                                                <div>
                                                    <label className="form-label">عدد المجموعات</label>
                                                    <input type="number" className="form-input" value={cat.group_count} onChange={setField(idx, 'group_count')} placeholder="4" />
                                                </div>
                                                <div>
                                                    <label className="form-label">فرق في كل مجموعة</label>
                                                    <input type="number" className="form-input" value={cat.teams_per_group} onChange={setField(idx, 'teams_per_group')} placeholder="4" />
                                                </div>
                                                <div>
                                                    <label className="form-label">المتأهلون من كل مجموعة</label>
                                                    <input type="number" className="form-input" value={cat.advance_count} onChange={setField(idx, 'advance_count')} placeholder="2" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {categories.length > 0 && (
                    <div className="px-5 py-4 border-t border-slate-100">
                        <button
                            onClick={saveCategories}
                            disabled={saving}
                            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-xl text-sm transition-all"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            حفظ الفئات
                        </button>
                    </div>
                )}
            </div>

            <style jsx global>{`
                .form-label { display: block; font-size: 0.7rem; font-weight: 600; color: #64748b; margin-bottom: 0.3rem; }
                .form-input { width: 100%; border: 1px solid #e2e8f0; border-radius: 0.625rem; padding: 0.5rem 0.75rem; font-size: 0.8rem; color: #0f172a; background: white; outline: none; transition: all 0.15s; }
                .form-input:focus { border-color: #eab308; box-shadow: 0 0 0 3px rgba(234,179,8,0.15); }
            `}</style>
        </div>
    );
}
