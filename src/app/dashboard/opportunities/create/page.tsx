'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowRight, ArrowLeft, CheckCircle, Loader2, Calendar, AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { createOpportunity, updateOpportunity, getOpportunityById } from '@/lib/firebase/opportunities';
import { broadcastNewOpportunity } from '@/lib/opportunities/notifications';
import { OPPORTUNITY_TYPES, FOOTBALL_POSITIONS } from '@/lib/opportunities/config';
import { OpportunityType } from '@/types/opportunities';

// ─── Types ─────────────────────────────────────────────────────────────────────

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
};

type Errors = Partial<Record<keyof FormData, string>>;

// ─── Helpers ───────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0];

function toDate(s: string) { return new Date(s + 'T00:00:00'); }

// ─── Sub-components ────────────────────────────────────────────────────────────

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
    error
      ? 'border-red-400 bg-red-50 focus:ring-red-300'
      : 'border-gray-200 focus:ring-green-400'
  }`;
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 cursor-pointer" onClick={() => onChange(!value)}>
      <span className="text-sm text-gray-700">{label}</span>
      <div
        className={`relative rounded-full transition-colors flex-shrink-0`}
        style={{ width: 40, height: 22, background: value ? '#22c55e' : '#e5e7eb' }}
      >
        <div
          className="absolute top-0.5 bg-white rounded-full shadow transition-all"
          style={{ width: 18, height: 18, left: value ? 20 : 2 }}
        />
      </div>
    </div>
  );
}

function StepBar({ current, total }: { current: number; total: number }) {
  const labels = ['نوع الفرصة', 'التفاصيل', 'الشروط'];
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => {
        const done = i < current - 1;
        const active = i === current - 1;
        return (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                  done ? 'bg-green-500 text-white'
                  : active ? 'bg-green-500 text-white ring-4 ring-green-100'
                  : 'bg-gray-100 text-gray-400'
                }`}
              >
                {done ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-[10px] hidden sm:block ${active ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>
                {labels[i]}
              </span>
            </div>
            {i < total - 1 && (
              <div className={`flex-1 h-0.5 rounded-full mb-4 ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Validation ────────────────────────────────────────────────────────────────

function validateStep2(form: FormData): Errors {
  const errs: Errors = {};
  const t = today();

  if (!form.title.trim()) {
    errs.title = 'عنوان الفرصة مطلوب';
  } else if (form.title.trim().length < 5) {
    errs.title = 'العنوان يجب أن يكون 5 أحرف على الأقل';
  } else if (form.title.trim().length > 100) {
    errs.title = 'العنوان يجب أن لا يتجاوز 100 حرف';
  }

  if (!form.description.trim()) {
    errs.description = 'وصف الفرصة مطلوب';
  } else if (form.description.trim().length < 30) {
    errs.description = 'الوصف يجب أن يكون 30 حرفاً على الأقل';
  }

  if (!form.startDate) {
    errs.startDate = 'تاريخ البداية مطلوب';
  } else if (form.startDate < t) {
    errs.startDate = 'تاريخ البداية يجب أن يكون اليوم أو في المستقبل';
  }

  if (!form.endDate) {
    errs.endDate = 'تاريخ النهاية مطلوب';
  } else if (form.startDate && form.endDate <= form.startDate) {
    errs.endDate = 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية';
  }

  if (!form.applicationDeadline) {
    errs.applicationDeadline = 'آخر موعد للتقديم مطلوب';
  } else if (form.applicationDeadline < t) {
    errs.applicationDeadline = 'موعد التقديم يجب أن يكون اليوم أو في المستقبل';
  } else if (form.startDate && form.applicationDeadline > form.startDate) {
    errs.applicationDeadline = 'موعد التقديم يجب أن يكون قبل أو يساوي تاريخ البداية';
  }

  return errs;
}

function validateStep3(form: FormData): Errors {
  const errs: Errors = {};

  if (!form.maxApplicants || Number(form.maxApplicants) < 1) {
    errs.maxApplicants = 'الحد الأقصى للمتقدمين مطلوب ويجب أن يكون 1 على الأقل';
  } else if (!Number.isInteger(Number(form.maxApplicants))) {
    errs.maxApplicants = 'يجب أن يكون عدداً صحيحاً';
  } else if (Number(form.maxApplicants) > 10000) {
    errs.maxApplicants = 'الحد الأقصى 10,000 متقدم';
  }

  if (form.ageMin !== '') {
    const mn = Number(form.ageMin);
    if (isNaN(mn) || mn < 5 || mn > 60) errs.ageMin = 'العمر الأدنى يجب أن يكون بين 5 و 60';
  }

  if (form.ageMax !== '') {
    const mx = Number(form.ageMax);
    if (isNaN(mx) || mx < 5 || mx > 60) {
      errs.ageMax = 'العمر الأقصى يجب أن يكون بين 5 و 60';
    } else if (form.ageMin !== '' && mx <= Number(form.ageMin)) {
      errs.ageMax = 'العمر الأقصى يجب أن يكون أكبر من الأدنى';
    }
  }

  if (form.isPaid) {
    if (form.fee === '' || Number(form.fee) <= 0) {
      errs.fee = 'أدخل قيمة الرسوم (يجب أن تكون أكبر من صفر)';
    }
  }

  return errs;
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function CreateOpportunityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userData } = useAuth();
  const editId = searchParams.get('edit');

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);

  useEffect(() => {
    if (!editId) return;
    (async () => {
      try {
        const opp = await getOpportunityById(editId);
        if (opp) {
          setForm({
            opportunityType: opp.opportunityType,
            title: opp.title, description: opp.description,
            startDate: opp.startDate, endDate: opp.endDate,
            applicationDeadline: opp.applicationDeadline,
            location: opp.location || '', city: opp.city || '', country: opp.country || '',
            maxApplicants: opp.maxApplicants,
            targetPositions: opp.targetPositions || [],
            ageMin: opp.ageMin ?? '', ageMax: opp.ageMax ?? '',
            gender: opp.gender || 'both',
            providesAccommodation: opp.providesAccommodation,
            providesMeals: opp.providesMeals,
            providesTransport: opp.providesTransport,
            isPaid: opp.isPaid, fee: opp.fee ?? '',
            currency: opp.currency || 'SAR',
            compensation: opp.compensation || '',
            requirements: opp.requirements || '',
            status: opp.status === 'draft' ? 'draft' : 'active',
          });
        }
      } catch {
        toast.error('فشل تحميل بيانات الفرصة');
      } finally {
        setLoadingEdit(false);
      }
    })();
  }, [editId]);

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    // clear error on change
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
    if (step === 1) {
      if (!form.opportunityType) {
        toast.error('اختر نوع الفرصة أولاً');
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      const errs = validateStep2(form);
      if (Object.keys(errs).length > 0) {
        setErrors(errs);
        toast.error('يرجى تصحيح الأخطاء المشار إليها');
        return;
      }
      setErrors({});
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    const errs = validateStep3(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error('يرجى تصحيح الأخطاء المشار إليها');
      return;
    }

    if (!user || !userData || !form.opportunityType) return;

    try {
      setSubmitting(true);
      const payload = {
        organizerId: user.uid,
        organizerType: userData.accountType as any,
        organizerName: userData.full_name || userData.displayName || '',
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
        isFeatured: false,
      };

      if (editId) {
        await updateOpportunity(editId, payload as any);
        toast.success('تم تحديث الفرصة بنجاح');
      } else {
        const newId = await createOpportunity(payload as any);
        // Broadcast to all users only when publishing (not draft)
        if (form.status === 'active') {
          broadcastNewOpportunity({
            opportunityId: newId,
            opportunityTitle: payload.title,
            opportunityType: payload.opportunityType,
            organizerName: payload.organizerName,
            organizerType: payload.organizerType,
          }).catch(() => {}); // fire-and-forget
        }
        toast.success(form.status === 'active' ? 'تم نشر الفرصة بنجاح!' : 'تم حفظ المسودة');
      }
      router.push('/dashboard/opportunities');
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingEdit) {
    return (
      <div className="flex items-center justify-center min-h-screen" dir="rtl">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      </div>
    );
  }

  const typeKeys = Object.keys(OPPORTUNITY_TYPES) as OpportunityType[];

  return (
    <div className="min-h-screen bg-gray-50 pb-10" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button
            onClick={() => (step > 1 ? setStep(s => s - 1) : router.back())}
            className="text-gray-500 hover:text-gray-700 p-1"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 truncate">
              {editId ? 'تعديل الفرصة' : 'نشر فرصة جديدة'}
            </h1>
            <p className="text-xs text-gray-400">الخطوة {step} من 3</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-5">
        <StepBar current={step} total={3} />

        {/* ── Step 1 ── */}
        {step === 1 && (
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

        {/* ── Step 2 ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">التفاصيل الأساسية</h2>
              <p className="text-sm text-gray-500">أدخل معلومات الفرصة</p>
            </div>

            <div className="bg-white rounded-xl p-4 space-y-4 border border-gray-100">
              {/* Title */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  عنوان الفرصة <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                  placeholder="مثال: معسكر تدريبي صيفي للناشئين"
                  maxLength={100}
                  className={inputCls(errors.title)}
                />
                <div className="flex justify-between mt-1">
                  <FieldError msg={errors.title} />
                  <span className="text-xs text-gray-400 mr-auto">{form.title.length}/100</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  الوصف <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value.slice(0, 1000))}
                  placeholder="وصف تفصيلي للفرصة، الأهداف، ما سيستفيده المتقدم..."
                  rows={4}
                  className={`${inputCls(errors.description)} resize-none`}
                />
                <div className="flex justify-between mt-1">
                  <FieldError msg={errors.description} />
                  <span className={`text-xs mr-auto ${form.description.length < 30 ? 'text-red-400' : 'text-gray-400'}`}>
                    {form.description.length}/1000 {form.description.length < 30 && `(${30 - form.description.length} حرف إضافي)`}
                  </span>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">
                    تاريخ البداية <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.startDate}
                    min={today()}
                    onChange={e => set('startDate', e.target.value)}
                    className={inputCls(errors.startDate)}
                  />
                  <FieldError msg={errors.startDate} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">
                    تاريخ النهاية <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.endDate}
                    min={form.startDate || today()}
                    onChange={e => set('endDate', e.target.value)}
                    className={inputCls(errors.endDate)}
                  />
                  <FieldError msg={errors.endDate} />
                </div>
              </div>

              {/* Duration badge */}
              {durationDays > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-full text-xs font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  مدة الفرصة: {durationDays} يوم
                </div>
              )}
              {form.startDate && form.endDate && durationDays <= 0 && (
                <p className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="w-3 h-3" />
                  تاريخ النهاية يجب أن يكون بعد تاريخ البداية
                </p>
              )}

              {/* Application deadline */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  آخر موعد للتقديم <span className="text-red-500">*</span>
                  <span className="font-normal text-gray-400 mr-1">(يجب أن يكون قبل أو يساوي تاريخ البداية)</span>
                </label>
                <input
                  type="date"
                  value={form.applicationDeadline}
                  min={today()}
                  max={form.startDate || undefined}
                  onChange={e => set('applicationDeadline', e.target.value)}
                  className={inputCls(errors.applicationDeadline)}
                />
                <FieldError msg={errors.applicationDeadline} />
              </div>

              {/* Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">الدولة</label>
                  <input
                    type="text"
                    value={form.country}
                    onChange={e => set('country', e.target.value)}
                    placeholder="السعودية"
                    className={inputCls()}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">المدينة</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={e => set('city', e.target.value)}
                    placeholder="الرياض"
                    className={inputCls()}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">الموقع / الملعب</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={e => set('location', e.target.value)}
                    placeholder="اسم المنشأة"
                    className={inputCls()}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3 ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">الشروط والإعدادات</h2>
              <p className="text-sm text-gray-500">حدد شروط القبول والخدمات المقدمة</p>
            </div>

            <div className="bg-white rounded-xl p-4 space-y-4 border border-gray-100">
              {/* Max applicants */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  الحد الأقصى للمتقدمين <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={form.maxApplicants}
                  onChange={e => set('maxApplicants', e.target.value ? Number(e.target.value) : '')}
                  placeholder="مثال: 20"
                  className={inputCls(errors.maxApplicants)}
                />
                <FieldError msg={errors.maxApplicants} />
              </div>

              {/* Positions */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">
                  المراكز المستهدفة
                  <span className="font-normal text-gray-400 mr-1">(اختياري)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {FOOTBALL_POSITIONS.map(pos => {
                    const selected = form.targetPositions.includes(pos);
                    return (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => togglePosition(pos)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all active:scale-95 ${
                          selected
                            ? 'bg-green-500 text-white border-green-500'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-green-300'
                        }`}
                      >
                        {pos}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Age range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">
                    الحد الأدنى للعمر
                    <span className="font-normal text-gray-400 mr-1">(اختياري)</span>
                  </label>
                  <input
                    type="number"
                    min={5} max={60}
                    value={form.ageMin}
                    onChange={e => set('ageMin', e.target.value ? Number(e.target.value) : '')}
                    placeholder="مثال: 16"
                    className={inputCls(errors.ageMin)}
                  />
                  <FieldError msg={errors.ageMin} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">
                    الحد الأقصى للعمر
                    <span className="font-normal text-gray-400 mr-1">(اختياري)</span>
                  </label>
                  <input
                    type="number"
                    min={5} max={60}
                    value={form.ageMax}
                    onChange={e => set('ageMax', e.target.value ? Number(e.target.value) : '')}
                    placeholder="مثال: 23"
                    className={inputCls(errors.ageMax)}
                  />
                  <FieldError msg={errors.ageMax} />
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">الجنس</label>
                <div className="flex gap-2">
                  {([['both', 'الكل'], ['male', 'ذكر'], ['female', 'أنثى']] as const).map(([val, lbl]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => set('gender', val)}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${
                        form.gender === val
                          ? 'bg-green-500 text-white border-green-500'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-green-300'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <h3 className="text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">الخدمات المقدمة</h3>
              <div className="divide-y divide-gray-50">
                <Toggle label="🏠 توفير إقامة" value={form.providesAccommodation} onChange={v => set('providesAccommodation', v)} />
                <Toggle label="🍽️ توفير وجبات" value={form.providesMeals} onChange={v => set('providesMeals', v)} />
                <Toggle label="🚌 توفير مواصلات" value={form.providesTransport} onChange={v => set('providesTransport', v)} />
              </div>
            </div>

            {/* Payment */}
            <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-3">
              <Toggle label="💰 الفرصة مدفوعة (تتطلب رسوماً)" value={form.isPaid} onChange={v => { set('isPaid', v); if (!v) set('fee', ''); }} />
              {form.isPaid && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">
                      قيمة الرسوم <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={form.fee}
                      onChange={e => set('fee', e.target.value ? Number(e.target.value) : '')}
                      placeholder="مثال: 500"
                      className={inputCls(errors.fee)}
                    />
                    <FieldError msg={errors.fee} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">العملة</label>
                    <select
                      value={form.currency}
                      onChange={e => set('currency', e.target.value)}
                      className={inputCls()}
                    >
                      <option value="SAR">ريال (SAR)</option>
                      <option value="USD">دولار (USD)</option>
                      <option value="EUR">يورو (EUR)</option>
                      <option value="AED">درهم (AED)</option>
                    </select>
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  التعويض / المنحة
                  <span className="font-normal text-gray-400 mr-1">(اختياري)</span>
                </label>
                <input
                  type="text"
                  value={form.compensation}
                  onChange={e => set('compensation', e.target.value)}
                  placeholder="مثال: منحة تدريبية كاملة"
                  className={inputCls()}
                />
              </div>
            </div>

            {/* Requirements */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                المتطلبات الإضافية
                <span className="font-normal text-gray-400 mr-1">(اختياري)</span>
              </label>
              <textarea
                value={form.requirements}
                onChange={e => set('requirements', e.target.value)}
                placeholder="أي متطلبات خاصة أو معلومات إضافية..."
                rows={3}
                className={`${inputCls()} resize-none`}
              />
            </div>

            {/* Status */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <label className="text-xs font-bold text-gray-700 mb-2 block uppercase tracking-wide">حالة النشر</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => set('status', 'active')}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition-all ${
                    form.status === 'active'
                      ? 'bg-green-500 text-white border-green-500 shadow-sm'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-green-300'
                  }`}
                >
                  🚀 نشر الآن
                </button>
                <button
                  type="button"
                  onClick={() => set('status', 'draft')}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition-all ${
                    form.status === 'draft'
                      ? 'bg-yellow-400 text-white border-yellow-400 shadow-sm'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-yellow-300'
                  }`}
                >
                  💾 حفظ كمسودة
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pb-4">
          {step > 1 && (
            <button
              onClick={() => { setStep(s => s - 1); setErrors({}); }}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              السابق
            </button>
          )}

          {step < 3 ? (
            <button
              onClick={goNext}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 active:scale-95 transition-all"
            >
              التالي
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 disabled:opacity-50 active:scale-95 transition-all"
            >
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
