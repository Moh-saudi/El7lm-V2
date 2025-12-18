'use client';

import { useAuth } from '@/lib/firebase/auth-provider';
import { sendEmailVerification } from 'firebase/auth';
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  Shield,
  Star
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast, Toaster } from 'sonner';
import WhatsAppOTPVerification from '@/components/shared/WhatsAppOTPVerification';


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
  const { login, logout, signInWithGoogle, setupRecaptcha, sendPhoneOTP, verifyPhoneOTP, user, userData, loading: authLoading } = useAuth();

  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+20');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [useOTP, setUseOTP] = useState(false);



  const handleVerifyOTP = async (otp: string) => {
    try {
      const result = await verifyPhoneOTP(confirmationResult, otp);

      if (result.isNewUser) {
        toast.success('🎉 تم إنشاء حسابك بنجاح! مرحباً بك في الحلم');
      } else {
        toast.success('✅ تم تسجيل الدخول بنجاح');
      }

      if (result.userData.accountType === 'unknown' || result.userData.accountType === undefined) {
        setTimeout(() => router.replace('/auth/select-role'), 500);
      } else {
        const dashboardRoute = getDashboardRoute(result.userData.accountType);
        router.replace(dashboardRoute);
      }

    } catch (error: any) {
      console.error('Verify error:', error);
      throw error;
    }
  };



  useEffect(() => {
    const interval = setInterval(() => {
      setTestimonialIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

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

  const findFirebaseEmailByPhone = async (fullPhone: string): Promise<string | null> => {
    try {
      const response = await fetch('/api/auth/find-user-by-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone })
      });
      if (!response.ok) return null;
      const result = await response.json();
      return result?.found && result?.email ? result.email : null;
    } catch (error) {
      console.error('Error finding user:', error);
      return null;
    }
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
    return routes[accountType] || '/auth/login';
  };

  // تسجيل الدخول بواسطة Google
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      toast.loading('جاري تسجيل الدخول بواسطة Google...', { id: 'google-signin' });

      const result = await signInWithGoogle('player');

      if (result.isNewUser) {
        toast.success('🎉 تم إنشاء حسابك بنجاح! مرحباً بك في الحلم', { id: 'google-signin' });
      } else {
        toast.success('✅ تم تسجيل الدخول بنجاح!', { id: 'google-signin' });
      }

      const dashboardRoute = getDashboardRoute(result.userData.accountType);
      setTimeout(() => router.replace(dashboardRoute), 500);

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
    let loginEmail: string = '';

    try {
      if (loginMethod === 'email') {
        if (!email.trim()) {
          toast.error('يرجى إدخال البريد الإلكتروني');
          setLoading(false);
          return;
        }
        loginEmail = email.trim();
      } else {
        if (!phone.trim()) {
          toast.error('يرجى إدخال رقم الهاتف');
          setLoading(false);
          return;
        }
      }

      const fullPhone = `${countryCode}${phone.replace(/^0+/, '')}`;

      // --- OTP Login Flow ---
      if (useOTP) {
        try {
          toast.loading('جاري إرسال رمز التحقق...', { id: 'login' });

          let appVerifier = (window as any).recaptchaVerifier;
          if (!appVerifier) {
            appVerifier = await setupRecaptcha('recaptcha-container-login');
          }

          const confirmation = await sendPhoneOTP(fullPhone, appVerifier);
          setConfirmationResult(confirmation);
          setShowOTPModal(true);
          toast.success('تم إرسال الرمز بنجاح', { id: 'login' });
          setLoading(false);
          return; // Stop here, wait for OTP
        } catch (error: any) {
          console.error('Send OTP Error:', error);
          toast.error(error.message || 'فشل إرسال الرمز', { id: 'login' });
          setLoading(false);
          return;
        }
      }
      // ----------------------

      toast.loading('جاري التحقق...', { id: 'login' });
      const firebaseEmail = await findFirebaseEmailByPhone(fullPhone);
      if (!firebaseEmail) {
        // رسالة خطأ محسنة مع زر للتسجيل
        toast.custom((t) => (
          <div className={`bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-4 shadow-lg max-w-md w-full mx-auto transition-all ${t.visible ? 'animate-in slide-in-from-top-5' : 'animate-out slide-out-to-top-5'}`} dir="rtl">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 text-2xl">👤</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-red-800 dark:text-red-200 text-base sm:text-lg mb-1">
                  رقم الهاتف غير مسجل
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
                className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
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

      if (!password && !useOTP) { // Only check password if NOT using OTP
        toast.error('يرجى إدخال كلمة المرور');
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
      const result = await login(loginEmail, password);

      // --- Enforce Email Verification ---
      if (loginMethod === 'email' && !result.user.emailVerified) {
        // Resend Verification
        toast.loading('الحساب غير مفعل. جاري إرسال رابط التفعيل...', { id: 'verify-check' });
        try {
          await sendEmailVerification(result.user);
          toast.success('تم إرسال رابط التفعيل إلى بريدك الإلكتروني.', { id: 'verify-check' });
        } catch (e: any) {
          console.log('Resend verification error:', e);
          toast.error('يرجى التحقق من بريدك الإلكتروني (بما في ذلك الرسائل غير المرغوب فيها).', { id: 'verify-check' });
        }

        await logout();
        setLoading(false);
        return;
      }
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

      toast.success('✅ تم تسجيل الدخول بنجاح!', { id: 'login' });
      const dashboardRoute = getDashboardRoute(result.userData.accountType);
      setTimeout(() => router.replace(dashboardRoute), 500);

    } catch (err: unknown) {
      console.error('Login failed:', err);
      let errorMessage = 'حدث خطأ أثناء تسجيل الدخول';
      let errorIcon = '❌';

      if (err && typeof err === 'object' && 'code' in err) {
        const error = err as { code: string; message?: string };

        if (error.code === 'auth/user-not-found') {
          errorIcon = '👤';
          errorMessage = loginMethod === 'email' ? 'البريد الإلكتروني غير مسجل' : 'رقم الهاتف غير مسجل';

          // رسالة خطأ محسنة مع زر للتسجيل
          toast.custom((t) => (
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
                  className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
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

            if (verifyData.needsSync) {
              errorMessage = 'حسابك يحتاج إلى تفعيل';

              // رسالة خطأ محسنة مع زر "نسيت كلمة المرور" واضح
              toast.custom((t) => (
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
                      className="flex-shrink-0 text-yellow-400 hover:text-yellow-600 transition-colors text-lg font-bold"
                      aria-label="إغلاق"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ), { id: 'login', duration: 12000 });
              setLoading(false);
              return;
            } else if (verifyData.existsInFirestore === false) {
              // ⬅️ المستخدم غير موجود في قاعدة البيانات
              errorMessage = 'البريد الإلكتروني غير مسجل في النظام';

              // رسالة خطأ محسنة مع زر للتسجيل
              toast.custom((t) => (
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
                      className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
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
          toast.custom((t) => (
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
                  className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors text-lg font-bold"
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

          toast.custom((t) => (
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
                  className="flex-shrink-0 text-orange-400 hover:text-orange-600 transition-colors"
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

          toast.custom((t) => (
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
                  className="flex-shrink-0 text-blue-400 hover:text-blue-600 transition-colors"
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

          toast.custom((t) => (
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
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="إغلاق"
                >
                  ✕
                </button>
              </div>
            </div>
          ), { id: 'login', duration: 6000 });
        } else {
          toast.custom((t) => (
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
                  className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
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
        toast.custom((t) => (
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
                className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
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
  useEffect(() => {
    if (user && userData && !authLoading) {
      // Check if email is verified before redirecting
      if (user.email && !user.emailVerified) {
        // Check if it's a password user (not Google/Phone) to be safe, though Google is usually verified.
        // We'll trust user.emailVerified. If false, force logout.
        console.log('User is logged in but not verified. Logging out...');
        logout();
        return;
      }
      router.replace(getDashboardRoute(userData.accountType));
    }
  }, [user, userData, authLoading, router, logout]);

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-purple-950 to-black" dir="rtl">
        <div className="relative">
          <div className="absolute -inset-4 bg-purple-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
          <Loader2 className="relative w-16 h-16 text-purple-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster
        position="top-center"
        dir="rtl"
        richColors
        toastOptions={{
          className: '!text-sm sm:!text-base font-cairo',
          style: {
            fontFamily: 'Cairo, sans-serif',
          },
        }}
      />

      {/* OTP Modal */}
      {showOTPModal && (
        <WhatsAppOTPVerification
          confirmationResult={confirmationResult}
          isVerify={true}
          onVerifySuccess={handleVerifyOTP}
          onClose={() => setShowOTPModal(false)}
          phone={phone}
        />
      )}

      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-purple-950 to-slate-950 font-sans relative overflow-hidden" dir="rtl">

        {/* Animated Background Elements - Subtle Depth */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[50%] -translate-x-1/2 w-[600px] h-[600px] bg-purple-600/20 rounded-full mix-blend-multiply filter blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-indigo-600/20 rounded-full mix-blend-multiply filter blur-[80px] opacity-40"></div>
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff33_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.05]"></div>
        </div>

        {/* Main Card */}
        <div className="w-full max-w-[400px] relative z-10 perspective-1000">

          {/* Card Container */}
          <div className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-white/20 overflow-hidden relative transform transition-all hover:scale-[1.005] duration-500">

            {/* Decorative Top Line */}
            <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500"></div>

            <div className="p-8">

              {/* Header */}
              <div className="text-center mb-8 relative">
                <div className="inline-flex justify-center items-center mb-4 w-16 h-16 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl shadow-inner border border-white">
                  <Shield className="w-8 h-8 text-purple-600" />
                </div>
                <h1 className="text-2xl font-extrabold text-slate-800 mb-1 font-cairo tracking-tight">مرحباً بك مجدداً</h1>
                <p className="text-slate-500 text-xs font-medium">سجل دخولك لمتابعة رحلة حلمك</p>
              </div>

              {/* Google Sign In - Prominent Top Placement */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || loading}
                  className="w-full h-12 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-3 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-purple-200 hover:shadow-md hover:shadow-purple-500/5 active:bg-slate-100 disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden"
                >
                  {googleLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-50/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      <span>المتابعة باستخدام Google</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative flex items-center mb-6">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">أو أدخل بياناتك</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* Tabs - Glass Pill Style */}
              <div className="p-1.5 bg-slate-100/80 rounded-2xl mb-6 relative border border-slate-200/50 flex">
                <button
                  onClick={() => setLoginMethod('phone')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 relative z-10 ${loginMethod === 'phone' ? 'text-white shadow-md' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  <Phone className={`w-3.5 h-3.5 ${loginMethod === 'phone' ? 'text-white' : 'text-slate-400'}`} />
                  رقم الهاتف
                </button>
                <button
                  onClick={() => setLoginMethod('email')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 relative z-10 ${loginMethod === 'email' ? 'text-white shadow-md' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  <Mail className={`w-3.5 h-3.5 ${loginMethod === 'email' ? 'text-white' : 'text-slate-400'}`} />
                  البريد الإلكتروني
                </button>

                {/* Selected Tab Background */}
                <div
                  className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-slate-900 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${loginMethod === 'phone' ? 'right-1.5' : 'right-[calc(50%+3px)]'
                    }`}
                ></div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {loginMethod === 'phone' ? (
                  <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">البلد</label>
                      <div className="relative group">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="w-full h-10 px-4 text-xs bg-slate-50 hover:bg-white focus:bg-white rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none appearance-none font-semibold text-slate-700 cursor-pointer"
                        >
                          {countries.map((country) => (
                            <option key={country.code} value={country.code}>
                              {country.name} ({country.code})
                            </option>
                          ))}
                        </select>
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-purple-500 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">رقم الهاتف</label>
                      <div className="flex h-10 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 focus-within:bg-white focus-within:border-purple-500 focus-within:ring-4 focus-within:ring-purple-500/10 transition-all">
                        <div className="flex items-center justify-center w-14 bg-slate-100 border-l border-slate-200 text-slate-500 font-bold text-xs dir-ltr">
                          <span dir="ltr">{countryCode}</span>
                        </div>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                          className="flex-1 px-4 bg-transparent border-none text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:ring-0 outline-none"
                          placeholder="50xxxxxxx"
                          required
                          dir="ltr"
                          autoComplete="tel"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 py-1 cursor-pointer" onClick={() => setUseOTP(!useOTP)}>
                      <div className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${useOTP ? 'bg-purple-600' : 'bg-slate-300'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300 ${useOTP ? 'left-1' : 'left-6'}`}></div>
                      </div>
                      <span className="text-xs font-bold text-slate-600 select-none">الدخول السريع (بدون كلمة مرور)</span>
                    </div>

                  </div>
                ) : (
                  <div className="animate-in fade-in slide-in-from-left-4 duration-300 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">البريد الإلكتروني</label>
                    <div className="relative group">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-10 pl-4 pr-10 bg-slate-50 hover:bg-white focus:bg-white rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none text-sm font-semibold text-slate-800 placeholder:text-slate-400"
                        placeholder="name@example.com"
                        required
                        autoComplete="email"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-500 transition-colors">
                        <Mail className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                )}

                {(loginMethod === 'email' || !useOTP) && (
                  <div className="space-y-1 animate-in fade-in zoom-in duration-300">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">كلمة المرور</label>
                      <button
                        type="button"
                        onClick={() => router.push('/auth/forgot-password')}
                        className="text-[10px] font-bold text-purple-600 hover:text-purple-700 transition-colors"
                      >
                        نسيت؟
                      </button>
                    </div>
                    <div className="relative group">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-10 pl-10 pr-10 bg-slate-50 hover:bg-white focus:bg-white rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none text-sm font-semibold text-slate-800 placeholder:text-slate-400"
                        placeholder="••••••••"
                        required={!useOTP}
                        autoComplete="current-password"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-500 transition-colors">
                        <Lock className="w-4 h-4" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between py-1">
                  <label className="flex gap-2 items-center cursor-pointer group select-none">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="w-4 h-4 border-2 border-slate-300 rounded bg-white peer-checked:bg-purple-600 peer-checked:border-purple-600 peer-hover:border-purple-400 transition-all"></div>
                      <svg className="w-2.5 h-2.5 text-white absolute left-1 top-1 opacity-0 peer-checked:opacity-100 transition-transform duration-200 scale-50 peer-checked:scale-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 group-hover:text-slate-700 transition-colors">تذكرني</span>
                  </label>


                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`relative w-full h-11 text-sm font-bold text-white rounded-xl transition-all shadow-lg hover:shadow-purple-500/25 hover:-translate-y-0.5 active:translate-y-0 overflow-hidden ${loading
                    ? 'bg-slate-300 cursor-not-allowed shadow-none transform-none'
                    : 'bg-slate-900 hover:bg-slate-800'
                    }`}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        جاري المعالجة...
                      </>
                    ) : (
                      <>
                        {useOTP && loginMethod === 'phone' ? 'إرسال رمز التحقق' : 'تسجيل الدخول'}
                        {useOTP && loginMethod === 'phone' ? (
                          <Phone className="w-4 h-4 ltr:ml-2 rtl:mr-2" />
                        ) : (
                          <svg className="w-4 h-4 rtl:rotate-180 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        )}
                      </>
                    )}
                  </span>
                </button>

                <div className="pt-2 text-center">
                  <p className="text-sm text-gray-500">
                    ليس لديك حساب؟{' '}
                    <button
                      type="button"
                      onClick={() => router.push('/auth/register')}
                      className="font-bold text-purple-600 hover:text-purple-700 transition-colors hover:underline decoration-2 underline-offset-4"
                    >
                      إنشاء حساب جديد
                    </button>
                  </p>
                </div>
              </form>
            </div>

            <div className="py-3 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500 font-medium">
                ليس لديك حساب؟{' '}
                <button
                  type="button"
                  onClick={() => router.push('/auth/register')}
                  className="font-bold text-purple-600 hover:text-purple-700 transition-colors"
                >
                  انشئ حسابك المجاني
                </button>
              </p>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-6 text-center space-y-2">
            <div className="flex justify-center gap-4 text-[10px] text-white/40 font-medium">
              <a href="#" className="hover:text-white transition-colors">شروط الاستخدام</a>
              <a href="#" className="hover:text-white transition-colors">سياسة الخصوصية</a>
              <a href="#" className="hover:text-white transition-colors">المساعدة</a>
            </div>
            <p className="text-[10px] text-white/20">© 2024 El7lm.</p>
          </div>

        </div>
      </div>


    </>
  );
}
