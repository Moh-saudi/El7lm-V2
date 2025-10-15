'use client';

import { useAuth } from '@/lib/firebase/auth-provider';
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
import { toast } from 'sonner';

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

// NEW: Testimonials section
const testimonials = [
  {
    quote: "منصة الحلم غيرت مسيرتي الكروية. وجدت فرصة احتراف حقيقية في نادٍ لم أكن لأصل إليه لولاهم.",
    author: "أحمد علي",
    role: "لاعب كرة قدم",
    avatar: "/avatars/player-01.jpg"
  },
  {
    quote: "كوكلاء لاعبين، نبحث دائماً عن المواهب الواعدة. الحلم هي أداتنا الأولى لاكتشاف النجوم القادمين.",
    author: "شركة برو إيجنت",
    role: "وكيل لاعبين معتمد",
    avatar: "/avatars/agent-01.png"
  },
  {
    quote: "عملية استقطاب اللاعبين أصبحت أسهل بكثير. قاعدة البيانات الضخمة والتقييمات الدقيقة توفر علينا الكثير من الوقت والجهد.",
    author: "نادي النجوم السعودي",
    role: "إدارة نادي رياضي",
    avatar: "/avatars/club-01.png"
  },
  {
    quote: "أقوم بتدريب لاعبين صغار، ومنصة الحلم هي النافذة التي يرون بها مستقبلهم الاحترافي. إنها تلهمهم كل يوم.",
    author: "كابتن محمود السيد",
    role: "مدرب فئات سنية",
    avatar: "/avatars/trainer-01.jpg"
  }
];


export default function LoginPage() {
  const router = useRouter();
  const { login, user, userData, loading: authLoading } = useAuth();

  const [loginMethod, setLoginMethod] = useState<LoginMethod>('phone');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+20');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  // Rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setTestimonialIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000); // Change testimonial every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Load Remember Me data
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
        const fullPhone = `${countryCode}${phone.replace(/^0+/, '')}`;
        toast.loading('جاري التحقق...', { id: 'login' });
        const firebaseEmail = await findFirebaseEmailByPhone(fullPhone);
        if (!firebaseEmail) {
          toast.error('❌ رقم الهاتف غير مسجل', { id: 'login', duration: 4000 });
          toast.info('💡 يرجى إنشاء حساب جديد', { duration: 4000 });
          setLoading(false);
          return;
        }
        loginEmail = firebaseEmail;
      }

      if (!password) {
        toast.error('يرجى إدخال كلمة المرور');
        setLoading(false);
        return;
      }

      toast.loading('جاري تسجيل الدخول...', { id: 'login' });
      const result = await login(loginEmail, password);

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
          toast.error(`${errorIcon} ${errorMessage}`, { id: 'login', duration: 4000 });
          toast.info('💡 يرجى إنشاء حساب جديد', { duration: 4000 });
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

            if (verifyResponse.ok) {
              const verifyData = await verifyResponse.json();
              console.log('[Sync Check] Response data:', verifyData);

              if (verifyData.needsSync) {
                errorMessage = 'حسابك يحتاج إلى تفعيل';
                toast.error(`⚠️ ${errorMessage}`, { id: 'login', duration: 5000 });
                toast.info('💡 يرجى استخدام "نسيت كلمة المرور؟" لتفعيل حسابك', { duration: 7000 });
                setLoading(false);
                return;
              } else {
                console.log('[Sync Check] User does not need sync. Showing wrong password message.');
              }
            } else {
               console.log('[Sync Check] Verification request failed.');
            }
          } catch (verifyError) {
            console.error('[Sync Check] Error during verification fetch:', verifyError);
          }

          errorMessage = 'كلمة المرور غير صحيحة';
          toast.error(`${errorIcon} ${errorMessage}`, { id: 'login', duration: 4000 });
          toast.info('💡 يمكنك استخدام "نسيت كلمة المرور؟"', { duration: 5000 });
        } else if (error.code === 'auth/too-many-requests') {
          errorIcon = '⏱️';
          errorMessage = 'تم تجاوز عدد المحاولات';
          toast.error(`${errorIcon} ${errorMessage}`, { id: 'login', duration: 4000 });
        } else if (error.code === 'auth/network-request-failed') {
          errorIcon = '🌐';
          errorMessage = 'خطأ في الاتصال';
          toast.error(`${errorIcon} ${errorMessage}`, { id: 'login', duration: 4000 });
        } else if (error.code === 'auth/user-disabled') {
          errorIcon = '🚫';
          errorMessage = 'تم تعطيل الحساب';
          toast.error(`${errorIcon} ${errorMessage}`, { id: 'login', duration: 4000 });
        } else {
          toast.error(`${errorIcon} ${errorMessage}`, { id: 'login', duration: 4000 });
        }
      }
      setLoading(false);
    }
  };

  if (user && userData && !authLoading) {
    router.replace(getDashboardRoute(userData.accountType));
    return null;
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100" dir="rtl">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-purple-600 animate-spin" />
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50" dir="rtl">
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-12 gap-8 max-w-6xl mx-auto">

          {/* Login Form Panel (Right on desktop, first on mobile) */}
          <div className="md:col-span-6 order-1 md:order-2 bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-2xl mb-4">
                <Shield className="w-8 h-8 text-purple-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">مرحباً بعودتك!</h1>
              <p className="text-gray-600">ادخل إلى حسابك واكمل رحلتك نحو الاحتراف</p>
            </div>

            {/* Login Method Toggle */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg mb-6">
              <button
                type="button"
                onClick={() => setLoginMethod('phone')}
                className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                  loginMethod === 'phone'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Phone className="inline-block w-4 h-4 ml-2" />
                رقم الهاتف
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('email')}
                className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                  loginMethod === 'email'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Mail className="inline-block w-4 h-4 ml-2" />
                البريد الإلكتروني
              </button>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              {loginMethod === 'phone' ? (
                <>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">البلد</label>
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="w-full py-2.5 px-4 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                      aria-label="اختر البلد"
                    >
                      {countries.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name} ({country.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">رقم الهاتف</label>
                    <div className="flex">
                      <div className="flex items-center px-3 text-sm bg-gray-50 rounded-r-lg border border-l-0 border-gray-300">
                        {countryCode}
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                        className="flex-1 py-2.5 px-4 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition text-left"
                        placeholder="1012345678"
                        required
                        dir="ltr"
                        autoComplete="tel"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">البريد الإلكتروني</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full py-2.5 pr-10 pl-4 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                      placeholder="example@mail.com"
                      required
                      autoComplete="email"
                    />
                    <Mail className="absolute right-3 top-1/2 w-5 h-5 text-gray-400 -translate-y-1/2" />
                  </div>
                </div>
              )}

              {/* Password Field */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">كلمة المرور</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full py-2.5 pr-10 pl-10 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    placeholder="********"
                    required
                    autoComplete="current-password"
                  />
                  <Lock className="absolute right-3 top-1/2 w-5 h-5 text-gray-400 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 text-gray-400 -translate-y-1/2 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-600">تذكرني</span>
                </label>
                <button
                  type="button"
                  onClick={() => router.push('/auth/forgot-password')}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 px-6 text-white font-semibold rounded-lg transition-all ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 shadow-lg hover:shadow-xl'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="inline-block w-5 h-5 ml-2 animate-spin" />
                    جاري تسجيل الدخول...
                  </>
                ) : (
                  'دخول'
                )}
              </button>

              {/* Register Link */}
              <div className="text-center pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  ليس لديك حساب؟{' '}
                  <button
                    type="button"
                    onClick={() => router.push('/auth/register')}
                    className="text-purple-600 hover:text-purple-700 font-semibold"
                  >
                    سجّل الآن
                  </button>
                </p>
              </div>
            </form>
          </div>

          {/* Testimonials Panel (Left on desktop, second on mobile) */}
          <div className="md:col-span-6 order-2 md:order-1 bg-gradient-to-br from-purple-600 to-purple-900 rounded-2xl p-8 flex flex-col justify-center text-white shadow-2xl">
            <div className="space-y-8">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-white/20 backdrop-blur-sm rounded-full mb-6">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">شهادات ثقة من مستخدمينا</span>
                </div>
                <h2 className="text-3xl font-bold mb-2">ابدأ رحلتك بثقة</h2>
                <p className="text-purple-100 text-lg">آراء من لاعبين، أندية، ومدربين</p>
              </div>

              <div className="space-y-4">
                {testimonials.map((t, idx) => (
                  <div key={idx} className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                    <p className="text-purple-50 leading-relaxed mb-3">"{t.quote}"</p>
                    <div className="text-sm text-purple-200">
                      <span className="font-semibold">{t.author}</span> — {t.role}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
