'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/config';
import { X, AlertCircle, ArrowLeft } from 'lucide-react';

// الحقول الأساسية لكل نوع حساب
const REQUIRED_FIELDS: Record<string, { key: string; label: string }[]> = {
  academy: [
    { key: 'academy_name',  label: 'اسم الأكاديمية' },
    { key: 'academy_type',  label: 'نوع الأكاديمية' },
    { key: 'country',       label: 'الدولة' },
    { key: 'city',          label: 'المدينة' },
    { key: 'phone',         label: 'رقم الهاتف' },
    { key: 'email',         label: 'البريد الإلكتروني' },
    { key: 'description',   label: 'نبذة عن الأكاديمية' },
    { key: 'founding_year', label: 'سنة التأسيس' },
  ],
  club: [
    { key: 'club_name',     label: 'اسم النادي' },
    { key: 'country',       label: 'الدولة' },
    { key: 'city',          label: 'المدينة' },
    { key: 'phone',         label: 'رقم الهاتف' },
    { key: 'email',         label: 'البريد الإلكتروني' },
    { key: 'description',   label: 'نبذة عن النادي' },
  ],
  player: [
    { key: 'name',          label: 'الاسم' },
    { key: 'nationality',   label: 'الجنسية' },
    { key: 'position',      label: 'المركز' },
    { key: 'phone',         label: 'رقم الهاتف' },
    { key: 'dateOfBirth',   label: 'تاريخ الميلاد' },
  ],
  trainer: [
    { key: 'name',          label: 'الاسم' },
    { key: 'country',       label: 'الدولة' },
    { key: 'phone',         label: 'رقم الهاتف' },
    { key: 'email',         label: 'البريد الإلكتروني' },
    { key: 'specialization', label: 'التخصص' },
  ],
  agent: [
    { key: 'name',          label: 'الاسم' },
    { key: 'country',       label: 'الدولة' },
    { key: 'phone',         label: 'رقم الهاتف' },
    { key: 'email',         label: 'البريد الإلكتروني' },
  ],
  marketer: [
    { key: 'name',          label: 'الاسم' },
    { key: 'country',       label: 'الدولة' },
    { key: 'phone',         label: 'رقم الهاتف' },
    { key: 'email',         label: 'البريد الإلكتروني' },
  ],
};

const COLLECTION_MAP: Record<string, string> = {
  academy:  'academies',
  club:     'clubs',
  player:   'players',
  trainer:  'trainers',
  agent:    'agents',
  marketer: 'marketers',
};

const PROFILE_PATH: Record<string, string> = {
  academy:  '/dashboard/academy/profile',
  club:     '/dashboard/club/profile',
  player:   '/dashboard/player/profile',
  trainer:  '/dashboard/trainer/profile',
  agent:    '/dashboard/agent/profile',
  marketer: '/dashboard/marketer/profile',
};

const REMINDER_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 ساعات

interface Props {
  uid: string;
  accountType: string;
}

export default function ProfileCompletionReminder({ uid, accountType }: Props) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const storageKey = `profile_reminder_${uid}`;

  useEffect(() => {
    if (!uid) return;
    const requiredFields = REQUIRED_FIELDS[accountType];
    const tableName = COLLECTION_MAP[accountType];
    if (!requiredFields || !tableName) return;

    // تحقق من التوقيت — لا تُظهر إذا لم تمر 3 ساعات منذ آخر إغلاق
    const lastShown = localStorage.getItem(storageKey);
    if (lastShown && Date.now() - Number(lastShown) < REMINDER_INTERVAL_MS) return;

    // اجلب البيانات من Supabase — ابحث بالـ uid أولاً (Supabase UUID) ثم بالـ id (Firebase UID)
    supabase
      .from(tableName)
      .select('*')
      .or(`uid.eq.${uid},id.eq.${uid}`)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const missing = requiredFields
          .filter(({ key }) => !data[key] || (typeof data[key] === 'string' && !data[key].trim()))
          .map(({ label }) => label);

        if (missing.length > 0) {
          setMissingFields(missing);
          setVisible(true);
        }
      })
      .then(undefined, () => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, accountType]);

  const handleClose = () => {
    localStorage.setItem(storageKey, String(Date.now()));
    setVisible(false);
  };

  const handleGoToProfile = () => {
    handleClose();
    router.push(PROFILE_PATH[accountType] || '/dashboard');
  };

  if (!visible) return null;

  return (
    <div
      dir="rtl"
      className="fixed bottom-6 left-6 z-50 w-80 rounded-2xl shadow-2xl border border-amber-200 bg-white overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
    >
      {/* شريط علوي */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-l from-amber-500 to-orange-500">
        <div className="flex items-center gap-2 text-white">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-bold">أكمل ملفك الشخصي</span>
        </div>
        <button onClick={handleClose} className="text-white/80 hover:text-white transition">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* المحتوى */}
      <div className="p-4">
        <p className="text-xs text-gray-500 mb-3">
          الملف الشخصي غير مكتمل — أكمله لتحسين ظهورك وجذب الفرص.
        </p>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {missingFields.slice(0, 4).map(label => (
            <span key={label} className="px-2 py-0.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
              {label}
            </span>
          ))}
          {missingFields.length > 4 && (
            <span className="px-2 py-0.5 text-xs bg-gray-50 text-gray-500 border border-gray-200 rounded-full">
              +{missingFields.length - 4} أخرى
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={handleGoToProfile}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition"
          >
            اكمل الآن
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-gray-400">سيظهر مجدداً بعد 3 ساعات</span>
        </div>
      </div>
    </div>
  );
}
