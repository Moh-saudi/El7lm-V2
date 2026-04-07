'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, ArrowRight, ArrowLeft, Loader2, Check } from 'lucide-react';
import { getCurrentClient, createPortalClient, TournamentClient } from '@/lib/tournament-portal/auth';
import { PortalShell } from '../_components/PortalShell';

// ── Steps ─────────────────────────────────────────────────────
const STEPS = [
    { id: 1, label: 'المعلومات الأساسية' },
    { id: 2, label: 'نظام البطولة'       },
    { id: 3, label: 'التسجيل والدفع'    },
    { id: 4, label: 'القواعد والجوائز'  },
];

const COUNTRIES = [
    'السعودية','الإمارات','قطر','الكويت','البحرين','عُمان',
    'مصر','الأردن','العراق','لبنان','تونس','الجزائر','المغرب',
    'ليبيا','السودان','اليمن','فلسطين','سوريا','موريتانيا',
];

function slugify(text: string) {
    return text
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '')
        .replace(/--+/g, '-')
        .trim() + '-' + Date.now().toString(36);
}

// ── Form state ─────────────────────────────────────────────────
const INITIAL = {
    // Step 1
    name:                 '',
    description:          '',
    country:              '',
    city:                 '',
    location:             '',
    start_date:           '',
    end_date:             '',
    registration_deadline:'',
    // Step 2
    type:                 'knockout',   // knockout | league | groups_knockout
    max_teams:            '',
    min_teams:            '',
    players_per_team:     '',
    // Step 3
    is_paid:              false,
    entry_fee:            '',
    currency:             'SAR',
    fee_type:             'team',       // team | individual
    payment_deadline:     '',
    allow_installments:   false,
    installments_count:   '',
    wallet_name:          '',
    wallet_number:        '',
    refund_policy:        '',
    // Step 4
    rules:                '',
    prizes:               '',
    contact_info:         '',
};

type FormState = typeof INITIAL;

export default function NewTournamentPage() {
    const router = useRouter();
    const [client,  setClient]  = useState<TournamentClient | null>(null);
    const [step,    setStep]    = useState(1);
    const [form,    setForm]    = useState<FormState>(INITIAL);
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState('');

    useEffect(() => { getCurrentClient().then(setClient); }, []);

    const set = (k: keyof FormState) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
            setForm(prev => ({ ...prev, [k]: e.target.value }));

    const toggle = (k: keyof FormState) => () =>
        setForm(prev => ({ ...prev, [k]: !prev[k] }));

    // ── Validate step ─────────────────────────────────────────
    const validateStep = () => {
        if (step === 1) {
            if (!form.name.trim())       { setError('اسم البطولة مطلوب'); return false; }
            if (!form.country)           { setError('الدولة مطلوبة');      return false; }
            if (!form.start_date)        { setError('تاريخ البدء مطلوب');  return false; }
            if (!form.end_date)          { setError('تاريخ الانتهاء مطلوب'); return false; }
        }
        if (step === 2) {
            if (!form.max_teams || +form.max_teams < 2) { setError('عدد الفرق يجب أن يكون 2 أو أكثر'); return false; }
        }
        setError('');
        return true;
    };

    const next = () => { if (validateStep()) setStep(s => Math.min(s + 1, 4)); };
    const prev = () => { setError(''); setStep(s => Math.max(s - 1, 1)); };

    // ── Submit ────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!validateStep() || !client) return;
        setLoading(true);
        setError('');
        try {
            const supabase = createPortalClient();
            const payload = {
                client_id:             client.id,
                slug:                  slugify(form.name),
                name:                  form.name.trim(),
                description:           form.description || null,
                country:               form.country || null,
                city:                  form.city || null,
                location:              form.location || null,
                start_date:            form.start_date || null,
                end_date:              form.end_date || null,
                registration_deadline: form.registration_deadline || null,
                type:                  form.type,
                max_teams:             form.max_teams   ? +form.max_teams   : null,
                min_teams:             form.min_teams   ? +form.min_teams   : null,
                players_per_team:      form.players_per_team ? +form.players_per_team : null,
                is_paid:               form.is_paid,
                entry_fee:             form.is_paid && form.entry_fee ? +form.entry_fee : null,
                currency:              form.currency,
                fee_type:              form.fee_type,
                payment_deadline:      form.payment_deadline || null,
                allow_installments:    form.allow_installments,
                installments_count:    form.allow_installments && form.installments_count ? +form.installments_count : null,
                wallet_name:           form.wallet_name || null,
                wallet_number:         form.wallet_number || null,
                refund_policy:         form.refund_policy || null,
                rules:                 form.rules || null,
                prizes:                form.prizes || null,
                contact_info:          form.contact_info || null,
                status:                'draft',
            };

            const { data, error: dbErr } = await supabase
                .from('tournament_new')
                .insert(payload)
                .select('id')
                .single();

            if (dbErr) throw new Error(dbErr.message);
            router.push(`/tournament-portal/${data.id}/setup`);
        } catch (e: any) {
            setError(e.message || 'فشل إنشاء البطولة');
        } finally {
            setLoading(false);
        }
    };

    if (!client) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
        </div>
    );

    return (
        <PortalShell client={client}>
            <div className="max-w-2xl mx-auto" dir="rtl">

                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900">بطولة جديدة</h1>
                        <p className="text-slate-400 text-sm">أكمل الخطوات لإنشاء بطولتك</p>
                    </div>
                </div>

                {/* Steps indicator */}
                <div className="flex items-center gap-2 mb-8">
                    {STEPS.map((s, i) => (
                        <div key={s.id} className="flex items-center flex-1">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold flex-shrink-0 transition-all
                                ${step > s.id  ? 'bg-emerald-500 text-white' :
                                  step === s.id ? 'bg-yellow-500 text-white ring-4 ring-yellow-200' :
                                                  'bg-slate-200 text-slate-500'}`}>
                                {step > s.id ? <Check className="w-4 h-4" /> : s.id}
                            </div>
                            <span className={`hidden sm:block mr-2 text-xs font-medium flex-1
                                ${step === s.id ? 'text-slate-900' : 'text-slate-400'}`}>
                                {s.label}
                            </span>
                            {i < STEPS.length - 1 && (
                                <div className={`h-0.5 flex-1 mx-2 rounded ${step > s.id ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">

                    {/* ── Step 1: Basic info ── */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <h2 className="font-bold text-slate-800 text-base mb-4">المعلومات الأساسية</h2>

                            <div>
                                <label className="form-label">اسم البطولة *</label>
                                <input className="form-input" value={form.name} onChange={set('name')} placeholder="بطولة الملك للأندية..." />
                            </div>

                            <div>
                                <label className="form-label">الوصف</label>
                                <textarea className="form-input min-h-[80px] resize-none" value={form.description} onChange={set('description')} placeholder="نبذة عن البطولة..." />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">الدولة *</label>
                                    <select className="form-input" value={form.country} onChange={set('country')}>
                                        <option value="">اختر الدولة</option>
                                        {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">المدينة</label>
                                    <input className="form-input" value={form.city} onChange={set('city')} placeholder="الرياض" />
                                </div>
                            </div>

                            <div>
                                <label className="form-label">الملعب / المكان</label>
                                <input className="form-input" value={form.location} onChange={set('location')} placeholder="استاد الملك فهد" />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="form-label">تاريخ البدء *</label>
                                    <input type="date" className="form-input" value={form.start_date} onChange={set('start_date')} />
                                </div>
                                <div>
                                    <label className="form-label">تاريخ الانتهاء *</label>
                                    <input type="date" className="form-input" value={form.end_date} onChange={set('end_date')} />
                                </div>
                                <div>
                                    <label className="form-label">آخر تسجيل</label>
                                    <input type="date" className="form-input" value={form.registration_deadline} onChange={set('registration_deadline')} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Step 2: Tournament system ── */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <h2 className="font-bold text-slate-800 text-base mb-4">نظام البطولة</h2>

                            <div>
                                <label className="form-label">نوع النظام *</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { value: 'knockout',        label: 'كأس (إقصائي)',    desc: 'الخاسر يخرج' },
                                        { value: 'league',          label: 'دوري',            desc: 'جميع الفرق تلتقي' },
                                        { value: 'groups_knockout', label: 'مجموعات + كأس',  desc: 'مجموعات ثم إقصاء' },
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setForm(p => ({ ...p, type: opt.value }))}
                                            className={`p-3 rounded-xl border-2 text-right transition-all ${
                                                form.type === opt.value
                                                    ? 'border-yellow-500 bg-yellow-50'
                                                    : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            <p className="font-bold text-sm text-slate-900">{opt.label}</p>
                                            <p className="text-[11px] text-slate-400 mt-0.5">{opt.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="form-label">الحد الأقصى للفرق *</label>
                                    <input type="number" min="2" className="form-input" value={form.max_teams} onChange={set('max_teams')} placeholder="16" />
                                </div>
                                <div>
                                    <label className="form-label">الحد الأدنى للفرق</label>
                                    <input type="number" min="2" className="form-input" value={form.min_teams} onChange={set('min_teams')} placeholder="4" />
                                </div>
                                <div>
                                    <label className="form-label">لاعبون لكل فريق</label>
                                    <input type="number" min="1" className="form-input" value={form.players_per_team} onChange={set('players_per_team')} placeholder="11" />
                                </div>
                            </div>

                            {form.type === 'groups_knockout' && (
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                    <p className="text-sm font-semibold text-blue-800 mb-1">ملاحظة — نظام المجموعات</p>
                                    <p className="text-xs text-blue-600">ستتمكن من تحديد عدد المجموعات وعدد الفرق في كل مجموعة بعد إنشاء البطولة من صفحة الإعداد.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Step 3: Registration & Payment ── */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <h2 className="font-bold text-slate-800 text-base mb-4">التسجيل والدفع</h2>

                            {/* Paid toggle */}
                            <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4 border border-slate-200">
                                <div>
                                    <p className="font-semibold text-slate-800 text-sm">بطولة مدفوعة</p>
                                    <p className="text-xs text-slate-400 mt-0.5">تفعيل رسوم التسجيل للفرق</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={toggle('is_paid')}
                                    className={`w-12 h-6 rounded-full transition-all relative ${form.is_paid ? 'bg-yellow-500' : 'bg-slate-300'}`}
                                >
                                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow ${form.is_paid ? 'left-6' : 'left-0.5'}`} />
                                </button>
                            </div>

                            {form.is_paid && (
                                <div className="space-y-4 border border-yellow-200 bg-yellow-50/50 rounded-xl p-4">
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="col-span-2">
                                            <label className="form-label">رسوم التسجيل</label>
                                            <input type="number" min="0" className="form-input" value={form.entry_fee} onChange={set('entry_fee')} placeholder="500" />
                                        </div>
                                        <div>
                                            <label className="form-label">العملة</label>
                                            <select className="form-input" value={form.currency} onChange={set('currency')}>
                                                {['SAR','AED','EGP','QAR','KWD','BHD','OMR','USD','EUR'].map(c =>
                                                    <option key={c} value={c}>{c}</option>
                                                )}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="form-label">نوع الرسوم</label>
                                            <select className="form-input" value={form.fee_type} onChange={set('fee_type')}>
                                                <option value="team">لكل فريق</option>
                                                <option value="individual">لكل لاعب</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="form-label">آخر موعد للدفع</label>
                                            <input type="date" className="form-input" value={form.payment_deadline} onChange={set('payment_deadline')} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="form-label">اسم المحفظة (واتس/فودافون)</label>
                                            <input className="form-input" value={form.wallet_name} onChange={set('wallet_name')} placeholder="STC Pay" />
                                        </div>
                                        <div>
                                            <label className="form-label">رقم المحفظة</label>
                                            <input className="form-input" value={form.wallet_number} onChange={set('wallet_number')} placeholder="05xxxxxxxx" dir="ltr" />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-yellow-200">
                                        <div>
                                            <p className="font-semibold text-slate-800 text-sm">السماح بالتقسيط</p>
                                        </div>
                                        <button type="button" onClick={toggle('allow_installments')}
                                            className={`w-11 h-6 rounded-full transition-all relative ${form.allow_installments ? 'bg-yellow-500' : 'bg-slate-300'}`}>
                                            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow ${form.allow_installments ? 'left-6' : 'left-1'}`} />
                                        </button>
                                    </div>
                                    {form.allow_installments && (
                                        <div>
                                            <label className="form-label">عدد الأقساط</label>
                                            <input type="number" min="2" max="12" className="form-input" value={form.installments_count} onChange={set('installments_count')} placeholder="3" />
                                        </div>
                                    )}

                                    <div>
                                        <label className="form-label">سياسة الاسترداد</label>
                                        <textarea className="form-input min-h-[70px] resize-none" value={form.refund_policy} onChange={set('refund_policy')} placeholder="يُسترد 100% في حال الانسحاب قبل 7 أيام..." />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Step 4: Rules & Prizes ── */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <h2 className="font-bold text-slate-800 text-base mb-4">القواعد والجوائز</h2>

                            <div>
                                <label className="form-label">قواعد البطولة</label>
                                <textarea className="form-input min-h-[120px] resize-none" value={form.rules} onChange={set('rules')} placeholder="1. يلتزم جميع اللاعبين بقانون اللعبة الدولي&#10;2. يُحظر الاحتجاج على قرارات الحكام..." />
                            </div>

                            <div>
                                <label className="form-label">الجوائز</label>
                                <textarea className="form-input min-h-[90px] resize-none" value={form.prizes} onChange={set('prizes')} placeholder="🥇 المركز الأول: كأس + 50,000 ريال&#10;🥈 المركز الثاني: كأس + 25,000 ريال..." />
                            </div>

                            <div>
                                <label className="form-label">معلومات التواصل</label>
                                <input className="form-input" value={form.contact_info} onChange={set('contact_info')} placeholder="للاستفسار: 05xxxxxxxx / tournament@email.com" />
                            </div>

                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
                                <p className="font-semibold text-slate-800 mb-1">✅ جاهز للإنشاء</p>
                                <p>بعد الإنشاء ستنتقل لصفحة الإعداد حيث تضيف الفئات العمرية وتفتح باب التسجيل.</p>
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={prev}
                            disabled={step === 1}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 transition-all"
                        >
                            <ArrowRight className="w-4 h-4" /> السابق
                        </button>

                        <span className="text-xs text-slate-400">{step} / {STEPS.length}</span>

                        {step < 4 ? (
                            <button type="button" onClick={next}
                                className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-white font-bold px-5 py-2 rounded-xl text-sm transition-all">
                                التالي <ArrowLeft className="w-4 h-4" />
                            </button>
                        ) : (
                            <button type="button" onClick={handleSubmit} disabled={loading}
                                className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-xl text-sm transition-all">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                إنشاء البطولة
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Global styles for form fields */}
            <style jsx global>{`
                .form-label { display: block; font-size: 0.75rem; font-weight: 600; color: #475569; margin-bottom: 0.375rem; }
                .form-input { width: 100%; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 0.625rem 0.875rem; font-size: 0.875rem; color: #0f172a; background: white; outline: none; transition: all 0.15s; }
                .form-input:focus { border-color: #eab308; box-shadow: 0 0 0 3px rgba(234,179,8,0.15); }
                select.form-input { cursor: pointer; }
            `}</style>
        </PortalShell>
    );
}
