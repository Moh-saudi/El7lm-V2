'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-provider';
import { supabase } from '@/lib/supabase/config';
// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  User,
  MapPin,
  Calendar,
  Phone,
  Mail,
  Globe,
  Award,
  Target,
  BookOpen,
  Heart,
  Activity,
  Zap,
  Star,
  TrendingUp,
  Users,
  Building2,
  GraduationCap,
  Briefcase,
  Eye,
  EyeOff,
  Share2,
  Download,
  Printer,
  Copy,
  CheckCircle,
  AlertCircle,
  Info,
  Loader2,
  School,
  ArrowLeft,
  ExternalLink,
  Stethoscope,
  Pill,
  AlertTriangle,
  Brain,
  Shield,
  ShieldCheck,
  Languages,
  Plus,
  Trophy,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  FileText
} from 'lucide-react';
// import ReactPlayer from 'react-player/lazy';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
// import { useTranslations } from '@/lib/translations/context';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip as ChartTooltip } from 'recharts';
import { debugConsole } from '@/lib/utils/console-manager';
import { getPlayerOrganization, getOrganizationDetails } from '@/utils/player-organization';
import PlayerResume from '@/components/player/PlayerResume';
import { FootballPitch } from '@/components/player/FootballPitch';
import { Player, PlayerDocument, PlayerFormData, Achievement, Injury, ContractHistory, AgentHistory } from '@/types/player';
import { getPlayerAvatarUrl, getSupabaseImageUrl } from '@/lib/supabase/image-utils';
// import { PlayerVideo } from '@/types/common';
import 'dayjs/locale/ar';

// تعيين اللغة العربية لمكتبة dayjs
dayjs.locale('ar');

// دالة التحقق من صحة رابط الصورة
const getValidImageUrl = (url: string | null | undefined, fallback: string = '/default-player-avatar.png'): string => {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return fallback;
  }

  // فلترة الروابط المكسورة المعروفة من Supabase
  const brokenSupabaseUrls = [
    'ekyerljzfokqimbabzxm.supabase.co/storage/v1/object/public/avatars/yf0b8T8xuuMfP8QAfvS9TLOJjVt2',
    'ekyerljzfokqimbabzxm.supabase.co/storage/v1/object/public/player-images/yf0b8T8xuuMfP8QAfvS9TLOJjVt2',
    'test-url.com',
    'example.com'
  ];

  const isBrokenUrl = brokenSupabaseUrls.some(brokenUrl => url.includes(brokenUrl));

  if (isBrokenUrl) {
    console.log(`🚫 تم فلترة رابط مكسور: ${url}`);
    return fallback;
  }

  // استخدام المحول الموحد الذي يدعم Cloudflare R2
  return getSupabaseImageUrl(url, 'avatars');
};

// دالة حساب العمر (محسّنة مع إصلاح تاريخ المستقبل ومعالجة Firestore)
const calculateAge = (birthDate: any) => {
  console.log('🎂 [calculateAge] بدء حساب العمر:', {
    hasData: !!birthDate,
    dataType: typeof birthDate,
    dataValue: birthDate,
    isDate: birthDate instanceof Date,
    isValidDate: birthDate instanceof Date ? !isNaN(birthDate.getTime()) : 'N/A'
  });

  if (!birthDate) {
    console.log('❌ calculateAge: لا يوجد تاريخ ميلاد');
    return null;
  }

  try {
    let d: Date;

    // التعامل مع Invalid Date أولاً
    if (birthDate instanceof Date && isNaN(birthDate.getTime())) {
      console.warn('⚠️ calculateAge: تم استقبال Invalid Date، محاولة إنشاء تاريخ افتراضي');
      // إنشاء تاريخ افتراضي معقول (عمر 20 سنة)
      const currentYear = new Date().getFullYear();
      d = new Date(currentYear - 20, 4, 1); // أول مايو من السنة المناسبة
      console.log('🔧 calculateAge: تاريخ افتراضي تم إنشاؤه:', d);
    }
    // التعامل مع كائنات التاريخ ذات الحقل seconds (بيانات قديمة مخزنة)
    else if (typeof birthDate === 'object' && birthDate !== null && ((birthDate as any).seconds || (birthDate as any)._seconds)) {
      const seconds = (birthDate as any).seconds || (birthDate as any)._seconds;
      d = new Date(seconds * 1000);
      console.log('✅ calculateAge: تم تحويل Timestamp (seconds) إلى Date:', d);
    }
    // التعامل مع Date object صحيح
    else if (birthDate instanceof Date && !isNaN(birthDate.getTime())) {
      d = birthDate;
      console.log('✅ calculateAge: التاريخ هو Date object صحيح:', d);
    }
    // التعامل مع string أو number
    else if (typeof birthDate === 'string' || typeof birthDate === 'number') {
      d = new Date(birthDate);
      console.log('✅ calculateAge: تم تحويل string/number إلى Date:', d);

      // التحقق من نجاح التحويل
      if (isNaN(d.getTime())) {
        console.warn('⚠️ calculateAge: فشل تحويل string/number، استخدام تاريخ افتراضي');
        const currentYear = new Date().getFullYear();
        d = new Date(currentYear - 20, 4, 1);
      }
    }
    // محاولة أخيرة للتحويل
    else {
      console.log('⚠️ calculateAge: محاولة تحويل نوع غير معروف:', birthDate);
      try {
        d = new Date(birthDate);
        if (isNaN(d.getTime())) {
          throw new Error('Invalid date conversion');
        }
        console.log('✅ calculateAge: نجح التحويل النهائي:', d);
      } catch (conversionError) {
        console.warn('⚠️ calculateAge: فشل التحويل النهائي، استخدام تاريخ افتراضي');
        const currentYear = new Date().getFullYear();
        d = new Date(currentYear - 20, 4, 1);
      }
    }

    // التحقق من صحة التاريخ النهائي
    if (isNaN(d.getTime())) {
      console.error('❌ calculateAge: التاريخ لا يزال غير صالح بعد جميع المحاولات');
      const currentYear = new Date().getFullYear();
      d = new Date(currentYear - 20, 4, 1);
      console.log('🔧 calculateAge: استخدام تاريخ افتراضي أخير:', d);
    }

    const today = new Date();

    // إصلاح التواريخ المستقبلية - معالجة محسنة
    if (d.getFullYear() >= 2024) {
      console.warn('⚠️ calculateAge: تاريخ الميلاد يحتوي على سنة مستقبلية:', d.getFullYear());

      // تصحيح: إذا كان 2025 اجعله 2005، إذا كان 2024 اجعله 2004، إلخ
      const originalYear = d.getFullYear();
      const correctedYear = originalYear - 20;
      d.setFullYear(correctedYear);
      console.log('✅ calculateAge: تم تصحيح التاريخ من', originalYear, 'إلى', correctedYear);
      console.log('📅 calculateAge: التاريخ المصحح النهائي:', d);
    }

    // حساب العمر
    let age = today.getFullYear() - d.getFullYear();
    const monthDiff = today.getMonth() - d.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d.getDate())) {
      age--;
    }

    // التحقق من منطقية العمر
    if (age < 0) {
      console.warn('⚠️ calculateAge: عمر سالب، تصحيح إلى موجب');
      age = Math.abs(age);
    }

    if (age > 100) {
      console.warn('⚠️ calculateAge: عمر كبير جداً:', age, 'استخدام عمر افتراضي');
      age = 20; // عمر افتراضي معقول
    }

    console.log('✅ calculateAge: العمر المحسوب النهائي:', age, 'سنة للتاريخ:', d.toLocaleDateString());
    return age;

  } catch (error) {
    console.error('❌ calculateAge: خطأ في حساب العمر:', error, 'للتاريخ:', birthDate);
    return null; // إرجاع null بدلاً من 20 لمعرفة المشكلة
  }
};

// تعريف أنواع المنظمات مع الأيقونات
const ORGANIZATION_TYPES = {
  club: {
    collection: 'clubs',
    type: 'نادي',
    icon: Building2,
    color: 'bg-blue-500'
  },
  academy: {
    collection: 'academies',
    type: 'أكاديمية',
    icon: School,
    color: 'bg-green-500'
  },
  trainer: {
    collection: 'trainers',
    type: 'مدرب',
    icon: Users,
    color: 'bg-purple-500'
  },
  agent: {
    collection: 'agents',
    type: 'وكيل لاعبين',
    icon: Briefcase,
    color: 'bg-orange-500'
  }
} as const;

// المكون الرئيسي
function PlayerReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const { user, loading } = useAuth();
  const authError = null;
  const [player, setPlayer] = useState<Player | null>(null);

  // الحصول على معرف اللاعب من الرابط
  const playerIdFromUrl = params?.playerId as string;

  // إضافة تشخيصات مفصلة (بعد الرسم لتقليل الضجيج ومنع تداخل HMR)
  useEffect(() => {
    console.group('🔍 تشخيص صفحة تقارير اللاعب');
    console.log('معاملات URL:', {
      playerIdFromUrl,
      viewPlayerId: searchParams?.get('view'),
      fullParams: searchParams?.toString()
    });
    console.log('معلومات المستخدم:', {
      userId: user?.id,
      userEmail: user?.email,
      isLoading: loading,
      authError: authError
    });
    console.groupEnd();
  }, [params, searchParams, user, loading, authError]);

  // تحديد معرف اللاعب المطلوب عرضه
  const targetPlayerId = playerIdFromUrl || searchParams?.get('view');

  // إضافة تشخيصات
  console.log('🔍 تشخيص صفحة التقارير:');
  console.log('  - معرف اللاعب من الرابط:', playerIdFromUrl);
  console.log('  - معرف اللاعب المستهدف:', targetPlayerId);
  console.log('  - المستخدم الحالي:', user?.id);
  console.log('  - معاملات البحث الكاملة:', searchParams?.toString());

  // معالجة حالة التحميل
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 text-blue-600 animate-spin" />
          <p className="text-gray-600">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  // معالجة حالة عدم وجود معرف لاعب
  if (!targetPlayerId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-600" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">لاعب غير محدد</h2>
          <p className="text-gray-600 mb-4">لم يتم تحديد اللاعب المطلوب عرض تقريره</p>
          <Button onClick={() => router.back()}>
            العودة
          </Button>
        </div>
      </div>
    );
  }

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageIdx, setSelectedImageIdx] = useState<number | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);

  // معلومات إضافية للعرض المحسن
  const [currentUserInfo, setCurrentUserInfo] = useState<any>(null);
  const [playerOrganization, setPlayerOrganization] = useState<any>(null);
  const [organizationType, setOrganizationType] = useState<string>('');
  const [organizationLoading, setOrganizationLoading] = useState(true);

  // دالة مساعدة لإنشاء بيانات آمنة للمخططات
  const createSafeChartData = (skillsObject: any, skillsMapping: Record<string, string>) => {
    if (!skillsObject || typeof skillsObject !== 'object') {
      console.log('⚠️ [createSafeChartData] بيانات المهارات غير صحيحة:', skillsObject);
      return [];
    }

    const entries = Object.entries(skillsObject);
    if (entries.length === 0) {
      console.log('⚠️ [createSafeChartData] لا توجد مهارات مسجلة');
      return [];
    }

    const chartData = entries.map(([key, value]) => ({
      skill: skillsMapping[key] || key,
      value: Number(value) || 0
    }));

    console.log('✅ [createSafeChartData] تم إنشاء بيانات المخطط:', chartData);
    return chartData;
  };

  // تحويل بيانات المهارات لمخططات الرادار
  const technicalSkillsMapping = {
    'ball_control': 'التحكم بالكرة',
    'passing': 'التمرير',
    'shooting': 'التسديد',
    'dribbling': 'المراوغة',
    'heading': 'الضربات الرأسية',
    'tackling': 'العرقلة',
    'marking': 'المراقبة',
    'positioning': 'التموضع',
    'vision': 'الرؤية',
    'decision_making': 'اتخاذ القرار'
  };

  const physicalSkillsMapping = {
    'speed': 'السرعة',
    'strength': 'القوة',
    'stamina': 'التحمل',
    'agility': 'الرشاقة',
    'balance': 'التوازن',
    'flexibility': 'المرونة',
    'jumping': 'الوثب',
    'coordination': 'التنسيق',
    'reaction_time': 'وقت رد الفعل'
  };

  const socialSkillsMapping = {
    'teamwork': 'العمل الجماعي',
    'communication': 'التواصل',
    'discipline': 'الانضباط',
    'self_confidence': 'الثقة بالنفس',
    'pressure_handling': 'تحمل الضغط',
    'punctuality': 'الالتزام بالمواعيد',
    'leadership': 'القيادة',
    'adaptability': 'القدرة على التكيف',
    'motivation': 'الدافعية'
  };

  const technicalSkillsData = createSafeChartData(player?.technical_skills, technicalSkillsMapping);
  const physicalSkillsData = createSafeChartData(player?.physical_skills, physicalSkillsMapping);
  const socialSkillsData = createSafeChartData(player?.social_skills, socialSkillsMapping);

  // إضافة تشخيص للمهارات
  useEffect(() => {
    if (player) {
      console.log('📊 [useEffect] تشخيص المهارات:', {
        playerName: player.full_name,
        playerId: player.id,
        targetPlayerId,
        isCorrectPlayer: player.id === targetPlayerId,
        technicalSkills: technicalSkillsData.length,
        physicalSkills: physicalSkillsData.length,
        socialSkills: socialSkillsData.length,
        hasTechnicalSkills: !!player.technical_skills,
        hasPhysicalSkills: !!player.physical_skills,
        hasSocialSkills: !!player.social_skills
      });
    }
  }, [player, targetPlayerId, technicalSkillsData.length, physicalSkillsData.length, socialSkillsData.length]);

  // دالة جلب معلومات الحساب الحالي
  const fetchCurrentUserInfo = async () => {
    console.log('👤 [fetchCurrentUserInfo] بدء جلب معلومات المستخدم الحالي');

    if (!user?.id) {
      console.warn('⚠️ [fetchCurrentUserInfo] لا يوجد مستخدم مسجل');
      return;
    }

    try {
      for (const [key, orgType] of Object.entries(ORGANIZATION_TYPES)) {
        console.log(`🔍 [fetchCurrentUserInfo] البحث في ${orgType.collection}`);

        try {
          const { data: userDocData } = await supabase
            .from(orgType.collection)
            .select('*')
            .eq('id', user.id)
            .single();

          if (!!userDocData) {
            const userData = userDocData;
            console.log(`✅ [fetchCurrentUserInfo] تم العثور على الحساب:`, {
              type: orgType.type,
              name: userData.name || userData.full_name,
              hasLogo: !!userData.logo
            });

            const userInfo = {
              ...userData,
              id: userData.id,
              type: orgType.type,
              icon: orgType.icon,
              color: orgType.color
            };

            setCurrentUserInfo(userInfo);
            console.log('✅ [fetchCurrentUserInfo] تم تحديث معلومات المستخدم:', userInfo);
            break;
          } else {
            console.log(`⚠️ [fetchCurrentUserInfo] المستخدم غير موجود في ${orgType.collection}`);
          }
        } catch (collectionError) {
          console.log(`⚠️ [fetchCurrentUserInfo] فشل في جلب من ${orgType.collection}:`, collectionError);
          continue;
        }
      }
    } catch (error) {
      console.error('❌ [fetchCurrentUserInfo] خطأ في جلب معلومات المستخدم:', error);
    }
  };

  // دالة تحويل مسار Supabase إلى رابط كامل (للوجو) - محسنة لتدعم جميع أنواع البوكتات
  const getSupabaseImageUrl = (path: string, organizationType?: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;

    console.log(`🎨 معالجة مسار الصورة: ${path} لنوع المنظمة: ${organizationType}`);

    // تحديد البوكت المناسب حسب نوع المنظمة
    const bucketMapping: Record<string, string[]> = {
      'نادي': ['clubavatar', 'club-logos'],
      'أكاديمية': ['academyavatar', 'academy-logos', 'clubavatar'],
      'مدرب': ['traineravatar', 'trainer-logos', 'clubavatar'],
      'وكيل لاعبين': ['agentavatar', 'agent-logos', 'clubavatar']
    };

    const possibleBuckets = organizationType ?
      (bucketMapping[organizationType] || ['clubavatar']) :
      ['clubavatar', 'academyavatar', 'traineravatar', 'agentavatar'];

    console.log(`🗂️ البوكتات المحتملة:`, possibleBuckets);

    // جرب البوكتات بالترتيب حتى تجد واحد يعمل
    for (const bucket of possibleBuckets) {
      try {
        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
        if (publicUrl) {
          console.log(`✅ تم إنشاء رابط من البوكت ${bucket}: ${publicUrl}`);
          return publicUrl;
        }
      } catch (bucketError) {
        console.log(`⚠️ فشل البوكت ${bucket}:`, bucketError);
        continue;
      }
    }

    // إذا فشلت جميع البوكتات، ارجع المسار الأصلي
    console.log(`❌ فشل في جميع البوكتات، استخدام المسار الأصلي: ${path}`);
    return path;
  };

  // دالة الحصول على أيقونة المنظمة
  const getOrganizationIcon = (type: string) => {
    switch (type) {
      case 'club':
        return Building2;
      case 'academy':
        return School;
      case 'trainer':
        return User;
      case 'agent':
        return Briefcase;
      default:
        return Building2;
    }
  };

  // دالة الحصول على لون المنظمة
  const getOrganizationColor = (type: string) => {
    switch (type) {
      case 'club':
        return 'blue';
      case 'academy':
        return 'green';
      case 'trainer':
        return 'purple';
      case 'agent':
        return 'orange';
      default:
        return 'gray';
    }
  };





  // دالة جلب معلومات المنظمة التابع لها اللاعب
  const fetchPlayerOrganization = async () => {
    console.log('🏢 [fetchPlayerOrganization] بدء جلب معلومات المنظمة');

    if (!player) {
      console.warn('⚠️ [fetchPlayerOrganization] لا توجد بيانات لاعب متاحة');
      setOrganizationLoading(false);
      setPlayerOrganization(null);
      return;
    }

    try {
      setOrganizationLoading(true);

      // استخدام دالة getPlayerOrganization من utils
      const organization = getPlayerOrganization(player);
      console.log('✅ [fetchPlayerOrganization] نتيجة getPlayerOrganization:', organization);

      if (organization.id) {
        // جلب تفاصيل المنظمة من Firebase
        const orgDetails = await getOrganizationDetails(organization.id, organization.type);
        console.log('✅ [fetchPlayerOrganization] تفاصيل المنظمة:', orgDetails);

        if (orgDetails) {
          const organizationInfo = {
            id: orgDetails.id,
            name: orgDetails.name,
            type: orgDetails.type,
            logo: orgDetails.profile_image,
            logoUrl: getSupabaseImageUrl(orgDetails.profile_image || '', orgDetails.type),
            icon: getOrganizationIcon(orgDetails.type),
            color: getOrganizationColor(orgDetails.type),
            emoji: organization.emoji,
            typeArabic: organization.typeArabic
          };

          setPlayerOrganization(organizationInfo);
          console.log('✅ [fetchPlayerOrganization] تم تحديث معلومات المنظمة:', organizationInfo);
        } else {
          console.log('⚠️ [fetchPlayerOrganization] لم يتم العثور على تفاصيل المنظمة');
          setPlayerOrganization(null);
        }
      } else {
        console.log('ℹ️ [fetchPlayerOrganization] اللاعب مستقل - لا يتبع لأي منظمة');
        setPlayerOrganization(null);
      }

    } catch (error) {
      console.error('❌ [fetchPlayerOrganization] خطأ في جلب معلومات المنظمة:', error);
      setPlayerOrganization(null);
    } finally {
      setOrganizationLoading(false);
    }
  };

  // دالة التحقق من صلاحية عرض رقم الهاتف
  const canViewPhoneNumber = () => {
    // إذا كان المستخدم هو نفسه اللاعب
    if (user?.id === targetPlayerId) {
      return true;
    }

    // إذا كان اللاعب تابع للمستخدم الحالي
    if (playerOrganization && currentUserInfo) {
      return playerOrganization.id === currentUserInfo.id;
    }

    return false;
  };

  const renderPersonalInfo = () => {
    const age = calculateAge(player?.birth_date);
    const isMinor = age !== null && age < 18;

    return (
      <div className="space-y-6">
        {/* Basic Info Card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
          <h3 className="flex gap-2 items-center mb-6 text-xl font-semibold text-gray-800">
            <User className="w-5 h-5 text-blue-600" />
            البيانات الأساسية
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="col-span-full md:col-span-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">الاسم الكامل</label>
              <div className="text-lg font-bold text-gray-900">{player?.full_name || player?.name || '--'}</div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">تاريخ الميلاد</label>
              <div className="font-medium text-gray-700 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                {player?.birth_date ? dayjs(player.birth_date).format('DD/MM/YYYY') : '--'}
                {age !== null && (
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">
                    {age} سنة
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">الجنسية</label>
              <div className="font-medium text-gray-700">{player?.nationality || '--'}</div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">الجنس</label>
              <div className="font-medium text-gray-700">
                {player?.gender === 'male' ? 'ذكر' : player?.gender === 'female' ? 'أنثى' : '--'}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">المركز</label>
              <div className="inline-block">
                <span className="font-bold text-gray-900 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 text-sm">
                  {player?.primary_position || player?.position || '--'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Brief Bio */}
        {player?.brief && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 overflow-hidden">
            <h3 className="flex gap-2 items-center mb-4 text-xl font-semibold text-gray-800">
              <FileText className="w-5 h-5 text-gray-600" />
              نبذة مختصرة
            </h3>
            <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-100 whitespace-pre-line">
              {player.brief}
            </p>
          </div>
        )}

        {/* Guardian Alert for Minors */}
        {isMinor && (player?.guardian_name || player?.guardian_phone) && (
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-amber-100 rounded-lg text-amber-600 shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-amber-900 mb-1">بيانات ولي الأمر</h4>
                <p className="text-amber-700 text-sm mb-4">اللاعب قاصر (أقل من 18 سنة)، بيانات التواصل مع ولي الأمر:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {player.guardian_name && (
                    <div className="bg-white/60 p-3 rounded border border-amber-100">
                      <span className="text-xs text-amber-800 block mb-1">الاسم</span>
                      <span className="font-semibold text-amber-900">{player.guardian_name}</span>
                    </div>
                  )}
                  {player.guardian_phone && (
                    <div className="bg-white/60 p-3 rounded border border-amber-100">
                      <span className="text-xs text-amber-800 block mb-1">رقم الهاتف</span>
                      <span className="font-semibold text-amber-900" dir="ltr">{player.guardian_phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contact & Location */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 overflow-hidden">
          <h3 className="flex gap-2 items-center mb-6 text-xl font-semibold text-gray-800">
            <MapPin className="w-5 h-5 text-green-600" />
            الإقامة والاتصال
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">دولة الإقامة</label>
              <div className="font-medium text-gray-700">{player?.country || '--'}</div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">المدينة</label>
              <div className="font-medium text-gray-700">{player?.city || '--'}</div>
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">العنوان التفصيلي</label>
              <div className="font-medium text-gray-700 flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                <span>{player?.address || '--'}</span>
              </div>
            </div>

            {/* Show Phone/Email only if allowed */}
            {canViewPhoneNumber() && (
              <>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">رقم الهاتف</label>
                  <div className="font-medium text-gray-700 flex items-center gap-2" dir="ltr">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {player?.phone || '--'}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">البريد الإلكتروني</label>
                  <div className="font-medium text-gray-700 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {player?.email || '--'}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    );
  };

  const renderSportsInfo = () => {
    const primaryPos = player?.primary_position || player?.position;

    return (
      <div className="space-y-6">
        {/* 1. Attributes & Positions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Pitch Visualization (Spans 1 col on LG, Full on others) */}
          <div className="lg:col-span-1 bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col items-center">
            <h4 className="text-sm font-semibold text-gray-500 mb-3 w-full text-center uppercase tracking-wider">خريطة الملعب</h4>
            <FootballPitch
              primaryPosition={primaryPos}
              secondaryPosition={player?.secondary_position}
              jerseyNumber={player?.jersey_number || player?.player_number}
            />
            <div className="mt-4 flex gap-4 text-xs">
              {primaryPos && (
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-600 rounded-full border border-gray-200" />
                  <span>الأساسي ({primaryPos})</span>
                </div>
              )}
              {player?.secondary_position && (
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full border border-gray-200" />
                  <span>الثانوي ({player.secondary_position})</span>
                </div>
              )}
            </div>
          </div>

          {/* Detailed Info & Attributes (Spans 2 cols on LG) */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            {/* Role & Specifics */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm flex flex-col justify-center">
              <div className="mb-6 text-center">
                <span className="text-gray-400 text-sm block mb-1">المركز الأساسي (تفصيلي)</span>
                <span className="text-3xl font-black text-gray-900">{primaryPos || '--'}</span>
                {player?.detailed_position && <span className="text-blue-600 block mt-1 font-medium text-lg">{player.detailed_position}</span>}
              </div>
              {player?.secondary_position && (
                <div className="text-center pt-6 border-t border-gray-100">
                  <span className="text-gray-400 text-sm block mb-1">المركز الثانوي</span>
                  <span className="text-xl font-bold text-gray-700">{player.secondary_position}</span>
                </div>
              )}
            </div>

            {/* Attributes Summary (Height, Weight, Foot) */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm relative">
              <div className="relative z-10">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-gray-50/80 rounded-lg border border-gray-100">
                    <span className="text-xs text-gray-500 block mb-1">القدم المفضلة</span>
                    <span className="font-bold text-lg text-gray-900">{player?.preferred_foot || player?.foot || '--'}</span>
                  </div>
                  <div className="text-center p-3 bg-gray-50/80 rounded-lg border border-gray-100">
                    <span className="text-xs text-gray-500 block mb-1">الطول</span>
                    <span className="font-bold text-lg text-gray-900" dir="ltr">{player?.height ? `${player.height} cm` : '--'}</span>
                  </div>
                  <div className="text-center p-3 bg-gray-50/80 rounded-lg border border-gray-100">
                    <span className="text-xs text-gray-500 block mb-1">الوزن</span>
                    <span className="font-bold text-lg text-gray-900" dir="ltr">{player?.weight ? `${player.weight} kg` : '--'}</span>
                  </div>
                  <div className="text-center p-3 bg-gray-50/80 rounded-lg border border-gray-100">
                    <span className="text-xs text-gray-500 block mb-1">رقم القميص</span>
                    <span className="font-bold text-lg text-gray-900">{player?.jersey_number || player?.player_number || '--'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Current Club & Career */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
            <Briefcase className="w-5 h-5 text-indigo-500" />
            <h3 className="text-lg font-bold text-gray-800">المسيرة الرياضية</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Current Club */}
              <div className="flex flex-col gap-4">
                <h4 className="font-semibold text-gray-700 mb-2">النادي الحالي</h4>
                <div className="flex items-center gap-4 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-2xl">
                    ⚽
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">النادي</span>
                    <div className="text-xl font-bold text-indigo-900">{player?.current_club || 'غير مرتبط بنادي'}</div>
                    {player?.experience_years && <div className="text-sm text-indigo-700 mt-1">خبرة: {player.experience_years} سنوات</div>}
                    {player?.contract_start_date && (
                      <div className="text-xs text-indigo-500 mt-1">بداية العقد: {player.contract_start_date}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* History */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-4">تاريخ الأندية</h4>
                <div className="space-y-4 border-r-2 border-gray-100 pr-4 mr-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {(player?.club_history && player.club_history.length > 0) ? (
                    player.club_history.map((club: any, i: number) => (
                      <div key={i} className="relative pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                        <div className="absolute top-2 -right-[23px] w-3 h-3 bg-gray-300 rounded-full ring-4 ring-white" />
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-gray-800">{club.club_name || club.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5" dir="ltr">{club.season || `${club.from} - ${club.to}`}</div>
                            {club.position_played && <div className="text-xs text-indigo-600 mt-1">{club.position_played}</div>}
                          </div>
                          {(club.goals || club.assists) && (
                            <div className="flex gap-1 flex-wrap justify-end">
                              {club.goals && (
                                <div className="px-1.5 py-0.5 bg-green-50 text-green-700 text-[10px] rounded border border-green-100 flex items-center gap-1">
                                  <span>⚽</span> {club.goals}
                                </div>
                              )}
                              {club.assists && (
                                <div className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded border border-blue-100 flex items-center gap-1">
                                  <span>👟</span> {club.assists}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (player?.previous_clubs && player.previous_clubs.length > 0) ? (
                    player.previous_clubs.map((club: string, i: number) => (
                      <div key={i} className="relative">
                        <div className="absolute top-2 -right-[23px] w-3 h-3 bg-gray-300 rounded-full ring-4 ring-white" />
                        <div className="font-bold text-gray-800">{club}</div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 italic text-sm">لا يوجد تاريخ أندية سابق</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Training History (Academies & Private Coaches) */}
        {((player?.academies && player?.academies.length > 0) || (player?.private_coaches && player?.private_coaches.length > 0)) && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center gap-3 bg-purple-50/50">
              <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                <School className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">التدريب والتأسيس</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Academies */}
              {player?.academies && player.academies.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-purple-400" /> الأكاديميات
                  </h4>
                  <div className="space-y-3">
                    {player.academies.map((aca: any, i: number) => (
                      <div key={i} className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                        <div className="font-bold text-purple-900">{aca.name}</div>
                        <div className="text-xs text-purple-600 mt-1" dir="ltr">{aca.start_date} - {aca.end_date}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Private Coaches */}
              {player?.private_coaches && player.private_coaches.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-400" /> المدربين الخاصين
                  </h4>
                  <div className="space-y-3">
                    {player.private_coaches.map((coach: any, i: number) => (
                      <div key={i} className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                        <div className="font-bold text-indigo-900">{coach.name}</div>
                        <div className="text-xs text-indigo-600 mt-1" dir="ltr">{coach.start_date} - {coach.end_date}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Achievements */}
        {(player?.achievements && player.achievements.length > 0) && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-4">
              <Trophy className="w-5 h-5 text-amber-500" />
              الإنجازات والجوائز
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {player.achievements.map((ach: any, i: number) => (
                <div key={i} className="bg-amber-50 p-4 rounded-xl border border-amber-100 transition-transform hover:-translate-y-1 duration-200">
                  <div className="font-bold text-amber-900 mb-1">{ach.title || ach.name}</div>
                  {ach.date && <div className="text-xs text-amber-700 font-medium bg-amber-100 inline-block px-2 py-0.5 rounded mb-2">{ach.date}</div>}
                  {ach.description && <div className="text-sm text-amber-800/80 line-clamp-2">{ach.description}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Sports Notes */}
        {player?.sports_notes && (
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-2">
              <FileText className="w-5 h-5 text-slate-500" />
              ملاحظات رياضية
            </h3>
            <p className="text-slate-700 leading-relaxed">{player.sports_notes}</p>
          </div>
        )}
      </div>
    );
  };

  const renderEducation = () => {
    // Helper to map levels if needed, or just display raw value
    const EDUCATION_LEVEL_LABELS: Record<string, string> = {
      "primary": "ابتدائي",
      "middle": "متوسط",
      "high_school": "ثانوي",
      "bachelors": "بكالوريوس",
      "masters": "ماجستير",
      "phd": "دكتوراه"
    };

    return (
      <div className="space-y-6">
        {/* 1. Academic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Level */}
          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
            <div className="flex items-center gap-2 mb-2 text-indigo-700 font-semibold">
              <GraduationCap className="w-5 h-5" />
              المستوى التعليمي
            </div>
            <div className="text-xl font-bold text-indigo-900">
              {EDUCATION_LEVEL_LABELS[player?.education_level] || player?.education_level || '--'}
            </div>
            {player?.school_name && (
              <div className="text-sm text-indigo-600 mt-1">{player.school_name}</div>
            )}
          </div>

          {/* Graduation Year */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-center gap-2 mb-2 text-blue-700 font-semibold">
              <Calendar className="w-5 h-5" />
              سنة التخرج
            </div>
            <div className="text-xl font-bold text-blue-900">{player?.graduation_year || '--'}</div>
          </div>
        </div>

        {/* 2. Languages */}
        <div className="bg-teal-50 rounded-lg border border-teal-100 p-4">
          <div className="flex items-center gap-2 mb-4 text-teal-700 font-semibold">
            <Languages className="w-5 h-5" />
            اللغات
          </div>
          {player?.languages && player.languages.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {player.languages.map((lang: any, idx: number) => (
                <div key={idx} className="bg-white p-3 rounded shadow-sm flex justify-between items-center">
                  <span className="font-bold text-teal-900">{lang.language}</span>
                  <span className="text-xs px-2 py-1 bg-teal-100 text-teal-700 rounded-full">{lang.level}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {player?.english_level && <div className="bg-white p-3 rounded shadow-sm">🇺🇸 English: {player.english_level}</div>}
              {player?.arabic_level && <div className="bg-white p-3 rounded shadow-sm">🇸🇦 العربية: {player.arabic_level}</div>}
              {!player?.english_level && !player?.arabic_level && <div className="text-gray-500 italic">لا توجد لغات مسجلة</div>}
            </div>
          )}
        </div>

        {/* 3. Courses */}
        <div className="bg-orange-50 rounded-lg border border-orange-100 p-4">
          <div className="flex items-center gap-2 mb-4 text-orange-700 font-semibold">
            <Award className="w-5 h-5" />
            الدورات والشهادات
          </div>
          {player?.courses && player.courses.length > 0 ? (
            <div className="space-y-3">
              {player.courses.map((course: any, idx: number) => (
                <div key={idx} className="bg-white p-3 rounded shadow-sm border-r-4 border-orange-400">
                  <div className="font-bold text-gray-900">{course.name}</div>
                  <div className="flex gap-4 mt-1 text-sm text-gray-500">
                    <span>{course.organization}</span>
                    <span>{course.date}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : player?.training_courses && player.training_courses.length > 0 ? (
            <div className="space-y-2">
              {player.training_courses.map((c: string, idx: number) => (
                <div key={idx} className="bg-white p-2 rounded shadow-sm">{c}</div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 italic">لا توجد دورات مسجلة</div>
          )}
        </div>
      </div>
    );
  };

  const renderMedicalRecord = () => {
    // حساب BMI
    const height = player?.height ? parseFloat(player.height) : null;
    const weight = player?.weight ? parseFloat(player.weight) : null;
    const bmi = height && weight ? (weight / Math.pow(height / 100, 2)).toFixed(1) : null;

    return (
      <div className="space-y-8">
        {/* Vital Signs Card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h4 className="flex items-center gap-2 text-lg font-semibold mb-6">
            <Activity className="w-5 h-5 text-red-500" />
            القياسات الحيوية
          </h4>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-sm text-gray-500 mb-1">الوزن</div>
              <div className="text-xl font-bold text-gray-900">{player?.weight || '--'} <span className="text-xs font-normal">كجم</span></div>
              {bmi && <div className={`text-xs mt-1 font-medium ${Number(bmi) < 18.5 ? 'text-blue-600' :
                Number(bmi) < 25 ? 'text-green-600' :
                  'text-orange-600'
                }`}>BMI: {bmi}</div>}
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-sm text-gray-500 mb-1">الطول</div>
              <div className="text-xl font-bold text-gray-900">{player?.height || '--'} <span className="text-xs font-normal">سم</span></div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-sm text-gray-500 mb-1">فصيلة الدم</div>
              <div className="text-xl font-bold text-red-600 font-mono">{player?.blood_type || '--'}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-sm text-gray-500 mb-1">أمراض مزمنة</div>
              <div className={`text-lg font-bold ${player?.chronic_conditions ? 'text-red-600' : 'text-green-600'}`}>
                {player?.chronic_conditions ? 'نعم' : 'لا'}
              </div>
            </div>
          </div>
          {player?.chronic_conditions && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-100">
              <div className="font-semibold text-red-800 mb-1">تفاصيل الأمراض المزمنة:</div>
              <p className="text-red-700 text-sm">{player?.chronic_details || 'لا توجد تفاصيل'}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Allergies & Medications */}
          <div className="space-y-6">
            {/* Allergies */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h4 className="flex items-center gap-2 text-lg font-semibold mb-4">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                الحساسية
              </h4>
              {(player?.allergies_list && player.allergies_list.length > 0) ? (
                <div className="flex flex-wrap gap-2">
                  {player.allergies_list.map((a: any, i: number) => (
                    <span key={i} className="px-3 py-1 bg-orange-50 text-orange-700 border border-orange-100 rounded-full text-sm">
                      {typeof a === 'string' ? a : a.value || a.name || a}
                    </span>
                  ))}
                </div>
              ) : player?.allergies ? (
                <p className="text-gray-700">{player.allergies}</p>
              ) : (
                <p className="text-gray-400 italic">لا توجد حساسية مسجلة</p>
              )}
            </div>

            {/* Medications */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h4 className="flex items-center gap-2 text-lg font-semibold mb-4">
                <Pill className="w-5 h-5 text-blue-500" />
                الأدوية المستمرة
              </h4>
              {(player?.medications && player.medications.length > 0) ? (
                <div className="space-y-3">
                  {player.medications.map((m: any, i: number) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <span className="font-medium text-blue-900">{m.name || m}</span>
                      <span className="text-sm text-blue-600">{m.dosage || m.frequency}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 italic">لا توجد أدوية مسجلة</p>
              )}
            </div>
          </div>

          {/* Injuries & Surgeries */}
          <div className="space-y-6">
            {/* Injuries */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h4 className="flex items-center gap-2 text-lg font-semibold mb-4">
                <Activity className="w-5 h-5 text-red-500" />
                الإصابات السابقة
              </h4>
              {(player?.injuries && player.injuries.length > 0) ? (
                <div className="space-y-3">
                  {player.injuries.map((injury: any, i: number) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="font-medium text-gray-900">{injury.type}</div>
                      <div className="flex justify-between mt-1 text-sm">
                        <span className="text-gray-500">{injury.date}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${injury.status === 'تعافي تام' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>{injury.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 italic">لا توجد إصابات مسجلة</p>
              )}
            </div>

            {/* Surgeries */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h4 className="flex items-center gap-2 text-lg font-semibold mb-4">
                <Stethoscope className="w-5 h-5 text-purple-500" />
                العمليات الجراحية
              </h4>
              {((player?.surgeries_list && player.surgeries_list.length > 0) || (player?.surgeries && player.surgeries.length > 0)) ? (
                <div className="space-y-3">
                  {(player.surgeries_list || player.surgeries).map((surgery: any, i: number) => (
                    <div key={i} className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                      <div className="font-medium text-purple-900">{surgery.type || surgery.name}</div>
                      <div className="text-sm text-purple-600 mt-1">{surgery.date ? dayjs(surgery.date).format('YYYY/MM/DD') : '--'}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 italic">لا توجد عمليات مسجلة</p>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h4 className="flex items-center gap-2 text-lg font-semibold mb-4 text-gray-700">ملاحظات طبية إضافية</h4>
          <p className="text-gray-600 leading-relaxed">{player?.medical_notes || 'لا توجد ملاحظات إضافية'}</p>
        </div>
      </div>
    );
  };

  const renderSkills = () => {
    // 1. Check for New Data Format (FIFA Stats)
    const hasNewStats = player?.stats_pace !== undefined || player?.stats_shooting !== undefined;

    if (hasNewStats) {
      const mainStats = [
        { label: 'السرعة', value: player?.stats_pace || 0, color: 'text-red-500' },
        { label: 'التسديد', value: player?.stats_shooting || 0, color: 'text-blue-500' },
        { label: 'التمرير', value: player?.stats_passing || 0, color: 'text-green-500' },
        { label: 'المراوغة', value: player?.stats_dribbling || 0, color: 'text-yellow-500' },
        { label: 'الدفاع', value: player?.stats_defending || 0, color: 'text-purple-500' },
        { label: 'البدنية', value: player?.stats_physical || 0, color: 'text-gray-500' },
      ];

      const radarData = mainStats.map(stat => ({
        subject: stat.label,
        A: stat.value,
        fullMark: 100
      }));

      const mentalStats = [
        { label: 'الرؤية', value: player?.mentality_vision || 0 },
        { label: 'القيادة', value: player?.mentality_leadership || 0 },
        { label: 'الهدوء', value: player?.mentality_composure || 0 },
        { label: 'العمل الجماعي', value: player?.mentality_teamwork || 0 },
        { label: 'الشراسة', value: player?.mentality_aggression || 0 },
      ];

      return (
        <div className="space-y-8">
          {/* Main Stats (Radar + Grid) */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-500" />
              القدرات الفنية والبدنية
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              {/* Radar Chart */}
              <div className="h-[300px] w-full flex justify-center" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#374151', fontSize: 13, fontWeight: 500 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="اللاعب" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} />
                    <ChartTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {mainStats.map((stat, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100 flex flex-col justify-center h-full hover:bg-gray-100 transition-colors">
                    <div className={`text-3xl font-black mb-1 ${stat.value >= 80 ? 'text-green-600' : stat.value >= 60 ? 'text-blue-600' : 'text-gray-800'}`}>{stat.value}</div>
                    <div className="text-sm text-gray-500 font-bold">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mental Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm h-full">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Brain className="w-6 h-6 text-purple-500" />
                القدرات الذهنية
              </h3>
              <div className="space-y-4">
                {mentalStats.map((stat, i) => (
                  <div key={i}>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium text-gray-700">{stat.label}</span>
                      <span className="font-bold text-gray-900">{stat.value}</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${stat.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Advanced Stats */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm h-full">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Star className="w-6 h-6 text-amber-500" />
                مهارات متقدمة
              </h3>
              <div className="space-y-6">
                {/* Stars */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                    <span className="font-medium text-gray-700">القدم الضعيفة</span>
                    <div className="flex gap-1" dir="ltr">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`w-5 h-5 ${s <= (player?.weak_foot || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                    <span className="font-medium text-gray-700">مهارات المراوغة</span>
                    <div className="flex gap-1" dir="ltr">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`w-5 h-5 ${s <= (player?.skill_moves || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="h-px bg-gray-100" />

                {/* Work Rates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 border border-gray-100 rounded-lg">
                    <span className="text-xs text-gray-500 block mb-1">معدل الهجوم</span>
                    <span className="font-bold text-blue-600">{player?.work_rate_attack || '-'}</span>
                  </div>
                  <div className="text-center p-3 border border-gray-100 rounded-lg">
                    <span className="text-xs text-gray-500 block mb-1">معدل الدفاع</span>
                    <span className="font-bold text-blue-600">{player?.work_rate_defense || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Fallback Legacy
    return (
      <div className="space-y-8">
        {technicalSkillsData.length > 0 && (
          <div>
            <h3 className="mb-4 text-xl font-semibold">المهارات الفنية</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={technicalSkillsData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="skill" />
                  <PolarRadiusAxis angle={30} domain={[0, 10]} />
                  <Radar name="المهارات" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  <ChartTooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4 md:grid-cols-3">
              {technicalSkillsData.map((skillData, index) => (
                <div key={index} className="p-2 bg-white rounded shadow">
                  <div className="font-semibold">{skillData.skill}</div>
                  <div className="text-sm text-gray-600">المستوى: {skillData.value}/10</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {physicalSkillsData.length > 0 && (
          <div>
            <h3 className="mb-4 text-xl font-semibold">المهارات البدنية</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={physicalSkillsData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="skill" />
                  <PolarRadiusAxis angle={30} domain={[0, 10]} />
                  <Radar name="المهارات" dataKey="value" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                  <ChartTooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4 md:grid-cols-3">
              {physicalSkillsData.map((skillData, index) => (
                <div key={index} className="p-2 bg-white rounded shadow">
                  <div className="font-semibold">{skillData.skill}</div>
                  <div className="text-sm text-gray-600">المستوى: {skillData.value}/10</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {socialSkillsData.length > 0 && (
          <div>
            <h3 className="mb-4 text-xl font-semibold">المهارات الاجتماعية</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={socialSkillsData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="skill" />
                  <PolarRadiusAxis angle={30} domain={[0, 10]} />
                  <Radar name="المهارات" dataKey="value" stroke="#ffc658" fill="#ffc658" fillOpacity={0.6} />
                  <ChartTooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4 md:grid-cols-3">
              {socialSkillsData.map((skillData, index) => (
                <div key={index} className="p-2 bg-white rounded shadow">
                  <div className="font-semibold">{skillData.skill}</div>
                  <div className="text-sm text-gray-600">المستوى: {skillData.value}/10</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderObjectives = () => {
    // دعم الصيغة الجديدة (Array of strings)
    if (Array.isArray(player?.objectives)) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {player.objectives.length > 0 ? (
              player.objectives.map((obj: string, index: number) => (
                <div key={index} className="p-4 bg-green-50 rounded-lg border border-green-200 flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-full text-green-600">
                    <Target className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-green-900">{obj}</span>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">لم يتم تحديد أهداف بعد</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // تعريف الأهداف مع تسمياتها (Logic القديم)
    const objectiveLabels = {
      professional: 'الاحتراف',
      trials: 'إجراء التجارب',
      local_leagues: 'اللعب في الدوريات المحلية',
      arab_leagues: 'اللعب في الدوريات العربية',
      european_leagues: 'اللعب في الدوريات الأوروبية',
      training: 'التدريب والتطوير',
      other: 'أهداف أخرى'
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {player?.objectives && Object.entries(player.objectives).map(([key, value]: [string, boolean | string]) => {
            const label = objectiveLabels[key as keyof typeof objectiveLabels] || key;
            const displayValue = typeof value === 'boolean' ? (value ? 'نعم ✅' : 'لا ❌') : value || '--';
            const bgColor = typeof value === 'boolean'
              ? (value ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200')
              : 'bg-blue-50 border-blue-200';
            const textColor = typeof value === 'boolean'
              ? (value ? 'text-green-700' : 'text-gray-700')
              : 'text-blue-700';
            const valueColor = typeof value === 'boolean'
              ? (value ? 'text-green-900' : 'text-gray-900')
              : 'text-blue-900';

            return (
              <div key={key} className={`p-4 rounded-lg border-2 ${bgColor}`}>
                <div className={`mb-2 font-semibold ${textColor}`}>
                  {label}
                </div>
                <div className={`text-lg font-bold ${valueColor}`}>
                  {displayValue}
                </div>
              </div>
            );
          })}
        </div>

        {/* عرض ملخص الأهداف */}
        {player?.objectives && (
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
            <h4 className="mb-3 text-lg font-semibold text-blue-800">ملخص الأهداف والطموحات</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-green-700">الأهداف المحددة: </span>
                <span className="font-bold text-green-900">
                  {Object.values(player.objectives).filter(v => v === true).length}
                </span>
              </div>
              <div>
                <span className="font-medium text-blue-700">إجمالي الأهداف: </span>
                <span className="font-bold text-blue-900">
                  {Object.keys(player.objectives).length}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMedia = () => {
    console.log('🎬 [renderMedia] بيانات اللاعب المعالجة:', {
      profile_image_url: player?.profile_image_url,
      additional_images: player?.additional_images,
      additional_images_length: player?.additional_images?.length || 0,
      videos: player?.videos,
      videos_length: player?.videos?.length || 0,
      documents: player?.documents,
      documents_length: player?.documents?.length || 0
    });

    // تجميع كل الصور من مصادر مختلفة مع إزالة التكرارات
    const allImages: { url: string; label: string; type: 'profile' | 'additional' }[] = [];
    const seenUrls = new Set<string>();

    // إضافة الصورة الشخصية مع فلترة الروابط المكسورة
    if (player?.profile_image_url) {
      const validProfileImage = getValidImageUrl(player.profile_image_url);
      if (validProfileImage !== '/images/default-avatar.png' && !seenUrls.has(validProfileImage)) {
        console.log('✅ [renderMedia] تم العثور على صورة شخصية صالحة:', validProfileImage);
        allImages.push({ url: validProfileImage, label: 'الصورة الشخصية', type: 'profile' });
        seenUrls.add(validProfileImage);
      } else {
        console.log('🚫 [renderMedia] صورة شخصية مكسورة أو مكررة تم فلترتها:', player.profile_image_url);
      }
    } else {
      console.log('❌ [renderMedia] لا توجد صورة شخصية');
    }

    // إضافة الصور الإضافية مع تحقق محسن وإزالة التكرارات
    if (player?.additional_images && player.additional_images.length > 0) {
      console.log('✅ [renderMedia] تم العثور على صور إضافية:', player.additional_images);
      player.additional_images.forEach((image, index) => {
        console.log(`📷 [renderMedia] معالجة الصورة الإضافية ${index + 1}:`, image);

        let imageUrl = '';

        // تحقق من البنية المختلفة للصورة
        if (typeof image === 'string') {
          imageUrl = image;
          console.log(`✅ رابط مباشر للصورة ${index + 1}:`, imageUrl);
        } else if (image && typeof image === 'object') {
          if (image.url) {
            imageUrl = image.url;
            console.log(`✅ رابط من image.url للصورة ${index + 1}:`, imageUrl);
          } else if ((image as any).src) {
            imageUrl = (image as any).src;
            console.log(`✅ رابط من image.src للصورة ${index + 1}:`, imageUrl);
          } else if ((image as any).path) {
            imageUrl = (image as any).path;
            console.log(`✅ رابط من image.path للصورة ${index + 1}:`, imageUrl);
          } else {
            console.log(`❌ لم يتم العثور على رابط للصورة ${index + 1}:`, image);
          }
        }

        if (imageUrl && imageUrl.trim() !== '') {
          // تطبيق فلترة الروابط المكسورة مع تحقق إضافي لروابط Supabase المعطلة
          const validImageUrl = getValidImageUrl(imageUrl);

          // تحقق إضافي من الروابط المعطلة
          const isBrokenSupabaseUrl = imageUrl.includes('supabase.co/storage') || imageUrl.includes('ekyerljzfokqimbabzxm.supabase.co');

          if (validImageUrl !== '/images/default-avatar.png' && !isBrokenSupabaseUrl && !seenUrls.has(validImageUrl)) {
            allImages.push({ url: validImageUrl, label: `صورة إضافية ${index + 1}`, type: 'additional' });
            seenUrls.add(validImageUrl);
            console.log(`✅ تم إضافة الصورة ${index + 1} إلى المجموعة`);
          } else {
            console.log(`🚫 صورة إضافية مكسورة أو مكررة تم فلترتها ${index + 1}:`, imageUrl);
          }
        } else {
          console.log(`❌ رابط الصورة ${index + 1} فارغ أو غير صحيح`);
        }
      });
    } else {
      console.log('❌ [renderMedia] لا توجد صور إضافية');
      console.log('🔍 تحقق من البيانات:', {
        additional_images: player?.additional_images,
        hasAdditionalImages: !!player?.additional_images,
        additionalImagesLength: player?.additional_images?.length || 0
      });
    }

    console.log('📷 [renderMedia] إجمالي الصور (بعد الفلترة):', allImages);

    return (
      <div className="space-y-8">


        {/* قسم جميع الصور */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">الصور</h3>
            {allImages.length > 0 && (
              <span className="px-3 py-1 text-sm text-green-800 bg-green-100 rounded-full">
                {allImages.length} صورة
              </span>
            )}
          </div>

          {allImages.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {allImages.map((image, index) => (
                <div key={`image-${index}`} className="overflow-hidden relative rounded-lg shadow-md aspect-square group">
                  <img
                    src={image.url}
                    alt={image.label}
                    className="object-cover w-full h-full transition-opacity cursor-pointer hover:opacity-90"
                    onClick={() => {
                      setSelectedImage(image.url);
                      setSelectedImageIdx(index);
                    }}
                    onLoad={() => console.log(`✅ تم تحميل ${image.label} بنجاح`)}
                    onError={(e) => {
                      console.error(`❌ فشل في تحميل ${image.label}:`, e);
                      console.error(`❌ رابط الصورة:`, image.url);
                      // إخفاء الصورة المكسورة وإظهار صورة افتراضية
                      e.currentTarget.style.display = 'none';
                      const fallbackDiv = e.currentTarget.parentElement?.querySelector('.image-fallback');
                      if (fallbackDiv) {
                        (fallbackDiv as HTMLElement).style.display = 'flex';
                      }
                    }}
                  />
                  {/* صورة افتراضية للصور المكسورة */}
                  <div className="image-fallback absolute inset-0 bg-gray-200 items-center justify-center hidden">
                    <div className="text-center text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xs">صورة غير متاحة</p>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 px-2 py-1 text-xs text-white bg-black bg-opacity-50 rounded">
                    {index + 1}
                  </div>
                  <div className="absolute right-2 bottom-2 left-2 px-2 py-1 text-xs text-white truncate bg-black bg-opacity-70 rounded">
                    {image.label}
                  </div>
                  {image.type === 'profile' && (
                    <div className="absolute top-2 left-2 px-2 py-1 text-xs text-white bg-blue-600 rounded">
                      ⭐ شخصية
                    </div>
                  )}

                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center bg-gray-50 rounded-lg border-2 border-gray-300 border-dashed">
              <svg className="mx-auto mb-4 w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="mb-2 text-lg font-medium text-gray-900">لا توجد صور</h3>
              <p className="mb-4 text-gray-500">أضف صورة شخصية وصور إضافية لإظهار مهاراتك وإنجازاتك</p>
              <div className="text-sm text-gray-400">
                💡 يمكنك إضافة الصور من صفحة تعديل الملف الشخصي
              </div>
            </div>
          )}
        </div>

        {/* قسم الفيديوهات المحسن */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">الفيديوهات</h3>
            <div className="flex gap-3 items-center">
              {player?.videos && player.videos.length > 0 && (
                <span className="px-3 py-1 text-sm text-blue-800 bg-blue-100 rounded-full">
                  {player.videos.length} فيديو
                </span>
              )}
            </div>
          </div>

          {player?.videos && player.videos.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {player.videos.map((video: any, index: number) => {
                console.log(`🎬 [renderMedia] فيديو ${index + 1}:`, video);
                console.log(`🔗 رابط الفيديو:`, video.url);
                console.log(`📝 وصف الفيديو:`, video.desc);

                // التحقق من صحة رابط الفيديو
                if (!video.url || video.url.trim() === '') {
                  console.log(`❌ رابط الفيديو ${index + 1} فارغ`);
                  return (
                    <div key={index} className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-red-600">رابط الفيديو {index + 1} غير صحيح أو فارغ</p>
                    </div>
                  );
                }

                // التحقق من صحة رابط الفيديو (YouTube, Vimeo, أو رابط مباشر)
                const isValidVideoUrl = (url: string) => {
                  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
                  const vimeoRegex = /^(https?:\/\/)?(www\.)?(vimeo\.com)\/.+/;
                  const directVideoRegex = /\.(mp4|webm|ogg|mov|avi|mkv)$/i;

                  // السماح أيضاً بالمسارات النسبية بما أنها ستوجه لـ Cloudflare
                  const isRelativePath = !url.startsWith('http') && url.includes('.');

                  return youtubeRegex.test(url) || vimeoRegex.test(url) || directVideoRegex.test(url) || isRelativePath;
                };

                const videoUrl = video.url.startsWith('http') ? video.url : getSupabaseImageUrl(video.url, 'videos');

                if (!isValidVideoUrl(video.url)) {
                  console.log(`❌ رابط الفيديو ${index + 1} غير صالح:`, video.url);
                  return (
                    <div key={index} className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-yellow-700">رابط الفيديو {index + 1} غير صالح</p>
                      <p className="text-sm text-yellow-600 mt-1">الرابط: {video.url}</p>
                    </div>
                  );
                }

                return (
                  <div key={index} className="overflow-hidden bg-white rounded-lg border border-gray-200 shadow-md" data-video-index={index}>
                    <div className="relative bg-gray-100 aspect-video">
                      <div className="flex justify-center items-center w-full h-full bg-gray-200">
                        <div className="text-center text-gray-500">
                          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 002 2v8a2 2 0 002 2z" />
                          </svg>
                          <p className="text-sm">فيديو {index + 1}</p>
                          <p className="text-xs mt-1">اضغط على الرابط أدناه للمشاهدة</p>
                        </div>
                      </div>
                      {/* عرض رابط الفيديو للتشخيص */}
                      <div className="absolute top-2 left-2 px-2 py-1 text-xs text-white bg-black bg-opacity-50 rounded">
                        Video {index + 1}
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="mb-2 text-sm text-gray-700">
                        {video.desc || 'لا يوجد وصف'}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">فيديو {index + 1}</span>
                        <div className="flex gap-2">
                          <a
                            href={videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            مشاهدة في نافذة جديدة
                          </a>

                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center bg-gray-50 rounded-lg border-2 border-gray-300 border-dashed">
              <svg className="mx-auto mb-4 w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 002 2v8a2 2 0 002 2z" />
              </svg>
              <h3 className="mb-2 text-lg font-medium text-gray-900">لا توجد فيديوهات</h3>
              <p className="mb-4 text-gray-500">لم يتم إضافة أي فيديوهات بعد</p>
            </div>
          )}
        </div>

        {/* قسم المستندات الجديد */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">المستندات والشهادات</h3>
            {player?.documents && player.documents.length > 0 && (
              <span className="px-3 py-1 text-sm text-purple-800 bg-purple-100 rounded-full">
                {player.documents.length} مستند
              </span>
            )}
          </div>

          {player?.documents && player.documents.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {player.documents.map((doc: PlayerDocument, index: number) => (
                <div key={index} className="p-4 bg-white rounded-lg border border-gray-200 shadow-md transition-shadow hover:shadow-lg">
                  <div className="flex gap-3 items-start">
                    <div className="flex-shrink-0 p-2 bg-purple-100 rounded-lg">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">{doc.name}</h4>
                      <p className="mt-1 text-xs text-gray-500">النوع: {doc.type}</p>
                      <a
                        href={doc.url.startsWith('http') ? doc.url : getSupabaseImageUrl(doc.url, 'documents')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex gap-1 items-center mt-2 text-xs text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        عرض المستند
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center bg-gray-50 rounded-lg border-2 border-gray-300 border-dashed">
              <svg className="mx-auto mb-4 w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mb-2 text-lg font-medium text-gray-900">لا توجد مستندات</h3>
              <p className="mb-4 text-gray-500">لم يتم إضافة أي مستندات بعد</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderContracts = () => {
    const status = player?.contract_status?.toLowerCase();
    const isContracted = status === 'contracted' || status === 'loan';

    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* 1. Contract Status */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="mb-1 font-semibold text-blue-700">الحالة التعاقدية</div>
          <div className="text-lg font-bold text-blue-900">
            {status === 'free' ? 'لاعب حر (Free Agent)' :
              status === 'contracted' ? 'مرتبط بعقد' :
                status === 'loan' ? 'إعارة' :
                  // Fallback
                  (player?.currently_contracted === 'yes' ? 'مرتبط بعقد' :
                    player?.currently_contracted === 'no' ? 'لاعب حر' :
                      player?.contract_status || '--')}
          </div>
        </div>

        {/* 2. Passport Status (Legacy/Admin) */}
        {(player?.has_passport) && (
          <div className="p-4 bg-indigo-50 rounded-lg">
            <div className="mb-1 font-semibold text-indigo-700">جواز السفر</div>
            <div className="text-lg font-bold text-indigo-900">
              {player?.has_passport === 'yes' ? 'متوفر' : 'غير متوفر'}
            </div>
          </div>
        )}

        {/* 3. Market Value (New) */}
        <div className="p-4 bg-green-50 rounded-lg">
          <div className="mb-1 font-semibold text-green-700">القيمة السوقية</div>
          <div className="text-lg font-bold text-green-900" dir="ltr">
            {(player?.market_value !== undefined && player?.market_value !== null)
              ? `${Number(player.market_value).toLocaleString()} €`
              : '--'}
          </div>
          <div className="text-xs text-green-600 mt-1">قيمة تقديرية</div>
        </div>

        {/* 4. Current Club Details (If Contracted) */}
        {isContracted && (
          <div className="col-span-1 md:col-span-2 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex flex-wrap gap-8 items-center">
              <div>
                <div className="text-sm text-gray-500 mb-1">النادي الحالي</div>
                <div className="font-bold text-gray-900 text-lg">{player?.current_club || '--'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">بداية العقد</div>
                <div className="font-bold text-gray-900 text-lg">{player?.contract_start_date ? dayjs(player.contract_start_date).format('DD/MM/YYYY') : '--'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">نهاية العقد</div>
                <div className="font-bold text-gray-900 text-lg">{player?.contract_end_date ? dayjs(player.contract_end_date).format('DD/MM/YYYY') : '--'}</div>
              </div>
            </div>
          </div>
        )}

        {/* 5. Current Agent (New) */}
        {(player?.agent_name || player?.agent_phone) && (
          <div className="col-span-1 md:col-span-2 p-4 bg-violet-50 rounded-lg border border-violet-100">
            <div className="mb-3 font-semibold text-violet-700 flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              وكيل الأعمال الحالي
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {player.agent_name && (
                <div className="bg-white p-3 rounded shadow-sm">
                  <span className="text-xs text-violet-500 block">الاسم</span>
                  <span className="font-medium text-violet-900">{player.agent_name}</span>
                </div>
              )}
              {player.agent_phone && (
                <div className="bg-white p-3 rounded shadow-sm">
                  <span className="text-xs text-violet-500 block">رقم الهاتف</span>
                  <span className="font-medium text-violet-900" dir="ltr">{player.agent_phone}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Official Contact */}
        {(player?.official_contact) && (
          <div className="col-span-1 md:col-span-2 p-4 bg-fuchsia-50 rounded-lg border border-fuchsia-100">
            <div className="mb-3 font-semibold text-fuchsia-700 flex items-center gap-2">
              <Phone className="w-5 h-5" />
              جهة الاتصال والتفاوض الرسمية
            </div>
            <div className="bg-white p-4 rounded shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-fuchsia-500 block">الاسم</span>
                  <span className="font-medium text-fuchsia-900">{player.official_contact.name || '--'}</span>
                </div>
                <div>
                  <span className="text-xs text-fuchsia-500 block">المسمى الوظيفي</span>
                  <span className="font-medium text-fuchsia-900">{player.official_contact.title || '--'}</span>
                </div>
                <div>
                  <span className="text-xs text-fuchsia-500 block">رقم الهاتف</span>
                  <span className="font-medium text-fuchsia-900" dir="ltr">{player.official_contact.phone || '--'}</span>
                </div>
                <div>
                  <span className="text-xs text-fuchsia-500 block">البريد الإلكتروني</span>
                  <span className="font-medium text-fuchsia-900">{player.official_contact.email || '--'}</span>
                </div>
                {player.official_contact.whatsapp && (
                  <div>
                    <span className="text-xs text-fuchsia-500 block">واتساب</span>
                    <span className="font-medium text-fuchsia-900" dir="ltr">{player.official_contact.whatsapp}</span>
                  </div>
                )}
              </div>

              {player.official_contact.social_links && Object.values(player.official_contact.social_links).some(v => v) && (
                <div className="pt-3 border-t border-gray-100">
                  <span className="text-xs text-fuchsia-500 block mb-2">حسابات التواصل الاجتماعي</span>
                  <div className="flex gap-4">
                    {player.official_contact.social_links.facebook && (
                      <a href={player.official_contact.social_links.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 transition-colors">
                        <Facebook className="w-5 h-5" />
                      </a>
                    )}
                    {player.official_contact.social_links.instagram && (
                      <a href={player.official_contact.social_links.instagram} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:text-pink-800 transition-colors">
                        <Instagram className="w-5 h-5" />
                      </a>
                    )}
                    {player.official_contact.social_links.linkedin && (
                      <a href={player.official_contact.social_links.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:text-blue-900 transition-colors">
                        <Linkedin className="w-5 h-5" />
                      </a>
                    )}
                    {player.official_contact.social_links.twitter && (
                      <a href={player.official_contact.social_links.twitter} target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:text-sky-700 transition-colors">
                        <Twitter className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. Legacy Contract History */}
        <div className="col-span-1 md:col-span-2 p-4 bg-gray-50 rounded-lg">
          <div className="mb-2 font-semibold text-gray-700">تاريخ التعاقدات السابقة</div>
          <div className="space-y-2">
            {player?.contract_history && player.contract_history.length > 0 ? (
              player.contract_history.map((contract: any, idx: number) => (
                <div key={idx} className="p-2 bg-white rounded shadow-sm">
                  <div>النادي: {contract.club || '--'}</div>
                  <div>الفترة: {contract.from} - {contract.to}</div>
                  <div>المركز: {contract.role || '--'}</div>
                </div>
              ))
            ) : (
              <div className="p-2 text-gray-500 bg-white rounded">لا توجد تعاقدات سابقة مسجلة</div>
            )}
          </div>
        </div>

        {/* 7. Legacy Agent History */}
        {player?.agent_history && player.agent_history.length > 0 && (
          <div className="col-span-1 md:col-span-2 p-4 bg-yellow-50 rounded-lg">
            <div className="mb-2 font-semibold text-yellow-700">سجل وكلاء اللاعبين السابق</div>
            <div className="space-y-2">
              {player.agent_history.map((agent: any, idx: number) => (
                <div key={idx} className="p-2 bg-white rounded shadow-sm">
                  <div>الاسم: {agent.agent || '--'}</div>
                  <div>الفترة: {agent.from} - {agent.to}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8. Subscription etc. */}
        {player?.subscription_status && (
          <div className="col-span-1 md:col-span-2 p-4 bg-purple-50 rounded-lg">
            <div className="mb-2 font-semibold text-purple-700">تفاصيل الاشتراك</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-xs text-purple-600 block">الحالة</span>
                <span className="font-bold">{player?.subscription_status || '--'}</span>
              </div>
              <div>
                <span className="text-xs text-purple-600 block">النوع</span>
                <span className="font-bold">{player?.subscription_type || '--'}</span>
              </div>
              <div>
                <span className="text-xs text-purple-600 block">ينتهي في</span>
                <span className="font-bold">{player?.subscription_end ? dayjs(player.subscription_end).format('DD/MM/YYYY') : '--'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const TABS = [
    { name: 'البيانات الشخصية', render: renderPersonalInfo },
    { name: 'المعلومات الرياضية', render: renderSportsInfo },
    { name: 'التعليم', render: renderEducation },
    { name: 'السجل الطبي', render: renderMedicalRecord },
    { name: 'المهارات', render: renderSkills },
    { name: 'التعاقدات', render: renderContracts },
    { name: 'الأهداف', render: renderObjectives },
    { name: 'الوسائط', render: renderMedia },
    { name: 'السيرة الذاتية', render: () => <PlayerResume player={player} playerOrganization={playerOrganization} /> },
  ];

  // دالة لحساب نسبة اكتمال الملف الشخصي
  const calculateProfileCompletion = (player: PlayerFormData | null): number => {
    if (!player) return 0;

    const requiredFields = {
      basic: [
        'full_name',
        'birth_date',
        'nationality',
        'city',
        'country',
        'phone',
        'whatsapp',
        'email',
        'profile_image_url'
      ],
      physical: [
        'height',
        'weight',
        'blood_type',
        'chronic_details'
      ],
      football: [
        'primary_position',
        'secondary_position',
        'preferred_foot',
        'current_club'
      ],
      skills: [
        'technical_skills',
        'physical_skills',
        'social_skills'
      ],
      education: [
        'education_level',
        'graduation_year',
        'english_level',
        'spanish_level',
        'arabic_level'
      ],
      objectives: [
        'objectives'
      ],
      media: [
        'additional_image_urls',
        'videos'
      ]
    };

    let totalFields = 0;
    let completedFields = 0;

    // حساب الحقول الأساسية
    for (const field of requiredFields.basic) {
      totalFields++;
      if (player[field as keyof PlayerFormData] && player[field as keyof PlayerFormData] !== '') {
        completedFields++;
      }
    }

    // حساب الحقول البدنية
    for (const field of requiredFields.physical) {
      totalFields++;
      if (player[field as keyof PlayerFormData] && player[field as keyof PlayerFormData] !== '') {
        completedFields++;
      }
    }

    // حساب الحقول المتعلقة بكرة القدم
    for (const field of requiredFields.football) {
      totalFields++;
      if (player[field as keyof PlayerFormData] && player[field as keyof PlayerFormData] !== '') {
        completedFields++;
      }
    }

    // حساب المهارات
    for (const field of requiredFields.skills) {
      totalFields++;
      if (player[field as keyof PlayerFormData] && Object.keys(player[field as keyof PlayerFormData] || {}).length > 0) {
        completedFields++;
      }
    }

    // حساب الحقول التعليمية
    for (const field of requiredFields.education) {
      totalFields++;
      if (player[field as keyof PlayerFormData] && player[field as keyof PlayerFormData] !== '') {
        completedFields++;
      }
    }

    // حساب الأهداف
    totalFields++;
    if (player.objectives && Object.values(player.objectives).some(value => value === true)) {
      completedFields++;
    }

    // حساب الوسائط
    for (const field of requiredFields.media) {
      totalFields++;
      if (player[field as keyof PlayerFormData] && Array.isArray(player[field as keyof PlayerFormData]) && (player[field as keyof PlayerFormData] as any[]).length > 0) {
        completedFields++;
      }
    }

    return Math.round((completedFields / totalFields) * 100);
  };

  // جلب بيانات اللاعب من Firebase والصور من Supabase
  useEffect(() => {
    let isMounted = true;

    const fetchPlayerData = async () => {
      console.log('🔍 [fetchPlayerData] بدء جلب بيانات اللاعب');
      console.log('📋 [fetchPlayerData] المعاملات:', {
        targetPlayerId,
        playerIdFromUrl,
        userId: user?.id,
        hasUser: !!user
      });

      if (!targetPlayerId) {
        console.error('❌ [fetchPlayerData] لا يوجد معرف لاعب محدد');
        setError("لم يتم تحديد اللاعب المطلوب");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const playerId = targetPlayerId;

        if (!playerId) {
          console.error('❌ [fetchPlayerData] معرف اللاعب غير محدد');
          setError("لم يتم تحديد اللاعب المطلوب");
          setIsLoading(false);
          return;
        }

        console.log('🔍 [fetchPlayerData] محاولة جلب بيانات اللاعب:', playerId);

        // دالة مساعدة لجلب record من table مع Supabase
        const fetchPlayerDoc = async (collectionName: string, docId: string) => {
          console.log(`🔍 [fetchPlayerDoc] البحث في ${collectionName} عن ${docId}`);
          try {
            const { data: rowData } = await supabase
              .from(collectionName)
              .select('*')
              .eq('id', docId)
              .single();
            console.log(`✅ [fetchPlayerDoc] تم جلب record من ${collectionName}:`, !!rowData);
            return { rowData, collectionName };
          } catch (error) {
            console.error(`❌ [fetchPlayerDoc] خطأ في جلب من ${collectionName}:`, error);
            throw error;
          }
        };

        // البحث في المجموعات بالترتيب
        const collections = ['players', 'users', 'player'];
        let playerData: any = null;
        let dataSource = '';

        for (const collectionName of collections) {
          try {
            console.log(`🔍 [fetchPlayerData] محاولة جلب من ${collectionName}...`);
            const result = await fetchPlayerDoc(collectionName, playerId);

            if (!!result.rowData) {
              playerData = result.rowData;
              dataSource = result.collectionName;
              console.log(`✅ [fetchPlayerData] تم العثور على اللاعب في ${dataSource}`);
              break;
            } else {
              console.log(`⚠️ [fetchPlayerData] اللاعب غير موجود في ${collectionName}`);
            }
          } catch (error) {
            console.log(`⚠️ [fetchPlayerData] فشل في جلب من ${collectionName}:`, error);
            continue;
          }
        }

        if (!playerData) {
          console.warn('⚠️ [fetchPlayerData] لم يتم العثور على اللاعب في أي collection:', playerId);
          setError(`لم يتم العثور على بيانات اللاعب`);
          setIsLoading(false);
          return;
        }

        const data = playerData;
        console.log(`✅ [fetchPlayerData] تم العثور على اللاعب في ${dataSource}:`, {
          playerName: data.full_name || data.name,
          accountType: data.accountType,
          hasClubId: !!data.club_id,
          hasAcademyId: !!data.academy_id,
          hasTrainerId: !!data.trainer_id,
          hasAgentId: !!data.agent_id,
          // فحص الحقول البديلة
          hasClubIdAlt: !!data.clubId,
          hasAcademyIdAlt: !!data.academyId,
          hasTrainerIdAlt: !!data.trainerId,
          hasAgentIdAlt: !!data.agentId,
          source: dataSource,
          dataKeys: Object.keys(data),
          hasSkills: !!(data.technical_skills || data.physical_skills || data.social_skills),
          hasMedia: !!(data.profile_image_url || data.additional_images || data.videos),
          isTargetPlayer: playerId === targetPlayerId,
          // فحص حقول الصورة بالتفصيل
          profile_image_url: data.profile_image_url,
          profile_image: data.profile_image,
          avatar: data.avatar,
          photoURL: data.photoURL,
          profilePicture: data.profilePicture,
          image: data.image,
          // فحص البيانات الشخصية بالتفصيل - محسن
          personalData: {
            // حقول الاسم
            full_name: data.full_name,
            name: data.name,
            firstName: data.firstName,
            lastName: data.lastName,
            displayName: data.displayName,

            // حقول التاريخ
            birth_date: data.birth_date,
            birthDate: data.birthDate,
            dateOfBirth: data.dateOfBirth,
            birthday: data.birthday,
            dob: data.dob,

            // حقول الجنسية
            nationality: data.nationality,
            countryOfOrigin: data.countryOfOrigin,
            nationalityCountry: data.nationalityCountry,
            citizenship: data.citizenship,

            // حقول الدولة
            country: data.country,
            countryOfResidence: data.countryOfResidence,
            homeCountry: data.homeCountry,
            residenceCountry: data.residenceCountry,

            // حقول المدينة
            city: data.city,
            town: data.town,
            location: data.location,
            residenceCity: data.residenceCity,
            homeCity: data.homeCity,
            currentCity: data.currentCity,

            // حقول الهاتف
            phone: data.phone,
            phone_number: data.phone_number,
            mobile: data.mobile,
            contact: data.contact,
            phoneNumber: data.phoneNumber,
            mobileNumber: data.mobileNumber,

            // حقول الواتساب
            whatsapp: data.whatsapp,
            whatsapp_number: data.whatsapp_number,
            whatsApp: data.whatsApp,
            whatsappNumber: data.whatsappNumber,
            whatsappPhone: data.whatsappPhone,

            // حقول البريد الإلكتروني
            email: data.email,
            email_address: data.email_address,
            emailAddress: data.emailAddress,
            contactEmail: data.contactEmail,

            // حقول العنوان
            address: data.address,
            fullAddress: data.fullAddress,
            homeAddress: data.homeAddress,
            residenceAddress: data.residenceAddress,

            // حقول النبذة
            brief: data.brief,
            bio: data.bio,
            description: data.description,
            summary: data.summary,
            about: data.about,
            profileDescription: data.profileDescription
          },
          // طباعة جميع البيانات للفحص
          allData: data
        });

        // طباعة جميع البيانات للفحص التفصيلي
        console.log('🔍 [fetchPlayerData] جميع البيانات المتاحة:', {
          allKeys: Object.keys(data),
          allValues: Object.entries(data).reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
          }, {} as any)
        });

        // معالجة البيانات
        const processedData = {
          ...data,
          id: playerId,
          source: dataSource,
          targetPlayerId: targetPlayerId, // إضافة معرف اللاعب المستهدف للتشخيص

          // معالجة البيانات الشخصية الأساسية - محسنة
          full_name: (() => {
            const nameFields = [data.full_name, data.name, data.firstName + ' ' + data.lastName, data.displayName];
            for (const field of nameFields) {
              if (field && field.trim() !== '' && field !== 'undefined undefined') {
                return field.trim();
              }
            }
            return 'غير محدد';
          })(),
          birth_date: (() => {
            const dateFields = [data.birth_date, data.birthDate, data.dateOfBirth, data.birthday, data.dob];
            for (const field of dateFields) {
              if (field && field !== null && field !== undefined) {
                return field;
              }
            }
            return null;
          })(),
          nationality: (() => {
            const nationalityFields = [data.nationality, data.countryOfOrigin, data.nationalityCountry, data.citizenship];
            for (const field of nationalityFields) {
              if (field && field.trim() !== '') {
                return field.trim();
              }
            }
            return '';
          })(),
          country: (() => {
            const countryFields = [data.country, data.countryOfResidence, data.homeCountry, data.residenceCountry];
            for (const field of countryFields) {
              if (field && field.trim() !== '') {
                return field.trim();
              }
            }
            return '';
          })(),
          city: (() => {
            const cityFields = [data.city, data.town, data.location, data.residenceCity, data.homeCity, data.currentCity];
            for (const field of cityFields) {
              if (field && field.trim() !== '') {
                return field.trim();
              }
            }
            return '';
          })(),
          phone: (() => {
            const phoneFields = [data.phone, data.phone_number, data.mobile, data.contact, data.phoneNumber, data.mobileNumber];
            for (const field of phoneFields) {
              if (field && field.trim() !== '') {
                return field.trim();
              }
            }
            return '';
          })(),
          whatsapp: (() => {
            const whatsappFields = [data.whatsapp, data.whatsapp_number, data.whatsApp, data.whatsappNumber, data.whatsappPhone];
            for (const field of whatsappFields) {
              if (field && field.trim() !== '') {
                return field.trim();
              }
            }
            return '';
          })(),
          email: (() => {
            const emailFields = [data.email, data.email_address, data.emailAddress, data.contactEmail];
            for (const field of emailFields) {
              if (field && field.trim() !== '') {
                return field.trim();
              }
            }
            return '';
          })(),
          address: (() => {
            const addressFields = [data.address, data.fullAddress, data.location, data.homeAddress, data.residenceAddress];
            for (const field of addressFields) {
              if (field && field.trim() !== '') {
                return field.trim();
              }
            }
            return '';
          })(),
          brief: (() => {
            const briefFields = [data.brief, data.bio, data.description, data.summary, data.about, data.profileDescription];
            for (const field of briefFields) {
              if (field && field.trim() !== '') {
                return field.trim();
              }
            }
            return '';
          })(),
          // معالجة معرفات المنظمات
          club_id: data.club_id || data.clubId,
          academy_id: data.academy_id || data.academyId,
          trainer_id: data.trainer_id || data.trainerId,
          agent_id: data.agent_id || data.agentId,
          // معالجة الحقول الإضافية المحتملة
          club: data.club,
          academy: data.academy,
          trainer: data.trainer,
          agent: data.agent,
          organization: data.organization,
          organization_id: data.organization_id || data.organizationId,
          parent_id: data.parent_id || data.parentId,
          owner_id: data.owner_id || data.ownerId,
          // معالجة المهارات
          technical_skills: data.technical_skills || {},
          physical_skills: data.physical_skills || {},
          social_skills: data.social_skills || {},
          // معالجة الأهداف
          objectives: data.objectives || {},
          // معالجة الوسائط - استخدام دالة getPlayerAvatarUrl الموحدة
          profile_image_url: getPlayerAvatarUrl(data) || '',
          additional_images: data.additional_images || [],
          videos: data.videos || [],
          documents: data.documents || []
        };

        if (isMounted) {
          setPlayer(processedData);
          setIsLoading(false);
          console.log('✅ [fetchPlayerData] تم تحديث حالة اللاعب بنجاح:', {
            playerName: processedData.full_name,
            playerId: processedData.id,
            targetPlayerId: targetPlayerId,
            isCorrectPlayer: processedData.id === targetPlayerId,
            hasSkills: Object.keys(processedData.technical_skills).length > 0,
            hasImages: !!processedData.profile_image_url || processedData.additional_images.length > 0,
            hasVideos: processedData.videos.length > 0,
            // فحص البيانات الشخصية المعالجة
            processedPersonalData: {
              full_name: processedData.full_name,
              birth_date: processedData.birth_date,
              nationality: processedData.nationality,
              country: processedData.country,
              city: processedData.city,
              phone: processedData.phone,
              whatsapp: processedData.whatsapp,
              email: processedData.email,
              address: processedData.address,
              brief: processedData.brief
            },
            // فحص معرفات المنظمات
            club_id: processedData.club_id,
            academy_id: processedData.academy_id,
            trainer_id: processedData.trainer_id,
            agent_id: processedData.agent_id,
            // فحص الحقول الإضافية
            club: processedData.club,
            academy: processedData.academy,
            trainer: processedData.trainer,
            agent: processedData.agent,
            organization: processedData.organization,
            organization_id: processedData.organization_id,
            parent_id: processedData.parent_id,
            owner_id: processedData.owner_id,
            hasOrganization: !!(processedData.club_id || processedData.academy_id || processedData.trainer_id || processedData.agent_id || processedData.club || processedData.academy || processedData.trainer || processedData.agent || processedData.organization || processedData.organization_id || processedData.parent_id || processedData.owner_id)
          });
        }

      } catch (error) {
        console.error('❌ [fetchPlayerData] خطأ في جلب بيانات اللاعب:', error);
        if (isMounted) {
          const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
          setError(`حدث خطأ أثناء جلب بيانات اللاعب: ${errorMessage}`);
          setIsLoading(false);
        }
      }
    };

    fetchPlayerData();

    return () => {
      isMounted = false;
    };
  }, [user, router, targetPlayerId]);

  // إضافة useEffect منفصل لجلب معلومات المستخدم والمنظمة
  useEffect(() => {
    if (player) {
      console.log('🔄 [useEffect] تم تحديث بيانات اللاعب، جلب المعلومات الإضافية');
      console.log('📋 [useEffect] بيانات اللاعب الجديدة:', {
        name: player.full_name,
        id: player.id,
        targetPlayerId: targetPlayerId,
        isCorrectPlayer: player.id === targetPlayerId,
        source: (player as any).source
      });

      // التحقق من أن البيانات صحيحة
      if (player.id !== targetPlayerId) {
        console.warn('⚠️ [useEffect] تحذير: البيانات المعروضة ليست للاعب المطلوب!', {
          displayedPlayerId: player.id,
          targetPlayerId: targetPlayerId
        });
      }

      // جلب المعلومات الإضافية بشكل متوازي
      Promise.all([
        fetchCurrentUserInfo(),
        fetchPlayerOrganization()
      ]).then(() => {
        console.log('✅ [useEffect] تم جلب جميع المعلومات الإضافية بنجاح');
      }).catch((error) => {
        console.error('❌ [useEffect] خطأ في جلب المعلومات الإضافية:', error);
      });
    }
  }, [player, targetPlayerId]);

  // تم إزالة إشعار SMS (Beon) - نستخدم فقط WhatsApp الآن

  // تم دمج هذه الـ useEffect في الـ useEffect السابق لتجنب التكرار

  // إضافة useEffect لمراقبة حالة التحميل
  useEffect(() => {
    if (isLoading) {
      console.log('⏳ [useEffect] حالة التحميل: جاري تحميل بيانات اللاعب...', {
        targetPlayerId,
        playerIdFromUrl
      });
    } else if (player) {
      console.log('✅ [useEffect] تم تحميل بيانات اللاعب بنجاح', {
        playerName: player.full_name,
        playerId: player.id,
        targetPlayerId,
        isCorrectPlayer: player.id === targetPlayerId
      });

      // التحقق من أن البيانات صحيحة
      if (player.id !== targetPlayerId) {
        console.error('❌ [useEffect] خطأ: البيانات المعروضة ليست للاعب المطلوب!', {
          displayedPlayerId: player.id,
          displayedPlayerName: player.full_name,
          targetPlayerId: targetPlayerId
        });

        // إعادة تحميل البيانات الصحيحة
        console.log('🔄 [useEffect] إعادة تحميل البيانات الصحيحة...');
        setIsLoading(true);
        setError(null);
        setPlayer(null);
      }
    } else if (error) {
      console.log('❌ [useEffect] حدث خطأ في تحميل البيانات:', error);
    }
  }, [isLoading, player, error, targetPlayerId, playerIdFromUrl]);

  // إضافة useEffect للتأكد من تحميل البيانات الصحيحة
  useEffect(() => {
    if (targetPlayerId && !isLoading && !player) {
      console.log('🔄 [useEffect] إعادة تحميل البيانات - لم يتم العثور على اللاعب');
      setIsLoading(true);
      setError(null);
    }
  }, [targetPlayerId, isLoading, player]);

  // useEffect إضافي لمعالجة حالة التوقيت - عندما يتم تحديث currentUserInfo
  useEffect(() => {
    console.log('🔄 useEffect للمستخدم الحالي triggered:', {
      hasCurrentUserInfo: !!currentUserInfo,
      currentUserType: currentUserInfo?.type,
      hasPlayer: !!player,
      playerName: player?.full_name,
      organizationLoading: organizationLoading,
      hasPlayerOrganization: !!playerOrganization
    });

    // إذا تم تحديث currentUserInfo ولدينا لاعب ولم نحدد المنظمة بعد
    if (currentUserInfo && player && !playerOrganization && !organizationLoading) {
      console.log('🔄 إعادة تشغيل fetchPlayerOrganization بعد تحديث currentUserInfo');
      fetchPlayerOrganization();
    }
  }, [currentUserInfo]); // نستمع لتغيير currentUserInfo

  // دالة توليد رابط الملف الشخصي للمنظمة
  const getOrganizationProfileUrl = (organization: any): string => {
    if (!organization || !organization.type || !organization.id) return '';

    switch (organization.type) {
      case 'club':
        return `/dashboard/club/profile?id=${organization.id}`;
      case 'academy':
        return `/dashboard/academy/profile?id=${organization.id}`;
      case 'trainer':
        return `/dashboard/trainer/profile?id=${organization.id}`;
      case 'agent':
        return `/dashboard/agent/profile?id=${organization.id}`;
      case 'نادي':
        return `/dashboard/club/profile?id=${organization.id}`;
      case 'أكاديمية':
        return `/dashboard/academy/profile?id=${organization.id}`;
      case 'مدرب':
        return `/dashboard/trainer/profile?id=${organization.id}`;
      case 'وكيل لاعبين':
        return `/dashboard/agent/profile?id=${organization.id}`;
      default:
        console.warn('نوع منظمة غير معروف:', organization.type);
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header مع معلومات الحساب */}
      <div className="sticky top-0 z-50 border-b border-gray-200 shadow-sm backdrop-blur-md bg-white/95">
        <div className="px-4 py-4 mx-auto max-w-7xl">
          <div className="flex justify-between items-center">
            {/* زر العودة */}
            <button
              onClick={() => router.back()}
              className="flex gap-2 items-center px-4 py-2 text-gray-600 rounded-lg transition-all hover:text-gray-800 hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">العودة</span>
            </button>

            {/* معلومات الحساب المصادق - محسنة للوضوح */}
            {currentUserInfo && (
              <div className="flex gap-3 items-center">
                {/* تسمية توضيحية */}
                <div className="pl-3 text-sm font-medium text-gray-500 border-l border-gray-300">
                  تتصفح بحساب:
                </div>

                <div className="flex gap-3 items-center px-4 py-2 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg border border-emerald-200 shadow-sm">
                  <div className={`p-2 rounded-full ${currentUserInfo.color} text-white shadow-sm`}>
                    {React.createElement(currentUserInfo.icon, { className: "w-5 h-5" })}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-800">
                      {currentUserInfo.name || currentUserInfo.full_name}
                    </div>
                    <div className="text-xs font-medium text-gray-600">
                      {currentUserInfo.type} • نشط
                    </div>
                  </div>

                  {/* أيقونة التحقق */}
                  <div className="flex justify-center items-center w-6 h-6 bg-green-500 rounded-full">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="px-4 py-8 mx-auto max-w-7xl">
        {isLoading ? (
          <div className="flex justify-center items-center min-h-screen">
            <div className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full border-4 border-blue-500 animate-spin border-t-transparent"></div>
              <p className="text-lg text-gray-600">جاري تحميل البيانات...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center min-h-screen">
            <div className="p-8 max-w-md text-center bg-white rounded-lg shadow-md">
              <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full">
                <User className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-red-600">⚠️ خطأ في تحميل البيانات</h2>
              <p className="mb-4 text-sm leading-relaxed text-gray-600">{error}</p>

              {/* تفاصيل إضافية للمطورين */}
              <div className="p-3 mb-4 text-xs text-left bg-gray-50 rounded-lg">
                <div className="font-mono">
                  <div>🔍 Player ID: {targetPlayerId || 'غير محدد'}</div>
                  <div>👤 User ID: {user?.id || 'غير مسجل'}</div>
                  <div>🔗 View Mode: {playerIdFromUrl ? 'عرض لاعب آخر' : 'عرض الملف الشخصي'}</div>
                </div>
              </div>

              <div className="flex space-x-2 space-x-reverse">
                <button
                  onClick={() => {
                    const returnPath = searchParams.get('returnPath');
                    console.log('🔙 زر العودة - returnPath:', returnPath);
                    if (returnPath) {
                      // استعادة المسار مباشرة (يحتوي بالفعل على page في الـ URL)
                      const decodedPath = decodeURIComponent(returnPath);
                      console.log('🔙 العودة إلى:', decodedPath);
                      router.push(decodedPath);
                    } else {
                      console.log('🔙 لا يوجد returnPath، استخدام router.back()');
                      router.back();
                    }
                  }}
                  className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700"
                >
                  🔙 العودة
                </button>
                <button
                  onClick={() => {
                    // إعادة تحميل الصفحة بطريقة آمنة
                    if (typeof window !== 'undefined') {
                      window.location.href = window.location.href;
                    }
                  }}
                  className="flex-1 px-4 py-2 text-white bg-gray-600 rounded-lg transition-colors hover:bg-gray-700"
                >
                  🔄 إعادة تحميل
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* شريط توضيحي لبيانات اللاعب */}
            <div className="p-4 mb-6 text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg">
              <div className="flex gap-3 justify-between items-center">
                <div className="flex gap-3 items-center">
                  <div className="flex justify-center items-center w-8 h-8 rounded-full bg-white/20">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">ملف اللاعب التفصيلي</h2>
                    <p className="text-sm text-blue-100">جميع البيانات التالية خاصة باللاعب المعروض</p>
                  </div>
                </div>

                {/* زر السيرة الذاتية */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const resumeTab = document.querySelector('[data-tab="resume"]') as HTMLElement;
                      if (resumeTab) {
                        resumeTab.click();
                      }
                    }}
                    className="flex gap-2 items-center px-4 py-2 text-blue-600 bg-white rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    السيرة الذاتية
                  </button>
                </div>
              </div>
            </div>

            {/* Header اللاعب - محسن */}
            <div className="overflow-hidden mb-8 bg-white rounded-xl border border-gray-200 shadow-lg">
              <div className="relative h-48 bg-gradient-to-r from-blue-500 to-purple-600">
                <div className="absolute inset-0 bg-black/20"></div>

                {/* تسمية توضيحية لبيانات اللاعب */}
                <div className="absolute top-4 left-4">
                  <div className="px-3 py-1 text-xs font-medium text-gray-700 rounded-full shadow-sm backdrop-blur-sm bg-white/90">
                    📋 بيانات اللاعب
                  </div>
                </div>

                <div className="absolute right-0 bottom-0 left-0 p-6">
                  <div className="flex gap-6 items-end">
                    {/* صورة اللاعب مع لوجو الجهة التابع لها */}
                    <div className="relative">
                      <div className="overflow-hidden w-32 h-32 bg-white rounded-full border-4 border-white shadow-lg">
                        <img
                          src={getValidImageUrl(player?.profile_image_url)}
                          alt={player?.full_name || 'لاعب'}
                          className="object-cover w-full h-full"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.src.includes('/default-player-avatar.png')) {
                              target.src = '/default-player-avatar.png';
                            }
                          }}
                        />
                      </div>

                      {/* لوجو الجهة التابع لها مع تحسينات */}
                      {!organizationLoading && playerOrganization && (
                        <button
                          onClick={() => {
                            const profileUrl = getOrganizationProfileUrl(playerOrganization);
                            if (profileUrl) {
                              router.push(profileUrl);
                            }
                          }}
                          className="absolute -right-2 -bottom-2 w-12 h-12 bg-white rounded-full border-white shadow-lg transition-transform border-3 hover:scale-110 group"
                          title={`انتقل إلى ملف ${playerOrganization.type}: ${playerOrganization.name || playerOrganization.full_name}`}
                        >
                          {playerOrganization.logoUrl ? (
                            <img
                              src={playerOrganization.logoUrl}
                              alt={`لوجو ${playerOrganization.name || playerOrganization.full_name}`}
                              className="object-cover w-full h-full rounded-full group-hover:shadow-md"
                              onError={(e) => {
                                console.log(`❌ فشل تحميل لوجو ${playerOrganization.type}، استخدام الأيقونة الافتراضية`);
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.nextElementSibling) {
                                  (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-full h-full rounded-full ${playerOrganization.color} flex items-center justify-center text-white group-hover:shadow-md ${playerOrganization.logoUrl ? 'hidden' : 'flex'
                              }`}
                          >
                            {React.createElement(playerOrganization.icon, { className: "w-6 h-6" })}
                          </div>

                          {/* نص توضيحي صغير */}
                          <div className="absolute -bottom-1 left-1/2 opacity-0 transition-opacity transform -translate-x-1/2 translate-y-full group-hover:opacity-100">
                            <div className="px-2 py-1 text-xs text-white whitespace-nowrap rounded bg-black/80">
                              انقر للانتقال لـ {playerOrganization.typeArabic}
                            </div>
                          </div>
                        </button>
                      )}

                      {/* شارة اللاعب المستقل - محسنة */}
                      {!organizationLoading && !playerOrganization && (
                        <div
                          className="flex absolute -right-2 -bottom-2 justify-center items-center w-12 h-12 bg-gray-500 rounded-full border-white shadow-lg border-3 group"
                          title="لاعب مستقل - غير تابع لأي جهة"
                        >
                          <User className="w-6 h-6 text-white" />

                          {/* نص توضيحي */}
                          <div className="absolute -bottom-1 left-1/2 opacity-0 transition-opacity transform -translate-x-1/2 translate-y-full group-hover:opacity-100">
                            <div className="px-2 py-1 text-xs text-white whitespace-nowrap rounded bg-black/80">
                              مستقل
                            </div>
                          </div>
                        </div>
                      )}

                      {/* مؤشر التحميل */}
                      {organizationLoading && (
                        <div className="flex absolute -right-2 -bottom-2 justify-center items-center w-12 h-12 bg-blue-500 rounded-full border-white shadow-lg border-3">
                          <div className="w-4 h-4 rounded-full border-2 border-white animate-spin border-t-transparent"></div>
                        </div>
                      )}
                    </div>

                    {/* معلومات اللاعب */}
                    <div className="flex-1 mb-4 text-white">
                      <h1 className="mb-2 text-3xl font-bold">{player?.full_name}</h1>
                      <div className="flex gap-4 items-center text-white/90">
                        <span className="flex gap-1 items-center">
                          <Target className="w-4 h-4" />
                          {player?.primary_position || player?.position || 'غير محدد'}
                        </span>
                        <span className="flex gap-1 items-center">
                          <Calendar className="w-4 h-4" />
                          {(() => {
                            const age = calculateAge(player?.birth_date);
                            return age ? `${age} سنة` : 'العمر غير محدد';
                          })()}
                        </span>
                        <span className="flex gap-1 items-center">
                          <MapPin className="w-4 h-4" />
                          {player?.nationality || player?.country || 'غير محدد'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* معلومات الجهة التابع لها والاتصال - محسنة */}
            <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-2">
              {/* الجهة التابع لها - محسنة للوضوح */}
              <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-md">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="flex gap-2 items-center text-lg font-semibold">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    الجهة التابع لها اللاعب
                  </h3>

                  {/* مؤشر الحالة */}
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${!organizationLoading && playerOrganization
                    ? 'bg-green-100 text-green-800'
                    : !organizationLoading && !playerOrganization
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-yellow-100 text-yellow-800'
                    }`}>
                    {!organizationLoading && playerOrganization
                      ? `✅ تابع ل${playerOrganization.typeArabic}`
                      : !organizationLoading && !playerOrganization
                        ? '🔸 مستقل'
                        : '⏳ جاري التحقق'
                    }
                  </div>
                </div>

                {!organizationLoading && playerOrganization ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                      <div className="flex gap-4 items-center">
                        <div className="relative">
                          {playerOrganization.logoUrl ? (
                            <img
                              src={playerOrganization.logoUrl}
                              alt={`لوجو ${playerOrganization.name || playerOrganization.full_name}`}
                              className="object-cover w-14 h-14 rounded-full border-2 border-white shadow-lg"
                              onError={(e) => {
                                console.log(`❌ فشل تحميل لوجو ${playerOrganization.type} في القسم الرئيسي`);
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.nextElementSibling) {
                                  (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          <div className={`w-14 h-14 p-3 rounded-full ${playerOrganization.color} text-white shadow-lg ${playerOrganization.logoUrl ? 'hidden' : 'flex'
                            } items-center justify-center border-2 border-white`}>
                            {React.createElement(playerOrganization.icon, { className: "w-7 h-7" })}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="text-lg font-bold text-gray-900">
                            {playerOrganization.name || playerOrganization.full_name}
                          </div>
                          <div className="flex gap-2 items-center text-sm font-medium text-gray-700">
                            <span className={`w-2 h-2 rounded-full ${playerOrganization.color.replace('bg-', 'bg-')}`}></span>
                            {playerOrganization.type}
                            {/* إظهار إذا كان هو المستخدم الحالي */}
                            {currentUserInfo && playerOrganization.id === currentUserInfo.id && (
                              <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                                أنت
                              </span>
                            )}
                          </div>
                          {(playerOrganization.city || playerOrganization.country) && (
                            <div className="flex gap-1 items-center mt-1 text-xs text-gray-600">
                              <MapPin className="w-3 h-3" />
                              {playerOrganization.city}
                              {playerOrganization.city && playerOrganization.country && ', '}
                              {playerOrganization.country}
                            </div>
                          )}
                          {/* إظهار علاقة الإضافة */}
                          {(() => {
                            const addedBy = (player as any)?.addedBy || (player as any)?.created_by || (player as any)?.added_by;
                            if (addedBy === user?.id) {
                              return (
                                <div className="flex gap-1 items-center px-2 py-1 mt-1 text-xs text-blue-600 bg-blue-50 rounded">
                                  <Plus className="w-3 h-3" />
                                  أضفت هذا اللاعب
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <button
                          onClick={() => {
                            const profileUrl = getOrganizationProfileUrl(playerOrganization);
                            if (profileUrl) {
                              router.push(profileUrl);
                            }
                          }}
                          disabled={!getOrganizationProfileUrl(playerOrganization)}
                          className="flex gap-2 items-center px-4 py-2 text-blue-600 rounded-lg border border-blue-200 transition-colors hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-300 hover:shadow-sm"
                          title={`انتقل إلى صفحة ${playerOrganization.typeArabic}`}
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span className="text-sm font-medium">عرض {playerOrganization.typeArabic}</span>
                        </button>
                      </div>
                    </div>

                    {/* معلومات إضافية عن الجهة */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                      {playerOrganization.email && (
                        <div className="flex gap-2 items-center p-2 text-sm text-gray-600 bg-gray-50 rounded-lg">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="truncate">{playerOrganization.email}</span>
                        </div>
                      )}
                      {playerOrganization.phone && (
                        <div className="flex gap-2 items-center p-2 text-sm text-gray-600 bg-gray-50 rounded-lg">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span>{playerOrganization.phone}</span>
                        </div>
                      )}
                      {playerOrganization.founded && (
                        <div className="flex gap-2 items-center p-2 text-sm text-gray-600 bg-gray-50 rounded-lg">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>تأسس: {playerOrganization.founded}</span>
                        </div>
                      )}
                      {playerOrganization.type === 'نادي' && playerOrganization.league && (
                        <div className="flex gap-2 items-center p-2 text-sm text-gray-600 bg-gray-50 rounded-lg">
                          <Trophy className="w-4 h-4 text-gray-400" />
                          <span>{playerOrganization.league}</span>
                        </div>
                      )}
                    </div>

                    {/* وصف موجز */}
                    {playerOrganization.description && (
                      <div className="pt-3 border-t border-gray-100">
                        <p className="p-3 text-sm leading-relaxed text-gray-600 bg-gray-50 rounded-lg">
                          {playerOrganization.description.length > 150
                            ? playerOrganization.description.slice(0, 150) + '...'
                            : playerOrganization.description}
                        </p>
                      </div>
                    )}
                  </div>
                ) : organizationLoading ? (
                  <div className="py-8 text-center text-gray-500">
                    <div className="mx-auto mb-3 w-8 h-8 rounded-full border-2 border-blue-500 animate-spin border-t-transparent"></div>
                    <p className="text-sm font-medium">جاري البحث عن المنظمة...</p>
                    <p className="mt-1 text-xs text-gray-400">فحص الارتباط بالأندية والأكاديميات والمدربين...</p>
                    <div className="inline-block px-3 py-2 mt-3 text-xs text-blue-600 bg-blue-50 rounded-lg">
                      🔍 يتم فحص جميع قواعد البيانات
                    </div>
                  </div>
                ) : (
                  (() => {
                    const status = player?.contract_status?.toLowerCase();
                    const isContracted = status === 'contracted' || status === 'loan';

                    if (isContracted) {
                      return (
                        <div className="py-8 text-center">
                          <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-full shadow-sm">
                            <span className="text-3xl">⚽</span>
                          </div>
                          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                            <p className="mb-1 text-lg font-bold text-blue-900">
                              {status === 'loan' ? 'لاعب مُعار' : 'لاعب مرتبط بعقد'}
                            </p>
                            {player?.current_club && (
                              <p className="mb-1 text-base font-semibold text-blue-800">
                                {player.current_club}
                              </p>
                            )}
                            <p className="mb-3 text-xs text-blue-600">
                              مرتبط بنادي حالياً (حسب الملف الشخصي)
                            </p>
                            <div className="inline-block px-4 py-2 mt-2 text-sm font-medium text-blue-700 bg-white border border-blue-200 rounded-lg shadow-sm">
                              يرجى التواصل مع جهة الاتصال الرسمية
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="py-8 text-center">
                        <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full shadow-sm">
                          <span className="text-3xl">🔥</span>
                        </div>
                        <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                          <p className="mb-1 text-sm font-bold text-gray-700">لاعب مستقل</p>
                          <p className="mb-3 text-xs text-gray-500">هذا اللاعب غير مرتبط بأي جهة حالياً</p>
                          <div className="space-y-2 text-xs">
                            <div className="flex gap-2 justify-center items-center text-gray-600">
                              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                              <span>يمكنه الانضمام لنادي أو أكاديمية</span>
                            </div>
                            <div className="flex gap-2 justify-center items-center text-gray-600">
                              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                              <span>يمكنه التعاقد مع وكيل لاعبين</span>
                            </div>
                            <div className="flex gap-2 justify-center items-center text-gray-600">
                              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                              <span>يمكنه العمل مع مدرب شخصي</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Guardianship & Evaluation Cards */}
              <div className="space-y-6">
                {/* Guardianship Card (Minors) */}
                {player?.birth_date && dayjs().diff(dayjs(player.birth_date), 'year') < 18 && (() => {
                  const hasConsent = player?.documents?.some((d: any) => d.type === 'guardian_consent');
                  return (
                    <div className="bg-white rounded-xl shadow-md overflow-hidden">
                      <div className="p-4 border-b border-gray-100">
                        <h3 className="flex gap-2 items-center text-lg font-semibold text-gray-900">
                          <ShieldCheck className={`w-5 h-5 ${hasConsent ? 'text-green-600' : 'text-amber-600'}`} />
                          {hasConsent ? 'الوصاية القانونية' : 'تنبيه الوصاية'}
                        </h3>
                      </div>
                      <div className={`p-4 ${hasConsent ? 'bg-green-50' : 'bg-amber-50'}`}>
                        <div className="flex items-center gap-3">
                          {hasConsent ? <CheckCircle className="w-8 h-8 text-green-600" /> : <AlertTriangle className="w-8 h-8 text-amber-600" />}
                          <div>
                            <div className={`font-bold text-sm ${hasConsent ? 'text-green-800' : 'text-amber-800'}`}>
                              {hasConsent ? 'موافقة ولي الأمر مكتملة' : 'تحت وصاية ولي الأمر'}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {hasConsent ? 'يمكن التفاوض واستكمال الإجراءات' : 'بانتظار موافقة ولي الأمر الرسمية'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Evaluation Card */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="flex gap-2 items-center text-lg font-semibold text-gray-900">
                      <Star className="w-5 h-5 text-purple-600" />
                      تقييم الموهبة
                    </h3>
                  </div>
                  <div className="p-4 bg-purple-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center border border-purple-200">
                        <Star className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-purple-900">
                          {player?.evaluation_status === 'rated' ? 'تم التقييم' : 'تحت التقييم'}
                        </div>
                        <div className="text-xs text-purple-700 mt-1">
                          من اللجنة الفنية للمنصة
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* جهة الاتصال الرسمية */}
              <div className="p-6 bg-white rounded-xl shadow-md">
                <h3 className="flex gap-2 items-center mb-4 text-lg font-semibold">
                  <Phone className="w-5 h-5 text-green-600" />
                  جهة الاتصال الرسمية
                </h3>
                {player?.official_contact && (
                  player.official_contact.name ||
                  player.official_contact.phone ||
                  player.official_contact.email
                ) ? (
                  <div className="space-y-3">
                    <div className="flex gap-3 items-center">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="font-medium">{player.official_contact.name || 'غير محدد'}</div>
                        <div className="text-sm text-gray-600">{player.official_contact.title || 'غير محدد'}</div>
                      </div>
                    </div>
                    {player.official_contact.phone && (
                      <div className="flex gap-3 items-center">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <a
                          href={`tel:${player.official_contact.phone}`}
                          className="text-blue-600 hover:underline"
                        >
                          {player.official_contact.phone}
                        </a>
                      </div>
                    )}
                    {player.official_contact.email && (
                      <div className="flex gap-3 items-center">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <a
                          href={`mailto:${player.official_contact.email}`}
                          className="text-blue-600 hover:underline"
                        >
                          {player.official_contact.email}
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center text-gray-500">
                    <User className="mx-auto mb-3 w-12 h-12 text-gray-300" />
                    <p className="text-sm">لم يتم تحديد جهة اتصال رسمية</p>
                    <p className="text-xs text-gray-400">يمكن للاعب إضافة هذه المعلومات في ملفه الشخصي</p>
                  </div>
                )}
              </div>
            </div>

            {/* التبويبات */}
            <div className="overflow-hidden bg-white rounded-xl shadow-md">
              <div className="border-b border-gray-200">
                <div className="flex overflow-x-auto">
                  {TABS.map((tab, idx) => (
                    <button
                      key={tab.name}
                      data-tab={tab.name === 'السيرة الذاتية' ? 'resume' : `tab-${idx}`}
                      onClick={() => setCurrentTab(idx)}
                      className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${currentTab === idx
                        ? 'border-blue-500 text-blue-600 bg-blue-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      {tab.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {TABS[currentTab]?.render?.() || <div>التبويب غير متوفر</div>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PlayerReportPage;