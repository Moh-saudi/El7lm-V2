'use client';

import { useAuth } from '@/lib/firebase/auth-provider';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Edit, Users, FileText, Trophy, User, MapPin, Phone, Mail, Globe,
  Facebook, Twitter, Instagram, Calendar, Star, Briefcase, Plus,
  Trash2, Save, X, Camera, ArrowLeft, Target, Zap, Shield,
  Linkedin, Flag, Clock, Building2, Languages, Award
} from 'lucide-react';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { db } from '@/lib/firebase/config';

interface AgentData {
  full_name: string;
  profile_photo: string;
  coverImage: string;
  date_of_birth: string;
  nationality: string;
  current_location: string;
  bio: string;

  is_fifa_licensed: boolean;
  license_number: string;
  license_expiry: string;
  years_of_experience: number | string;
  specialization: string;
  spoken_languages: string[];

  phone: string;
  whatsapp: string;
  email: string;
  office_address: string;
  website: string;
  social_media: {
    linkedin: string;
    twitter: string;
    instagram: string;
    facebook: string;
    tiktok: string;
  };

  current_players: string[];
  past_players: string[];
  notable_deals: string;

  gallery: string[];

  stats: {
    active_players: number;
    completed_deals: number;
    total_commission: number;
    success_rate: number;
  };
}

const initialAgentData: AgentData = {
  full_name: '',
  profile_photo: '/images/agent-avatar.png',
  coverImage: '/images/hero-1.jpg',
  date_of_birth: '',
  nationality: '',
  current_location: '',
  bio: '',

  is_fifa_licensed: false,
  license_number: '',
  license_expiry: '',
  years_of_experience: '',
  specialization: '',
  spoken_languages: [],

  phone: '',
  whatsapp: '',
  email: '',
  office_address: '',
  website: '',
  social_media: {
    linkedin: '',
    twitter: '',
    instagram: '',
    facebook: '',
    tiktok: '',
  },

  current_players: [],
  past_players: [],
  notable_deals: '',

  gallery: [],

  stats: {
    active_players: 0,
    completed_deals: 0,
    total_commission: 0,
    success_rate: 0,
  },
};

const REQUIRED_FIELDS_AGENT: { key: keyof AgentData; label: string }[] = [
  { key: 'full_name',      label: 'الاسم الكامل' },
  { key: 'nationality',    label: 'الجنسية' },
  { key: 'phone',          label: 'رقم الهاتف' },
  { key: 'email',          label: 'البريد الإلكتروني' },
  { key: 'specialization', label: 'التخصص' },
  { key: 'bio',            label: 'نبذة شخصية' },
];

const getImageUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('/')) return path;
  const CDN = process.env.NEXT_PUBLIC_CDN_URL || '';
  return `${CDN}/agents/${path}`;
};

export default function AgentProfilePage() {
  const { userData, user } = useAuth();
  const router = useRouter();

  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [agentData, setAgentData] = useState<AgentData>(initialAgentData);
  const [newPlayer, setNewPlayer] = useState('');
  const [addPlayerType, setAddPlayerType] = useState<'current' | 'past' | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof AgentData, string>>>({});
  const [showCompletionBanner, setShowCompletionBanner] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const ref = doc(db, 'agents', user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as Partial<AgentData>;
        setAgentData(prev => ({
          ...initialAgentData,
          ...data,
          profile_photo: getImageUrl(data.profile_photo || initialAgentData.profile_photo),
          coverImage: getImageUrl(data.coverImage || initialAgentData.coverImage),
          stats: { ...initialAgentData.stats, ...(data.stats || {}) },
          social_media: { ...initialAgentData.social_media, ...(data.social_media || {}) },
          current_players: data.current_players || [],
          past_players: data.past_players || [],
          gallery: data.gallery || [],
          spoken_languages: data.spoken_languages || [],
          full_name: data.full_name || userData?.full_name || userData?.displayName || userData?.name || '',
          email: data.email || userData?.email || '',
          phone: data.phone || userData?.phone || userData?.phoneNumber || '',
        }));
      } else {
        const basicData: AgentData = {
          ...initialAgentData,
          full_name: userData?.full_name || userData?.displayName || userData?.name || '',
          email: userData?.email || '',
          phone: userData?.phone || userData?.phoneNumber || '',
        };
        await setDoc(ref, { ...basicData, createdAt: new Date(), accountType: 'agent' });
        setAgentData(basicData);
      }
    } catch (err) {
      console.error('Error fetching agent data:', err);
      toast.error('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [user, userData]);

  useEffect(() => {
    if (user && userData) fetchData();
  }, [user, userData, fetchData]);

  const BANNER_SNOOZE_KEY = `agent_profile_banner_snoozed_${user?.uid}`;
  const SNOOZE_DAYS = 3;

  const missingFields = REQUIRED_FIELDS_AGENT.filter(({ key }) => {
    const val = agentData[key];
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
    const newErrors: Partial<Record<keyof AgentData, string>> = {};
    REQUIRED_FIELDS_AGENT.forEach(({ key, label }) => {
      const val = agentData[key];
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
    setAgentData(prev => {
      if (parent) {
        return {
          ...prev,
          [parent]: {
            ...(prev[parent as keyof AgentData] as Record<string, unknown>),
            [field]: value,
          },
        };
      }
      return { ...prev, [field]: value };
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
      formData.append('bucket', 'agents');
      formData.append('path', `${user.uid}/${fileName}`);
      formData.append('contentType', file.type);

      const res = await fetch('/api/storage/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('فشل الرفع');
      const { publicUrl } = await res.json();

      if (type === 'gallery') {
        setAgentData(prev => ({ ...prev, gallery: [...prev.gallery, publicUrl] }));
      } else {
        setAgentData(prev => ({
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
      const ref = doc(db, 'agents', user.uid);
      const snap = await getDoc(ref);
      const dataToSave = { ...agentData, name: agentData.full_name, updatedAt: new Date() };
      if (snap.exists()) {
        await updateDoc(ref, dataToSave);
      } else {
        await setDoc(ref, { ...dataToSave, createdAt: new Date(), accountType: 'agent' });
      }
      try {
        const usersRef = doc(db, 'users', user.uid);
        const usersSnap = await getDoc(usersRef);
        if (usersSnap.exists()) {
          await updateDoc(usersRef, { name: agentData.full_name, full_name: agentData.full_name });
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

  const handleAddPlayer = () => {
    if (!newPlayer.trim() || !addPlayerType) return;
    const field = addPlayerType === 'current' ? 'current_players' : 'past_players';
    setAgentData(prev => ({ ...prev, [field]: [...prev[field], newPlayer.trim()] }));
    setNewPlayer('');
    setAddPlayerType(null);
  };

  const handleRemovePlayer = (type: 'current' | 'past', index: number) => {
    const field = type === 'current' ? 'current_players' : 'past_players';
    setAgentData(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
  };

  const handleRemoveGallery = (index: number) => {
    setAgentData(prev => ({ ...prev, gallery: prev.gallery.filter((_, i) => i !== index) }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full border-4 border-purple-200 animate-spin border-t-purple-600"></div>
          <p className="text-gray-600">جاري تحميل الملف الشخصي...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50" dir="rtl">

      {/* Sticky Header */}
      <div className="sticky top-0 z-50 border-b border-gray-200 shadow-sm backdrop-blur-md bg-white/95">
        <div className="px-4 py-4 mx-auto max-w-7xl">
          <div className="flex justify-between items-center">
            <button
              onClick={() => router.back()}
              className="flex gap-2 items-center px-4 py-2 text-gray-600 rounded-lg transition hover:text-gray-800 hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">العودة</span>
            </button>
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900">الملف الشخصي - وكيل اللاعبين</h1>
              {agentData.full_name && (
                <p className="text-sm text-gray-500">{agentData.full_name}</p>
              )}
            </div>
            <div className="flex gap-2">
              {editMode ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={uploading}
                    className="flex gap-2 items-center px-4 py-2 text-white bg-green-600 rounded-lg transition hover:bg-green-700 disabled:opacity-60"
                  >
                    <Save className="w-4 h-4" />
                    {uploading ? 'جاري الحفظ...' : 'حفظ'}
                  </button>
                  <button
                    onClick={() => { fetchData(); setEditMode(false); }}
                    className="flex gap-2 items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg transition hover:bg-gray-200"
                  >
                    <X className="w-4 h-4" />
                    إلغاء
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="flex gap-2 items-center px-5 py-2 text-white rounded-lg shadow transition hover:scale-105 bg-gradient-to-l from-purple-500 to-purple-700"
                >
                  <Edit className="w-4 h-4" />
                  تعديل البيانات
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
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
              className="text-amber-400 hover:text-amber-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Cover Image */}
        <div className="overflow-hidden relative mb-8 h-52 rounded-2xl shadow-lg">
          <img
            src={agentData.coverImage || '/images/hero-1.jpg'}
            alt="صورة الغلاف"
            className="object-cover w-full h-full"
          />
          {editMode && (
            <label className="flex absolute inset-0 justify-center items-center transition cursor-pointer bg-black/50 hover:bg-black/60">
              <input
                type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'cover')}
              />
              <div className="flex flex-col items-center gap-2 text-white">
                <Camera className="w-8 h-8" />
                <span className="text-sm font-medium">تغيير صورة الغلاف</span>
              </div>
            </label>
          )}
        </div>

        {/* Profile Card */}
        <div className="flex flex-col gap-6 items-center p-8 mb-8 bg-white rounded-2xl shadow-lg md:flex-row">
          {/* Photo */}
          <div className="relative flex-shrink-0">
            <img
              src={agentData.profile_photo || '/images/agent-avatar.png'}
              alt="الصورة الشخصية"
              className="object-cover w-32 h-32 rounded-full border-4 border-purple-500 shadow-lg"
            />
            {editMode && (
              <label className="flex absolute inset-0 justify-center items-center rounded-full transition cursor-pointer bg-black/50 hover:bg-black/60">
                <input
                  type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'photo')}
                />
                <Edit className="text-white" size={22} />
              </label>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-right">
            {editMode ? (
              <input
                type="text"
                value={agentData.full_name}
                onChange={e => { handleChange('full_name', e.target.value); setErrors(p => ({ ...p, full_name: '' })); }}
                placeholder="الاسم الكامل"
                className={`mb-2 w-full text-2xl font-bold text-right text-gray-900 bg-transparent border-b-2 focus:outline-none focus:border-purple-600 ${errors.full_name ? 'border-red-400' : 'border-purple-300'}`}
              />
            ) : (
              <h2 className="mb-1 text-2xl font-bold text-purple-700">{agentData.full_name || 'وكيل اللاعبين'}</h2>
            )}

            {editMode ? (
              <input
                type="text"
                value={agentData.specialization}
                onChange={e => handleChange('specialization', e.target.value)}
                placeholder="التخصص (مثال: وكيل لاعبين دوليين...)"
                className="mb-3 w-full text-right text-gray-600 bg-transparent border-b border-gray-200 focus:outline-none focus:border-purple-400"
              />
            ) : (
              <p className="mb-3 text-gray-600">{agentData.specialization || 'وكيل لاعبين'}</p>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <span className="flex gap-1 items-center">
                <Flag size={15} />
                {editMode ? (
                  <input type="text" value={agentData.nationality} onChange={e => handleChange('nationality', e.target.value)}
                    placeholder="الجنسية" className="w-24 bg-transparent border-b border-gray-200 focus:outline-none" />
                ) : (agentData.nationality || '—')}
              </span>
              <span className="flex gap-1 items-center">
                <MapPin size={15} />
                {editMode ? (
                  <input type="text" value={agentData.current_location} onChange={e => handleChange('current_location', e.target.value)}
                    placeholder="الموقع" className="w-28 bg-transparent border-b border-gray-200 focus:outline-none" />
                ) : (agentData.current_location || '—')}
              </span>
              <span className="flex gap-1 items-center">
                <Clock size={15} />
                {editMode ? (
                  <input type="number" value={agentData.years_of_experience} onChange={e => handleChange('years_of_experience', e.target.value)}
                    placeholder="0" className="w-12 bg-transparent border-b border-gray-200 focus:outline-none" />
                ) : agentData.years_of_experience} سنوات خبرة
              </span>
            </div>

            {/* FIFA Badge */}
            <div className="flex gap-2 mt-4">
              <span className="self-center text-sm text-gray-500">رخصة FIFA:</span>
              <button
                disabled={!editMode}
                onClick={() => editMode && handleChange('is_fifa_licensed', true)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border-2 transition ${
                  agentData.is_fifa_licensed
                    ? 'border-purple-600 bg-purple-50 text-purple-700'
                    : 'border-gray-200 text-gray-400'
                } disabled:cursor-default`}
              >
                <Shield className="inline w-3.5 h-3.5 ml-1" />
                معتمد FIFA
              </button>
              <button
                disabled={!editMode}
                onClick={() => editMode && handleChange('is_fifa_licensed', false)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border-2 transition ${
                  !agentData.is_fifa_licensed
                    ? 'border-purple-600 bg-purple-50 text-purple-700'
                    : 'border-gray-200 text-gray-400'
                } disabled:cursor-default`}
              >
                محلي
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8 md:grid-cols-4">
          {[
            { icon: <Users size={26} />, label: 'لاعبون نشطون', field: 'active_players', color: 'from-purple-400 to-purple-600' },
            { icon: <Trophy size={26} />, label: 'صفقات مكتملة', field: 'completed_deals', color: 'from-green-400 to-green-600' },
            { icon: <Zap size={26} />, label: 'إجمالي العمولات (K)', field: 'total_commission', color: 'from-yellow-400 to-yellow-600' },
            { icon: <Target size={26} />, label: 'معدل النجاح %', field: 'success_rate', color: 'from-blue-400 to-blue-600' },
          ].map(({ icon, label, field, color }) => (
            <div key={field} className={`flex flex-col items-center p-5 text-white bg-gradient-to-br ${color} rounded-xl shadow`}>
              {icon}
              {editMode ? (
                <input
                  type="number"
                  value={agentData.stats[field as keyof typeof agentData.stats]}
                  onChange={e => handleChange(field, Number(e.target.value), 'stats')}
                  className="mt-2 w-16 text-2xl font-bold text-center text-white bg-white/20 rounded border-0 focus:outline-none focus:bg-white/30"
                  min={0}
                />
              ) : (
                <div className="mt-2 text-2xl font-bold">{agentData.stats[field as keyof typeof agentData.stats]}</div>
              )}
              <div className="mt-1 text-sm opacity-90">{label}</div>
            </div>
          ))}
        </div>

        {/* Bio + Contact */}
        <div className="grid grid-cols-1 gap-8 mb-8 md:grid-cols-2">
          {/* Bio */}
          <div className="p-6 bg-white rounded-xl shadow">
            <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-purple-700">
              <FileText size={20} /> نبذة شخصية
            </h3>
            {editMode ? (
              <textarea
                value={agentData.bio}
                onChange={e => handleChange('bio', e.target.value)}
                rows={5}
                placeholder="اكتب نبذة عن خبراتك ومسيرتك المهنية..."
                className="p-3 w-full text-right text-sm rounded-lg border border-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            ) : (
              <p className="text-sm leading-relaxed text-right text-gray-600">
                {agentData.bio || 'لا توجد نبذة شخصية بعد.'}
              </p>
            )}
          </div>

          {/* Contact */}
          <div className="p-6 bg-white rounded-xl shadow">
            <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-purple-700">
              <Phone size={20} /> بيانات التواصل
            </h3>
            <div className="space-y-3">
              {[
                { icon: <Phone size={15} />, label: 'الهاتف', field: 'phone', type: 'tel' },
                { icon: <Phone size={15} />, label: 'واتساب', field: 'whatsapp', type: 'tel' },
                { icon: <Mail size={15} />, label: 'البريد', field: 'email', type: 'email' },
                { icon: <Building2 size={15} />, label: 'المكتب', field: 'office_address', type: 'text' },
                { icon: <Globe size={15} />, label: 'الموقع', field: 'website', type: 'url' },
              ].map(({ icon, label, field, type }) => {
                const hasError = !!errors[field as keyof AgentData];
                return (
                  <div key={field} className="flex gap-3 items-center">
                    <span className="text-purple-500">{icon}</span>
                    <span className="w-20 text-sm text-gray-500">{label}:</span>
                    {editMode ? (
                      <input
                        type={type}
                        value={agentData[field as keyof AgentData] as string}
                        onChange={e => { handleChange(field, e.target.value); setErrors(p => ({ ...p, [field]: '' })); }}
                        className={`flex-1 px-2 py-1 text-sm rounded border focus:outline-none focus:ring-2 focus:ring-purple-300 ${hasError ? 'border-red-400' : 'border-gray-200'}`}
                      />
                    ) : (
                      <span className="text-sm text-gray-700">{(agentData[field as keyof AgentData] as string) || '—'}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Professional Info + Players Portfolio */}
        <div className="grid grid-cols-1 gap-8 mb-8 md:grid-cols-2">
          {/* Professional Info */}
          <div className="p-6 bg-white rounded-xl shadow">
            <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-purple-700">
              <Shield size={20} /> المعلومات المهنية
            </h3>
            <div className="space-y-3">
              {agentData.is_fifa_licensed && (
                <>
                  <div className="flex gap-3 items-center">
                    <span className="text-purple-500"><Shield size={15} /></span>
                    <span className="w-24 text-sm text-gray-500">رقم الرخصة:</span>
                    {editMode ? (
                      <input type="text" value={agentData.license_number}
                        onChange={e => handleChange('license_number', e.target.value)}
                        className="flex-1 px-2 py-1 text-sm rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300" />
                    ) : (
                      <span className="text-sm text-gray-700">{agentData.license_number || '—'}</span>
                    )}
                  </div>
                  <div className="flex gap-3 items-center">
                    <span className="text-purple-500"><Calendar size={15} /></span>
                    <span className="w-24 text-sm text-gray-500">انتهاء الرخصة:</span>
                    {editMode ? (
                      <input type="date" value={agentData.license_expiry}
                        onChange={e => handleChange('license_expiry', e.target.value)}
                        className="flex-1 px-2 py-1 text-sm rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300" />
                    ) : (
                      <span className="text-sm text-gray-700">{agentData.license_expiry || '—'}</span>
                    )}
                  </div>
                </>
              )}
              <div className="flex gap-3 items-center">
                <span className="text-purple-500"><Calendar size={15} /></span>
                <span className="w-24 text-sm text-gray-500">تاريخ الميلاد:</span>
                {editMode ? (
                  <input type="date" value={agentData.date_of_birth}
                    onChange={e => handleChange('date_of_birth', e.target.value)}
                    className="flex-1 px-2 py-1 text-sm rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300" />
                ) : (
                  <span className="text-sm text-gray-700">{agentData.date_of_birth || '—'}</span>
                )}
              </div>
              <div className="flex gap-3 items-start">
                <span className="mt-1 text-purple-500"><Languages size={15} /></span>
                <span className="w-24 text-sm text-gray-500 shrink-0">اللغات:</span>
                {editMode ? (
                  <input
                    type="text"
                    value={agentData.spoken_languages.join(', ')}
                    onChange={e => handleChange('spoken_languages', e.target.value.split(',').map(l => l.trim()).filter(Boolean))}
                    placeholder="العربية، الإنجليزية (افصل بفاصلة)"
                    className="flex-1 px-2 py-1 text-sm rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {agentData.spoken_languages.length > 0
                      ? agentData.spoken_languages.map((lang, i) => (
                          <span key={i} className="px-2 py-0.5 text-xs text-purple-700 bg-purple-100 rounded-full">{lang}</span>
                        ))
                      : <span className="text-sm text-gray-700">—</span>
                    }
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Players Portfolio */}
          <div className="p-6 bg-white rounded-xl shadow">
            <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-purple-700">
              <Briefcase size={20} /> محفظة اللاعبين
            </h3>

            {/* Current Players */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-700">اللاعبون الحاليون</span>
                {editMode && (
                  <button onClick={() => setAddPlayerType('current')}
                    className="flex gap-1 items-center text-xs text-purple-600 hover:text-purple-800">
                    <Plus size={13} /> إضافة
                  </button>
                )}
              </div>
              {addPlayerType === 'current' && editMode && (
                <div className="flex gap-2 mb-2">
                  <input type="text" value={newPlayer} onChange={e => setNewPlayer(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddPlayer()}
                    placeholder="اسم اللاعب"
                    className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300" />
                  <button onClick={handleAddPlayer} className="px-3 py-1.5 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700">إضافة</button>
                  <button onClick={() => { setAddPlayerType(null); setNewPlayer(''); }} className="px-2 py-1.5 text-gray-500 hover:text-red-500"><X size={16} /></button>
                </div>
              )}
              {agentData.current_players.length === 0 ? (
                <p className="text-xs text-gray-400">لا يوجد لاعبون حاليون</p>
              ) : (
                <div className="space-y-1">
                  {agentData.current_players.map((player, i) => (
                    <div key={i} className="flex justify-between items-center px-3 py-1.5 rounded-lg bg-purple-50">
                      <span className="text-sm text-gray-800">{player}</span>
                      {editMode && (
                        <button onClick={() => handleRemovePlayer('current', i)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Past Players */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-700">اللاعبون السابقون</span>
                {editMode && (
                  <button onClick={() => setAddPlayerType('past')}
                    className="flex gap-1 items-center text-xs text-purple-600 hover:text-purple-800">
                    <Plus size={13} /> إضافة
                  </button>
                )}
              </div>
              {addPlayerType === 'past' && editMode && (
                <div className="flex gap-2 mb-2">
                  <input type="text" value={newPlayer} onChange={e => setNewPlayer(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddPlayer()}
                    placeholder="اسم اللاعب"
                    className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300" />
                  <button onClick={handleAddPlayer} className="px-3 py-1.5 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700">إضافة</button>
                  <button onClick={() => { setAddPlayerType(null); setNewPlayer(''); }} className="px-2 py-1.5 text-gray-500 hover:text-red-500"><X size={16} /></button>
                </div>
              )}
              {agentData.past_players.length === 0 ? (
                <p className="text-xs text-gray-400">لا يوجد لاعبون سابقون</p>
              ) : (
                <div className="space-y-1">
                  {agentData.past_players.map((player, i) => (
                    <div key={i} className="flex justify-between items-center px-3 py-1.5 rounded-lg bg-gray-50">
                      <span className="text-sm text-gray-700">{player}</span>
                      {editMode && (
                        <button onClick={() => handleRemovePlayer('past', i)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notable Deals */}
        <div className="p-6 mb-8 bg-white rounded-xl shadow">
          <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-purple-700">
            <Star size={20} /> الصفقات البارزة
          </h3>
          {editMode ? (
            <textarea
              value={agentData.notable_deals}
              onChange={e => handleChange('notable_deals', e.target.value)}
              rows={4}
              placeholder="اكتب وصفاً للصفقات البارزة والانتقالات المهمة التي أنجزتها..."
              className="p-3 w-full text-right text-sm rounded-lg border border-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          ) : (
            <p className="text-sm leading-relaxed text-right text-gray-600">
              {agentData.notable_deals || 'لا توجد صفقات بارزة مسجّلة بعد.'}
            </p>
          )}
        </div>

        {/* Social Media */}
        <div className="p-6 mb-8 bg-white rounded-xl shadow">
          <h3 className="flex gap-2 items-center mb-5 text-lg font-bold text-purple-700">
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
                  <input
                    type="url"
                    value={agentData.social_media[field as keyof typeof agentData.social_media]}
                    onChange={e => handleChange(field, e.target.value, 'social_media')}
                    placeholder="https://..."
                    className="flex-1 px-2 py-1 text-sm bg-white rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                ) : (
                  <span className="flex-1 text-sm text-blue-600 truncate">
                    {agentData.social_media[field as keyof typeof agentData.social_media] || '—'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Photo Gallery */}
        <div className="p-6 bg-white rounded-xl shadow">
          <h3 className="flex gap-2 items-center mb-5 text-lg font-bold text-purple-700">
            <Camera size={20} /> معرض الصور
          </h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {agentData.gallery.map((img, idx) => (
              <div key={idx} className="overflow-hidden relative rounded-lg aspect-square group">
                <img src={img} alt={`صورة ${idx + 1}`} className="object-cover w-full h-full" />
                {editMode && (
                  <button
                    onClick={() => handleRemoveGallery(idx)}
                    className="flex absolute inset-0 justify-center items-center transition bg-black/0 group-hover:bg-black/50"
                  >
                    <Trash2 className="text-white opacity-0 group-hover:opacity-100 transition" size={22} />
                  </button>
                )}
              </div>
            ))}
            {editMode && (
              <label className="flex flex-col gap-2 justify-center items-center rounded-lg border-2 border-gray-300 border-dashed transition cursor-pointer aspect-square hover:border-purple-400 hover:bg-purple-50">
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'gallery')} />
                <Plus size={24} className="text-gray-400" />
                <span className="text-xs text-gray-400">إضافة صورة</span>
              </label>
            )}
          </div>
          {agentData.gallery.length === 0 && !editMode && (
            <p className="py-6 text-sm text-center text-gray-400">لا توجد صور في المعرض بعد</p>
          )}
        </div>

      </div>
    </div>
  );
}
