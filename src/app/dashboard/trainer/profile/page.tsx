'use client';

import { useAuth } from '@/lib/firebase/auth-provider';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Edit, Users, FileText, Trophy, Phone, Mail, Globe,
  Facebook, Twitter, Instagram, Calendar, Star, Briefcase, Plus,
  Trash2, Save, X, Camera, ArrowLeft, Target, Activity,
  Linkedin, Flag, Clock, Building2, Languages, Shield,
  GraduationCap, Video, CheckSquare, UserCheck, MapPin, Award
} from 'lucide-react';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { db } from '@/lib/firebase/config';
import dynamic from 'next/dynamic';

const TrainerResume = dynamic(() => import('@/components/trainer/TrainerResume'), { ssr: false });

interface CertificationRecord {
  name: string;
  issuer: string;
  year: string;
}

interface TrainerData {
  full_name: string;
  profile_photo: string;
  coverImage: string;
  date_of_birth: string;
  nationality: string;
  current_location: string;
  description: string;

  is_certified: boolean;
  license_number: string;
  license_expiry: string;
  years_of_experience: number | string;
  coaching_level: string;
  specialization: string;
  spoken_languages: string[];

  training_philosophy: string;
  age_groups: string[];
  service_type: string[];
  availability: string;

  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  social_media: {
    linkedin: string;
    twitter: string;
    instagram: string;
    facebook: string;
    tiktok: string;
  };

  previous_clubs: string[];
  notable_players: string[];
  achievements: string;
  references: string;

  certifications: CertificationRecord[];
  video_links: string[];
  gallery: string[];

  stats: {
    players_trained: number;
    training_sessions: number;
    success_rate: number;
    years_experience: number;
  };
}

const initialTrainerData: TrainerData = {
  full_name: '',
  profile_photo: '/images/user-avatar.svg',
  coverImage: '/images/hero-1.jpg',
  date_of_birth: '',
  nationality: '',
  current_location: '',
  description: '',

  is_certified: false,
  license_number: '',
  license_expiry: '',
  years_of_experience: '',
  coaching_level: '',
  specialization: '',
  spoken_languages: [],

  training_philosophy: '',
  age_groups: [],
  service_type: [],
  availability: '',

  phone: '',
  whatsapp: '',
  email: '',
  website: '',
  social_media: {
    linkedin: '',
    twitter: '',
    instagram: '',
    facebook: '',
    tiktok: '',
  },

  previous_clubs: [],
  notable_players: [],
  achievements: '',
  references: '',

  certifications: [],
  video_links: [],
  gallery: [],

  stats: {
    players_trained: 0,
    training_sessions: 0,
    success_rate: 0,
    years_experience: 0,
  },
};

const AGE_GROUPS = ['ناشئون', 'شباب', 'أكابر', 'سيدات', 'جميع الفئات'];
const SERVICE_TYPES = ['تدريب فردي', 'تدريب جماعي', 'أندية', 'منتخبات وطنية', 'أكاديميات'];
const AVAILABILITY_OPTIONS = ['دوام كامل', 'دوام جزئي', 'متاح للانتقال', 'عن بُعد'];

const REQUIRED_FIELDS_TRAINER: { key: keyof TrainerData; label: string }[] = [
  { key: 'full_name',           label: 'الاسم الكامل' },
  { key: 'nationality',         label: 'الجنسية' },
  { key: 'phone',               label: 'رقم الهاتف' },
  { key: 'email',               label: 'البريد الإلكتروني' },
  { key: 'specialization',      label: 'التخصص' },
  { key: 'years_of_experience', label: 'سنوات الخبرة' },
  { key: 'description',         label: 'نبذة شخصية' },
];

const getImageUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('/')) return path;
  const CDN = process.env.NEXT_PUBLIC_CDN_URL || '';
  return `${CDN}/trainers/${path}`;
};

export default function TrainerProfilePage() {
  const { userData, user } = useAuth();
  const router = useRouter();

  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [trainerData, setTrainerData] = useState<TrainerData>(initialTrainerData);
  const [showResume, setShowResume] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof TrainerData, string>>>({});
  const [showCompletionBanner, setShowCompletionBanner] = useState(false);

  // States for adding items
  const [newClub, setNewClub] = useState('');
  const [showAddClub, setShowAddClub] = useState(false);
  const [newPlayer, setNewPlayer] = useState('');
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newVideoLink, setNewVideoLink] = useState('');
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [showAddCert, setShowAddCert] = useState(false);
  const [newCert, setNewCert] = useState<CertificationRecord>({ name: '', issuer: '', year: '' });

  const fetchData = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const ref = doc(db, 'trainers', user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as Partial<TrainerData>;
        setTrainerData({
          ...initialTrainerData,
          ...data,
          profile_photo: getImageUrl(data.profile_photo || initialTrainerData.profile_photo),
          coverImage: getImageUrl(data.coverImage || initialTrainerData.coverImage),
          stats: { ...initialTrainerData.stats, ...(data.stats || {}) },
          social_media: { ...initialTrainerData.social_media, ...(data.social_media || {}) },
          previous_clubs: data.previous_clubs || [],
          notable_players: data.notable_players || [],
          gallery: data.gallery || [],
          spoken_languages: data.spoken_languages || [],
          age_groups: data.age_groups || [],
          service_type: data.service_type || [],
          certifications: data.certifications || [],
          video_links: data.video_links || [],
          full_name: data.full_name || userData?.full_name || userData?.displayName || userData?.name || '',
          email: data.email || userData?.email || '',
          phone: data.phone || userData?.phone || userData?.phoneNumber || '',
        });
      } else {
        const basicData: TrainerData = {
          ...initialTrainerData,
          full_name: userData?.full_name || userData?.displayName || userData?.name || '',
          email: userData?.email || '',
          phone: userData?.phone || userData?.phoneNumber || '',
        };
        await setDoc(ref, { ...basicData, createdAt: new Date(), accountType: 'trainer' });
        setTrainerData(basicData);
      }
    } catch (err) {
      console.error('Error fetching trainer data:', err);
      toast.error('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [user, userData]);

  useEffect(() => {
    if (user && userData) fetchData();
  }, [user, userData, fetchData]);

  const BANNER_SNOOZE_KEY = `trainer_profile_banner_snoozed_${user?.uid}`;
  const SNOOZE_DAYS = 3;

  const missingFields = REQUIRED_FIELDS_TRAINER.filter(({ key }) => {
    const val = trainerData[key];
    return !val || (typeof val === 'string' && !val.trim());
  });

  useEffect(() => {
    if (loading || missingFields.length === 0) return;
    const snoozedAt = localStorage.getItem(BANNER_SNOOZE_KEY);
    if (snoozedAt) {
      const daysSince = (Date.now() - Number(snoozedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < SNOOZE_DAYS) return;
    }
    setShowCompletionBanner(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof TrainerData, string>> = {};
    REQUIRED_FIELDS_TRAINER.forEach(({ key, label }) => {
      const val = trainerData[key];
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
    setTrainerData(prev => {
      if (parent) {
        return {
          ...prev,
          [parent]: {
            ...(prev[parent as keyof TrainerData] as Record<string, unknown>),
            [field]: value,
          },
        };
      }
      return { ...prev, [field]: value };
    });
  };

  const toggleArrayItem = (field: 'age_groups' | 'service_type', value: string) => {
    setTrainerData(prev => {
      const arr = prev[field];
      return {
        ...prev,
        [field]: arr.includes(value) ? arr.filter(i => i !== value) : [...arr, value],
      };
    });
  };

  const handleImageUpload = async (file: File, type: 'photo' | 'cover' | 'gallery') => {
    if (!user?.uid) return;
    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة صالح');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة يتجاوز 5 ميجابايت');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${type}_${Date.now()}.${ext}`;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'trainers');
      formData.append('path', `${user.uid}/${fileName}`);
      formData.append('contentType', file.type);

      const res = await fetch('/api/storage/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('فشل الرفع');
      const { publicUrl } = await res.json();

      if (type === 'gallery') {
        setTrainerData(prev => ({ ...prev, gallery: [...prev.gallery, publicUrl] }));
      } else {
        setTrainerData(prev => ({
          ...prev,
          [type === 'photo' ? 'profile_photo' : 'coverImage']: publicUrl,
        }));
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
      const ref = doc(db, 'trainers', user.uid);
      const snap = await getDoc(ref);
      const dataToSave = { ...trainerData, name: trainerData.full_name, updatedAt: new Date() };
      if (snap.exists()) {
        await updateDoc(ref, dataToSave);
      } else {
        await setDoc(ref, { ...dataToSave, createdAt: new Date(), accountType: 'trainer' });
      }
      try {
        const usersRef = doc(db, 'users', user.uid);
        const usersSnap = await getDoc(usersRef);
        if (usersSnap.exists()) {
          await updateDoc(usersRef, { name: trainerData.full_name, full_name: trainerData.full_name });
        }
      } catch (_) { /* ignore */ }
      toast.success('تم حفظ الملف الشخصي بنجاح');
      setEditMode(false);
    } catch (err) {
      console.error('Save error:', err);
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setUploading(false);
    }
  };

  const handleAddCert = () => {
    if (!newCert.name.trim()) { toast.error('يرجى إدخال اسم الشهادة'); return; }
    setTrainerData(prev => ({ ...prev, certifications: [...prev.certifications, { ...newCert }] }));
    setNewCert({ name: '', issuer: '', year: '' });
    setShowAddCert(false);
  };

  const handleRemoveCert = (i: number) =>
    setTrainerData(prev => ({ ...prev, certifications: prev.certifications.filter((_, idx) => idx !== i) }));

  const handleAddClub = () => {
    if (!newClub.trim()) return;
    setTrainerData(prev => ({ ...prev, previous_clubs: [...prev.previous_clubs, newClub.trim()] }));
    setNewClub(''); setShowAddClub(false);
  };

  const handleAddPlayer = () => {
    if (!newPlayer.trim()) return;
    setTrainerData(prev => ({ ...prev, notable_players: [...prev.notable_players, newPlayer.trim()] }));
    setNewPlayer(''); setShowAddPlayer(false);
  };

  const handleAddVideo = () => {
    if (!newVideoLink.trim()) return;
    setTrainerData(prev => ({ ...prev, video_links: [...prev.video_links, newVideoLink.trim()] }));
    setNewVideoLink(''); setShowAddVideo(false);
  };

  const handleRemoveGallery = (i: number) =>
    setTrainerData(prev => ({ ...prev, gallery: prev.gallery.filter((_, idx) => idx !== i) }));

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full border-4 border-cyan-200 animate-spin border-t-cyan-600"></div>
          <p className="text-gray-600">جاري تحميل الملف الشخصي...</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-cyan-50" dir="rtl">

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
              <h1 className="text-xl font-bold text-gray-900">الملف الشخصي - المدرب الرياضي</h1>
              {trainerData.full_name && <p className="text-sm text-gray-500">{trainerData.full_name}</p>}
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
                <>
                  <button onClick={() => setShowResume(true)}
                    className="flex gap-2 items-center px-4 py-2 text-cyan-700 bg-cyan-50 border border-cyan-200 rounded-lg transition hover:bg-cyan-100">
                    <FileText className="w-4 h-4" /> تصدير PDF
                  </button>
                  <button onClick={() => setEditMode(true)}
                    className="flex gap-2 items-center px-5 py-2 text-white rounded-lg shadow transition hover:scale-105 bg-gradient-to-l from-cyan-500 to-cyan-700">
                    <Edit className="w-4 h-4" /> تعديل البيانات
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-8 mx-auto max-w-4xl">

        {/* Profile Completion Banner */}
        {showCompletionBanner && !editMode && (
          <div className="flex gap-4 items-start p-4 mb-6 bg-amber-50 rounded-xl border-2 border-amber-300 shadow-sm">
            <div className="flex-shrink-0 mt-0.5 p-2 bg-amber-100 rounded-full">
              <Award className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="mb-1 text-sm font-bold text-amber-800">الملف الشخصي غير مكتمل</p>
              <p className="mb-2 text-xs text-amber-700">أكمل بياناتك الأساسية لتحسين ظهورك وجذب الفرص. الحقول الناقصة:</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {missingFields.map(({ label }) => (
                  <span key={label} className="px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-100 rounded-full border border-amber-300">
                    {label}
                  </span>
                ))}
              </div>
              <div className="flex gap-3 items-center">
                <button onClick={() => setEditMode(true)} className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-500 rounded-lg transition hover:bg-amber-600">
                  استكمال البيانات الآن
                </button>
                <span className="text-xs text-amber-500">سيتم تذكيرك مجدداً بعد {SNOOZE_DAYS} أيام عند الإغلاق</span>
              </div>
            </div>
            <button
              onClick={() => { localStorage.setItem(BANNER_SNOOZE_KEY, String(Date.now())); setShowCompletionBanner(false); }}
              className="text-amber-400 hover:text-amber-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Cover Image */}
        <div className="overflow-hidden relative mb-8 h-52 rounded-2xl shadow-lg">
          <img src={trainerData.coverImage || '/images/hero-1.jpg'} alt="صورة الغلاف"
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
            <img src={trainerData.profile_photo || '/images/user-avatar.svg'} alt="الصورة الشخصية"
              className="object-cover w-32 h-32 rounded-full border-4 border-cyan-500 shadow-lg" />
            {editMode && (
              <label className="flex absolute inset-0 justify-center items-center rounded-full transition cursor-pointer bg-black/50 hover:bg-black/60">
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'photo')} />
                <Edit className="text-white" size={22} />
              </label>
            )}
          </div>
          <div className="flex-1 text-right">
            {editMode ? (
              <input type="text" value={trainerData.full_name}
                onChange={e => { handleChange('full_name', e.target.value); setErrors(p => ({ ...p, full_name: '' })); }}
                placeholder="الاسم الكامل"
                className={`mb-2 w-full text-2xl font-bold text-right text-gray-900 bg-transparent border-b-2 focus:outline-none focus:border-cyan-600 ${errors.full_name ? 'border-red-400' : 'border-cyan-300'}`} />
            ) : (
              <h2 className="mb-1 text-2xl font-bold text-cyan-700">{trainerData.full_name || 'المدرب الرياضي'}</h2>
            )}
            {editMode ? (
              <input type="text" value={trainerData.specialization}
                onChange={e => { handleChange('specialization', e.target.value); setErrors(p => ({ ...p, specialization: '' })); }}
                placeholder="التخصص (مثال: مدرب كرة قدم، مدرب حراس...)"
                className={`mb-3 w-full text-right text-gray-600 bg-transparent border-b focus:outline-none focus:border-cyan-400 ${errors.specialization ? 'border-red-400' : 'border-gray-200'}`} />
            ) : (
              <p className="mb-3 text-gray-600">{trainerData.specialization || 'مدرب رياضي'}</p>
            )}
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <span className="flex gap-1 items-center">
                <Flag size={15} />
                {editMode ? (
                  <input type="text" value={trainerData.nationality} onChange={e => handleChange('nationality', e.target.value)}
                    placeholder="الجنسية" className="w-24 bg-transparent border-b border-gray-200 focus:outline-none" />
                ) : (trainerData.nationality || '—')}
              </span>
              <span className="flex gap-1 items-center">
                <MapPin size={15} />
                {editMode ? (
                  <input type="text" value={trainerData.current_location} onChange={e => handleChange('current_location', e.target.value)}
                    placeholder="الموقع" className="w-28 bg-transparent border-b border-gray-200 focus:outline-none" />
                ) : (trainerData.current_location || '—')}
              </span>
              <span className="flex gap-1 items-center">
                <Clock size={15} />
                {editMode ? (
                  <input type="number" value={trainerData.years_of_experience}
                    onChange={e => handleChange('years_of_experience', e.target.value)}
                    placeholder="0" className="w-12 bg-transparent border-b border-gray-200 focus:outline-none" />
                ) : trainerData.years_of_experience} سنوات خبرة
              </span>
            </div>
            {/* Certification Badge */}
            <div className="flex gap-2 mt-4">
              <span className="self-center text-sm text-gray-500">الاعتماد:</span>
              {['معتمد', 'غير معتمد'].map((label, i) => (
                <button key={label} disabled={!editMode}
                  onClick={() => editMode && handleChange('is_certified', i === 0)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border-2 transition disabled:cursor-default ${
                    (i === 0 ? trainerData.is_certified : !trainerData.is_certified)
                      ? 'border-cyan-600 bg-cyan-50 text-cyan-700'
                      : 'border-gray-200 text-gray-400'
                  }`}>
                  {i === 0 && <Shield className="inline w-3.5 h-3.5 ml-1" />}
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8 md:grid-cols-4">
          {[
            { icon: <Users size={26} />, label: 'لاعبون مدربون', field: 'players_trained', color: 'from-cyan-400 to-cyan-600' },
            { icon: <Activity size={26} />, label: 'جلسات تدريبية', field: 'training_sessions', color: 'from-green-400 to-green-600' },
            { icon: <Target size={26} />, label: 'معدل النجاح %', field: 'success_rate', color: 'from-yellow-400 to-yellow-600' },
            { icon: <Trophy size={26} />, label: 'سنوات الخبرة', field: 'years_experience', color: 'from-blue-400 to-blue-600' },
          ].map(({ icon, label, field, color }) => (
            <div key={field} className={`flex flex-col items-center p-5 text-white bg-gradient-to-br ${color} rounded-xl shadow`}>
              {icon}
              {editMode ? (
                <input type="number"
                  value={trainerData.stats[field as keyof typeof trainerData.stats]}
                  onChange={e => handleChange(field, Number(e.target.value), 'stats')}
                  className="mt-2 w-16 text-2xl font-bold text-center text-white bg-white/20 rounded border-0 focus:outline-none focus:bg-white/30"
                  min={0} />
              ) : (
                <div className="mt-2 text-2xl font-bold">{trainerData.stats[field as keyof typeof trainerData.stats]}</div>
              )}
              <div className="mt-1 text-sm opacity-90">{label}</div>
            </div>
          ))}
        </div>

        {/* Description + Contact */}
        <div className="grid grid-cols-1 gap-8 mb-8 md:grid-cols-2">
          <div className="p-6 bg-white rounded-xl shadow">
            <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-cyan-700">
              <FileText size={20} /> نبذة شخصية
            </h3>
            {editMode ? (
              <textarea value={trainerData.description}
                onChange={e => { handleChange('description', e.target.value); setErrors(p => ({ ...p, description: '' })); }}
                rows={5} placeholder="اكتب نبذة عن خبراتك ومسيرتك التدريبية..."
                className={`p-3 w-full text-right text-sm rounded-lg border resize-none focus:outline-none focus:ring-2 focus:ring-cyan-300 ${errors.description ? 'border-red-400' : 'border-gray-200'}`} />
            ) : (
              <p className="text-sm leading-relaxed text-right text-gray-600">
                {trainerData.description || 'لا توجد نبذة شخصية بعد.'}
              </p>
            )}
          </div>
          <div className="p-6 bg-white rounded-xl shadow">
            <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-cyan-700">
              <Phone size={20} /> بيانات التواصل
            </h3>
            <div className="space-y-3">
              {[
                { icon: <Phone size={15} />, label: 'الهاتف', field: 'phone', type: 'tel' },
                { icon: <Phone size={15} />, label: 'واتساب', field: 'whatsapp', type: 'tel' },
                { icon: <Mail size={15} />, label: 'البريد', field: 'email', type: 'email' },
                { icon: <Globe size={15} />, label: 'الموقع', field: 'website', type: 'url' },
              ].map(({ icon, label, field, type }) => (
                <div key={field} className="flex gap-3 items-center">
                  <span className="text-cyan-500">{icon}</span>
                  <span className="w-20 text-sm text-gray-500">{label}:</span>
                  {editMode ? (
                    <input type={type} value={trainerData[field as keyof TrainerData] as string}
                      onChange={e => { handleChange(field, e.target.value); setErrors(p => ({ ...p, [field]: '' })); }}
                      className={`flex-1 px-2 py-1 text-sm rounded border focus:outline-none focus:ring-2 focus:ring-cyan-300 ${errors[field as keyof TrainerData] ? 'border-red-400' : 'border-gray-200'}`} />
                  ) : (
                    <span className="text-sm text-gray-700">{(trainerData[field as keyof TrainerData] as string) || '—'}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Professional Info + Previous Clubs */}
        <div className="grid grid-cols-1 gap-8 mb-8 md:grid-cols-2">
          <div className="p-6 bg-white rounded-xl shadow">
            <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-cyan-700">
              <Shield size={20} /> المعلومات المهنية
            </h3>
            <div className="space-y-3">
              <div className="flex gap-3 items-center">
                <span className="text-cyan-500"><Briefcase size={15} /></span>
                <span className="w-28 text-sm text-gray-500 shrink-0">مستوى التدريب:</span>
                {editMode ? (
                  <input type="text" value={trainerData.coaching_level}
                    onChange={e => handleChange('coaching_level', e.target.value)}
                    placeholder="A, B, C, UEFA, AFC..."
                    className="flex-1 px-2 py-1 text-sm rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-300" />
                ) : <span className="text-sm text-gray-700">{trainerData.coaching_level || '—'}</span>}
              </div>
              {trainerData.is_certified && (
                <>
                  <div className="flex gap-3 items-center">
                    <span className="text-cyan-500"><Shield size={15} /></span>
                    <span className="w-28 text-sm text-gray-500 shrink-0">رقم الرخصة:</span>
                    {editMode ? (
                      <input type="text" value={trainerData.license_number}
                        onChange={e => handleChange('license_number', e.target.value)}
                        className="flex-1 px-2 py-1 text-sm rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-300" />
                    ) : <span className="text-sm text-gray-700">{trainerData.license_number || '—'}</span>}
                  </div>
                  <div className="flex gap-3 items-center">
                    <span className="text-cyan-500"><Calendar size={15} /></span>
                    <span className="w-28 text-sm text-gray-500 shrink-0">انتهاء الرخصة:</span>
                    {editMode ? (
                      <input type="date" value={trainerData.license_expiry}
                        onChange={e => handleChange('license_expiry', e.target.value)}
                        className="flex-1 px-2 py-1 text-sm rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-300" />
                    ) : <span className="text-sm text-gray-700">{trainerData.license_expiry || '—'}</span>}
                  </div>
                </>
              )}
              <div className="flex gap-3 items-center">
                <span className="text-cyan-500"><Calendar size={15} /></span>
                <span className="w-28 text-sm text-gray-500 shrink-0">تاريخ الميلاد:</span>
                {editMode ? (
                  <input type="date" value={trainerData.date_of_birth}
                    onChange={e => handleChange('date_of_birth', e.target.value)}
                    className="flex-1 px-2 py-1 text-sm rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-300" />
                ) : <span className="text-sm text-gray-700">{trainerData.date_of_birth || '—'}</span>}
              </div>
              <div className="flex gap-3 items-start">
                <span className="mt-1 text-cyan-500"><Languages size={15} /></span>
                <span className="w-28 text-sm text-gray-500 shrink-0">اللغات:</span>
                {editMode ? (
                  <input type="text"
                    value={trainerData.spoken_languages.join(', ')}
                    onChange={e => handleChange('spoken_languages', e.target.value.split(',').map(l => l.trim()).filter(Boolean))}
                    placeholder="العربية، الإنجليزية (افصل بفاصلة)"
                    className="flex-1 px-2 py-1 text-sm rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-300" />
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {trainerData.spoken_languages.length > 0
                      ? trainerData.spoken_languages.map((lang, i) => (
                          <span key={i} className="px-2 py-0.5 text-xs text-cyan-700 bg-cyan-100 rounded-full">{lang}</span>
                        ))
                      : <span className="text-sm text-gray-700">—</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Previous Clubs */}
          <div className="p-6 bg-white rounded-xl shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="flex gap-2 items-center text-lg font-bold text-cyan-700">
                <Briefcase size={20} /> الأندية السابقة
              </h3>
              {editMode && (
                <button onClick={() => setShowAddClub(true)}
                  className="flex gap-1 items-center text-xs text-cyan-600 hover:text-cyan-800">
                  <Plus size={13} /> إضافة
                </button>
              )}
            </div>
            {showAddClub && editMode && (
              <div className="flex gap-2 mb-3">
                <input type="text" value={newClub} onChange={e => setNewClub(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddClub()} placeholder="اسم النادي"
                  className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-300" />
                <button onClick={handleAddClub} className="px-3 py-1.5 text-sm text-white bg-cyan-600 rounded-lg hover:bg-cyan-700">إضافة</button>
                <button onClick={() => { setShowAddClub(false); setNewClub(''); }} className="px-2 text-gray-500 hover:text-red-500"><X size={16} /></button>
              </div>
            )}
            {trainerData.previous_clubs.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                <Building2 className="mx-auto mb-2 w-10 h-10 opacity-30" />
                <p className="text-sm">لا توجد أندية مسجّلة بعد</p>
              </div>
            ) : (
              <div className="space-y-1">
                {trainerData.previous_clubs.map((club, i) => (
                  <div key={i} className="flex justify-between items-center px-3 py-2 rounded-lg bg-cyan-50">
                    <span className="text-sm text-gray-800">{club}</span>
                    {editMode && (
                      <button onClick={() => setTrainerData(prev => ({ ...prev, previous_clubs: prev.previous_clubs.filter((_, idx) => idx !== i) }))}
                        className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Training Philosophy */}
        <div className="p-6 mb-8 bg-white rounded-xl shadow">
          <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-cyan-700">
            <FileText size={20} /> الفلسفة التدريبية
          </h3>
          {editMode ? (
            <textarea value={trainerData.training_philosophy}
              onChange={e => handleChange('training_philosophy', e.target.value)}
              rows={4} placeholder="صف أسلوبك وفلسفتك في التدريب، منهجيتك مع اللاعبين..."
              className="p-3 w-full text-right text-sm rounded-lg border border-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-300" />
          ) : (
            <p className="text-sm leading-relaxed text-right text-gray-600">
              {trainerData.training_philosophy || 'لا توجد فلسفة تدريبية مسجّلة بعد.'}
            </p>
          )}
        </div>

        {/* Age Groups + Service Type + Availability */}
        <div className="grid grid-cols-1 gap-8 mb-8 md:grid-cols-3">
          {/* Age Groups */}
          <div className="p-6 bg-white rounded-xl shadow">
            <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-cyan-700">
              <Users size={20} /> الفئات العمرية
            </h3>
            <div className="flex flex-wrap gap-2">
              {AGE_GROUPS.map(group => (
                <button key={group}
                  disabled={!editMode}
                  onClick={() => editMode && toggleArrayItem('age_groups', group)}
                  className={`px-3 py-1.5 rounded-full text-sm border-2 transition disabled:cursor-default ${
                    trainerData.age_groups.includes(group)
                      ? 'border-cyan-600 bg-cyan-50 text-cyan-700 font-medium'
                      : 'border-gray-200 text-gray-400'
                  }`}>
                  {group}
                </button>
              ))}
            </div>
            {trainerData.age_groups.length === 0 && !editMode && (
              <p className="mt-2 text-xs text-gray-400">لم يتم التحديد</p>
            )}
          </div>

          {/* Service Type */}
          <div className="p-6 bg-white rounded-xl shadow">
            <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-cyan-700">
              <CheckSquare size={20} /> نوع الخدمة
            </h3>
            <div className="flex flex-wrap gap-2">
              {SERVICE_TYPES.map(type => (
                <button key={type}
                  disabled={!editMode}
                  onClick={() => editMode && toggleArrayItem('service_type', type)}
                  className={`px-3 py-1.5 rounded-full text-sm border-2 transition disabled:cursor-default ${
                    trainerData.service_type.includes(type)
                      ? 'border-cyan-600 bg-cyan-50 text-cyan-700 font-medium'
                      : 'border-gray-200 text-gray-400'
                  }`}>
                  {type}
                </button>
              ))}
            </div>
            {trainerData.service_type.length === 0 && !editMode && (
              <p className="mt-2 text-xs text-gray-400">لم يتم التحديد</p>
            )}
          </div>

          {/* Availability */}
          <div className="p-6 bg-white rounded-xl shadow">
            <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-cyan-700">
              <UserCheck size={20} /> مدى التوفر
            </h3>
            <div className="flex flex-wrap gap-2">
              {AVAILABILITY_OPTIONS.map(opt => (
                <button key={opt}
                  disabled={!editMode}
                  onClick={() => editMode && handleChange('availability', trainerData.availability === opt ? '' : opt)}
                  className={`px-3 py-1.5 rounded-full text-sm border-2 transition disabled:cursor-default ${
                    trainerData.availability === opt
                      ? 'border-cyan-600 bg-cyan-50 text-cyan-700 font-medium'
                      : 'border-gray-200 text-gray-400'
                  }`}>
                  {opt}
                </button>
              ))}
            </div>
            {!trainerData.availability && !editMode && (
              <p className="mt-2 text-xs text-gray-400">لم يتم التحديد</p>
            )}
          </div>
        </div>

        {/* Certifications */}
        <div className="p-6 mb-8 bg-white rounded-xl shadow">
          <div className="flex justify-between items-center mb-5">
            <h3 className="flex gap-2 items-center text-lg font-bold text-cyan-700">
              <GraduationCap size={20} /> الشهادات والدورات
            </h3>
            {editMode && (
              <button onClick={() => setShowAddCert(true)}
                className="flex gap-1 items-center px-3 py-1.5 text-sm text-white bg-cyan-600 rounded-lg hover:bg-cyan-700">
                <Plus size={16} /> إضافة شهادة
              </button>
            )}
          </div>

          {showAddCert && (
            <div className="p-4 mb-5 rounded-xl border border-cyan-100 bg-cyan-50">
              <h4 className="mb-3 font-semibold text-cyan-700">إضافة شهادة / دورة</h4>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {[
                  { label: 'اسم الشهادة / الدورة *', field: 'name', placeholder: 'UEFA A License' },
                  { label: 'الجهة المانحة', field: 'issuer', placeholder: 'UEFA / AFC / اتحاد محلي' },
                  { label: 'السنة', field: 'year', placeholder: '2022' },
                ].map(({ label, field, placeholder }) => (
                  <div key={field}>
                    <label className="block mb-1 text-xs text-gray-600">{label}</label>
                    <input type="text"
                      value={newCert[field as keyof CertificationRecord]}
                      onChange={e => setNewCert(p => ({ ...p, [field]: e.target.value }))}
                      placeholder={placeholder}
                      className="px-3 py-2 w-full text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-300" />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 justify-end mt-4">
                <button onClick={handleAddCert} className="px-4 py-2 text-sm text-white bg-cyan-600 rounded-lg hover:bg-cyan-700">إضافة</button>
                <button onClick={() => { setShowAddCert(false); setNewCert({ name: '', issuer: '', year: '' }); }}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">إلغاء</button>
              </div>
            </div>
          )}

          {trainerData.certifications.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              <GraduationCap className="mx-auto mb-2 w-10 h-10 opacity-30" />
              <p className="text-sm">لا توجد شهادات مسجّلة بعد</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trainerData.certifications.map((cert, i) => (
                <div key={i} className="flex justify-between items-center p-4 rounded-xl border border-gray-100 bg-gray-50 hover:border-cyan-200 hover:bg-cyan-50/30 transition">
                  <div className="flex gap-3 items-center">
                    <div className="flex justify-center items-center w-10 h-10 text-cyan-600 bg-cyan-100 rounded-full">
                      <GraduationCap size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{cert.name}</p>
                      <p className="text-sm text-gray-500">{cert.issuer || '—'}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-center">
                    {cert.year && (
                      <span className="px-2 py-1 text-sm font-medium text-cyan-700 bg-cyan-100 rounded-lg">{cert.year}</span>
                    )}
                    {editMode && (
                      <button onClick={() => handleRemoveCert(i)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notable Players */}
        <div className="p-6 mb-8 bg-white rounded-xl shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="flex gap-2 items-center text-lg font-bold text-cyan-700">
              <Star size={20} /> اللاعبون البارزون
            </h3>
            {editMode && (
              <button onClick={() => setShowAddPlayer(true)}
                className="flex gap-1 items-center text-xs text-cyan-600 hover:text-cyan-800">
                <Plus size={13} /> إضافة
              </button>
            )}
          </div>
          {showAddPlayer && editMode && (
            <div className="flex gap-2 mb-3">
              <input type="text" value={newPlayer} onChange={e => setNewPlayer(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddPlayer()} placeholder="اسم اللاعب"
                className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-300" />
              <button onClick={handleAddPlayer} className="px-3 py-1.5 text-sm text-white bg-cyan-600 rounded-lg hover:bg-cyan-700">إضافة</button>
              <button onClick={() => { setShowAddPlayer(false); setNewPlayer(''); }} className="px-2 text-gray-500 hover:text-red-500"><X size={16} /></button>
            </div>
          )}
          {trainerData.notable_players.length === 0 ? (
            <p className="py-4 text-sm text-center text-gray-400">لا يوجد لاعبون بارزون مسجّلون بعد</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {trainerData.notable_players.map((player, i) => (
                <div key={i} className="flex gap-2 items-center px-3 py-1.5 rounded-full border border-cyan-200 bg-cyan-50">
                  <span className="text-sm text-cyan-800">{player}</span>
                  {editMode && (
                    <button onClick={() => setTrainerData(prev => ({ ...prev, notable_players: prev.notable_players.filter((_, idx) => idx !== i) }))}
                      className="text-red-400 hover:text-red-600"><X size={13} /></button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Achievements + References */}
        <div className="grid grid-cols-1 gap-8 mb-8 md:grid-cols-2">
          <div className="p-6 bg-white rounded-xl shadow">
            <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-cyan-700">
              <Trophy size={20} /> الإنجازات والجوائز
            </h3>
            {editMode ? (
              <textarea value={trainerData.achievements} onChange={e => handleChange('achievements', e.target.value)}
                rows={5} placeholder="أبرز إنجازاتك وجوائزك في مسيرتك التدريبية..."
                className="p-3 w-full text-right text-sm rounded-lg border border-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-300" />
            ) : (
              <p className="text-sm leading-relaxed text-right text-gray-600">
                {trainerData.achievements || 'لا توجد إنجازات مسجّلة بعد.'}
              </p>
            )}
          </div>
          <div className="p-6 bg-white rounded-xl shadow">
            <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-cyan-700">
              <Users size={20} /> المراجع والتوصيات
            </h3>
            {editMode ? (
              <textarea value={trainerData.references} onChange={e => handleChange('references', e.target.value)}
                rows={5} placeholder="أسماء جهات يمكن الرجوع إليها للتوصية..."
                className="p-3 w-full text-right text-sm rounded-lg border border-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-300" />
            ) : (
              <p className="text-sm leading-relaxed text-right text-gray-600">
                {trainerData.references || 'لا توجد مراجع مسجّلة بعد.'}
              </p>
            )}
          </div>
        </div>

        {/* Video Links */}
        <div className="p-6 mb-8 bg-white rounded-xl shadow">
          <div className="flex justify-between items-center mb-5">
            <h3 className="flex gap-2 items-center text-lg font-bold text-cyan-700">
              <Video size={20} /> روابط الفيديو التدريبي
            </h3>
            {editMode && (
              <button onClick={() => setShowAddVideo(true)}
                className="flex gap-1 items-center px-3 py-1.5 text-sm text-white bg-cyan-600 rounded-lg hover:bg-cyan-700">
                <Plus size={16} /> إضافة رابط
              </button>
            )}
          </div>
          {showAddVideo && editMode && (
            <div className="flex gap-2 mb-4">
              <input type="url" value={newVideoLink} onChange={e => setNewVideoLink(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddVideo()}
                placeholder="https://youtube.com/watch?v=..."
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-300" />
              <button onClick={handleAddVideo} className="px-4 py-2 text-sm text-white bg-cyan-600 rounded-lg hover:bg-cyan-700">إضافة</button>
              <button onClick={() => { setShowAddVideo(false); setNewVideoLink(''); }}
                className="px-2 text-gray-500 hover:text-red-500"><X size={16} /></button>
            </div>
          )}
          {trainerData.video_links.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              <Video className="mx-auto mb-2 w-10 h-10 opacity-30" />
              <p className="text-sm">لا توجد روابط فيديو مضافة بعد</p>
            </div>
          ) : (
            <div className="space-y-2">
              {trainerData.video_links.map((link, i) => (
                <div key={i} className="flex justify-between items-center p-3 rounded-lg border border-gray-100 bg-gray-50">
                  <a href={link} target="_blank" rel="noopener noreferrer"
                    className="flex gap-2 items-center flex-1 min-w-0 text-sm text-cyan-600 hover:text-cyan-800">
                    <Video size={16} className="shrink-0" />
                    <span className="truncate">{link}</span>
                  </a>
                  {editMode && (
                    <button onClick={() => setTrainerData(prev => ({ ...prev, video_links: prev.video_links.filter((_, idx) => idx !== i) }))}
                      className="mr-2 text-red-400 hover:text-red-600 shrink-0"><Trash2 size={15} /></button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Social Media */}
        <div className="p-6 mb-8 bg-white rounded-xl shadow">
          <h3 className="flex gap-2 items-center mb-5 text-lg font-bold text-cyan-700">
            <Globe size={20} /> وسائل التواصل الاجتماعي
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              { icon: <Facebook size={16} className="text-blue-600" />, label: 'Facebook', field: 'facebook' },
              { icon: <Instagram size={16} className="text-pink-600" />, label: 'Instagram', field: 'instagram' },
              { icon: <Twitter size={16} className="text-sky-500" />, label: 'Twitter / X', field: 'twitter' },
              { icon: <Linkedin size={16} className="text-blue-700" />, label: 'LinkedIn', field: 'linkedin' },
              { icon: <Globe size={16} className="text-gray-500" />, label: 'TikTok', field: 'tiktok' },
            ].map(({ icon, label, field }) => (
              <div key={field} className="flex gap-3 items-center p-3 rounded-lg border border-gray-100 bg-gray-50">
                {icon}
                <span className="w-24 text-sm text-gray-500 shrink-0">{label}</span>
                {editMode ? (
                  <input type="url"
                    value={trainerData.social_media[field as keyof typeof trainerData.social_media]}
                    onChange={e => handleChange(field, e.target.value, 'social_media')}
                    placeholder="https://..."
                    className="flex-1 px-2 py-1 text-sm bg-white rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-300" />
                ) : (
                  <span className="flex-1 text-sm text-blue-600 truncate">
                    {trainerData.social_media[field as keyof typeof trainerData.social_media] || '—'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Photo Gallery */}
        <div className="p-6 bg-white rounded-xl shadow">
          <h3 className="flex gap-2 items-center mb-5 text-lg font-bold text-cyan-700">
            <Camera size={20} /> معرض الصور
          </h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {trainerData.gallery.map((img, idx) => (
              <div key={idx} className="overflow-hidden relative rounded-lg aspect-square group">
                <img src={img} alt={`صورة ${idx + 1}`} className="object-cover w-full h-full" />
                {editMode && (
                  <button onClick={() => handleRemoveGallery(idx)}
                    className="flex absolute inset-0 justify-center items-center transition bg-black/0 group-hover:bg-black/50">
                    <Trash2 className="text-white opacity-0 group-hover:opacity-100 transition" size={22} />
                  </button>
                )}
              </div>
            ))}
            {editMode && (
              <label className="flex flex-col gap-2 justify-center items-center rounded-lg border-2 border-gray-300 border-dashed transition cursor-pointer aspect-square hover:border-cyan-400 hover:bg-cyan-50">
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'gallery')} />
                <Plus size={24} className="text-gray-400" />
                <span className="text-xs text-gray-400">إضافة صورة</span>
              </label>
            )}
          </div>
          {trainerData.gallery.length === 0 && !editMode && (
            <p className="py-6 text-sm text-center text-gray-400">لا توجد صور في المعرض بعد</p>
          )}
        </div>

      </div>
    </div>

    {/* Resume PDF Modal */}
    {showResume && (
      <TrainerResume
        trainerData={trainerData}
        onClose={() => setShowResume(false)}
      />
    )}
    </>
  );
}
