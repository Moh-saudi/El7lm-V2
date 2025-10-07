'use client';

import { Button } from "@/components/ui/button";
import { getBasicCountriesData, SimpleCountry, getCitiesByCountry, getCountryFromCity, searchCities, SUPPORTED_COUNTRIES } from '@/data/countries-simple';
import { useAuth } from '@/lib/firebase/auth-provider';
import { db } from "@/lib/firebase/config";
import { AccountType, uploadPlayerAdditionalImage, uploadPlayerDocument, uploadPlayerProfileImage } from '@/lib/firebase/upload-media';
import { User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { ArrowLeft, ArrowRight, Check, Plus, Trash, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

// Types
interface ExtendedUser extends User {
  full_name?: string;
  phone?: string;
  country?: string;
}

interface PlayerFormData {
  full_name: string;
  birth_date: string;
  nationality: string;
  city: string;
  country: string;
  phone: string;
  whatsapp: string;
  email: string;
  brief: string;
  education_level: string;
  graduation_year: string;
  degree: string;
  english_level: string;
  arabic_level: string;
  spanish_level: string;
  blood_type: string;
  height: string;
  weight: string;
  chronic_conditions: boolean;
  chronic_details: string;
  injuries: Array<{ type: string; date: string; status: string }>;
  surgeries: Array<{ type: string; date: string }>;
  allergies: string;
  medical_notes: string;
  primary_position: string;
  secondary_position: string;
  preferred_foot: string;
  club_history: Array<{ name: string; from: string; to: string }>;
  experience_years: string;
  sports_notes: string;
  technical_skills: Record<string, number>;
  physical_skills: Record<string, number>;
  social_skills: Record<string, number>;
  objectives: Record<string, boolean> & { other?: string };
  profile_image: { url: string } | string | null;
  additional_images: Array<{ url: string }>;
  videos: { url: string; desc: string }[];
  training_courses: string[];
  has_passport: 'yes' | 'no';
  ref_source: string;
  player_number: string;
  favorite_jersey_number: string;
  contract_history: Array<{ club: string; from: string; to: string; role: string }>;
  agent_history: Array<{ agent: string; from: string; to: string }>;
  official_contact: {
    name: string;
    title: string;
    phone: string;
    email: string;
  };
  currently_contracted: 'yes' | 'no';
  achievements: Array<{
    title: string;
    date: string;
    description?: string;
  }>;
  medical_history: {
    blood_type: string;
    chronic_conditions?: string[];
    allergies?: string[];
    injuries?: Array<{
      type: string;
      date: string;
      recovery_status: string;
    }>;
    last_checkup?: string;
  };
  current_club?: string;
  previous_clubs?: string[];
  documents?: Array<{
    type: string;
    url: string;
    name: string;
  }>;
  address?: string;
}

interface FormErrors {
  [key: string]: string | undefined;
}

// Constants
const STEPS = {
  PERSONAL: 0,
  EDUCATION: 1,
  MEDICAL: 2,
  SPORTS: 3,
  SKILLS: 4,
  OBJECTIVES: 5,
  MEDIA: 6,
  CONTRACTS: 7,
};

const STEP_TITLES = {
  [STEPS.PERSONAL]: 'البيانات الشخصية',
  [STEPS.EDUCATION]: 'المعلومات التعليمية',
  [STEPS.MEDICAL]: 'السجل الطبي',
  [STEPS.SPORTS]: 'المعلومات الرياضية',
  [STEPS.SKILLS]: 'المهارات والقدرات',
  [STEPS.OBJECTIVES]: 'الأهداف والطموحات',
  [STEPS.MEDIA]: 'الصور والفيديوهات',
  [STEPS.CONTRACTS]: 'العقود والاتصالات',
};

// Default player fields
const defaultPlayerFields: PlayerFormData = {
  full_name: '',
  birth_date: '',
  nationality: '',
  city: '',
  country: '',
  phone: '',
  whatsapp: '',
  email: '',
  brief: '',
  education_level: '',
  graduation_year: '',
  degree: '',
  english_level: '',
  arabic_level: '',
  spanish_level: '',
  blood_type: '',
  height: '',
  weight: '',
  chronic_conditions: false,
  chronic_details: '',
  injuries: [],
  surgeries: [],
  allergies: '',
  medical_notes: '',
  primary_position: '',
  secondary_position: '',
  preferred_foot: '',
  club_history: [],
  experience_years: '',
  sports_notes: '',
  technical_skills: {},
  physical_skills: {},
  social_skills: {},
  objectives: {},
  profile_image: null,
  additional_images: [],
  videos: [],
  training_courses: [],
  has_passport: 'no',
  ref_source: '',
  player_number: '',
  favorite_jersey_number: '',
  contract_history: [],
  agent_history: [],
  official_contact: {
    name: '',
    title: '',
    phone: '',
    email: ''
  },
  currently_contracted: 'no',
  achievements: [],
  medical_history: {
    blood_type: '',
    chronic_conditions: [],
    allergies: [],
    injuries: [],
    last_checkup: ''
  },
  current_club: '',
  previous_clubs: [],
  documents: [],
  address: ''
};

// Reference data
const POSITIONS = [
  'حارس مرمى',
  'مدافع أيمن',
  'مدافع أيسر',
  'قلب دفاع',
  'وسط دفاعي',
  'وسط',
  'جناح أيمن',
  'جناح أيسر',
  'مهاجم صريح',
  'مهاجم ثاني'
];

const NATIONALITIES = [
  "سعودي", "مصري", "أردني", "سوري", "مغربي", "جزائري", "تونسي", "ليبي",
  "فلسطيني", "يمني", "سوداني", "إماراتي", "قطري", "بحريني", "كويتي", "عماني",
  "لبناني", "عراقي"
];

// استخدام قائمة الدول من ملف البيانات الجديد
const COUNTRIES = SUPPORTED_COUNTRIES;

const EDUCATION_LEVELS = [
  'ابتدائي', 'متوسط', 'ثانوي', 'دبلوم', 'بكالوريوس', 'ماجستير', 'دكتوراه'
];

const LANGUAGE_LEVELS = [
  'مبتدئ', 'متوسط', 'متقدم', 'محترف'
];

const BLOOD_TYPES = [
  'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'
];

const FOOT_PREFERENCES = [
  'اليمنى', 'اليسرى', 'كلتاهما'
];

// Loading Component
const LoadingSpinner: React.FC = () => (
  <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
    <div className="w-16 h-16 rounded-full border-4 border-blue-500 animate-spin border-t-transparent"></div>
  </div>
);

// Success Message Component
const SuccessMessage: React.FC<{ message: string }> = ({ message }) => (
  <div className="fixed inset-x-0 top-0 z-50 p-4">
    <div className="p-4 mx-auto w-full max-w-md bg-green-100 rounded-lg shadow-lg">
      <div className="flex items-center">
        <Check className="mr-2 w-5 h-5 text-green-500" />
        <p className="text-green-700">{message}</p>
      </div>
    </div>
  </div>
);

// Error Message Component
const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <div className="p-4 mb-4 bg-red-100 rounded-md border border-red-400">
    <div className="flex items-center">
      <X className="mr-2 w-5 h-5 text-red-500" />
      <p className="text-red-700">{message}</p>
    </div>
  </div>
);

// Validation functions
const validatePersonalInfo = (data: PlayerFormData): FormErrors => {
  const errors: FormErrors = {};
  if (!data.full_name) errors.full_name = 'الاسم الكامل مطلوب';

  // تحقق من تاريخ الميلاد
  if (!data.birth_date) {
    errors.birth_date = 'تاريخ الميلاد مطلوب';
  } else {
    const birthDate = new Date(data.birth_date);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 3) {
      errors.birth_date = 'يجب أن يكون العمر 3 سنوات على الأقل';
    }

    if (age > 50) {
      errors.birth_date = 'يجب أن يكون العمر أقل من 50 سنة';
    }
  }

  if (!data.nationality) errors.nationality = 'الجنسية مطلوبة';
  if (!data.country) errors.country = 'الدولة مطلوبة';
  if (!data.city) errors.city = 'المدينة مطلوبة';
  if (!data.phone) errors.phone = 'رقم الهاتف مطلوب';
  if (!data.email) errors.email = 'البريد الإلكتروني مطلوب';
  return errors;
};

const validateSports = (data: PlayerFormData): FormErrors => {
  const errors: FormErrors = {};
  if (!data.primary_position) errors.primary_position = 'المركز الأساسي مطلوب';
  if (!data.preferred_foot) errors.preferred_foot = 'القدم المفضلة مطلوبة';
  return errors;
};

// Main Component
export default function PlayerProfile() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // State
  const [playerData, setPlayerData] = useState<PlayerFormData | null>(null);
  const [formData, setFormData] = useState<PlayerFormData>(defaultPlayerFields);
  const [editFormData, setEditFormData] = useState<PlayerFormData>(defaultPlayerFields);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [currentStep, setCurrentStep] = useState<number>(STEPS.PERSONAL);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(false);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);

  // Fetch player data
  const fetchPlayerData = useCallback(async () => {
    if (!user || loading) return;

    setIsLoading(true);
    try {
      const docRef = doc(db, 'players', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const processedData = {
          ...defaultPlayerFields,
          ...data
        };
        setPlayerData(processedData);
        setFormData(processedData);
        setEditFormData(processedData);
        setError(null);
      } else {
        // Create default document
        const extendedUser = user as ExtendedUser;
        const defaultData = {
          ...defaultPlayerFields,
          full_name: extendedUser.displayName || extendedUser.full_name || '',
          phone: extendedUser.phoneNumber || '',
          country: extendedUser.country || '',
          email: extendedUser.email || '',
        };
        await setDoc(docRef, defaultData, { merge: true });
        setPlayerData(defaultData);
        setFormData(defaultData);
        setEditFormData(defaultData);
        setError(null);
      }
    } catch (err) {
      setError("حدث خطأ أثناء جلب البيانات. يرجى المحاولة لاحقًا.");
      console.error('[fetchPlayerData] error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, loading]);

  // Effects
  useEffect(() => {
    if (user && !playerData && !loading) {
      fetchPlayerData();
    }
  }, [user, playerData, loading, fetchPlayerData]);

  // جلب حالة الاشتراك
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) return;

      try {
        const subDoc = await getDoc(doc(db, 'subscriptions', user.uid));
        if (subDoc.exists()) {
          setSubscription(subDoc.data());
        } else {
          setSubscription(null);
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
        setSubscription(null);
      }
    };

    if (user) {
      fetchSubscription();
    }
  }, [user]);

  // تحديث المدن المتاحة عند تغيير البيانات أو بدء التعديل
  useEffect(() => {
    if (isEditing) {
      // إذا كانت المدينة موجودة ولكن الدولة غير محددة، حاول تحديد الدولة تلقائياً
      if (editFormData.city && !editFormData.country) {
        const detectedCountry = getCountryFromCity(editFormData.city);
        if (detectedCountry) {
          setEditFormData(prev => ({
            ...prev,
            country: detectedCountry
          }));
          setAvailableCities(getCitiesByCountry(detectedCountry));
          console.log(`🔧 تم تحديد الدولة تلقائياً من البيانات المحفوظة: "${editFormData.city}" -> "${detectedCountry}"`);
        }
      }
      // إذا كانت الدولة محددة، حدث المدن المتاحة
      else if (editFormData.country) {
        setAvailableCities(getCitiesByCountry(editFormData.country));
      }
    }
  }, [isEditing, editFormData.country, editFormData.city]);

  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setEditFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setEditFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // معالج تغيير الدولة - يحدث المدن المتاحة
  const handleCountryChange = (country: string) => {
    setEditFormData(prev => ({
      ...prev,
      country: country,
      city: '' // مسح المدينة عند تغيير الدولة
    }));

    // تحديث المدن المتاحة
    if (country) {
      const cities = getCitiesByCountry(country);
      setAvailableCities(cities);
    } else {
      setAvailableCities([]);
    }
  };

  // معالج تغيير المدينة - يحدد الدولة تلقائياً
  const handleCityChange = (city: string) => {
    setEditFormData(prev => ({
      ...prev,
      city: city
    }));

    // تحديد الدولة تلقائياً بناءً على المدينة
    if (city) {
      const detectedCountry = getCountryFromCity(city);
      if (detectedCountry && detectedCountry !== editFormData.country) {
        setEditFormData(prev => ({
          ...prev,
          country: detectedCountry,
          city: city
        }));

        // تحديث المدن المتاحة للدولة الجديدة
        const cities = getCitiesByCountry(detectedCountry);
        setAvailableCities(cities);

        console.log(`🔧 تم تحديد الدولة تلقائياً: "${city}" -> "${detectedCountry}"`);
      }
    }

    setShowCityDropdown(false);
  };

  // معالج البحث في المدن
  const handleCitySearch = (query: string) => {
    setCitySearchQuery(query);
    setEditFormData(prev => ({
      ...prev,
      city: query
    }));

    if (query.length > 0) {
      const searchResults = editFormData.country
        ? searchCities(query, editFormData.country)
        : searchCities(query);
      setAvailableCities(searchResults);
      setShowCityDropdown(true);
    } else {
      if (editFormData.country) {
        setAvailableCities(getCitiesByCountry(editFormData.country));
      }
      setShowCityDropdown(false);
    }
  };

  // دالة لتحديد نوع الحساب من بيانات اللاعب (محدثة لدعم كلا التنسيقين)
  const getAccountType = (): AccountType => {
    console.log('🔍 تحديد نوع الحساب من بيانات اللاعب:', {
      trainer_id: (playerData as any)?.trainer_id,
      trainerId: (playerData as any)?.trainerId,
      club_id: (playerData as any)?.club_id,
      clubId: (playerData as any)?.clubId,
      agent_id: (playerData as any)?.agent_id,
      agentId: (playerData as any)?.agentId,
      academy_id: (playerData as any)?.academy_id,
      academyId: (playerData as any)?.academyId
    });

    if ((playerData as any)?.trainer_id || (playerData as any)?.trainerId) {
      console.log('✅ تم تحديد النوع: مدرب');
      return 'trainer';
    }
    if ((playerData as any)?.club_id || (playerData as any)?.clubId) {
      console.log('✅ تم تحديد النوع: نادي');
      return 'club';
    }
    if ((playerData as any)?.agent_id || (playerData as any)?.agentId) {
      console.log('✅ تم تحديد النوع: وكيل');
      return 'agent';
    }
    if ((playerData as any)?.academy_id || (playerData as any)?.academyId) {
      console.log('✅ تم تحديد النوع: أكاديمية');
      return 'academy';
    }

    console.log('✅ تم تحديد النوع: لاعب مستقل');
    return 'independent'; // اللاعبين المستقلين
  };

  // Upload profile image
  const handleProfileImageUpload = async (file: File) => {
    if (!user?.uid) return;

    setUploadingImage(true);
    try {
      const accountType = getAccountType();
      const result = await uploadPlayerProfileImage(file, user.uid, accountType);

      if (result?.url) {
        // Update local state immediately
        setPlayerData(prev => prev ? {
          ...prev,
          profile_image_url: result.url
        } : null);

        setFormData(prev => ({
          ...prev,
          profile_image: { url: result.url },
          profile_image_url: result.url
        }));

        setEditFormData(prev => ({
          ...prev,
          profile_image: { url: result.url },
          profile_image_url: result.url
        }));

        // Update in database
        if (user.uid) {
          await updateDoc(doc(db, 'players', user.uid), {
            profile_image_url: result.url,
            updated_at: serverTimestamp()
          });
        }

        // Trigger header update for player dashboard
        window.dispatchEvent(new CustomEvent('playerProfileImageUpdated'));

        toast.success('✅ تم رفع الصورة الشخصية بنجاح');
      }
    } catch (error) {
      console.error('Error uploading profile image:', error);
      toast.error('❌ فشل في رفع الصورة الشخصية - ' + (error instanceof Error ? error.message : 'خطأ غير معروف'));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleNext = async () => {
    // Validate current step
    let errors: FormErrors = {};
    if (currentStep === STEPS.PERSONAL) errors = validatePersonalInfo(editFormData);
    if (currentStep === STEPS.SPORTS) errors = validateSports(editFormData);
    // Other steps don't require mandatory validation for now

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    // Save current step data
    if (user) {
      const docRef = doc(db, 'players', user.uid);
      await setDoc(docRef, editFormData, { merge: true });
    }

    setCurrentStep(currentStep + 1);
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      const docRef = doc(db, 'players', user.uid);
      await setDoc(docRef, editFormData, { merge: true });

      // إرسال إشعار للمديرين عن الفيديوهات الجديدة
      const originalVideos = formData.videos || [];
      const newVideos = editFormData.videos || [];

      // تحقق من الفيديوهات الجديدة
      const addedVideos = newVideos.filter((newVideo, index) => {
        const originalVideo = originalVideos[index];
        return newVideo.url && (!originalVideo || originalVideo.url !== newVideo.url);
      });

      if (addedVideos.length > 0) {
        try {
          // إرسال إشعار لكل فيديو جديد
          for (const video of addedVideos) {
            await fetch('/api/admin/video-notifications', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'notify_single_video',
                videoData: {
                  title: video.desc || video.url,
                  userName: user.displayName || user.email || 'مستخدم',
                  accountType: 'player',
                  videoId: `${user.uid}_${newVideos.indexOf(video)}`,
                  uploadDate: new Date()
                }
              })
            });
          }

          console.log(`✅ تم إرسال إشعارات لـ ${addedVideos.length} فيديو جديد`);
        } catch (notificationError) {
          console.error('❌ خطأ في إرسال إشعارات الفيديو:', notificationError);
          // لا نوقف العملية إذا فشل الإشعار
        }
      }

      setPlayerData(editFormData);
      setFormData(editFormData);
      setIsEditing(false);

      // إظهار رسالة النجاح مع التحقق من الاشتراك
      setShowRegistrationSuccess(true);

      setSuccessMessage('تم حفظ البيانات بنجاح');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('خطأ أثناء حفظ البيانات:', err);
      setError('حدث خطأ أثناء حفظ البيانات. يرجى المحاولة مرة أخرى.');
    }
  };

  const handleCancel = () => {
    setEditFormData({ ...formData });
    setIsEditing(false);
    setCurrentStep(STEPS.PERSONAL);
    setFormErrors({});
  };

  // Helper function to get image URL
  const getImageUrl = (image: { url: string } | string | null): string | null => {
    if (!image) return null;
    if (typeof image === 'string') return image;
    return image.url || null;
  };

  // Render field helper
  const renderField = (name: keyof PlayerFormData, type: string = 'text') => {
    if (isEditing) {
      return (
        <input
          type={type}
          name={name}
          value={editFormData[name] as string || ''}
          onChange={handleInputChange}
          className="p-2 mt-1 w-full text-gray-900 bg-white rounded-md border focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />
      );
    } else {
      return (
        <div className="p-2 mt-1 text-gray-900 bg-gray-100 rounded-md">
          {(formData[name] as string) || 'غير محدد'}
        </div>
      );
    }
  };

  // Render personal info section
  const renderPersonalInfo = () => (
    <div className="space-y-6">
      <h2 className="pr-4 text-2xl font-semibold border-r-4 border-blue-500">البيانات الشخصية</h2>

      {/* Profile Image */}
      <div>
        <label className="block mb-2 text-sm font-medium text-gray-700">
          الصورة الشخصية <span className="text-red-500">*</span>
        </label>
        {isEditing ? (
          <div className="flex gap-4 items-center">
            <input
              type="file"
              accept="image/*"
                            onChange={(e) => e.target.files?.[0] && handleProfileImageUpload(e.target.files[0])}
              className="flex-1"
              disabled={uploadingImage}
            />
            {uploadingImage && <span className="text-blue-600">جاري الرفع...</span>}
                         {getImageUrl(editFormData.profile_image) && (
               <div className="relative w-24 h-24">
                 <Image
                   src={getImageUrl(editFormData.profile_image)!}
                   alt="Profile"
                   fill
                   className="object-cover rounded-full"
                   sizes="96px"
                   priority
                   onError={(e) => {
                     console.warn('Failed to load profile image');
                     e.currentTarget.style.display = 'none';
                   }}
                 />
               </div>
             )}
          </div>
        ) : (
          getImageUrl(formData.profile_image) ? (
            <div className="relative w-24 h-24">
              <Image
                src={getImageUrl(formData.profile_image)!}
                alt="Profile"
                fill
                className="object-cover rounded-full"
                sizes="96px"
                priority
              />
            </div>
          ) : (
            <span className="text-gray-400">لا توجد صورة شخصية</span>
          )
        )}
        {formErrors.profile_image && (
          <span className="text-xs text-red-500">{formErrors.profile_image}</span>
        )}
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            الاسم الكامل <span className="text-red-500">*</span>
          </label>
          {renderField('full_name')}
          {formErrors.full_name && (
            <span className="text-xs text-red-500">{formErrors.full_name}</span>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            تاريخ الميلاد <span className="text-red-500">*</span>
          </label>
          {renderField('birth_date', 'date')}
          {formErrors.birth_date && (
            <span className="text-xs text-red-500">{formErrors.birth_date}</span>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            الجنسية <span className="text-red-500">*</span>
          </label>
          {isEditing ? (
            <select
              name="nationality"
              value={editFormData.nationality || ''}
              onChange={handleInputChange}
              className="p-2 mt-1 w-full text-gray-900 bg-white rounded-md border"
            >
              <option value="">اختر الجنسية</option>
              {NATIONALITIES.map(nat => (
                <option key={nat} value={nat}>{nat}</option>
              ))}
            </select>
          ) : (
            <div className="p-2 mt-1 text-gray-900 bg-gray-100 rounded-md">
              {formData.nationality || 'غير محدد'}
            </div>
          )}
          {formErrors.nationality && (
            <span className="text-xs text-red-500">{formErrors.nationality}</span>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            الدولة <span className="text-red-500">*</span>
          </label>
          {isEditing ? (
            <select
              name="country"
              value={editFormData.country || ''}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="p-2 mt-1 w-full text-gray-900 bg-white rounded-md border focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value="">اختر الدولة</option>
              {COUNTRIES.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          ) : (
            <div className="p-2 mt-1 text-gray-900 bg-gray-100 rounded-md">
              {formData.country || 'غير محدد'}
            </div>
          )}
          {formErrors.country && (
            <span className="text-xs text-red-500">{formErrors.country}</span>
          )}
        </div>

        <div className="relative">
          <label className="block text-sm font-medium text-gray-700">
            المدينة <span className="text-red-500">*</span>
          </label>
          {isEditing ? (
            <div className="relative">
              <input
                type="text"
                name="city"
                value={editFormData.city || ''}
                onChange={(e) => handleCitySearch(e.target.value)}
                onFocus={() => {
                  if (editFormData.country) {
                    setAvailableCities(getCitiesByCountry(editFormData.country));
                    setShowCityDropdown(true);
                  }
                }}
                onBlur={() => {
                  // تأخير إخفاء القائمة للسماح بالنقر على الخيارات
                  setTimeout(() => setShowCityDropdown(false), 150);
                }}
                placeholder={editFormData.country ? "ابحث عن المدينة أو اختر من القائمة" : "اختر الدولة أولاً"}
                className="p-2 mt-1 w-full text-gray-900 bg-white rounded-md border focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                disabled={!editFormData.country}
              />

              {showCityDropdown && availableCities.length > 0 && (
                <div className="overflow-y-auto absolute right-0 left-0 top-full z-10 mt-1 max-h-60 bg-white rounded-md border border-gray-300 shadow-lg">
                  {availableCities.map((city, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleCityChange(city)}
                      className="px-3 py-2 w-full text-right text-gray-900 border-b border-gray-100 hover:bg-blue-50 hover:text-blue-900 last:border-b-0"
                    >
                      {city}
                    </button>
                  ))}
                </div>
              )}

              {editFormData.country && availableCities.length === 0 && citySearchQuery && (
                <div className="absolute right-0 left-0 top-full z-10 p-3 mt-1 text-center text-gray-500 bg-white rounded-md border border-gray-300 shadow-lg">
                  لا توجد مدن تطابق البحث "{citySearchQuery}"
                </div>
              )}
            </div>
          ) : (
            <div className="p-2 mt-1 text-gray-900 bg-gray-100 rounded-md">
              {formData.city || 'غير محدد'}
            </div>
          )}
          {formErrors.city && (
            <span className="text-xs text-red-500">{formErrors.city}</span>
          )}

          {isEditing && editFormData.country && (
            <p className="mt-1 text-xs text-blue-600">
              💡 يمكنك كتابة اسم المدينة للبحث، أو النقر في الحقل لرؤية كل مدن {editFormData.country}
            </p>
          )}

          {isEditing && !editFormData.country && (
            <p className="mt-1 text-xs text-amber-600">
              ⚠️ يرجى اختيار الدولة أولاً لتتمكن من اختيار المدينة
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            رقم الهاتف <span className="text-red-500">*</span>
          </label>
          {renderField('phone')}
          {formErrors.phone && (
            <span className="text-xs text-red-500">{formErrors.phone}</span>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">واتساب</label>
          {renderField('whatsapp')}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            البريد الإلكتروني <span className="text-red-500">*</span>
          </label>
          {renderField('email', 'email')}
          {formErrors.email && (
            <span className="text-xs text-red-500">{formErrors.email}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">العنوان</label>
          {renderField('address')}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">نبذة مختصرة</label>
        {isEditing ? (
          <textarea
            name="brief"
            value={editFormData.brief || ''}
            onChange={handleInputChange}
            rows={3}
            className="p-2 mt-1 w-full text-gray-900 bg-white rounded-md border"
            placeholder="اكتب نبذة مختصرة عن نفسك..."
          />
        ) : (
          <div className="p-2 mt-1 text-gray-900 bg-gray-100 rounded-md min-h-[80px]">
            {formData.brief || 'غير محدد'}
          </div>
        )}
      </div>
    </div>
  );

  // Render education section
  const renderEducation = () => (
    <div className="space-y-6">
      <h2 className="pr-4 text-2xl font-semibold border-r-4 border-blue-500">المعلومات التعليمية</h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">المستوى التعليمي</label>
          {isEditing ? (
            <select
              name="education_level"
              value={editFormData.education_level || ''}
              onChange={handleInputChange}
              className="p-2 mt-1 w-full text-gray-900 bg-white rounded-md border"
            >
              <option value="">اختر المستوى</option>
              {EDUCATION_LEVELS.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          ) : (
            <div className="p-2 mt-1 text-gray-900 bg-gray-100 rounded-md">
              {formData.education_level || 'غير محدد'}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">سنة التخرج</label>
          {isEditing ? (
            <select
              name="graduation_year"
              value={editFormData.graduation_year || ''}
              onChange={handleInputChange}
              className="p-2 mt-1 w-full text-gray-900 bg-white rounded-md border"
            >
              <option value="">اختر سنة التخرج</option>
              {Array.from({ length: 30 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return (
                  <option key={year} value={year.toString()}>{year}</option>
                );
              })}
            </select>
          ) : (
            <div className="p-2 mt-1 text-gray-900 bg-gray-100 rounded-md">
              {formData.graduation_year || 'غير محدد'}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">الدرجة</label>
          {isEditing ? (
            <select
              name="degree"
              value={editFormData.degree || ''}
              onChange={handleInputChange}
              className="p-2 mt-1 w-full text-gray-900 bg-white rounded-md border"
            >
              <option value="">اختر الدرجة</option>
              <option value="مقبول">مقبول</option>
              <option value="جيد">جيد</option>
              <option value="جيد جداً">جيد جداً</option>
              <option value="ممتاز">ممتاز</option>
              <option value="امتياز">امتياز</option>
            </select>
          ) : (
            <div className="p-2 mt-1 text-gray-900 bg-gray-100 rounded-md">
              {formData.degree || 'غير محدد'}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">مستوى الإنجليزية</label>
          {isEditing ? (
            <select
              name="english_level"
              value={editFormData.english_level || ''}
              onChange={handleInputChange}
              className="p-2 mt-1 w-full text-gray-900 bg-white rounded-md border"
            >
              <option value="">اختر المستوى</option>
              {LANGUAGE_LEVELS.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          ) : (
            <div className="p-2 mt-1 text-gray-900 bg-gray-100 rounded-md">
              {formData.english_level || 'غير محدد'}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">مستوى العربية</label>
          {isEditing ? (
            <select
              name="arabic_level"
              value={editFormData.arabic_level || ''}
              onChange={handleInputChange}
              className="p-2 mt-1 w-full text-gray-900 bg-white rounded-md border"
            >
              <option value="">اختر المستوى</option>
              {LANGUAGE_LEVELS.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          ) : (
            <div className="p-2 mt-1 text-gray-900 bg-gray-100 rounded-md">
              {formData.arabic_level || 'غير محدد'}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">مستوى الإسبانية</label>
          {isEditing ? (
            <select
              name="spanish_level"
              value={editFormData.spanish_level || ''}
              onChange={handleInputChange}
              className="p-2 mt-1 w-full text-gray-900 bg-white rounded-md border"
            >
              <option value="">اختر المستوى</option>
              {LANGUAGE_LEVELS.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          ) : (
            <div className="p-2 mt-1 text-gray-900 bg-gray-100 rounded-md">
              {formData.spanish_level || 'غير محدد'}
            </div>
          )}
        </div>
      </div>

      {/* الدورات التدريبية */}
      <div>
        <label className="block text-sm font-medium text-gray-700">الدورات التدريبية والشهادات</label>
        {isEditing ? (
          <div className="space-y-2">
            {(editFormData.training_courses || []).map((course, index) => (
              <div key={index} className="flex gap-2 items-center p-2 bg-gray-50 rounded">
                <input
                  type="text"
                  placeholder="اسم الدورة أو الشهادة"
                  value={course || ''}
                  onChange={(e) => {
                    const newCourses = [...(editFormData.training_courses || [])];
                    newCourses[index] = e.target.value;
                    setEditFormData(prev => ({ ...prev, training_courses: newCourses }));
                  }}
                  className="flex-1 p-1 rounded border"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newCourses = (editFormData.training_courses || []).filter((_, i) => i !== index);
                    setEditFormData(prev => ({ ...prev, training_courses: newCourses }));
                  }}
                  className="p-1 text-red-600 rounded hover:bg-red-100"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const newCourses = [...(editFormData.training_courses || []), ''];
                setEditFormData(prev => ({ ...prev, training_courses: newCourses }));
              }}
              className="flex gap-2 items-center p-2 text-blue-600 rounded border border-blue-300 hover:bg-blue-50"
            >
              <Plus className="w-4 h-4" />
              إضافة دورة تدريبية
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {formData.training_courses && formData.training_courses.length > 0 ? (
              formData.training_courses.map((course, index) => (
                <div key={index} className="p-2 bg-gray-100 rounded">
                  {course}
                </div>
              ))
            ) : (
              <div className="p-2 text-gray-500 bg-gray-100 rounded">لا توجد دورات مسجلة</div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Render medical section
  const renderMedical = () => (
    <div className="space-y-6">
      <h2 className="pr-4 text-2xl font-semibold border-r-4 border-blue-500">السجل الطبي</h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">فصيلة الدم</label>
          {isEditing ? (
            <select
              name="blood_type"
              value={editFormData.blood_type || ''}
              onChange={handleInputChange}
              className="p-2 mt-1 w-full text-gray-900 bg-white rounded-md border"
            >
              <option value="">اختر فصيلة الدم</option>
              {BLOOD_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          ) : (
            <div className="p-2 mt-1 text-gray-900 bg-gray-100 rounded-md">
              {formData.blood_type || 'غير محدد'}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">الطول (سم)</label>
          {renderField('height', 'number')}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">الوزن (كجم)</label>
          {renderField('weight', 'number')}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">الحساسية</label>
          {renderField('allergies')}
        </div>
      </div>

      {/* الحالات المزمنة */}
      <div>
        <label className="flex items-center text-sm font-medium text-gray-700">
          {isEditing ? (
            <input
              type="checkbox"
              name="chronic_conditions"
              checked={editFormData.chronic_conditions || false}
              onChange={handleInputChange}
              className="mr-2"
            />
          ) : null}
          هل تعاني من أي حالات مزمنة؟
        </label>
        {!isEditing && (
          <div className="p-2 mt-1 text-gray-900 bg-gray-100 rounded-md">
            {formData.chronic_conditions ? 'نعم' : 'لا'}
          </div>
        )}
      </div>

      {/* تفاصيل الحالات المزمنة */}
      {(editFormData.chronic_conditions || formData.chronic_conditions) && (
        <div>
          <label className="block text-sm font-medium text-gray-700">تفاصيل الحالات المزمنة</label>
          {isEditing ? (
            <textarea
              name="chronic_details"
              value={editFormData.chronic_details || ''}
              onChange={handleInputChange}
              rows={3}
              className="p-2 mt-1 w-full text-gray-900 bg-white rounded-md border"
              placeholder="اذكر تفاصيل الحالات المزمنة..."
            />
          ) : (
            <div className="p-2 mt-1 text-gray-900 bg-gray-100 rounded-md min-h-[80px]">
              {formData.chronic_details || 'غير محدد'}
            </div>
          )}
        </div>
      )}

      {/* الإصابات السابقة */}
      <div>
        <label className="block text-sm font-medium text-gray-700">الإصابات السابقة</label>
        {isEditing ? (
          <div className="space-y-2">
            {(editFormData.injuries || []).map((injury, index) => (
              <div key={index} className="flex gap-2 items-center p-2 bg-gray-50 rounded">
                <input
                  type="text"
                  placeholder="نوع الإصابة"
                  value={injury.type || ''}
                  onChange={(e) => {
                    const newInjuries = [...(editFormData.injuries || [])];
                    newInjuries[index] = { ...injury, type: e.target.value };
                    setEditFormData(prev => ({ ...prev, injuries: newInjuries }));
                  }}
                  className="flex-1 p-1 rounded border"
                />
                <input
                  type="date"
                  value={injury.date || ''}
                  onChange={(e) => {
                    const newInjuries = [...(editFormData.injuries || [])];
                    newInjuries[index] = { ...injury, date: e.target.value };
                    setEditFormData(prev => ({ ...prev, injuries: newInjuries }));
                  }}
                  className="p-1 rounded border"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newInjuries = (editFormData.injuries || []).filter((_, i) => i !== index);
                    setEditFormData(prev => ({ ...prev, injuries: newInjuries }));
                  }}
                  className="p-1 text-red-600 rounded hover:bg-red-100"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const newInjuries = [...(editFormData.injuries || []), { type: '', date: '', status: '' }];
                setEditFormData(prev => ({ ...prev, injuries: newInjuries }));
              }}
              className="flex gap-2 items-center p-2 text-blue-600 rounded border border-blue-300 hover:bg-blue-50"
            >
              <Plus className="w-4 h-4" />
              إضافة إصابة
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {formData.injuries && formData.injuries.length > 0 ? (
              formData.injuries.map((injury, index) => (
                <div key={index} className="p-2 bg-gray-100 rounded">
                  <span className="font-medium">{injury.type}</span>
                  {injury.date && <span className="text-gray-600"> - {injury.date}</span>}
                </div>
              ))
            ) : (
              <div className="p-2 text-gray-500 bg-gray-100 rounded">لا توجد إصابات مسجلة</div>
            )}
          </div>
        )}
      </div>

      {/* العمليات الجراحية */}
      <div>
        <label className="block text-sm font-medium text-gray-700">العمليات الجراحية</label>
        {isEditing ? (
          <div className="space-y-2">
            {(editFormData.surgeries || []).map((surgery, index) => (
              <div key={index} className="flex gap-2 items-center p-2 bg-gray-50 rounded">
                <input
                  type="text"
                  placeholder="نوع العملية"
                  value={surgery.type || ''}
                  onChange={(e) => {
                    const newSurgeries = [...(editFormData.surgeries || [])];
                    newSurgeries[index] = { ...surgery, type: e.target.value };
                    setEditFormData(prev => ({ ...prev, surgeries: newSurgeries }));
                  }}
                  className="flex-1 p-1 rounded border"
                />
                <input
                  type="date"
                  value={surgery.date || ''}
                  onChange={(e) => {
                    const newSurgeries = [...(editFormData.surgeries || [])];
                    newSurgeries[index] = { ...surgery, date: e.target.value };
                    setEditFormData(prev => ({ ...prev, surgeries: newSurgeries }));
                  }}
                  className="p-1 rounded border"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newSurgeries = (editFormData.surgeries || []).filter((_, i) => i !== index);
                    setEditFormData(prev => ({ ...prev, surgeries: newSurgeries }));
                  }}
                  className="p-1 text-red-600 rounded hover:bg-red-100"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const newSurgeries = [...(editFormData.surgeries || []), { type: '', date: '' }];
                setEditFormData(prev => ({ ...prev, surgeries: newSurgeries }));
              }}
              className="flex gap-2 items-center p-2 text-blue-600 rounded border border-blue-300 hover:bg-blue-50"
            >
              <Plus className="w-4 h-4" />
              إضافة عملية
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {formData.surgeries && formData.surgeries.length > 0 ? (
              formData.surgeries.map((surgery, index) => (
                <div key={index} className="p-2 bg-gray-100 rounded">
                  <span className="font-medium">{surgery.type}</span>
                  {surgery.date && <span className="text-gray-600"> - {surgery.date}</span>}
                </div>
              ))
            ) : (
              <div className="p-2 text-gray-500 bg-gray-100 rounded">لا توجد عمليات مسجلة</div>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">ملاحظات طبية</label>
        {isEditing ? (
          <textarea
            name="medical_notes"
            value={editFormData.medical_notes || ''}
            onChange={handleInputChange}
            rows={3}
            className="p-2 mt-1 w-full text-gray-900 bg-white rounded-md border"
            placeholder="أي ملاحظات طبية..."
          />
        ) : (
          <div className="p-2 mt-1 text-gray-900 bg-gray-100 rounded-md min-h-[80px]">
            {formData.medical_notes || 'غير محدد'}
          </div>
        )}
      </div>
    </div>
  );

  // Render sports info section
  const renderSportsInfo = () => (
    <div className="space-y-6">
      <h2 className="pr-4 text-2xl font-semibold border-r-4 border-blue-500">المعلومات الرياضية</h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            المركز الأساسي <span className="text-red-500">*</span>
          </label>
          {isEditing ? (
            <select
              name="primary_position"
              value={editFormData.primary_position || ''}
              onChange={handleInputChange}
              className="p-2 mt-1 w-full text-gray-900 bg-white rounded-md border"
            >
              <option value="">اختر المركز</option>
              {POSITIONS.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          ) : (
            <div className="p-2 mt-1 text-gray-900 bg-gray-100 rounded-md">
              {formData.primary_position || 'غير محدد'}
            </div>
          )}
          {formErrors.primary_position && (
            <span className="text-xs text-red-500">{formErrors.primary_position}</span>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">المركز الثانوي</label>
          {isEditing ? (
            <select
              name="secondary_position"
              value={editFormData.secondary_position || ''}
              onChange={handleInputChange}
              className="p-2 mt-1 w-full text-gray-900 bg-white rounded-md border"
            >
              <option value="">اختر المركز</option>
              {POSITIONS.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          ) : (
            <div className="p-2 mt-1 text-gray-900 bg-gray-100 rounded-md">
              {formData.secondary_position || 'غير محدد'}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            القدم المفضلة <span className="text-red-500">*</span>
          </label>
          {isEditing ? (
            <select
              name="preferred_foot"
              value={editFormData.preferred_foot || ''}
              onChange={handleInputChange}
              className="p-2 mt-1 w-full text-gray-900 bg-white rounded-md border"
            >
              <option value="">اختر القدم المفضلة</option>
              {FOOT_PREFERENCES.map(foot => (
                <option key={foot} value={foot}>{foot}</option>
              ))}
            </select>
          ) : (
            <div className="p-2 mt-1 text-gray-900 bg-gray-100 rounded-md">
              {formData.preferred_foot || 'غير محدد'}
            </div>
          )}
          {formErrors.preferred_foot && (
            <span className="text-xs text-red-500">{formErrors.preferred_foot}</span>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">سنوات الخبرة</label>
          {renderField('experience_years', 'number')}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">النادي الحالي</label>
          {renderField('current_club')}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">هل أنت متعاقد حالياً؟</label>
          {isEditing ? (
            <select
              name="currently_contracted"
              value={editFormData.currently_contracted || 'no'}
              onChange={handleInputChange}
              className="p-2 mt-1 w-full text-gray-900 bg-white rounded-md border"
            >
              <option value="no">لا</option>
              <option value="yes">نعم</option>
            </select>
          ) : (
            <div className="p-2 mt-1 text-gray-900 bg-gray-100 rounded-md">
              {formData.currently_contracted === 'yes' ? 'نعم' : 'لا'}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">هل تملك جواز سفر؟</label>
          {isEditing ? (
            <select
              name="has_passport"
              value={editFormData.has_passport || 'no'}
              onChange={handleInputChange}
              className="p-2 mt-1 w-full text-gray-900 bg-white rounded-md border"
            >
              <option value="no">لا</option>
              <option value="yes">نعم</option>
            </select>
          ) : (
            <div className="p-2 mt-1 text-gray-900 bg-gray-100 rounded-md">
              {formData.has_passport === 'yes' ? 'نعم' : 'لا'}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">مصدر التعرف علينا</label>
          {renderField('ref_source')}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">رقمك في الملعب</label>
          {renderField('player_number', 'number')}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">رقم القميص المفضل</label>
          {renderField('favorite_jersey_number', 'number')}
        </div>
      </div>

      {/* تاريخ الأندية */}
      <div>
        <label className="block text-sm font-medium text-gray-700">تاريخ الأندية</label>
        {isEditing ? (
          <div className="space-y-2">
            {(editFormData.club_history || []).map((club, index) => (
              <div key={index} className="flex gap-2 items-center p-2 bg-gray-50 rounded">
                <input
                  type="text"
                  placeholder="اسم النادي"
                  value={club.name || ''}
                  onChange={(e) => {
                    const newHistory = [...(editFormData.club_history || [])];
                    newHistory[index] = { ...club, name: e.target.value };
                    setEditFormData(prev => ({ ...prev, club_history: newHistory }));
                  }}
                  className="flex-1 p-1 rounded border"
                />
                <input
                  type="date"
                  placeholder="من"
                  value={club.from || ''}
                  onChange={(e) => {
                    const newHistory = [...(editFormData.club_history || [])];
                    newHistory[index] = { ...club, from: e.target.value };
                    setEditFormData(prev => ({ ...prev, club_history: newHistory }));
                  }}
                  className="p-1 rounded border"
                />
                <input
                  type="date"
                  placeholder="إلى"
                  value={club.to || ''}
                  onChange={(e) => {
                    const newHistory = [...(editFormData.club_history || [])];
                    newHistory[index] = { ...club, to: e.target.value };
                    setEditFormData(prev => ({ ...prev, club_history: newHistory }));
                  }}
                  className="p-1 rounded border"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newHistory = (editFormData.club_history || []).filter((_, i) => i !== index);
                    setEditFormData(prev => ({ ...prev, club_history: newHistory }));
                  }}
                  className="p-1 text-red-600 rounded hover:bg-red-100"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const newHistory = [...(editFormData.club_history || []), { name: '', from: '', to: '' }];
                setEditFormData(prev => ({ ...prev, club_history: newHistory }));
              }}
              className="flex gap-2 items-center p-2 text-blue-600 rounded border border-blue-300 hover:bg-blue-50"
            >
              <Plus className="w-4 h-4" />
              إضافة نادي
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {formData.club_history && formData.club_history.length > 0 ? (
              formData.club_history.map((club, index) => (
                <div key={index} className="p-2 bg-gray-100 rounded">
                  <span className="font-medium">{club.name}</span>
                  {club.from && club.to && (
                    <span className="text-gray-600"> ({club.from} - {club.to})</span>
                  )}
                </div>
              ))
            ) : (
              <div className="p-2 text-gray-500 bg-gray-100 rounded">لا يوجد تاريخ أندية مسجل</div>
            )}
          </div>
        )}
      </div>



      <div>
        <label className="block text-sm font-medium text-gray-700">ملاحظات رياضية</label>
        {isEditing ? (
          <textarea
            name="sports_notes"
            value={editFormData.sports_notes || ''}
            onChange={handleInputChange}
            rows={3}
            className="p-2 mt-1 w-full text-gray-900 bg-white rounded-md border"
            placeholder="أي ملاحظات رياضية إضافية..."
          />
        ) : (
          <div className="p-2 mt-1 text-gray-900 bg-gray-100 rounded-md min-h-[80px]">
            {formData.sports_notes || 'غير محدد'}
          </div>
        )}
      </div>
    </div>
  );

  // Helper function to render star rating
  const renderStarRating = (category: 'technical_skills' | 'physical_skills' | 'social_skills', skill: string, rating: number) => {
    const handleRatingChange = (newRating: number) => {
      setEditFormData(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          [skill]: newRating
        }
      }));
    };

    return (
      <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
        <span className="text-sm font-medium">{skill}</span>
        <div className="flex gap-1 items-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => isEditing && handleRatingChange(star)}
              className={`w-5 h-5 ${
                star <= rating ? 'text-yellow-400' : 'text-gray-300'
              } ${isEditing ? 'hover:text-yellow-300 cursor-pointer' : 'cursor-default'}`}
              disabled={!isEditing}
            >
              ★
            </button>
          ))}
          <span className="ml-2 text-sm text-gray-600">{rating}/5</span>
        </div>
      </div>
    );
  };

  // Render skills section
  const renderSkills = () => {
    const technicalSkills = [
      'التحكم بالكرة',
      'التمرير',
      'التسديد',
      'المراوغة',
      'الخطف',
      'القفز للكرات الهوائية',
      'استقبال الكرة',
      'الضربات الحرة'
    ];

    const physicalSkills = [
      'السرعة',
      'القوة',
      'التحمل',
      'الرشاقة',
      'التوازن',
      'المرونة',
      'التوقيت',
      'ردود الأفعال'
    ];

    const socialSkills = [
      'القيادة',
      'التواصل',
      'العمل الجماعي',
      'الانضباط',
      'التحفيز الذاتي',
      'إدارة الضغط',
      'تقبل النقد',
      'الثقة بالنفس'
    ];

    return (
      <div className="space-y-6">
        <h2 className="pr-4 text-2xl font-semibold border-r-4 border-blue-500">المهارات والقدرات</h2>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* المهارات الفنية */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="mb-4 text-lg font-semibold text-blue-800">المهارات الفنية</h3>
            <div className="space-y-2">
              {technicalSkills.map((skill) => (
                <div key={skill}>
                  {renderStarRating('technical_skills', skill, editFormData.technical_skills?.[skill] || formData.technical_skills?.[skill] || 0)}
                </div>
              ))}
            </div>
          </div>

          {/* المهارات البدنية */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="mb-4 text-lg font-semibold text-green-800">المهارات البدنية</h3>
            <div className="space-y-2">
              {physicalSkills.map((skill) => (
                <div key={skill}>
                  {renderStarRating('physical_skills', skill, editFormData.physical_skills?.[skill] || formData.physical_skills?.[skill] || 0)}
                </div>
              ))}
            </div>
          </div>

          {/* المهارات الاجتماعية */}
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h3 className="mb-4 text-lg font-semibold text-purple-800">المهارات الاجتماعية</h3>
            <div className="space-y-2">
              {socialSkills.map((skill) => (
                <div key={skill}>
                  {renderStarRating('social_skills', skill, editFormData.social_skills?.[skill] || formData.social_skills?.[skill] || 0)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="p-4 text-sm text-gray-600 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="mb-2 font-medium text-yellow-800">نصائح لتقييم المهارات:</p>
            <ul className="space-y-1 text-yellow-700">
              <li>• 1 نجمة = مبتدئ</li>
              <li>• 2 نجمة = أقل من المتوسط</li>
              <li>• 3 نجمة = متوسط</li>
              <li>• 4 نجمة = جيد</li>
              <li>• 5 نجمة = ممتاز</li>
            </ul>
          </div>
        )}
      </div>
    );
  };

  // Render objectives section
  const renderObjectives = () => {
    const objectiveOptions = [
      'اللعب في دوري أوروبي',
      'تمثيل المنتخب الوطني',
      'الاحتراف في نادي كبير',
      'الفوز ببطولة محلية',
      'الفوز ببطولة إقليمية',
      'الفوز ببطولة دولية',
      'أن أصبح قائد فريق',
      'تطوير المهارات الفنية',
      'تطوير اللياقة البدنية',
      'الحصول على جوائز فردية',
      'إلهام الشباب والأطفال',
      'اللعب في الدرجة الأولى المحلية',
      'الحصول على منحة دراسية رياضية',
      'تسجيل أكبر عدد من الأهداف في الموسم',
      'تطوير مهارات الحراسة والدفاع',
      'اللعب في بطولة كأس العالم',
      'الاحتراف في دوري الخليج العربي',
      'تكوين سمعة جيدة كلاعب محترف',
      'المشاركة في الألعاب الأولمبية',
      'الحصول على لقب أفضل لاعب شاب',
      'تطوير مهارات القيادة داخل الملعب',
      'اللعب مع نجوم كرة القدم المشهورين',
      'تحقيق الاستقرار في نادي واحد لفترة طويلة',
      'العودة إلى النادي الأم كنجم',
      'تدريب الأجيال القادمة بعد الاعتزال',
      'المشاركة في معايشات دولية',
      'الانضمام إلى نادي استثماري',
      'اللعب في أكاديمية معتمدة',
      'التسجيل في الاتحاد الدولي لكرة القدم',
      'إكمال دورات في اللغة الإنجليزية',
      'تعلم لغات إضافية للاحتراف الخارجي',
      'الحصول على شهادة في التحليل الرياضي',
      'دراسة دورات الإعداد البدني',
      'التدرب على الإعداد النفسي الرياضي',
      'الحصول على رخصة مدرب كرة قدم',
      'دراسة إدارة الأندية الرياضية'
    ];

    const handleObjectiveChange = (objective: string, checked: boolean) => {
      setEditFormData(prev => ({
        ...prev,
        objectives: {
          ...prev.objectives,
          [objective]: checked
        }
      }));
    };

    const handleOtherObjectiveChange = (value: string) => {
      setEditFormData(prev => ({
        ...prev,
        objectives: {
          ...prev.objectives,
          other: value
        } as Record<string, boolean> & { other?: string }
      }));
    };

    return (
      <div className="space-y-6">
        <h2 className="pr-4 text-2xl font-semibold border-r-4 border-blue-500">الأهداف والطموحات</h2>

        <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <h3 className="mb-4 text-lg font-semibold text-blue-800">أهدافك الرياضية</h3>
          <p className="mb-4 text-sm text-gray-600">اختر الأهداف التي تسعى لتحقيقها في مسيرتك الكروية (يمكن اختيار أكثر من هدف)</p>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {objectiveOptions.map((objective) => (
              <label key={objective} className="flex items-center p-2 bg-white rounded-lg border cursor-pointer hover:bg-blue-50">
                <input
                  type="checkbox"
                  checked={editFormData.objectives?.[objective] || formData.objectives?.[objective] || false}
                  onChange={(e) => isEditing && handleObjectiveChange(objective, e.target.checked)}
                  disabled={!isEditing}
                  className="mr-3 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">{objective}</span>
              </label>
            ))}
          </div>

          {/* هدف آخر */}
          <div className="mt-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">هدف آخر (اختياري)</label>
            {isEditing ? (
              <textarea
                value={editFormData.objectives?.other || ''}
                onChange={(e) => handleOtherObjectiveChange(e.target.value)}
                rows={2}
                className="p-2 w-full text-gray-900 bg-white rounded-md border focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                placeholder="اكتب أي أهداف أخرى لديك..."
              />
            ) : (
              <div className="p-2 text-gray-900 bg-gray-100 rounded-md min-h-[60px]">
                {formData.objectives?.other || 'لا توجد أهداف أخرى محددة'}
              </div>
            )}
          </div>

          {/* إحصائيات الأهداف */}
          {!isEditing && (
            <div className="p-3 mt-4 bg-white rounded-lg border">
              <h4 className="mb-2 text-sm font-semibold text-gray-800">إحصائيات أهدافك:</h4>
              <div className="text-sm text-gray-600">
                {(() => {
                  const selectedObjectives = objectiveOptions.filter(obj => formData.objectives?.[obj]);
                  const totalSelected = selectedObjectives.length;

                  if (totalSelected === 0) {
                    return <p>لم تحدد أي أهداف بعد. قم بتعديل ملفك لإضافة أهدافك.</p>;
                  }

                  return (
                    <div>
                      <p className="mb-2">
                        <span className="font-medium text-blue-600">{totalSelected}</span> من أصل {objectiveOptions.length} هدف محدد
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {selectedObjectives.map((obj, index) => (
                          <span key={index} className="px-2 py-1 text-xs text-blue-800 bg-blue-100 rounded-full">
                            {obj}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Handle additional image upload
  const handleAdditionalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    console.log('📸 Starting image upload process...');
    console.log('Files selected:', files?.length || 0);

    // تحقق شامل من المستخدم
    console.log('🔍 User debugging:');
    console.log('- user object:', user);
    console.log('- user exists:', !!user);
    console.log('- user.uid:', user?.uid);
    console.log('- typeof user.uid:', typeof(user?.uid));
    console.log('- loading state:', loading);

    // انتظار أن ينتهي التحميل أولاً
    if (loading) {
      console.log('⏳ Still loading user data, please wait...');
      setError('جاري تحميل بيانات المستخدم، يرجى الانتظار...');
      return;
    }

    if (!files || !user || !user.uid) {
      console.log('❌ Validation failed:', {
        files: !!files,
        user: !!user,
        uid: !!user?.uid,
        userType: typeof(user),
        uidType: typeof(user?.uid)
      });

      if (!user) {
        setError('خطأ: لم يتم العثور على بيانات المستخدم. يرجى تسجيل الدخول مرة أخرى.');
        setTimeout(() => {
          router.push('/auth/login');
        }, 2000);
      } else if (!user.uid) {
        setError('خطأ: معرف المستخدم غير صحيح. يرجى تسجيل الدخول مرة أخرى.');
        setTimeout(() => {
          router.push('/auth/login');
        }, 2000);
      }
      return;
    }

    console.log('✅ User validation passed - User ID:', user.uid);
    console.log('Files to upload:', Array.from(files).map(f => ({ name: f.name, size: f.size, type: f.type })));

    const newImages: Array<{ url: string }> = [];

    for (let i = 0; i < files.length; i++) {
      console.log(`📤 Uploading file ${i + 1}/${files.length}:`, files[i].name);
      console.log(`🔑 Using user ID: "${user.uid}" (length: ${user.uid.length})`);

      try {
        const accountType = getAccountType();
        const result = await uploadPlayerAdditionalImage(files[i], user.uid, accountType);
        console.log('✅ Upload result:', result);

        if (result && result.url) {
          newImages.push({ url: result.url });
          console.log('✅ Image added to list:', result.url);
        } else {
          console.log('❌ No URL in result:', result);
          setError(`فشل في رفع الصورة: ${files[i].name} - لم يتم إرجاع رابط صحيح`);
        }
      } catch (error) {
        console.error('❌ Error uploading additional image:', error);
        setError(`فشل في رفع الصورة: ${files[i].name}`);
      }
    }

    console.log('📋 Total images uploaded:', newImages.length);
    console.log('New images array:', newImages);

    if (newImages.length > 0) {
      console.log('🔄 Updating form data with new images...');
      setEditFormData(prev => {
        const updated = {
          ...prev,
          additional_images: [...(prev.additional_images || []), ...newImages]
        };
        console.log('Updated additional_images:', updated.additional_images);
        return updated;
      });
      console.log('✅ Form data updated successfully!');
      setError(''); // امسح أي أخطاء سابقة
    } else {
      console.log('⚠️ No new images to add to form data');
      if (files.length > 0) {
        setError('فشل في رفع جميع الصور. يرجى المحاولة مرة أخرى.');
      }
    }
  };

  // Remove additional image
  const removeAdditionalImage = (index: number) => {
    setEditFormData(prev => ({
      ...prev,
      additional_images: prev.additional_images?.filter((_, i) => i !== index) || []
    }));
  };

  // Handle video info
  const handleVideoChange = (index: number, field: 'url' | 'desc', value: string) => {
    setEditFormData(prev => {
      const newVideos = [...(prev.videos || [])];
      newVideos[index] = { ...newVideos[index], [field]: value };
      return { ...prev, videos: newVideos };
    });
  };

  const addVideo = () => {
    setEditFormData(prev => ({
      ...prev,
      videos: [...(prev.videos || []), { url: '', desc: '' }]
    }));
  };

  const removeVideo = (index: number) => {
    setEditFormData(prev => ({
      ...prev,
      videos: prev.videos?.filter((_, i) => i !== index) || []
    }));
  };

  // Handle document upload
  const handleDocumentUpload = async (file: File, index: number, documentType: string) => {
    if (!user) return;

    try {
      const result = await uploadPlayerDocument(file, user.uid, documentType);
      setEditFormData(prev => {
        const newDocuments = [...(prev.documents || [])];
        newDocuments[index] = {
          ...newDocuments[index],
          url: result.url,
          name: result.name
        };
        return { ...prev, documents: newDocuments };
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      setError('فشل في رفع المستند');
    }
  };

  const removeDocument = (index: number) => {
    setEditFormData(prev => ({
      ...prev,
      documents: prev.documents?.filter((_, i) => i !== index) || []
    }));
  };

  // Render media section
  const renderMedia = () => (
    <div className="space-y-6">
      <h2 className="pr-4 text-2xl font-semibold border-r-4 border-blue-500">الصور والفيديوهات</h2>

      {/* الصور الإضافية */}
      <div className="p-6 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg border border-green-200">
        <h3 className="mb-4 text-lg font-semibold text-green-800">الصور الإضافية</h3>
        <p className="mb-4 text-sm text-gray-600">أضف صور تظهر مهاراتك أو لحظات مميزة من مسيرتك الرياضية</p>

        {isEditing && (
          <div className="mb-4">
            <input
              type="file"
              accept="image/*"
              multiple
                                onChange={handleAdditionalImageUpload}
              className="p-2 w-full text-sm text-gray-500 bg-gray-50 rounded-lg border border-gray-300 border-dashed cursor-pointer hover:bg-gray-100"
            />
            <p className="mt-1 text-xs text-gray-500">يمكن اختيار عدة صور مرة واحدة (PNG, JPG, JPEG)</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {(editFormData.additional_images || formData.additional_images || []).map((image, index) => (
            <div key={index} className="relative group">
              <div className="overflow-hidden relative w-full h-32 bg-gray-200 rounded-lg">
                <Image
                  src={image.url}
                  alt={`إضافية ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  onError={(e) => {
                    console.warn('Failed to load additional image');
                    e.currentTarget.style.display = 'none';
                  }}
                />
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => removeAdditionalImage(index)}
                    className="absolute top-2 right-2 p-1 text-white bg-red-500 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Trash className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {(!editFormData.additional_images?.length && !formData.additional_images?.length) && (
            <div className="col-span-full p-8 text-center text-gray-500 bg-gray-100 rounded-lg border-2 border-dashed">
              <span>لا توجد صور إضافية</span>
              {isEditing && <p className="mt-2 text-sm">استخدم الزر أعلاه لإضافة صور</p>}
            </div>
          )}
        </div>
      </div>

      {/* مقاطع الفيديو */}
      <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
        <h3 className="mb-4 text-lg font-semibold text-purple-800">مقاطع الفيديو</h3>
        <p className="mb-4 text-sm text-gray-600">أضف روابط فيديوهات من يوتيوب أو منصات أخرى تظهر مهاراتك</p>

        <div className="space-y-4">
          {(editFormData.videos || formData.videos || []).map((video, index) => (
            <div key={index} className="p-4 bg-white rounded-lg border">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">رابط الفيديو</label>
                  {isEditing ? (
                    <input
                      type="url"
                      value={video.url || ''}
                      onChange={(e) => handleVideoChange(index, 'url', e.target.value)}
                      placeholder="https://www.youtube-nocookie.com/watch?v=..."
                      className="p-2 w-full text-sm rounded-md border focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    />
                  ) : (
                    <div className="p-2 text-sm break-all bg-gray-100 rounded">
                      {video.url ? (
                        <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {video.url}
                        </a>
                      ) : (
                        'لا يوجد رابط'
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">وصف الفيديو</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={video.desc || ''}
                      onChange={(e) => handleVideoChange(index, 'desc', e.target.value)}
                      placeholder="وصف مختصر للفيديو..."
                      className="p-2 w-full text-sm rounded-md border focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    />
                  ) : (
                    <div className="p-2 text-sm bg-gray-100 rounded">
                      {video.desc || 'لا يوجد وصف'}
                    </div>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end mt-3">
                  <button
                    type="button"
                    onClick={() => removeVideo(index)}
                    className="flex gap-1 items-center px-3 py-1 text-sm text-red-600 rounded-md hover:bg-red-50"
                  >
                    <Trash className="w-4 h-4" />
                    حذف
                  </button>
                </div>
              )}
            </div>
          ))}

          {(!editFormData.videos?.length && !formData.videos?.length) && (
            <div className="p-8 text-center text-gray-500 bg-gray-100 rounded-lg border-2 border-dashed">
              <span>لا توجد فيديوهات مضافة</span>
              {isEditing && <p className="mt-2 text-sm">استخدم الزر أدناه لإضافة فيديو</p>}
            </div>
          )}

          {isEditing && (
            <button
              type="button"
              onClick={addVideo}
              className="flex gap-2 items-center px-4 py-2 text-purple-600 rounded-lg border border-purple-300 hover:bg-purple-50"
            >
              <Plus className="w-4 h-4" />
              إضافة فيديو جديد
            </button>
          )}
        </div>

                 {/* نصائح للفيديوهات */}
         <div className="p-3 mt-4 bg-yellow-50 rounded-lg border border-yellow-200">
           <h4 className="mb-2 text-sm font-semibold text-yellow-800">نصائح للفيديوهات:</h4>
           <ul className="space-y-1 text-xs text-yellow-700">
             <li>• استخدم روابط من يوتيوب، فيميو، أو أي منصة فيديو أخرى</li>
             <li>• أضف وصف واضح لكل فيديو (مثل: "مهارات المراوغة"، "أهداف الموسم")</li>
             <li>• تأكد من أن الفيديو يظهر مهاراتك بوضوح</li>
             <li>• يفضل أن تكون مدة الفيديو قصيرة ومركزة</li>
           </ul>
         </div>
       </div>

       {/* المستندات الرسمية */}
       <div className="p-6 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg border border-orange-200">
         <h3 className="mb-4 text-lg font-semibold text-orange-800">المستندات الرسمية</h3>
         <p className="mb-4 text-sm text-gray-600">أرفق صور من مستنداتك الرسمية (جواز السفر، الشهادات، إلخ)</p>

         <div className="space-y-4">
           {(editFormData.documents || formData.documents || []).map((document, index) => (
             <div key={index} className="p-4 bg-white rounded-lg border">
               <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                 <div>
                   <label className="block mb-1 text-sm font-medium text-gray-700">نوع المستند</label>
                   {isEditing ? (
                     <select
                       value={document.type || ''}
                       onChange={(e) => {
                         setEditFormData(prev => {
                           const newDocs = [...(prev.documents || [])];
                           newDocs[index] = { ...newDocs[index], type: e.target.value };
                           return { ...prev, documents: newDocs };
                         });
                       }}
                       className="p-2 w-full text-sm rounded-md border focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                     >
                       <option value="">اختر نوع المستند</option>
                       <option value="passport">جواز السفر</option>
                       <option value="id">الهوية الشخصية</option>
                       <option value="birth_certificate">شهادة الميلاد</option>
                       <option value="education_certificate">الشهادة الدراسية</option>
                       <option value="medical_certificate">الشهادة الطبية</option>
                       <option value="sports_license">رخصة رياضية</option>
                       <option value="other">أخرى</option>
                     </select>
                   ) : (
                     <div className="p-2 text-sm bg-gray-100 rounded">
                       {(() => {
                         const types: Record<string, string> = {
                           passport: 'جواز السفر',
                           id: 'الهوية الشخصية',
                           birth_certificate: 'شهادة الميلاد',
                           education_certificate: 'الشهادة الدراسية',
                           medical_certificate: 'الشهادة الطبية',
                           sports_license: 'رخصة رياضية',
                           other: 'أخرى'
                         };
                         return types[document.type] || document.type || 'غير محدد';
                       })()}
                     </div>
                   )}
                 </div>

                 <div>
                   <label className="block mb-1 text-sm font-medium text-gray-700">اسم المستند</label>
                   {isEditing ? (
                     <input
                       type="text"
                       value={document.name || ''}
                       onChange={(e) => {
                         setEditFormData(prev => {
                           const newDocs = [...(prev.documents || [])];
                           newDocs[index] = { ...newDocs[index], name: e.target.value };
                           return { ...prev, documents: newDocs };
                         });
                       }}
                       placeholder="اسم المستند..."
                       className="p-2 w-full text-sm rounded-md border focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                     />
                   ) : (
                     <div className="p-2 text-sm bg-gray-100 rounded">
                       {document.name || 'غير محدد'}
                     </div>
                   )}
                 </div>

                 {/* حقل رفع الملف */}
                 {isEditing && (
                   <div>
                     <label className="block mb-1 text-sm font-medium text-gray-700">رفع الملف</label>
                     <input
                       type="file"
                       accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                       onChange={(e) => {
                         const file = e.target.files?.[0];
                         if (file && user) {
                           handleDocumentUpload(file, index, document.type || 'document');
                         }
                       }}
                       className="p-2 w-full text-sm bg-orange-50 rounded-md border border-orange-300 border-dashed hover:bg-orange-100"
                     />
                     <p className="mt-1 text-xs text-gray-500">
                       يدعم: PDF, JPG, PNG, DOC, DOCX
                     </p>
                   </div>
                 )}

                 <div>
                   <label className="block mb-1 text-sm font-medium text-gray-700">رابط المستند</label>
                   {isEditing ? (
                     <div className="flex gap-2">
                       <input
                         type="url"
                         value={document.url || ''}
                         onChange={(e) => {
                           setEditFormData(prev => {
                             const newDocs = [...(prev.documents || [])];
                             newDocs[index] = { ...newDocs[index], url: e.target.value };
                             return { ...prev, documents: newDocs };
                           });
                         }}
                         placeholder="رابط المستند (اختياري)..."
                         className="flex-1 p-2 text-sm rounded-md border focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                       />
                       <button
                         type="button"
                         onClick={() => {
                           setEditFormData(prev => ({
                             ...prev,
                             documents: prev.documents?.filter((_, i) => i !== index) || []
                           }));
                         }}
                         className="p-2 text-red-600 rounded-md hover:bg-red-50"
                       >
                         <Trash className="w-4 h-4" />
                       </button>
                     </div>
                   ) : (
                     <div className="p-2 text-sm break-all bg-gray-100 rounded">
                       {document.url ? (
                         <a href={document.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                           عرض المستند
                         </a>
                       ) : (
                         'لا يوجد رابط'
                       )}
                     </div>
                   )}
                 </div>
               </div>
             </div>
           ))}

           {(!editFormData.documents?.length && !formData.documents?.length) && (
             <div className="p-8 text-center text-gray-500 bg-gray-100 rounded-lg border-2 border-dashed">
               <span>لا توجد مستندات مرفوعة</span>
               {isEditing && <p className="mt-2 text-sm">استخدم الزر أدناه لإضافة مستند</p>}
             </div>
           )}

           {isEditing && (
             <button
               type="button"
               onClick={() => {
                 setEditFormData(prev => ({
                   ...prev,
                   documents: [...(prev.documents || []), { type: '', name: '', url: '' }]
                 }));
               }}
               className="flex gap-2 items-center px-4 py-2 text-orange-600 rounded-lg border border-orange-300 hover:bg-orange-50"
             >
               <Plus className="w-4 h-4" />
               إضافة مستند جديد
             </button>
           )}
         </div>

         {/* نصائح للمستندات */}
         <div className="p-3 mt-4 bg-blue-50 rounded-lg border border-blue-200">
           <h4 className="mb-2 text-sm font-semibold text-blue-800">نصائح للمستندات:</h4>
           <ul className="space-y-1 text-xs text-blue-700">
             <li>• تأكد من وضوح النص في صور المستندات</li>
             <li>• يمكنك رفع المستندات على خدمات التخزين السحابي ووضع الرابط هنا</li>
             <li>• حافظ على خصوصية المعلومات الحساسة</li>
             <li>• ينصح برفع نسخ مصورة وليس المستندات الأصلية</li>
           </ul>
         </div>
       </div>
    </div>
  );

  // Render contracts section
  const renderContracts = () => (
    <div className="space-y-6">
      <h2 className="pr-4 text-2xl font-semibold border-r-4 border-blue-500">العقود والاتصالات</h2>

      {/* تاريخ العقود */}
      <div>
        <label className="block text-sm font-medium text-gray-700">تاريخ العقود</label>
        {isEditing ? (
          <div className="space-y-2">
            {(editFormData.contract_history || []).map((contract, index) => (
              <div key={index} className="flex gap-2 items-center p-2 bg-gray-50 rounded">
                <input
                  type="text"
                  placeholder="النادي"
                  value={contract.club || ''}
                  onChange={(e) => {
                    const newHistory = [...(editFormData.contract_history || [])];
                    newHistory[index] = { ...contract, club: e.target.value };
                    setEditFormData(prev => ({ ...prev, contract_history: newHistory }));
                  }}
                  className="flex-1 p-1 rounded border"
                />
                <input
                  type="date"
                  placeholder="من"
                  value={contract.from || ''}
                  onChange={(e) => {
                    const newHistory = [...(editFormData.contract_history || [])];
                    newHistory[index] = { ...contract, from: e.target.value };
                    setEditFormData(prev => ({ ...prev, contract_history: newHistory }));
                  }}
                  className="p-1 rounded border"
                />
                <input
                  type="date"
                  placeholder="إلى"
                  value={contract.to || ''}
                  onChange={(e) => {
                    const newHistory = [...(editFormData.contract_history || [])];
                    newHistory[index] = { ...contract, to: e.target.value };
                    setEditFormData(prev => ({ ...prev, contract_history: newHistory }));
                  }}
                  className="p-1 rounded border"
                />
                <input
                  type="text"
                  placeholder="الدور"
                  value={contract.role || ''}
                  onChange={(e) => {
                    const newHistory = [...(editFormData.contract_history || [])];
                    newHistory[index] = { ...contract, role: e.target.value };
                    setEditFormData(prev => ({ ...prev, contract_history: newHistory }));
                  }}
                  className="p-1 rounded border"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newHistory = (editFormData.contract_history || []).filter((_, i) => i !== index);
                    setEditFormData(prev => ({ ...prev, contract_history: newHistory }));
                  }}
                  className="p-1 text-red-600 rounded hover:bg-red-100"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const newHistory = [...(editFormData.contract_history || []), { club: '', from: '', to: '', role: '' }];
                setEditFormData(prev => ({ ...prev, contract_history: newHistory }));
              }}
              className="flex gap-2 items-center p-2 text-blue-600 rounded border border-blue-300 hover:bg-blue-50"
            >
              <Plus className="w-4 h-4" />
              إضافة عقد
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {formData.contract_history && formData.contract_history.length > 0 ? (
              formData.contract_history.map((contract, index) => (
                <div key={index} className="p-2 bg-gray-100 rounded">
                  <span className="font-medium">{contract.club}</span>
                  <span className="text-gray-600"> - {contract.role}</span>
                  {contract.from && contract.to && (
                    <span className="text-gray-600"> ({contract.from} - {contract.to})</span>
                  )}
                </div>
              ))
            ) : (
              <div className="p-2 text-gray-500 bg-gray-100 rounded">لا يوجد تاريخ عقود مسجل</div>
            )}
          </div>
        )}
      </div>

      {/* تاريخ الوكلاء */}
      <div>
        <label className="block text-sm font-medium text-gray-700">تاريخ الوكلاء</label>
        {isEditing ? (
          <div className="space-y-2">
            {(editFormData.agent_history || []).map((agent, index) => (
              <div key={index} className="flex gap-2 items-center p-2 bg-gray-50 rounded">
                <input
                  type="text"
                  placeholder="اسم الوكيل"
                  value={agent.agent || ''}
                  onChange={(e) => {
                    const newHistory = [...(editFormData.agent_history || [])];
                    newHistory[index] = { ...agent, agent: e.target.value };
                    setEditFormData(prev => ({ ...prev, agent_history: newHistory }));
                  }}
                  className="flex-1 p-1 rounded border"
                />
                <input
                  type="date"
                  placeholder="من"
                  value={agent.from || ''}
                  onChange={(e) => {
                    const newHistory = [...(editFormData.agent_history || [])];
                    newHistory[index] = { ...agent, from: e.target.value };
                    setEditFormData(prev => ({ ...prev, agent_history: newHistory }));
                  }}
                  className="p-1 rounded border"
                />
                <input
                  type="date"
                  placeholder="إلى"
                  value={agent.to || ''}
                  onChange={(e) => {
                    const newHistory = [...(editFormData.agent_history || [])];
                    newHistory[index] = { ...agent, to: e.target.value };
                    setEditFormData(prev => ({ ...prev, agent_history: newHistory }));
                  }}
                  className="p-1 rounded border"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newHistory = (editFormData.agent_history || []).filter((_, i) => i !== index);
                    setEditFormData(prev => ({ ...prev, agent_history: newHistory }));
                  }}
                  className="p-1 text-red-600 rounded hover:bg-red-100"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const newHistory = [...(editFormData.agent_history || []), { agent: '', from: '', to: '' }];
                setEditFormData(prev => ({ ...prev, agent_history: newHistory }));
              }}
              className="flex gap-2 items-center p-2 text-blue-600 rounded border border-blue-300 hover:bg-blue-50"
            >
              <Plus className="w-4 h-4" />
              إضافة وكيل
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {formData.agent_history && formData.agent_history.length > 0 ? (
              formData.agent_history.map((agent, index) => (
                <div key={index} className="p-2 bg-gray-100 rounded">
                  <span className="font-medium">{agent.agent}</span>
                  {agent.from && agent.to && (
                    <span className="text-gray-600"> ({agent.from} - {agent.to})</span>
                  )}
                </div>
              ))
            ) : (
              <div className="p-2 text-gray-500 bg-gray-100 rounded">لا يوجد تاريخ وكلاء مسجل</div>
            )}
          </div>
        )}
      </div>

      {/* جهة الاتصال الرسمية */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">جهة الاتصال الرسمية</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">الاسم</label>
            {isEditing ? (
              <input
                type="text"
                value={editFormData.official_contact?.name || ''}
                onChange={(e) => {
                  setEditFormData(prev => ({
                    ...prev,
                    official_contact: {
                      ...prev.official_contact,
                      name: e.target.value,
                      title: prev.official_contact?.title || '',
                      phone: prev.official_contact?.phone || '',
                      email: prev.official_contact?.email || ''
                    }
                  }));
                }}
                className="p-2 mt-1 w-full text-gray-900 bg-white rounded-md border"
                placeholder="اسم جهة الاتصال"
              />
            ) : (
              <div className="p-2 mt-1 text-gray-900 bg-gray-100 rounded-md">
                {formData.official_contact?.name || 'غير محدد'}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">المنصب</label>
            {isEditing ? (
              <input
                type="text"
                value={editFormData.official_contact?.title || ''}
                onChange={(e) => {
                  setEditFormData(prev => ({
                    ...prev,
                    official_contact: {
                      ...prev.official_contact,
                      title: e.target.value,
                      name: prev.official_contact?.name || '',
                      phone: prev.official_contact?.phone || '',
                      email: prev.official_contact?.email || ''
                    }
                  }));
                }}
                className="p-2 mt-1 w-full text-gray-900 bg-white rounded-md border"
                placeholder="منصب جهة الاتصال"
              />
            ) : (
              <div className="p-2 mt-1 text-gray-900 bg-gray-100 rounded-md">
                {formData.official_contact?.title || 'غير محدد'}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">الهاتف</label>
            {isEditing ? (
              <input
                type="tel"
                value={editFormData.official_contact?.phone || ''}
                onChange={(e) => {
                  setEditFormData(prev => ({
                    ...prev,
                    official_contact: {
                      ...prev.official_contact,
                      phone: e.target.value,
                      name: prev.official_contact?.name || '',
                      title: prev.official_contact?.title || '',
                      email: prev.official_contact?.email || ''
                    }
                  }));
                }}
                className="p-2 mt-1 w-full text-gray-900 bg-white rounded-md border"
                placeholder="هاتف جهة الاتصال"
              />
            ) : (
              <div className="p-2 mt-1 text-gray-900 bg-gray-100 rounded-md">
                {formData.official_contact?.phone || 'غير محدد'}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">البريد الإلكتروني</label>
            {isEditing ? (
              <input
                type="email"
                value={editFormData.official_contact?.email || ''}
                onChange={(e) => {
                  setEditFormData(prev => ({
                    ...prev,
                    official_contact: {
                      ...prev.official_contact,
                      email: e.target.value,
                      name: prev.official_contact?.name || '',
                      title: prev.official_contact?.title || '',
                      phone: prev.official_contact?.phone || ''
                    }
                  }));
                }}
                className="p-2 mt-1 w-full text-gray-900 bg-white rounded-md border"
                placeholder="بريد جهة الاتصال"
              />
            ) : (
              <div className="p-2 mt-1 text-gray-900 bg-gray-100 rounded-md">
                {formData.official_contact?.email || 'غير محدد'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* الإنجازات */}
      <div>
        <label className="block text-sm font-medium text-gray-700">الإنجازات</label>
        {isEditing ? (
          <div className="space-y-2">
            {(editFormData.achievements || []).map((achievement, index) => (
              <div key={index} className="flex gap-2 items-center p-2 bg-gray-50 rounded">
                <input
                  type="text"
                  placeholder="عنوان الإنجاز"
                  value={achievement.title || ''}
                  onChange={(e) => {
                    const newAchievements = [...(editFormData.achievements || [])];
                    newAchievements[index] = { ...achievement, title: e.target.value };
                    setEditFormData(prev => ({ ...prev, achievements: newAchievements }));
                  }}
                  className="flex-1 p-1 rounded border"
                />
                <input
                  type="date"
                  value={achievement.date || ''}
                  onChange={(e) => {
                    const newAchievements = [...(editFormData.achievements || [])];
                    newAchievements[index] = { ...achievement, date: e.target.value };
                    setEditFormData(prev => ({ ...prev, achievements: newAchievements }));
                  }}
                  className="p-1 rounded border"
                />
                <input
                  type="text"
                  placeholder="وصف (اختياري)"
                  value={achievement.description || ''}
                  onChange={(e) => {
                    const newAchievements = [...(editFormData.achievements || [])];
                    newAchievements[index] = { ...achievement, description: e.target.value };
                    setEditFormData(prev => ({ ...prev, achievements: newAchievements }));
                  }}
                  className="flex-1 p-1 rounded border"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newAchievements = (editFormData.achievements || []).filter((_, i) => i !== index);
                    setEditFormData(prev => ({ ...prev, achievements: newAchievements }));
                  }}
                  className="p-1 text-red-600 rounded hover:bg-red-100"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const newAchievements = [...(editFormData.achievements || []), { title: '', date: '', description: '' }];
                setEditFormData(prev => ({ ...prev, achievements: newAchievements }));
              }}
              className="flex gap-2 items-center p-2 text-blue-600 rounded border border-blue-300 hover:bg-blue-50"
            >
              <Plus className="w-4 h-4" />
              إضافة إنجاز
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {formData.achievements && formData.achievements.length > 0 ? (
              formData.achievements.map((achievement, index) => (
                <div key={index} className="p-2 bg-gray-100 rounded">
                  <span className="font-medium">{achievement.title}</span>
                  {achievement.date && <span className="text-gray-600"> - {achievement.date}</span>}
                  {achievement.description && (
                    <div className="mt-1 text-sm text-gray-600">{achievement.description}</div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-2 text-gray-500 bg-gray-100 rounded">لا توجد إنجازات مسجلة</div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Main render
  if (loading || isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    router.push('/auth/login');
    return null;
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <ErrorMessage message={error} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {successMessage && <SuccessMessage message={successMessage} />}

      {/* Registration Success Modal */}
      {showRegistrationSuccess && (
        <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
          <div className="p-8 mx-4 max-w-md text-center bg-white rounded-2xl shadow-2xl">
            <div className="mb-6">
              <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-bold text-gray-900">🎉 تم تسجيل بياناتك بنجاح!</h3>
              <p className="mb-4 text-gray-600">
                تم حفظ معلوماتك وهي الآن قيد المراجعة من قبل فريقنا المختص
              </p>
            </div>

            {!subscription || subscription.status !== 'active' ? (
              <div className="p-4 mb-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <div className="flex justify-center items-center mb-3">
                  <span className="text-2xl">🚀</span>
                  <h4 className="mr-2 text-lg font-semibold text-blue-800">خطوة واحدة تفصلك عن النجاح!</h4>
                </div>
                <p className="mb-4 text-sm text-blue-700">
                  لنشر حسابك على كل الأندية والوكلاء، يتبقى فقط دفع الاشتراك
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowRegistrationSuccess(false);
                      window.open('/dashboard/payment', '_blank');
                    }}
                    className="flex-1 px-4 py-2 font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg transition-all hover:from-blue-700 hover:to-purple-700"
                  >
                    💳 دفع الاشتراك الآن
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 mb-6 bg-green-50 rounded-lg">
                <div className="flex justify-center items-center mb-2">
                  <span className="text-2xl">✅</span>
                  <h4 className="mr-2 text-lg font-semibold text-green-800">اشتراكك مفعل!</h4>
                </div>
                <p className="text-sm text-green-700">
                  ملفك سيظهر للأندية والوكلاء بعد مراجعة البيانات
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowRegistrationSuccess(false)}
                className="flex-1 px-4 py-2 font-medium text-gray-700 bg-gray-100 rounded-lg transition-colors hover:bg-gray-200"
              >
                متابعة
              </button>
              <button
                onClick={() => {
                  setShowRegistrationSuccess(false);
                  window.open('/dashboard/subscription', '_blank');
                }}
                className="flex-1 px-4 py-2 font-medium text-blue-700 bg-blue-100 rounded-lg transition-colors hover:bg-blue-200"
              >
                📊 حالة الاشتراك
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="py-8 min-h-screen bg-gray-50" dir="rtl">
        <div className="px-4 mx-auto max-w-4xl sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">الملف الشخصي</h1>
                <p className="mt-2 text-gray-600">إدارة وتحديث بياناتك الشخصية والرياضية</p>
              </div>
              {!isEditing && (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="text-white bg-blue-600 hover:bg-blue-700"
                >
                  تعديل البيانات
                </Button>
              )}
            </div>
          </div>

          {/* Progress Steps */}
          {isEditing && (
            <div className="mb-8">
              <div className="flex justify-between items-center">
                {Object.entries(STEP_TITLES).map(([step, title]) => (
                  <div
                    key={step}
                    className={`flex items-center ${
                      parseInt(step) <= currentStep ? 'text-blue-600' : 'text-gray-400'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        parseInt(step) <= currentStep
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {parseInt(step) + 1}
                    </div>
                    <span className="hidden mr-2 text-sm md:inline">{title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-6 bg-white rounded-lg shadow-lg">
                                     {!isEditing ? (
              <>
                {renderPersonalInfo()}
                <div className="mt-8">
                  {renderEducation()}
                </div>
                <div className="mt-8">
                  {renderMedical()}
                </div>
                <div className="mt-8">
                  {renderSportsInfo()}
                </div>
                <div className="mt-8">
                  {renderSkills()}
                </div>
                <div className="mt-8">
                  {renderObjectives()}
                </div>
                <div className="mt-8">
                  {renderMedia()}
                </div>
                <div className="mt-8">
                  {renderContracts()}
                </div>
              </>
            ) : (
              <>
                {currentStep === STEPS.PERSONAL && renderPersonalInfo()}
                {currentStep === STEPS.EDUCATION && renderEducation()}
                {currentStep === STEPS.MEDICAL && renderMedical()}
                {currentStep === STEPS.SPORTS && renderSportsInfo()}
                {currentStep === STEPS.SKILLS && renderSkills()}
                {currentStep === STEPS.OBJECTIVES && renderObjectives()}
                {currentStep === STEPS.MEDIA && renderMedia()}
                {currentStep === STEPS.CONTRACTS && renderContracts()}

                {/* Navigation Buttons */}
               <div className="flex justify-between mt-8">
                 <div className="flex gap-4">
                   {currentStep > 0 && (
                     <Button
                       onClick={handlePrevious}
                       variant="outline"
                       className="flex gap-2 items-center"
                     >
                       <ArrowRight className="w-4 h-4" />
                       السابق
                     </Button>
                   )}
                 </div>

                 <div className="flex gap-4">
                   <Button
                     onClick={handleCancel}
                     variant="outline"
                     className="text-gray-600 border-gray-300"
                   >
                     إلغاء
                   </Button>

                   {currentStep < Object.keys(STEP_TITLES).length - 1 ? (
                     <Button
                       onClick={handleNext}
                       className="flex gap-2 items-center text-white bg-blue-600 hover:bg-blue-700"
                     >
                       التالي
                       <ArrowLeft className="w-4 h-4" />
                     </Button>
                   ) : (
                     <Button
                       onClick={handleSave}
                       className="text-white bg-green-600 hover:bg-green-700"
                     >
                       حفظ البيانات
                     </Button>
                   )}
                 </div>
               </div>
             </>
           )}
          </div>
        </div>
      </div>
    </div>
  );
}
