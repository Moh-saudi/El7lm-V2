'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowRight, ArrowLeft, CheckCircle, Loader2, Calendar, AlertCircle, Search, X,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { createOpportunity } from '@/lib/firebase/opportunities';
import { broadcastNewOpportunity } from '@/lib/opportunities/notifications';
import { broadcastOpportunityWhatsApp } from '@/lib/notifications/broadcast-dispatcher';
import { OPPORTUNITY_TYPES, FOOTBALL_POSITIONS } from '@/lib/opportunities/config';
import { OpportunityType } from '@/types/opportunities';
import { supabase } from '@/lib/supabase/config';

// ─── Types ──────────────────────────────────────────────────────────────────

type OrganizerMode = 'admin' | 'platform_user';

type OrganizerInfo = {
  id: string;
  name: string;
  type: string;
  phone?: string;
};

type FormData = {
  opportunityType: OpportunityType | '';
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  applicationDeadline: string;
  location: string;
  city: string;
  country: string;
  maxApplicants: number | '';
  targetPositions: string[];
  ageMin: number | '';
  ageMax: number | '';
  gender: 'both' | 'male' | 'female';
  providesAccommodation: boolean;
  providesMeals: boolean;
  providesTransport: boolean;
  isPaid: boolean;
  fee: number | '';
  currency: string;
  compensation: string;
  requirements: string;
  status: 'active' | 'draft';
  isFeatured: boolean;
};

const INITIAL_FORM: FormData = {
  opportunityType: '', title: '', description: '',
  startDate: '', endDate: '', applicationDeadline: '',
  location: '', city: '', country: '',
  maxApplicants: '', targetPositions: [],
  ageMin: '', ageMax: '', gender: 'both',
  providesAccommodation: false, providesMeals: false, providesTransport: false,
  isPaid: false, fee: '', currency: 'SAR',
  compensation: '', requirements: '', status: 'active',
  isFeatured: false,
};

type Errors = Partial<Record<keyof FormData, string>>;

// ─── Helpers ────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0];
function toDate(s: string) { return new Date(s + 'T00:00:00'); }

// ─── Sub-components ─────────────────────────────────────────────────────────

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      {msg}
    </p>
  );
}

function inputCls(error?: string) {
  return `w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors ${
    error ? 'border-red-400 bg-red-50 focus:ring-red-300' : 'border-gray-200 focus:ring-indigo-400'
  }`;
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 cursor-pointer" onClick={() => onChange(!value)}>
      <span className="text-sm text-gray-700">{label}</span>
      <div className="relative rounded-full transition-colors flex-shrink-0"
        style={{ width: 40, height: 22, background: value ? '#6366f1' : '#e5e7eb' }}>
        <div className="absolute top-0.5 bg-white rounded-full shadow transition-all"
          style={{ width: 18, height: 18, left: value ? 20 : 2 }} />
      </div>
    </div>
  );
}

function StepBar({ current, total }: { current: number; total: number }) {
  const labels = ['المنظِم', 'نوع الفرصة', 'التفاصيل', 'الشروط'];
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => {
        const done = i < current - 1;
        const active = i === current - 1;
        return (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                done ? 'bg-indigo-500 text-white' : active ? 'bg-indigo-500 text-white ring-4 ring-indigo-100' : 'bg-gray-100 text-gray-400'
              }`}>
                {done ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-[10px] hidden sm:block ${active ? 'text-indigo-600 font-semibold' : 'text-gray-400'}`}>
                {labels[i]}
              </span>
            </div>
            {i < total - 1 && (
              <div className={`flex-1 h-0.5 rounded-full mb-4 ${done ? 'bg-indigo-400' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validateStep3(form: FormData): Errors {
  const errs: Errors = {};
  const t = today();
  if (!form.title.trim()) errs.title = 'عنوان الفرصة مطلوب';
  else if (form.title.trim().length < 5) errs.title = 'العنوان يجب أن يكون 5 أحرف على الأقل';
  if (!form.description.trim()) errs.description = 'وصف الفرصة مطلوب';
  else if (form.description.trim().length < 30) errs.description = 'الوصف يجب أن يكون 30 حرفاً على الأقل';
  if (!form.startDate) errs.startDate = 'تاريخ البداية مطلوب';
  if (!form.endDate) errs.endDate = 'تاريخ النهاية مطلوب';
  if (!form.applicationDeadline) errs.applicationDeadline = 'آخر موعد للتقديم مطلوب';
  return errs;
}

function validateStep4(form: FormData): Errors {
  const errs: Errors = {};
  if (!form.maxApplicants || Number(form.maxApplicants) < 1)
    errs.maxApplicants = 'الحد الأقصى للمتقدمين مطلوب';
  if (form.isPaid && (form.fee === '' || Number(form.fee) <= 0))
    errs.fee = 'أدخل قيمة الرسوم';
  return errs;
}

// ─── Organizer Search ────────────────────────────────────────────────────────

const ORGANIZER_TYPES = [
  { value: 'club', label: 'نادي' },
  { value: 'academy', label: 'أكاديمية' },
  { value: 'trainer', label: 'مدرب' },
  { value: 'agent', label: 'وكيل' },
  { value: 'marketer', label: 'مسوّق' },
];

function OrganizerSelector({
  onSelect, selected,
}: {
  onSelect: (org: OrganizerInfo | null) => void;
  selected: OrganizerInfo | null;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [orgType, setOrgType] = useState('club');
  const [results, setResults] = useState<OrganizerInfo[]>([]);
  const [searching, setSearching] = useState(false);

  const doSearch = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    try {
      const { data } = await supabase
        .from('users')
        .select('id, full_name, accountType, phone')
        .eq('accountType', orgType)
        .ilike('full_name', `%${searchTerm.trim()}%`)
        .limit(10);
      setResults((data || []).map((u: any) => ({
        id: u.id,
        name: u.full_name || u.id,
        type: u.accountType,
        phone: u.phone,
      })));
    } catch { toast.error('خطأ في البحث'); }
    finally { setSearching(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">اختر المنظِم</h2>
        <p className="text-sm text-gray-500">اختر من سيتم نشر الفرصة باسمه (نادي، أكاديمية، مدرب...) أو من خلال إدارة المنصة مباشرة</p>
      </div>

      {/* Admin self */}
      <button
        onClick={() => onSelect(null)}
        className={`w-full p-4 rounded-xl border-2 text-right transition-all ${
          selected === null ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
      >
        <div className="font-bold text-gray-900">🏢 إدارة منصة الحلم</div>
        <div className="text-sm text-gray-500 mt-0.5">نشر الفرصة باسم الإدارة الرسمية للمنصة</div>
      </button>

      {/* Platform user search */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-700">أو ابحث عن حساب مسجّل في المنصة</p>
        <div className="flex gap-2">
          <select
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={orgType}
            onChange={e => setOrgType(e.target.value)}
          >
            {ORGANIZER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input
            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="ابحث باسم النادي أو الحساب..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
          />
          <button
            onClick={doSearch}
            disabled={searching}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            بحث
          </button>
        </div>

        {results.length > 0 && (
          <div className="divide-y divide-gray-50 max-h-52 overflow-y-auto">
            {results.map(org => (
              <button
                key={org.id}
                onClick={() => onSelect(org)}
                className={`w-full p-3 text-right rounded-xl transition-all flex items-center justify-between ${
                  selected?.id === org.id ? 'bg-indigo-50 border border-indigo-300' : 'hover:bg-gray-50'
                }`}
              >
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{org.name}</p>
                  <p className="text-xs text-gray-500">{ORGANIZER_TYPES.find(t => t.value === org.type)?.label} • {org.phone || '—'}</p>
                </div>
                {selected?.id === org.id && <CheckCircle className="w-5 h-5 text-indigo-600" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {selected !== null && (
        <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
          <span className="text-sm font-semibold text-indigo-800">✅ تم الاختيار: {selected.name}</span>
          <button onClick={() => onSelect(null)} className="text-indigo-500 hover:text-indigo-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminCreateOpportunityPage() {
  const router = useRouter();
  const { user, userData } = useAuth();

  const [step, setStep] = useState(1);
  const [organizerMode, setOrganizerMode] = useState<OrganizerMode>('admin');
  const [selectedOrganizer, setSelectedOrganizer] = useState<OrganizerInfo | null>(null);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const handleOrganizerSelect = (org: OrganizerInfo | null) => {
    setSelectedOrganizer(org);
    setOrganizerMode(org ? 'platform_user' : 'admin');
  };

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const togglePosition = (pos: string) => {
    setForm(prev => ({
      ...prev,
      targetPositions: prev.targetPositions.includes(pos)
        ? prev.targetPositions.filter(p => p !== pos)
        : [...prev.targetPositions, pos],
    }));
  };

  const durationDays = (() => {
    if (!form.startDate || !form.endDate) return 0;
    const diff = Math.ceil((toDate(form.endDate).getTime() - toDate(form.startDate).getTime()) / 86400000);
    return diff > 0 ? diff : 0;
  })();

  const goNext = () => {
    if (step === 1) { setStep(2); return; }
    if (step === 2) {
      if (!form.opportunityType) { toast.error('اختر نوع الفرصة أولاً'); return; }
      setStep(3); return;
    }
    if (step === 3) {
      const errs = validateStep3(form);
      if (Object.keys(errs).length > 0) { setErrors(errs); toast.error('يرجى تصحيح الأخطاء'); return; }
      setErrors({}); setStep(4);
    }
  };

  const handleSubmit = async () => {
    const errs = validateStep4(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); toast.error('يرجى تصحيح الأخطاء'); return; }
    if (!user || !form.opportunityType) return;

    // Determine organizer info
    // Note: organizerType must match DB enum — 'club' used for admin-created opps
    const organizerId = selectedOrganizer ? selectedOrganizer.id : user.id;
    const organizerType = selectedOrganizer ? selectedOrganizer.type as any : 'club';
    const organizerName = selectedOrganizer ? selectedOrganizer.name : (userData?.full_name || 'إدارة منصة الحلم');

    try {
      setSubmitting(true);
      const payload = {
        organizerId,
        organizerType,
        organizerName,
        opportunityType: form.opportunityType as OpportunityType,
        title: form.title.trim(),
        description: form.description.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        durationDays,
        applicationDeadline: form.applicationDeadline,
        location: form.location.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        maxApplicants: Number(form.maxApplicants),
        targetPositions: form.targetPositions,
        ageMin: form.ageMin !== '' ? Number(form.ageMin) : undefined,
        ageMax: form.ageMax !== '' ? Number(form.ageMax) : undefined,
        gender: form.gender,
        providesAccommodation: form.providesAccommodation,
        providesMeals: form.providesMeals,
        providesTransport: form.providesTransport,
        isPaid: form.isPaid,
        fee: form.isPaid && form.fee !== '' ? Number(form.fee) : undefined,
        currency: form.isPaid ? form.currency : undefined,
        compensation: form.compensation.trim() || undefined,
        requirements: form.requirements.trim() || undefined,
        status: form.status,
        isActive: form.status === 'active',
        isFeatured: form.isFeatured,
      };

      const res = await fetch('/api/admin/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'فشل إنشاء الفرصة');
      }
      const { id: newId } = await res.json();

      if (form.status === 'active') {
        broadcastNewOpportunity({
          opportunityId: newId, opportunityTitle: payload.title,
          opportunityType: payload.opportunityType, organizerName: payload.organizerName,
          organizerType: payload.organizerType,
        }).catch(() => {});
        broadcastOpportunityWhatsApp({
          opportunityId: newId, opportunityTitle: payload.title,
          opportunityType: payload.opportunityType, organizerName: payload.organizerName,
          organizerType: payload.organizerType, targetPositions: payload.targetPositions,
          ageMin: payload.ageMin, ageMax: payload.ageMax, country: payload.country, gender: payload.gender,
        }).catch(() => {});
      }

      toast.success(form.status === 'active' ? '🚀 تم نشر الفرصة بنجاح!' : '💾 تم حفظ المسودة');
      router.push('/dashboard/admin/opportunities');
    } catch (err: any) {
      console.error('❌ Admin create opportunity error:', err);
      toast.error(err?.message || 'حدث خطأ أثناء الحفظ — تحقق من Console');
    } finally { setSubmitting(false); }
  };

  const typeKeys = Object.keys(OPPORTUNITY_TYPES) as OpportunityType[];

  return (
    <div className="min-h-screen bg-gray-50 pb-10" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button
            onClick={() => step > 1 ? setStep(s => s - 1) : router.back()}
            className="text-gray-500 hover:text-gray-700 p-1"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900">نشر فرصة جديدة — من لوحة الأدمن</h1>
            <p className="text-xs text-gray-400">الخطوة {step} من 4</p>
          </div>
          <div className="flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-full">
            <span className="text-xs font-semibold text-indigo-700">
              {organizerMode === 'admin' ? '🏢 إدارة المنصة' : `👤 ${selectedOrganizer?.name}`}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-5">
        <StepBar current={step} total={4} />

        {/* ── Step 1: Organizer ── */}
        {step === 1 && (
          <OrganizerSelector onSelect={handleOrganizerSelect} selected={selectedOrganizer} />
        )}

        {/* ── Step 2: Type ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">نوع الفرصة</h2>
              <p className="text-sm text-gray-500">اختر نوع الفرصة التي تريد نشرها</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {typeKeys.map(k => {
                const cfg = OPPORTUNITY_TYPES[k];
                const active = form.opportunityType === k;
                return (
                  <button
                    key={k}
                    onClick={() => set('opportunityType', k)}
                    className={`p-4 rounded-xl border-2 text-right transition-all active:scale-95 ${
                      active ? 'shadow-md scale-[1.02]' : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                    style={active ? { borderColor: cfg.color, backgroundColor: `${cfg.color}18` } : {}}
                  >
                    <div className="text-3xl mb-2">{cfg.emoji}</div>
                    <div className="font-bold text-sm text-gray-900">{cfg.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{cfg.labelEn}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Step 3: Details ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">التفاصيل الأساسية</h2>
              <p className="text-sm text-gray-500">أدخل معلومات الفرصة</p>
            </div>
            <div className="bg-white rounded-xl p-4 space-y-4 border border-gray-100">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">عنوان الفرصة <span className="text-red-500">*</span></label>
                <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                  placeholder="مثال: فرصة تجربة أداء في أكاديمية الأهلي" maxLength={100}
                  className={inputCls(errors.title)} />
                <FieldError msg={errors.title} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">الوصف <span className="text-red-500">*</span></label>
                <textarea value={form.description} onChange={e => set('description', e.target.value.slice(0, 1000))}
                  placeholder="وصف تفصيلي للفرصة، الأهداف، ما سيستفيده المتقدم..." rows={4}
                  className={`${inputCls(errors.description)} resize-none`} />
                <div className="flex justify-between mt-1">
                  <FieldError msg={errors.description} />
                  <span className={`text-xs mr-auto ${form.description.length < 30 ? 'text-red-400' : 'text-gray-400'}`}>
                    {form.description.length}/1000
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">تاريخ البداية <span className="text-red-500">*</span></label>
                  <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} className={inputCls(errors.startDate)} />
                  <FieldError msg={errors.startDate} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">تاريخ النهاية <span className="text-red-500">*</span></label>
                  <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} className={inputCls(errors.endDate)} />
                  <FieldError msg={errors.endDate} />
                </div>
              </div>
              {durationDays > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full text-xs font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  مدة الفرصة: {durationDays} يوم
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">آخر موعد للتقديم <span className="text-red-500">*</span></label>
                <input type="date" value={form.applicationDeadline} onChange={e => set('applicationDeadline', e.target.value)}
                  max={form.startDate || undefined} className={inputCls(errors.applicationDeadline)} />
                <FieldError msg={errors.applicationDeadline} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">الدولة</label>
                  <input type="text" value={form.country} onChange={e => set('country', e.target.value)} placeholder="السعودية" className={inputCls()} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">المدينة</label>
                  <input type="text" value={form.city} onChange={e => set('city', e.target.value)} placeholder="الرياض" className={inputCls()} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">الموقع / الملعب</label>
                  <input type="text" value={form.location} onChange={e => set('location', e.target.value)} placeholder="اسم المنشأة" className={inputCls()} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 4: Conditions ── */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">الشروط والإعدادات</h2>
              <p className="text-sm text-gray-500">حدد شروط القبول والخدمات المقدمة</p>
            </div>

            <div className="bg-white rounded-xl p-4 space-y-4 border border-gray-100">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">الحد الأقصى للمتقدمين <span className="text-red-500">*</span></label>
                <input type="number" min={1} max={10000} value={form.maxApplicants}
                  onChange={e => set('maxApplicants', e.target.value ? Number(e.target.value) : '')}
                  placeholder="مثال: 20" className={inputCls(errors.maxApplicants)} />
                <FieldError msg={errors.maxApplicants} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">المراكز المستهدفة <span className="font-normal text-gray-400">(اختياري)</span></label>
                <div className="flex flex-wrap gap-2">
                  {FOOTBALL_POSITIONS.map(pos => {
                    const selected = form.targetPositions.includes(pos);
                    return (
                      <button key={pos} type="button" onClick={() => togglePosition(pos)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all active:scale-95 ${
                          selected ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300'
                        }`}>
                        {pos}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">العمر الأدنى <span className="text-gray-400">(اختياري)</span></label>
                  <input type="number" min={5} max={60} value={form.ageMin}
                    onChange={e => set('ageMin', e.target.value ? Number(e.target.value) : '')}
                    placeholder="16" className={inputCls(errors.ageMin)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">العمر الأقصى <span className="text-gray-400">(اختياري)</span></label>
                  <input type="number" min={5} max={60} value={form.ageMax}
                    onChange={e => set('ageMax', e.target.value ? Number(e.target.value) : '')}
                    placeholder="23" className={inputCls(errors.ageMax)} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">الجنس</label>
                <div className="flex gap-2">
                  {([['both', 'الكل'], ['male', 'ذكر'], ['female', 'أنثى']] as const).map(([val, lbl]) => (
                    <button key={val} type="button" onClick={() => set('gender', val)}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${
                        form.gender === val ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300'
                      }`}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <h3 className="text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">الخدمات المقدمة</h3>
              <div className="divide-y divide-gray-50">
                <Toggle label="🏠 توفير إقامة" value={form.providesAccommodation} onChange={v => set('providesAccommodation', v)} />
                <Toggle label="🍽️ توفير وجبات" value={form.providesMeals} onChange={v => set('providesMeals', v)} />
                <Toggle label="🚌 توفير مواصلات" value={form.providesTransport} onChange={v => set('providesTransport', v)} />
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-3">
              <Toggle label="💰 الفرصة مدفوعة (تتطلب رسوماً)" value={form.isPaid} onChange={v => { set('isPaid', v); if (!v) set('fee', ''); }} />
              {form.isPaid && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">قيمة الرسوم <span className="text-red-500">*</span></label>
                    <input type="number" min={1} value={form.fee}
                      onChange={e => set('fee', e.target.value ? Number(e.target.value) : '')}
                      placeholder="500" className={inputCls(errors.fee)} />
                    <FieldError msg={errors.fee} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">العملة</label>
                    <select value={form.currency} onChange={e => set('currency', e.target.value)} className={inputCls()}>
                      {['SAR','USD','EUR','AED','QAR','KWD'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <label className="text-xs font-semibold text-gray-600 mb-1 block">المتطلبات الإضافية <span className="text-gray-400">(اختياري)</span></label>
              <textarea value={form.requirements} onChange={e => set('requirements', e.target.value)}
                placeholder="أي متطلبات خاصة..." rows={2} className={`${inputCls()} resize-none`} />
            </div>

            {/* Admin extras */}
            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 space-y-2">
              <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide">خيارات الأدمن الإضافية</p>
              <Toggle label="⭐ تمييز الفرصة (Featured — تظهر في الأعلى)" value={form.isFeatured} onChange={v => set('isFeatured', v)} />
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <label className="text-xs font-bold text-gray-700 mb-2 block uppercase tracking-wide">حالة النشر</label>
              <div className="flex gap-3">
                <button type="button" onClick={() => set('status', 'active')}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition-all ${
                    form.status === 'active' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300'
                  }`}>
                  🚀 نشر الآن
                </button>
                <button type="button" onClick={() => set('status', 'draft')}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition-all ${
                    form.status === 'draft' ? 'bg-amber-400 text-white border-amber-400 shadow-sm' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-amber-300'
                  }`}>
                  💾 حفظ كمسودة
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pb-4">
          {step > 1 && (
            <button onClick={() => { setStep(s => s - 1); setErrors({}); }}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
              <ArrowRight className="w-4 h-4" />
              السابق
            </button>
          )}
          {step < 4 ? (
            <button onClick={goNext}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 active:scale-95 transition-all">
              التالي
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 active:scale-95 transition-all">
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" />جارٍ الحفظ...</>
              ) : (
                <><CheckCircle className="w-4 h-4" />{form.status === 'active' ? 'نشر الفرصة' : 'حفظ المسودة'}</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
