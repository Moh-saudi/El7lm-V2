'use client';

import { useAuth } from '@/lib/firebase/auth-provider';
import { supabase } from '@/lib/supabase/config';
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  Star,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { toast, Toaster } from 'sonner';
import WhatsAppOTPVerification from '@/components/shared/WhatsAppOTPVerification';
import { getBrandingData, BrandingData } from '@/lib/content/branding-service';
import Image from 'next/image';
import { validatePhoneForCountry } from '@/lib/validation/phone-validation';


type LoginMethod = 'phone' | 'email';

const countries = [
  { name: 'السعودية', code: '+966' },
  { name: 'الإمارات', code: '+971' },
  { name: 'الكويت', code: '+965' },
  { name: 'قطر', code: '+974' },
  { name: 'البحرين', code: '+973' },
  { name: 'عمان', code: '+968' },
  { name: 'مصر', code: '+20' },
  { name: 'الأردن', code: '+962' },
  { name: 'لبنان', code: '+961' },
  { name: 'العراق', code: '+964' },
  { name: 'سوريا', code: '+963' },
  { name: 'المغرب', code: '+212' },
  { name: 'الجزائر', code: '+213' },
  { name: 'تونس', code: '+216' },
  { name: 'ليبيا', code: '+218' },
  { name: 'السودان', code: '+249' },
  { name: 'السنغال', code: '+221' },
  { name: 'ساحل العاج', code: '+225' },
  { name: 'جيبوتي', code: '+253' },
  { name: 'إسبانيا', code: '+34' },
  { name: 'فرنسا', code: '+33' },
  { name: 'إنجلترا', code: '+44' },
  { name: 'البرتغال', code: '+351' },
  { name: 'إيطاليا', code: '+39' },
  { name: 'اليونان', code: '+30' },
  { name: 'قبرص', code: '+357' },
  { name: 'تركيا', code: '+90' },
  { name: 'تايلاند', code: '+66' },
  { name: 'اليمن', code: '+967' },
];

const testimonials = [
  {
    quote: "منصة الحلم غيرت مسيرتي الكروية. وجدت فرصة احتراف حقيقية في نادٍ لم أكن لأصل إليه لولاهم.",
    author: "أحمد علي",
    role: "لاعب كرة قدم"
  },
  {
    quote: "كوكلاء لاعبين، نبحث دائماً عن المواهب الواعدة. الحلم هي أداتنا الأولى لاكتشاف النجوم القادمين.",
    author: "شركة برو إيجنت",
    role: "وكيل لاعبين معتمد"
  },
  {
    quote: "عملية استقطاب اللاعبين أصبحت أسهل بكثير. قاعدة البيانات الضخمة والتقييمات الدقيقة توفر علينا الكثير من الوقت والجهد.",
    author: "نادي النجوم السعودي",
    role: "إدارة نادي رياضي"
  },
  {
    quote: "أقوم بتدريب لاعبين صغار، ومنصة الحلم هي النافذة التي يرون بها مستقبلهم الاحترافي. إنها تلهمهم كل يوم.",
    author: "كابتن محمود السيد",
    role: "مدرب فئات سنية"
  }
];

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, logout, signInWithGoogle, user, userData, loading: authLoading } = useAuth();

  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('phone');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getBrandingData().then(setBranding).catch(console.error);
    // Save promo from URL to localStorage so it survives login redirect
    const promoFromUrl = searchParams.get('promo');
    if (promoFromUrl && typeof window !== 'undefined') {
      localStorage.setItem('pendingPromoCode', promoFromUrl);
    }
  }, []);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+20');
  const [password, setPassword] = useState('');
  const [phoneFormatError, setPhoneFormatError] = useState<string | null>(null);
  const [isLoginAttempt, setIsLoginAttempt] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpPhone, setOtpPhone] = useState('');
  const [useOTP, setUseOTP] = useState(true);
  const [phoneStatus, setPhoneStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const phoneCheckTimer = useRef<NodeJS.Timeout | null>(null);

  const handleWhatsAppOTPSuccess = async (_phoneNumber: string) => {
    // التحقق والدخول تم في handleVerifyOTP
  };

  const showWelcomeToast = (name: string, isNew: boolean) => {
    const firstName = (name || '').split(' ')[0] || '';
    const greeting = firstName ? `مرحباً ${firstName}` : 'أهلاً بك';
    const message = isNew
      ? 'حسابك جاهز — انطلق وابدأ رحلتك الآن ✨'
      : 'سعداء بعودتك — كل شيء بانتظارك 👋';

    toast.custom(() => (
      <div
        className="flex items-start gap-3 bg-white rounded-2xl shadow-lg border border-slate-100 px-5 py-4 min-w-[260px] max-w-[320px] font-cairo"
        dir="rtl"
      >
        <div className="text-2xl mt-0.5 select-none">🌟</div>
        <div>
          <p className="text-sm font-bold text-slate-900 leading-snug">{greeting}!</p>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{message}</p>
        </div>
      </div>
    ), { duration: 2500, position: 'top-center' });
  };

  const handleVerifyOTP = async (otp: string) => {
    try {
      toast.loading('جاري التحقق وتسجيل الدخول...', { id: 'otp-login' });

      const res = await fetch('/api/auth/otp-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: otpPhone, otp }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.dismiss('otp-login');
        throw new Error(data.error || 'فشل التحقق');
      }

      // حفظ Firebase UID في sessionStorage كـ fallback للـ fetchUserData
      if (data.uid) {
        sessionStorage.setItem('otp_firebase_uid', data.uid);
        sessionStorage.setItem('otp_account_type', data.accountType || 'player');
      }

      // تسجيل الدخول باستخدام كلمة المرور المؤقتة
      if (data.authEmail && data.authPassword) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: data.authEmail,
          password: data.authPassword,
        });
        if (signInError) {
          console.error('signInWithPassword error:', signInError);
          throw new Error('فشل تسجيل الدخول: ' + signInError.message);
        }
      }

      toast.dismiss('otp-login');
      showWelcomeToast(data.userName || '', false);

      const dashboardRoute = getDashboardRoute(data.accountType);
      setTimeout(() => { window.location.href = dashboardRoute; }, 2200);

    } catch (error: any) {
      console.error('OTP login error:', error);
      throw error;
    }
  };


  // Auto-detect country from IP on page load
  useEffect(() => {
    const detectCountry = async () => {
      try {
        console.log('🌍 Detecting country from IP...');
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();

        console.log('📍 IP Location:', data.country_name, data.country_code);

        // Map ISO country code to phone code
        const countryMap: Record<string, string> = {
          'SA': '+966', 'AE': '+971', 'KW': '+965', 'QA': '+974',
          'BH': '+973', 'OM': '+968', 'EG': '+20', 'JO': '+962',
          'LB': '+961', 'IQ': '+964', 'SY': '+963', 'MA': '+212',
          'DZ': '+213', 'TN': '+216', 'LY': '+218', 'SD': '+249',
          'SN': '+221', 'CI': '+225', 'DJ': '+253', 'ES': '+34',
          'FR': '+33', 'GB': '+44', 'PT': '+351', 'IT': '+39',
          'GR': '+30', 'CY': '+357', 'TR': '+90', 'TH': '+66', 'YE': '+967'
        };

        const detectedCode = countryMap[data.country_code];
        if (detectedCode) {
          setCountryCode(detectedCode);
          console.log(`✅ Country auto-detected: ${data.country_name} (${detectedCode})`);
          toast.success(`🌍 تم اكتشاف بلدك: ${data.country_name}`, { duration: 3000 });
        } else {
          console.log('⚠️ Country not supported, using default');
        }
      } catch (error) {
        console.error('❌ Failed to detect country:', error);
        // Keep default (+20)
      }
    };

    detectCountry();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTestimonialIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Debounced phone validation against the database + format validation
  useEffect(() => {
    if (loginMethod !== 'phone') return;
    const cleanPhone = phone.trim().replace(/^0+/, '').replace(/\s+/g, '');
    if (cleanPhone.length < 7) {
      setPhoneStatus('idle');
      setPhoneFormatError(null);
      return;
    }

    // 🛡️ Validate phone number format matches the selected country code
    const formatError = validatePhoneForCountry(cleanPhone, countryCode);
    setPhoneFormatError(formatError);
    if (formatError) {
      setPhoneStatus('idle');
      return;
    }

    setPhoneStatus('checking');
    if (phoneCheckTimer.current) clearTimeout(phoneCheckTimer.current);
    phoneCheckTimer.current = setTimeout(async () => {
      try {
        const fullPhone = `${countryCode.trim()}${cleanPhone}`;
        const res = await fetch('/api/auth/check-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: fullPhone }),
        });
        const data = await res.json();
        setPhoneStatus(data.exists ? 'valid' : 'invalid');
      } catch {
        setPhoneStatus('idle');
      }
    }, 800);
    return () => { if (phoneCheckTimer.current) clearTimeout(phoneCheckTimer.current); };
  }, [phone, countryCode, loginMethod]);

  useEffect(() => {
    const savedRememberMe = localStorage.getItem('rememberMe');
    const savedPhone = localStorage.getItem('userPhone');
    const savedEmail = localStorage.getItem('userEmail');
    const resetPasswordPhone = localStorage.getItem('resetPasswordPhone');

    if (resetPasswordPhone) {
      const codeMatch = resetPasswordPhone.match(/^(\+\d+)/);
      if (codeMatch) {
        const code = codeMatch[1];
        const phoneNumber = resetPasswordPhone.replace(code, '');
        setCountryCode(code);
        setPhone(phoneNumber);
      } else {
        setPhone(resetPasswordPhone);
      }
      setLoginMethod('phone');
      toast.success('✅ تم تحديث كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول');
      localStorage.removeItem('resetPasswordPhone');
    } else if (savedRememberMe === 'true') {
      setRememberMe(true);
      if (savedPhone) {
        setPhone(savedPhone);
        setLoginMethod('phone');
      } else if (savedEmail) {
        setEmail(savedEmail);
        setLoginMethod('email');
      }
    }
  }, []);

  // Generate email from phone (same logic as registration)
  const generateEmailFromPhone = (fullPhone: string): string => {
    // Remove + and spaces: +201014477580 → 201014477580@el7lm.com
    const cleanPhone = fullPhone.replace(/[\s+]/g, '');
    const email = `${cleanPhone}@el7lm.com`;
    console.log(`📧 [Login] Generated email: ${email} from phone: ${fullPhone}`);
    return email;
  };

  const getDashboardRoute = (accountType: string | undefined) => {
    if (!accountType) return '/auth/login';

    // Redirect new users with unknown role to selection page
    if (accountType === 'unknown') return '/auth/select-role';

    const routes: Record<string, string> = {
      player: '/dashboard/player',
      club: '/dashboard/club',
      agent: '/dashboard/agent',
      academy: '/dashboard/academy',
      trainer: '/dashboard/trainer',
      admin: '/dashboard/admin',
      marketer: '/dashboard/marketer',
      parent: '/dashboard/player',
    };
    const base = routes[accountType] || '/auth/login';

    // If there's a pending promo code, redirect to bulk-payment with it
    const pendingPromo = typeof window !== 'undefined' ? localStorage.getItem('pendingPromoCode') : null;
    if (pendingPromo && ['player', 'club', 'agent', 'academy', 'trainer', 'marketer', 'parent'].includes(accountType)) {
      return `${base}/bulk-payment?promo=${encodeURIComponent(pendingPromo)}`;
    }

    return base;
  };

  // تسجيل الدخول بواسطة Google
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      toast.loading('جاري تسجيل الدخول بواسطة Google...', { id: 'google-signin' });

      const result = await signInWithGoogle('player');

      toast.dismiss('google-signin');
      showWelcomeToast(result.userData.full_name || result.userData.name || '', result.isNewUser);

      const dashboardRoute = getDashboardRoute(result.userData.accountType);
      setTimeout(() => { window.location.href = dashboardRoute; }, 2200);

    } catch (err: unknown) {
      console.error('Google Sign-In failed:', err);

      let errorMessage = 'فشل تسجيل الدخول بواسطة Google';
      if (err instanceof Error) {
        errorMessage = err.message;
      }

      toast.error(errorMessage, { id: 'google-signin' });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setIsLoginAttempt(true);
    let loginEmail: string = '';

    try {
      if (loginMethod === 'email') {
        if (!email.trim()) {
          toast.error('📧 يرجى إدخال البريد الإلكتروني');
          setLoading(false);
          return;
        }
        loginEmail = email.trim();
      } else {
        if (!phone.trim()) {
          toast.error('📱 يرجى إدخال رقم الهاتف');
          setLoading(false);
          return;
        }

        // 🛡️ Security: Validate phone format matches country code BEFORE any action
        const preCleanPhone = phone.trim().replace(/^0+/, '').replace(/\s+/g, '');
        const preFormatError = validatePhoneForCountry(preCleanPhone, countryCode);
        if (preFormatError) {
          toast.error(`⚠️ ${preFormatError}`);
          setLoading(false);
          return;
        }
      }

      const cleanPhone = phone.trim().replace(/^0+/, '').replace(/\s+/g, '');
      const fullPhone = `${countryCode.trim()}${cleanPhone}`;

      // --- OTP Login Flow via WhatsApp (ChatAman) ---
      if (useOTP && loginMethod === 'phone') {
        // Validate phone exists before wasting a WhatsApp message
        if (phoneStatus === 'checking') {
          toast.error('جاري التحقق من الرقم، يرجى الانتظار لحظة...');
          setLoading(false);
          return;
        }
        if (phoneStatus === 'invalid') {
          toast.error('رقم الهاتف غير مسجل. يرجى إنشاء حساب أولاً');
          setLoading(false);
          return;
        }
        try {
          toast.loading('جاري إرسال رمز التحقق عبر WhatsApp...', { id: 'login' });

          const res = await fetch('/api/otp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phoneNumber: fullPhone,
              purpose: 'login',
              channel: 'whatsapp',
            }),
          });

          const data = await res.json();

          if (!res.ok || !data.success) {
            throw new Error(data.error || 'فشل إرسال رمز التحقق');
          }

          setOtpPhone(fullPhone);
          setShowOTPModal(true);
          toast.success('تم إرسال الرمز عبر WhatsApp ✅', { id: 'login' });
          setLoading(false);
          return;
        } catch (error: any) {
          console.error('Send OTP Error:', error);
          toast.error(error.message || '❌ فشل إرسال رمز التحقق', { id: 'login' });
          setLoading(false);
          return;
        }
      }
      // -----------------------------------------------

      toast.loading('جاري التحقق...', { id: 'login' });
      const firebaseEmail = generateEmailFromPhone(fullPhone);

      // Optional: Check if phone exists (but don't wait for email)
      console.log(`📧 [Login] Using email: ${firebaseEmail}`);

      // Try to login with generated email
      const legacyCheck = false; // Skip database check for speed
      if (legacyCheck) {
        // رسالة خطأ محسنة مع زر للتسجيل
        toast.custom((t: any) => (
          <div className={`bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-4 shadow-lg max-w-md w-full mx-auto transition-all ${t.visible ? 'animate-in slide-in-from-top-5' : 'animate-out slide-out-to-top-5'}`} dir="rtl">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 text-2xl">👤</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-red-800 dark:text-red-200 text-base sm:text-lg mb-1">
                  رقم الهاتف غير مسجل 📱
                </h3>
                <p className="text-red-600 dark:text-red-300 text-sm sm:text-base mb-3">
                  💡 يرجى إنشاء حساب جديد للبدء
                </p>
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    router.push('/auth/register');
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm sm:text-base font-medium transition-colors duration-200 shadow-sm"
                >
                  إنشاء حساب جديد
                </button>
              </div>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors p-2 -m-2 min-w-[32px] min-h-[32px] flex items-center justify-center"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>
          </div>
        ), { id: 'login', duration: 8000 });
        setLoading(false);
        return;
      }
      loginEmail = firebaseEmail;

      if (!password && !useOTP) {
        toast.error('🔒 يرجى إدخال كلمة المرور');
        setLoading(false);
        return;
      }

      // Safety check
      if (useOTP && loginMethod === 'phone') {
        // Should have returned earlier, but just in case
        setLoading(false);
        return;
      }

      toast.loading('جاري تسجيل الدخول...', { id: 'login' });

      // Ensure we have a valid email and password
      if (!loginEmail || (!password && !useOTP)) {
        toast.error('بيانات الدخول غير مكتملة', { id: 'login' });
        setLoading(false);
        return;
      }

      console.log(`[Login Attempt] Method: ${loginMethod}, Email: ${loginEmail}, Password Length: ${password.length}`);

      const result = await login(loginEmail, password);

      // Email verification check bypassed for smoother entry during refined auth phase
      // ----------------------------------

      if (!result.userData.accountType) {
        toast.error('نوع الحساب غير صالح', { id: 'login' });
        setLoading(false);
        return;
      }

      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        if (loginMethod === 'email') {
          localStorage.setItem('userEmail', email);
        } else {
          localStorage.setItem('userPhone', phone);
        }
      } else {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userPhone');
      }

      toast.dismiss('login');
      showWelcomeToast(result.userData.full_name || result.userData.name || '', false);

      const dashboardRoute = getDashboardRoute(result.userData.accountType);
      setTimeout(() => { window.location.href = dashboardRoute; }, 2200);

    } catch (err: unknown) {
      console.error('Login failed:', err);
      let errorMessage = 'حدث خطأ أثناء تسجيل الدخول';
      let errorIcon = '❌';

      if (err && typeof err === 'object' && 'code' in err) {
        const error = err as { code: string; message?: string };

        if (error.code === 'auth/user-not-found') {
          errorIcon = loginMethod === 'email' ? '📧' : '📱';
          errorMessage = loginMethod === 'email' ? 'البريد الإلكتروني غير مسجل' : 'رقم الهاتف غير مسجل';

          // رسالة خطأ محسنة مع زر للتسجيل
          toast.custom((t: any) => (
            <div className={`bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-4 shadow-lg max-w-md w-full mx-auto transition-all ${t.visible ? 'animate-in slide-in-from-top-5' : 'animate-out slide-out-to-top-5'}`} dir="rtl">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-2xl">{errorIcon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-red-800 dark:text-red-200 text-base sm:text-lg mb-1">
                    {errorMessage}
                  </h3>
                  <p className="text-red-600 dark:text-red-300 text-sm sm:text-base mb-3">
                    💡 يرجى إنشاء حساب جديد للبدء
                  </p>
                  <button
                    onClick={() => {
                      toast.dismiss(t.id);
                      router.push('/auth/register');
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm sm:text-base font-medium transition-colors duration-200 shadow-sm"
                  >
                    إنشاء حساب جديد
                  </button>
                </div>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors p-2 -m-2 min-w-[32px] min-h-[32px] flex items-center justify-center"
                  aria-label="إغلاق"
                >
                  ✕
                </button>
              </div>
            </div>
          ), { id: 'login', duration: 8000 });
        } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          errorIcon = '🔒';

          try {
            console.log(`[Sync Check] Verifying email: ${loginEmail}`);
            const verifyResponse = await fetch('/api/auth/verify-and-sync-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: loginEmail })
            });

            console.log(`[Sync Check] Response status: ${verifyResponse.status}`);

            // ⬅️ معالجة الاستجابة حتى لو كانت status غير 200
            const verifyData = await verifyResponse.json().catch(() => ({}));
            console.log('[Sync Check] Response data:', verifyData);

            // إذا وُجد المستخدم لكن بإيميل Firebase Auth مختلف (مثلاً: سجّل بهاتف لكن أدخل Gmail)
            if (
              verifyData.existsInAuth &&
              verifyData.firebaseEmail &&
              verifyData.firebaseEmail !== loginEmail &&
              verifyData.hasPassword
            ) {
              try {
                toast.loading('جاري التحقق...', { id: 'login' });
                const retryResult = await login(verifyData.firebaseEmail, password);
                toast.dismiss('login');
                if (rememberMe) {
                  localStorage.setItem('rememberMe', 'true');
                  if (loginMethod === 'email') localStorage.setItem('userEmail', email);
                }
                showWelcomeToast(retryResult.userData.full_name || retryResult.userData.name || '', false);
                const dashboardRoute = getDashboardRoute(retryResult.userData.accountType);
                setTimeout(() => { window.location.href = dashboardRoute; }, 2200);
                setLoading(false);
                return;
              } catch (_retryErr) {
                // تابع لعرض رسالة خطأ كلمة المرور
              }
            }

            if (verifyData.needsSync) {
              errorMessage = 'حسابك يحتاج إلى تفعيل';

              // رسالة خطأ محسنة مع زر "نسيت كلمة المرور" واضح
              toast.custom((t: any) => (
                <div className={`bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg p-4 shadow-lg max-w-md w-full mx-auto transition-all ${t.visible ? 'animate-in slide-in-from-top-5' : 'animate-out slide-out-to-top-5'}`} dir="rtl">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 text-2xl">⚠️</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-yellow-800 dark:text-yellow-200 text-base sm:text-lg mb-2">
                        {errorMessage}
                      </h3>
                      <p className="text-yellow-600 dark:text-yellow-300 text-sm sm:text-base mb-4">
                        💡 لتفعيل حسابك، يرجى استخدام "نسيت كلمة المرور؟" لإعادة تعيين كلمة المرور
                      </p>
                      <button
                        onClick={() => {
                          toast.dismiss(t.id);
                          router.push('/auth/forgot-password');
                        }}
                        className="w-full px-4 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm sm:text-base font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] flex items-center justify-center gap-2"
                      >
                        <Lock className="w-4 h-4" />
                        نسيت كلمة المرور؟ اضغط هنا للتفعيل
                      </button>
                    </div>
                    <button
                      onClick={() => toast.dismiss(t.id)}
                      className="flex-shrink-0 text-yellow-400 hover:text-yellow-600 transition-colors text-lg font-bold p-2 -m-2 min-w-[32px] min-h-[32px] flex items-center justify-center"
                      aria-label="إغلاق"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ), { id: 'login', duration: 12000 });
              setLoading(false);
              return;
            } else if (verifyData.existsInAuth && !verifyData.hasPassword && verifyData.hasGoogle) {
              // ⬅️ مستخدم سجل بـ Google ويحاول الدخول بكلمة مرور
              toast.custom((t: any) => (
                <div className={`bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-300 dark:border-indigo-700 rounded-lg p-5 shadow-xl max-w-md w-full mx-auto transition-all ${t.visible ? 'animate-in slide-in-from-top-5' : 'animate-out slide-out-to-top-5'}`} dir="rtl">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 text-3xl">🌐</div>
                    <div className="flex-1">
                      <h3 className="font-bold text-indigo-900 dark:text-indigo-100 text-lg mb-2">تسجيل الدخول عبر Google</h3>
                      <p className="text-indigo-700 dark:text-indigo-300 text-sm mb-4 leading-relaxed">
                        يبدو أنك أنشأت حسابك باستخدام <b>Google</b>. يرجى استخدام زر الدخول عبر Google للمتابعة.
                      </p>
                      <button
                        onClick={() => {
                          toast.dismiss(t.id);
                          handleGoogleSignIn();
                        }}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-base font-bold transition-all shadow-md flex items-center justify-center gap-3"
                      >
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        الدخول عبر Google الآن
                      </button>
                    </div>
                    <button onClick={() => toast.dismiss(t.id)} className="text-indigo-300 hover:text-indigo-500 transition-colors p-1">✕</button>
                  </div>
                </div>
              ), { id: 'login', duration: 15000 });
              setLoading(false);
              return;
            } else if (verifyData.existsInFirestore === false) {
              // ⬅️ قد يكون رمز البلد خاطئاً (مثلاً: اكتشاف اليونان بدلاً من مصر)
              // نحاول البحث بالرقم الخام بدون رمز البلد
              if (loginMethod === 'phone') {
                try {
                  const rawPhone = phone.trim(); // رقم المستخدم كما أدخله (مثلاً: 01017799580)
                  const phoneRes = await fetch('/api/auth/check-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phoneNumber: rawPhone }),
                  });
                  const phoneData = await phoneRes.json();
                  if (phoneData.exists && phoneData.email) {
                    // وجدنا الحساب الحقيقي — نعيد المحاولة بالبريد الصحيح
                    toast.loading('جاري التحقق...', { id: 'login' });
                    const retryResult = await login(phoneData.email, password);
                    toast.dismiss('login');
                    if (rememberMe) {
                      localStorage.setItem('rememberMe', 'true');
                      localStorage.setItem('userPhone', phone);
                    }
                    showWelcomeToast(retryResult.userData.full_name || retryResult.userData.name || '', false);
                    const dashboardRoute = getDashboardRoute(retryResult.userData.accountType);
                    setTimeout(() => { window.location.href = dashboardRoute; }, 2200);
                    setLoading(false);
                    return;
                  }
                } catch (_retryErr) {
                  // إذا فشلت إعادة المحاولة، نكمل لعرض رسالة خطأ كلمة المرور
                }
              }

              // ⬅️ المستخدم غير موجود في قاعدة البيانات
              errorMessage = loginMethod === 'phone' ? 'رقم الهاتف غير مسجل في النظام' : 'البريد الإلكتروني غير مسجل في النظام';

              // رسالة خطأ محسنة مع زر للتسجيل
              toast.custom((t: any) => (
                <div className={`bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-4 shadow-lg max-w-md w-full mx-auto transition-all ${t.visible ? 'animate-in slide-in-from-top-5' : 'animate-out slide-out-to-top-5'}`} dir="rtl">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 text-2xl">👤</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-red-800 dark:text-red-200 text-base sm:text-lg mb-1">
                        {errorMessage}
                      </h3>
                      <p className="text-red-600 dark:text-red-300 text-sm sm:text-base mb-3">
                        💡 يرجى إنشاء حساب جديد للبدء
                      </p>
                      <button
                        onClick={() => {
                          toast.dismiss(t.id);
                          router.push('/auth/register');
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm sm:text-base font-medium transition-colors duration-200 shadow-sm"
                      >
                        إنشاء حساب جديد
                      </button>
                    </div>
                    <button
                      onClick={() => toast.dismiss(t.id)}
                      className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors p-2 -m-2 min-w-[32px] min-h-[32px] flex items-center justify-center"
                      aria-label="إغلاق"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ), { id: 'login', duration: 8000 });
              setLoading(false);
              return;
            } else {
              console.log('[Sync Check] User does not need sync. Showing wrong password message.');
            }
          } catch (verifyError) {
            console.error('[Sync Check] Error during verification fetch:', verifyError);
          }

          errorMessage = 'كلمة المرور غير صحيحة';

          // رسالة خطأ محسنة مع زر "نسيت كلمة المرور" واضح
          toast.custom((t: any) => (
            <div className={`bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-4 shadow-lg max-w-md w-full mx-auto transition-all ${t.visible ? 'animate-in slide-in-from-top-5' : 'animate-out slide-out-to-top-5'}`} dir="rtl">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-2xl">{errorIcon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-red-800 dark:text-red-200 text-base sm:text-lg mb-2">
                    {errorMessage}
                  </h3>
                  <p className="text-red-600 dark:text-red-300 text-sm sm:text-base mb-4">
                    💡 هل نسيت كلمة المرور؟ يمكنك إعادة تعيينها الآن
                  </p>
                  <button
                    onClick={() => {
                      toast.dismiss(t.id);
                      router.push('/auth/forgot-password');
                    }}
                    className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm sm:text-base font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    نسيت كلمة المرور؟ اضغط هنا
                  </button>
                </div>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors text-lg font-bold p-2 -m-2 min-w-[32px] min-h-[32px] flex items-center justify-center"
                  aria-label="إغلاق"
                >
                  ✕
                </button>
              </div>
            </div>
          ), { id: 'login', duration: 10000 });
        } else if (error.code === 'auth/too-many-requests') {
          errorIcon = '⏱️';
          errorMessage = 'تم تجاوز عدد المحاولات المسموحة';

          toast.custom((t: any) => (
            <div className={`bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-lg p-4 shadow-lg max-w-md w-full mx-auto transition-all ${t.visible ? 'animate-in slide-in-from-top-5' : 'animate-out slide-out-to-top-5'}`} dir="rtl">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-2xl">{errorIcon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-orange-800 dark:text-orange-200 text-base sm:text-lg mb-1">
                    {errorMessage}
                  </h3>
                  <p className="text-orange-600 dark:text-orange-300 text-sm sm:text-base">
                    ⏳ يرجى الانتظار قليلاً ثم المحاولة مرة أخرى
                  </p>
                </div>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="flex-shrink-0 text-orange-400 hover:text-orange-600 transition-colors p-2 -m-2 min-w-[32px] min-h-[32px] flex items-center justify-center"
                  aria-label="إغلاق"
                >
                  ✕
                </button>
              </div>
            </div>
          ), { id: 'login', duration: 6000 });
        } else if (error.code === 'auth/network-request-failed') {
          errorIcon = '🌐';
          errorMessage = 'خطأ في الاتصال بالإنترنت';

          toast.custom((t: any) => (
            <div className={`bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-4 shadow-lg max-w-md w-full mx-auto transition-all ${t.visible ? 'animate-in slide-in-from-top-5' : 'animate-out slide-out-to-top-5'}`} dir="rtl">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-2xl">{errorIcon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-blue-800 dark:text-blue-200 text-base sm:text-lg mb-1">
                    {errorMessage}
                  </h3>
                  <p className="text-blue-600 dark:text-blue-300 text-sm sm:text-base">
                    🔄 يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى
                  </p>
                </div>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="flex-shrink-0 text-blue-400 hover:text-blue-600 transition-colors p-2 -m-2 min-w-[32px] min-h-[32px] flex items-center justify-center"
                  aria-label="إغلاق"
                >
                  ✕
                </button>
              </div>
            </div>
          ), { id: 'login', duration: 6000 });
        } else if (error.code === 'auth/user-disabled') {
          errorIcon = '🚫';
          errorMessage = 'تم تعطيل الحساب';

          toast.custom((t: any) => (
            <div className={`bg-gray-50 dark:bg-gray-900/20 border-2 border-gray-300 dark:border-gray-700 rounded-lg p-4 shadow-lg max-w-md w-full mx-auto transition-all ${t.visible ? 'animate-in slide-in-from-top-5' : 'animate-out slide-out-to-top-5'}`} dir="rtl">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-2xl">{errorIcon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-800 dark:text-gray-200 text-base sm:text-lg mb-1">
                    {errorMessage}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                    📞 يرجى التواصل مع الدعم الفني لتفعيل حسابك
                  </p>
                </div>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-2 -m-2 min-w-[32px] min-h-[32px] flex items-center justify-center"
                  aria-label="إغلاق"
                >
                  ✕
                </button>
              </div>
            </div>
          ), { id: 'login', duration: 6000 });
        } else {
          toast.custom((t: any) => (
            <div className={`bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-4 shadow-lg max-w-md w-full mx-auto transition-all ${t.visible ? 'animate-in slide-in-from-top-5' : 'animate-out slide-out-to-top-5'}`} dir="rtl">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-2xl">{errorIcon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-red-800 dark:text-red-200 text-base sm:text-lg mb-1">
                    {errorMessage}
                  </h3>
                  <p className="text-red-600 dark:text-red-300 text-sm sm:text-base">
                    🔄 يرجى المحاولة مرة أخرى أو التواصل مع الدعم
                  </p>
                </div>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors p-2 -m-2 min-w-[32px] min-h-[32px] flex items-center justify-center"
                  aria-label="إغلاق"
                >
                  ✕
                </button>
              </div>
            </div>
          ), { id: 'login', duration: 6000 });
        }
      } else if (err instanceof Error && err.message) {
        // معالجة الأخطاء العادية (مثل أخطاء حالة الحساب)
        errorMessage = err.message;
        errorIcon = '⚠️';

        // عرض رسالة الخطأ في toast
        toast.custom((t: any) => (
          <div className={`bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-4 shadow-lg max-w-md w-full mx-auto transition-all ${t.visible ? 'animate-in slide-in-from-top-5' : 'animate-out slide-out-to-top-5'}`} dir="rtl">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 text-2xl">{errorIcon}</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-red-800 dark:text-red-200 text-base sm:text-lg mb-1 whitespace-pre-line">
                  {errorMessage}
                </h3>
                <p className="text-red-600 dark:text-red-300 text-sm sm:text-base mb-3">
                  📞 يرجى التواصل مع الإدارة للحصول على المساعدة
                </p>
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    router.push('/support');
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm sm:text-base font-medium transition-colors duration-200 shadow-sm"
                >
                  التوجه إلى صفحة الدعم الفني
                </button>
              </div>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors p-2 -m-2 min-w-[32px] min-h-[32px] flex items-center justify-center"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>
          </div>
        ), { id: 'login', duration: 10000 });
      }
      setLoading(false);
    }
  };

  // Redirect to dashboard if user is already logged in
  // 🛡️ Security: show choices instead of auto-redirecting to prevent accidental bypass
  useEffect(() => {
    // We only auto-redirect if NOT in a login attempt and NOT in the middle of loading
  }, [user, userData, authLoading, router, isLoginAttempt]);

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#f7f7f8]" dir="rtl">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  // 🛡️ Already Logged In Case — prevent automatic bypass
  if (user && userData && !isLoginAttempt) {
    const dashRoute = getDashboardRoute(userData.accountType);
    return (
      <div className="min-h-screen bg-[#f7f7f8] flex flex-col items-center justify-center px-4 font-cairo" dir="rtl">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-7 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mx-auto mb-4 font-inter text-white">
            <span className="text-3xl">👤</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">أنت مسجل الدخول بالفعل</h2>
          <p className="text-sm text-slate-500 mb-6">
            {userData.full_name || userData.name ? `مرحباً ${userData.full_name || userData.name}` : 'أهلاً بك مجدداً'}
          </p>
          <button
            onClick={() => router.replace(dashRoute)}
            className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors mb-3"
          >
            الذهاب إلى لوحة التحكم
          </button>
          <button
            onClick={async () => {
              await logout();
              window.location.reload();
            }}
            className="w-full h-11 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-lg transition-colors"
          >
            تسجيل خروج ودخول بحساب آخر
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f8] flex flex-col items-center justify-center p-4 font-cairo" dir="rtl">
      <Toaster position="top-center" dir="rtl" richColors />

      {/* OTP Modal */}
      {showOTPModal && (
        <WhatsAppOTPVerification
          phoneNumber={otpPhone}
          isOpen={showOTPModal}
          onVerificationSuccess={handleWhatsAppOTPSuccess}
          onVerificationFailed={(err) => toast.error(err)}
          onClose={() => setShowOTPModal(false)}
          onOTPVerify={handleVerifyOTP}
          title="تسجيل الدخول عبر WhatsApp"
          subtitle="أدخل رمز التحقق المرسل إلى WhatsApp"
        />
      )}

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-8">

        {/* Logo */}
        <div className="flex flex-col items-center mb-7">
          <div className="w-10 h-10 rounded-xl overflow-hidden relative mb-4 flex items-center justify-center bg-slate-100">
            {branding?.logoUrl ? (
              <Image src={branding.logoUrl} alt={branding.siteName || 'El7lm'} fill className="object-contain p-1.5" />
            ) : (
              <Star className="w-6 h-6 text-slate-700 fill-slate-700" />
            )}
          </div>
          <h1 className="text-xl font-bold text-slate-900 text-center">تسجيل الدخول</h1>
          <p className="text-sm text-slate-500 mt-1 text-center">أهلاً بك مجدداً في منصة الحلم</p>
        </div>

        {/* Google */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="w-full h-11 flex items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-5"
        >
          {googleLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>المتابعة بـ Google</span>
            </>
          )}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400">أو</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Method tabs */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden mb-5 bg-slate-50 p-1 gap-1">
          <button
            type="button"
            onClick={() => { setLoginMethod('phone'); setPhoneStatus('idle'); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm rounded-md transition-all ${
              loginMethod === 'phone'
                ? 'bg-white shadow-sm text-slate-900 font-semibold'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            هاتف
          </button>
          <button
            type="button"
            onClick={() => { setLoginMethod('email'); setPhoneStatus('idle'); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm rounded-md transition-all ${
              loginMethod === 'email'
                ? 'bg-white shadow-sm text-slate-900 font-semibold'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            بريد إلكتروني
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">

          {loginMethod === 'phone' ? (
            <>
              {/* Phone field */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">رقم الهاتف</label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-28 h-11 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 px-2 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  >
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>{c.code}</option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="501234567"
                    dir="ltr"
                    required
                    className={`flex-1 h-11 rounded-lg border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                      phoneStatus === 'valid'
                        ? 'border-green-400 focus:ring-green-500'
                        : phoneStatus === 'invalid'
                        ? 'border-red-400 focus:ring-red-400'
                        : 'border-slate-200 focus:ring-slate-900'
                    }`}
                  />
                </div>
                {/* Phone validation feedback */}
                <div className="mt-1.5 min-h-[1rem]">
                  {phoneFormatError && (
                    <span className="text-xs text-orange-600 font-medium">⚠️ {phoneFormatError}</span>
                  )}
                  {!phoneFormatError && phoneStatus === 'checking' && (
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Loader2 className="w-3 h-3 animate-spin" /> جاري التحقق...
                    </span>
                  )}
                  {!phoneFormatError && phoneStatus === 'valid' && (
                    <span className="text-xs text-green-600 font-medium">✓ رقم مسجل</span>
                  )}
                  {!phoneFormatError && phoneStatus === 'invalid' && (
                    <span className="text-xs text-red-500">
                      ✗ رقم غير مسجل —{' '}
                      <button
                        type="button"
                        onClick={() => router.push('/auth/register')}
                        className="underline hover:text-red-700 transition-colors"
                      >
                        إنشاء حساب
                      </button>
                    </span>
                  )}
                </div>
              </div>

              {/* OTP toggle */}
              <button
                type="button"
                onClick={() => setUseOTP(!useOTP)}
                className={`w-full h-11 flex items-center justify-between px-4 rounded-lg border text-sm transition-all ${
                  useOTP
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <span>{useOTP ? 'الدخول برمز WhatsApp ✓' : 'الدخول برمز WhatsApp'}</span>
                <div className={`w-9 h-5 rounded-full relative transition-all ${useOTP ? 'bg-green-400' : 'bg-slate-200'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${useOTP ? 'right-0.5' : 'left-0.5'}`} />
                </div>
              </button>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                dir="ltr"
                required
                className="w-full h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              />
            </div>
          )}

          {/* Password */}
          {(loginMethod === 'email' || !useOTP) && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-slate-700">كلمة المرور</label>
                <button
                  type="button"
                  onClick={() => router.push('/auth/forgot-password')}
                  className="text-xs text-slate-500 hover:text-slate-900 transition-colors"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required={!useOTP}
                  className="w-full h-11 rounded-lg border border-slate-200 bg-white px-3 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              useOTP && loginMethod === 'phone' ? 'إرسال رمز التحقق' : 'تسجيل الدخول'
            )}
          </button>
        </form>

        {/* Register link */}
        <p className="text-center text-sm text-slate-500 mt-6">
          ليس لديك حساب؟{' '}
          <button
            type="button"
            onClick={() => router.push('/auth/register')}
            className="text-slate-900 font-semibold hover:underline"
          >
            إنشاء حساب
          </button>
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-4 mt-6 text-xs text-slate-400">
        <a href="/terms" className="hover:text-slate-600 transition-colors">الشروط</a>
        <span>·</span>
        <a href="/privacy" className="hover:text-slate-600 transition-colors">الخصوصية</a>
        <span>·</span>
        <a href="/support" className="hover:text-slate-600 transition-colors">المساعدة</a>
      </div>
    </div>
  );
}
