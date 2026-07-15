'use client';

import { Button } from "@/components/ui/button";
import { useAuth } from '@/lib/firebase/auth-provider';
import { supabase } from '@/lib/supabase/config';
import { ArrowLeft, ArrowRight, Check, Plus, Trash, X } from 'lucide-react';

import PlayerLoginCredentials from '@/components/shared/PlayerLoginCredentials';
import { SUPPORTED_COUNTRIES, getCitiesByCountry, getCountryFromCity } from '@/data/countries-from-register';
import { AccountType, uploadPlayerProfileImage } from '@/lib/firebase/upload-media';
import { useTranslation } from '@/lib/i18n';
import { createPlayerLoginAccount, checkPlayerHasLoginAccount } from '@/lib/utils/player-login-account';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

// Types
interface ExtendedUser {
  id?: string;
  email?: string | null;
  displayName?: string | null;
  full_name?: string;
  phone?: string;
  country?: string;
}


interface PlayerFormData {
  id?: string;
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
  objectives: Record<string, boolean | string>;
  profile_image: { url: string } | string | null;
  additional_images: Array<{ url: string }>;
  videos: { url: string; desc: string }[];
  uploaded_videos?: Array<{ url: string; name?: string }>;
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
  // حقول الربط بالمنظمات
  club_id?: string;
  clubId?: string;
  academy_id?: string;
  academyId?: string;
  trainer_id?: string;
  trainerId?: string;
  agent_id?: string;
  agentId?: string;
  // إضافة حقول التتبع
  addedBy?: {
    accountType: 'club' | 'academy' | 'trainer' | 'agent';
    accountId: string;
    accountName: string;
    dateAdded: Date;
  };
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
// استخدام أسماء الدول من SUPPORTED_COUNTRIES كجنسيات
const NATIONALITIES = SUPPORTED_COUNTRIES.map(country => country.name).sort();

const COUNTRIES = SUPPORTED_COUNTRIES;

const BLOOD_TYPES = [
  'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'
];

// Loading Component
const LoadingSpinner: React.FC = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div className="w-16 h-16 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
  </div>
);

// Success Message Component
const SuccessMessage: React.FC<{ message: string }> = ({ message }) => (
  <div className="fixed inset-x-0 top-0 z-50 p-4">
    <div className="w-full max-w-md p-4 mx-auto bg-green-100 rounded-lg shadow-lg">
      <div className="flex items-center">
        <Check className="w-5 h-5 mr-2 text-green-500" />
        <p className="text-green-700">{message}</p>
      </div>
    </div>
  </div>
);

// Error Message Component
const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <div className="p-4 mb-4 bg-red-100 border border-red-400 rounded-md">
    <div className="flex items-center">
      <X className="w-5 h-5 mr-2 text-red-500" />
      <p className="text-red-700">{message}</p>
    </div>
  </div>
);

// Validation functions
const interpolate = (template: string, values: Record<string, string | number> = {}) =>
  template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(values[key] ?? ''));

const validatePersonalInfo = (data: PlayerFormData, copy: any): FormErrors => {
  const errors: FormErrors = {};
  if (!data.full_name) errors.full_name = copy.errors.fullNameRequired;

  if (!data.birth_date) {
    errors.birth_date = copy.errors.birthDateRequired;
  } else {
    const birthDate = new Date(data.birth_date);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 3) {
      errors.birth_date = copy.errors.minAge;
    }

    if (age > 50) {
      errors.birth_date = copy.errors.maxAge;
    }
  }

  if (!data.nationality) errors.nationality = copy.errors.nationalityRequired;
  if (!data.country) errors.country = copy.errors.countryRequired;
  if (!data.city) errors.city = copy.errors.cityRequired;
  if (!data.phone) errors.phone = copy.errors.phoneRequired;
  if (!data.email) errors.email = copy.errors.emailRequired;
  return errors;
};

const validateSports = (data: PlayerFormData, copy: any): FormErrors => {
  const errors: FormErrors = {};
  if (!data.primary_position) errors.primary_position = copy.errors.primaryPositionRequired;
  if (!data.preferred_foot) errors.preferred_foot = copy.errors.preferredFootRequired;
  return errors;
};

// دالة تنظيف الكائن من undefined وتحويل التواريخ
function cleanObject(obj: any) {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => {
      if (v instanceof Date) return [k, v.toISOString()];
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) return [k, cleanObject(v)];
      return [k, v];
    }).filter(([_, v]) => v !== undefined)
  );
}

// Main Component
export default function SharedPlayerForm({
  mode: modeProp,
  accountType: accountTypeProp,
  playerId: playerIdProp
}: {
  mode?: string;
  accountType?: string;
  playerId?: string;
} = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getTranslations, isRTL } = useTranslation();
  const copy = getTranslations<any>('playerForm');
  const stepTitles = copy.stepTitles;
  const positions = copy.positions;
  const educationLevels = copy.educationLevels;
  const languageLevels = copy.languageLevels;
  const footPreferences = copy.footPreferences;
  const referralSourceEntries = Object.entries(copy.referralSources) as Array<[string, string]>;
  const { user, loading } = useAuth();

  // استخدم البراميترز من props إذا وُجدت، وإلا من URL
  const mode = modeProp || (searchParams.get('edit') ? 'edit' : searchParams.get('mode')) || 'add';
  const accountType = accountTypeProp || searchParams.get('accountType') || 'club';
  const playerId = playerIdProp || searchParams.get('edit') || searchParams.get('playerId');

  // لوج تشخيصي في بداية الكومبوننت
  console.log('[SharedPlayerForm] mode:', mode, 'playerId:', playerId, 'accountType:', accountType);

  // State
  const [playerData, setPlayerData] = useState<PlayerFormData | null>(null);
  const [formData, setFormData] = useState<PlayerFormData>({
    ...defaultPlayerFields,
    // البيانات الشخصية
    full_name: '',
    birth_date: '',
    nationality: '',
    country: '',
    city: '',
    phone: '',
    email: '',
    whatsapp: '',
    brief: '',

    // المعلومات التعليمية
    education_level: '',
    graduation_year: '',
    degree: '',
    english_level: '',
    arabic_level: '',
    spanish_level: '',

    // السجل الطبي
    blood_type: '',
    chronic_conditions: false,
    chronic_details: '',
    allergies: '',
    medical_notes: '',

    // المعلومات الرياضية
    primary_position: '',
    secondary_position: '',
    preferred_foot: '',
    experience_years: '',
    height: '',
    weight: '',
    sports_notes: '',

    // المهارات
    technical_skills: {},
    physical_skills: {},
    social_skills: {},

    // الأهداف
    objectives: {},

    // الوسائط
    profile_image: null,
    additional_images: [],
    videos: [],
    uploaded_videos: [],

    // العقود والاتصالات
    currently_contracted: 'no',
    current_club: '',
    player_number: '',
    favorite_jersey_number: '',
    official_contact: {
      name: '',
      title: '',
      phone: '',
      email: ''
    },
    has_passport: 'no',
    ref_source: '',
    address: '',

    // تحديثات جديدة
    training_courses: [],
    surgeries: [],
    club_history: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [filteredCities, setFilteredCities] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [createLoginAccount, setCreateLoginAccount] = useState(true); // تفعيل إنشاء الحساب افتراضياً
  const [loginAccountPassword, setLoginAccountPassword] = useState<string>('');
  const [showLoginCredentials, setShowLoginCredentials] = useState(false);
  const [createdAccountInfo, setCreatedAccountInfo] = useState<{
    email: string;
    password: string;
    name?: string;
    phone?: string;
    whatsapp?: string;
    success?: boolean;
  } | null>(null);

  // كلمة المرور الثابتة الموحدة
  const UNIFIED_PASSWORD = '123456789';

  // Get account type for upload functions
  const getAccountType = (): AccountType => {
    return accountType as AccountType;
  };

  // Upload profile image
  const handleProfileImageUpload = async (file: File) => {
    if (!user?.id) return;

    setUploadingProfileImage(true);
    try {
      const result = await uploadPlayerProfileImage(file, user.id, getAccountType());

      if (result?.url) {
        setFormData(prev => ({
          ...prev,
          profile_image: { url: result.url },
          profile_image_url: result.url
        }));

        console.log('✅ تم رفع الصورة الشخصية بنجاح');
      }
    } catch (error) {
      console.error('Error uploading profile image:', error);
        alert(`❌ ${copy.errors.uploadProfile} - ` + (error instanceof Error ? error.message : copy.errors.unknownError));
    } finally {
      setUploadingProfileImage(false);
    }
  };

  // Load existing player data if editing - محسنة للأداء
  const loadPlayerData = useCallback(async () => {
    try {
      console.log('[loadPlayerData] mode:', mode, 'playerId:', playerId);
      if (mode === 'edit' && playerId) {
        console.log('[player-form] محاولة تحميل بيانات اللاعب:', playerId);
        // Edit mode - load player data
        const { data: playerRow, error: fetchErr } = await supabase
          .from('players')
          .select('*')
          .eq('id', playerId)
          .single();
        if (!!playerRow) {
          const data = playerRow;
          console.log('[player-form] ✅ تم العثور على بيانات اللاعب:', data);

          // التحقق من الملكية قبل السماح بالتعديل
          const isOwner =
            data.created_by   === user?.id ||
            data.club_id      === user?.id ||
            data.clubId       === user?.id ||
            data.academy_id   === user?.id ||
            data.academyId    === user?.id ||
            data.trainer_id   === user?.id ||
            data.trainerId    === user?.id ||
            data.agent_id     === user?.id ||
            data.agentId      === user?.id ||
            data.marketerId   === user?.id ||
            accountType       === 'admin';
          if (!isOwner) {
            setError(copy.errors.noPermission);
            setIsLoading(false);
            return;
          }

          const processedData = {
            ...defaultPlayerFields,
            ...data
          };
          setPlayerData(processedData);
          setFormData(processedData);
          setError(null);
        } else {
          console.error('[player-form] ❌ اللاعب غير موجود في قاعدة البيانات');
          setError(copy.errors.playerNotFound);
        }
      } else {
        // Add mode - load user data and set defaults
        console.log('[player-form] وضع الإضافة - تحميل البيانات الافتراضية من المستخدم');
        await loadUserDefaultData();
      }
    } catch (err) {
      console.error('[player-form] ❌ خطأ أثناء جلب بيانات اللاعب:', err);
      setError(copy.errors.loadPlayer);
    } finally {
      setIsLoading(false);
    }
  }, [mode, playerId]);

  // Load user default data for add mode
  const loadUserDefaultData = useCallback(async () => {
    try {
      if (!user) {
        setFormData(defaultPlayerFields);
        setPlayerData(null);
        setError(null);
        return;
      }

      console.log('[loadUserDefaultData] تحميل بيانات المستخدم الحالي:', user);

      // جلب بيانات المستخدم الحالي من قاعدة البيانات
      const { data: userRow } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      let userData = null;
      if (!!userRow) {
        userData = userRow;
        console.log('[loadUserDefaultData] ✅ تم العثور على بيانات المستخدم:', userData);
      }

      // إنشاء البيانات الافتراضية مع دمج بيانات المستخدم
      const defaultData = {
        ...defaultPlayerFields,
        // البيانات الأساسية من Firebase Auth
        email: user.email || '',

        // البيانات من مجموعة users إذا وُجدت
        ...(userData && {
          country: userData.country || '',
          phone: userData.phone || '',
          nationality: userData.nationality || '',
          city: userData.city || '',
        }),

        // تحديد معلومات الاتصال الرسمي حسب نوع الحساب
        official_contact: {
          name: userData?.full_name || userData?.name || user.user_metadata?.full_name || '',
          title: getAccountTypeTitle(accountType),
          phone: userData?.phone || '',
          email: user.email || ''
        },

        // تحديد المصدر
        ref_source: `${copy.ui.addTitle} - ${getAccountTypeTitle(accountType)}: ${userData?.full_name || userData?.name || user.user_metadata?.full_name || ''}`
      };

      console.log('[loadUserDefaultData] ✅ البيانات الافتراضية المحضرة:', defaultData);

      setFormData(defaultData);
      setPlayerData(null);
      setError(null);

    } catch (err) {
      console.error('[loadUserDefaultData] ❌ خطأ في تحميل البيانات الافتراضية:', err);
      // في حالة الخطأ، استخدم البيانات الافتراضية الأساسية
      setFormData(defaultPlayerFields);
      setPlayerData(null);
      setError(null);
    }
  }, [user, accountType]);

  // Helper function to get account type title
  const getAccountTypeTitle = (type: string) => {
    const titles = {
      club: copy.accountTypes.club,
      academy: copy.accountTypes.academy,
      trainer: copy.accountTypes.trainer,
      agent: copy.accountTypes.agent
    };
    return titles[type as keyof typeof titles] || copy.accountTypes.admin;
  };

  // Effects - محسنة للأداء
  useEffect(() => {
    if (!loading) {
      if (user) {
        loadPlayerData();
      } else {
        setIsLoading(false);
        router.push('/auth/login');
      }
    }
  }, [user, loading, loadPlayerData, router, mode, playerId]);

  // Update available cities when country changes
  useEffect(() => {
    if (formData.country) {
      try {
        const cities = getCitiesByCountry(formData.country);
        setAvailableCities(cities);
        console.log(`🗺️ تم تحديث المدن المتاحة لدولة: ${formData.country} (${cities.length} مدينة)`);
      } catch (error) {
        console.warn('Error loading cities:', error);
        setAvailableCities([]);
      }
    } else {
      setAvailableCities([]);
    }
  }, [formData.country]);

  // تحديد الدولة تلقائياً إذا كانت المدينة موجودة ولكن الدولة غير محددة (مرة واحدة فقط)
  useEffect(() => {
    if (formData.city && !formData.country) {
      const detectedCountry = getCountryFromCity(formData.city);
      if (detectedCountry) {
        setFormData(prev => ({
          ...prev,
          country: detectedCountry
        }));
        console.log(`🔧 تم تحديد الدولة تلقائياً من البيانات المحفوظة: "${formData.city}" -> "${detectedCountry}"`);
      }
    }
  }, [formData.city]); // إزالة formData.country من dependency array

  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleCountryChange = (country: string) => {
    setFormData(prev => ({
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

    // إعادة تعيين قيم البحث
    setCitySearchQuery('');
    setShowCityDropdown(false);
  };

  const handleCityChange = (city: string) => {
    setFormData(prev => ({
      ...prev,
      city: city
    }));

    // تحديد الدولة تلقائياً بناءً على المدينة (فقط إذا لم تكن محددة)
    if (city && !formData.country) {
      const detectedCountry = getCountryFromCity(city);
      if (detectedCountry) {
        setFormData(prev => ({
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

  const handleCitySearch = (query: string) => {
    if (!query.trim()) {
      setFilteredCities([]);
      return;
    }

    const filtered = availableCities.filter(city =>
      city.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredCities(filtered.slice(0, 10));
  };

  const validateForm = () => {
    // Validate all steps
    let allErrors: FormErrors = {};

    // Validate personal info
    const personalErrors = validatePersonalInfo(formData, copy);
    allErrors = { ...allErrors, ...personalErrors };

    // Validate sports info
    const sportsErrors = validateSports(formData, copy);
    allErrors = { ...allErrors, ...sportsErrors };

    setFormErrors(allErrors);
    return Object.keys(allErrors).length === 0;
  };

  const checkDataUniqueness = async (email: string, phone: string) => {
    if (!email && !phone) return { unique: true };

    const collectionsToCheck = ['users', 'players', 'clubs', 'academies', 'trainers', 'agents'];
    const getCollectionLabel = (collection: string) =>
      collection === 'users'
        ? copy.errors.collections.users
        : collection === 'players'
          ? copy.errors.collections.players
          : copy.errors.collections.organizations;

    for (const coll of collectionsToCheck) {
      if (email) {
        const { data: emailRows } = await supabase
          .from(coll)
          .select('id')
          .eq('email', email);

        // Filter out current player in case of edit mode
        const existingDocs = (emailRows || []).filter((d: any) => mode === 'add' || d.id !== playerId);

        if (existingDocs.length > 0) {
          return {
            unique: false,
            field: 'email',
            message: interpolate(copy.errors.duplicateEmail, { value: email, collection: getCollectionLabel(coll) })
          };
        }
      }

      if (phone) {
        const { data: phoneRows } = await supabase
          .from(coll)
          .select('id')
          .eq('phone', phone);

        // Filter out current player in case of edit mode
        const existingDocs = (phoneRows || []).filter((d: any) => mode === 'add' || d.id !== playerId);

        if (existingDocs.length > 0) {
          return {
            unique: false,
            field: 'phone',
            message: interpolate(copy.errors.duplicatePhone, { value: phone, collection: getCollectionLabel(coll) })
          };
        }
      }
    }

    return { unique: true };
  };

  const handleNext = async () => {
    // Validate current step
    let errors: FormErrors = {};

    if (currentStep === STEPS.PERSONAL) {
      errors = validatePersonalInfo(formData, copy);

      if (Object.keys(errors).length === 0) {
        setIsSaving(true); // استخدام مؤشر التحميل
        const { unique, field, message } = await checkDataUniqueness(formData.email, formData.phone);
        setIsSaving(false);

        if (!unique) {
          toast.error(message);
          setFormErrors({ [field as string]: copy.errors.duplicateData });
          return;
        }
      }
    }
    else if (currentStep === STEPS.SPORTS) {
      errors = validateSports(formData, copy);
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setCurrentStep(prev => Math.min(prev + 1, Object.keys(stepTitles).length - 1));
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSave = async () => {
    if (!validateForm() || !user) return;

    // منع الإرسال المتكرر
    if (isSaving) {
      console.log('🛑 Player form saving blocked - already saving');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      let updateData = {
        ...formData,
        updated_at: new Date(),
        updated_by: user.id,
        updated_by_type: accountType
      };
      updateData = cleanObject(updateData);
      console.log('[player-form] البيانات المرسلة إلى الحفظ:', updateData);

      if (mode === 'add') {
        // التحقق النهائي من تفرد البيانات (إيميل وهاتف) في جميع المجموعات
        const { unique, message } = await checkDataUniqueness(updateData.email, updateData.phone);
        if (!unique) {
          toast.error(message);
          setError(message);
          setIsSaving(false);
          return;
        }

        // إضافة لاعب جديد مع الحقول المناسبة حسب نوع الحساب
        const playerData = {
          ...updateData,
          created_at: new Date(),
          created_by: user.id,
          created_by_type: accountType
        };

        // إضافة الحقول المناسبة حسب نوع الحساب
        switch (accountType) {
          case 'club':
            playerData.club_id = user.id;
            playerData.clubId = user.id;
            break;
          case 'academy':
            playerData.academy_id = user.id;
            playerData.academyId = user.id;
            break;
          case 'trainer':
            playerData.trainer_id = user.id;
            playerData.trainerId = user.id;
            break;
          case 'agent':
            playerData.agent_id = user.id;
            playerData.agentId = user.id;
            break;
          case 'marketer':
            (playerData as any).marketerId = user.id;
            break;
          default:
            // للحالات الأخرى، استخدم club_id كافتراضي
            playerData.club_id = user.id;
            playerData.clubId = user.id;
        }

        const newPlayerId = crypto.randomUUID();
        const { data: docRef, error: insertErr } = await supabase
          .from('players')
          .insert({ id: newPlayerId, ...playerData })
          .select('id')
          .single();
        if (insertErr) throw insertErr;
        setSuccessMessage(copy.status.addSuccess);

        // إنشاء حساب تسجيل دخول تلقائياً مع كلمة مرور ثابتة
        if (createLoginAccount && mode === 'add' && updateData.email) {
          try {
            console.log('[player-form] إنشاء حساب تسجيل دخول للاعب:', updateData.full_name);

            // إنشاء حساب بكلمة المرور الثابتة
            const result = await createPlayerLoginAccount(
              newPlayerId,
              {
                full_name: updateData.full_name,
                name: updateData.full_name,
                email: updateData.email,
                phone: updateData.phone,
                whatsapp: updateData.whatsapp,
                club_id: playerData.club_id,
                academy_id: playerData.academy_id,
                trainer_id: playerData.trainer_id,
                agent_id: playerData.agent_id,
                ...updateData,
                profile_image: typeof updateData.profile_image === 'object' && updateData.profile_image !== null
                  ? (updateData.profile_image as { url: string }).url
                  : (updateData.profile_image as string | undefined) ?? undefined,
              },
              'players',
              UNIFIED_PASSWORD // استخدام كلمة المرور الثابتة
            );

            if (result.success) {
              setLoginAccountPassword(UNIFIED_PASSWORD);

              // تجهيز بيانات عرض الاعتماد
              setCreatedAccountInfo({
                email: updateData.email,
                password: UNIFIED_PASSWORD,
                success: true
              });

              // عرض مكون بيانات الاعتماد
              setShowLoginCredentials(true);

              setSuccessMessage(copy.status.addWithLoginSuccess);
              console.log('[player-form] تم إنشاء حساب تسجيل الدخول بنجاح');
            } else {
              toast.error(interpolate(copy.errors.loginFailed, { message: result.message }));
              console.error('فشل في إنشاء حساب الدخول:', result.message);
            }
          } catch (error) {
            console.error('خطأ في إنشاء حساب الدخول:', error);
            toast.error(copy.errors.loginCreate);
          }
        } else if (createLoginAccount && mode === 'add' && !updateData.email) {
          toast.error(copy.errors.loginWithoutEmail);
        }
      } else if (mode === 'edit' && playerId) {
        // تعديل لاعب موجود
        const { error: updateErr } = await supabase
          .from('players')
          .update(updateData)
          .eq('id', playerId);
        if (updateErr) throw updateErr;
        setSuccessMessage(copy.status.updateSuccess);
      } else {
        setError(copy.errors.invalidMode);
        return;
      }

      setTimeout(() => {
        if (accountType === 'club') {
          router.push('/dashboard/club/players');
        } else {
          router.push(`/dashboard/${accountType}/players`);
        }
      }, 2000);

    } catch (err) {
      console.error('Error saving player:', err);
      setError(copy.errors.save);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/dashboard/${accountType}/players`);
  };

  // Main render
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
          <p className="mt-4 text-gray-600">{copy.status.loading}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="p-8 text-center bg-white rounded-lg shadow-md">
          <h2 className="mb-4 text-2xl font-semibold text-red-600">{copy.ui.errorTitle}</h2>
          <p className="mb-6 text-gray-600">{error}</p>
          <button onClick={() => {
            // إعادة تحميل الصفحة بطريقة آمنة
            if (typeof window !== 'undefined') {
              window.location.href = window.location.href;
            }
          }} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">{copy.ui.retry}</button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* عرض بيانات اعتماد تسجيل الدخول */}
      {showLoginCredentials && createdAccountInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <PlayerLoginCredentials
              playerData={{
                full_name: formData.full_name,
                name: formData.full_name,
                email: createdAccountInfo.email,
                phone: formData.phone,
                whatsapp: formData.whatsapp,
              }}
              password={createdAccountInfo.password}
              accountOwner={{
                name: (user as any)?.full_name || user?.user_metadata?.full_name,
                organizationName: (user as any)?.organizationName || (user as any)?.full_name || copy.ui.organization,
                phone: (user as any)?.phone,
                whatsapp: (user as any)?.whatsapp,
                accountType: accountType
              }}
              onClose={() => setShowLoginCredentials(false)}
            />
          </div>
        </div>
      )}

      {successMessage && <SuccessMessage message={successMessage} />}

      <div className="min-h-screen bg-gray-50 py-8" dir="rtl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
              >
                <ArrowRight className="w-5 h-5" />
                {copy.ui.back}
              </button>
            </div>

            <h1 className="text-3xl font-bold text-gray-900">
              {mode === 'add' ? copy.ui.addTitle : copy.ui.editTitle}
            </h1>
            <p className="mt-2 text-gray-600">
              {mode === 'add'
                ? interpolate(copy.ui.addSubtitle, { accountType: copy.accountTypes[accountType] || accountType })
                : copy.ui.editSubtitle
              }
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {(Object.entries(stepTitles) as Array<[string, string]>).map(([step, title]) => (
                <div
                  key={step}
                  className={`flex items-center ${parseInt(step) <= currentStep ? 'text-blue-600' : 'text-gray-400'
                    }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${parseInt(step) <= currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                      }`}
                  >
                    {parseInt(step) + 1}
                  </div>
                  <span className="mr-2 text-sm hidden md:inline">{title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            {/* النماذج حسب الخطوة */}
            {currentStep === STEPS.PERSONAL && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{copy.stepTitles[STEPS.PERSONAL]}</h3>

                {/* الصورة الشخصية */}
                <div className="bg-gray-50 p-6 rounded-lg mb-6">
                  <h4 className="text-md font-semibold text-gray-800 mb-4">{copy.ui.profileImage}</h4>

                  <div className="flex items-center space-x-6 space-x-reverse">
                    <div className="flex-shrink-0">
                      {formData.profile_image && typeof formData.profile_image === 'object' && formData.profile_image.url ? (
                        <div className="relative">
                          <img
                            src={formData.profile_image.url}
                            alt={copy.ui.profileImage}
                            className="w-30 h-30 rounded-full object-cover border-4 border-white shadow-lg"
                            style={{ width: '120px', height: '120px' }}
                            onError={(e) => {
                              console.log('❌ خطأ في تحميل الصورة:', (formData.profile_image as { url: string })?.url);
                              e.currentTarget.src = '/images/default-avatar.png';
                            }}
                          />
                          <button
                            onClick={() => setFormData(prev => ({ ...prev, profile_image: null }))}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-30 h-30 rounded-full bg-gray-200 flex items-center justify-center">
                          <div className="text-gray-400 text-center">
                            <Plus className="w-8 h-8 mx-auto mb-2" />
                            <span className="text-sm">{copy.ui.addImage}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleProfileImageUpload(file);
                          }
                        }}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        disabled={uploadingProfileImage}
                      />
                      {uploadingProfileImage && (
                        <p className="text-sm text-blue-600 mt-2">{copy.status.uploadingImage}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* الاسم الكامل */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {copy.ui.fullName}
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={copy.ui.fullNamePlaceholder}
                    />
                    {formErrors.full_name && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.full_name}</p>
                    )}
                  </div>

                  {/* تاريخ الميلاد */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {copy.ui.birthDate}
                    </label>
                    <input
                      type="date"
                      name="birth_date"
                      value={formData.birth_date}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {formErrors.birth_date && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.birth_date}</p>
                    )}
                  </div>

                  {/* الجنسية */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {copy.ui.nationality}
                    </label>
                    <select
                      name="nationality"
                      value={formData.nationality}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{copy.ui.selectNationality}</option>
                      {NATIONALITIES.map(nationality => (
                        <option key={nationality} value={nationality}>
                          {nationality}
                        </option>
                      ))}
                    </select>
                    {formErrors.nationality && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.nationality}</p>
                    )}
                  </div>

                  {/* الدولة */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {copy.ui.country}
                    </label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{copy.ui.selectCountry}</option>
                      {COUNTRIES.map(country => (
                        <option key={country.id || country.code} value={country.name}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                    {formErrors.country && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.country}</p>
                    )}
                  </div>

                  {/* المدينة */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {copy.ui.city}
                    </label>
                    <select
                      name="city"
                      value={formData.city}
                      onChange={(e) => handleCityChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={!formData.country}
                    >
                      <option value="">{formData.country ? copy.ui.selectCity : copy.ui.selectCountryFirst}</option>
                      {availableCities.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>

                    {formErrors.city && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.city}</p>
                    )}

                    {formData.country && (
                      <p className="mt-1 text-xs text-blue-600">
                        {interpolate(copy.ui.cityHint, { country: formData.country })}
                      </p>
                    )}

                    {!formData.country && (
                      <p className="mt-1 text-xs text-amber-600">
                        {copy.ui.cityWarning}
                      </p>
                    )}
                  </div>

                  {/* رقم الهاتف */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {copy.ui.phone}
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={copy.ui.phonePlaceholder}
                    />
                    {formErrors.phone && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>
                    )}
                  </div>

                  {/* البريد الإلكتروني */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {copy.ui.email}
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={copy.ui.emailPlaceholder}
                    />
                    {formErrors.email && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
                    )}
                  </div>

                  {/* الواتساب */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {copy.ui.whatsapp}
                    </label>
                    <input
                      type="tel"
                      name="whatsapp"
                      value={formData.whatsapp}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={copy.ui.whatsappPlaceholder}
                    />
                  </div>
                </div>

                {/* العنوان التفصيلي */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {copy.ui.address}
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={copy.ui.addressPlaceholder}
                  />
                </div>

                {/* نبذة شخصية */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {copy.ui.brief}
                  </label>
                  <textarea
                    name="brief"
                    value={formData.brief}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={copy.ui.briefPlaceholder}
                  />
                </div>
              </div>
            )}

            {/* المعلومات الرياضية */}
            {currentStep === STEPS.SPORTS && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{copy.stepTitles[STEPS.SPORTS]}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* المركز الأساسي */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {copy.ui.primaryPosition}
                    </label>
                    <select
                      name="primary_position"
                      value={formData.primary_position}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{copy.ui.selectPrimaryPosition}</option>
                      {positions.map((position: { value: string; label: string }) => (
                        <option key={position.value} value={position.value}>
                          {position.label}
                        </option>
                      ))}
                    </select>
                    {formErrors.primary_position && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.primary_position}</p>
                    )}
                  </div>

                  {/* المركز الثانوي */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {copy.ui.secondaryPosition}
                    </label>
                    <select
                      name="secondary_position"
                      value={formData.secondary_position}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{copy.ui.selectSecondaryPosition}</option>
                      {positions.map((position: { value: string; label: string }) => (
                        <option key={position.value} value={position.value}>
                          {position.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* القدم المفضلة */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {copy.ui.preferredFoot}
                    </label>
                    <select
                      name="preferred_foot"
                      value={formData.preferred_foot}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{copy.ui.selectPreferredFoot}</option>
                      {footPreferences.map((foot: { value: string; label: string }) => (
                        <option key={foot.value} value={foot.value}>
                          {foot.label}
                        </option>
                      ))}
                    </select>
                    {formErrors.preferred_foot && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.preferred_foot}</p>
                    )}
                  </div>

                  {/* سنوات الخبرة */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {copy.ui.experienceYears}
                    </label>
                    <input
                      type="number"
                      name="experience_years"
                      value={formData.experience_years}
                      onChange={handleInputChange}
                      min="0"
                      max="30"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={copy.ui.experiencePlaceholder}
                    />
                  </div>

                  {/* رقم اللاعب الحالي */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {copy.ui.playerNumber}
                    </label>
                    <input
                      type="number"
                      name="player_number"
                      value={formData.player_number}
                      onChange={handleInputChange}
                      min="1"
                      max="99"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={copy.ui.playerNumberPlaceholder}
                    />
                  </div>

                  {/* الرقم المفضل */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {copy.ui.favoriteNumber}
                    </label>
                    <input
                      type="number"
                      name="favorite_jersey_number"
                      value={formData.favorite_jersey_number}
                      onChange={handleInputChange}
                      min="1"
                      max="99"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={copy.ui.favoriteNumberPlaceholder}
                    />
                  </div>
                </div>

                {/* الأندية */}
                <div className="bg-green-50 p-6 rounded-lg">
                  <h4 className="text-md font-semibold text-green-800 mb-4">{copy.ui.clubHistory}</h4>

                  {formData.club_history?.map((club, index) => (
                    <div key={index} className="flex items-center gap-4 mb-4 p-3 bg-white rounded-lg">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={club.name}
                          onChange={(e) => {
                            const newClubs = [...(formData.club_history || [])];
                            newClubs[index] = { ...newClubs[index], name: e.target.value };
                            setFormData(prev => ({ ...prev, club_history: newClubs }));
                          }}
                          placeholder={copy.ui.clubName}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={club.from}
                          onChange={(e) => {
                            const newClubs = [...(formData.club_history || [])];
                            newClubs[index] = { ...newClubs[index], from: e.target.value };
                            setFormData(prev => ({ ...prev, club_history: newClubs }));
                          }}
                          placeholder={copy.ui.fromYear}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={club.to}
                          onChange={(e) => {
                            const newClubs = [...(formData.club_history || [])];
                            newClubs[index] = { ...newClubs[index], to: e.target.value };
                            setFormData(prev => ({ ...prev, club_history: newClubs }));
                          }}
                          placeholder={copy.ui.toYear}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <button
                        onClick={() => {
                          const newClubs = formData.club_history?.filter((_, i) => i !== index) || [];
                          setFormData(prev => ({ ...prev, club_history: newClubs }));
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => {
                      const newClubs = [...(formData.club_history || []), { name: '', from: '', to: '' }];
                      setFormData(prev => ({ ...prev, club_history: newClubs }));
                    }}
                    className="flex items-center gap-2 text-green-600 hover:text-green-800"
                  >
                    <Plus className="w-4 h-4" />
                    {copy.ui.addClub}
                  </button>
                </div>

                {/* ملاحظات رياضية */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {copy.ui.sportsNotes}
                  </label>
                  <textarea
                    name="sports_notes"
                    value={formData.sports_notes}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={copy.ui.sportsNotesPlaceholder}
                  />
                </div>
              </div>
            )}

            {/* المعلومات التعليمية */}
            {currentStep === STEPS.EDUCATION && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{copy.stepTitles[STEPS.EDUCATION]}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* المستوى التعليمي */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {copy.ui.educationLevel}
                    </label>
                    <select
                      name="education_level"
                      value={formData.education_level}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{copy.ui.selectEducation}</option>
                      {educationLevels.map((level: { value: string; label: string }) => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* سنة التخرج */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {copy.ui.graduationYear}
                    </label>
                    <select
                      name="graduation_year"
                      value={formData.graduation_year}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{copy.ui.selectGraduationYear}</option>
                      {Array.from({ length: 31 }, (_, i) => 2000 + i).map(year => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* التخصص */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {copy.ui.degree}
                    </label>
                    <input
                      type="text"
                      name="degree"
                      value={formData.degree}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={copy.ui.degreePlaceholder}
                    />
                  </div>

                  {/* مستوى اللغة الإنجليزية */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {copy.ui.englishLevel}
                    </label>
                    <select
                      name="english_level"
                      value={formData.english_level}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{copy.ui.selectLevel}</option>
                      {languageLevels.map((level: { value: string; label: string }) => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* مستوى اللغة العربية */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {copy.ui.arabicLevel}
                    </label>
                    <select
                      name="arabic_level"
                      value={formData.arabic_level}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{copy.ui.selectLevel}</option>
                      {languageLevels.map((level: { value: string; label: string }) => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* مستوى اللغة الإسبانية */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {copy.ui.spanishLevel}
                    </label>
                    <select
                      name="spanish_level"
                      value={formData.spanish_level}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{copy.ui.selectLevel}</option>
                      {languageLevels.map((level: { value: string; label: string }) => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* الدورات التدريبية */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-800 mb-4">{copy.ui.trainingCourses}</h4>

                  {formData.training_courses?.map((course, index) => (
                    <div key={index} className="flex items-center gap-4 mb-3">
                      <input
                        type="text"
                        value={course}
                        onChange={(e) => {
                          const newCourses = [...(formData.training_courses || [])];
                          newCourses[index] = e.target.value;
                          setFormData(prev => ({ ...prev, training_courses: newCourses }));
                        }}
                        placeholder={copy.ui.courseName}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                      />
                      <button
                        onClick={() => {
                          const newCourses = formData.training_courses?.filter((_, i) => i !== index) || [];
                          setFormData(prev => ({ ...prev, training_courses: newCourses }));
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => {
                      const newCourses = [...(formData.training_courses || []), ''];
                      setFormData(prev => ({ ...prev, training_courses: newCourses }));
                    }}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                  >
                    <Plus className="w-4 h-4" />
                    {copy.ui.addCourse}
                  </button>
                </div>
              </div>
            )}

            {/* السجل الطبي */}
            {currentStep === STEPS.MEDICAL && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{copy.stepTitles[STEPS.MEDICAL]}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* فصيلة الدم */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {copy.ui.bloodType}
                    </label>
                    <select
                      name="blood_type"
                      value={formData.blood_type}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{copy.ui.selectBloodType}</option>
                      {BLOOD_TYPES.map(type => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* الطول */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {copy.ui.height}
                    </label>
                    <input
                      type="number"
                      name="height"
                      value={formData.height}
                      onChange={handleInputChange}
                      min="150"
                      max="220"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={copy.ui.heightPlaceholder}
                    />
                  </div>

                  {/* الوزن */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {copy.ui.weight}
                    </label>
                    <input
                      type="number"
                      name="weight"
                      value={formData.weight}
                      onChange={handleInputChange}
                      min="40"
                      max="120"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={copy.ui.weightPlaceholder}
                    />
                  </div>

                  {/* الأمراض المزمنة */}
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="chronic_conditions"
                        checked={formData.chronic_conditions}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">{copy.ui.hasChronic}</span>
                    </label>
                  </div>

                  {/* تفاصيل الأمراض المزمنة */}
                  {formData.chronic_conditions && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {copy.ui.chronicDetails}
                      </label>
                      <textarea
                        name="chronic_details"
                        value={formData.chronic_details}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={copy.ui.chronicPlaceholder}
                      />
                    </div>
                  )}

                  {/* الحساسية */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {copy.ui.allergies}
                    </label>
                    <textarea
                      name="allergies"
                      value={formData.allergies}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={copy.ui.allergiesPlaceholder}
                    />
                  </div>

                  {/* ملاحظات طبية */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {copy.ui.medicalNotes}
                    </label>
                    <textarea
                      name="medical_notes"
                      value={formData.medical_notes}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={copy.ui.medicalNotesPlaceholder}
                    />
                  </div>
                </div>

                {/* العمليات الجراحية */}
                <div className="bg-red-50 p-6 rounded-lg">
                  <h4 className="text-md font-semibold text-red-800 mb-4">{copy.ui.surgeries}</h4>

                  {formData.surgeries?.map((surgery, index) => (
                    <div key={index} className="flex items-center gap-4 mb-4 p-3 bg-white rounded-lg">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={surgery.type}
                          onChange={(e) => {
                            const newSurgeries = [...(formData.surgeries || [])];
                            newSurgeries[index] = { ...newSurgeries[index], type: e.target.value };
                            setFormData(prev => ({ ...prev, surgeries: newSurgeries }));
                          }}
                          placeholder={copy.ui.surgeryType}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="date"
                          value={surgery.date}
                          onChange={(e) => {
                            const newSurgeries = [...(formData.surgeries || [])];
                            newSurgeries[index] = { ...newSurgeries[index], date: e.target.value };
                            setFormData(prev => ({ ...prev, surgeries: newSurgeries }));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <button
                        onClick={() => {
                          const newSurgeries = formData.surgeries?.filter((_, i) => i !== index) || [];
                          setFormData(prev => ({ ...prev, surgeries: newSurgeries }));
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => {
                      const newSurgeries = [...(formData.surgeries || []), { type: '', date: '' }];
                      setFormData(prev => ({ ...prev, surgeries: newSurgeries }));
                    }}
                    className="flex items-center gap-2 text-red-600 hover:text-red-800"
                  >
                    <Plus className="w-4 h-4" />
                    {copy.ui.addSurgery}
                  </button>
                </div>
              </div>
            )}

            {/* الصور والفيديوهات */}
            {currentStep === STEPS.MEDIA && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{copy.stepTitles[STEPS.MEDIA]}</h3>

                {/* الصورة الشخصية */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-800 mb-4">{copy.ui.profileImage}</h4>

                  <div className="flex items-center space-x-6 space-x-reverse">
                    {/* عرض الصورة الحالية */}
                    <div className="flex-shrink-0">
                      {formData.profile_image && typeof formData.profile_image === 'object' && formData.profile_image.url ? (
                        <div className="relative">
                          <img
                            src={formData.profile_image.url}
                            alt={copy.ui.profileImage}
                            className="w-30 h-30 rounded-full object-cover border-4 border-white shadow-lg"
                            style={{ width: '120px', height: '120px' }}
                            onError={(e) => {
                              console.log('❌ خطأ في تحميل الصورة:', (formData.profile_image as { url: string })?.url);
                              e.currentTarget.src = '/images/default-avatar.png';
                            }}
                          />
                          <button
                            onClick={() => setFormData(prev => ({ ...prev, profile_image: null }))}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-30 h-30 rounded-full bg-gray-200 flex items-center justify-center">
                          <div className="text-gray-400 text-center">
                            <Plus className="w-8 h-8 mx-auto mb-2" />
                            <span className="text-sm">{copy.ui.addImage}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* زر رفع الصورة */}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUploadingProfileImage(true);
                            try {
                              // محاكاة رفع الصورة
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                setFormData(prev => ({
                                  ...prev,
                                  profile_image: { url: event.target?.result as string }
                                }));
                                setUploadingProfileImage(false);
                              };
                              reader.readAsDataURL(file);
                            } catch (error) {
                              console.error('Error uploading image:', error);
                              setUploadingProfileImage(false);
                            }
                          }
                        }}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        disabled={uploadingProfileImage}
                      />
                      {uploadingProfileImage && (
                        <p className="text-sm text-blue-600 mt-2">{copy.status.uploadingImage}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {copy.ui.mediaLimitImage}
                      </p>
                    </div>
                  </div>
                </div>

                {/* صور إضافية */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-800 mb-4">{copy.ui.additionalImages}</h4>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {formData.additional_images.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={image.url}
                          alt={interpolate(copy.ui.imageAlt, { number: index + 1 })}
                          className="w-full h-24 object-cover rounded-lg"
                          onError={(e) => {
                            console.log('❌ خطأ في تحميل الصورة الإضافية:', image.url);
                            e.currentTarget.src = '/images/default-image.png';
                          }}
                        />
                        <button
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              additional_images: prev.additional_images.filter((_, i) => i !== index)
                            }));
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    {/* زر إضافة صورة */}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg h-24 flex items-center justify-center cursor-pointer hover:border-gray-400">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          setUploadingImages(true);

                          for (const file of files) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              setFormData(prev => ({
                                ...prev,
                                additional_images: [...prev.additional_images, { url: event.target?.result as string }]
                              }));
                            };
                            reader.readAsDataURL(file);
                          }
                          setUploadingImages(false);
                        }}
                        className="hidden"
                        id="additional-images"
                        disabled={uploadingImages}
                      />
                      <label htmlFor="additional-images" className="cursor-pointer text-center">
                        <Plus className="w-6 h-6 mx-auto text-gray-400" />
                        <span className="text-xs text-gray-500">{copy.ui.addImages}</span>
                      </label>
                    </div>
                  </div>

                  {uploadingImages && (
                    <p className="text-sm text-blue-600">{copy.status.uploadingImages}</p>
                  )}
                </div>

                {/* فيديوهات المهارات - روابط */}
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h4 className="text-md font-semibold text-blue-800 mb-4">{copy.ui.skillVideos}</h4>

                  {formData.videos.map((video, index) => (
                    <div key={index} className="flex items-center gap-4 mb-4 p-3 bg-white rounded-lg">
                      <div className="flex-1">
                        <input
                          type="url"
                          value={video.url}
                          onChange={(e) => {
                            const newVideos = [...formData.videos];
                            newVideos[index] = { ...newVideos[index], url: e.target.value };
                            setFormData(prev => ({ ...prev, videos: newVideos }));
                          }}
                          placeholder={copy.ui.videoUrl}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={video.desc}
                          onChange={(e) => {
                            const newVideos = [...formData.videos];
                            newVideos[index] = { ...newVideos[index], desc: e.target.value };
                            setFormData(prev => ({ ...prev, videos: newVideos }));
                          }}
                          placeholder={copy.ui.videoDescription}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <button
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            videos: prev.videos.filter((_, i) => i !== index)
                          }));
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        videos: [...prev.videos, { url: '', desc: '' }]
                      }));
                    }}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                  >
                    <Plus className="w-4 h-4" />
                    {copy.ui.addVideoLink}
                  </button>
                </div>

                {/* رفع ملفات الفيديو */}
                <div className="bg-purple-50 p-6 rounded-lg">
                  <h4 className="text-md font-semibold text-purple-800 mb-4">{copy.ui.uploadVideos}</h4>

                  <div className="space-y-4">
                    {/* عرض الفيديوهات المرفوعة */}
                    {formData.uploaded_videos?.map((video, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 bg-white rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{video.name}</p>
                          <p className="text-xs text-gray-500">{(video as any).size}</p>
                        </div>
                        <button
                          onClick={() => {
                            const newVideos = formData.uploaded_videos?.filter((_, i) => i !== index) || [];
                            setFormData(prev => ({ ...prev, uploaded_videos: newVideos }));
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    {/* زر رفع فيديو */}
                    <div className="border-2 border-dashed border-purple-300 rounded-lg p-6 text-center">
                      <input
                        type="file"
                        accept="video/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUploadingImages(true);
                            try {
                              // محاكاة رفع الفيديو
                              const videoData = {
                                name: file.name,
                                size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
                                url: URL.createObjectURL(file)
                              };

                              setFormData(prev => ({
                                ...prev,
                                uploaded_videos: [...(prev.uploaded_videos || []), videoData]
                              }));
                              setUploadingImages(false);
                            } catch (error) {
                              console.error('Error uploading video:', error);
                              setUploadingImages(false);
                            }
                          }
                        }}
                        className="hidden"
                        id="video-upload"
                        disabled={uploadingImages}
                      />
                      <label htmlFor="video-upload" className="cursor-pointer">
                        <Plus className="w-8 h-8 mx-auto text-purple-400 mb-2" />
                        <p className="text-purple-700 font-medium">{copy.ui.uploadVideo}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {copy.ui.mediaLimitVideo}
                        </p>
                      </label>
                    </div>

                    {uploadingImages && (
                      <p className="text-sm text-purple-600">{copy.status.uploadingVideo}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* المهارات والقدرات */}
            {currentStep === STEPS.SKILLS && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{copy.stepTitles[STEPS.SKILLS]}</h3>
                <p className="text-sm text-gray-600 mb-6">{copy.ui.skillsHint}</p>

                {/* المهارات التقنية */}
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h4 className="text-md font-semibold text-blue-800 mb-4">{copy.ui.technicalSkills}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {copy.skills.technical.map((skill: { value: string; label: string }) => (
                      <div key={skill.value} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{skill.label}</span>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={formData.technical_skills[skill.value] || 5}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              technical_skills: {
                                ...prev.technical_skills,
                                [skill.value]: parseInt(e.target.value)
                              }
                            }));
                          }}
                          className="w-32"
                        />
                        <span className="text-sm font-bold w-6">{formData.technical_skills[skill.value] || 5}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* المهارات البدنية */}
                <div className="bg-green-50 p-6 rounded-lg">
                  <h4 className="text-md font-semibold text-green-800 mb-4">{copy.ui.physicalSkills}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {copy.skills.physical.map((skill: { value: string; label: string }) => (
                      <div key={skill.value} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{skill.label}</span>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={formData.physical_skills[skill.value] || 5}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              physical_skills: {
                                ...prev.physical_skills,
                                [skill.value]: parseInt(e.target.value)
                              }
                            }));
                          }}
                          className="w-32"
                        />
                        <span className="text-sm font-bold w-6">{formData.physical_skills[skill.value] || 5}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* المهارات الاجتماعية */}
                <div className="bg-purple-50 p-6 rounded-lg">
                  <h4 className="text-md font-semibold text-purple-800 mb-4">{copy.ui.socialSkills}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {copy.skills.social.map((skill: { value: string; label: string }) => (
                      <div key={skill.value} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{skill.label}</span>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={formData.social_skills[skill.value] || 5}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              social_skills: {
                                ...prev.social_skills,
                                [skill.value]: parseInt(e.target.value)
                              }
                            }));
                          }}
                          className="w-32"
                        />
                        <span className="text-sm font-bold w-6">{formData.social_skills[skill.value] || 5}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* الأهداف والطموحات */}
            {currentStep === STEPS.OBJECTIVES && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{copy.stepTitles[STEPS.OBJECTIVES]}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {copy.objectives.map((objective: { value: string; label: string }) => (
                    <label key={objective.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={!!formData.objectives[objective.value]}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            objectives: {
                              ...prev.objectives,
                              [objective.value]: e.target.checked
                            }
                          }));
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">{objective.label}</span>
                    </label>
                  ))}
                </div>

                {/* هدف آخر */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {copy.ui.otherGoals}
                  </label>
                  <textarea
                    value={(formData.objectives.other as string) || ''}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        objectives: {
                          ...prev.objectives,
                          other: e.target.value
                        }
                      }));
                    }}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={copy.ui.otherGoalsPlaceholder}
                  />
                </div>
              </div>
            )}

            {/* العقود والاتصالات */}
            {currentStep === STEPS.CONTRACTS && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{copy.stepTitles[STEPS.CONTRACTS]}</h3>

                {/* الوضع التعاقدي الحالي */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-800 mb-4">{copy.ui.contractStatus}</h4>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {copy.ui.hasContract}
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="currently_contracted"
                            value="yes"
                            checked={formData.currently_contracted === 'yes'}
                            onChange={handleInputChange}
                            className="mr-2"
                          />
                          <span>{copy.ui.yes}</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="currently_contracted"
                            value="no"
                            checked={formData.currently_contracted === 'no'}
                            onChange={handleInputChange}
                            className="mr-2"
                          />
                          <span>{copy.ui.no}</span>
                        </label>
                      </div>
                    </div>

                    {/* النادي الحالي */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {copy.ui.currentClub}
                      </label>
                      <input
                        type="text"
                        name="current_club"
                        value={formData.current_club}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={copy.ui.currentClubPlaceholder}
                      />
                    </div>


                  </div>
                </div>

                {/* معلومات الاتصال الرسمية */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-800 mb-4">{copy.ui.officialContact}</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {copy.ui.contactName}
                      </label>
                      <input
                        type="text"
                        value={formData.official_contact.name}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            official_contact: {
                              ...prev.official_contact,
                              name: e.target.value
                            }
                          }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={copy.ui.contactNamePlaceholder}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {copy.ui.contactTitle}
                      </label>
                      <input
                        type="text"
                        value={formData.official_contact.title}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            official_contact: {
                              ...prev.official_contact,
                              title: e.target.value
                            }
                          }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={copy.ui.contactTitlePlaceholder}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {copy.ui.contactPhone}
                      </label>
                      <input
                        type="tel"
                        value={formData.official_contact.phone}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            official_contact: {
                              ...prev.official_contact,
                              phone: e.target.value
                            }
                          }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={copy.ui.contactPhonePlaceholder}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {copy.ui.contactEmail}
                      </label>
                      <input
                        type="email"
                        value={formData.official_contact.email}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            official_contact: {
                              ...prev.official_contact,
                              email: e.target.value
                            }
                          }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={copy.ui.contactEmailPlaceholder}
                      />
                    </div>
                  </div>
                </div>

                {/* معلومات إضافية */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-800 mb-4">{copy.ui.additionalInfo}</h4>

                  <div className="space-y-4">
                    {/* الحصول على جواز سفر */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {copy.ui.hasPassport}
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="has_passport"
                            value="yes"
                            checked={formData.has_passport === 'yes'}
                            onChange={handleInputChange}
                            className="mr-2"
                          />
                          <span>{copy.ui.yes}</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="has_passport"
                            value="no"
                            checked={formData.has_passport === 'no'}
                            onChange={handleInputChange}
                            className="mr-2"
                          />
                          <span>{copy.ui.no}</span>
                        </label>
                      </div>
                    </div>

                    {/* مصدر التعرف */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {copy.ui.referralQuestion}
                      </label>
                      <select
                        name="ref_source"
                        value={formData.ref_source}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">{copy.ui.selectReferral}</option>
                        {referralSourceEntries.map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>


                  </div>
                </div>
              </div>
            )}

            {/* باقي الخطوات غير المطورة */}
            {currentStep !== STEPS.PERSONAL &&
              currentStep !== STEPS.EDUCATION &&
              currentStep !== STEPS.MEDICAL &&
              currentStep !== STEPS.SPORTS &&
              currentStep !== STEPS.SKILLS &&
              currentStep !== STEPS.OBJECTIVES &&
              currentStep !== STEPS.MEDIA &&
              currentStep !== STEPS.CONTRACTS && (
                <div className="text-center py-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {interpolate(copy.ui.stageFallback, { number: currentStep + 1, title: stepTitles[currentStep] })}
                  </h3>
                  <p className="text-gray-600">
                    {copy.ui.allStagesComplete}
                  </p>
                </div>
              )}

            {/* خيار إنشاء حساب تسجيل دخول - يظهر فقط في وضع الإضافة */}
            {mode === 'add' && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="createLoginAccount"
                    checked={createLoginAccount}
                    onChange={(e) => setCreateLoginAccount(e.target.checked)}
                    className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="createLoginAccount" className="text-sm font-medium text-gray-900 cursor-pointer">
                    {copy.ui.createLoginAccount}
                  </label>
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  {copy.ui.unifiedPassword} <span className="font-mono bg-gray-200 px-1 rounded">{UNIFIED_PASSWORD}</span>
                  <br />
                  {copy.ui.loginShareHint}
                  <br />
                  {copy.ui.loginChangeHint}
                </p>
                {loginAccountPassword && (
                  <div className="mt-3 p-3 bg-green-100 border border-green-300 rounded">
                    <p className="text-sm font-medium text-green-800">
                      ✅ {copy.status.loginCreated}
                    </p>
                    <p className="text-sm text-green-700">
                      {copy.ui.viewCredentialsHint}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowLoginCredentials(true)}
                      className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    >
                      {copy.ui.viewCredentials}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="mt-8 flex justify-between">
              <div className="flex gap-4">
                {currentStep > 0 && (
                  <Button
                    onClick={handlePrevious}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <ArrowRight className="w-4 h-4" />
                    {copy.ui.previous}
                  </Button>
                )}
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="text-gray-600 border-gray-300"
                >
                  {copy.ui.cancel}
                </Button>

                {currentStep < Object.keys(stepTitles).length - 1 ? (
                  <Button
                    onClick={handleNext}
                    className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                  >
                    {copy.ui.next}
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSave}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {mode === 'add' ? copy.ui.addPlayer : copy.ui.saveChanges}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
