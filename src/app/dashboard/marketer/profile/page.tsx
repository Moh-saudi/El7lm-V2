'use client';

import { useAuth } from '@/lib/firebase/auth-provider';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Edit, Users, FileText, Trophy, User, MapPin, Phone, Mail, Globe,
  Facebook, Twitter, Instagram, Calendar, Star, Briefcase, Plus,
  Trash2, Save, X, Camera, ArrowLeft, TrendingUp, Handshake,
  Linkedin, Shield
} from 'lucide-react';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { db } from '@/lib/firebase/config';

interface DealRecord {
  client_name: string;
  client_type: 'player' | 'trainer';
  from_club: string;
  to_club: string;
  deal_value: string;
  season: string;
  year: string;
  notes: string;
}

interface MarketerData {
  full_name: string;
  photo: string;
  coverImage: string;
  phone: string;
  whatsapp: string;
  email: string;
  city: string;
  country: string;
  nationality: string;
  bio: string;
  specialization: string;
  experience_years: number | string;
  license_number: string;
  client_type: 'player' | 'trainer';
  stats: {
    clients: number;
    active_deals: number;
    completed_deals: number;
    rating: number;
  };
  deals: DealRecord[];
  gallery: string[];
  social_media: {
    facebook: string;
    instagram: string;
    linkedin: string;
    twitter: string;
    tiktok: string;
    website: string;
  };
}

const initialMarketerData: MarketerData = {
  full_name: '',
  photo: '/images/club-avatar.png',
  coverImage: '/images/hero-1.jpg',
  phone: '',
  whatsapp: '',
  email: '',
  city: '',
  country: '',
  nationality: '',
  bio: '',
  specialization: '',
  experience_years: '',
  license_number: '',
  client_type: 'player',
  stats: {
    clients: 0,
    active_deals: 0,
    completed_deals: 0,
    rating: 0,
  },
  deals: [],
  gallery: [],
  social_media: {
    facebook: '',
    instagram: '',
    linkedin: '',
    twitter: '',
    tiktok: '',
    website: '',
  },
};

const getImageUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('/')) return path;
  const CDN = process.env.NEXT_PUBLIC_CDN_URL || '';
  return `${CDN}/marketers/${path}`;
};

export default function MarketerProfilePage() {
  const { userData, user } = useAuth();
  const router = useRouter();

  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [marketerData, setMarketerData] = useState<MarketerData>(initialMarketerData);
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [newDeal, setNewDeal] = useState<DealRecord>({
    client_name: '', client_type: 'player', from_club: '', to_club: '',
    deal_value: '', season: '', year: '', notes: ''
  });

  const clientLabel = marketerData.client_type === 'trainer' ? 'مدرب' : 'لاعب';
  const clientsLabel = marketerData.client_type === 'trainer' ? 'المدربون' : 'اللاعبون';

  const fetchData = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const ref = doc(db, 'marketers', user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as Partial<MarketerData>;
        setMarketerData(prev => ({
          ...initialMarketerData,
          ...data,
          photo: getImageUrl(data.photo || initialMarketerData.photo),
          coverImage: getImageUrl(data.coverImage || initialMarketerData.coverImage),
          stats: { ...initialMarketerData.stats, ...(data.stats || {}) },
          social_media: { ...initialMarketerData.social_media, ...(data.social_media || {}) },
          deals: data.deals || [],
          gallery: data.gallery || [],
          // Fallback from userData
          full_name: data.full_name || userData?.full_name || userData?.displayName || '',
          email: data.email || userData?.email || '',
          phone: data.phone || userData?.phone || userData?.phoneNumber || '',
        }));
      } else {
        const basicData: MarketerData = {
          ...initialMarketerData,
          full_name: userData?.full_name || userData?.displayName || '',
          email: userData?.email || '',
          phone: userData?.phone || userData?.phoneNumber || '',
        };
        await setDoc(ref, { ...basicData, createdAt: new Date(), accountType: 'marketer' });
        setMarketerData(basicData);
      }
    } catch (err) {
      console.error('Error fetching marketer data:', err);
      toast.error('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [user, userData]);

  useEffect(() => {
    if (user && userData) fetchData();
  }, [user, userData, fetchData]);

  const handleChange = (field: string, value: unknown, parent?: string) => {
    setMarketerData(prev => {
      if (parent) {
        return {
          ...prev,
          [parent]: {
            ...(prev[parent as keyof MarketerData] as Record<string, unknown>),
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
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${type}_${Date.now()}.${ext}`;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'marketers');
      formData.append('path', `${user.uid}/${fileName}`);
      formData.append('contentType', file.type);

      const res = await fetch('/api/storage/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('فشل الرفع');
      const { publicUrl } = await res.json();

      if (type === 'gallery') {
        setMarketerData(prev => ({ ...prev, gallery: [...prev.gallery, publicUrl] }));
      } else {
        setMarketerData(prev => ({ ...prev, [type === 'photo' ? 'photo' : 'coverImage']: publicUrl }));
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
    setUploading(true);
    try {
      const ref = doc(db, 'marketers', user.uid);
      const snap = await getDoc(ref);
      const dataToSave = {
        ...marketerData,
        updatedAt: new Date(),
        full_name: marketerData.full_name,
      };
      if (snap.exists()) {
        await updateDoc(ref, dataToSave);
      } else {
        await setDoc(ref, { ...dataToSave, createdAt: new Date(), accountType: 'marketer' });
      }
      toast.success('تم حفظ الملف الشخصي بنجاح');
      setEditMode(false);
    } catch (err) {
      console.error('Save error:', err);
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setUploading(false);
    }
  };

  const handleAddDeal = () => {
    if (!newDeal.client_name.trim()) {
      toast.error(`يرجى إدخال اسم ال${clientLabel}`);
      return;
    }
    setMarketerData(prev => ({ ...prev, deals: [...prev.deals, { ...newDeal }] }));
    setNewDeal({ client_name: '', client_type: marketerData.client_type, from_club: '', to_club: '', deal_value: '', season: '', year: '', notes: '' });
    setShowAddDeal(false);
  };

  const handleRemoveDeal = (index: number) => {
    setMarketerData(prev => ({ ...prev, deals: prev.deals.filter((_, i) => i !== index) }));
  };

  const handleRemoveGallery = (index: number) => {
    setMarketerData(prev => ({ ...prev, gallery: prev.gallery.filter((_, i) => i !== index) }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full border-4 border-blue-200 animate-spin border-t-blue-600"></div>
          <p className="text-gray-600">جاري تحميل الملف الشخصي...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50">
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
              <h1 className="text-xl font-bold text-gray-900">الملف الشخصي - المسوق الكروي</h1>
              {marketerData.full_name && (
                <p className="text-sm text-gray-500">{marketerData.full_name}</p>
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
                  className="flex gap-2 items-center px-5 py-2 text-white bg-gradient-to-l from-indigo-500 to-indigo-700 rounded-lg shadow transition hover:scale-105"
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

        {/* Cover Image */}
        <div className="overflow-hidden relative mb-8 h-52 rounded-2xl shadow-lg">
          <img
            src={marketerData.coverImage || '/images/hero-1.jpg'}
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
              src={marketerData.photo || '/images/club-avatar.png'}
              alt="الصورة الشخصية"
              className="object-cover w-32 h-32 rounded-full border-4 border-indigo-500 shadow-lg"
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
                value={marketerData.full_name}
                onChange={e => handleChange('full_name', e.target.value)}
                placeholder="الاسم الكامل"
                className="mb-2 w-full text-2xl font-bold text-right text-gray-900 bg-transparent border-b-2 border-indigo-300 focus:outline-none focus:border-indigo-600"
              />
            ) : (
              <h2 className="mb-1 text-2xl font-bold text-indigo-700">{marketerData.full_name || 'المسوق الكروي'}</h2>
            )}

            {editMode ? (
              <input
                type="text"
                value={marketerData.specialization}
                onChange={e => handleChange('specialization', e.target.value)}
                placeholder="التخصص (مثال: وكيل لاعبين، مسوق رياضي...)"
                className="mb-3 w-full text-right text-gray-600 bg-transparent border-b border-gray-200 focus:outline-none focus:border-indigo-400"
              />
            ) : (
              <p className="mb-3 text-gray-600">{marketerData.specialization || 'مسوق كروي'}</p>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <span className="flex gap-1 items-center">
                <MapPin size={15} />
                {editMode ? (
                  <input type="text" value={marketerData.city} onChange={e => handleChange('city', e.target.value)}
                    placeholder="المدينة" className="w-20 bg-transparent border-b border-gray-200 focus:outline-none" />
                ) : (marketerData.city || '—')}
                {editMode ? (
                  <input type="text" value={marketerData.country} onChange={e => handleChange('country', e.target.value)}
                    placeholder="الدولة" className="w-20 bg-transparent border-b border-gray-200 focus:outline-none" />
                ) : (marketerData.country ? `, ${marketerData.country}` : '')}
              </span>
              <span className="flex gap-1 items-center">
                <Briefcase size={15} />
                {editMode ? (
                  <input type="number" value={marketerData.experience_years} onChange={e => handleChange('experience_years', e.target.value)}
                    placeholder="سنوات" className="w-12 bg-transparent border-b border-gray-200 focus:outline-none" />
                ) : marketerData.experience_years} سنوات خبرة
              </span>
            </div>

            {/* Client Type Toggle */}
            <div className="flex gap-2 mt-4">
              <span className="self-center text-sm text-gray-500">نوع العميل:</span>
              <button
                disabled={!editMode}
                onClick={() => editMode && handleChange('client_type', 'player')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border-2 transition ${
                  marketerData.client_type === 'player'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-400'
                } disabled:cursor-default`}
              >
                <User className="inline w-3.5 h-3.5 ml-1" />
                لاعبون
              </button>
              <button
                disabled={!editMode}
                onClick={() => editMode && handleChange('client_type', 'trainer')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border-2 transition ${
                  marketerData.client_type === 'trainer'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-400'
                } disabled:cursor-default`}
              >
                <Shield className="inline w-3.5 h-3.5 ml-1" />
                مدربون
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8 md:grid-cols-4">
          {[
            { icon: <Users size={26} />, label: clientsLabel, field: 'clients', color: 'from-indigo-400 to-indigo-600' },
            { icon: <Handshake size={26} />, label: 'صفقات نشطة', field: 'active_deals', color: 'from-green-400 to-green-600' },
            { icon: <Trophy size={26} />, label: 'صفقات منجزة', field: 'completed_deals', color: 'from-yellow-400 to-yellow-600' },
            { icon: <Star size={26} />, label: 'التقييم', field: 'rating', color: 'from-purple-400 to-purple-600' },
          ].map(({ icon, label, field, color }) => (
            <div key={field} className={`flex flex-col items-center p-5 text-white bg-gradient-to-br ${color} rounded-xl shadow`}>
              {icon}
              {editMode ? (
                <input
                  type="number"
                  value={marketerData.stats[field as keyof typeof marketerData.stats]}
                  onChange={e => handleChange(field, Number(e.target.value), 'stats')}
                  className="mt-2 w-16 text-2xl font-bold text-center text-white bg-white/20 rounded border-0 focus:outline-none focus:bg-white/30"
                  min={0} max={field === 'rating' ? 5 : undefined} step={field === 'rating' ? 0.1 : 1}
                />
              ) : (
                <div className="mt-2 text-2xl font-bold">{marketerData.stats[field as keyof typeof marketerData.stats]}</div>
              )}
              <div className="mt-1 text-sm opacity-90">{label}</div>
            </div>
          ))}
        </div>

        {/* Bio + Personal Info */}
        <div className="grid grid-cols-1 gap-8 mb-8 md:grid-cols-2">
          {/* Bio */}
          <div className="p-6 bg-white rounded-xl shadow">
            <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-indigo-700">
              <FileText size={20} /> نبذة شخصية
            </h3>
            {editMode ? (
              <textarea
                value={marketerData.bio}
                onChange={e => handleChange('bio', e.target.value)}
                rows={5}
                placeholder="اكتب نبذة عن خبراتك ومسيرتك المهنية..."
                className="p-3 w-full text-right text-sm rounded-lg border border-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            ) : (
              <p className="text-sm leading-relaxed text-right text-gray-600">
                {marketerData.bio || 'لا توجد نبذة شخصية بعد.'}
              </p>
            )}
          </div>

          {/* Contact Info */}
          <div className="p-6 bg-white rounded-xl shadow">
            <h3 className="flex gap-2 items-center mb-4 text-lg font-bold text-indigo-700">
              <Phone size={20} /> بيانات التواصل
            </h3>
            <div className="space-y-3">
              {[
                { icon: <Phone size={15} />, label: 'الهاتف', field: 'phone', type: 'tel' },
                { icon: <Phone size={15} />, label: 'واتساب', field: 'whatsapp', type: 'tel' },
                { icon: <Mail size={15} />, label: 'البريد', field: 'email', type: 'email' },
                { icon: <MapPin size={15} />, label: 'الجنسية', field: 'nationality', type: 'text' },
                { icon: <Shield size={15} />, label: 'رقم الترخيص', field: 'license_number', type: 'text' },
              ].map(({ icon, label, field, type }) => (
                <div key={field} className="flex gap-3 items-center">
                  <span className="text-indigo-500">{icon}</span>
                  <span className="w-20 text-sm text-gray-500">{label}:</span>
                  {editMode ? (
                    <input
                      type={type}
                      value={marketerData[field as keyof MarketerData] as string}
                      onChange={e => handleChange(field, e.target.value)}
                      className="flex-1 px-2 py-1 text-sm rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  ) : (
                    <span className="text-sm text-gray-700">{(marketerData[field as keyof MarketerData] as string) || '—'}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Achieved Deals */}
        <div className="p-6 mb-8 bg-white rounded-xl shadow">
          <div className="flex justify-between items-center mb-5">
            <h3 className="flex gap-2 items-center text-lg font-bold text-indigo-700">
              <Handshake size={20} /> الصفقات المنجزة
            </h3>
            {editMode && (
              <button
                onClick={() => setShowAddDeal(true)}
                className="flex gap-1 items-center px-3 py-1.5 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                <Plus size={16} /> إضافة صفقة
              </button>
            )}
          </div>

          {/* Add Deal Form */}
          {showAddDeal && (
            <div className="p-4 mb-5 rounded-xl border border-indigo-100 bg-indigo-50">
              <h4 className="mb-3 font-semibold text-indigo-700">إضافة صفقة جديدة</h4>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-xs text-gray-600">نوع العميل</label>
                  <div className="flex gap-2">
                    {['player', 'trainer'].map(t => (
                      <button key={t} onClick={() => setNewDeal(p => ({ ...p, client_type: t as 'player' | 'trainer' }))}
                        className={`flex-1 py-1.5 text-sm rounded-lg border-2 transition ${newDeal.client_type === t ? 'border-indigo-600 bg-indigo-100 text-indigo-700' : 'border-gray-200 text-gray-500'}`}>
                        {t === 'player' ? 'لاعب' : 'مدرب'}
                      </button>
                    ))}
                  </div>
                </div>
                {[
                  { label: `اسم ال${newDeal.client_type === 'player' ? 'لاعب' : 'المدرب'}`, field: 'client_name' },
                  { label: 'النادي السابق', field: 'from_club' },
                  { label: 'النادي الجديد', field: 'to_club' },
                  { label: 'قيمة الصفقة', field: 'deal_value' },
                  { label: 'الموسم', field: 'season' },
                  { label: 'السنة', field: 'year' },
                ].map(({ label, field }) => (
                  <div key={field}>
                    <label className="block mb-1 text-xs text-gray-600">{label}</label>
                    <input
                      type="text"
                      value={newDeal[field as keyof DealRecord] as string}
                      onChange={e => setNewDeal(p => ({ ...p, [field]: e.target.value }))}
                      className="px-3 py-2 w-full text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                ))}
                <div className="md:col-span-2">
                  <label className="block mb-1 text-xs text-gray-600">ملاحظات</label>
                  <input type="text" value={newDeal.notes} onChange={e => setNewDeal(p => ({ ...p, notes: e.target.value }))}
                    className="px-3 py-2 w-full text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-4">
                <button onClick={handleAddDeal} className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
                  إضافة
                </button>
                <button onClick={() => setShowAddDeal(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                  إلغاء
                </button>
              </div>
            </div>
          )}

          {marketerData.deals.length === 0 ? (
            <div className="py-10 text-center text-gray-400">
              <Handshake className="mx-auto mb-2 w-10 h-10 opacity-30" />
              <p className="text-sm">لا توجد صفقات مسجّلة بعد</p>
            </div>
          ) : (
            <div className="space-y-3">
              {marketerData.deals.map((deal, idx) => (
                <div key={idx} className="flex justify-between items-center p-4 rounded-xl border border-gray-100 bg-gray-50 hover:border-indigo-200 hover:bg-indigo-50/30 transition">
                  <div className="flex gap-4 items-center">
                    <div className="flex justify-center items-center w-10 h-10 text-indigo-600 bg-indigo-100 rounded-full">
                      {deal.client_type === 'trainer' ? <Shield size={18} /> : <User size={18} />}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{deal.client_name}</p>
                      <p className="text-sm text-gray-500">
                        {deal.from_club && deal.to_club ? `${deal.from_club} ← ${deal.to_club}` : deal.from_club || deal.to_club || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-center text-right">
                    {deal.deal_value && (
                      <span className="px-2 py-1 text-sm font-semibold text-green-700 bg-green-100 rounded-lg">
                        {deal.deal_value}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{deal.season || deal.year}</span>
                    {editMode && (
                      <button onClick={() => handleRemoveDeal(idx)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Social Media */}
        <div className="p-6 mb-8 bg-white rounded-xl shadow">
          <h3 className="flex gap-2 items-center mb-5 text-lg font-bold text-indigo-700">
            <Globe size={20} /> وسائل التواصل والتسويق
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              { icon: <Facebook size={16} className="text-blue-600" />, label: 'Facebook', field: 'facebook' },
              { icon: <Instagram size={16} className="text-pink-600" />, label: 'Instagram', field: 'instagram' },
              { icon: <Twitter size={16} className="text-sky-500" />, label: 'Twitter / X', field: 'twitter' },
              { icon: <Linkedin size={16} className="text-blue-700" />, label: 'LinkedIn', field: 'linkedin' },
              { icon: <Globe size={16} className="text-gray-600" />, label: 'TikTok', field: 'tiktok' },
              { icon: <Globe size={16} className="text-indigo-600" />, label: 'الموقع الإلكتروني', field: 'website' },
            ].map(({ icon, label, field }) => (
              <div key={field} className="flex gap-3 items-center p-3 rounded-lg border border-gray-100 bg-gray-50">
                {icon}
                <span className="w-28 text-sm text-gray-500 shrink-0">{label}</span>
                {editMode ? (
                  <input
                    type="url"
                    value={marketerData.social_media[field as keyof typeof marketerData.social_media]}
                    onChange={e => handleChange(field, e.target.value, 'social_media')}
                    placeholder={`https://...`}
                    className="flex-1 px-2 py-1 text-sm bg-white rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                ) : (
                  <span className="flex-1 text-sm text-blue-600 truncate">
                    {marketerData.social_media[field as keyof typeof marketerData.social_media] || '—'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Photo Gallery */}
        <div className="p-6 bg-white rounded-xl shadow">
          <h3 className="flex gap-2 items-center mb-5 text-lg font-bold text-indigo-700">
            <Camera size={20} /> معرض الصور
          </h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {marketerData.gallery.map((img, idx) => (
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
              <label className="flex flex-col gap-2 justify-center items-center rounded-lg border-2 border-gray-300 border-dashed transition cursor-pointer aspect-square hover:border-indigo-400 hover:bg-indigo-50">
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'gallery')} />
                <Plus size={24} className="text-gray-400" />
                <span className="text-xs text-gray-400">إضافة صورة</span>
              </label>
            )}
          </div>
          {marketerData.gallery.length === 0 && !editMode && (
            <p className="py-6 text-sm text-center text-gray-400">لا توجد صور في المعرض بعد</p>
          )}
        </div>

      </div>
    </div>
  );
}
