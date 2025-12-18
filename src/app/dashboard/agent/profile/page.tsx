'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, Users, Award, MapPin, Phone, Mail, Globe, Linkedin, Twitter, Instagram, Calendar, ArrowLeft, User, FileText, Trophy, Star, Briefcase, Shield, Languages, Heart, Building2, Target, Zap, Clock, Flag } from 'lucide-react';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/firebase/auth-provider';
import { supabase } from '@/lib/supabase/config';
import { toast } from 'sonner';

interface AgentData {
  // المعلومات الشخصية
  full_name: string;
  profile_photo: string;
  coverImage: string;
  date_of_birth: string;
  nationality: string;
  current_location: string;

  // المعلومات المهنية
  is_fifa_licensed: boolean;
  license_number: string;
  license_expiry: string;
  years_of_experience: number;
  specialization: string;
  spoken_languages: string[];

  // معلومات الاتصال
  phone: string;
  email: string;
  office_address: string;
  website: string;
  social_media: {
    linkedin: string;
    twitter: string;
    instagram: string;
  };

  // بيانات اللاعبين
  current_players: string[];
  past_players: string[];
  notable_deals: string;

  // المستندات
  id_copy: string;
  license_copy: string;
  player_contracts_sample: string;

  // إحصائيات (للعرض)
  stats: {
    active_players: number;
    completed_deals: number;
    total_commission: number;
    success_rate: number;
  };
}

const initialAgentData: AgentData = {
  // المعلومات الشخصية
  full_name: '',
  profile_photo: '/images/agent-avatar.png',
  coverImage: '/images/hero-1.jpg',
  date_of_birth: '',
  nationality: '',
  current_location: '',

  // المعلومات المهنية
  is_fifa_licensed: false,
  license_number: '',
  license_expiry: '',
  years_of_experience: 0,
  specialization: '',
  spoken_languages: [],

  // معلومات الاتصال
  phone: '',
  email: '',
  office_address: '',
  website: '',
  social_media: {
    linkedin: '',
    twitter: '',
    instagram: ''
  },

  // بيانات اللاعبين
  current_players: [],
  past_players: [],
  notable_deals: '',

  // المستندات
  id_copy: '',
  license_copy: '',
  player_contracts_sample: '',

  // إحصائيات
  stats: {
    active_players: 0,
    completed_deals: 0,
    total_commission: 0,
    success_rate: 0
  }
};

const getSupabaseImageUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  // استخدام رابط Cloudflare المباشر
  const CLOUDFLARE_PUBLIC_URL = 'https://assets.el7lm.com';
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // افتراض أن الملف في bucket 'agent'
  return `${CLOUDFLARE_PUBLIC_URL}/agent/${cleanPath}`;
};

// دالة لإعداد bucket policies
const setupAgentsBucketPolicies = async () => {
  try {
    // Policy للسماح بالقراءة العامة
    const readPolicy = {
      id: 'agents_public_read',
      bucket_id: 'agents',
      name: 'Allow public read access to agents bucket',
      definition: 'true',
      check: 'true',
      action: 'SELECT'
    };

    // Policy للسماح بالرفع للمستخدمين المسجلين
    const uploadPolicy = {
      id: 'agents_authenticated_upload',
      bucket_id: 'agents',
      name: 'Allow authenticated users to upload to their own folder',
      definition: 'auth.uid()::text = (storage.foldername(name))[1]',
      check: 'auth.uid()::text = (storage.foldername(name))[1]',
      action: 'INSERT'
    };

    // Policy للسماح بالتحديث للمستخدمين المسجلين
    const updatePolicy = {
      id: 'agents_authenticated_update',
      bucket_id: 'agents',
      name: 'Allow authenticated users to update their own files',
      definition: 'auth.uid()::text = (storage.foldername(name))[1]',
      check: 'auth.uid()::text = (storage.foldername(name))[1]',
      action: 'UPDATE'
    };

    console.log('Setting up agents bucket policies...');

    // Note: هذه العمليات تتطلب صلاحيات admin في Supabase
    // في البيئة الإنتاجية، يجب إعداد هذه policies من dashboard

  } catch (error) {
    console.error('Error setting up bucket policies:', error);
  }
};

export default function AgentProfilePage() {
  const { userData, user } = useAuth();
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [agentData, setAgentData] = useState<AgentData>(initialAgentData);
  const [uploading, setUploading] = useState(false);
  const [pendingImages, setPendingImages] = useState<{
    profile?: string;
    cover?: string;
  }>({});

  const fetchAgentData = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const agentRef = doc(db, 'agents', user.uid);
      const agentDoc = await getDoc(agentRef);

      let data = {};

      if (agentDoc.exists()) {
        data = agentDoc.data() as any;
      } else {
        const basicData = {
          ...initialAgentData,
          full_name: userData?.name || 'وكيل لاعبين',
          email: userData?.email || '',
          phone: userData?.phone || '',
          createdAt: new Date(),
          updatedAt: new Date(),
          accountType: 'agent',
          isVerified: false,
          isPremium: false
        };

        await setDoc(agentRef, basicData);
        data = basicData;
      }

      const mergedData = {
        ...initialAgentData,
        ...(data as any),
        full_name: (data as any).full_name || (data as any).name || userData?.name || 'وكيل لاعبين',
        phone: (data as any).phone || userData?.phone || '',
        email: (data as any).email || userData?.email || '',
        profile_photo: getSupabaseImageUrl((data as any).profile_photo || initialAgentData.profile_photo),
        coverImage: getSupabaseImageUrl((data as any).coverImage || initialAgentData.coverImage),
        social_media: {
          linkedin: (data as any).social_media?.linkedin || (data as any).linkedin || '',
          twitter: (data as any).social_media?.twitter || (data as any).twitter || '',
          instagram: (data as any).social_media?.instagram || (data as any).instagram || ''
        }
      };
      setAgentData(mergedData);
    } catch (error) {
      console.error('Error fetching agent data:', error);
      toast.error('حدث خطأ أثناء جلب بيانات الوكيل');
    } finally {
      setLoading(false);
    }
  }, [user, userData]);

  useEffect(() => {
    if (user && userData) {
      fetchAgentData();
    }
  }, [user, userData, fetchAgentData]);

  const handleSaveChanges = async () => {
    if (!user?.uid || !agentData) {
      toast.error('لم يتم العثور على بيانات المستخدم');
      return;
    }
    setUploading(true);
    try {
      const agentRef = doc(db, 'agents', user.uid);

      // دمج الصور المعلقة مع البيانات الحالية
      const dataToSave = {
        ...agentData,
        ...(pendingImages.profile && { profile_photo: pendingImages.profile }),
        ...(pendingImages.cover && { coverImage: pendingImages.cover })
      };

      const agentDoc = await getDoc(agentRef);

      if (agentDoc.exists()) {
        await updateDoc(agentRef, dataToSave);
      } else {
        await setDoc(agentRef, {
          ...initialAgentData,
          ...dataToSave,
          createdAt: new Date(),
          updatedAt: new Date(),
          accountType: 'agent',
          isVerified: false,
          isPremium: false
        });
      }

      toast.success('🎉 تم حفظ بيانات الوكيل بنجاح! 💼');
      await fetchAgentData();
      setEditMode(false);
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('حدث خطأ أثناء حفظ التغييرات');
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = async (file: File, type: 'profile' | 'document' | 'cover') => {
    if (!user?.uid) {
      console.error('❌ No user ID found');
      toast.error('لم يتم العثور على معرف المستخدم');
      return;
    }

    console.log('🔄 بدء رفع الصورة:', {
      fileName: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      fileType: file.type,
      uploadType: type,
      userId: user.uid
    });

    try {
      // التحقق من نوع الملف
      if (!file.type.startsWith('image/')) {
        toast.error('يرجى اختيار ملف صورة صالح (PNG, JPG, GIF)');
        return;
      }

      // التحقق من حجم الملف (5MB حد أقصى)
      if (file.size > 5 * 1024 * 1024) {
        const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
        toast.error(`🚫 حجم الصورة كبير جداً (${fileSizeMB} ميجابايت)\n\nالحد الأقصى المسموح: 5 ميجابايت\n\nالرجاء ضغط الصورة باستخدام أي أداة ضغط صور (مثل tinypng.com) ثم حاول رفعها مجدداً.`);
        return;
      }

      setUploading(true);
      toast.info('🔄 جاري رفع الصورة...');

      // إنشاء اسم ملف فريد
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `agent-${type}-${user.uid}-${timestamp}.${fileExt}`;
      const filePath = `${user.uid}/${type}/${fileName}`;

      // استيراد storageManager ديناميكياً
      const { storageManager } = await import('@/lib/storage');

      // الرفع عبر storageManager (يستخدم R2 بشكل أساسي الآن)
      // نستخدم 'agent' كاسم بوكت/مجلد
      const result = await storageManager.upload('agent', filePath, file, {
        upsert: true,
        contentType: file.type
      });

      const publicUrl = result.publicUrl;
      console.log('🔗 رابط الصورة العام:', publicUrl);

      // حفظ في الحالة المعلقة
      setPendingImages(prev => ({
        ...prev,
        [type === 'profile' ? 'profile' : 'cover']: publicUrl
      }));

      toast.success(`✅ تم رفع ${type === 'profile' ? 'الصورة الشخصية' : 'صورة الغلاف'} بنجاح!`);

    } catch (error: any) {
      console.error('💥 خطأ أثناء رفع الصورة:', error);
      toast.error(`خطأ أثناء رفع الصورة: ${error.message || 'خطأ غير معروف'}`);
    } finally {
      setUploading(false);
      console.log('🏁 انتهت عملية الرفع');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-purple-200 rounded-full border-t-purple-600 animate-spin"></div>
          <p className="text-gray-600">جاري تحميل بيانات الوكيل...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 min-h-0 p-6 mx-4 my-6 overflow-auto rounded-lg shadow-inner md:p-10 bg-gray-50" dir="rtl">
      <div className="max-w-4xl px-4 py-10 mx-auto">
        {/* زر العودة */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-6 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          العودة للوحة التحكم
        </button>

        {/* صورة الغلاف */}
        <div className="relative h-48 mb-8 overflow-hidden rounded-2xl">
          <img
            src={pendingImages.cover || agentData?.coverImage || '/images/hero-1.jpg'}
            alt="صورة الغلاف"
            className="object-cover w-full h-full"
          />
          {pendingImages.cover && (
            <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded text-sm">
              📝 معاينة - لم يتم الحفظ بعد
            </div>
          )}
          {editMode && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <label className="p-2 transition rounded-lg cursor-pointer bg-white/90 hover:bg-white">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'cover')}
                />
                {uploading ? '🔄 جاري الرفع...' : 'تغيير صورة الغلاف'}
              </label>
            </div>
          )}
        </div>

        {/* كرت بيانات الوكيل */}
        <div className="flex flex-col items-center gap-8 p-8 mb-8 bg-white shadow-lg rounded-2xl md:flex-row">
          <div className="relative">
            <img
              src={pendingImages.profile || agentData?.profile_photo || '/images/agent-avatar.png'}
              alt="صورة الوكيل"
              className="object-cover w-32 h-32 border-4 border-purple-500 rounded-full shadow"
            />
            {pendingImages.profile && (
              <div className="absolute -top-2 -right-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs">
                📝 معاينة
              </div>
            )}
            {editMode && (
              <label className="absolute inset-0 flex items-center justify-center transition rounded-full cursor-pointer bg-black/50 hover:bg-black/60">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'profile')}
                />
                {uploading ? '🔄 جاري الرفع...' : 'تغيير الصورة'}
              </label>
            )}
          </div>
          <div className="flex-1 text-right">
            <h2 className="mb-2 text-3xl font-bold text-purple-600">{agentData?.full_name || 'وكيل اللاعبين'}</h2>
            <p className="mb-2 text-gray-600">
              {agentData?.is_fifa_licensed ? '🏆 وكيل معتمد من FIFA' : '📋 وكيل لاعبين مرخص محلياً'}
            </p>
            <div className="flex flex-wrap gap-4 mt-2 text-base text-gray-500">
              <span className="flex items-center gap-1"><Flag size={18} /> {agentData?.nationality || 'غير محدد'}</span>
              <span className="flex items-center gap-1"><MapPin size={18} /> {agentData?.current_location || 'غير محدد'}</span>
              <span className="flex items-center gap-1"><Clock size={18} /> {agentData?.years_of_experience || 0} سنة خبرة</span>
            </div>
          </div>
          <button
            className="flex items-center gap-2 px-5 py-2 text-white transition rounded-lg shadow bg-gradient-to-l from-purple-400 to-purple-600 hover:scale-105"
            onClick={() => editMode ? handleSaveChanges() : setEditMode(true)}
          >
            <Edit size={18} /> {editMode ? 'حفظ التغييرات' : 'تعديل البيانات'}
          </button>
        </div>

        {/* كروت الإحصائيات */}
        <div className="grid grid-cols-2 gap-6 mb-8 md:grid-cols-4">
          <div className="flex flex-col items-center p-5 text-white shadow bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl">
            <Users size={28} />
            <div className="mt-2 text-2xl font-bold">{agentData?.stats?.active_players ?? 15}</div>
            <div className="mt-1 text-sm">اللاعبون النشطون</div>
          </div>
          <div className="flex flex-col items-center p-5 text-white shadow bg-gradient-to-br from-green-400 to-green-600 rounded-xl">
            <Trophy size={28} />
            <div className="mt-2 text-2xl font-bold">{agentData?.stats?.completed_deals ?? 42}</div>
            <div className="mt-1 text-sm">الصفقات المكتملة</div>
          </div>
          <div className="flex flex-col items-center p-5 text-white shadow bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl">
            <Zap size={28} />
            <div className="mt-2 text-2xl font-bold">{agentData?.stats?.total_commission ?? 250}K</div>
            <div className="mt-1 text-sm">إجمالي العمولات</div>
          </div>
          <div className="flex flex-col items-center p-5 text-white shadow bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl">
            <Target size={28} />
            <div className="mt-2 text-2xl font-bold">{agentData?.stats?.success_rate ?? 92}%</div>
            <div className="mt-1 text-sm">معدل النجاح</div>
          </div>
        </div>

        {/* المعلومات المهنية */}
        <div className="grid grid-cols-1 gap-8 mb-8 md:grid-cols-2">
          <div className="p-6 bg-white shadow rounded-xl">
            <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-purple-600">
              <Shield size={20} /> المعلومات المهنية
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">حالة الترخيص</span>
                <span className={`font-bold ${agentData?.is_fifa_licensed ? 'text-green-600' : 'text-orange-600'}`}>
                  {agentData?.is_fifa_licensed ? 'معتمد FIFA ✓' : 'محلي 📋'}
                </span>
              </div>
              {agentData?.is_fifa_licensed && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">رقم الرخصة</span>
                    <span className="font-bold">{agentData?.license_number || 'غير محدد'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">انتهاء الرخصة</span>
                    <span className="font-bold">{agentData?.license_expiry || 'غير محدد'}</span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-600">التخصص</span>
                <span className="font-bold">{agentData?.specialization || 'عام'}</span>
              </div>
              {agentData?.spoken_languages && agentData.spoken_languages.length > 0 && (
                <div>
                  <span className="text-gray-600 block mb-2">اللغات:</span>
                  <div className="flex flex-wrap gap-2">
                    {agentData.spoken_languages.map((language, index) => (
                      <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                        {language}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* محفظة اللاعبين */}
          <div className="p-6 bg-white shadow rounded-xl">
            <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-purple-600">
              <Briefcase size={20} /> محفظة اللاعبين
            </h3>
            <div className="space-y-4">
              {agentData?.current_players && agentData.current_players.length > 0 ? (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">اللاعبون الحاليون:</h4>
                  <div className="space-y-2">
                    {agentData.current_players.slice(0, 5).map((player, index) => (
                      <div key={index} className="p-2 bg-gray-50 rounded">
                        <span className="font-medium">{player}</span>
                      </div>
                    ))}
                    {agentData.current_players.length > 5 && (
                      <p className="text-sm text-gray-500">+ {agentData.current_players.length - 5} لاعبين آخرين</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users size={48} className="mx-auto mb-2 opacity-50" />
                  <p>لا توجد بيانات لاعبين حالياً</p>
                  <p className="text-sm">أضف اللاعبين في وضع التعديل</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* الصفقات البارزة */}
        {agentData?.notable_deals && agentData.notable_deals.trim() && (
          <div className="p-6 mb-8 bg-white shadow rounded-xl">
            <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-purple-600">
              <Star size={20} /> الصفقات البارزة
            </h3>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700 leading-relaxed">{agentData.notable_deals}</p>
            </div>
          </div>
        )}

        {/* معلومات التواصل */}
        <div className="p-6 bg-white shadow rounded-xl">
          <h3 className="mb-4 text-lg font-bold text-purple-600">معلومات التواصل</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-gray-700">
                <Phone size={18} /> {agentData?.phone || 'غير محدد'}
              </p>
              <p className="flex items-center gap-2 text-gray-700">
                <Mail size={18} /> {agentData?.email || 'غير محدد'}
              </p>
              <p className="flex items-center gap-2 text-gray-700">
                <Building2 size={18} /> {agentData?.office_address || 'غير محدد'}
              </p>
            </div>
            <div className="space-y-3">
              {agentData?.website && (
                <a href={agentData.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-700 hover:text-purple-600">
                  <Globe size={18} /> الموقع الإلكتروني
                </a>
              )}
              {agentData?.social_media?.linkedin && (
                <a href={agentData.social_media.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
                  <Linkedin size={18} /> LinkedIn
                </a>
              )}
              {agentData?.social_media?.twitter && (
                <a href={agentData.social_media.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
                  <Twitter size={18} /> Twitter
                </a>
              )}
              {agentData?.social_media?.instagram && (
                <a href={agentData.social_media.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-700 hover:text-pink-600">
                  <Instagram size={18} /> Instagram
                </a>
              )}
            </div>
          </div>
        </div>

        {/* نافذة التعديل */}
        {editMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="relative bg-white rounded-xl shadow-lg p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setEditMode(false)}
                className="absolute top-4 left-4 text-gray-400 hover:text-red-500 text-2xl font-bold"
              >
                ×
              </button>
              <h2 className="mb-6 text-xl font-bold text-purple-600">تعديل بيانات الوكيل</h2>

              <div className="space-y-6">

                {/* قسم رفع الصورة */}
                <div className="p-6 bg-purple-50 rounded-lg">
                  <h4 className="mb-4 font-bold text-purple-800">الصور</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">الصورة الشخصية</label>
                      <div className="flex items-center gap-3">
                        <img
                          src={pendingImages.profile || agentData?.profile_photo || '/images/agent-avatar.png'}
                          alt="صورة الوكيل"
                          className="w-12 h-12 object-cover rounded-full"
                        />
                        {pendingImages.profile && (
                          <div className="absolute -top-1 -right-1 bg-yellow-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                            !
                          </div>
                        )}
                        <label className="flex-1 cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'profile')}
                          />
                          <div className="p-2 text-center border border-gray-300 rounded-lg hover:bg-gray-50">
                            {uploading ? 'جاري الرفع...' : 'تغيير الصورة الشخصية'}
                          </div>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">صورة الغلاف</label>
                      {pendingImages.cover && (
                        <div className="relative mb-2">
                          <img
                            src={pendingImages.cover}
                            alt="معاينة صورة الغلاف"
                            className="w-full h-20 object-cover rounded border"
                          />
                          <div className="absolute top-1 right-1 bg-yellow-500 text-white px-2 py-1 rounded text-xs">
                            معاينة
                          </div>
                        </div>
                      )}
                      <label className="block cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'cover')}
                        />
                        <div className="p-2 text-center border border-gray-300 rounded-lg hover:bg-gray-50">
                          {uploading ? 'جاري الرفع...' : 'تغيير صورة الغلاف'}
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* المعلومات الشخصية */}
                <div className="p-6 bg-blue-50 rounded-lg">
                  <h4 className="mb-4 font-bold text-blue-800">المعلومات الشخصية</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل *</label>
                      <input
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        placeholder="الاسم الثلاثي كاملاً"
                        value={agentData?.full_name}
                        onChange={(e) => setAgentData({ ...agentData, full_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الميلاد *</label>
                      <input
                        type="date"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        value={agentData?.date_of_birth}
                        onChange={(e) => setAgentData({ ...agentData, date_of_birth: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">الجنسية *</label>
                      <select
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        value={agentData?.nationality}
                        onChange={(e) => setAgentData({ ...agentData, nationality: e.target.value })}
                      >
                        <option value="">اختر الجنسية</option>
                        <option value="السعودية">السعودية</option>
                        <option value="الإمارات">الإمارات</option>
                        <option value="قطر">قطر</option>
                        <option value="الكويت">الكويت</option>
                        <option value="البحرين">البحرين</option>
                        <option value="عمان">عمان</option>
                        <option value="الأردن">الأردن</option>
                        <option value="مصر">مصر</option>
                        <option value="المغرب">المغرب</option>
                        <option value="تونس">تونس</option>
                        <option value="الجزائر">الجزائر</option>
                        <option value="العراق">العراق</option>
                        <option value="سوريا">سوريا</option>
                        <option value="لبنان">لبنان</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">الموقع الحالي *</label>
                      <input
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        placeholder="الدولة - المدينة"
                        value={agentData?.current_location}
                        onChange={(e) => setAgentData({ ...agentData, current_location: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* المعلومات المهنية */}
                <div className="p-6 bg-green-50 rounded-lg">
                  <h4 className="mb-4 font-bold text-green-800">المعلومات المهنية</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">هل لديك رخصة FIFA؟ *</label>
                      <select
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        value={agentData?.is_fifa_licensed ? 'true' : 'false'}
                        onChange={(e) => setAgentData({ ...agentData, is_fifa_licensed: e.target.value === 'true' })}
                      >
                        <option value="false">لا</option>
                        <option value="true">نعم</option>
                      </select>
                    </div>
                    {agentData?.is_fifa_licensed && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">رقم الرخصة</label>
                          <input
                            type="text"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            placeholder="رقم رخصة FIFA"
                            value={agentData?.license_number}
                            onChange={(e) => setAgentData({ ...agentData, license_number: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ انتهاء الرخصة</label>
                          <input
                            type="date"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            value={agentData?.license_expiry}
                            onChange={(e) => setAgentData({ ...agentData, license_expiry: e.target.value })}
                          />
                        </div>
                      </>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">سنوات الخبرة *</label>
                      <input
                        type="number"
                        min="0"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        placeholder="عدد سنوات الخبرة"
                        value={agentData?.years_of_experience}
                        onChange={(e) => setAgentData({ ...agentData, years_of_experience: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">التخصص *</label>
                      <select
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        value={agentData?.specialization}
                        onChange={(e) => setAgentData({ ...agentData, specialization: e.target.value })}
                      >
                        <option value="">اختر التخصص</option>
                        <option value="لاعبين محليين">لاعبين محليين</option>
                        <option value="لاعبين دوليين">لاعبين دوليين</option>
                        <option value="شباب وناشئين">شباب وناشئين</option>
                        <option value="لاعبين محترفين">لاعبين محترفين</option>
                        <option value="عام">عام</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">اللغات المتحدثة *</label>
                      <input
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        placeholder="العربية, الإنجليزية, الفرنسية (افصل بفاصلة)"
                        value={agentData?.spoken_languages?.join(', ')}
                        onChange={(e) => setAgentData({ ...agentData, spoken_languages: e.target.value.split(',').map(lang => lang.trim()).filter(lang => lang) })}
                      />
                    </div>
                  </div>
                </div>

                {/* معلومات الاتصال */}
                <div className="p-6 bg-yellow-50 rounded-lg">
                  <h4 className="mb-4 font-bold text-yellow-800">معلومات الاتصال</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف *</label>
                      <input
                        type="tel"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        placeholder="+966501234567"
                        value={agentData?.phone}
                        onChange={(e) => setAgentData({ ...agentData, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني *</label>
                      <input
                        type="email"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        placeholder="agent@example.com"
                        value={agentData?.email}
                        onChange={(e) => setAgentData({ ...agentData, email: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">عنوان المكتب</label>
                      <input
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        placeholder="عنوان المكتب (اختياري)"
                        value={agentData?.office_address}
                        onChange={(e) => setAgentData({ ...agentData, office_address: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">الموقع الإلكتروني</label>
                      <input
                        type="url"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        placeholder="https://agent-website.com"
                        value={agentData?.website}
                        onChange={(e) => setAgentData({ ...agentData, website: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
                      <input
                        type="url"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        placeholder="https://linkedin.com/in/agent"
                        value={agentData?.social_media?.linkedin}
                        onChange={(e) => setAgentData({ ...agentData, social_media: { ...agentData.social_media, linkedin: e.target.value } })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Twitter</label>
                      <input
                        type="url"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        placeholder="https://twitter.com/agent"
                        value={agentData?.social_media?.twitter}
                        onChange={(e) => setAgentData({ ...agentData, social_media: { ...agentData.social_media, twitter: e.target.value } })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                      <input
                        type="url"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        placeholder="https://instagram.com/agent"
                        value={agentData?.social_media?.instagram}
                        onChange={(e) => setAgentData({ ...agentData, social_media: { ...agentData.social_media, instagram: e.target.value } })}
                      />
                    </div>
                  </div>
                </div>

                {/* بيانات اللاعبين */}
                <div className="p-6 bg-red-50 rounded-lg">
                  <h4 className="mb-4 font-bold text-red-800">محفظة اللاعبين</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">اللاعبون الحاليون</label>
                      <input
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        placeholder="أحمد محمد, محمد أحمد, علي خالد (افصل بفاصلة)"
                        value={agentData?.current_players?.join(', ')}
                        onChange={(e) => setAgentData({ ...agentData, current_players: e.target.value.split(',').map(player => player.trim()).filter(player => player) })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">اللاعبون السابقون</label>
                      <input
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        placeholder="أسماء اللاعبين السابقين (افصل بفاصلة)"
                        value={agentData?.past_players?.join(', ')}
                        onChange={(e) => setAgentData({ ...agentData, past_players: e.target.value.split(',').map(player => player.trim()).filter(player => player) })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">الصفقات البارزة</label>
                      <textarea
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        rows={4}
                        placeholder="وصف للصفقات البارزة والانتقالات المهمة..."
                        value={agentData?.notable_deals}
                        onChange={(e) => setAgentData({ ...agentData, notable_deals: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setEditMode(false);
                    setPendingImages({});
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSaveChanges}
                  disabled={uploading}
                  className="px-4 py-2 text-white rounded-lg bg-gradient-to-l from-purple-400 to-purple-600 hover:opacity-90 disabled:opacity-50"
                >
                  {uploading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
} 
