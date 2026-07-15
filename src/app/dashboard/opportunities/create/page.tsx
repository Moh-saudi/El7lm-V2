'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowRight, ArrowLeft, CheckCircle, Loader2, Calendar, AlertCircle, ImagePlus, Video,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { createOpportunity, updateOpportunity, getOpportunityById } from '@/lib/firebase/opportunities';
import { broadcastNewOpportunity } from '@/lib/opportunities/notifications';
import { broadcastOpportunityWhatsApp } from '@/lib/notifications/broadcast-dispatcher';
import { OPPORTUNITY_TYPES, FOOTBALL_POSITIONS } from '@/lib/opportunities/config';
import { OpportunityType } from '@/types/opportunities';
import { storageManager } from '@/lib/storage';
import { useTranslation } from '@/lib/i18n';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';

// ─── Types ─────────────────────────────────────────────────────────────────────

type FormData = {
  opportunityType: OpportunityType | '';
  title: string;
  description: string;
  coverImage: string;
  promoVideo: string;
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
  coverImage: '', promoVideo: '',
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
        className="relative rounded-full transition-colors flex-shrink-0"
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

function StepBar({ current, total, labels }: { current: number; total: number; labels: string[] }) {
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

function validateStep2(form: FormData, v: any): Errors {
  const errs: Errors = {};
  const t = today();

  if (!form.title.trim()) {
    errs.title = v.titleRequired;
  } else if (form.title.trim().length < 5) {
    errs.title = v.titleMin;
  } else if (form.title.trim().length > 100) {
    errs.title = v.titleMax;
  }

  if (!form.description.trim()) {
    errs.description = v.descriptionRequired;
  } else if (form.description.trim().length < 30) {
    errs.description = v.descriptionMin;
  }

  if (!form.startDate) {
    errs.startDate = v.startRequired;
  } else if (form.startDate < t) {
    errs.startDate = v.startFuture;
  }

  if (!form.endDate) {
    errs.endDate = v.endRequired;
  } else if (form.startDate && form.endDate <= form.startDate) {
    errs.endDate = v.endAfterStart;
  }

  if (!form.applicationDeadline) {
    errs.applicationDeadline = v.deadlineRequired;
  } else if (form.applicationDeadline < t) {
    errs.applicationDeadline = v.deadlineFuture;
  } else if (form.startDate && form.applicationDeadline > form.startDate) {
    errs.applicationDeadline = v.deadlineBeforeStart;
  }

  return errs;
}

function validateStep3(form: FormData, v: any): Errors {
  const errs: Errors = {};

  if (!form.maxApplicants || Number(form.maxApplicants) < 1) {
    errs.maxApplicants = v.maxRequired;
  } else if (!Number.isInteger(Number(form.maxApplicants))) {
    errs.maxApplicants = v.integer;
  } else if (Number(form.maxApplicants) > 10000) {
    errs.maxApplicants = v.maxLimit;
  }

  if (form.ageMin !== '') {
    const mn = Number(form.ageMin);
    if (isNaN(mn) || mn < 5 || mn > 60) errs.ageMin = v.ageMin;
  }

  if (form.ageMax !== '') {
    const mx = Number(form.ageMax);
    if (isNaN(mx) || mx < 5 || mx > 60) {
      errs.ageMax = v.ageMax;
    } else if (form.ageMin !== '' && mx <= Number(form.ageMin)) {
      errs.ageMax = v.ageOrder;
    }
  }

  if (form.isPaid) {
    if (form.fee === '' || Number(form.fee) <= 0) {
      errs.fee = v.fee;
    }
  }

  return errs;
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function CreateOpportunityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userData } = useAuth();
  const { isRTL, getTranslations } = useTranslation();
  const copy = getTranslations<any>('createOpportunity');
  const typeLabels = getTranslations<any>('opportunityTypes');
  const editId = searchParams.get('edit');

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [uploadingCoverImage, setUploadingCoverImage] = useState(false);
  const [uploadingPromoVideo, setUploadingPromoVideo] = useState(false);

  useEffect(() => {
    if (!editId) return;
    (async () => {
      try {
        const opp = await getOpportunityById(editId);
        if (opp) {
          setForm({
            opportunityType: opp.opportunityType,
            title: opp.title, description: opp.description,
            coverImage: opp.coverImage || '',
            promoVideo: opp.promoVideo || '',
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
        toast.error(copy.messages.loadFailed);
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

  const compressImage = (file: File, maxWidth = 1200, quality = 0.82): Promise<File> =>
    new Promise((resolve) => {
      if (!file.type.startsWith('image/')) { resolve(file); return; }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          let { width, height } = img;
          if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => resolve(blob ? new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }) : file),
            'image/jpeg', quality,
          );
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });

  const uploadOpportunityAsset = async (
    file: File,
    bucket: 'content' | 'videos',
    folder: string,
  ) => {
    const fileToUpload = bucket === 'content' ? await compressImage(file) : file;
    const safeName = `${Date.now()}_${fileToUpload.name.replace(/\s+/g, '_')}`;
    const result = await storageManager.upload(bucket, `${folder}/${safeName}`, fileToUpload, {
      contentType: fileToUpload.type,
      upsert: true,
    });

    if (!result?.publicUrl) {
      throw new Error(copy.messages.noPublicUrl);
    }

    return result.publicUrl;
  };

  const handleCoverImageUpload = async (file: File | null | undefined) => {
    if (!file) return;
    try {
      setUploadingCoverImage(true);
      const imageUrl = await uploadOpportunityAsset(file, 'content', 'opportunities');
      set('coverImage', imageUrl);
      toast.success(copy.messages.imageUploaded);
    } catch (error) {
      console.error('Error uploading opportunity image:', error);
      toast.error(copy.messages.imageUploadFailed);
    } finally {
      setUploadingCoverImage(false);
    }
  };

  const handlePromoVideoUpload = async (file: File | null | undefined) => {
    if (!file) return;
    try {
      setUploadingPromoVideo(true);
      const videoUrl = await uploadOpportunityAsset(file, 'videos', 'opportunities');
      set('promoVideo', videoUrl);
      toast.success(copy.messages.videoUploaded);
    } catch (error) {
      console.error('Error uploading opportunity video:', error);
      toast.error(copy.messages.videoUploadFailed);
    } finally {
      setUploadingPromoVideo(false);
    }
  };

  const goNext = () => {
    if (step === 1) {
      if (!form.opportunityType) {
        toast.error(copy.messages.chooseType);
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      const errs = validateStep2(form, copy.validation);
      if (Object.keys(errs).length > 0) {
        setErrors(errs);
        toast.error(copy.messages.fixErrors);
        return;
      }
      setErrors({});
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    const errs = validateStep3(form, copy.validation);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error(copy.messages.fixErrors);
      return;
    }

    if (!user || !userData || !form.opportunityType) return;

    try {
      setSubmitting(true);
      const payload = {
        organizerId: user.id,
        organizerType: userData.accountType as any,
        organizerName: userData.full_name || userData.displayName || '',
        opportunityType: form.opportunityType as OpportunityType,
        title: form.title.trim(),
        description: form.description.trim(),
        coverImage: form.coverImage.trim() || undefined,
        promoVideo: form.promoVideo.trim() || undefined,
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
        toast.success(copy.messages.updated);
      } else {
        const newId = await createOpportunity(payload as any);
        // Broadcast to all users only when publishing (not draft)
        if (form.status === 'active') {
          const broadcastParams = {
            opportunityId: newId,
            opportunityTitle: payload.title,
            opportunityType: payload.opportunityType,
            organizerName: payload.organizerName,
            organizerType: payload.organizerType,
            // Smart targeting — WhatsApp sent only to matching players
            targetPositions: payload.targetPositions,
            ageMin: payload.ageMin,
            ageMax: payload.ageMax,
            country: payload.country,
            gender: payload.gender,
          };
          // In-app broadcast (broadcasts collection) → free for all users
          broadcastNewOpportunity({
            opportunityId: newId,
            opportunityTitle: payload.title,
            opportunityType: payload.opportunityType,
            organizerName: payload.organizerName,
            organizerType: payload.organizerType,
          }).catch(() => {});
          // WhatsApp → only matched players via opp_pick_up_3
          broadcastOpportunityWhatsApp(broadcastParams).catch(() => {});
        }
        toast.success(form.status === 'active' ? copy.messages.published : copy.messages.draftSaved);
      }
      router.push('/dashboard/opportunities');
    } catch (err: any) {
      toast.error(err?.message || copy.messages.saveError);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingEdit) {
    return (
      <div className="flex items-center justify-center min-h-screen" dir={isRTL ? 'rtl' : 'ltr'}>
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      </div>
    );
  }

  const typeKeys = Object.keys(OPPORTUNITY_TYPES) as OpportunityType[];

  return (
    <div className="min-h-screen bg-gray-50 pb-10" dir={isRTL ? 'rtl' : 'ltr'}>
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
              {editId ? copy.editTitle : copy.newTitle}
            </h1>
            <p className="text-xs text-gray-400">{copy.stepProgress.replace('{{step}}', String(step))}</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-5">
        <div className="flex justify-end"><LanguageSwitcher /></div>
        <StepBar current={step} total={3} labels={copy.steps} />

        {/* ── Step 1 ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{copy.typeTitle}</h2>
              <p className="text-sm text-gray-500">{copy.typeSubtitle}</p>
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
                    <div className="font-bold text-sm text-gray-900">{typeLabels[k]}</div>
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
              <h2 className="text-lg font-bold text-gray-900">{copy.detailsTitle}</h2>
              <p className="text-sm text-gray-500">{copy.detailsSubtitle}</p>
            </div>

            <div className="bg-white rounded-xl p-4 space-y-4 border border-gray-100">
              {/* Title */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  {copy.titleLabel} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                  placeholder={copy.titlePlaceholder}
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
                  {copy.descriptionLabel} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value.slice(0, 1000))}
                  placeholder={copy.descriptionPlaceholder}
                  rows={4}
                  className={`${inputCls(errors.description)} resize-none`}
                />
                <div className="flex justify-between mt-1">
                  <FieldError msg={errors.description} />
                  <span className={`text-xs mr-auto ${form.description.length < 30 ? 'text-red-400' : 'text-gray-400'}`}>
                    {form.description.length}/1000 {form.description.length < 30 && copy.moreChars.replace('{{count}}', String(30 - form.description.length))}
                  </span>
                </div>
              </div>

              {/* Media */}
              <div className="grid grid-cols-1 gap-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{copy.imageTitle}</p>
                      <p className="text-xs text-gray-500">{copy.imageHint}</p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-green-700 shadow-sm ring-1 ring-gray-200 transition hover:bg-green-50">
                      {uploadingCoverImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ImagePlus className="h-4 w-4" />
                      )}
                      {form.coverImage ? copy.changeImage : copy.uploadImage}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async e => {
                          const input = e.currentTarget;
                          const file = input.files?.[0];
                          await handleCoverImageUpload(file);
                          input.value = '';
                        }}
                      />
                    </label>
                  </div>

                  {form.coverImage ? (
                    <div className="space-y-3">
                      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                        <img
                          src={form.coverImage}
                          alt={copy.imageAlt}
                          className="h-52 w-full object-cover"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => set('coverImage', '')}
                          className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          {copy.deleteImage}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-white/80 px-4 py-8 text-center text-sm text-gray-500">
                      {copy.noImage}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{copy.videoTitle}</p>
                      <p className="text-xs text-gray-500">{copy.videoHint}</p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-green-700 shadow-sm ring-1 ring-gray-200 transition hover:bg-green-50">
                      {uploadingPromoVideo ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Video className="h-4 w-4" />
                      )}
                      {form.promoVideo ? copy.changeVideo : copy.uploadVideo}
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={async e => {
                          const input = e.currentTarget;
                          const file = input.files?.[0];
                          await handlePromoVideoUpload(file);
                          input.value = '';
                        }}
                      />
                    </label>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">
                      {copy.videoLink}
                      <span className="font-normal text-gray-400 mr-1">{copy.optional}</span>
                    </label>
                    <input
                      type="url"
                      value={form.promoVideo}
                      onChange={e => set('promoVideo', e.target.value)}
                      placeholder="https://example.com/opportunity-video.mp4"
                      className={inputCls()}
                    />
                  </div>

                  {form.promoVideo ? (
                    <div className="space-y-3">
                      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-black">
                        <video
                          src={form.promoVideo}
                          controls
                          className="h-56 w-full object-cover"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => set('promoVideo', '')}
                          className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          {copy.deleteVideo}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-white/80 px-4 py-8 text-center text-sm text-gray-500">
                      {copy.noVideo}
                    </div>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">
                    {copy.startDate} <span className="text-red-500">*</span>
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
                    {copy.endDate} <span className="text-red-500">*</span>
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
                  {copy.duration.replace('{{days}}', String(durationDays))}
                </div>
              )}
              {form.startDate && form.endDate && durationDays <= 0 && (
                <p className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="w-3 h-3" />
                  {copy.validation.endAfterStart}
                </p>
              )}

              {/* Application deadline */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  {copy.deadline} <span className="text-red-500">*</span>
                  <span className="font-normal text-gray-400 mr-1">{copy.deadlineHint}</span>
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
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">{copy.country}</label>
                  <input
                    type="text"
                    value={form.country}
                    onChange={e => set('country', e.target.value)}
                    placeholder={copy.countryPlaceholder}
                    className={inputCls()}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">{copy.city}</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={e => set('city', e.target.value)}
                    placeholder={copy.cityPlaceholder}
                    className={inputCls()}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">{copy.location}</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={e => set('location', e.target.value)}
                    placeholder={copy.locationPlaceholder}
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
              <h2 className="text-lg font-bold text-gray-900">{copy.conditionsTitle}</h2>
              <p className="text-sm text-gray-500">{copy.conditionsSubtitle}</p>
            </div>

            <div className="bg-white rounded-xl p-4 space-y-4 border border-gray-100">
              {/* Max applicants */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  {copy.maxApplicants} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={form.maxApplicants}
                  onChange={e => set('maxApplicants', e.target.value ? Number(e.target.value) : '')}
                  placeholder={copy.maxPlaceholder}
                  className={inputCls(errors.maxApplicants)}
                />
                <FieldError msg={errors.maxApplicants} />
              </div>

              {/* Positions */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">
                  {copy.targetPositions}
                  <span className="font-normal text-gray-400 mr-1">{copy.optional}</span>
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
                    {copy.ageMin}
                    <span className="font-normal text-gray-400 mr-1">{copy.optional}</span>
                  </label>
                  <input
                    type="number"
                    min={5} max={60}
                    value={form.ageMin}
                    onChange={e => set('ageMin', e.target.value ? Number(e.target.value) : '')}
                    placeholder={copy.ageMinPlaceholder}
                    className={inputCls(errors.ageMin)}
                  />
                  <FieldError msg={errors.ageMin} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">
                    {copy.ageMax}
                    <span className="font-normal text-gray-400 mr-1">{copy.optional}</span>
                  </label>
                  <input
                    type="number"
                    min={5} max={60}
                    value={form.ageMax}
                    onChange={e => set('ageMax', e.target.value ? Number(e.target.value) : '')}
                    placeholder={copy.ageMaxPlaceholder}
                    className={inputCls(errors.ageMax)}
                  />
                  <FieldError msg={errors.ageMax} />
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">{copy.gender}</label>
                <div className="flex gap-2">
                  {(['both', 'male', 'female'] as const).map((val) => (
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
                      {copy.genders[val]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <h3 className="text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">{copy.services}</h3>
              <div className="divide-y divide-gray-50">
                <Toggle label={copy.accommodation} value={form.providesAccommodation} onChange={v => set('providesAccommodation', v)} />
                <Toggle label={copy.meals} value={form.providesMeals} onChange={v => set('providesMeals', v)} />
                <Toggle label={copy.transport} value={form.providesTransport} onChange={v => set('providesTransport', v)} />
              </div>
            </div>

            {/* Payment */}
            <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-3">
              <Toggle label={copy.paid} value={form.isPaid} onChange={v => { set('isPaid', v); if (!v) set('fee', ''); }} />
              {form.isPaid && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">
                      {copy.fee} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={form.fee}
                      onChange={e => set('fee', e.target.value ? Number(e.target.value) : '')}
                      placeholder={copy.feePlaceholder}
                      className={inputCls(errors.fee)}
                    />
                    <FieldError msg={errors.fee} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">{copy.currency}</label>
                    <select
                      value={form.currency}
                      onChange={e => set('currency', e.target.value)}
                      className={inputCls()}
                    >
                      {Object.entries(copy.currencies).map(([value, label]) => <option key={value} value={value}>{String(label)}</option>)}
                    </select>
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  {copy.compensation}
                  <span className="font-normal text-gray-400 mr-1">{copy.optional}</span>
                </label>
                <input
                  type="text"
                  value={form.compensation}
                  onChange={e => set('compensation', e.target.value)}
                  placeholder={copy.compensationPlaceholder}
                  className={inputCls()}
                />
              </div>
            </div>

            {/* Requirements */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                {copy.requirements}
                <span className="font-normal text-gray-400 mr-1">{copy.optional}</span>
              </label>
              <textarea
                value={form.requirements}
                onChange={e => set('requirements', e.target.value)}
                placeholder={copy.requirementsPlaceholder}
                rows={3}
                className={`${inputCls()} resize-none`}
              />
            </div>

            {/* Status */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <label className="text-xs font-bold text-gray-700 mb-2 block uppercase tracking-wide">{copy.publishStatus}</label>
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
                  {copy.publishNow}
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
                  {copy.saveAsDraft}
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
              {copy.previous}
            </button>
          )}

          {step < 3 ? (
            <button
              onClick={goNext}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 active:scale-95 transition-all"
            >
              {copy.next}
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 disabled:opacity-50 active:scale-95 transition-all"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" />{copy.saving}</>
              ) : (
                <><CheckCircle className="w-4 h-4" />{form.status === 'active' ? copy.publishOpportunity : copy.saveDraft}</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
