'use client';
import { useAuth } from '@/lib/firebase/auth-provider';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, Users, School, Trophy, User, MapPin, Phone, Mail, Globe, Facebook, Twitter, Instagram, Calendar, ArrowLeft, Award, Building2, UserCircle2, Plus, GraduationCap, BookOpen, Target, Activity, Star, FileText } from 'lucide-react';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/config';
import { db } from '@/lib/firebase/config';

interface AcademyData {
  // البيانات الأساسية
  academy_name: string;
  description: string;
  logo: string;
  coverImage: string;
  founding_year: string;
  academy_type: string;
  is_federation_approved: boolean;
  license_number: string;
  registration_date: string;

  // معلومات الاتصال
  country: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  social_media: {
    facebook: string;
    instagram: string;
    twitter: string;
  };

  // المعلومات الفنية
  age_groups: string[];
  sports_facilities: string[];
  number_of_coaches: number;
  training_programs: string;
  achievements: string;

  // المستندات
  license_file: string;
  facility_photos: string[];

  // بيانات الإدارة
  director: {
    name: string;
    photo: string;
    bio: string;
    contact: string;
  };
  technical_director: {
    name: string;
    photo: string;
    license: string;
    experience: string;
  };

  // الفروع
  main_branch: {
    address: string;
    map_link: string;
    photos: string[];
  };
  branches: {
    name: string;
    address: string;
    contact: string;
  }[];

  // معلومات إضافية
  academy_goals: string;
  success_stories: string[];
  partnerships: string[];

  // إحصائيات (للعرض)
  stats: {
    students: number;
    programs: number;
    coaches: number;
    graduates: number;
  };
}

const initialAcademyData: AcademyData = {
  // البيانات الأساسية
  academy_name: '',
  description: '',
  logo: '/images/club-avatar.png',
  coverImage: '/images/hero-1.jpg',
  founding_year: '',
  academy_type: '',
  is_federation_approved: false,
  license_number: '',
  registration_date: '',

  // معلومات الاتصال
  country: '',
  city: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  social_media: {
    facebook: '',
    instagram: '',
    twitter: ''
  },

  // المعلومات الفنية
  age_groups: [],
  sports_facilities: [],
  number_of_coaches: 0,
  training_programs: '',
  achievements: '',

  // المستندات
  license_file: '',
  facility_photos: [],

  // بيانات الإدارة
  director: {
    name: '',
    photo: '/images/club-avatar.png',
    bio: '',
    contact: ''
  },
  technical_director: {
    name: '',
    photo: '/images/club-avatar.png',
    license: '',
    experience: ''
  },

  // الفروع
  main_branch: {
    address: '',
    map_link: '',
    photos: []
  },
  branches: [],

  // معلومات إضافية
  academy_goals: '',
  success_stories: [],
  partnerships: [],

  // إحصائيات (للعرض)
  stats: {
    students: 0,
    programs: 0,
    coaches: 0,
    graduates: 0
  }
};

const getSupabaseImageUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  // استخدام رابط Cloudflare المباشر
  const CLOUDFLARE_PUBLIC_URL = 'https://assets.el7lm.com';
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // افتراض أن الملف في bucket 'academy'
  return `${CLOUDFLARE_PUBLIC_URL}/academy/${cleanPath}`;
};

export default function AcademyProfilePage() {
  const { userData, user } = useAuth();
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [academyData, setAcademyData] = useState<AcademyData>(initialAcademyData);
  const [uploading, setUploading] = useState(false);

  const fetchAcademyData = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const academyRef = doc(db, 'academies', user.uid);
      const academyDoc = await getDoc(academyRef);

      let data = {};

      if (academyDoc.exists()) {
        data = academyDoc.data();
      } else {
        // إنشاء مستند أساسي إذا لم يكن موجوداً
        const basicData = {
          ...initialAcademyData,
          academy_name: userData?.name || 'أكاديمية جديدة',
          email: userData?.email || '',
          phone: userData?.phone || '',
          createdAt: new Date(),
          updatedAt: new Date(),
          accountType: 'academy',
          isVerified: false,
          isPremium: false
        };

        await setDoc(academyRef, basicData);
        data = basicData;
      }

      const mergedData = {
        ...initialAcademyData,
        ...data,
        academy_name: ((data as any).academy_name && (data as any).academy_name.trim())
          ? (data as any).academy_name
          : ((data as any).name && (data as any).name.trim())
            ? (data as any).name
            : (userData?.name || 'أكاديمية جديدة'),
        description: (data as any).description || (data as any).bio || '',
        phone: ((data as any).phone && (data as any).phone.trim()) ? (data as any).phone : (userData?.phone || ''),
        email: ((data as any).email && (data as any).email.trim()) ? (data as any).email : (userData?.email || ''),
        coverImage: getSupabaseImageUrl((data as any).coverImage || initialAcademyData.coverImage),
        logo: getSupabaseImageUrl((data as any).logo || initialAcademyData.logo),
        // دمج وسائل التواصل الاجتماعي إذا كانت موجودة في البنية القديمة
        social_media: {
          facebook: (data as any).social_media?.facebook || (data as any).facebook || '',
          instagram: (data as any).social_media?.instagram || (data as any).instagram || '',
          twitter: (data as any).social_media?.twitter || (data as any).twitter || ''
        },
        // دمج البيانات القديمة مع الجديدة
        founding_year: (data as any).founding_year || (data as any).established || '',
        license_number: (data as any).license_number || (data as any).license || '',
        achievements: (data as any).achievements || (Array.isArray((data as any).achievements) ? (data as any).achievements.map((a: any) => a.title || a).join(', ') : ''),
        training_programs: (data as any).training_programs || (data as any).description || '',
        // تحويل البيانات القديمة للبنية الجديدة
        director: {
          name: (data as any).director?.name || (data as any).staff?.academicDirector?.name || '',
          photo: getSupabaseImageUrl((data as any).director?.photo || (data as any).staff?.academicDirector?.image || '/images/club-avatar.png'),
          bio: (data as any).director?.bio || (data as any).staff?.academicDirector?.qualification || '',
          contact: (data as any).director?.contact || ''
        },
        technical_director: {
          name: (data as any).technical_director?.name || (data as any).staff?.headCoach?.name || '',
          photo: getSupabaseImageUrl((data as any).technical_director?.photo || (data as any).staff?.headCoach?.image || '/images/club-avatar.png'),
          license: (data as any).technical_director?.license || '',
          experience: (data as any).technical_director?.experience || (data as any).staff?.headCoach?.experience || ''
        }
      };
      setAcademyData(mergedData);
    } catch (error) {
      console.error('Error fetching academy data:', error);
      toast.error('حدث خطأ أثناء جلب بيانات الأكاديمية');
    } finally {
      setLoading(false);
    }
  }, [user, userData]);

  useEffect(() => {
    if (user && userData) {
      fetchAcademyData();
    }
  }, [user, userData, fetchAcademyData]);

  const handleSaveChanges = async () => {
    if (!user?.uid || !academyData) {
      toast.error('لم يتم العثور على بيانات المستخدم');
      return;
    }
    setUploading(true);
    try {
      const academyRef = doc(db, 'academies', user.uid);

      // التحقق من وجود المستند أولاً
      const academyDoc = await getDoc(academyRef);

      if (academyDoc.exists()) {
        // المستند موجود - نحدثه
        await updateDoc(academyRef, { ...academyData } as any);
      } else {
        // المستند غير موجود - ننشئه
        await setDoc(academyRef, {
          ...initialAcademyData,
          ...academyData,
          createdAt: new Date(),
          updatedAt: new Date(),
          accountType: 'academy',
          isVerified: false,
          isPremium: false
        });
      }

      toast.success('🎉 تم حفظ بيانات الأكاديمية بنجاح! 🎓');
      await fetchAcademyData();
      setEditMode(false);
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('حدث خطأ أثناء حفظ التغييرات');
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = async (file: File, type: 'logo' | 'cover' | 'gallery') => {
    if (!user?.uid) return;
    try {
      if (!file.type.startsWith('image/')) {
        toast.error('يرجى اختيار ملف صورة صالح');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
        toast.error(`🚫 حجم الصورة كبير جداً (${fileSizeMB} ميجابايت)\n\nالحد الأقصى المسموح: 5 ميجابايت\n\nالرجاء ضغط الصورة باستخدام أي أداة ضغط صور (مثل tinypng.com) ثم حاول رفعها مجدداً.`);
        return;
      }

      setUploading(true);
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${timestamp}.${fileExt}`;
      const filePath = `${user.uid}/${type}/${fileName}`;

      // استيراد storageManager ديناميكياً لتجنب مشاكل الـ imports الدائرية أو الـ server/client
      const { storageManager } = await import('@/lib/storage');

      // استخدام 'academy' كاسم للبوكت
      const result = await storageManager.upload('academy', filePath, file, {
        upsert: true,
        contentType: file.type
      });

      const publicUrl = result.publicUrl;

      let updatedData = { ...academyData } as any;

      if (type === 'gallery') {
        updatedData.gallery = [...((academyData as any).gallery || []), publicUrl];
      } else if (type === 'cover') {
        updatedData.coverImage = publicUrl;
      } else if (type === 'logo') {
        updatedData.logo = publicUrl;
      }

      setAcademyData(updatedData);
      toast.success('✅ تم رفع الصورة بنجاح');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('حدث خطأ أثناء رفع الصورة');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-orange-200 rounded-full border-t-orange-600 animate-spin"></div>
          <p className="text-gray-600">جاري تحميل بيانات الأكاديمية...</p>
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
            src={academyData?.coverImage || '/images/hero-1.jpg'}
            alt="صورة الغلاف"
            className="object-cover w-full h-full"
          />
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

        {/* كرت بيانات الأكاديمية */}
        <div className="flex flex-col items-center gap-8 p-8 mb-8 bg-white shadow-lg rounded-2xl md:flex-row">
          <div className="relative">
            <img
              src={academyData?.logo || '/images/club-avatar.png'}
              alt="شعار الأكاديمية"
              className="object-cover w-32 h-32 border-4 border-orange-500 rounded-full shadow"
            />
            {editMode && (
              <label className="absolute inset-0 flex items-center justify-center transition rounded-full cursor-pointer bg-black/50 hover:bg-black/60">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logo')}
                />
                {uploading ? '🔄 جاري الرفع...' : 'تغيير الشعار'}
              </label>
            )}
          </div>
          <div className="flex-1 text-right">
            <h2 className="mb-2 text-3xl font-bold text-orange-600">{academyData?.academy_name || 'أكاديمية التدريب الرياضي'}</h2>
            <p className="mb-2 text-gray-600">{academyData?.description || 'أكاديمية رياضية متخصصة في تطوير المواهب وإعداد الجيل القادم من النجوم'}</p>
            <div className="flex flex-wrap gap-4 mt-2 text-base text-gray-500">
              <span className="flex items-center gap-1"><MapPin size={18} /> {academyData?.city || 'الرياض'}, {academyData?.country || 'السعودية'}</span>
              <span className="flex items-center gap-1"><Calendar size={18} /> تأسست {academyData?.founding_year || '2020'}</span>
              <span className="flex items-center gap-1"><School size={18} /> ترخيص رقم: {academyData?.license_number || 'AC-001'}</span>
            </div>
          </div>
          <button
            className="flex items-center gap-2 px-5 py-2 text-white transition rounded-lg shadow bg-gradient-to-l from-orange-400 to-orange-600 hover:scale-105"
            onClick={() => editMode ? handleSaveChanges() : setEditMode(true)}
          >
            <Edit size={18} /> {editMode ? 'حفظ التغييرات' : 'تعديل البيانات'}
          </button>
        </div>

        {/* نبذة عن الأكاديمية */}
        {academyData?.description && academyData.description.trim() && (
          <div className="p-6 mb-8 bg-white shadow rounded-xl">
            <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-orange-600">
              <FileText size={20} /> نبذة عن الأكاديمية
            </h3>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700 leading-relaxed text-justify">{academyData.description}</p>
            </div>
          </div>
        )}

        {/* كروت الإحصائيات */}
        <div className="grid grid-cols-2 gap-6 mb-8 md:grid-cols-4">
          <div className="flex flex-col items-center p-5 text-white shadow bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl">
            <Users size={28} />
            <div className="mt-2 text-2xl font-bold">{academyData?.stats?.students ?? 150}</div>
            <div className="mt-1 text-sm">اللاعبين</div>
          </div>
          <div className="flex flex-col items-center p-5 text-white shadow bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl">
            <BookOpen size={28} />
            <div className="mt-2 text-2xl font-bold">{academyData?.stats?.programs ?? 8}</div>
            <div className="mt-1 text-sm">البرامج التدريبية</div>
          </div>
          <div className="flex flex-col items-center p-5 text-white shadow bg-gradient-to-br from-green-400 to-green-600 rounded-xl">
            <GraduationCap size={28} />
            <div className="mt-2 text-2xl font-bold">{academyData?.stats?.coaches ?? 15}</div>
            <div className="mt-1 text-sm">المدربون</div>
          </div>
          <div className="flex flex-col items-center p-5 text-white shadow bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl">
            <Trophy size={28} />
            <div className="mt-2 text-2xl font-bold">{academyData?.stats?.graduates ?? 200}</div>
            <div className="mt-1 text-sm">الخريجون</div>
          </div>
        </div>

        {/* المرافق والبرامج */}
        <div className="grid grid-cols-1 gap-8 mb-8 md:grid-cols-2">
          <div className="p-6 bg-white shadow rounded-xl">
            <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-orange-600">
              <Building2 size={20} /> المرافق والوسائل المتاحة
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">عدد المدربين</span>
                <span className="font-bold">{academyData?.number_of_coaches ?? 15}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">نوع الرياضة</span>
                <span className="font-bold">{academyData?.academy_type || 'كرة القدم'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">معتمدة من الاتحاد</span>
                <span className={`font-bold ${academyData?.is_federation_approved ? 'text-green-600' : 'text-red-600'}`}>
                  {academyData?.is_federation_approved ? 'نعم ✓' : 'لا ✗'}
                </span>
              </div>
              {academyData?.sports_facilities && academyData.sports_facilities.length > 0 && (
                <div>
                  <span className="text-gray-600 block mb-2">المرافق الرياضية:</span>
                  <div className="flex flex-wrap gap-2">
                    {academyData.sports_facilities.map((facility, index) => (
                      <span key={index} className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                        {facility}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* البرامج والفئات العمرية */}
          <div className="p-6 bg-white shadow rounded-xl">
            <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-orange-600">
              <Target size={20} /> البرامج والفئات العمرية
            </h3>
            <div className="space-y-3">
              {academyData?.age_groups && academyData.age_groups.length > 0 ? (
                academyData.age_groups.map((ageGroup, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">فئة {ageGroup}</h4>
                      <span className="text-green-600 font-bold">{ageGroup}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">برنامج تدريبي متخصص للفئة العمرية</p>
                  </div>
                ))
              ) : (
                <>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">برنامج الناشئين</h4>
                      <span className="text-green-600 font-bold">6-12 سنة</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">تدريب أساسي لتطوير المهارات الأساسية</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">برنامج المتقدمين</h4>
                      <span className="text-green-600 font-bold">13-18 سنة</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">تدريب متقدم للمواهب الواعدة</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">برنامج النخبة</h4>
                      <span className="text-green-600 font-bold">16+ سنة</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">إعداد احترافي للمستوى العالي</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* الكادر التدريبي */}
        <div className="grid grid-cols-1 gap-8 mb-8 md:grid-cols-2">
          <div className="p-6 bg-white shadow rounded-xl">
            <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-orange-600">
              <UserCircle2 size={20} /> المدير الفني
            </h3>
            <div className="flex items-center gap-4">
              <img
                src={academyData?.technical_director?.photo || '/images/club-avatar.png'}
                alt="صورة المدير الفني"
                className="object-cover w-20 h-20 rounded-full"
              />
              <div className="flex-1">
                <h4 className="font-bold">{academyData?.technical_director?.name || 'أحمد محمد'}</h4>
                <div className="space-y-1 text-gray-600">
                  <p><strong>الخبرة:</strong> {academyData?.technical_director?.experience || '10 سنوات'}</p>
                  <p><strong>الرخصة:</strong> {academyData?.technical_director?.license || 'رخصة A'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white shadow rounded-xl">
            <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-orange-600">
              <UserCircle2 size={20} /> المدير العام
            </h3>
            <div className="flex items-center gap-4">
              <img
                src={academyData?.director?.photo || '/images/club-avatar.png'}
                alt="صورة المدير العام"
                className="object-cover w-20 h-20 rounded-full"
              />
              <div className="flex-1">
                <h4 className="font-bold">{academyData?.director?.name || 'سارة أحمد'}</h4>
                <div className="space-y-1 text-gray-600">
                  <p><strong>المؤهل:</strong> {academyData?.director?.bio || 'ماجستير في علوم الرياضة'}</p>
                  <p><strong>الاتصال:</strong> {academyData?.director?.contact || 'غير متاح'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* الإنجازات والجوائز */}
        <div className="p-6 mb-8 bg-white shadow rounded-xl">
          <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-orange-600">
            <Award size={20} /> الإنجازات والجوائز
          </h3>

          {academyData?.achievements && (typeof academyData.achievements === 'string' ? academyData.achievements.trim() : String(academyData.achievements)) ? (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700 leading-relaxed">
                {typeof academyData.achievements === 'string'
                  ? academyData.achievements
                  : Array.isArray(academyData.achievements)
                    ? (academyData.achievements as any[]).map((a: any) => typeof a === 'string' ? a : a.title || a).join(', ')
                    : String(academyData.achievements)
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="p-4 text-center bg-gray-50 rounded-lg">
                <Star className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                <h4 className="font-bold">أفضل أكاديمية</h4>
                <p className="text-sm text-gray-600">2023</p>
              </div>
              <div className="p-4 text-center bg-gray-50 rounded-lg">
                <Trophy className="w-8 h-8 mx-auto mb-2 text-gold-500" />
                <h4 className="font-bold">بطولة الأكاديميات</h4>
                <p className="text-sm text-gray-600">2022</p>
              </div>
              <div className="p-4 text-center bg-gray-50 rounded-lg">
                <Award className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <h4 className="font-bold">أكاديمية معتمدة</h4>
                <p className="text-sm text-gray-600">اتحاد كرة القدم</p>
              </div>
              <div className="p-4 text-center bg-gray-50 rounded-lg">
                <Activity className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <h4 className="font-bold">معدل نجاح</h4>
                <p className="text-sm text-gray-600">95%</p>
              </div>
            </div>
          )}

          {/* قصص النجاح */}
          {academyData?.success_stories && academyData.success_stories.length > 0 && (
            <div className="mt-6">
              <h4 className="font-bold text-orange-600 mb-3">قصص النجاح:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {academyData.success_stories.map((story, index) => (
                  <div key={index} className="p-3 border-l-4 border-orange-400 bg-orange-50">
                    <p className="text-sm text-gray-700">{story}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* الشراكات */}
          {academyData?.partnerships && academyData.partnerships.length > 0 && (
            <div className="mt-6">
              <h4 className="font-bold text-orange-600 mb-3">الشراكات:</h4>
              <div className="flex flex-wrap gap-2">
                {academyData.partnerships.map((partner, index) => (
                  <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {partner}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* معلومات التواصل */}
        <div className="p-6 bg-white shadow rounded-xl">
          <h3 className="mb-4 text-lg font-bold text-orange-600">معلومات التواصل</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-gray-700">
                <Phone size={18} /> {academyData?.phone || '+966 50 123 4567'}
              </p>
              <p className="flex items-center gap-2 text-gray-700">
                <Mail size={18} /> {academyData?.email || 'academy@example.com'}
              </p>
              <p className="flex items-center gap-2 text-gray-700">
                <MapPin size={18} /> {academyData?.address || 'الرياض، المملكة العربية السعودية'}
              </p>
            </div>
            <div className="space-y-3">
              <a href={academyData?.website || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-700 hover:text-orange-600">
                <Globe size={18} /> الموقع الإلكتروني
              </a>
              <a href={academyData?.social_media?.facebook || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
                <Facebook size={18} /> Facebook
              </a>
              <a href={academyData?.social_media?.twitter || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
                <Twitter size={18} /> Twitter
              </a>
              <a href={academyData?.social_media?.instagram || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-700 hover:text-pink-600">
                <Instagram size={18} /> Instagram
              </a>
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
              <h2 className="mb-6 text-xl font-bold text-orange-600">تعديل بيانات الأكاديمية</h2>

              {/* نموذج التعديل الشامل */}
              <div className="space-y-6">

                {/* قسم رفع الصور */}
                <div className="p-6 bg-orange-50 rounded-lg">
                  <h4 className="mb-4 font-bold text-orange-800">رفع الصور</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">شعار الأكاديمية</label>
                      <div className="flex items-center gap-3">
                        <img
                          src={academyData?.logo || '/images/club-avatar.png'}
                          alt="شعار الأكاديمية"
                          className="w-12 h-12 object-cover rounded-full"
                        />
                        <label className="flex-1 cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logo')}
                          />
                          <div className="p-2 text-center border border-gray-300 rounded-lg hover:bg-gray-50">
                            {uploading ? 'جاري الرفع...' : 'تغيير الشعار'}
                          </div>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">صورة الغلاف</label>
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

                {/* القسم الأول: البيانات الأساسية */}
                <div className="p-6 bg-blue-50 rounded-lg">
                  <h4 className="mb-4 font-bold text-blue-800">البيانات الأساسية</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">اسم الأكاديمية *</label>
                      <input
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="اسم الأكاديمية الرسمي"
                        value={academyData?.academy_name}
                        onChange={(e) => setAcademyData({ ...academyData, academy_name: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">نبذة عن الأكاديمية</label>
                      <textarea
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        rows={4}
                        placeholder="نبذة مختصرة عن الأكاديمية، رؤيتها، وأهدافها..."
                        value={academyData?.description}
                        onChange={(e) => setAcademyData({ ...academyData, description: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">سنة التأسيس *</label>
                      <input
                        type="number"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="2020"
                        value={academyData?.founding_year}
                        onChange={(e) => setAcademyData({ ...academyData, founding_year: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">نوع الأكاديمية *</label>
                      <select
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        value={academyData?.academy_type}
                        onChange={(e) => setAcademyData({ ...academyData, academy_type: e.target.value })}
                      >
                        <option value="">اختر نوع الرياضة</option>
                        <option value="كرة قدم">كرة قدم</option>
                        <option value="كرة سلة">كرة سلة</option>
                        <option value="كرة طائرة">كرة طائرة</option>
                        <option value="سباحة">سباحة</option>
                        <option value="جمباز">جمباز</option>
                        <option value="ألعاب قوى">ألعاب قوى</option>
                        <option value="تنس">تنس</option>
                        <option value="متعددة الرياضات">متعددة الرياضات</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">معتمدة من الاتحاد؟ *</label>
                      <select
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        value={academyData?.is_federation_approved ? 'true' : 'false'}
                        onChange={(e) => setAcademyData({ ...academyData, is_federation_approved: e.target.value === 'true' })}
                      >
                        <option value="false">لا</option>
                        <option value="true">نعم</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">رقم الرخصة</label>
                      <input
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="رقم الرخصة الرسمية"
                        value={academyData?.license_number}
                        onChange={(e) => setAcademyData({ ...academyData, license_number: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ التسجيل</label>
                      <input
                        type="date"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        value={academyData?.registration_date}
                        onChange={(e) => setAcademyData({ ...academyData, registration_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* القسم الثاني: معلومات الاتصال */}
                <div className="p-6 bg-green-50 rounded-lg">
                  <h4 className="mb-4 font-bold text-green-800">معلومات الاتصال</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">الدولة *</label>
                      <select
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        value={academyData?.country}
                        onChange={(e) => setAcademyData({ ...academyData, country: e.target.value })}
                      >
                        <option value="">اختر الدولة</option>
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
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">المدينة *</label>
                      <input
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="اسم المدينة"
                        value={academyData?.city}
                        onChange={(e) => setAcademyData({ ...academyData, city: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">العنوان التفصيلي *</label>
                      <input
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="العنوان الكامل للأكاديمية"
                        value={academyData?.address}
                        onChange={(e) => setAcademyData({ ...academyData, address: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف *</label>
                      <input
                        type="tel"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="+966501234567"
                        value={academyData?.phone}
                        onChange={(e) => setAcademyData({ ...academyData, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني *</label>
                      <input
                        type="email"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="academy@example.com"
                        value={academyData?.email}
                        onChange={(e) => setAcademyData({ ...academyData, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">الموقع الإلكتروني</label>
                      <input
                        type="url"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="https://academy.com"
                        value={academyData?.website}
                        onChange={(e) => setAcademyData({ ...academyData, website: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Facebook</label>
                      <input
                        type="url"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="https://facebook.com/academy"
                        value={academyData?.social_media?.facebook}
                        onChange={(e) => setAcademyData({ ...academyData, social_media: { ...academyData.social_media, facebook: e.target.value } })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                      <input
                        type="url"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="https://instagram.com/academy"
                        value={academyData?.social_media?.instagram}
                        onChange={(e) => setAcademyData({ ...academyData, social_media: { ...academyData.social_media, instagram: e.target.value } })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Twitter</label>
                      <input
                        type="url"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="https://twitter.com/academy"
                        value={academyData?.social_media?.twitter}
                        onChange={(e) => setAcademyData({ ...academyData, social_media: { ...academyData.social_media, twitter: e.target.value } })}
                      />
                    </div>
                  </div>
                </div>

                {/* القسم الثالث: المعلومات الفنية */}
                <div className="p-6 bg-purple-50 rounded-lg">
                  <h4 className="mb-4 font-bold text-purple-800">المعلومات الفنية</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">عدد المدربين *</label>
                      <input
                        type="number"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="15"
                        value={academyData?.number_of_coaches}
                        onChange={(e) => setAcademyData({ ...academyData, number_of_coaches: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">الفئات العمرية *</label>
                      <input
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="U8, U10, U12, U14, U16, U18 (افصل بفاصلة)"
                        value={academyData?.age_groups?.join(', ')}
                        onChange={(e) => setAcademyData({ ...academyData, age_groups: e.target.value.split(',').map(item => item.trim()).filter(item => item) })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">المرافق الرياضية *</label>
                      <input
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="ملعب, صالة, مسبح (افصل بفاصلة)"
                        value={academyData?.sports_facilities?.join(', ')}
                        onChange={(e) => setAcademyData({ ...academyData, sports_facilities: e.target.value.split(',').map(item => item.trim()).filter(item => item) })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">وصف البرامج التدريبية</label>
                      <textarea
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        rows={4}
                        placeholder="وصف مفصل للبرامج التدريبية المقدمة..."
                        value={academyData?.training_programs}
                        onChange={(e) => setAcademyData({ ...academyData, training_programs: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">إنجازات الأكاديمية</label>
                      <textarea
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        rows={3}
                        placeholder="أهم الإنجازات والجوائز..."
                        value={academyData?.achievements}
                        onChange={(e) => setAcademyData({ ...academyData, achievements: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* القسم الرابع: بيانات الإدارة */}
                <div className="p-6 bg-orange-50 rounded-lg">
                  <h4 className="mb-4 font-bold text-orange-800">بيانات الإدارة</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* المدير العام */}
                    <div className="space-y-4">
                      <h5 className="font-semibold text-orange-700">المدير العام / المؤسس</h5>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل *</label>
                        <input
                          type="text"
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          placeholder="اسم المدير العام"
                          value={academyData?.director?.name}
                          onChange={(e) => setAcademyData({ ...academyData, director: { ...academyData.director, name: e.target.value } })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">نبذة عن الخبرات</label>
                        <textarea
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          rows={3}
                          placeholder="الخبرات والإنجازات..."
                          value={academyData?.director?.bio}
                          onChange={(e) => setAcademyData({ ...academyData, director: { ...academyData.director, bio: e.target.value } })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">اتصال مباشر</label>
                        <input
                          type="text"
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          placeholder="رقم الهاتف أو البريد الإلكتروني"
                          value={academyData?.director?.contact}
                          onChange={(e) => setAcademyData({ ...academyData, director: { ...academyData.director, contact: e.target.value } })}
                        />
                      </div>
                    </div>

                    {/* المدير الفني */}
                    <div className="space-y-4">
                      <h5 className="font-semibold text-orange-700">المدير الفني / رئيس الجهاز التدريبي</h5>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل *</label>
                        <input
                          type="text"
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          placeholder="اسم المدير الفني"
                          value={academyData?.technical_director?.name}
                          onChange={(e) => setAcademyData({ ...academyData, technical_director: { ...academyData.technical_director, name: e.target.value } })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">رقم الرخصة التدريبية</label>
                        <input
                          type="text"
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          placeholder="رقم الرخصة"
                          value={academyData?.technical_director?.license}
                          onChange={(e) => setAcademyData({ ...academyData, technical_director: { ...academyData.technical_director, license: e.target.value } })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">الخبرات السابقة</label>
                        <textarea
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          rows={3}
                          placeholder="الأندية السابقة، سنوات الخبرة..."
                          value={academyData?.technical_director?.experience}
                          onChange={(e) => setAcademyData({ ...academyData, technical_director: { ...academyData.technical_director, experience: e.target.value } })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* القسم الخامس: معلومات إضافية */}
                <div className="p-6 bg-gray-50 rounded-lg">
                  <h4 className="mb-4 font-bold text-gray-800">معلومات إضافية لتعزيز الثقة</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">رؤية وأهداف الأكاديمية</label>
                      <textarea
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        rows={4}
                        placeholder="رؤية الأكاديمية وأهدافها المستقبلية..."
                        value={academyData?.academy_goals}
                        onChange={(e) => setAcademyData({ ...academyData, academy_goals: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">قصص النجاح</label>
                      <input
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="أسماء اللاعبين المتميزين (افصل بفاصلة)"
                        value={academyData?.success_stories?.join(', ')}
                        onChange={(e) => setAcademyData({ ...academyData, success_stories: e.target.value.split(',').map(item => item.trim()).filter(item => item) })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">الشراكات</label>
                      <input
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="الأندية، الماركات، المؤسسات الشريكة (افصل بفاصلة)"
                        value={academyData?.partnerships?.join(', ')}
                        onChange={(e) => setAcademyData({ ...academyData, partnerships: e.target.value.split(',').map(item => item.trim()).filter(item => item) })}
                      />
                    </div>
                  </div>
                </div>

              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setEditMode(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSaveChanges}
                  disabled={uploading}
                  className="px-4 py-2 text-white rounded-lg bg-gradient-to-l from-orange-400 to-orange-600 hover:opacity-90 disabled:opacity-50"
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
