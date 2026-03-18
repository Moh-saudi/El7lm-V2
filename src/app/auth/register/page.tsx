'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useAuth } from '@/lib/firebase/auth-provider';
import { signOut } from 'firebase/auth';
import { getBrandingData, BrandingData } from '@/lib/content/branding-service';
import { countries } from '@/lib/constants/countries';
import { validatePhoneForCountry } from '@/lib/validation/phone-validation';
import { toast, Toaster } from 'sonner';
import Image from 'next/image';
import { Loader2, Star, ChevronRight, X } from 'lucide-react';
import type { UserRole } from '@/types';

type Step = 'phone' | 'otp';

const getDashboardRoute = (accountType: string) => {
  const routes: Record<string, string> = {
    player: '/dashboard/player',
    club: '/dashboard/club',
    agent: '/dashboard/agent',
    academy: '/dashboard/academy',
    trainer: '/dashboard/trainer',
    marketer: '/dashboard/marketer',
    admin: '/dashboard/admin',
  };
  return routes[accountType] || '/dashboard';
};

const accountTypes = [
  { value: 'player',   label: 'لاعب',     emoji: '⚽', desc: 'لاعب كرة قدم' },
  { value: 'club',     label: 'نادي',      emoji: '🏟️', desc: 'نادي رياضي' },
  { value: 'academy',  label: 'أكاديمية',  emoji: '🎓', desc: 'أكاديمية تدريب' },
  { value: 'agent',    label: 'وكيل',      emoji: '🤝', desc: 'وكيل لاعبين' },
  { value: 'trainer',  label: 'مدرب',      emoji: '💪', desc: 'مدرب رياضي' },
  { value: 'marketer', label: 'مسوّق',     emoji: '📢', desc: 'مسوّق رياضي' },
];

const TERMS_TEXT = `شروط وأحكام منصة الحلم

1. الأهلية والتسجيل
يجب أن لا يقل عمر المستخدم عن 18 عاماً، أو بموافقة ولي الأمر إن كان أصغر. تتعهد بأن جميع البيانات المدخلة صحيحة.

2. طبيعة الخدمات
منصة "الحلم" توفر أدوات تحليلية وفرص عرض أمام الأندية، لكنها لا تضمن الاحتراف أو تحقيق دخل مالي للاعب.

3. الاشتراكات والمدفوعات
تقبل المنصة المدفوعات الإلكترونية فقط. رسوم الاشتراكات غير قابلة للاسترداد بعد تفعيل الخدمة.

4. الملكية الفكرية
جميع الخوارزميات والشعارات هي ملكية حصرية لشركة ميسك. بمجرد رفع أي فيديو، تمنح المنصة ترخيصاً لاستخدامه في التحليل والتسويق.

5. الخصوصية
نجمع بيانات شخصية (الاسم، الهاتف) وبيانات رياضية لتقديم الخدمة. يحق لك طلب حذف حسابك عبر info@el7lm.com.

6. القانون الواجب التطبيق
تخضع هذه الشروط لقوانين دولة قطر، ويتم الفصل في النزاعات عبر التحكيم في الدوحة.

بضغطك على "إرسال رمز التحقق" فإنك توافق على جميع البنود أعلاه.`;

export default function RegisterPage() {
  const router = useRouter();
  const { signInWithGoogle, user, userData, loading: authLoading } = useAuth();

  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [step, setStep] = useState<Step>('phone');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Step 1
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<UserRole>('player');
  const [selectedCountry, setSelectedCountry] = useState(
    () => countries.find(c => c.code === '+20') || countries[0]
  );
  const [phone, setPhone] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Step 2 — OTP
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendSeconds, setResendSeconds] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const resendTimer = useRef<NodeJS.Timeout | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');
  const [phoneFormatError, setPhoneFormatError] = useState<string | null>(null);
  const [phoneExistsError, setPhoneExistsError] = useState<string | null>(null);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const phoneCheckTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    getBrandingData().then(setBranding).catch(() => {});
  }, []);

  const [forceRegister, setForceRegister] = useState(false);

  // Auto-detect country
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(data => {
        const map: Record<string, string> = {
          SA: '+966', AE: '+971', KW: '+965', QA: '+974', BH: '+973',
          OM: '+968', EG: '+20', JO: '+962', LB: '+961', IQ: '+964',
          SY: '+963', MA: '+212', DZ: '+213', TN: '+216', LY: '+218',
          SD: '+249', YE: '+967', TR: '+90', FR: '+33', GB: '+44',
        };
        const code = map[data.country_code];
        if (code) {
          const c = countries.find(x => x.code === code);
          if (c) setSelectedCountry(c);
        }
      })
      .catch(() => {});
  }, []);

  const startResendTimer = useCallback(() => {
    setResendSeconds(30);
    setCanResend(false);
    if (resendTimer.current) clearInterval(resendTimer.current);
    resendTimer.current = setInterval(() => {
      setResendSeconds(prev => {
        if (prev <= 1) { clearInterval(resendTimer.current!); setCanResend(true); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => { if (resendTimer.current) clearInterval(resendTimer.current); }, []);

  const fullPhone = `${selectedCountry.code}${phone.replace(/^0+/, '').trim()}`;

  const showWelcomePopup = (name: string, route: string) => {
    setWelcomeName((name || '').split(' ')[0]);
    setWelcomeVisible(true);
    setTimeout(() => { window.location.href = route; }, 3200);
  };

  // 🛡️ Real-time phone format validation
  useEffect(() => {
    const cleanPhone = phone.replace(/^0+/, '').trim().replace(/\D/g, '');
    if (cleanPhone.length < 4) {
      setPhoneFormatError(null);
      return;
    }
    const error = validatePhoneForCountry(cleanPhone, selectedCountry.code);
    setPhoneFormatError(error);
  }, [phone, selectedCountry]);

  // 🛡️ Debounced phone existence check
  useEffect(() => {
    const cleanPhone = phone.replace(/^0+/, '').trim().replace(/\D/g, '');
    if (cleanPhone.length < 7 || phoneFormatError) {
      setPhoneExistsError(null);
      return;
    }
    if (phoneCheckTimer.current) clearTimeout(phoneCheckTimer.current);
    setCheckingPhone(true);
    phoneCheckTimer.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/check-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: `${selectedCountry.code}${cleanPhone}` }),
        });
        const data = await res.json();
        if (data.exists) {
          const typeLabels: Record<string, string> = {
            player: 'لاعب', club: 'نادي', academy: 'أكاديمية',
            agent: 'وكيل', trainer: 'مدرب', marketer: 'مسوّق', admin: 'مدير',
          };
          const typeName = typeLabels[data.accountType] || data.accountType || '';
          setPhoneExistsError(typeName ? `هذا الرقم مسجل بالفعل كـ "${typeName}" — يمكنك تسجيل الدخول` : 'هذا الرقم مسجل بالفعل — يمكنك تسجيل الدخول');
        } else {
          setPhoneExistsError(null);
        }
      } catch {
        setPhoneExistsError(null);
      } finally {
        setCheckingPhone(false);
      }
    }, 700);
    return () => { if (phoneCheckTimer.current) clearTimeout(phoneCheckTimer.current); };
  }, [phone, selectedCountry, phoneFormatError]);

  /* ─── Step 1: Send OTP ─── */
  const handleSendOTP = async () => {
    if (!agreedToTerms) {
      toast.error('يجب الموافقة على الشروط والأحكام أولاً');
      return;
    }
    if (!name.trim()) {
      toast.error('يرجى إدخال اسمك الكامل');
      return;
    }
    const cleanPhone = phone.replace(/^0+/, '').trim();
    if (cleanPhone.length < 7) {
      toast.error('يرجى إدخال رقم واتساب صحيح');
      return;
    }

    // 🛡️ Security: Validate phone format matches the selected country code
    const formatError = validatePhoneForCountry(cleanPhone, selectedCountry.code);
    if (formatError) {
      toast.error(`⚠️ ${formatError}`);
      return;
    }
    // 🛡️ Security: Block registration with already-registered phone
    if (phoneExistsError) {
      toast.error(phoneExistsError);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: fullPhone, purpose: 'registration', channel: 'whatsapp' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'فشل إرسال الرمز');

      toast.success('تم إرسال رمز التحقق عبر WhatsApp ✅');
      setOtp(['', '', '', '', '', '']);
      setStep('otp');
      startResendTimer();
      setTimeout(() => otpRefs.current[0]?.focus(), 150);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ─── Step 2: OTP handlers ─── */
  const handleOTPChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
    if (newOtp.every(Boolean) && newOtp.join('').length === 6) handleVerifyOTP(newOtp.join(''));
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleOTPPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newOtp = Array(6).fill('');
    for (let i = 0; i < pasted.length; i++) newOtp[i] = pasted[i];
    setOtp(newOtp);
    if (pasted.length === 6) handleVerifyOTP(pasted);
    else otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  /* ─── Step 2: Verify OTP → route ─── */
  const handleVerifyOTP = async (otpCode: string) => {
    if (verifyLoading) return;
    setVerifyLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp-and-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: fullPhone, otp: otpCode }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error || 'رمز غير صحيح');
        setOtp(['', '', '', '', '', '']);
        setTimeout(() => otpRefs.current[0]?.focus(), 50);
        setVerifyLoading(false);
        return;
      }

      if (!data.isNew) {
        // Existing user — check if selected type matches
        if (data.accountType && data.accountType !== accountType) {
          const typeLabels: Record<string, string> = {
            player: 'لاعب', club: 'نادي', academy: 'أكاديمية',
            agent: 'وكيل', trainer: 'مدرب', marketer: 'مسوّق', admin: 'مدير',
          };
          toast.error(`هذا الرقم مسجل بالفعل كـ "${typeLabels[data.accountType] || data.accountType}" — سيتم توجيهك للوحتك`);
        }
        await signInWithCustomToken(auth, data.customToken);
        showWelcomePopup(data.userName || '', getDashboardRoute(data.accountType));
      } else {
        const createRes = await fetch('/api/auth/create-user-with-phone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: fullPhone, accountType, name: name.trim() }),
        });
        const createData = await createRes.json();
        if (!createRes.ok || !createData.success) throw new Error(createData.error || 'فشل إنشاء الحساب');

        await signInWithCustomToken(auth, createData.customToken);
        showWelcomePopup(createData.userName || name.trim(), getDashboardRoute(createData.accountType || accountType));
      }
    } catch (err: any) {
      toast.error(err.message);
      setVerifyLoading(false);
    }
  };

  /* ─── Resend OTP ─── */
  const handleResend = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: fullPhone, purpose: 'registration', channel: 'whatsapp' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'فشل إعادة الإرسال');
      toast.success('تم إعادة الإرسال ✅');
      setOtp(['', '', '', '', '', '']);
      startResendTimer();
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ─── Google ─── */
  const handleGoogleSignIn = async () => {
    if (!agreedToTerms) {
      toast.error('يجب الموافقة على الشروط والأحكام أولاً');
      return;
    }
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle(accountType);
      showWelcomePopup(result.userData.full_name || (result.userData as any).name || '', getDashboardRoute(result.userData.accountType || accountType));
    } catch (err: any) {
      toast.error(err.message || 'فشل تسجيل الدخول بـ Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#f7f7f8]">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  // Already logged in — show options instead of auto-redirecting
  if (user && userData && !forceRegister) {
    const dashRoute = getDashboardRoute(userData.accountType);
    return (
      <div className="min-h-screen bg-[#f7f7f8] flex flex-col items-center justify-center px-4 font-cairo" dir="rtl">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-7 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">👋</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">أنت مسجل الدخول بالفعل</h2>
          <p className="text-sm text-slate-500 mb-6">
            {(userData as any).full_name ? `مرحباً ${(userData as any).full_name}` : 'يمكنك الذهاب إلى لوحة التحكم'}
          </p>
          <button
            onClick={() => router.replace(dashRoute)}
            className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors mb-3"
          >
            الذهاب إلى لوحة التحكم
          </button>
          <button
            onClick={async () => { await signOut(auth); setForceRegister(true); }}
            className="w-full h-11 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-lg transition-colors"
          >
            تسجيل خروج وإنشاء حساب جديد
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f8] flex flex-col items-center justify-center py-4 sm:py-10 px-4 font-cairo" dir="rtl">
      <Toaster position="top-center" dir="rtl" richColors />

      {/* Welcome Popup */}
      {welcomeVisible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative bg-white rounded-3xl shadow-2xl px-8 py-10 flex flex-col items-center text-center max-w-xs w-full mx-4 animate-in zoom-in-95 duration-300">
            {/* Confetti dots */}
            <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-yellow-400 opacity-80" />
            <div className="absolute -top-1 left-4 w-4 h-4 rounded-full bg-emerald-400 opacity-80" />
            <div className="absolute -bottom-2 -left-2 w-5 h-5 rounded-full bg-blue-400 opacity-70" />
            <div className="absolute bottom-4 -right-2 w-3 h-3 rounded-full bg-pink-400 opacity-80" />

            {/* Icon */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center mb-5 shadow-lg">
              <span className="text-4xl">🏆</span>
            </div>

            {/* Text */}
            <h2 className="text-xl font-extrabold text-slate-900 mb-2">
              {welcomeName ? `مرحباً ${welcomeName}!` : 'مرحباً بك!'}
            </h2>
            <p className="text-2xl font-black text-slate-900 leading-snug mb-3">
              خطوة واحدة<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-500">
                تفصلك عن الاحتراف
              </span>
            </p>
            <p className="text-sm text-slate-500 mb-6">
              حسابك جاهز — ابدأ رحلتك نحو القمة الآن 🚀
            </p>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-slate-800 to-slate-600 rounded-full"
                style={{ animation: 'progress-fill 3s linear forwards' }}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-2">جارٍ الانتقال إلى لوحة التحكم...</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes progress-fill {
          from { width: 0% }
          to { width: 100% }
        }
      `}</style>

      {/* Terms Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">الشروط والأحكام</h2>
              <button onClick={() => setShowTermsModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 max-h-[55vh] overflow-y-auto">
              <pre className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-cairo">{TERMS_TEXT}</pre>
            </div>
            <div className="px-5 py-4 border-t border-slate-100">
              <button
                onClick={() => { setAgreedToTerms(true); setShowTermsModal(false); }}
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                أوافق على الشروط والأحكام
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress dots */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`transition-all duration-300 rounded-full ${step === 'phone' ? 'w-6 h-2 bg-slate-900' : 'w-2 h-2 bg-slate-400'}`} />
        <div className={`transition-all duration-300 rounded-full ${step === 'otp' ? 'w-6 h-2 bg-slate-900' : 'w-2 h-2 bg-slate-200'}`} />
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-8">

        {/* Logo + heading */}
        <div className="flex flex-col items-center mb-5 sm:mb-7">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden relative mb-3 flex items-center justify-center bg-slate-100">
            {branding?.logoUrl ? (
              <Image src={branding.logoUrl} alt={branding.siteName || 'El7lm'} fill className="object-contain p-1.5" />
            ) : (
              <Star className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700 fill-slate-700" />
            )}
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">
            {step === 'phone' ? 'إنشاء حساب' : 'رمز التحقق'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 text-center">
            {step === 'phone'
              ? 'اختر نوعك وأدخل بياناتك'
              : `مرحباً ${name}، أُرسل رمز التحقق عبر WhatsApp`}
          </p>
        </div>

        {/* ══ STEP 1 ══ */}
        {step === 'phone' && (
          <div className="space-y-3 sm:space-y-4">

            {/* Account type — pills on mobile / cards on desktop */}
            <div>
              <p className="text-[10px] sm:text-xs font-semibold text-slate-400 mb-2 uppercase tracking-widest">أنا...</p>

              {isDesktop ? (
                /* Desktop: 3×2 cards */
                <div className="grid grid-cols-3 gap-2">
                  {accountTypes.map(t => {
                    const active = accountType === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setAccountType(t.value as UserRole)}
                        className={`relative flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border-2 transition-all hover:scale-[1.02] ${
                          active
                            ? 'border-slate-900 bg-slate-900'
                            : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        {active && (
                          <svg className="absolute top-1.5 left-1.5 w-3 h-3 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                        <span className="text-xl leading-none">{t.emoji}</span>
                        <span className={`text-xs font-semibold ${active ? 'text-white' : 'text-slate-600'}`}>
                          {t.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Mobile: horizontal pills */
                <div className="flex flex-wrap gap-1.5">
                  {accountTypes.map(t => {
                    const active = accountType === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setAccountType(t.value as UserRole)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all active:scale-95 ${
                          active
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                        }`}
                      >
                        <span className="text-sm leading-none">{t.emoji}</span>
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="h-px bg-slate-100" />

            {/* Google */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full h-10 sm:h-11 flex items-center justify-center gap-2.5 rounded-lg border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
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
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400">أو عبر WhatsApp</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Full Name */}
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
              placeholder="الاسم الكامل"
              maxLength={60}
              className="w-full h-10 sm:h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
            />

            {/* Country + Phone */}
            <div className="flex gap-2">
              <select
                value={selectedCountry.code}
                onChange={e => {
                  const c = countries.find(x => x.code === e.target.value);
                  if (c) { setSelectedCountry(c); setPhone(''); setPhoneExistsError(null); }
                }}
                className="w-24 sm:w-28 h-10 sm:h-11 rounded-lg border border-slate-200 bg-white text-xs sm:text-sm text-slate-700 px-2 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              >
                {countries.map(c => (
                  <option key={c.code} value={c.code}>{c.code} {c.name}</option>
                ))}
              </select>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
                placeholder="رقم الواتساب"
                dir="ltr"
                maxLength={selectedCountry.phoneLength + 1}
                className={`flex-1 h-10 sm:h-11 rounded-lg border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                  phoneExistsError
                    ? 'border-red-400 focus:ring-red-400'
                    : phoneFormatError
                    ? 'border-orange-400 focus:ring-orange-400'
                    : 'border-slate-200 focus:ring-slate-900'
                }`}
              />
            </div>
            {/* 🛡️ Phone format validation feedback */}
            {phoneFormatError && !phoneExistsError && (
              <p className="text-xs text-orange-600 font-medium mt-1">⚠️ {phoneFormatError}</p>
            )}
            {/* 🛡️ Phone already registered feedback */}
            {checkingPhone && phone.length >= 7 && !phoneFormatError && (
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> جاري التحقق من الرقم...
              </p>
            )}
            {phoneExistsError && (
              <p className="text-xs text-red-600 font-medium mt-1">
                🚫 {phoneExistsError}{' '}
                <button
                  type="button"
                  onClick={() => router.push('/auth/login')}
                  className="underline font-bold hover:text-red-800"
                >
                  سجّل الدخول
                </button>
              </p>
            )}

            {/* Terms */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div
                onClick={() => setAgreedToTerms(v => !v)}
                className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 rounded sm:rounded-md border-2 flex items-center justify-center transition-all ${
                  agreedToTerms ? 'bg-slate-900 border-slate-900' : 'border-slate-300 hover:border-slate-500'
                }`}
              >
                {agreedToTerms && (
                  <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                  </svg>
                )}
              </div>
              <span className="text-xs sm:text-sm text-slate-500">
                أوافق على{' '}
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setShowTermsModal(true); }}
                  className="text-slate-900 font-semibold underline underline-offset-2 hover:text-slate-700"
                >
                  الشروط والأحكام
                </button>
              </span>
            </label>

            {/* Submit */}
            <button
              type="button"
              onClick={handleSendOTP}
              disabled={loading || !agreedToTerms || phone.length < 7 || !!phoneFormatError || !!phoneExistsError || checkingPhone}
              className="w-full h-10 sm:h-11 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إرسال رمز التحقق عبر WhatsApp'}
            </button>

            <p className="text-center text-xs sm:text-sm text-slate-500">
              لديك حساب؟{' '}
              <button
                type="button"
                onClick={() => router.push('/auth/login')}
                className="text-slate-900 font-semibold hover:underline"
              >
                تسجيل الدخول
              </button>
            </p>
          </div>
        )}

        {/* ══ STEP 2: OTP ══ */}
        {step === 'otp' && (
          <div className="space-y-4 sm:space-y-5">

            {/* Type badge */}
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-xs text-slate-600 font-medium">
                <span>{accountTypes.find(t => t.value === accountType)?.emoji}</span>
                <span>{accountTypes.find(t => t.value === accountType)?.label}</span>
                <button
                  type="button"
                  onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); }}
                  className="text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* OTP boxes */}
            <div className="flex justify-center gap-2 sm:gap-2.5" dir="ltr">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOTPChange(i, e.target.value)}
                  onKeyDown={e => handleOTPKeyDown(i, e)}
                  onPaste={i === 0 ? handleOTPPaste : undefined}
                  disabled={verifyLoading || loading}
                  className={`w-10 h-12 sm:w-11 sm:h-13 text-center text-lg font-bold rounded-xl border-2 transition-all focus:outline-none ${
                    digit
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-900 focus:border-slate-900'
                  } disabled:opacity-50`}
                />
              ))}
            </div>

            {verifyLoading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                <p className="text-xs text-slate-400">جاري التحقق وإنشاء حسابك...</p>
              </div>
            ) : (
              <div className="text-center">
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={loading}
                    className="text-sm text-slate-900 font-semibold hover:underline disabled:opacity-50"
                  >
                    إعادة إرسال الرمز
                  </button>
                ) : (
                  <p className="text-sm text-slate-400">
                    إعادة الإرسال خلال{' '}
                    <span className="font-mono font-bold text-slate-600">
                      0:{String(resendSeconds).padStart(2, '0')}
                    </span>
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); }}
              className="w-full flex items-center justify-center gap-1 text-sm text-slate-400 hover:text-slate-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
              تغيير الرقم أو نوع الحساب
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-4 mt-5 text-xs text-slate-400">
        <button type="button" onClick={() => setShowTermsModal(true)} className="hover:text-slate-600 transition-colors">الشروط</button>
        <span>·</span>
        <a href="/privacy" className="hover:text-slate-600 transition-colors">الخصوصية</a>
        <span>·</span>
        <a href="/support" className="hover:text-slate-600 transition-colors">المساعدة</a>
      </div>
    </div>
  );
}
