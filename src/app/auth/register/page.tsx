'use client';

import WhatsAppOTPVerification from '@/components/shared/WhatsAppOTPVerification';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/lib/firebase/auth-provider';
// تم حذف الترجمة
import {
    AlertTriangle,
    CheckCircle,
    Eye,
    EyeOff,
    Home,
    Loader2,
    Lock,
    Mail,
    Shield,
    Star,
    User,
    UserCheck,
    Users
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { BABASERVICE_CONFIG } from '@/lib/whatsapp/babaservice-config';

// Define user role types
type UserRole = 'player' | 'club' | 'academy' | 'agent' | 'trainer' | 'admin';

// استخدام البيانات المشتركة من ملف الدول
import { countries, normalizePhone } from '@/lib/constants/countries';
import { formatPhoneNumber } from '@/lib/whatsapp/babaservice-config';

// دالة للحصول على مسار لوحة التحكم حسب نوع الحساب
const getDashboardRoute = (accountType: string) => {
  switch (accountType) {
    case 'player': return '/dashboard/player';
    case 'club': return '/dashboard/club';
    case 'agent': return '/dashboard/agent';
    case 'academy': return '/dashboard/academy';
    case 'trainer': return '/dashboard/trainer';
    case 'marketer': return '/dashboard/marketer';
    default: return '/dashboard';
  }
};

// دالة للتحقق من صحة تنسيق البريد الإلكتروني فقط
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

// استخدام دالة normalizePhone من الملف المشترك

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, userData } = useAuth();
  const t = (key: string) => key;
  const locale = 'ar';
  const isRTL = true;
  const [isClient, setIsClient] = useState(false);
  const [step, setStep] = useState<number>(1);

  // عبارات تسويقية متغيرة (يسار العنوان)
  const rotatingTips = [
    'ابدأ خلال دقيقة واحدة فقط',
    'سجّل برقم هاتفك بسهولة',
    'أضف بريدك الإلكتروني (اختياري)',
    'ادخل كود الانضمام لربط حسابك',
    'أمان وحماية لبياناتك دائمًا'
  ];
  const [tipIndex, setTipIndex] = useState(0);
  const [isPending, startTransition] = useTransition();

  // التأكد من أننا على العميل
  useEffect(() => {
    setIsClient(true);
  }, []);

  // تدوير العبارات تلقائياً مع إيقافه عند عدم ظهور الصفحة وتقليل التكرار
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (id) return;
      id = setInterval(() => {
        setTipIndex((i) => (i + 1) % rotatingTips.length);
      }, 5000);
    };
    const stop = () => {
      if (id) {
        clearInterval(id);
        id = null;
      }
    };
    const onVisibility = () => {
      if (document.hidden) stop(); else start();
    };
    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, []);

  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    confirmPassword: '',
    accountType: '',
    name: '',
    agreeToTerms: false,
    country: '',
    countryCode: '',
    currency: '',
    currencySymbol: '',
    organizationCode: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | React.ReactNode>('');
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [pendingRegistrationData, setPendingRegistrationData] = useState<any>(null);
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [phoneCheckLoading, setPhoneCheckLoading] = useState(false);
  const [phoneExistsError, setPhoneExistsError] = useState('');
  const [enteredOTP, setEnteredOTP] = useState<string>('');
  const phoneCheckRef = useRef(false);
  const phoneCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const phoneValidationAbortRef = useRef<AbortController | null>(null);
  const [orgCodeChecking, setOrgCodeChecking] = useState(false);
  const [orgCodeError, setOrgCodeError] = useState('');
  const orgCodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [orgPreview, setOrgPreview] = useState<{ name: string; type: string; logoUrl?: string } | null>(null);

  // تحقق من تكرار رقم الهاتف عند الكتابة
  const handlePhoneValidation = async (phoneNumber: string) => {
    if (!formData.countryCode) {
      setPhoneExistsError('يرجى اختيار الدولة أولاً');
      return;
    }
    if (phoneCheckTimeoutRef.current) {
      clearTimeout(phoneCheckTimeoutRef.current);
    }
    setPhoneExistsError('');
    if (!phoneNumber || phoneNumber.length < 6) return;
    phoneCheckTimeoutRef.current = setTimeout(async () => {
      setPhoneCheckLoading(true);
      try {
        // ألغِ أي طلب سابق قيد التنفيذ
        if (phoneValidationAbortRef.current) {
          phoneValidationAbortRef.current.abort();
        }
        const controller = new AbortController();
        phoneValidationAbortRef.current = controller;
        const checkRes = await fetch('/api/auth/check-user-exists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: `${formData.countryCode}${phoneNumber}` }),
          signal: controller.signal,
        });
        const checkData = await checkRes.json();
        if (checkData.phoneExists) {
          setPhoneExistsError('رقم الهاتف مستخدم بالفعل. يمكنك تسجيل الدخول مباشرة.');
        } else {
          setPhoneExistsError('');
        }
      } catch (e) {
        if ((e as any)?.name !== 'AbortError') {
          setPhoneExistsError('تعذر التحقق من رقم الهاتف. حاول لاحقًا.');
        }
      } finally {
        setPhoneCheckLoading(false);
      }
    }, 500);
  };

  const accountTypes = [
    { value: 'player', label: 'لاعب', icon: Star },
    { value: 'club', label: 'نادي', icon: Home },
    { value: 'agent', label: 'وكيل', icon: UserCheck },
    { value: 'academy', label: 'أكاديمية', icon: Users },
    { value: 'trainer', label: 'مدرب', icon: User },
    { value: 'marketer', label: 'مسوق', icon: Users }
  ];

  // عند تحميل الصفحة: تحقق من وجود رقم هاتف معلق في localStorage
  useEffect(() => {
    const storedPendingPhone = localStorage.getItem('pendingPhoneVerification');
    if (storedPendingPhone) {
      setPendingPhone(storedPendingPhone);
      setShowPhoneVerification(true);
    }
  }, []);

  // عدل handleInputChange ليستخدم التحقق
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;

    // إذا كان الحقل هو رقم الهاتف، نتأكد من أنه يحتوي فقط على أرقام
    if (name === 'phone') {
      const numbersOnly = value.replace(/[^0-9]/g, '');
      setFormData(prev => ({
        ...prev,
        [name]: numbersOnly
      }));
      handlePhoneValidation(numbersOnly);
      return;
    }

    // كود الانضمام: اجعل التحقق عند الخروج من الحقل (onBlur) لتقليل الحمل أثناء الكتابة
    if (name === 'organizationCode') {
      const cleaned = value.trim();
      if (orgCodeTimeoutRef.current) clearTimeout(orgCodeTimeoutRef.current);
      setFormData(prev => ({ ...prev, organizationCode: cleaned }));
      // لا تحقق هنا، سيتم على onBlur
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // تحقق كود الانضمام عند الخروج من الحقل
  const validateOrganizationCode = async (code: string) => {
    const cleaned = code.trim();
    if (orgCodeTimeoutRef.current) clearTimeout(orgCodeTimeoutRef.current);
    if (!cleaned) {
      setOrgCodeError('');
      setOrgCodeChecking(false);
      setOrgPreview(null);
      return;
    }
    orgCodeTimeoutRef.current = setTimeout(async () => {
      try {
        setOrgCodeChecking(true);
        setOrgCodeError('');
        const { organizationReferralService } = await import('@/lib/organization/organization-referral-service');
        const { db } = await import('@/lib/firebase/config');
        const { doc, getDoc } = await import('firebase/firestore');
        const referral = await organizationReferralService.findReferralByCode(cleaned.toUpperCase());
        if (!referral) {
          setOrgCodeError('كود الانضمام غير صحيح');
          setOrgPreview(null);
        } else if (referral && (referral as any).isActive === false) {
          setOrgCodeError('كود الانضمام غير مفعل');
          setOrgPreview(null);
        } else if (typeof (referral as any).maxUsage === 'number' && (referral as any).maxUsage >= 0 && (referral as any).currentUsage >= (referral as any).maxUsage) {
          setOrgCodeError('تم الوصول إلى الحد الأقصى لاستخدام هذا الكود');
          setOrgPreview(null);
        } else {
          setOrgCodeError('');
          let collectionName = '';
          switch ((referral as any).organizationType) {
            case 'club': collectionName = 'clubs'; break;
            case 'academy': collectionName = 'academies'; break;
            case 'agent': collectionName = 'agents'; break;
            case 'trainer': collectionName = 'trainers'; break;
            default: collectionName = '';
          }
          let logoUrl: string | undefined = undefined;
          let orgName: string | undefined = (referral as any).organizationName;
          if (collectionName) {
            try {
              const snap = await getDoc(doc(db, collectionName, (referral as any).organizationId));
              const data: any = snap.exists() ? snap.data() : null;
              logoUrl = data?.logo || data?.logoUrl || data?.image || data?.profileImage || data?.photoURL || undefined;
              orgName = data?.name || data?.full_name || data?.displayName || orgName;
            } catch {}
          }
          const type = (referral as any).organizationType;
          setOrgPreview({ name: orgName || 'المنظمة', type, logoUrl });
        }
      } catch (err) {
        setOrgCodeError('تعذر التحقق من كود الانضمام، حاول لاحقًا');
        setOrgPreview(null);
      } finally {
        setOrgCodeChecking(false);
      }
    }, 400);
  };

  // دالة لتحديث الدولة المختارة
  const handleCountryChange = (countryName: string) => {
    const country = countries.find(c => c.name === countryName);
    setSelectedCountry(country);

    setFormData(prev => ({
      ...prev,
      country: countryName,
      countryCode: country?.code || '',
      currency: country?.currency || '',
      currencySymbol: country?.currencySymbol || '',
      phone: '' // مسح رقم الهاتف عند تغيير الدولة
    }));
  };

  const validateForm = () => {
    // التحقق من الاسم
    if (!formData.name.trim()) {
      setError('يرجى إدخال الاسم الكامل');
      return false;
    }

    // التحقق من الدولة
    if (!formData.country) {
      setError('يرجى اختيار الدولة');
      return false;
    }

    // التحقق من رقم الهاتف
    if (!formData.phone.trim()) {
      setError('يرجى إدخال رقم الهاتف');
      return false;
    }

    // التحقق من كلمة المرور - أرقام فقط
    const isNumbersOnly = /^\d+$/.test(formData.password);
    if (!isNumbersOnly) {
      setError('يجب أن تحتوي كلمة المرور على أرقام فقط');
      return false;
    }

    if (formData.password.length < 8) {
      setError('يجب أن تتكون كلمة المرور من 8 أرقام على الأقل');
      return false;
    }

    // منع الأرقام المتسلسلة والمتكررة
    const weakPatterns = [
      /^(\d)\1+$/, // نفس الرقم متكرر (111111)
      /^(0123456789|9876543210)/, // أرقام متسلسلة
      /^12345678$/, /^87654321$/,
      /^123456/, /^654321/,
      /^111111/, /^000000/, /^666666/, /^888888/
    ];

    if (weakPatterns.some(pattern => pattern.test(formData.password))) {
      setError('كلمة المرور ضعيفة جداً. تجنب الأرقام المتسلسلة أو المتكررة (مثال صحيح: 19901234، 05012345)');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return false;
    }

    if (!formData.accountType) {
      setError('يرجى اختيار نوع الحساب');
      return false;
    }

    if (!formData.agreeToTerms) {
      setError('يجب الموافقة على الشروط والأحكام');
      return false;
    }

    if (phoneExistsError) {
      setError(phoneExistsError);
      return false;
    }

    // إذا كان كود الانضمام موجودًا يجب أن يكون صالحًا
    if (formData.organizationCode && orgCodeError) {
      setError(orgCodeError);
      return false;
    }

    return true;
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;

    console.log('🚀 Starting registration process with OTP verification...');
    setLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(`${formData.countryCode}${formData.phone}`);

      // إرسال OTP عبر WhatsApp
      console.log('📱 Sending OTP via WhatsApp...');
      const otpResponse = await fetch('/api/whatsapp/babaservice/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: formattedPhone,
          name: formData.name,
          instance_id: BABASERVICE_CONFIG.INSTANCE_ID,
        }),
      });

      const otpData = await otpResponse.json();
      if (!otpResponse.ok || !otpData.success) {
        throw new Error(otpData.error || 'فشل في إرسال رمز التحقق');
      }

      console.log('✅ OTP sent successfully');

      // حفظ بيانات التسجيل المعلقة
      const pendingData = {
        name: formData.name,
        phone: formattedPhone,
        country: formData.country,
        countryCode: formData.countryCode,
        currency: formData.currency,
        currencySymbol: formData.currencySymbol,
        password: formData.password,
        accountType: formData.accountType,
        organizationCode: formData.organizationCode,
      };

      localStorage.setItem('pendingRegistration', JSON.stringify(pendingData));
      localStorage.setItem('pendingPhoneVerification', formattedPhone);

      setLoading(false);
      setShowPhoneVerification(true);
      setPendingPhone(formattedPhone);

    } catch (error: unknown) {
      console.error('❌ Registration failed:', error);
      if (error instanceof Error) {
        setError(error.message || 'حدث خطأ أثناء التسجيل.');
      } else {
        setError('حدث خطأ غير متوقع أثناء التسجيل.');
      }
      setLoading(false);
    }
  };

  const handlePhoneVerificationClose = () => {
    console.log('🔒 Closing OTP verification modal');
    setShowPhoneVerification(false);
    setPendingPhone(null);
    localStorage.removeItem('pendingPhoneVerification');
    localStorage.removeItem('pendingRegistration');
          setError('تم إلغاء التحقق من الهاتف.');
  };

  // دالة تخطي OTP للعملاء الجدد
  const handleSkipOTP = async () => {
    console.log('⏭️ Skipping OTP verification for new customers');
    setLoading(true);

    try {
      // استرجاع بيانات التسجيل المعلقة
      const pendingDataStr = localStorage.getItem('pendingRegistration');
      if (!pendingDataStr) {
        throw new Error('بيانات التسجيل غير موجودة');
      }

      const pendingData = JSON.parse(pendingDataStr);

      console.log('✅ Skipping OTP, creating account directly...');

      // توليد بريد إلكتروني مؤقت آمن لـ Firebase
      const cleanPhone = (pendingData.phone || '').replace(/[^0-9]/g, '');
      const cleanCountryCode = (pendingData.countryCode || '').replace(/[^0-9]/g, '');
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const firebaseEmail = `user_${cleanCountryCode}_${cleanPhone}_${timestamp}_${randomSuffix}@el7lm.com`;

      const registrationData = {
        full_name: pendingData.name,
        phone: pendingData.phone,
        country: pendingData.country,
        countryCode: pendingData.countryCode,
        currency: pendingData.currency,
        currencySymbol: pendingData.currencySymbol
      };

      // إنشاء الحساب
      const userData = await registerUser(
        firebaseEmail,
        pendingData.password,
        pendingData.accountType as UserRole,
        {
          ...registrationData,
          phone: pendingData.phone,
          originalEmail: pendingData.phone.trim() || null,
          firebaseEmail: firebaseEmail
        }
      );

      console.log('✅ Account created successfully (OTP skipped):', userData);

      // تنظيف البيانات المعلقة
      localStorage.removeItem('pendingRegistration');
      localStorage.removeItem('pendingPhoneVerification');

      // إغلاق نافذة التحقق
      setShowPhoneVerification(false);
      setPendingPhone(null);

      // إعادة التوجيه إلى لوحة التحكم
      const dashboardRoute = getDashboardRoute(pendingData.accountType);
      router.push(dashboardRoute);

    } catch (error: unknown) {
      console.error('❌ Account creation failed:', error);
      if (error instanceof Error) {
        setError(error.message || 'حدث خطأ أثناء إنشاء الحساب.');
      } else {
        setError('حدث خطأ غير متوقع أثناء إنشاء الحساب.');
      }
      setLoading(false);
    }
  };

  const handleOTPVerification = async (otp: string) => {
    console.log('🔐 Verifying OTP:', otp);
    setLoading(true);

    try {
      // استرجاع بيانات التسجيل المعلقة
      const pendingDataStr = localStorage.getItem('pendingRegistration');
      if (!pendingDataStr) {
        throw new Error('بيانات التسجيل غير موجودة');
      }

      const pendingData = JSON.parse(pendingDataStr);
      console.log('📋 Pending data:', { phone: pendingData.phone, otp: otp });

      // التحقق من صحة OTP عبر API
      const verifyResponse = await fetch('/api/whatsapp/babaservice/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: pendingData.phone,
          otp: otp,
          method: 'whatsapp'
        }),
      });

      const verifyData = await verifyResponse.json();
      console.log('🔍 Verify response:', { ok: verifyResponse.ok, success: verifyData.success, data: verifyData });

      if (!verifyResponse.ok || !verifyData.success) {
        console.error('❌ OTP verification failed:', verifyData.error);
        throw new Error(verifyData.error || 'رمز التحقق غير صحيح');
      }

      console.log('✅ OTP verified, creating account...');

      // توليد بريد إلكتروني مؤقت آمن لـ Firebase
      const { generateTypedFirebaseEmail } = await import('@/lib/utils/firebase-email-generator');
      const firebaseEmail = generateTypedFirebaseEmail(
        pendingData.phone,
        pendingData.countryCode,
        pendingData.accountType
      );

      const registrationData = {
        full_name: pendingData.name,
        phone: pendingData.phone,
        country: pendingData.country,
        countryCode: pendingData.countryCode,
        currency: pendingData.currency,
        currencySymbol: pendingData.currencySymbol
      };

      // إنشاء الحساب
      const userData = await registerUser(
        firebaseEmail,
        pendingData.password,
        pendingData.accountType as UserRole,
        {
          ...registrationData,
          phone: pendingData.phone,
          originalEmail: pendingData.phone.trim() || null,
          firebaseEmail: firebaseEmail
        }
      );

      console.log('✅ Account created successfully:', userData);

      // معالجة كود الانضمام إذا تم إدخاله وكان الحساب لاعب
      if (pendingData.organizationCode && pendingData.accountType === 'player') {
        try {
          const { organizationReferralService } = await import('@/lib/organization/organization-referral-service');
          await organizationReferralService.createJoinRequest(
            (userData as any).uid || (userData as any).id,
            userData,
            pendingData.organizationCode.trim()
          );
          console.log('✅ Join request created successfully');
        } catch (joinErr) {
          console.warn('⚠️ Join request failed:', joinErr);
        }
      }

      // تنظيف البيانات المعلقة
      localStorage.removeItem('pendingRegistration');
      localStorage.removeItem('pendingPhoneVerification');
      setShowPhoneVerification(false);
      setPendingPhone(null);

      setMessage('✅ تم إنشاء الحساب بنجاح! سيتم تحويلك للوحة التحكم.');
      setTimeout(() => {
        const dashboardRoute = getDashboardRoute(pendingData.accountType);
        router.replace(dashboardRoute);
      }, 1000);

    } catch (error: unknown) {
      console.error('❌ OTP verification failed:', error);
      if (error instanceof Error) {
        console.error('❌ Error details:', error.message);
        setError(error.message || 'فشل في التحقق من رمز التحقق.');
      } else {
        console.error('❌ Unknown error:', error);
        setError('حدث خطأ غير متوقع أثناء التحقق من رمز التحقق.');
      }
      // إعادة رمي الخطأ لضمان أن WhatsAppOTPVerification يتعامل معه
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${isClient && isRTL ? 'dir-rtl' : 'dir-ltr'} min-h-screen w-full flex items-center justify-center bg-purple-950 px-4 py-8`}>
      {/* Centered compact card */}
      <div className="w-full max-w-md rounded-2xl border border-purple-100 shadow-2xl backdrop-blur bg-white/95">
        <div className="px-6 pt-6 pb-3">
          <div className="flex justify-between items-center mb-8">
            <div className="flex gap-2 items-center text-purple-600">
              <Shield className="w-6 h-6" />
              <span className="text-base font-bold">El7lm</span>
            </div>
            <button type="button" onClick={() => router.push('/auth/login')} className="text-xs text-gray-600 hover:text-indigo-600">لديك حساب؟ تسجيل الدخول</button>
          </div>
          <div className="mb-2 text-center">
            <h1 className="text-xl font-extrabold text-gray-900">إنشاء حساب جديد</h1>
            <p className="mt-1 text-xs text-gray-500">انضم إلى منصة El7lm وابدأ رحلتك</p>
            <div className="mt-1 min-h-[1rem]" aria-live="polite">
              <span key={tipIndex} className="inline-block text-[11px] text-purple-600 transition-opacity duration-500 ease-in-out">{rotatingTips[tipIndex]}</span>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="px-6 pb-3">
            <div className="flex items-center justify-center gap-1.5">
              {[1,2,3,4].map(i => (
                <span
                  key={i}
                  className={`inline-block w-6 h-1.5 rounded-full transition-all ${i <= step ? 'bg-purple-600' : 'bg-gray-200'}`}
                />
              ))}
            </div>
          </div>

          <form
            autoComplete="off"
            onSubmit={(e) => {
              if (step < 4) {
                e.preventDefault();
                startTransition(() => setStep(step + 1));
                return;
              }
              handleRegister(e as any);
            }}
            className="px-6 pb-6 space-y-4"
          >
            <div className="space-y-4">
            {/* Error and Success Messages */}
            {error && (
                <div className="flex gap-2 items-start p-4 text-red-700 bg-red-50 rounded-lg" role="alert" aria-live="assertive">
                <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  {typeof error === 'string' ? <p>{error}</p> : error}
                </div>
              </div>
            )}
            {message && (
              <div className="flex gap-2 items-center p-4 text-green-700 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5" />
                <p>{message}</p>
              </div>
            )}
            {/* Step 1 - Account Type */}
            {step === 1 && (
              <div className="space-y-3">
                <label className="block text-xs text-gray-600">اختر نوع الحساب</label>
                <div className="grid grid-cols-4 gap-2">
                  {accountTypes.slice(0,4).map(({ value, label, icon: Icon }) => (
                <label
                  key={value}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-lg cursor-pointer border transition-all text-center ${
                    formData.accountType === value
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-indigo-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="accountType"
                    value={value}
                    checked={formData.accountType === value}
                    onChange={handleInputChange}
                    className="hidden"
                  />
                      <Icon className={`h-4 w-4 ${formData.accountType === value ? 'text-indigo-600' : 'text-gray-400'}`} />
                      <span className={`text-[11px] font-medium ${formData.accountType === value ? 'text-indigo-700' : 'text-gray-600'}`}>{label}</span>
                </label>
              ))}
            </div>
                <div className="grid grid-cols-2 gap-2">
                  {accountTypes.slice(4).map(({ value, label, icon: Icon }) => (
                    <label
                      key={value}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-lg cursor-pointer border transition-all text-center ${
                        formData.accountType === value
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-indigo-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="accountType"
                        value={value}
                        checked={formData.accountType === value}
                        onChange={handleInputChange}
                        className="hidden"
                      />
                      <Icon className={`h-4 w-4 ${formData.accountType === value ? 'text-indigo-600' : 'text-gray-400'}`} />
                      <span className={`text-[11px] font-medium ${formData.accountType === value ? 'text-indigo-700' : 'text-gray-600'}`}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2 - Personal + Phone */}
            {step === 2 && (
              <div className="space-y-3">
              <div>
                  <label className="block mb-1.5 text-gray-700 text-sm">الاسم الكامل</label>
                <div className="relative">
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                      className="py-2 pr-10 pl-4 w-full text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="أدخل اسمك الكامل"
                    required
                    maxLength={50}
                  />
                  <User className="absolute right-3 top-1/2 w-5 h-5 text-gray-400 -translate-y-1/2" />
                </div>
              </div>
              <div>
                  <label htmlFor="country" className="block mb-1.5 text-gray-700 text-sm">البلد</label>
                  <select
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="py-2 pr-10 pl-4 w-full text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                    title="اختيار البلد"
                    aria-label="البلد"
                  >
                    <option value="">اختر البلد</option>
                    {countries.map((country) => (
                      <option key={country.code} value={country.name}>
                        {country.name} ({country.code}) - {country.phoneLength} أرقام
                      </option>
                    ))}
                  </select>
                </div>
              <div>
                  <label className="block mb-1.5 text-gray-700 text-sm">رقم الهاتف</label>
                <div className="relative">
                  <div className="flex">
                      <div className="flex items-center px-2 text-xs bg-gray-50 rounded-l-lg border border-r-0 border-gray-300">
                      {formData.countryCode || '+966'}
                    </div>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                        className={`w-full py-2 pl-10 pr-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent border-gray-300 text-sm ${phoneExistsError ? 'border-red-300 focus:ring-red-500' : phoneCheckLoading ? 'border-purple-300 focus:ring-purple-500' : 'border-gray-300 focus:ring-purple-500'}`}
                        placeholder={selectedCountry ? `${selectedCountry.phoneLength} أرقام` : 'أدخل رقم الهاتف'}
                      required
                      maxLength={selectedCountry?.phoneLength || 10}
                        aria-label="رقم الهاتف"
                        title="رقم الهاتف"
                      />
                      {phoneExistsError && (
                        <p className="mt-1 text-xs text-red-600" role="alert" aria-live="polite">{phoneExistsError}</p>
                    )}
                  </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 - Optional contact */}
            {step === 3 && (
              <div className="space-y-3">
                <div>
                  <label className="block mb-1.5 text-gray-700 text-sm">البريد الإلكتروني (اختياري)</label>
                  <div className="relative">
                    <input
                      type="email"
                      name="email"
                      value={(formData as any).email || ''}
                      onChange={handleInputChange}
                      className="py-2 pr-10 pl-4 w-full text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="example@mail.com"
                    />
                    <Mail className="absolute right-3 top-1/2 w-5 h-5 text-gray-400 -translate-y-1/2" />
                  </div>
                </div>
                <div>
                  <label className="block mb-1.5 text-gray-700 text-sm">كود الانضمام (اختياري)</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="organizationCode"
                      value={formData.organizationCode}
                      onChange={handleInputChange}
                      onBlur={(e) => validateOrganizationCode(e.target.value)}
                      className={`py-2 pr-10 pl-4 w-full text-sm rounded-lg border focus:ring-2 focus:border-transparent ${orgCodeError ? 'border-red-300 focus:ring-red-500' : orgCodeChecking ? 'border-purple-300 focus:ring-purple-500' : 'border-gray-300 focus:ring-indigo-500'}`}
                      placeholder="أدخل كود الانضمام إذا كان لديك"
                      aria-label="كود الانضمام"
                      title="كود الانضمام"
                    />
                    <Users className="absolute right-3 top-1/2 w-5 h-5 text-gray-400 -translate-y-1/2" />
                    {orgCodeChecking && (
                      <div className="absolute left-3 top-1/2 text-purple-500 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    )}
                    {orgCodeError && (
                      <p className="mt-1 text-xs text-red-600" role="alert" aria-live="polite">{orgCodeError}</p>
                    )}
                    {orgPreview && !orgCodeError && (
                      <div className="flex gap-2 items-center p-2 mt-2 bg-gray-50 rounded-lg border">
                        {orgPreview.logoUrl ? (
                          <Image src={orgPreview.logoUrl} alt={orgPreview.name} width={28} height={28} className="rounded" />
                        ) : (
                          <Users className="w-5 h-5 text-gray-400" />
                        )}
                        <div className="text-sm">
                          <div className="font-semibold text-gray-800">{orgPreview.name}</div>
                          <div className="text-xs text-gray-500">نوع المنظمة: {orgPreview.type}</div>
                </div>
              </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4 - Password + terms */}
            {step === 4 && (
              <div className="space-y-3">
              <div>
                  <label className="block mb-1.5 text-gray-700 text-sm">كلمة المرور</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                      className="py-2 pr-10 pl-10 w-full text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="8 أحرف على الأقل"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <Lock className="absolute right-3 top-1/2 w-5 h-5 text-gray-400 -translate-y-1/2" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 text-gray-400 -translate-y-1/2 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                  <label className="block mb-1.5 text-gray-700 text-sm">تأكيد كلمة المرور</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                      className="py-2 pr-10 pl-10 w-full text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="أعد إدخال كلمة المرور"
                    required
                    autoComplete="new-password"
                  />
                  <Lock className="absolute right-3 top-1/2 w-5 h-5 text-gray-400 -translate-y-1/2" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 text-gray-400 -translate-y-1/2 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            <div className="flex gap-2 items-center">
                  <input type="checkbox" name="agreeToTerms" checked={formData.agreeToTerms} onChange={handleInputChange} className="w-4 h-4 text-indigo-600 rounded" title="الموافقة على الشروط" aria-label="الموافقة على الشروط" />
                  <span className="text-sm text-gray-600">أوافق على <button type="button" className="ml-1 text-indigo-600 hover:underline" onClick={() => setShowTerms(true)}>الشروط والأحكام</button></span>
                </div>
              </div>
            )}
            </div>

            {/* Terms and Submit */}
            <div className="flex gap-2 justify-between items-center pt-1">
              {step > 1 ? (
                <button type="button" onClick={() => setStep(step - 1)} className="px-3 py-2 text-xs text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50">السابق</button>
              ) : <span />}
            <button
              type="submit"
                disabled={loading || phoneCheckLoading || (!!phoneExistsError && step === 2) || (formData.organizationCode ? (orgCodeChecking || !!orgCodeError) : false)}
                className={`px-4 py-2 rounded-lg text-white text-sm font-semibold transition-all ${loading ? 'bg-gray-400' : 'bg-purple-600 hover:bg-purple-700'}`}
              >
                {loading ? 'جاري المعالجة...' : step < 4 ? 'التالي' : 'تسجيل'}
                </button>
              </div>
          </form>
              </div>
            </div>
      {/* Marketing panel (right) */}
      <div className="hidden justify-center items-center p-6 h-full bg-purple-900 rounded-2xl md:col-span-6 md:flex">
        <div className="w-full text-center text-white">
          <div className="inline-flex items-center px-3 py-1 mb-6 text-sm text-white rounded-full bg-white/20">تقييم المستخدمين 4.6★</div>
          <div className="p-6 rounded-2xl backdrop-blur-sm bg-white/10">
            <blockquote className="text-lg leading-relaxed">"أكثر ما نحبه في المنصة أنك تبدأ بسرعة دون الحاجة لتعلّم الكثير. كل ما تحتاجه متاح بخطوات بسيطة."</blockquote>
            <div className="mt-4 text-sm text-white/80">— مستخدم من مجتمع El7lm</div>
        </div>
          <div className="mt-8 text-white/80">انضم لآلاف المستخدمين الذين يثقون بالمنصة في رحلتهم.</div>
        </div>
      </div>
        {/* Terms and Conditions Dialog */}
        <AlertDialog open={showTerms} onOpenChange={setShowTerms}>
      <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
          <AlertDialogTitle>الشروط والأحكام</AlertDialogTitle>
            </AlertDialogHeader>
        <div className="text-sm text-gray-700 max-h-[60vh] overflow-y-auto space-y-2">
          <p>باستخدامك المنصة فأنت توافق على الالتزام بالقواعد والسياسات العامة، بما في ذلك سياسة الخصوصية وحماية البيانات.</p>
          <p>يجب أن تكون المعلومات المدخلة صحيحة، ويحق للمنصة إيقاف أو تعليق الحساب عند إساءة الاستخدام أو مخالفة القوانين.</p>
          <p>قد نقوم بإرسال إشعارات تتعلق بالأمان أو التحقق من الحساب. يمكنك التواصل معنا لأي استفسار.</p>
                </div>
        <div className="flex justify-end mt-4">
          <button type="button" onClick={() => setShowTerms(false)} className="px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700">حسنًا</button>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* WhatsApp OTP Verification Modal */}
        <WhatsAppOTPVerification
          phoneNumber={pendingPhone || ''}
          name={formData.name}
          isOpen={showPhoneVerification}
          onVerificationSuccess={(phoneNumber) => {
            console.log('✅ OTP verification successful for:', phoneNumber);
            // سيتم التعامل مع هذا في handleOTPVerification
          }}
          onVerificationFailed={(error) => {
            console.error('❌ OTP verification failed:', error);
            setError(error);
          }}
          onClose={handlePhoneVerificationClose}
          onOTPVerify={handleOTPVerification}
          title="التحقق من رقم الهاتف"
          subtitle="تم إرسال رمز التحقق عبر WhatsApp"
          otpExpirySeconds={300} // 5 دقائق
          maxAttempts={3}
          language="ar"
          t={t}
        />
    </div>
  );
}
