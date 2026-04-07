'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Send, Bell, Users, CheckCircle, Clock, AlertCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { createPortalClient } from '@/lib/tournament-portal/auth';

type Team = { id: string; name: string; logo_url: string | null };
type Notif = {
    id: string;
    title: string;
    body: string;
    target_type: 'all' | 'team' | 'category';
    target_id: string | null;
    status: 'pending' | 'sent' | 'failed';
    created_at: string;
    sent_at: string | null;
    target_team?: { name: string } | null;
};

const TEMPLATES = [
    { label: 'موعد المباراة',     title: 'تذكير بموعد المباراة', body: 'يُذكَّر فريقكم بموعد المباراة القادمة. يرجى الحضور في الوقت المحدد.' },
    { label: 'نتيجة المباراة',    title: 'نتيجة المباراة', body: 'تم تسجيل نتيجة مباراتكم الأخيرة. يمكنكم الاطلاع عليها من خلال التطبيق.' },
    { label: 'جدول المباريات',    title: 'جدول المباريات المحدث', body: 'تم تحديث جدول مباريات البطولة. يرجى الاطلاع على المواعيد الجديدة.' },
    { label: 'تهنئة بالتأهل',    title: 'مبروك التأهل!', body: 'يهنئكم منظمو البطولة بالتأهل إلى الدور القادم. استمروا في التألق!' },
    { label: 'معلومة عامة',       title: 'إشعار من البطولة', body: '' },
];

export default function NotificationsPage() {
    const { id } = useParams<{ id: string }>();
    const [teams,       setTeams]       = useState<Team[]>([]);
    const [notifs,      setNotifs]      = useState<Notif[]>([]);
    const [loading,     setLoading]     = useState(true);
    const [sending,     setSending]     = useState(false);

    // Form state
    const [title,       setTitle]       = useState('');
    const [body,        setBody]        = useState('');
    const [targetType,  setTargetType]  = useState<'all' | 'team'>('all');
    const [targetTeam,  setTargetTeam]  = useState('');

    const supabase = createPortalClient();

    const loadData = useCallback(async () => {
        const [teamsRes, notifsRes] = await Promise.all([
            supabase.from('tournament_teams')
                .select('id, name, logo_url')
                .eq('tournament_id', id)
                .eq('status', 'approved')
                .order('name'),
            supabase.from('tournament_notifications')
                .select('*, target_team:tournament_teams!target_id(name)')
                .eq('tournament_id', id)
                .order('created_at', { ascending: false })
                .limit(50),
        ]);
        setTeams(teamsRes.data || []);
        setNotifs((notifsRes.data as any) || []);
        setLoading(false);
    }, [id]);

    useEffect(() => { loadData(); }, [loadData]);

    const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
        setTitle(tpl.title);
        setBody(tpl.body);
    };

    const sendNotification = async () => {
        if (!title.trim() || !body.trim()) { toast.error('أدخل العنوان والمحتوى'); return; }
        if (targetType === 'team' && !targetTeam) { toast.error('اختر الفريق المستهدف'); return; }

        setSending(true);
        try {
            const { error } = await supabase.from('tournament_notifications').insert({
                tournament_id: id,
                title:         title.trim(),
                body:          body.trim(),
                target_type:   targetType,
                target_id:     targetType === 'team' ? targetTeam : null,
                status:        'sent',
                sent_at:       new Date().toISOString(),
            });
            if (error) throw error;
            toast.success('تم إرسال الإشعار بنجاح');
            setTitle(''); setBody(''); setTargetTeam(''); setTargetType('all');
            await loadData();
        } catch (e: any) {
            toast.error('فشل الإرسال: ' + e.message);
        } finally {
            setSending(false);
        }
    };

    const deleteNotif = async (nid: string) => {
        await supabase.from('tournament_notifications').delete().eq('id', nid);
        setNotifs(prev => prev.filter(n => n.id !== nid));
        toast.success('تم الحذف');
    };

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
        </div>
    );

    const sentCount    = notifs.filter(n => n.status === 'sent').length;
    const pendingCount = notifs.filter(n => n.status === 'pending').length;

    return (
        <div className="grid lg:grid-cols-2 gap-5" dir="rtl">

            {/* ── Compose panel ── */}
            <div className="space-y-4">

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                        <div>
                            <p className="text-2xl font-black text-slate-900">{sentCount}</p>
                            <p className="text-xs text-slate-500">إشعار مُرسل</p>
                        </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
                        <Users className="w-5 h-5 text-blue-500" />
                        <div>
                            <p className="text-2xl font-black text-slate-900">{teams.length}</p>
                            <p className="text-xs text-slate-500">فريق مقبول</p>
                        </div>
                    </div>
                </div>

                {/* Compose form */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <Bell className="w-4 h-4 text-yellow-500" /> إنشاء إشعار جديد
                    </h3>

                    {/* Templates */}
                    <div>
                        <p className="text-[11px] font-bold text-slate-500 mb-2">قوالب جاهزة</p>
                        <div className="flex flex-wrap gap-2">
                            {TEMPLATES.map(tpl => (
                                <button key={tpl.label} onClick={() => applyTemplate(tpl)}
                                    className="text-[11px] bg-slate-100 hover:bg-yellow-100 hover:text-yellow-700 text-slate-600 font-semibold px-2.5 py-1.5 rounded-lg transition-colors">
                                    {tpl.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Target */}
                    <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5">المستهدفون</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setTargetType('all')}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all
                                    ${targetType === 'all' ? 'border-yellow-400 bg-yellow-50 text-yellow-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                                <Users className="w-3.5 h-3.5" /> جميع الفرق
                            </button>
                            <button onClick={() => setTargetType('team')}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all
                                    ${targetType === 'team' ? 'border-yellow-400 bg-yellow-50 text-yellow-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                                <Bell className="w-3.5 h-3.5" /> فريق محدد
                            </button>
                        </div>
                        {targetType === 'team' && (
                            <select value={targetTeam} onChange={e => setTargetTeam(e.target.value)}
                                className="mt-2 w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-yellow-400">
                                <option value="">اختر الفريق...</option>
                                {teams.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Title */}
                    <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5">عنوان الإشعار *</label>
                        <input value={title} onChange={e => setTitle(e.target.value)}
                            placeholder="مثال: تذكير بموعد المباراة"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-yellow-400 transition-colors" />
                    </div>

                    {/* Body */}
                    <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1.5">نص الإشعار *</label>
                        <textarea value={body} onChange={e => setBody(e.target.value)} rows={4}
                            placeholder="اكتب محتوى الإشعار هنا..."
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-yellow-400 transition-colors resize-none" />
                        <p className="text-[10px] text-slate-400 mt-1 text-left">{body.length} / 500</p>
                    </div>

                    {/* Preview */}
                    {(title || body) && (
                        <div className="bg-slate-900 rounded-2xl p-4 text-white">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                                    <Bell className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs font-black">{title || 'العنوان'}</p>
                                    <p className="text-[10px] text-slate-400">الآن</p>
                                </div>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">{body || 'نص الإشعار...'}</p>
                        </div>
                    )}

                    <button onClick={sendNotification} disabled={sending}
                        className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-white font-black py-3 rounded-xl text-sm transition-all">
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        إرسال الإشعار
                    </button>
                </div>
            </div>

            {/* ── History panel ── */}
            <div className="space-y-4">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" /> سجل الإشعارات
                </h3>

                {notifs.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-sm">
                        لم يتم إرسال أي إشعارات بعد
                    </div>
                ) : (
                    <div className="space-y-3">
                        {notifs.map(n => (
                            <div key={n.id} className="bg-white border border-slate-200 rounded-2xl p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center
                                            ${n.status === 'sent' ? 'bg-emerald-100' : n.status === 'failed' ? 'bg-rose-100' : 'bg-amber-100'}`}>
                                            {n.status === 'sent'    ? <CheckCircle className="w-4 h-4 text-emerald-600" /> :
                                             n.status === 'failed'  ? <AlertCircle className="w-4 h-4 text-rose-500" /> :
                                             <Clock className="w-4 h-4 text-amber-500" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-800 text-sm truncate">{n.title}</p>
                                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                                                    ${n.target_type === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                    {n.target_type === 'all' ? 'جميع الفرق' : n.target_team?.name || 'فريق محدد'}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    {new Date(n.created_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => deleteNotif(n.id)}
                                        className="flex-shrink-0 text-slate-300 hover:text-rose-500 transition-colors p-1">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
