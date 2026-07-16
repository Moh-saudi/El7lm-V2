'use client';

import { useAuth } from '@/lib/firebase/auth-provider';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Edit, Users, School, Trophy, MapPin, Phone, Mail, Globe,
  Facebook, Twitter, Instagram, Calendar, ArrowLeft, Award,
  Building2, UserCircle2, Plus, GraduationCap, BookOpen, Target,
  Star, FileText, Save, X, Camera, Trash2, Linkedin, Shield,
  CheckSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/config';
import { useTranslation } from '@/lib/i18n';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import { authenticatedFetch } from '@/lib/api/authenticated-fetch';

interface Branch {
  name: string;
  address: string;
  contact: string;
}

interface AcademyData {
  // معلومات أساسية — TEXT في DB
  academy_name: string;
  description: string;
  logo: string;
  coverImage: string;
  founding_year: string;       // TEXT في DB
  academy_type: string;
  is_federation_approved: boolean; // BOOLEAN
  license_number: string;
  registration_date: string;   // TEXT في DB

  // التواصل — TEXT
  country: string;
  city: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  social_media: {              // JSONB
    facebook: string;
    instagram: string;
    twitter: string;
    linkedin: string;
    tiktok: string;
  };

  // البرامج
  age_groups: string[];        // JSONB
  sports_facilities: string[]; // JSONB
  number_of_coaches: number | null; // INTEGER في DB — لا ترسل ""
  training_programs: string;
  academy_goals: string;
  achievements: string;

  // الكادر — JSONB
  director: { name: string; photo: string; bio: string; contact: string };
  technical_director: { name: string; photo: string; license: string; experience: string };

  // الفروع والميديا — JSONB
  branches: Branch[];
  success_stories: string[];
  partnerships: string[];
  facility_photos: string[];

  // الإحصائيات — JSONB
  stats: {
    students: number;
    programs: number;
    coaches: number;
    graduates: number;
  };
}

const initialAcademyData: AcademyData = {
  academy_name: '',
  description: '',
  logo: '/images/club-avatar.png',
  coverImage: '/images/hero-1.jpg',
  founding_year: '',
  academy_type: '',
  is_federation_approved: false,
  license_number: '',
  registration_date: '',

  country: '',
  city: '',
  address: '',
  phone: '',
  whatsapp: '',
  email: '',
  website: '',
  social_media: { facebook: '', instagram: '', twitter: '', linkedin: '', tiktok: '' },

  age_groups: [],
  sports_facilities: [],
  number_of_coaches: null,
  training_programs: '',
  academy_goals: '',
  achievements: '',

  director: { name: '', photo: '/images/club-avatar.png', bio: '', contact: '' },
  technical_director: { name: '', photo: '/images/club-avatar.png', license: '', experience: '' },

  branches: [],
  success_stories: [],
  partnerships: [],
  facility_photos: [],

  stats: { students: 0, programs: 0, coaches: 0, graduates: 0 },
};

const SENIOR_AGE_GROUP = '\u0623\u0643\u0627\u0628\u0631';
const AGE_GROUPS = ['U-6', 'U-8', 'U-10', 'U-12', 'U-14', 'U-16', 'U-18', SENIOR_AGE_GROUP];
const FACILITIES = [
  '\u0645\u0644\u0639\u0628 \u0637\u0628\u064a\u0639\u064a', '\u0645\u0644\u0639\u0628 \u0635\u0646\u0627\u0639\u064a',
  '\u0635\u0627\u0644\u0629 \u0645\u063a\u0644\u0642\u0629', '\u062d\u0645\u0627\u0645 \u0633\u0628\u0627\u062d\u0629',
  '\u0635\u0627\u0644\u0629 \u0644\u064a\u0627\u0642\u0629', '\u063a\u0631\u0641 \u062a\u063a\u064a\u064a\u0631',
  '\u0643\u0627\u0641\u062a\u064a\u0631\u064a\u0627', '\u0642\u0627\u0639\u0629 \u0627\u062c\u062a\u0645\u0627\u0639\u0627\u062a',
];

const REQUIRED_FIELD_KEYS: (keyof AcademyData)[] = [
  'academy_name', 'academy_type', 'country', 'city', 'phone', 'email', 'description', 'founding_year',
];

const getImageUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('/')) return path;
  const CDN = process.env.NEXT_PUBLIC_CDN_URL || '';
  return `${CDN}/academies/${path}`;
};

export default function AcademyProfilePage() {
  const { isRTL, getTranslations } = useTranslation();
  const copy = getTranslations<any>('academyProfile');
  const interpolate = (template: string, values: Record<string, string | number>) =>
    template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(values[key] ?? ''));
  const requiredFields = REQUIRED_FIELD_KEYS.map(key => ({ key, label: copy.requiredLabels[key] }));
  const { userData, user, updateUserData } = useAuth();
  const router = useRouter();

  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [academyData, setAcademyData] = useState<AcademyData>(initialAcademyData);

  const [errors, setErrors] = useState<Partial<Record<keyof AcademyData, string>>>({});
  const [showCompletionBanner, setShowCompletionBanner] = useState(false);

  const [newStory, setNewStory] = useState('');
  const [showAddStory, setShowAddStory] = useState(false);
  const [newPartner, setNewPartner] = useState('');
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [newBranch, setNewBranch] = useState<Branch>({ name: '', address: '', contact: '' });

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase.from('academies').select('*').eq('id', user.id).maybeSingle();
      if (!!data) {
        setAcademyData({
          ...initialAcademyData,
          ...data,
          logo: getImageUrl((data.logo as string) || initialAcademyData.logo),
          coverImage: getImageUrl((data.coverImage as string) || initialAcademyData.coverImage),
          stats: { ...initialAcademyData.stats, ...((data.stats as object) || {}) },
          social_media: { ...initialAcademyData.social_media, ...((data.social_media as object) || {}) },
          director: { ...initialAcademyData.director, ...((data.director as object) || {}) },
          technical_director: { ...initialAcademyData.technical_director, ...((data.technical_director as object) || {}) },
          age_groups: (data.age_groups as string[]) || [],
          sports_facilities: (data.sports_facilities as string[]) || [],
          branches: (data.branches as Branch[]) || [],
          success_stories: (data.success_stories as string[]) || [],
          partnerships: (data.partnerships as string[]) || [],
          facility_photos: (data.facility_photos as string[]) || [],
          academy_name: (data.academy_name as string) || (data.name as string) || userData?.name || '',
          email: (data.email as string) || userData?.email || '',
          phone: (data.phone as string) || userData?.phone || '',
        });
      } else {
        const basicData: AcademyData = {
          ...initialAcademyData,
          academy_name: userData?.name || '',
          email: userData?.email || '',
          phone: userData?.phone || '',
        };
        await supabase.from('academies').upsert({ id: user.id, ...basicData, createdAt: new Date().toISOString(), accountType: 'academy' });
        setAcademyData(basicData);
      }
    } catch (err) {
      console.error('Error fetching academy data:', err);
      toast.error(copy.loadError);
    } finally {
      setLoading(false);
    }
  }, [user, userData]);

  useEffect(() => {
    if (user) {
      fetchData();
    } else if (user === null) {
      setLoading(false);
      router.replace('/auth/login');
    }
  }, [user, fetchData, router]);


  const missingFields = requiredFields.filter(({ key }) => {
    const val = academyData[key];
    return !val || (typeof val === 'string' && !val.trim());
  });

  const BANNER_SNOOZE_KEY = `academy_profile_banner_snoozed_${user?.id}`;
  const SNOOZE_DAYS = 3;

  useEffect(() => {
    if (loading || missingFields.length === 0) return;
    const snoozedAt = localStorage.getItem(BANNER_SNOOZE_KEY);
    if (snoozedAt) {
      const daysSince = (Date.now() - Number(snoozedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < SNOOZE_DAYS) return; // لا يزال في فترة التأجيل
    }
    setShowCompletionBanner(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof AcademyData, string>> = {};
    requiredFields.forEach(({ key, label }) => {
      const val = academyData[key];
      if (!val || (typeof val === 'string' && !val.trim())) {
        newErrors[key] = interpolate(copy.required, { field: label });
      }
    });
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error(copy.completeRequired);
      return false;
    }
    return true;
  };

  const handleChange = (field: string, value: unknown, parent?: string) => {
    setAcademyData(prev => {
      if (parent) {
        return {
          ...prev,
          [parent]: { ...(prev[parent as keyof AcademyData] as Record<string, unknown>), [field]: value },
        };
      }
      return { ...prev, [field]: value };
    });
  };

  const toggleArrayItem = (field: 'age_groups' | 'sports_facilities', value: string) => {
    setAcademyData(prev => ({
      ...prev,
      [field]: prev[field].includes(value) ? prev[field].filter(i => i !== value) : [...prev[field], value],
    }));
  };

  const handleImageUpload = async (file: File, type: 'logo' | 'cover' | 'gallery') => {
    if (!user?.id) return;
    if (!file.type.startsWith('image/')) { toast.error(copy.invalidImage); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error(copy.imageTooLarge); return; }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${type}_${Date.now()}.${ext}`;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'academies');
      formData.append('path', `${user.id}/${fileName}`);
      formData.append('contentType', file.type);

      const res = await authenticatedFetch('/api/storage/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error(copy.uploadFailed);
      const { publicUrl } = await res.json();

      if (type === 'gallery') {
        setAcademyData(prev => ({ ...prev, facility_photos: [...prev.facility_photos, publicUrl] }));
      } else {
        setAcademyData(prev => ({ ...prev, [type === 'logo' ? 'logo' : 'coverImage']: publicUrl }));
      }
      toast.success(copy.uploadSuccess);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(copy.uploadError);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    if (!validateForm()) return;
    setUploading(true);
    try {
      // تنظيف شامل: أي قيمة "" تُحوَّل إلى null لتجنب خطأ bigint في Postgres
      function sanitizeForDB(obj: Record<string, unknown>): Record<string, unknown> {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(obj)) {
          if (v === '') {
            out[k] = null;
          } else if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
            out[k] = sanitizeForDB(v as Record<string, unknown>);
          } else {
            out[k] = v;
          }
        }
        return out;
      }

      const raw = {
        ...academyData,
        name: academyData.academy_name,
        updatedAt: new Date().toISOString(),
      };
      const dataToSave = sanitizeForDB(raw as Record<string, unknown>);
      const { data: existing } = await supabase.from('academies').select('id').eq('id', user.id).maybeSingle();
      if (!!existing) {
        const { error: updateErr } = await supabase.from('academies').update(dataToSave as Record<string, unknown>).eq('id', user.id);
        if (updateErr) throw updateErr;
      } else {
        const { error: upsertErr } = await supabase.from('academies').upsert({ id: user.id, ...dataToSave, createdAt: new Date().toISOString(), accountType: 'academy' });
        if (upsertErr) throw upsertErr;
      }
      // مزامنة الاسم في users table
      try {
        const { data: usersRow } = await supabase.from('users').select('id').eq('id', user.id).maybeSingle();
        if (!!usersRow) {
          await supabase.from('users').update({
            name: academyData.academy_name,
            academy_name: academyData.academy_name,
          }).eq('id', user.id);
        }
      } catch (_) { /* users row may not exist — ignore */ }
      // مزامنة فورية للسايدبار
      await updateUserData({
        academy_name: academyData.academy_name,
        name: academyData.academy_name,
        logo: academyData.logo,
        profile_image: academyData.logo,
      });
      toast.success(copy.saveSuccess);
      setEditMode(false);
    } catch (err: unknown) {
      console.error('Save error:', err);
      const msg = err && typeof err === 'object' && 'message' in err ? (err as { message: string }).message : String(err);
      toast.error(interpolate(copy.saveFailed, { error: msg }));
    } finally {
      setUploading(false);
    }
  };

  const handleAddBranch = () => {
    if (!newBranch.name.trim()) { toast.error(copy.branchNameRequired); return; }
    setAcademyData(prev => ({ ...prev, branches: [...prev.branches, { ...newBranch }] }));
    setNewBranch({ name: '', address: '', contact: '' });
    setShowAddBranch(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full border-4 border-orange-200 animate-spin border-t-orange-600"></div>
          <p className="text-gray-600">{copy.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* Sticky Header */}
      <div className="sticky top-0 z-50 border-b border-gray-200 shadow-sm backdrop-blur-md bg-white/95">
        <div className="px-4 py-4 mx-auto max-w-7xl">
          <div className="flex justify-between items-center">
            <button onClick={() => router.back()}
              className="flex gap-2 items-center px-4 py-2 text-gray-600 rounded-lg transition hover:text-gray-800 hover:bg-gray-100">
              <ArrowLeft className={`w-5 h-5 ${isRTL ? '' : 'rotate-180'}`} />
              <span className="font-medium">{copy.back}</span>
            </button>
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900">{copy.title}</h1>
              {academyData.academy_name && <p className="text-sm text-gray-500">{academyData.academy_name}</p>}
            </div>
            <div className="flex gap-2 items-center">
              <LanguageSwitcher />
              {editMode ? (
                <>
                  <button onClick={handleSave} disabled={uploading}
                    className="flex gap-2 items-center px-4 py-2 text-white bg-green-600 rounded-lg transition hover:bg-green-700 disabled:opacity-60">
                    <Save className="w-4 h-4" />
                    {uploading ? copy.saving : copy.save}
                  </button>
                  <button onClick={() => { fetchData(); setEditMode(false); }}
                    className="flex gap-2 items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg transition hover:bg-gray-200">
                    <X className="w-4 h-4" /> {copy.cancel}
                  </button>
                </>
              ) : (
                <button onClick={() => setEditMode(true)}
                  className="flex gap-2 items-center px-5 py-2 text-white rounded-lg shadow transition hover:scale-105 bg-gradient-to-l from-orange-500 to-orange-700">
                  <Edit className="w-4 h-4" /> {copy.edit}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-8 mx-auto max-w-4xl">

        {/* Completion Banner */}
        {showCompletionBanner && !editMode && (
          <div className="flex gap-4 items-start p-4 mb-6 bg-amber-50 rounded-xl border-2 border-amber-300 shadow-sm">
            <div className="flex-shrink-0 mt-0.5 p-2 bg-amber-100 rounded-full">
              <Award className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="mb-1 text-sm font-bold text-amber-800">{copy.incompleteTitle}</p>
              <p className="mb-2 text-xs text-amber-700">
                {copy.incompleteDescription}
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {missingFields.map(({ label }) => (
                  <span key={label} className="px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-100 rounded-full border border-amber-300">
                    {label}
                  </span>
                ))}
              </div>
              <div className="flex gap-3 items-center">
                <button
                  onClick={() => setEditMode(true)}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-500 rounded-lg transition hover:bg-amber-600">
                  {copy.completeNow}
                </button>
                <span className="text-xs text-amber-500">{interpolate(copy.reminder, { days: SNOOZE_DAYS })}</span>
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.setItem(BANNER_SNOOZE_KEY, String(Date.now()));
                setShowCompletionBanner(false);
              }}
              title={interpolate(copy.reminderTitle, { days: SNOOZE_DAYS })}
              className="text-amber-400 hover:text-amber-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Cover Image */}
        <div className="overflow-hidden relative mb-8 h-52 rounded-2xl shadow-lg">
          <img src={academyData.coverImage || '/images/hero-1.jpg'} alt={copy.coverAlt}
            className="object-cover w-full h-full" />
          {editMode && (
            <label className="flex absolute inset-0 justify-center items-center transition cursor-pointer bg-black/50 hover:bg-black/60">
              <input type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'cover')} />
              <div className="flex flex-col items-center gap-2 text-white">
                <Camera className="w-8 h-8" />
                <span className="text-sm font-medium">{copy.changeCover}</span>
              </div>
            </label>
          )}
        </div>

        {/* Profile Card */}
        <div className="flex flex-col gap-6 items-center p-8 mb-8 bg-white rounded-2xl shadow-lg md:flex-row">
          <div className="relative flex-shrink-0">
            <img src={academyData.logo || '/images/club-avatar.png'} alt={copy.logoAlt}
              className="object-cover w-32 h-32 rounded-full border-4 border-orange-500 shadow-lg" />
            {editMode && (
              <label className="flex absolute inset-0 justify-center items-center rounded-full transition cursor-pointer bg-black/50 hover:bg-black/60">
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logo')} />
                <Edit className="text-white" size={22} />
              </label>
            )}
          </div>
          <div className="flex-1 text-right">
            {editMode ? (
              <div className="mb-2">
                <input type="text" value={academyData.academy_name}
                  onChange={e => { handleChange('academy_name', e.target.value); setErrors(p => ({ ...p, academy_name: '' })); }}
                  placeholder={copy.academyNamePlaceholder}
                  className={`w-full text-2xl font-bold text-right text-gray-900 bg-transparent border-b-2 focus:outline-none ${errors.academy_name ? 'border-red-400' : 'border-orange-300 focus:border-orange-600'}`} />
                {errors.academy_name && <p className="mt-1 text-xs text-red-500">{errors.academy_name}</p>}
              </div>
            ) : (
              <h2 className="mb-1 text-2xl font-bold text-orange-700">{academyData.academy_name || copy.academyFallback}</h2>
            )}
            {editMode ? (
              <div className="mb-3">
                <input type="text" value={academyData.academy_type}
                  onChange={e => { handleChange('academy_type', e.target.value); setErrors(p => ({ ...p, academy_type: '' })); }}
                  placeholder={copy.typePlaceholder}
                  className={`w-full text-right text-gray-600 bg-transparent border-b focus:outline-none ${errors.academy_type ? 'border-red-400' : 'border-gray-200 focus:border-orange-400'}`} />
                {errors.academy_type && <p className="mt-0.5 text-xs text-red-500">{errors.academy_type}</p>}
              </div>
            ) : (
              <p className="mb-3 text-gray-600">{academyData.academy_type || copy.academyFallback}</p>
            )}
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <span className="flex gap-1 items-center">
                <MapPin size={15} />
                {editMode ? (
                  <>
                    <input type="text" value={academyData.city}
                      onChange={e => { handleChange('city', e.target.value); setErrors(p => ({ ...p, city: '' })); }}
                      placeholder={copy.cityPlaceholder}
                      className={`w-20 bg-transparent border-b focus:outline-none ${errors.city ? 'border-red-400' : 'border-gray-200'}`} />
                    <span>,</span>
                    <input type="text" value={academyData.country}
                      onChange={e => { handleChange('country', e.target.value); setErrors(p => ({ ...p, country: '' })); }}
                      placeholder={copy.countryPlaceholder}
                      className={`w-20 bg-transparent border-b focus:outline-none ${errors.country ? 'border-red-400' : 'border-gray-200'}`} />
                  </>
                ) : (`${academyData.city || '—'}${academyData.country ? `, ${academyData.country}` : ''}`)}
              </span>
              <span className="flex gap-1 items-center">
                <Calendar size={15} />
                {editMode ? (
                  <input type="text" value={academyData.founding_year}
                    onChange={e => { handleChange('founding_year', e.target.value); setErrors(p => ({ ...p, founding_year: '' })); }}
                    placeholder={copy.yearPlaceholder}
                    className={`w-20 bg-transparent border-b focus:outline-none ${errors.founding_year ? 'border-red-400' : 'border-gray-200'}`} />
                ) : (academyData.founding_year ? interpolate(copy.founded, { year: academyData.founding_year }) : '—')}
              </span>
            </div>
            <div className="flex gap-2 mt-4">
              <span className="self-center text-sm text-gray-500">{copy.federationApproval}</span>
              {[{ label: copy.approved, val: true }, { label: copy.unapproved, val: false }].map(({ label, val }) => (
                <button key={label} disabled={!editMode}
                  onClick={() => editMode && handleChange('is_federation_approved', val)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border-2 transition disabled:cursor-default ${
                    academyData.is_federation_approved === val
                      ? 'border-orange-600 bg-orange-50 text-orange-700'
                      : 'border-gray-200 text-gray-400'
                  }`}>
                  {val && <Shield className="inline w-3.5 h-3.5 ml-1" />}
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8 md:grid-cols-4">
          {[
            { icon: <Users size={26} />, label: copy.stats.students, field: 'students', color: 'from-orange-400 to-orange-600' },
            { icon: <BookOpen size={26} />, label: copy.stats.programs, field: 'programs', color: 'from-blue-400 to-blue-600' },
            { icon: <GraduationCap size={26} />, label: copy.stats.coaches, field: 'coaches', color: 'from-green-400 to-green-600' },
            { icon: <Trophy size={26} />, label: copy.stats.graduates, field: 'graduates', color: 'from-purple-400 to-purple-600' },
          ].map(({ icon, label, field, color }) => (
            <div key={field} className={`flex flex-col items-center p-5 text-white bg-gradient-to-br ${color} rounded-xl shadow`}>
              {icon}
              {editMode ? (
                <input type="number" value={academyData.stats[field as keyof typeof academyData.stats]}
                  onChange={e => handleChange(field, Number(e.target.value), 'stats')}
                  className="mt-2 w-16 text-2xl font-bold text-center text-white bg-white/20 rounded border-0 focus:outline-none focus:bg-white/30" min={0} />
              ) : (
                <div className="mt-2 text-2xl font-bold">{academyData.stats[field as keyof typeof academyData.stats]}</div>
              )}
              <div className="mt-1 text-sm opacity-90">{label}</div>
            </div>
          ))}
        </div>

        {/* Description + Contact */}
        <div className="grid grid-cols-1 gap-8 mb-8 md:grid-cols-2">
          <div className="p-6 bg-white rounded-xl shadow">
            <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-orange-700">
              <FileText size={20} /> {copy.aboutTitle}
            </h3>
            {editMode ? (
              <>
                <textarea value={academyData.description}
                  onChange={e => { handleChange('description', e.target.value); setErrors(p => ({ ...p, description: '' })); }}
                  rows={5} placeholder={copy.aboutPlaceholder}
                  className={`p-3 w-full text-right text-sm rounded-lg border resize-none focus:outline-none focus:ring-2 ${errors.description ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-orange-300'}`} />
                {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
              </>
            ) : (
              <p className="text-sm leading-relaxed text-gray-600">{academyData.description || copy.noAbout}</p>
            )}
          </div>
          <div className="p-6 bg-white rounded-xl shadow">
            <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-orange-700">
              <Phone size={20} /> {copy.contactTitle}
            </h3>
            <div className="space-y-3">
              {[
                { icon: <Phone size={15} />, label: copy.contactFields.phone, field: 'phone', type: 'tel', required: true },
                { icon: <Phone size={15} />, label: copy.contactFields.whatsapp, field: 'whatsapp', type: 'tel', required: false },
                { icon: <Mail size={15} />, label: copy.contactFields.email, field: 'email', type: 'email', required: true },
                { icon: <MapPin size={15} />, label: copy.contactFields.address, field: 'address', type: 'text', required: false },
                { icon: <Globe size={15} />, label: copy.contactFields.website, field: 'website', type: 'url', required: false },
              ].map(({ icon, label, field, type, required }) => (
                <div key={field} className="flex gap-3 items-start">
                  <span className="mt-1.5 text-orange-500">{icon}</span>
                  <span className="mt-1.5 w-20 text-sm text-gray-500 shrink-0">{label}{required ? ' *' : ''}:</span>
                  {editMode ? (
                    <div className="flex-1">
                      <input type={type} value={academyData[field as keyof AcademyData] as string}
                        onChange={e => { handleChange(field, e.target.value); if (required) setErrors(p => ({ ...p, [field]: '' })); }}
                        className={`w-full px-2 py-1 text-sm rounded border focus:outline-none focus:ring-2 ${errors[field as keyof AcademyData] ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-orange-300'}`} />
                      {errors[field as keyof AcademyData] && (
                        <p className="mt-0.5 text-xs text-red-500">{errors[field as keyof AcademyData]}</p>
                      )}
                    </div>
                  ) : (
                    <span className="mt-1.5 text-sm text-gray-700">{(academyData[field as keyof AcademyData] as string) || '—'}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* License Info */}
        <div className="p-6 mb-8 bg-white rounded-xl shadow">
          <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-orange-700">
            <Shield size={20} /> {copy.licensingTitle}
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { label: copy.licenseNumber, field: 'license_number', type: 'text' },
              { label: copy.registrationDate, field: 'registration_date', type: 'date' },
              { label: copy.foundingYear, field: 'founding_year', type: 'text' },
            ].map(({ label, field, type }) => (
              <div key={field} className="flex gap-2 items-center">
                <span className="w-32 text-sm text-gray-500 shrink-0">{label}:</span>
                {editMode ? (
                  <input type={type} value={academyData[field as keyof AcademyData] as string}
                    onChange={e => handleChange(field, e.target.value)}
                    className="flex-1 px-2 py-1 text-sm rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300" />
                ) : (
                  <span className="text-sm font-medium text-gray-800">{(academyData[field as keyof AcademyData] as string) || '—'}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Age Groups + Facilities */}
        <div className="grid grid-cols-1 gap-8 mb-8 md:grid-cols-2">
          <div className="p-6 bg-white rounded-xl shadow">
            <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-orange-700">
              <Target size={20} /> {copy.ageGroupsTitle}
            </h3>
            <div className="flex flex-wrap gap-2">
              {AGE_GROUPS.map(group => (
                <button key={group} disabled={!editMode}
                  onClick={() => editMode && toggleArrayItem('age_groups', group)}
                  className={`px-3 py-1.5 rounded-full text-sm border-2 transition disabled:cursor-default ${
                    academyData.age_groups.includes(group)
                      ? 'border-orange-600 bg-orange-50 text-orange-700 font-medium'
                      : 'border-gray-200 text-gray-400'
                  }`}>
                  {group === SENIOR_AGE_GROUP ? copy.senior : group}
                </button>
              ))}
            </div>
            {academyData.age_groups.length === 0 && !editMode && (
              <p className="mt-2 text-xs text-gray-400">{copy.notSelected}</p>
            )}
          </div>

          <div className="p-6 bg-white rounded-xl shadow">
            <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-orange-700">
              <Building2 size={20} /> {copy.facilitiesTitle}
            </h3>
            <div className="flex flex-wrap gap-2">
              {FACILITIES.map((fac, index) => (
                <button key={fac} disabled={!editMode}
                  onClick={() => editMode && toggleArrayItem('sports_facilities', fac)}
                  className={`px-3 py-1.5 rounded-full text-sm border-2 transition disabled:cursor-default ${
                    academyData.sports_facilities.includes(fac)
                      ? 'border-orange-600 bg-orange-50 text-orange-700 font-medium'
                      : 'border-gray-200 text-gray-400'
                  }`}>
                  {copy.facilities[index]}
                </button>
              ))}
            </div>
            {academyData.sports_facilities.length === 0 && !editMode && (
              <p className="mt-2 text-xs text-gray-400">{copy.notSelected}</p>
            )}
          </div>
        </div>

        {/* Training Programs + Goals */}
        <div className="grid grid-cols-1 gap-8 mb-8 md:grid-cols-2">
          <div className="p-6 bg-white rounded-xl shadow">
            <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-orange-700">
              <BookOpen size={20} /> {copy.programsTitle}
            </h3>
            {editMode ? (
              <textarea value={academyData.training_programs} onChange={e => handleChange('training_programs', e.target.value)}
                rows={5} placeholder={copy.programsPlaceholder}
                className="p-3 w-full text-right text-sm rounded-lg border border-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300" />
            ) : (
              <p className="text-sm leading-relaxed text-right text-gray-600">{academyData.training_programs || '—'}</p>
            )}
          </div>
          <div className="p-6 bg-white rounded-xl shadow">
            <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-orange-700">
              <Star size={20} /> {copy.goalsTitle}
            </h3>
            {editMode ? (
              <textarea value={academyData.academy_goals} onChange={e => handleChange('academy_goals', e.target.value)}
                rows={5} placeholder={copy.goalsPlaceholder}
                className="p-3 w-full text-right text-sm rounded-lg border border-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300" />
            ) : (
              <p className="text-sm leading-relaxed text-right text-gray-600">{academyData.academy_goals || '—'}</p>
            )}
          </div>
        </div>

        {/* Director + Technical Director */}
        <div className="grid grid-cols-1 gap-8 mb-8 md:grid-cols-2">
          {/* Technical Director */}
          <div className="p-6 bg-white rounded-xl shadow">
            <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-orange-700">
              <UserCircle2 size={20} /> {copy.technicalDirector}
            </h3>
            <div className="flex gap-4 items-start">
              <div className="relative shrink-0">
                <img src={academyData.technical_director.photo || '/images/club-avatar.png'}
                  alt={copy.technicalDirectorAlt} className="object-cover w-16 h-16 rounded-full border-2 border-orange-200" />
                {editMode && (
                  <label className="flex absolute inset-0 justify-center items-center rounded-full cursor-pointer bg-black/40 hover:bg-black/60">
                    <input type="file" accept="image/*" className="hidden" onChange={async e => {
                      if (!e.target.files?.[0] || !user?.id) return;
                      const file = e.target.files[0];
                      setUploading(true);
                      const formData = new FormData();
                      formData.append('file', file);
                      formData.append('bucket', 'academies');
                      formData.append('path', `${user.id}/tech_director_${Date.now()}.${file.name.split('.').pop()}`);
                      formData.append('contentType', file.type);
                      const res = await authenticatedFetch('/api/storage/upload', { method: 'POST', body: formData });
                      if (res.ok) {
                        const { publicUrl } = await res.json();
                        handleChange('photo', publicUrl, 'technical_director');
                      }
                      setUploading(false);
                    }} />
                    <Camera size={14} className="text-white" />
                  </label>
                )}
              </div>
              <div className="flex-1 space-y-2">
                {editMode ? (
                  <>
                    <input type="text" value={academyData.technical_director.name}
                      onChange={e => handleChange('name', e.target.value, 'technical_director')}
                      placeholder={copy.namePlaceholder} className="w-full px-2 py-1 text-sm rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300" />
                    <input type="text" value={academyData.technical_director.license}
                      onChange={e => handleChange('license', e.target.value, 'technical_director')}
                      placeholder={copy.licensePlaceholder} className="w-full px-2 py-1 text-sm rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300" />
                    <input type="text" value={academyData.technical_director.experience}
                      onChange={e => handleChange('experience', e.target.value, 'technical_director')}
                      placeholder={copy.experiencePlaceholder} className="w-full px-2 py-1 text-sm rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300" />
                  </>
                ) : (
                  <>
                    <p className="font-bold text-gray-900">{academyData.technical_director.name || '—'}</p>
                    <p className="text-sm text-gray-500">{copy.licenseLabel} {academyData.technical_director.license || '—'}</p>
                    <p className="text-sm text-gray-500">{copy.experienceLabel} {academyData.technical_director.experience || '—'}</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* General Director */}
          <div className="p-6 bg-white rounded-xl shadow">
            <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-orange-700">
              <UserCircle2 size={20} /> {copy.generalDirector}
            </h3>
            <div className="flex gap-4 items-start">
              <div className="relative shrink-0">
                <img src={academyData.director.photo || '/images/club-avatar.png'}
                  alt={copy.generalDirectorAlt} className="object-cover w-16 h-16 rounded-full border-2 border-orange-200" />
                {editMode && (
                  <label className="flex absolute inset-0 justify-center items-center rounded-full cursor-pointer bg-black/40 hover:bg-black/60">
                    <input type="file" accept="image/*" className="hidden" onChange={async e => {
                      if (!e.target.files?.[0] || !user?.id) return;
                      const file = e.target.files[0];
                      setUploading(true);
                      const formData = new FormData();
                      formData.append('file', file);
                      formData.append('bucket', 'academies');
                      formData.append('path', `${user.id}/director_${Date.now()}.${file.name.split('.').pop()}`);
                      formData.append('contentType', file.type);
                      const res = await authenticatedFetch('/api/storage/upload', { method: 'POST', body: formData });
                      if (res.ok) {
                        const { publicUrl } = await res.json();
                        handleChange('photo', publicUrl, 'director');
                      }
                      setUploading(false);
                    }} />
                    <Camera size={14} className="text-white" />
                  </label>
                )}
              </div>
              <div className="flex-1 space-y-2">
                {editMode ? (
                  <>
                    <input type="text" value={academyData.director.name}
                      onChange={e => handleChange('name', e.target.value, 'director')}
                      placeholder={copy.namePlaceholder} className="w-full px-2 py-1 text-sm rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300" />
                    <input type="text" value={academyData.director.bio}
                      onChange={e => handleChange('bio', e.target.value, 'director')}
                      placeholder={copy.qualificationPlaceholder} className="w-full px-2 py-1 text-sm rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300" />
                    <input type="text" value={academyData.director.contact}
                      onChange={e => handleChange('contact', e.target.value, 'director')}
                      placeholder={copy.contactPlaceholder} className="w-full px-2 py-1 text-sm rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300" />
                  </>
                ) : (
                  <>
                    <p className="font-bold text-gray-900">{academyData.director.name || '—'}</p>
                    <p className="text-sm text-gray-500">{academyData.director.bio || '—'}</p>
                    <p className="text-sm text-gray-500">{academyData.director.contact || '—'}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Achievements */}
        <div className="p-6 mb-8 bg-white rounded-xl shadow">
          <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-orange-700">
            <Award size={20} /> {copy.achievementsTitle}
          </h3>
          {editMode ? (
            <textarea value={academyData.achievements} onChange={e => handleChange('achievements', e.target.value)}
              rows={4} placeholder={copy.achievementsPlaceholder}
              className="p-3 w-full text-right text-sm rounded-lg border border-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300" />
          ) : (
            <p className="text-sm leading-relaxed text-gray-600">{academyData.achievements || copy.noAchievements}</p>
          )}
        </div>

        {/* Success Stories + Partnerships */}
        <div className="grid grid-cols-1 gap-8 mb-8 md:grid-cols-2">
          {/* Success Stories */}
          <div className="p-6 bg-white rounded-xl shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="flex gap-2 items-center text-lg font-bold text-orange-700">
                <Star size={20} /> {copy.successStories}
              </h3>
              {editMode && (
                <button onClick={() => setShowAddStory(true)}
                  className="flex gap-1 items-center text-xs text-orange-600 hover:text-orange-800">
                  <Plus size={13} /> {copy.add}
                </button>
              )}
            </div>
            {showAddStory && editMode && (
              <div className="flex gap-2 mb-3">
                <input type="text" value={newStory} onChange={e => setNewStory(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && newStory.trim() && (setAcademyData(p => ({ ...p, success_stories: [...p.success_stories, newStory.trim()] })), setNewStory(''), setShowAddStory(false))}
                  placeholder={copy.storyPlaceholder}
                  className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300" />
                <button onClick={() => { if (newStory.trim()) { setAcademyData(p => ({ ...p, success_stories: [...p.success_stories, newStory.trim()] })); setNewStory(''); setShowAddStory(false); } }}
                  className="px-3 py-1.5 text-sm text-white bg-orange-600 rounded-lg hover:bg-orange-700">{copy.add}</button>
                <button onClick={() => { setShowAddStory(false); setNewStory(''); }}
                  className="px-2 text-gray-500 hover:text-red-500"><X size={16} /></button>
              </div>
            )}
            {academyData.success_stories.length === 0 ? (
              <p className="text-sm text-center text-gray-400 py-4">{copy.noStories}</p>
            ) : (
              <div className="space-y-2">
                {academyData.success_stories.map((story, i) => (
                  <div key={i} className="flex justify-between items-start p-3 border-r-4 border-orange-400 bg-orange-50 rounded-lg">
                    <p className="text-sm text-gray-700 flex-1">{story}</p>
                    {editMode && (
                      <button onClick={() => setAcademyData(p => ({ ...p, success_stories: p.success_stories.filter((_, idx) => idx !== i) }))}
                        className="mr-2 text-red-400 hover:text-red-600 shrink-0"><Trash2 size={14} /></button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Partnerships */}
          <div className="p-6 bg-white rounded-xl shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="flex gap-2 items-center text-lg font-bold text-orange-700">
                <CheckSquare size={20} /> {copy.partnerships}
              </h3>
              {editMode && (
                <button onClick={() => setShowAddPartner(true)}
                  className="flex gap-1 items-center text-xs text-orange-600 hover:text-orange-800">
                  <Plus size={13} /> {copy.add}
                </button>
              )}
            </div>
            {showAddPartner && editMode && (
              <div className="flex gap-2 mb-3">
                <input type="text" value={newPartner} onChange={e => setNewPartner(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && newPartner.trim() && (setAcademyData(p => ({ ...p, partnerships: [...p.partnerships, newPartner.trim()] })), setNewPartner(''), setShowAddPartner(false))}
                  placeholder={copy.partnerPlaceholder}
                  className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300" />
                <button onClick={() => { if (newPartner.trim()) { setAcademyData(p => ({ ...p, partnerships: [...p.partnerships, newPartner.trim()] })); setNewPartner(''); setShowAddPartner(false); } }}
                  className="px-3 py-1.5 text-sm text-white bg-orange-600 rounded-lg hover:bg-orange-700">{copy.add}</button>
                <button onClick={() => { setShowAddPartner(false); setNewPartner(''); }}
                  className="px-2 text-gray-500 hover:text-red-500"><X size={16} /></button>
              </div>
            )}
            {academyData.partnerships.length === 0 ? (
              <p className="text-sm text-center text-gray-400 py-4">{copy.noPartnerships}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {academyData.partnerships.map((partner, i) => (
                  <div key={i} className="flex gap-1 items-center px-3 py-1.5 rounded-full border border-orange-200 bg-orange-50">
                    <span className="text-sm text-orange-800">{partner}</span>
                    {editMode && (
                      <button onClick={() => setAcademyData(p => ({ ...p, partnerships: p.partnerships.filter((_, idx) => idx !== i) }))}
                        className="text-red-400 hover:text-red-600"><X size={13} /></button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Branches */}
        <div className="p-6 mb-8 bg-white rounded-xl shadow">
          <div className="flex justify-between items-center mb-5">
            <h3 className="flex gap-2 items-center text-lg font-bold text-orange-700">
              <Building2 size={20} /> {copy.branches}
            </h3>
            {editMode && (
              <button onClick={() => setShowAddBranch(true)}
                className="flex gap-1 items-center px-3 py-1.5 text-sm text-white bg-orange-600 rounded-lg hover:bg-orange-700">
                <Plus size={16} /> {copy.addBranch}
              </button>
            )}
          </div>
          {showAddBranch && editMode && (
            <div className="p-4 mb-4 rounded-xl border border-orange-100 bg-orange-50">
              <h4 className="mb-3 font-semibold text-orange-700">{copy.newBranch}</h4>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {[
                  { label: copy.branchFields.name, field: 'name', placeholder: copy.branchFields.namePlaceholder },
                  { label: copy.branchFields.address, field: 'address', placeholder: copy.branchFields.addressPlaceholder },
                  { label: copy.branchFields.contact, field: 'contact', placeholder: copy.branchFields.contactPlaceholder },
                ].map(({ label, field, placeholder }) => (
                  <div key={field}>
                    <label className="block mb-1 text-xs text-gray-600">{label}</label>
                    <input type="text" value={newBranch[field as keyof Branch]}
                      onChange={e => setNewBranch(p => ({ ...p, [field]: e.target.value }))}
                      placeholder={placeholder}
                      className="px-3 py-2 w-full text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300" />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 justify-end mt-4">
                <button onClick={handleAddBranch} className="px-4 py-2 text-sm text-white bg-orange-600 rounded-lg hover:bg-orange-700">{copy.add}</button>
                <button onClick={() => { setShowAddBranch(false); setNewBranch({ name: '', address: '', contact: '' }); }}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">{copy.cancel}</button>
              </div>
            </div>
          )}
          {academyData.branches.length === 0 ? (
            <p className="py-4 text-sm text-center text-gray-400">{copy.noBranches}</p>
          ) : (
            <div className="space-y-3">
              {academyData.branches.map((branch, i) => (
                <div key={i} className="flex justify-between items-center p-4 rounded-xl border border-gray-100 bg-gray-50 hover:border-orange-200 transition">
                  <div>
                    <p className="font-bold text-gray-900">{branch.name}</p>
                    <p className="text-sm text-gray-500">{branch.address}</p>
                    {branch.contact && <p className="text-xs text-gray-400">{branch.contact}</p>}
                  </div>
                  {editMode && (
                    <button onClick={() => setAcademyData(p => ({ ...p, branches: p.branches.filter((_, idx) => idx !== i) }))}
                      className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Social Media */}
        <div className="p-6 mb-8 bg-white rounded-xl shadow">
          <h3 className="flex gap-2 items-center mb-5 text-lg font-bold text-orange-700">
            <Globe size={20} /> {copy.socialMedia}
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              { icon: <Facebook size={16} className="text-blue-600" />, label: 'Facebook', field: 'facebook' },
              { icon: <Instagram size={16} className="text-pink-600" />, label: 'Instagram', field: 'instagram' },
              { icon: <Globe size={16} className="text-sky-500" />, label: 'Twitter / X', field: 'twitter' },
              { icon: <Linkedin size={16} className="text-blue-700" />, label: 'LinkedIn', field: 'linkedin' },
              { icon: <Globe size={16} className="text-gray-500" />, label: 'TikTok', field: 'tiktok' },
            ].map(({ icon, label, field }) => (
              <div key={field} className="flex gap-3 items-center p-3 rounded-lg border border-gray-100 bg-gray-50">
                {icon}
                <span className="w-24 text-sm text-gray-500 shrink-0">{label}</span>
                {editMode ? (
                  <input type="url"
                    value={academyData.social_media[field as keyof typeof academyData.social_media]}
                    onChange={e => handleChange(field, e.target.value, 'social_media')}
                    placeholder="https://..."
                    className="flex-1 px-2 py-1 text-sm bg-white rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300" />
                ) : (
                  <span className="flex-1 text-sm text-blue-600 truncate">
                    {academyData.social_media[field as keyof typeof academyData.social_media] || '—'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Facility Photos Gallery */}
        <div className="p-6 bg-white rounded-xl shadow">
          <h3 className="flex gap-2 items-center mb-5 text-lg font-bold text-orange-700">
            <Camera size={20} /> {copy.gallery}
          </h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {academyData.facility_photos.map((img, idx) => (
              <div key={idx} className="overflow-hidden relative rounded-lg aspect-square group">
                <img src={img} alt={interpolate(copy.imageAlt, { number: idx + 1 })} className="object-cover w-full h-full" />
                {editMode && (
                  <button
                    onClick={() => setAcademyData(p => ({ ...p, facility_photos: p.facility_photos.filter((_, i) => i !== idx) }))}
                    className="flex absolute inset-0 justify-center items-center transition bg-black/0 group-hover:bg-black/50">
                    <Trash2 className="text-white opacity-0 group-hover:opacity-100 transition" size={22} />
                  </button>
                )}
              </div>
            ))}
            {editMode && (
              <label className="flex flex-col gap-2 justify-center items-center rounded-lg border-2 border-gray-300 border-dashed transition cursor-pointer aspect-square hover:border-orange-400 hover:bg-orange-50">
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'gallery')} />
                <Plus size={24} className="text-gray-400" />
                <span className="text-xs text-gray-400">{copy.addImage}</span>
              </label>
            )}
          </div>
          {academyData.facility_photos.length === 0 && !editMode && (
            <p className="py-6 text-sm text-center text-gray-400">{copy.noImages}</p>
          )}
        </div>

      </div>
    </div>
  );
}
