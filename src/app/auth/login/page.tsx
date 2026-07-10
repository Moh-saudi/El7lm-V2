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
import { useTranslation } from '@/lib/i18n';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import { countries, getTranslatedCountryName } from '@/lib/constants/countries';

type LoginMethod = 'phone' | 'email';

export default function LoginPage() {
  const { t, locale, isRTL } = useTranslation();
  const testimonials = [1, 2, 3, 4].map((index) => ({
    quote: t(`auth.loginTestimonial${index}Quote`),
    author: t(`auth.loginTestimonial${index}Author`),
    role: t(`auth.loginTestimonial${index}Role`),
  }));
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
    const greeting = firstName ? `${t('auth.toastGreeting')} ${firstName}` : t('auth.toastWelcome');
    const message = isNew
      ? t('auth.toastAccountReady')
      : t('auth.toastWelcomeBack');

    toast.custom(() => (
      <div
        className="flex items-start gap-3 bg-white rounded-2xl shadow-lg border border-slate-100 px-5 py-4 min-w-[260px] max-w-[320px] font-cairo"
        dir={isRTL ? "rtl" : "ltr"}
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
      toast.loading(t('auth.loggingIn'), { id: 'otp-login' });

      const res = await fetch('/api/auth/otp-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: otpPhone, otp }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.dismiss('otp-login');
        throw new Error(data.error || t('auth.otpVerificationFailed'));
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
          throw new Error(`${t('auth.loginFailed')}: ${signInError.message}`);
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


  // Auto-detect country from IP on page load (عبر server-side route لتجنب CORS)
  useEffect(() => {
    const detectCountry = async () => {
      try {
        const response = await fetch('/api/geo');
        const data = await response.json();
        if (!data.country_code) return;

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
        }
      } catch {
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
      toast.success(t('auth.passwordResetSuccess'));
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
      toast.loading(t('auth.loggingInGoogle'), { id: 'google-signin' });

      const result = await signInWithGoogle('player');

      toast.dismiss('google-signin');
      showWelcomeToast(result.userData.full_name || result.userData.name || '', result.isNewUser);

      const dashboardRoute = getDashboardRoute(result.userData.accountType);
      setTimeout(() => { window.location.href = dashboardRoute; }, 2200);

    } catch (err: unknown) {
      console.error('Google Sign-In failed:', err);

      let errorMessage = t('auth.errorGoogleSignIn');
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
          toast.error(t('auth.errorEnterEmail'));
          setLoading(false);
          return;
        }
        loginEmail = email.trim();
      } else {
        if (!phone.trim()) {
          toast.error(t('auth.errorEnterPhone'));
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
          toast.error(t('auth.errorCheckingPhoneWait'));
          setLoading(false);
          return;
        }
        if (phoneStatus === 'invalid') {
          toast.error(t('auth.errorPhoneNotRegisteredRegister'));
          setLoading(false);
          return;
        }
        try {
          toast.loading(t('auth.selectRoleSendingOtpToast'), { id: 'login' });

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
            throw new Error(data.error || t('auth.otpSendFailed'));
          }

          setOtpPhone(fullPhone);
          setShowOTPModal(true);
          toast.success(t('auth.forgotPasswordOtpSent'), { id: 'login' });
          setLoading(false);
          return;
        } catch (error: any) {
          console.error('Send OTP Error:', error);
          toast.error(error.message || t('auth.otpSendFailed'), { id: 'login' });
          setLoading(false);
          return;
        }
      }
      // -----------------------------------------------

      toast.loading(t('auth.verifying'), { id: 'login' });
      const firebaseEmail = generateEmailFromPhone(fullPhone);

      // Optional: Check if phone exists (but don't wait for email)
      console.log(`📧 [Login] Using email: ${firebaseEmail}`);

      // Try to login with generated email
      const legacyCheck = false; // Skip database check for speed
      if (legacyCheck) {
        // رسالة خطأ محسنة مع زر للتسجيل
        toast.custom((toastData: any) => (
          <div className={`bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-4 shadow-lg max-w-md w-full mx-auto transition-all ${toastData.visible ? 'animate-in slide-in-from-top-5' : 'animate-out slide-out-to-top-5'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 text-2xl">👤</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-red-800 dark:text-red-200 text-base sm:text-lg mb-1">
                  {t('auth.errorPhoneNotRegistered')} 📱
                </h3>
                <p className="text-red-600 dark:text-red-300 text-sm sm:text-base mb-3">
                  {t('auth.suggestRegister')}
                </p>
                <button
                  onClick={() => {
                    toast.dismiss(toastData.id);
                    router.push('/auth/register');
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm sm:text-base font-medium transition-colors duration-200 shadow-sm"
                >
                  {t('auth.createAccount')}
                </button>
              </div>
              <button
                onClick={() => toast.dismiss(toastData.id)}
                className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors p-2 -m-2 min-w-[32px] min-h-[32px] flex items-center justify-center"
                aria-label={t('common.close')}
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
          toast.error(t('auth.errorEnterPassword'));
        setLoading(false);
        return;
      }

      // Safety check
      if (useOTP && loginMethod === 'phone') {
        // Should have returned earlier, but just in case
        setLoading(false);
        return;
      }

      toast.loading(t('auth.loggingIn'), { id: 'login' });

      // Ensure we have a valid email and password
      if (!loginEmail || (!password && !useOTP)) {
        toast.error(t('auth.errorIncompleteCredentials'), { id: 'login' });
        setLoading(false);
        return;
      }

      console.log(`[Login Attempt] Method: ${loginMethod}, Email: ${loginEmail}, Password Length: ${password.length}`);

      const result = await login(loginEmail, password);

      // Email verification check bypassed for smoother entry during refined auth phase
      // ----------------------------------

      if (!result.userData.accountType) {
        toast.error(t('auth.errorInvalidAccountType'), { id: 'login' });
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
      let errorMessage = t('auth.errorDefault');
      let errorIcon = '❌';

      if (err && typeof err === 'object' && 'code' in err) {
        const error = err as { code: string; message?: string };

        if (error.code === 'auth/user-not-found') {
          errorIcon = loginMethod === 'email' ? '📧' : '📱';
          errorMessage = loginMethod === 'email' ? t('auth.errorEmailNotRegistered') : t('auth.errorPhoneNotRegistered');

          // رسالة خطأ محسنة مع زر للتسجيل
          toast.custom((tCustom: any) => (
            <div className={`bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-4 shadow-lg max-w-md w-full mx-auto transition-all ${tCustom.visible ? 'animate-in slide-in-from-top-5' : 'animate-out slide-out-to-top-5'}`} dir={isRTL ? "rtl" : "ltr"}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-2xl">{errorIcon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-red-800 dark:text-red-200 text-base sm:text-lg mb-1">
                    {errorMessage}
                  </h3>
                  <p className="text-red-600 dark:text-red-300 text-sm sm:text-base mb-3">
                    {t('auth.suggestRegister')}
                  </p>
                  <button
                    onClick={() => {
                      toast.dismiss(tCustom.id);
                      router.push('/auth/register');
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm sm:text-base font-medium transition-colors duration-200 shadow-sm"
                  >
                    {t('auth.createAccount')}
                  </button>
                </div>
                <button
                  onClick={() => toast.dismiss(tCustom.id)}
                  className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors p-2 -m-2 min-w-[32px] min-h-[32px] flex items-center justify-center"
                  aria-label={t('common.close')}
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
                toast.loading(t('auth.verifying'), { id: 'login' });
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
              errorMessage = t('auth.errorNeedsSync');

              // رسالة خطأ محسنة مع زر "نسيت كلمة المرور" واضح
              toast.custom((tCustom: any) => (
                <div className={`bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg p-4 shadow-lg max-w-md w-full mx-auto transition-all ${tCustom.visible ? 'animate-in slide-in-from-top-5' : 'animate-out slide-out-to-top-5'}`} dir={isRTL ? "rtl" : "ltr"}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 text-2xl">⚠️</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-yellow-800 dark:text-yellow-200 text-base sm:text-lg mb-2">
                        {errorMessage}
                      </h3>
                      <p className="text-yellow-600 dark:text-yellow-300 text-sm sm:text-base mb-4">
                        {t('auth.suggestSync')}
                      </p>
                      <button
                        onClick={() => {
                          toast.dismiss(tCustom.id);
                          router.push('/auth/forgot-password');
                        }}
                        className="w-full px-4 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm sm:text-base font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] flex items-center justify-center gap-2"
                      >
                        <Lock className="w-4 h-4" />
                        {t('auth.btnSync')}
                      </button>
                    </div>
                    <button
                      onClick={() => toast.dismiss(tCustom.id)}
                      className="flex-shrink-0 text-yellow-400 hover:text-yellow-600 transition-colors text-lg font-bold p-2 -m-2 min-w-[32px] min-h-[32px] flex items-center justify-center"
                      aria-label={t('auth.hidePassword')}
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
              toast.custom((tCustom: any) => (
                <div className={`bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-300 dark:border-indigo-700 rounded-lg p-5 shadow-xl max-w-md w-full mx-auto transition-all ${tCustom.visible ? 'animate-in slide-in-from-top-5' : 'animate-out slide-out-to-top-5'}`} dir={isRTL ? "rtl" : "ltr"}>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 text-3xl">🌐</div>
                    <div className="flex-1">
                      <h3 className="font-bold text-indigo-900 dark:text-indigo-100 text-lg mb-2">{t('auth.loginGoogleTitle')}</h3>
                      <p className="text-indigo-700 dark:text-indigo-300 text-sm mb-4 leading-relaxed">
                        {t('auth.loginGoogleDesc')}
                      </p>
                      <button
                        onClick={() => {
                          toast.dismiss(tCustom.id);
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
                        {t('auth.loginGoogleBtn')}
                      </button>
                    </div>
                    <button onClick={() => toast.dismiss(tCustom.id)} className="text-indigo-300 hover:text-indigo-500 transition-colors p-1">✕</button>
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
                    toast.loading(t('auth.checkingPhone'), { id: 'login' });
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
              errorMessage = loginMethod === 'phone' ? t('auth.errorPhoneNotRegistered') : t('auth.errorEmailNotRegistered');

              // رسالة خطأ محسنة مع زر للتسجيل
              toast.custom((tCustom: any) => (
                <div className={`bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-4 shadow-lg max-w-md w-full mx-auto transition-all ${tCustom.visible ? 'animate-in slide-in-from-top-5' : 'animate-out slide-out-to-top-5'}`} dir={isRTL ? "rtl" : "ltr"}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 text-2xl">👤</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-red-800 dark:text-red-200 text-base sm:text-lg mb-1">
                        {errorMessage}
                      </h3>
                      <p className="text-red-600 dark:text-red-300 text-sm sm:text-base mb-3">
                        {t('auth.suggestRegister')}
                      </p>
                      <button
                        onClick={() => {
                          toast.dismiss(tCustom.id);
                          router.push('/auth/register');
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm sm:text-base font-medium transition-colors duration-200 shadow-sm"
                      >
                        {t('auth.createAccount')}
                      </button>
                    </div>
                    <button
                      onClick={() => toast.dismiss(tCustom.id)}
                      className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors p-2 -m-2 min-w-[32px] min-h-[32px] flex items-center justify-center"
                      aria-label={t('auth.hidePassword')}
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

          errorMessage = t('auth.errorWrongPassword');

          // رسالة خطأ محسنة مع زر "نسيت كلمة المرور" واضح
          toast.custom((tCustom: any) => (
            <div className={`bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-4 shadow-lg max-w-md w-full mx-auto transition-all ${tCustom.visible ? 'animate-in slide-in-from-top-5' : 'animate-out slide-out-to-top-5'}`} dir={isRTL ? "rtl" : "ltr"}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-2xl">{errorIcon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-red-800 dark:text-red-200 text-base sm:text-lg mb-2">
                    {errorMessage}
                  </h3>
                  <p className="text-red-600 dark:text-red-300 text-sm sm:text-base mb-4">
                    {t('auth.suggestForgotPassword')}
                  </p>
                  <button
                    onClick={() => {
                      toast.dismiss(tCustom.id);
                      router.push('/auth/forgot-password');
                    }}
                    className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm sm:text-base font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    {t('auth.forgotPassword')}
                  </button>
                </div>
                <button
                  onClick={() => toast.dismiss(tCustom.id)}
                  className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors text-lg font-bold p-2 -m-2 min-w-[32px] min-h-[32px] flex items-center justify-center"
                  aria-label={t('auth.hidePassword')}
                >
                  ✕
                </button>
              </div>
            </div>
          ), { id: 'login', duration: 10000 });
        } else if (error.code === 'auth/too-many-requests') {
          errorIcon = '⏱️';
          errorMessage = t('auth.errorTooManyAttempts');

          toast.custom((tCustom: any) => (
            <div className={`bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-lg p-4 shadow-lg max-w-md w-full mx-auto transition-all ${tCustom.visible ? 'animate-in slide-in-from-top-5' : 'animate-out slide-out-to-top-5'}`} dir={isRTL ? "rtl" : "ltr"}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-2xl">{errorIcon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-orange-800 dark:text-orange-200 text-base sm:text-lg mb-1">
                    {errorMessage}
                  </h3>
                  <p className="text-orange-600 dark:text-orange-300 text-sm sm:text-base">
                    {t('auth.suggestWait')}
                  </p>
                </div>
                <button
                  onClick={() => toast.dismiss(tCustom.id)}
                  className="flex-shrink-0 text-orange-400 hover:text-orange-600 transition-colors p-2 -m-2 min-w-[32px] min-h-[32px] flex items-center justify-center"
                  aria-label={t('auth.hidePassword')}
                >
                  ✕
                </button>
              </div>
            </div>
          ), { id: 'login', duration: 6000 });
        } else if (error.code === 'auth/network-request-failed') {
          errorIcon = '🌐';
          errorMessage = t('auth.errorNetwork');

          toast.custom((tCustom: any) => (
            <div className={`bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-4 shadow-lg max-w-md w-full mx-auto transition-all ${tCustom.visible ? 'animate-in slide-in-from-top-5' : 'animate-out slide-out-to-top-5'}`} dir={isRTL ? "rtl" : "ltr"}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-2xl">{errorIcon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-blue-800 dark:text-blue-200 text-base sm:text-lg mb-1">
                    {errorMessage}
                  </h3>
                  <p className="text-blue-600 dark:text-blue-300 text-sm sm:text-base">
                    {t('auth.suggestCheckNetwork')}
                  </p>
                </div>
                <button
                  onClick={() => toast.dismiss(tCustom.id)}
                  className="flex-shrink-0 text-blue-400 hover:text-blue-600 transition-colors p-2 -m-2 min-w-[32px] min-h-[32px] flex items-center justify-center"
                  aria-label={t('auth.hidePassword')}
                >
                  ✕
                </button>
              </div>
            </div>
          ), { id: 'login', duration: 6000 });
        } else if (error.code === 'auth/user-disabled') {
          errorIcon = '🚫';
          errorMessage = t('auth.errorAccountDisabled');

          toast.custom((tCustom: any) => (
            <div className={`bg-gray-50 dark:bg-gray-900/20 border-2 border-gray-300 dark:border-gray-700 rounded-lg p-4 shadow-lg max-w-md w-full mx-auto transition-all ${tCustom.visible ? 'animate-in slide-in-from-top-5' : 'animate-out slide-out-to-top-5'}`} dir={isRTL ? "rtl" : "ltr"}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-2xl">{errorIcon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-800 dark:text-gray-200 text-base sm:text-lg mb-1">
                    {errorMessage}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                    {t('auth.suggestContactSupport')}
                  </p>
                </div>
                <button
                  onClick={() => toast.dismiss(tCustom.id)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-2 -m-2 min-w-[32px] min-h-[32px] flex items-center justify-center"
                  aria-label={t('auth.hidePassword')}
                >
                  ✕
                </button>
              </div>
            </div>
          ), { id: 'login', duration: 6000 });
        } else {
          toast.custom((tCustom: any) => (
            <div className={`bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-4 shadow-lg max-w-md w-full mx-auto transition-all ${tCustom.visible ? 'animate-in slide-in-from-top-5' : 'animate-out slide-out-to-top-5'}`} dir={isRTL ? "rtl" : "ltr"}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-2xl">{errorIcon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-red-800 dark:text-red-200 text-base sm:text-lg mb-1">
                    {errorMessage}
                  </h3>
                  <p className="text-red-600 dark:text-red-300 text-sm sm:text-base">
                    {t('auth.suggestDefault')}
                  </p>
                </div>
                <button
                  onClick={() => toast.dismiss(tCustom.id)}
                  className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors p-2 -m-2 min-w-[32px] min-h-[32px] flex items-center justify-center"
                  aria-label={t('auth.hidePassword')}
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
        toast.custom((tCustom: any) => (
          <div className={`bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-4 shadow-lg max-w-md w-full mx-auto transition-all ${tCustom.visible ? 'animate-in slide-in-from-top-5' : 'animate-out slide-out-to-top-5'}`} dir={isRTL ? "rtl" : "ltr"}>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 text-2xl">{errorIcon}</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-red-800 dark:text-red-200 text-base sm:text-lg mb-1 whitespace-pre-line">
                  {errorMessage}
                </h3>
                <p className="text-red-600 dark:text-red-300 text-sm sm:text-base mb-3">
                  {t('auth.errorAccountIssue')}
                </p>
                <button
                  onClick={() => {
                    toast.dismiss(tCustom.id);
                    router.push('/support');
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm sm:text-base font-medium transition-colors duration-200 shadow-sm"
                >
                  {t('auth.suggestSupportPage')}
                </button>
              </div>
              <button
                onClick={() => toast.dismiss(tCustom.id)}
                className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors p-2 -m-2 min-w-[32px] min-h-[32px] flex items-center justify-center"
                aria-label={t('auth.hidePassword')}
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
      <div className="min-h-screen bg-[#f7f7f8] flex flex-col items-center justify-center px-4 font-cairo" dir={isRTL ? "rtl" : "ltr"}>
        <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-7 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mx-auto mb-4 font-inter text-white">
            <span className="text-3xl">👤</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">{t('auth.alreadyLoggedIn')}</h2>
          <p className="text-sm text-slate-500 mb-6">
            {userData.full_name || userData.name ? `${t('auth.toastGreeting')} ${userData.full_name || userData.name}` : t('auth.toastWelcome')}
          </p>
          <button
            onClick={() => router.replace(dashRoute)}
            className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors mb-3"
          >
            {t('auth.goToDashboard')}
          </button>
          <button
            onClick={async () => {
              await logout();
              window.location.reload();
            }}
            className="w-full h-11 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-lg transition-colors"
          >
            {t('auth.logoutAndSwitch')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f8] flex flex-col items-center justify-center p-4 font-cairo relative" dir={isRTL ? "rtl" : "ltr"}>
      <Toaster position="top-center" dir={isRTL ? "rtl" : "ltr"} richColors />



      {/* OTP Modal */}
      {showOTPModal && (
        <WhatsAppOTPVerification
          phoneNumber={otpPhone}
          isOpen={showOTPModal}
          onVerificationSuccess={handleWhatsAppOTPSuccess}
          onVerificationFailed={(err) => toast.error(err)}
          onClose={() => setShowOTPModal(false)}
          onOTPVerify={handleVerifyOTP}
          title={t('auth.otpTitle')}
          subtitle={t('auth.otpSubtitle')}
        />
      )}

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-8">

        {/* Logo & Language Switcher Row */}
        <div className="flex justify-between items-center mb-6">
          <div className="w-10 h-10 rounded-xl overflow-hidden relative flex items-center justify-center bg-slate-100">
            {branding?.logoUrl ? (
              <Image src={branding.logoUrl} alt={branding.siteName || 'El7lm'} fill className="object-contain p-1.5" />
            ) : (
              <Star className="w-6 h-6 text-slate-700 fill-slate-700" />
            )}
          </div>
          <LanguageSwitcher variant="light" />
        </div>

        {/* Heading */}
        <div className="flex flex-col items-center mb-7 text-center">
          <h1 className="text-xl font-bold text-slate-900">{t('common.login')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('auth.welcomeBack')}</p>
        </div>

        {/* Google */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="w-full h-10 sm:h-11 flex items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-5"
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
              <span>{t('auth.loginWithGoogle')}</span>
            </>
          )}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400">{t('auth.or')}</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Method tabs */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden mb-5 bg-slate-50 p-1 gap-1">
          <button
            type="button"
            onClick={() => { setLoginMethod('phone'); setPhoneStatus('idle'); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm rounded-md transition-all ${
              loginMethod === 'phone'
                ? 'bg-slate-900 text-white font-semibold shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            {t('auth.phone')}
          </button>
          <button
            type="button"
            onClick={() => { setLoginMethod('email'); setPhoneStatus('idle'); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm rounded-md transition-all ${
              loginMethod === 'email'
                ? 'bg-slate-900 text-white font-semibold shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            {t('auth.email')}
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">

          {loginMethod === 'phone' ? (
            <>
              {/* Phone field */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('auth.phoneNumber')}</label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-24 sm:w-28 h-10 sm:h-11 rounded-lg border border-slate-200 bg-white text-xs sm:text-sm text-slate-700 px-2 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  >
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>{c.code} {getTranslatedCountryName(c.code, locale)}</option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="501234567"
                    dir="ltr"
                    required
                    className={`flex-1 h-10 sm:h-11 rounded-lg border bg-white px-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
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
                      <Loader2 className="w-3 h-3 animate-spin" /> {t('auth.checkingPhone')}
                    </span>
                  )}
                  {!phoneFormatError && phoneStatus === 'valid' && (
                    <span className="text-xs text-green-600 font-medium">✓ {t('auth.phoneRegistered')}</span>
                  )}
                  {!phoneFormatError && phoneStatus === 'invalid' && (
                    <span className="text-xs text-red-500">
                      ✗ {t('auth.phoneNotRegistered')} —{' '}
                      <button
                        type="button"
                        onClick={() => router.push('/auth/register')}
                        className="underline hover:text-red-700 transition-colors"
                      >
                        {t('auth.createAccount')}
                      </button>
                    </span>
                  )}
                </div>
              </div>

              {/* Verification Method Selection Cards */}
              <div className="grid grid-cols-2 gap-2.5 mt-3 mb-4">
                {/* WhatsApp OTP Card */}
                <button
                  type="button"
                  onClick={() => setUseOTP(true)}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border-2 transition-all hover:scale-[1.01] ${
                    useOTP
                      ? 'border-emerald-500 bg-emerald-50/30 text-emerald-800'
                      : 'border-slate-200 bg-white hover:border-slate-400 text-slate-600'
                  }`}
                >
                  <svg
                    className={`w-5 h-5 mb-1.5 ${useOTP ? 'fill-emerald-600 text-emerald-600' : 'fill-slate-400 text-slate-400'}`}
                    viewBox="0 0 24 24"
                  >
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003 5.219 5.221 0 11.64 0 14.755.001 17.67 1.21 19.87 3.412c2.202 2.2 3.41 5.114 3.411 8.23 0 6.422-5.218 11.64-11.637 11.64-1.994-.001-3.957-.515-5.694-1.492L0 24zm6.59-4.846c1.6.95 3.197 1.451 4.985 1.452 5.378 0 9.754-4.374 9.756-9.754a9.71 9.71 0 0 0-2.848-6.895A9.711 9.711 0 0 0 11.64 1.887c-5.38 0-9.755 4.377-9.757 9.756-.001 1.774.462 3.51 1.342 5.043l-.97 3.546 3.633-.953zm11.238-6.195c-.3-.15-1.774-.875-2.046-.974-.272-.1-.47-.15-.668.15-.198.3-.768.974-.942 1.173-.173.2-.347.225-.648.075-.3-.15-1.263-.465-2.403-1.485-.888-.79-1.487-1.77-1.661-2.07-.174-.3-.019-.462.13-.61.135-.133.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.668-1.61-.915-2.205-.24-.58-.48-.5-.668-.51-.173-.01-.371-.01-.57-.01-.197 0-.52.075-.792.375-.272.3-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.2 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.774-.725 2.02-.1425.247-.699.247-1.299.173-1.425-.073-.125-.27-.2-.57-.35z"/>
                  </svg>
                  <span className="text-xs sm:text-sm font-semibold">{t('auth.loginWithOTP')}</span>
                </button>

                {/* Password Card */}
                <button
                  type="button"
                  onClick={() => setUseOTP(false)}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border-2 transition-all hover:scale-[1.01] ${
                    !useOTP
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white hover:border-slate-400 text-slate-600'
                  }`}
                >
                  <Lock className={`w-5 h-5 mb-1.5 ${!useOTP ? 'text-white' : 'text-slate-400'}`} />
                  <span className="text-xs sm:text-sm font-semibold">{t('auth.passwordLabel')}</span>
                </button>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('auth.emailLabel')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                dir="ltr"
                required
                className="w-full h-10 sm:h-11 rounded-lg border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              />
            </div>
          )}

          {/* Password */}
          {(loginMethod === 'email' || !useOTP) && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-slate-700">{t('auth.passwordLabel')}</label>
                <button
                  type="button"
                  onClick={() => router.push('/auth/forgot-password')}
                  className="text-xs text-slate-500 hover:text-slate-900 transition-colors"
                >
                  {t('auth.forgotPassword')}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required={!useOTP}
                  className={`w-full h-10 sm:h-11 rounded-lg border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all ${
                    isRTL ? 'pl-10 text-right pr-3' : 'pr-10 text-left pl-3'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors ${
                    isRTL ? 'left-3' : 'right-3'
                  }`}
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  title={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
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
            className="w-full h-10 sm:h-11 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              useOTP && loginMethod === 'phone' ? t('auth.sendOTP') : t('common.login')
            )}
          </button>
        </form>

        {/* Register link */}
        <p className="text-center text-sm text-slate-500 mt-6">
          {t('auth.noAccount')}{' '}
          <button
            type="button"
            onClick={() => router.push('/auth/register')}
            className="text-slate-900 font-semibold hover:underline"
          >
            {t('auth.createAccount')}
          </button>
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-4 mt-6 text-xs text-slate-400">
        <a href="/terms" className="hover:text-slate-600 transition-colors">{t('auth.terms')}</a>
        <span>·</span>
        <a href="/privacy" className="hover:text-slate-600 transition-colors">{t('auth.privacy')}</a>
        <span>·</span>
        <a href="/support" className="hover:text-slate-600 transition-colors">{t('auth.support')}</a>
      </div>
    </div>
  );
}
