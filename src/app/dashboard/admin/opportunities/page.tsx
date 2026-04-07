'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/config';
import { Opportunity, OpportunityApplication, OpportunityType } from '@/types/opportunities';
import { OPPORTUNITY_TYPES, FOOTBALL_POSITIONS } from '@/lib/opportunities/config';
import { useAuth } from '@/lib/firebase/auth-provider';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  AlertTriangle, ArrowUpRight, BarChart3, Building, CheckCircle2, ChevronDown,
  Clock, Edit, Eye, Filter, Globe, Heart, Loader2, MapPin, MessageSquare,
  MoreVertical, PlusCircle, Power, RefreshCw, Search, Star, Target, Trash2,
  Trophy, Users, X, XCircle, Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';

// ── helpers ──────────────────────────────────────────────────────────────────

const TODAY = () => new Date().toISOString().split('T')[0];

const TYPE_CFG = OPPORTUNITY_TYPES as Record<string, { label: string; emoji: string; color: string }>;

const STATUS_META: Record<string, { label: string; cls: string }> = {
  active:    { label: 'نشطة',    cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  draft:     { label: 'مسودة',   cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  closed:    { label: 'مغلقة',   cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  cancelled: { label: 'ملغاة',   cls: 'bg-red-100 text-red-700 border-red-200' },
  disabled:  { label: 'مُعطلة',  cls: 'bg-red-50 text-red-600 border-red-200' },
};

const APP_STATUS_META: Record<string, { label: string; cls: string }> = {
  pending:    { label: 'بانتظار المراجعة', cls: 'bg-amber-100 text-amber-800' },
  reviewed:   { label: 'تمت المراجعة',    cls: 'bg-blue-100 text-blue-800' },
  accepted:   { label: 'مقبول',           cls: 'bg-emerald-100 text-emerald-800' },
  rejected:   { label: 'مرفوض',           cls: 'bg-red-100 text-red-700' },
  waitlisted: { label: 'قائمة انتظار',    cls: 'bg-purple-100 text-purple-800' },
};

const ORGANIZER_LABELS: Record<string, string> = {
  club: 'نادي', academy: 'أكاديمية', trainer: 'مدرب', agent: 'وكيل', marketer: 'مسوّق', admin: 'إدارة المنصة',
};

function fmtDate(d?: string) {
  if (!d) return '—';
  try { return format(new Date(d), 'dd MMM yyyy', { locale: ar }); } catch { return d; }
}

function StatusBadge({ status, isActive }: { status: string; isActive: boolean }) {
  const key = !isActive ? 'disabled' : status;
  const m = STATUS_META[key] || STATUS_META.active;
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${m.cls}`}>{m.label}</span>;
}

// ── Edit Opportunity Modal ──────────────────────────────────────────────────

interface EditModalProps {
  opp: Opportunity;
  onClose: () => void;
  onSaved: (updated: Opportunity) => void;
}

function EditOpportunityModal({ opp, onClose, onSaved }: EditModalProps) {
  const [form, setForm] = useState({
    title: opp.title,
    description: opp.description,
    country: opp.country || '',
    city: opp.city || '',
    location: opp.location || '',
    startDate: opp.startDate,
    endDate: opp.endDate,
    applicationDeadline: opp.applicationDeadline,
    maxApplicants: opp.maxApplicants,
    ageMin: opp.ageMin ?? '',
    ageMax: opp.ageMax ?? '',
    gender: opp.gender || 'both',
    opportunityType: opp.opportunityType,
    status: opp.status,
    isActive: opp.isActive,
    isFeatured: opp.isFeatured,
    isPaid: opp.isPaid,
    fee: opp.fee ?? '',
    currency: opp.currency || 'SAR',
    compensation: opp.compensation || '',
    requirements: opp.requirements || '',
    providesAccommodation: opp.providesAccommodation,
    providesMeals: opp.providesMeals,
    providesTransport: opp.providesTransport,
    targetPositions: opp.targetPositions || [],
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const togglePos = (pos: string) =>
    set('targetPositions', form.targetPositions.includes(pos)
      ? form.targetPositions.filter((p: string) => p !== pos)
      : [...form.targetPositions, pos]);

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('العنوان مطلوب'); return; }
    setSaving(true);
    try {
      const payload = {
        id: opp.id,
        ...form,
        ageMin: form.ageMin !== '' ? Number(form.ageMin) : null,
        ageMax: form.ageMax !== '' ? Number(form.ageMax) : null,
        fee: form.isPaid && form.fee !== '' ? Number(form.fee) : null,
      };
      const res = await fetch('/api/admin/opportunities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, updatedAt: new Date().toISOString() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'فشل التحديث');
      }
      toast.success('تم حفظ التعديلات بنجاح');
      onSaved({ ...opp, ...payload, updatedAt: new Date().toISOString() } as Opportunity);
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ أثناء الحفظ');
    } finally { setSaving(false); }
  };

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-6 px-2" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-slate-900">تعديل الفرصة</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Basic */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 mb-1 block">عنوان الفرصة *</label>
              <input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">نوع الفرصة</label>
              <select className={inputCls} value={form.opportunityType} onChange={e => set('opportunityType', e.target.value)}>
                {Object.entries(TYPE_CFG).map(([k, v]) => (
                  <option key={k} value={k}>{v.emoji} {v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">الحالة</label>
              <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="active">نشطة (مفتوحة)</option>
                <option value="draft">مسودة</option>
                <option value="closed">مغلقة</option>
                <option value="cancelled">ملغاة</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 mb-1 block">الوصف</label>
              <textarea className={`${inputCls} resize-none`} rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
          </div>
          {/* Location */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">الدولة</label>
              <input className={inputCls} value={form.country} onChange={e => set('country', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">المدينة</label>
              <input className={inputCls} value={form.city} onChange={e => set('city', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">الموقع / الملعب</label>
              <input className={inputCls} value={form.location} onChange={e => set('location', e.target.value)} />
            </div>
          </div>
          {/* Dates */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">تاريخ البداية</label>
              <input type="date" className={inputCls} value={form.startDate} onChange={e => set('startDate', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">تاريخ النهاية</label>
              <input type="date" className={inputCls} value={form.endDate} onChange={e => set('endDate', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">آخر موعد للتقديم</label>
              <input type="date" className={inputCls} value={form.applicationDeadline} onChange={e => set('applicationDeadline', e.target.value)} />
            </div>
          </div>
          {/* Conditions */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">الحد الأقصى للمتقدمين</label>
              <input type="number" className={inputCls} value={form.maxApplicants} onChange={e => set('maxApplicants', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">العمر الأدنى</label>
              <input type="number" className={inputCls} value={form.ageMin} onChange={e => set('ageMin', e.target.value)} placeholder="—" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">العمر الأقصى</label>
              <input type="number" className={inputCls} value={form.ageMax} onChange={e => set('ageMax', e.target.value)} placeholder="—" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">الجنس</label>
              <select className={inputCls} value={form.gender} onChange={e => set('gender', e.target.value)}>
                <option value="both">الكل</option>
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
            </div>
          </div>
          {/* Positions */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">المراكز المستهدفة</label>
            <div className="flex flex-wrap gap-2">
              {FOOTBALL_POSITIONS.map(pos => (
                <button key={pos} type="button" onClick={() => togglePos(pos)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${form.targetPositions.includes(pos) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
                  {pos}
                </button>
              ))}
            </div>
          </div>
          {/* Services toggles */}
          <div className="grid grid-cols-3 gap-3">
            {[
              ['providesAccommodation', '🏠 إقامة'],
              ['providesMeals', '🍽️ وجبات'],
              ['providesTransport', '🚌 مواصلات'],
            ].map(([k, lbl]) => (
              <button key={k} type="button" onClick={() => set(k, !(form as any)[k])}
                className={`py-2 rounded-xl text-xs font-semibold border transition-all ${(form as any)[k] ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                {lbl}
              </button>
            ))}
          </div>
          {/* Flags */}
          <div className="flex flex-wrap gap-3">
            {[
              ['isActive', 'الفرصة مفعّلة'],
              ['isFeatured', '⭐ مميزة'],
              ['isPaid', '💰 مدفوعة'],
            ].map(([k, lbl]) => (
              <button key={k} type="button" onClick={() => set(k, !(form as any)[k])}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${(form as any)[k] ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                {lbl}
              </button>
            ))}
          </div>
          {form.isPaid && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">قيمة الرسوم</label>
                <input type="number" className={inputCls} value={form.fee} onChange={e => set('fee', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">العملة</label>
                <select className={inputCls} value={form.currency} onChange={e => set('currency', e.target.value)}>
                  {['SAR','USD','EUR','AED','QAR','KWD'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">المتطلبات الإضافية</label>
            <textarea className={`${inputCls} resize-none`} rows={2} value={form.requirements} onChange={e => set('requirements', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-6 border-t">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button className="bg-indigo-600 text-white hover:bg-indigo-700 px-8" onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin ml-2" />جاري الحفظ...</> : 'حفظ التعديلات'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Applications Drawer ────────────────────────────────────────────────────

function ApplicationsDrawer({ opp, onClose }: { opp: Opportunity; onClose: () => void }) {
  const [apps, setApps] = useState<OpportunityApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('opportunity_applications')
        .select('*')
        .eq('opportunityId', opp.id)
        .order('appliedAt', { ascending: false });
      setApps(data as OpportunityApplication[] || []);
      setLoading(false);
    })();
  }, [opp.id]);

  const updateStatus = async (appId: string, status: string) => {
    const { error } = await supabase
      .from('opportunity_applications')
      .update({ status, updatedAt: new Date().toISOString() })
      .eq('id', appId);
    if (error) { toast.error('حدث خطأ'); return; }
    setApps(p => p.map(a => a.id === appId ? { ...a, status: status as any } : a));
    toast.success('تم تحديث الحالة');
  };

  const filtered = filter === 'all' ? apps : apps.filter(a => a.status === filter);

  return (
    <div className="fixed inset-0 z-50 flex" dir="rtl">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-l from-indigo-600 to-blue-600 text-white">
          <div>
            <p className="text-xs text-white/70">طلبات التقديم</p>
            <h2 className="font-bold text-lg truncate max-w-sm">{opp.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20"><X className="w-5 h-5" /></button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 p-4 border-b overflow-x-auto">
          {[['all','الكل'],['pending','انتظار'],['accepted','مقبول'],['rejected','مرفوض'],['waitlisted','انتظار']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${filter === v ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {l} {v === 'all' ? `(${apps.length})` : `(${apps.filter(a => a.status === v).length})`}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد طلبات تقديم</p>
            </div>
          ) : filtered.map(app => {
            const sm = APP_STATUS_META[app.status] || APP_STATUS_META.pending;
            return (
              <div key={app.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {app.playerName?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{app.playerName}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 mt-0.5">
                        {app.playerPosition && <span>⚽ {app.playerPosition}</span>}
                        {app.playerCountry && <span>🌍 {app.playerCountry}</span>}
                        {app.playerAge && <span>🎂 {app.playerAge} سنة</span>}
                        {app.playerPhone && <span>📞 {app.playerPhone}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sm.cls}`}>{sm.label}</span>
                    <span className="text-xs text-slate-400">{fmtDate(app.appliedAt)}</span>
                  </div>
                </div>
                {app.message && (
                  <p className="mt-3 text-xs text-slate-600 bg-slate-50 rounded-xl p-3 line-clamp-2">{app.message}</p>
                )}
                {/* Scores */}
                {app.playerStats && (
                  <div className="mt-3 grid grid-cols-6 gap-1">
                    {Object.entries(app.playerStats).map(([k, v]) => (
                      <div key={k} className="text-center">
                        <div className="text-xs font-bold text-indigo-700">{v}</div>
                        <div className="text-[10px] text-slate-400">{k.slice(0, 3)}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  {app.status === 'pending' && (
                    <>
                      <button onClick={() => updateStatus(app.id, 'accepted')}
                        className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> قبول
                      </button>
                      <button onClick={() => updateStatus(app.id, 'rejected')}
                        className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors flex items-center justify-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> رفض
                      </button>
                      <button onClick={() => updateStatus(app.id, 'waitlisted')}
                        className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors flex items-center justify-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> انتظار
                      </button>
                    </>
                  )}
                  {app.status !== 'pending' && (
                    <button onClick={() => updateStatus(app.id, 'pending')}
                      className="py-1.5 px-4 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                      إعادة لقائمة الانتظار
                    </button>
                  )}
                  {app.playerPhone && (
                    <a href={`https://wa.me/${app.playerPhone.replace(/\D/g,'')}`} target="_blank"
                      className="py-1.5 px-3 text-xs font-semibold rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" /> واتساب
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Create Quick Opportunity Modal ─────────────────────────────────────────

function CreateModal({ onClose, onCreated, user, userData }: any) {
  const [form, setForm] = useState({
    title: '', opportunityType: 'trial', country: 'السعودية', city: '',
    description: '', startDate: TODAY(), endDate: TODAY(),
    applicationDeadline: TODAY(), maxApplicants: 50,
    status: 'active', isFeatured: false,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300';

  const handleCreate = async () => {
    if (!form.title.trim() || !form.city.trim()) { toast.error('العنوان والمدينة مطلوبان'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        organizerId: user?.id || 'admin',
        organizerType: 'admin',
        organizerName: userData?.full_name || 'إدارة منصة الحلم',
        durationDays: 1, isActive: form.status === 'active',
        location: form.city, targetPositions: [], gender: 'both',
        providesAccommodation: false, providesMeals: false, providesTransport: false,
        isPaid: false,
      };
      const res = await fetch('/api/admin/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'فشل الإنشاء');
      }
      const data = await res.json();
      toast.success('تم إنشاء الفرصة ونشرها بنجاح ✅');
      onCreated(data.item);
      onClose();
    } catch (e: any) { toast.error(e.message || 'حدث خطأ'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Zap className="w-5 h-5 text-indigo-600" /> إضافة فرصة سريعة</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">عنوان الفرصة *</label>
            <input className={inputCls} placeholder="مثال: منحة نادي الحلم الرياضية" value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">نوع الفرصة</label>
              <select className={inputCls} value={form.opportunityType} onChange={e => set('opportunityType', e.target.value)}>
                {Object.entries(TYPE_CFG).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">الحد الأقصى للمتقدمين</label>
              <input type="number" className={inputCls} value={form.maxApplicants} onChange={e => set('maxApplicants', Number(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">الدولة</label>
              <input className={inputCls} value={form.country} onChange={e => set('country', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">المدينة *</label>
              <input className={inputCls} placeholder="الرياض" value={form.city} onChange={e => set('city', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">وصف مختصر</label>
            <textarea className={`${inputCls} resize-none`} rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="وصف مختصر للفرصة..." />
          </div>
          <div className="flex gap-3">
            <button onClick={() => set('status', form.status === 'active' ? 'draft' : 'active')}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition ${form.status === 'active' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
              {form.status === 'active' ? '🚀 نشر الآن' : '📝 حفظ كمسودة'}
            </button>
            <button onClick={() => set('isFeatured', !form.isFeatured)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition ${form.isFeatured ? 'bg-amber-400 text-white border-amber-400' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
              {form.isFeatured ? '⭐ مميزة' : '☆ تميز الفرصة'}
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-6 border-t">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white px-8" onClick={handleCreate} disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin ml-2" />جاري النشر...</> : 'نشر الفرصة'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function AdminOpportunitiesPage() {
  const { user, userData } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [organizerFilter, setOrganizerFilter] = useState('all');

  const [editOpp, setEditOpp] = useState<Opportunity | null>(null);
  const [viewAppsOpp, setViewAppsOpp] = useState<Opportunity | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchOpportunities = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      // Fetch from API to bypass RLS
      const res = await fetch('/api/admin/opportunities');
      if (!res.ok) {
        const errorData = await res.json();
        console.error('❌ API fetch opportunities error:', errorData);
        throw new Error(errorData.error || 'فشل جلب الفرص');
      }
      
      const { items, count } = await res.json();
      console.log(`✅ Fetched ${count} opportunities`);
      setOpportunities(items as Opportunity[]);
    } catch (err: any) {
      console.error('❌ fetchOpportunities failed:', err);
      toast.error(`خطأ في جلب الفرص: ${err?.message || 'خطأ غير معروف'}`);
    }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchOpportunities(); }, [fetchOpportunities]);

  const toggleActive = async (opp: Opportunity) => {
    try {
      const res = await fetch('/api/admin/opportunities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: opp.id, isActive: !opp.isActive }),
      });
      if (!res.ok) throw new Error();
      setOpportunities(p => p.map(o => o.id === opp.id ? { ...o, isActive: !opp.isActive } : o));
      toast.success(opp.isActive ? 'تم إيقاف الفرصة' : 'تم تفعيل الفرصة');
    } catch { toast.error('حدث خطأ'); }
  };

  const toggleFeatured = async (opp: Opportunity) => {
    try {
      const res = await fetch('/api/admin/opportunities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: opp.id, isFeatured: !opp.isFeatured }),
      });
      if (!res.ok) throw new Error();
      setOpportunities(p => p.map(o => o.id === opp.id ? { ...o, isFeatured: !opp.isFeatured } : o));
      toast.success(opp.isFeatured ? 'تم إلغاء التمييز' : 'تم تمييز الفرصة ⭐');
    } catch { toast.error('حدث خطأ'); }
  };

  const changeStatus = async (opp: Opportunity, status: string) => {
    try {
      const res = await fetch('/api/admin/opportunities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: opp.id, status }),
      });
      if (!res.ok) throw new Error();
      setOpportunities(p => p.map(o => o.id === opp.id ? { ...o, status: status as any } : o));
      toast.success('تم تحديث حالة الفرصة');
    } catch { toast.error('حدث خطأ'); }
  };

  const deleteOpp = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الفرصة نهائياً؟ لا يمكن التراجع.')) return;
    try {
      const res = await fetch(`/api/admin/opportunities?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setOpportunities(p => p.filter(o => o.id !== id));
      toast.success('تم الحذف بنجاح');
    } catch { toast.error('حدث خطأ أثناء الحذف'); }
  };

  const filtered = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();
    return opportunities.filter(o => {
      if (s && !o.title.toLowerCase().includes(s) && !o.organizerName.toLowerCase().includes(s)) return false;
      if (statusFilter !== 'all') {
        if (statusFilter === 'disabled' && o.isActive) return false;
        if (statusFilter !== 'disabled' && o.status !== statusFilter) return false;
      }
      if (typeFilter !== 'all' && o.opportunityType !== typeFilter) return false;
      if (organizerFilter !== 'all' && o.organizerType !== organizerFilter) return false;
      return true;
    });
  }, [opportunities, searchTerm, statusFilter, typeFilter, organizerFilter]);

  const stats = useMemo(() => ({
    total: opportunities.length,
    active: opportunities.filter(o => o.isActive && o.status === 'active').length,
    featured: opportunities.filter(o => o.isFeatured).length,
    totalApps: opportunities.reduce((s, o) => s + (o.currentApplicants || 0), 0),
    totalViews: opportunities.reduce((s, o) => s + (o.viewCount || 0), 0),
    draft: opportunities.filter(o => o.status === 'draft').length,
    byOrganizer: opportunities.reduce((acc, o) => {
      acc[o.organizerType] = (acc[o.organizerType] || 0) + 1; return acc;
    }, {} as Record<string, number>),
  }), [opportunities]);

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {editOpp && <EditOpportunityModal opp={editOpp} onClose={() => setEditOpp(null)} onSaved={updated => { setOpportunities(p => p.map(o => o.id === updated.id ? updated : o)); setEditOpp(null); }} />}
      {viewAppsOpp && <ApplicationsDrawer opp={viewAppsOpp} onClose={() => setViewAppsOpp(null)} />}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={(o: Opportunity) => setOpportunities(p => [o, ...p])} user={user} userData={userData} />}
      {/* Quick-create modal is for minor use; full create goes to dedicated page */}

      <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-8">

        {/* Header */}
        <header className="relative overflow-hidden p-8 text-white bg-gradient-to-l from-indigo-700 via-indigo-600 to-blue-500 rounded-3xl shadow-xl">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
          <div className="relative flex flex-wrap gap-4 justify-between items-center">
            <div>
              <p className="text-xs tracking-widest uppercase text-white/70 mb-1">لوحة تحكم الإدارة المتكاملة</p>
              <h1 className="text-3xl font-bold sm:text-4xl">إدارة الفرص الرياضية</h1>
              <p className="mt-2 text-sm text-white/80 max-w-xl">عصب المنصة — تربط اللاعبين بالأندية والأكاديميات والمدربين في بيئة احترافية موثوقة.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => fetchOpportunities(true)} variant="secondary" className="bg-white/20 text-white hover:bg-white/30 gap-2" disabled={refreshing}>
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                تحديث
              </Button>
              <Button asChild className="bg-white text-indigo-700 hover:bg-slate-50 font-bold gap-2 shadow-lg">
                <a href="/dashboard/admin/opportunities/create">
                  <PlusCircle className="w-4 h-4" />
                  إضافة فرصة
                </a>
              </Button>
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: 'إجمالي الفرص', value: stats.total, icon: Target, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'الفرص النشطة', value: stats.active, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'المميزة', value: stats.featured, icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'إجمالي التقديمات', value: stats.totalApps, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'مسودة / انتظار', value: stats.draft, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <p className={`text-3xl font-bold ${color}`}>{value}</p>
                </div>
                <div className={`w-11 h-11 rounded-2xl ${bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Organizer Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(stats.byOrganizer).map(([type, count]) => (
            <button key={type} onClick={() => setOrganizerFilter(organizerFilter === type ? 'all' : type)}
              className={`p-3 rounded-2xl border text-center transition-all ${organizerFilter === type ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white border-slate-100 hover:border-indigo-200 hover:bg-slate-50'}`}>
              <p className={`text-2xl font-bold ${organizerFilter === type ? 'text-white' : 'text-slate-800'}`}>{count}</p>
              <p className={`text-xs mt-0.5 ${organizerFilter === type ? 'text-white/80' : 'text-slate-500'}`}>{ORGANIZER_LABELS[type] || type}</p>
            </button>
          ))}
        </div>

        {/* Filters Bar */}
        <Card className="border border-slate-100 shadow-sm">
          <CardContent className="p-4 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input placeholder="ابحث عن فرصة أو نادي..." className="pr-10 bg-slate-50 border-slate-200" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-slate-50"><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="active">نشطة</SelectItem>
                <SelectItem value="draft">مسودة</SelectItem>
                <SelectItem value="closed">مغلقة</SelectItem>
                <SelectItem value="disabled">مُعطلة</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-44 bg-slate-50"><SelectValue placeholder="نوع الفرصة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأنواع</SelectItem>
                {Object.entries(TYPE_CFG).map(([k, v]) => <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || organizerFilter !== 'all') && (
              <Button variant="ghost" size="sm" className="text-slate-500 gap-1" onClick={() => { setSearchTerm(''); setStatusFilter('all'); setTypeFilter('all'); setOrganizerFilter('all'); }}>
                <X className="w-3.5 h-3.5" /> مسح الفلاتر
              </Button>
            )}
            <span className="mr-auto text-xs text-slate-400">{filtered.length} فرصة</span>
          </CardContent>
        </Card>

        {/* Opportunities Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
            <p className="text-slate-500">جاري تحميل الفرص...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
            <Target className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-1">لا توجد فرص مطابقة</h3>
            <p className="text-sm text-slate-400">جرّب تغيير كلمة البحث أو الفلاتر</p>
          </div>
        ) : (
          <Card className="border border-slate-100 shadow-xl rounded-2xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-600">
                  <tr>
                    <th className="py-4 px-5 font-semibold">الفرصة</th>
                    <th className="py-4 px-5 font-semibold">المنظم</th>
                    <th className="py-4 px-5 font-semibold">النوع</th>
                    <th className="py-4 px-5 font-semibold text-center">المتقدمون</th>
                    <th className="py-4 px-5 font-semibold text-center">المشاهدات</th>
                    <th className="py-4 px-5 font-semibold">التواريخ</th>
                    <th className="py-4 px-5 font-semibold">الحالة</th>
                    <th className="py-4 px-5 font-semibold text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(opp => {
                    const tc = TYPE_CFG[opp.opportunityType];
                    const fillPct = opp.maxApplicants > 0 ? Math.min(100, ((opp.currentApplicants || 0) / opp.maxApplicants) * 100) : 0;
                    return (
                      <tr key={opp.id} className="hover:bg-slate-50/70 transition-colors group">
                        <td className="py-4 px-5">
                          <div className="flex items-start gap-2">
                            {opp.isFeatured && <Star className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" fill="currentColor" />}
                            <div>
                              <p className="font-semibold text-slate-900 max-w-[220px] leading-snug line-clamp-2">{opp.title}</p>
                              {opp.city && (
                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3" />{opp.city}{opp.country ? `, ${opp.country}` : ''}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                              {opp.organizerName?.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800 text-xs leading-tight max-w-[120px] truncate">{opp.organizerName}</p>
                              <p className="text-[10px] text-slate-400">{ORGANIZER_LABELS[opp.organizerType] || opp.organizerType}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          {tc && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border"
                              style={{ background: `${tc.color}18`, borderColor: `${tc.color}40`, color: tc.color }}>
                              {tc.emoji} {tc.label}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-5 text-center">
                          <button onClick={() => setViewAppsOpp(opp)} className="flex flex-col items-center hover:scale-105 transition-transform">
                            <span className="font-bold text-slate-900">{opp.currentApplicants || 0}</span>
                            <span className="text-[10px] text-slate-400">/ {opp.maxApplicants}</span>
                            <div className="w-16 h-1.5 rounded-full bg-slate-100 mt-1 overflow-hidden">
                              <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${fillPct}%` }} />
                            </div>
                          </button>
                        </td>
                        <td className="py-4 px-5 text-center">
                          <span className="text-slate-600 font-medium">{opp.viewCount || 0}</span>
                          <p className="text-[10px] text-slate-400">مشاهدة</p>
                        </td>
                        <td className="py-4 px-5 text-xs text-slate-500">
                          <p>بداية: {fmtDate(opp.startDate)}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">آخر تقديم: {fmtDate(opp.applicationDeadline)}</p>
                        </td>
                        <td className="py-4 px-5">
                          <StatusBadge status={opp.status} isActive={opp.isActive} />
                        </td>
                        <td className="py-4 px-5 text-center">
                          <DropdownMenu dir="rtl">
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 bg-white border-slate-100 shadow-2xl rounded-xl">
                              <DropdownMenuLabel className="text-xs text-slate-400 font-normal">إجراءات الفرصة</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => setViewAppsOpp(opp)} className="cursor-pointer gap-2 font-medium">
                                <Users className="h-4 w-4 text-blue-500" /> عرض المتقدمين ({opp.currentApplicants || 0})
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditOpp(opp)} className="cursor-pointer gap-2 font-medium">
                                <Edit className="h-4 w-4 text-indigo-500" /> تعديل الفرصة
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild className="cursor-pointer gap-2 font-medium">
                                <a href={`/explore/${opp.id}`} target="_blank">
                                  <ArrowUpRight className="h-4 w-4 text-slate-400" /> معاينة بالمنصة
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => toggleFeatured(opp)} className="cursor-pointer gap-2">
                                <Star className={`h-4 w-4 ${opp.isFeatured ? 'text-amber-500' : 'text-slate-400'}`} />
                                {opp.isFeatured ? 'إلغاء التمييز' : 'تمييز الفرصة ⭐'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleActive(opp)} className="cursor-pointer gap-2">
                                <Power className={`h-4 w-4 ${opp.isActive ? 'text-amber-500' : 'text-emerald-500'}`} />
                                {opp.isActive ? 'إيقاف (إخفاء)' : 'تفعيل (إظهار)'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => changeStatus(opp, opp.status === 'active' ? 'closed' : 'active')} className="cursor-pointer gap-2">
                                <Clock className="h-4 w-4 text-slate-400" />
                                {opp.status === 'active' ? 'إغلاق باب التقديم' : 'فتح باب التقديم'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => deleteOpp(opp.id)} className="cursor-pointer gap-2 text-red-600 focus:text-red-700 focus:bg-red-50">
                                <Trash2 className="h-4 w-4" /> حذف نهائي
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
