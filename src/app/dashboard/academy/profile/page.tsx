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
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { db } from '@/lib/firebase/config';

interface Branch {
  name: string;
  address: string;
  contact: string;
}

interface AcademyData {
  academy_name: string;
  description: string;
  logo: string;
  coverImage: string;
  founding_year: string;
  academy_type: string;
  is_federation_approved: boolean;
  license_number: string;
  registration_date: string;

  country: string;
  city: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  social_media: {
    facebook: string;
    instagram: string;
    twitter: string;
    linkedin: string;
    tiktok: string;
  };

  age_groups: string[];
  sports_facilities: string[];
  number_of_coaches: number | string;
  training_programs: string;
  academy_goals: string;
  achievements: string;

  director: { name: string; photo: string; bio: string; contact: string };
  technical_director: { name: string; photo: string; license: string; experience: string };

  branches: Branch[];
  success_stories: string[];
  partnerships: string[];
  facility_photos: string[];

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
  number_of_coaches: '',
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

const AGE_GROUPS = ['U-6', 'U-8', 'U-10', 'U-12', 'U-14', 'U-16', 'U-18', 'أكابر'];
const FACILITIES = ['ملعب طبيعي', 'ملعب صناعي', 'صالة مغلقة', 'حمام سباحة', 'صالة لياقة', 'غرف تغيير', 'كافتيريا', 'قاعة اجتماعات'];

const REQUIRED_FIELDS: { key: keyof AcademyData; label: string }[] = [
  { key: 'academy_name',  label: 'اسم الأكاديمية' },
  { key: 'academy_type',  label: 'نوع الأكاديمية' },
  { key: 'country',       label: 'الدولة' },
  { key: 'city',          label: 'المدينة' },
  { key: 'phone',         label: 'رقم الهاتف' },
  { key: 'email',         label: 'البريد الإلكتروني' },
  { key: 'description',   label: 'نبذة عن الأكاديمية' },
  { key: 'founding_year', label: 'سنة التأسيس' },
];

const getImageUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('/')) return path;
  const CDN = process.env.NEXT_PUBLIC_CDN_URL || '';
  return `${CDN}/academies/${path}`;
};

export default function AcademyProfilePage() {
  const { userData, user } = useAuth();
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
    if (!user?.uid) return;
    try {
      const ref = doc(db, 'academies', user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as Partial<AcademyData> & Record<string, unknown>;
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
        await setDoc(ref, { ...basicData, createdAt: new Date(), accountType: 'academy' });
        setAcademyData(basicData);
      }
    } catch (err) {
      console.error('Error fetching academy data:', err);
      toast.error('حدث خطأ أثناء تحميل البيانات');
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

  const missingFields = REQUIRED_FIELDS.filter(({ key }) => {
    const val = academyData[key];
    return !val || (typeof val === 'string' && !val.trim());
  });

  const BANNER_SNOOZE_KEY = `academy_profile_banner_snoozed_${user?.uid}`;
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
    REQUIRED_FIELDS.forEach(({ key, label }) => {
      const val = academyData[key];
      if (!val || (typeof val === 'string' && !val.trim())) {
        newErrors[key] = `${label} مطلوب`;
      }
    });
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error('يرجى استكمال البيانات الأساسية المطلوبة');
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
    if (!user?.uid) return;
    if (!file.type.startsWith('image/')) { toast.error('يرجى اختيار ملف صورة صالح'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('حجم الصورة يتجاوز 5 ميجابايت'); return; }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${type}_${Date.now()}.${ext}`;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'academies');
      formData.append('path', `${user.uid}/${fileName}`);
      formData.append('contentType', file.type);

      const res = await fetch('/api/storage/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('فشل الرفع');
      const { publicUrl } = await res.json();

      if (type === 'gallery') {
        setAcademyData(prev => ({ ...prev, facility_photos: [...prev.facility_photos, publicUrl] }));
      } else {
        setAcademyData(prev => ({ ...prev, [type === 'logo' ? 'logo' : 'coverImage']: publicUrl }));
      }
      toast.success('تم رفع الصورة بنجاح');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('حدث خطأ أثناء رفع الصورة');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.uid) return;
    if (!validateForm()) return;
    setUploading(true);
    try {
      const ref = doc(db, 'academies', user.uid);
      const snap = await getDoc(ref);
      const dataToSave = {
        ...academyData,
        // مزامنة name مع الـ sidebar (auth-provider يقرأ name/full_name)
        name: academyData.academy_name,
        updatedAt: new Date(),
      };
      if (snap.exists()) {
        await updateDoc(ref, dataToSave as Record<string, unknown>);
      } else {
        await setDoc(ref, { ...dataToSave, createdAt: new Date(), accountType: 'academy' });
      }
      // مزامنة الاسم في users collection إن وُجدت (لضمان تحديث sidebar فوراً)
      try {
        const usersRef = doc(db, 'users', user.uid);
        const usersSnap = await getDoc(usersRef);
        if (usersSnap.exists()) {
          await updateDoc(usersRef, {
            name: academyData.academy_name,
            academy_name: academyData.academy_name,
          });
        }
      } catch (_) { /* users doc may not exist — ignore */ }
      toast.success('تم حفظ بيانات الأكاديمية بنجاح');
      setEditMode(false);
    } catch (err) {
      console.error('Save error:', err);
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setUploading(false);
    }
  };

  const handleAddBranch = () => {
    if (!newBranch.name.trim()) { toast.error('يرجى إدخال اسم الفرع'); return; }
    setAcademyData(prev => ({ ...prev, branches: [...prev.branches, { ...newBranch }] }));
    setNewBranch({ name: '', address: '', contact: '' });
    setShowAddBranch(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full border-4 border-orange-200 animate-spin border-t-orange-600"></div>
          <p className="text-gray-600">جاري تحميل بيانات الأكاديمية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50" dir="rtl">

      {/* Sticky Header */}
      <div className="sticky top-0 z-50 border-b border-gray-200 shadow-sm backdrop-blur-md bg-white/95">
        <div className="px-4 py-4 mx-auto max-w-7xl">
          <div className="flex justify-between items-center">
            <button onClick={() => router.back()}
              className="flex gap-2 items-center px-4 py-2 text-gray-600 rounded-lg transition hover:text-gray-800 hover:bg-gray-100">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">العودة</span>
            </button>
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900">الملف الشخصي - الأكاديمية الرياضية</h1>
              {academyData.academy_name && <p className="text-sm text-gray-500">{academyData.academy_name}</p>}
            </div>
            <div className="flex gap-2">
              {editMode ? (
                <>
                  <button onClick={handleSave} disabled={uploading}
                    className="flex gap-2 items-center px-4 py-2 text-white bg-green-600 rounded-lg transition hover:bg-green-700 disabled:opacity-60">
                    <Save className="w-4 h-4" />
                    {uploading ? 'جاري الحفظ...' : 'حفظ'}
                  </button>
                  <button onClick={() => { fetchData(); setEditMode(false); }}
                    className="flex gap-2 items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg transition hover:bg-gray-200">
                    <X className="w-4 h-4" /> إلغاء
                  </button>
                </>
              ) : (
                <button onClick={() => setEditMode(true)}
                  className="flex gap-2 items-center px-5 py-2 text-white rounded-lg shadow transition hover:scale-105 bg-gradient-to-l from-orange-500 to-orange-700">
                  <Edit className="w-4 h-4" /> تعديل البيانات
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
              <p className="mb-1 text-sm font-bold text-amber-800">الملف الشخصي غير مكتمل</p>
              <p className="mb-2 text-xs text-amber-700">
                أكمل بياناتك الأساسية لتحسين ظهور أكاديميتك وجذب اللاعبين. الحقول الناقصة:
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
                  استكمال البيانات الآن
                </button>
                <span className="text-xs text-amber-500">سيتم تذكيرك مجدداً بعد {SNOOZE_DAYS} أيام عند الإغلاق</span>
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.setItem(BANNER_SNOOZE_KEY, String(Date.now()));
                setShowCompletionBanner(false);
              }}
              title={`تذكيري بعد ${SNOOZE_DAYS} أيام`}
              className="text-amber-400 hover:text-amber-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Cover Image */}
        <div className="overflow-hidden relative mb-8 h-52 rounded-2xl shadow-lg">
          <img src={academyData.coverImage || '/images/hero-1.jpg'} alt="صورة الغلاف"
            className="object-cover w-full h-full" />
          {editMode && (
            <label className="flex absolute inset-0 justify-center items-center transition cursor-pointer bg-black/50 hover:bg-black/60">
              <input type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'cover')} />
              <div className="flex flex-col items-center gap-2 text-white">
                <Camera className="w-8 h-8" />
                <span className="text-sm font-medium">تغيير صورة الغلاف</span>
              </div>
            </label>
          )}
        </div>

        {/* Profile Card */}
        <div className="flex flex-col gap-6 items-center p-8 mb-8 bg-white rounded-2xl shadow-lg md:flex-row">
          <div className="relative flex-shrink-0">
            <img src={academyData.logo || '/images/club-avatar.png'} alt="شعار الأكاديمية"
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
                  placeholder="اسم الأكاديمية *"
                  className={`w-full text-2xl font-bold text-right text-gray-900 bg-transparent border-b-2 focus:outline-none ${errors.academy_name ? 'border-red-400' : 'border-orange-300 focus:border-orange-600'}`} />
                {errors.academy_name && <p className="mt-1 text-xs text-red-500">{errors.academy_name}</p>}
              </div>
            ) : (
              <h2 className="mb-1 text-2xl font-bold text-orange-700">{academyData.academy_name || 'أكاديمية رياضية'}</h2>
            )}
            {editMode ? (
              <div className="mb-3">
                <input type="text" value={academyData.academy_type}
                  onChange={e => { handleChange('academy_type', e.target.value); setErrors(p => ({ ...p, academy_type: '' })); }}
                  placeholder="نوع الأكاديمية (مثال: كرة قدم، متعددة الرياضات...) *"
                  className={`w-full text-right text-gray-600 bg-transparent border-b focus:outline-none ${errors.academy_type ? 'border-red-400' : 'border-gray-200 focus:border-orange-400'}`} />
                {errors.academy_type && <p className="mt-0.5 text-xs text-red-500">{errors.academy_type}</p>}
              </div>
            ) : (
              <p className="mb-3 text-gray-600">{academyData.academy_type || 'أكاديمية رياضية'}</p>
            )}
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <span className="flex gap-1 items-center">
                <MapPin size={15} />
                {editMode ? (
                  <>
                    <input type="text" value={academyData.city}
                      onChange={e => { handleChange('city', e.target.value); setErrors(p => ({ ...p, city: '' })); }}
                      placeholder="المدينة *"
                      className={`w-20 bg-transparent border-b focus:outline-none ${errors.city ? 'border-red-400' : 'border-gray-200'}`} />
                    <span>,</span>
                    <input type="text" value={academyData.country}
                      onChange={e => { handleChange('country', e.target.value); setErrors(p => ({ ...p, country: '' })); }}
                      placeholder="الدولة *"
                      className={`w-20 bg-transparent border-b focus:outline-none ${errors.country ? 'border-red-400' : 'border-gray-200'}`} />
                  </>
                ) : (`${academyData.city || '—'}${academyData.country ? `, ${academyData.country}` : ''}`)}
              </span>
              <span className="flex gap-1 items-center">
                <Calendar size={15} />
                {editMode ? (
                  <input type="text" value={academyData.founding_year}
                    onChange={e => { handleChange('founding_year', e.target.value); setErrors(p => ({ ...p, founding_year: '' })); }}
                    placeholder="سنة التأسيس *"
                    className={`w-20 bg-transparent border-b focus:outline-none ${errors.founding_year ? 'border-red-400' : 'border-gray-200'}`} />
                ) : (academyData.founding_year ? `تأسست ${academyData.founding_year}` : '—')}
              </span>
            </div>
            <div className="flex gap-2 mt-4">
              <span className="self-center text-sm text-gray-500">اعتماد الاتحاد:</span>
              {[{ label: 'معتمدة', val: true }, { label: 'غير معتمدة', val: false }].map(({ label, val }) => (
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
            { icon: <Users size={26} />, label: 'اللاعبون', field: 'students', color: 'from-orange-400 to-orange-600' },
            { icon: <BookOpen size={26} />, label: 'البرامج', field: 'programs', color: 'from-blue-400 to-blue-600' },
            { icon: <GraduationCap size={26} />, label: 'المدربون', field: 'coaches', color: 'from-green-400 to-green-600' },
            { icon: <Trophy size={26} />, label: 'الخريجون', field: 'graduates', color: 'from-purple-400 to-purple-600' },
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
              <FileText size={20} /> نبذة عن الأكاديمية
            </h3>
            {editMode ? (
              <>
                <textarea value={academyData.description}
                  onChange={e => { handleChange('description', e.target.value); setErrors(p => ({ ...p, description: '' })); }}
                  rows={5} placeholder="اكتب نبذة عن الأكاديمية وأهدافها... *"
                  className={`p-3 w-full text-right text-sm rounded-lg border resize-none focus:outline-none focus:ring-2 ${errors.description ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-orange-300'}`} />
                {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
              </>
            ) : (
              <p className="text-sm leading-relaxed text-right text-gray-600">{academyData.description || 'لا توجد نبذة بعد.'}</p>
            )}
          </div>
          <div className="p-6 bg-white rounded-xl shadow">
            <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-orange-700">
              <Phone size={20} /> بيانات التواصل
            </h3>
            <div className="space-y-3">
              {[
                { icon: <Phone size={15} />, label: 'الهاتف', field: 'phone', type: 'tel', required: true },
                { icon: <Phone size={15} />, label: 'واتساب', field: 'whatsapp', type: 'tel', required: false },
                { icon: <Mail size={15} />, label: 'البريد', field: 'email', type: 'email', required: true },
                { icon: <MapPin size={15} />, label: 'العنوان', field: 'address', type: 'text', required: false },
                { icon: <Globe size={15} />, label: 'الموقع', field: 'website', type: 'url', required: false },
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
            <Shield size={20} /> بيانات الترخيص والتسجيل
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { label: 'رقم الترخيص', field: 'license_number', type: 'text' },
              { label: 'تاريخ التسجيل', field: 'registration_date', type: 'date' },
              { label: 'سنة التأسيس', field: 'founding_year', type: 'text' },
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
              <Target size={20} /> الفئات العمرية
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
                  {group}
                </button>
              ))}
            </div>
            {academyData.age_groups.length === 0 && !editMode && (
              <p className="mt-2 text-xs text-gray-400">لم يتم التحديد</p>
            )}
          </div>

          <div className="p-6 bg-white rounded-xl shadow">
            <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-orange-700">
              <Building2 size={20} /> المرافق الرياضية
            </h3>
            <div className="flex flex-wrap gap-2">
              {FACILITIES.map(fac => (
                <button key={fac} disabled={!editMode}
                  onClick={() => editMode && toggleArrayItem('sports_facilities', fac)}
                  className={`px-3 py-1.5 rounded-full text-sm border-2 transition disabled:cursor-default ${
                    academyData.sports_facilities.includes(fac)
                      ? 'border-orange-600 bg-orange-50 text-orange-700 font-medium'
                      : 'border-gray-200 text-gray-400'
                  }`}>
                  {fac}
                </button>
              ))}
            </div>
            {academyData.sports_facilities.length === 0 && !editMode && (
              <p className="mt-2 text-xs text-gray-400">لم يتم التحديد</p>
            )}
          </div>
        </div>

        {/* Training Programs + Goals */}
        <div className="grid grid-cols-1 gap-8 mb-8 md:grid-cols-2">
          <div className="p-6 bg-white rounded-xl shadow">
            <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-orange-700">
              <BookOpen size={20} /> البرامج التدريبية
            </h3>
            {editMode ? (
              <textarea value={academyData.training_programs} onChange={e => handleChange('training_programs', e.target.value)}
                rows={5} placeholder="صف البرامج التدريبية المتاحة في الأكاديمية..."
                className="p-3 w-full text-right text-sm rounded-lg border border-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300" />
            ) : (
              <p className="text-sm leading-relaxed text-right text-gray-600">{academyData.training_programs || '—'}</p>
            )}
          </div>
          <div className="p-6 bg-white rounded-xl shadow">
            <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-orange-700">
              <Star size={20} /> أهداف الأكاديمية
            </h3>
            {editMode ? (
              <textarea value={academyData.academy_goals} onChange={e => handleChange('academy_goals', e.target.value)}
                rows={5} placeholder="ما هي أهداف ورؤية الأكاديمية؟"
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
              <UserCircle2 size={20} /> المدير الفني
            </h3>
            <div className="flex gap-4 items-start">
              <div className="relative shrink-0">
                <img src={academyData.technical_director.photo || '/images/club-avatar.png'}
                  alt="المدير الفني" className="object-cover w-16 h-16 rounded-full border-2 border-orange-200" />
                {editMode && (
                  <label className="flex absolute inset-0 justify-center items-center rounded-full cursor-pointer bg-black/40 hover:bg-black/60">
                    <input type="file" accept="image/*" className="hidden" onChange={async e => {
                      if (!e.target.files?.[0] || !user?.uid) return;
                      const file = e.target.files[0];
                      setUploading(true);
                      const formData = new FormData();
                      formData.append('file', file);
                      formData.append('bucket', 'academies');
                      formData.append('path', `${user.uid}/tech_director_${Date.now()}.${file.name.split('.').pop()}`);
                      formData.append('contentType', file.type);
                      const res = await fetch('/api/storage/upload', { method: 'POST', body: formData });
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
                      placeholder="الاسم" className="w-full px-2 py-1 text-sm rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300" />
                    <input type="text" value={academyData.technical_director.license}
                      onChange={e => handleChange('license', e.target.value, 'technical_director')}
                      placeholder="الرخصة (UEFA A, AFC...)" className="w-full px-2 py-1 text-sm rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300" />
                    <input type="text" value={academyData.technical_director.experience}
                      onChange={e => handleChange('experience', e.target.value, 'technical_director')}
                      placeholder="سنوات الخبرة" className="w-full px-2 py-1 text-sm rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300" />
                  </>
                ) : (
                  <>
                    <p className="font-bold text-gray-900">{academyData.technical_director.name || '—'}</p>
                    <p className="text-sm text-gray-500">الرخصة: {academyData.technical_director.license || '—'}</p>
                    <p className="text-sm text-gray-500">الخبرة: {academyData.technical_director.experience || '—'}</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* General Director */}
          <div className="p-6 bg-white rounded-xl shadow">
            <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-orange-700">
              <UserCircle2 size={20} /> المدير العام
            </h3>
            <div className="flex gap-4 items-start">
              <div className="relative shrink-0">
                <img src={academyData.director.photo || '/images/club-avatar.png'}
                  alt="المدير العام" className="object-cover w-16 h-16 rounded-full border-2 border-orange-200" />
                {editMode && (
                  <label className="flex absolute inset-0 justify-center items-center rounded-full cursor-pointer bg-black/40 hover:bg-black/60">
                    <input type="file" accept="image/*" className="hidden" onChange={async e => {
                      if (!e.target.files?.[0] || !user?.uid) return;
                      const file = e.target.files[0];
                      setUploading(true);
                      const formData = new FormData();
                      formData.append('file', file);
                      formData.append('bucket', 'academies');
                      formData.append('path', `${user.uid}/director_${Date.now()}.${file.name.split('.').pop()}`);
                      formData.append('contentType', file.type);
                      const res = await fetch('/api/storage/upload', { method: 'POST', body: formData });
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
                      placeholder="الاسم" className="w-full px-2 py-1 text-sm rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300" />
                    <input type="text" value={academyData.director.bio}
                      onChange={e => handleChange('bio', e.target.value, 'director')}
                      placeholder="المؤهل / النبذة" className="w-full px-2 py-1 text-sm rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300" />
                    <input type="text" value={academyData.director.contact}
                      onChange={e => handleChange('contact', e.target.value, 'director')}
                      placeholder="بيانات التواصل" className="w-full px-2 py-1 text-sm rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300" />
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
            <Award size={20} /> الإنجازات والجوائز
          </h3>
          {editMode ? (
            <textarea value={academyData.achievements} onChange={e => handleChange('achievements', e.target.value)}
              rows={4} placeholder="أبرز إنجازات وجوائز الأكاديمية..."
              className="p-3 w-full text-right text-sm rounded-lg border border-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300" />
          ) : (
            <p className="text-sm leading-relaxed text-right text-gray-600">{academyData.achievements || 'لا توجد إنجازات مسجّلة بعد.'}</p>
          )}
        </div>

        {/* Success Stories + Partnerships */}
        <div className="grid grid-cols-1 gap-8 mb-8 md:grid-cols-2">
          {/* Success Stories */}
          <div className="p-6 bg-white rounded-xl shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="flex gap-2 items-center text-lg font-bold text-orange-700">
                <Star size={20} /> قصص النجاح
              </h3>
              {editMode && (
                <button onClick={() => setShowAddStory(true)}
                  className="flex gap-1 items-center text-xs text-orange-600 hover:text-orange-800">
                  <Plus size={13} /> إضافة
                </button>
              )}
            </div>
            {showAddStory && editMode && (
              <div className="flex gap-2 mb-3">
                <input type="text" value={newStory} onChange={e => setNewStory(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && newStory.trim() && (setAcademyData(p => ({ ...p, success_stories: [...p.success_stories, newStory.trim()] })), setNewStory(''), setShowAddStory(false))}
                  placeholder="اكتب قصة النجاح"
                  className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300" />
                <button onClick={() => { if (newStory.trim()) { setAcademyData(p => ({ ...p, success_stories: [...p.success_stories, newStory.trim()] })); setNewStory(''); setShowAddStory(false); } }}
                  className="px-3 py-1.5 text-sm text-white bg-orange-600 rounded-lg hover:bg-orange-700">إضافة</button>
                <button onClick={() => { setShowAddStory(false); setNewStory(''); }}
                  className="px-2 text-gray-500 hover:text-red-500"><X size={16} /></button>
              </div>
            )}
            {academyData.success_stories.length === 0 ? (
              <p className="text-sm text-center text-gray-400 py-4">لا توجد قصص نجاح بعد</p>
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
                <CheckSquare size={20} /> الشراكات
              </h3>
              {editMode && (
                <button onClick={() => setShowAddPartner(true)}
                  className="flex gap-1 items-center text-xs text-orange-600 hover:text-orange-800">
                  <Plus size={13} /> إضافة
                </button>
              )}
            </div>
            {showAddPartner && editMode && (
              <div className="flex gap-2 mb-3">
                <input type="text" value={newPartner} onChange={e => setNewPartner(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && newPartner.trim() && (setAcademyData(p => ({ ...p, partnerships: [...p.partnerships, newPartner.trim()] })), setNewPartner(''), setShowAddPartner(false))}
                  placeholder="اسم الشريك"
                  className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300" />
                <button onClick={() => { if (newPartner.trim()) { setAcademyData(p => ({ ...p, partnerships: [...p.partnerships, newPartner.trim()] })); setNewPartner(''); setShowAddPartner(false); } }}
                  className="px-3 py-1.5 text-sm text-white bg-orange-600 rounded-lg hover:bg-orange-700">إضافة</button>
                <button onClick={() => { setShowAddPartner(false); setNewPartner(''); }}
                  className="px-2 text-gray-500 hover:text-red-500"><X size={16} /></button>
              </div>
            )}
            {academyData.partnerships.length === 0 ? (
              <p className="text-sm text-center text-gray-400 py-4">لا توجد شراكات بعد</p>
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
              <Building2 size={20} /> الفروع
            </h3>
            {editMode && (
              <button onClick={() => setShowAddBranch(true)}
                className="flex gap-1 items-center px-3 py-1.5 text-sm text-white bg-orange-600 rounded-lg hover:bg-orange-700">
                <Plus size={16} /> إضافة فرع
              </button>
            )}
          </div>
          {showAddBranch && editMode && (
            <div className="p-4 mb-4 rounded-xl border border-orange-100 bg-orange-50">
              <h4 className="mb-3 font-semibold text-orange-700">إضافة فرع جديد</h4>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {[
                  { label: 'اسم الفرع *', field: 'name', placeholder: 'فرع الرياض' },
                  { label: 'العنوان', field: 'address', placeholder: 'حي النزهة، شارع...' },
                  { label: 'التواصل', field: 'contact', placeholder: '+966...' },
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
                <button onClick={handleAddBranch} className="px-4 py-2 text-sm text-white bg-orange-600 rounded-lg hover:bg-orange-700">إضافة</button>
                <button onClick={() => { setShowAddBranch(false); setNewBranch({ name: '', address: '', contact: '' }); }}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">إلغاء</button>
              </div>
            </div>
          )}
          {academyData.branches.length === 0 ? (
            <p className="py-4 text-sm text-center text-gray-400">لا توجد فروع مسجّلة بعد</p>
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
            <Globe size={20} /> وسائل التواصل الاجتماعي
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
            <Camera size={20} /> معرض صور المنشآت
          </h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {academyData.facility_photos.map((img, idx) => (
              <div key={idx} className="overflow-hidden relative rounded-lg aspect-square group">
                <img src={img} alt={`صورة ${idx + 1}`} className="object-cover w-full h-full" />
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
                <span className="text-xs text-gray-400">إضافة صورة</span>
              </label>
            )}
          </div>
          {academyData.facility_photos.length === 0 && !editMode && (
            <p className="py-6 text-sm text-center text-gray-400">لا توجد صور في المعرض بعد</p>
          )}
        </div>

      </div>
    </div>
  );
}
