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
    Star,
    Trophy
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
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900" dir="rtl">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-purple-600 animate-spin" />
          <p className="text-gray-600 dark:text-gray-300">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black" dir="rtl">
      <div className="grid grid-cols-1 lg:grid-cols-2 h-screen">
        
        {/* Left Panel: Testimonials */}
        <div className="hidden lg:flex flex-col justify-center items-center bg-gray-900 p-12 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-purple-900/40 opacity-20"></div>
          <div className="absolute top-0 left-0 w-72 h-72 bg-purple-600/30 rounded-full filter blur-3xl opacity-50 animate-blob"></div>
          <div className="absolute bottom-0 right-0 w-72 h-72 bg-indigo-600/30 rounded-full filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>

          <div className="z-10 w-full max-w-md">
            <div className="mb-8 text-center">
              <Shield className="w-16 h-16 mx-auto mb-4 text-purple-400" />
              <h2 className="text-3xl font-bold">انضم إلى مجتمع الأبطال</h2>
              <p className="mt-2 text-purple-200">اكتشف لماذا يثق بنا آلاف الرياضيين حول العالم</p>
            </div>
            
            <div className="relative h-48">
              {testimonials.map((item, index) => (
                <div key={index} className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === testimonialIndex ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm">
                    <p className="text-lg italic mb-4">"{item.quote}"</p>
                    <div className="flex items-center">
                      {/* You can add avatars here if you have them */}
                      <div>
                        <p className="font-semibold">{item.author}</p>
                        <p className="text-sm text-purple-300">{item.role}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel: Login Form */}
        <div className="flex flex-col justify-center items-center p-8 bg-gray-50 dark:bg-gray-950">
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">مرحباً بعودتك!</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">سجل دخولك وانطلق نحو حلمك</p>
            </div>
            
            {/* Login Method Toggle */}
            <div className="flex gap-2 p-1 bg-gray-200 dark:bg-gray-800 rounded-lg mb-6">
              <button
                type="button"
                onClick={() => setLoginMethod('phone')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  loginMethod === 'phone'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Phone className="inline-block w-4 h-4 ml-1" />
                رقم الهاتف
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('email')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  loginMethod === 'email'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Mail className="inline-block w-4 h-4 ml-1" />
                البريد الإلكتروني
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {loginMethod === 'phone' ? (
                <>
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">البلد</label>
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="w-full py-2.5 px-3 text-sm rounded-lg border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition text-gray-900 dark:text-white"
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
                    <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">رقم الهاتف</label>
                    <div className="flex">
                      <div className="flex items-center px-3 text-sm bg-gray-100 dark:bg-gray-700 rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                        {countryCode}
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                        className="flex-1 py-2.5 px-3 text-sm border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded-l-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition text-left text-gray-900 dark:text-white"
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
                  <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">البريد الإلكتروني</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full py-2.5 pr-10 pl-3 text-sm rounded-lg border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition text-gray-900 dark:text-white"
                      placeholder="example@mail.com"
                      required
                      autoComplete="email"
                    />
                    <Mail className="absolute right-3 top-1/2 w-5 h-5 text-gray-400 -translate-y-1/2" />
                  </div>
                </div>
              )}

              <div>
                <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">كلمة المرور</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full py-2.5 pr-10 pl-10 text-sm rounded-lg border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition text-gray-900 dark:text-white"
                    placeholder="********"
                    required
                    autoComplete="current-password"
                  />
                  <Lock className="absolute right-3 top-1/2 w-5 h-5 text-gray-400 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 text-gray-400 -translate-y-1/2 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-gray-600 dark:text-gray-300">تذكرني</span>
                </label>
                <button
                  type="button"
                  onClick={() => router.push('/auth/forgot-password')}
                  className="text-purple-600 hover:text-purple-700 dark:hover:text-purple-500 font-medium"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 px-4 text-sm text-white font-semibold rounded-lg transition-all ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/30 hover:shadow-xl'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="inline-block w-5 h-5 ml-2 animate-spin" />
                    جاري...
                  </>
                ) : (
                  'تسجيل الدخول'
                )}
              </button>
              
              <div className="text-center pt-4">
                 <p className="text-sm text-gray-600 dark:text-gray-400">
                   ليس لديك حساب؟{' '}
                   <button
                     type="button"
                     onClick={() => router.push('/auth/register')}
                     className="text-purple-600 hover:text-purple-700 dark:hover:text-purple-500 font-semibold"
                   >
                     سجّل الآن
                   </button>
                 </p>
               </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
