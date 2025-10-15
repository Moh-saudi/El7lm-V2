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

const motivationalQuotes = [
  '⚽ ابدأ رحلتك نحو الاحتراف',
  '🏆 فرص حقيقية تنتظرك',
  '✨ موهبتك تستحق الظهور',
  '🎯 خطوة واحدة نحو أحلامك',
  '⭐ انضم لآلاف اللاعبين المحترفين',
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
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % motivationalQuotes.length);
    }, 3000);
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
            const verifyResponse = await fetch('/api/auth/verify-and-sync-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: loginEmail })
            });

            if (verifyResponse.ok) {
              const verifyData = await verifyResponse.json();
              if (verifyData.needsSync) {
                errorMessage = 'حسابك يحتاج إلى تفعيل';
                toast.error(`⚠️ ${errorMessage}`, { id: 'login', duration: 5000 });
                toast.info('💡 يرجى استخدام "نسيت كلمة المرور؟" لتفعيل حسابك', { duration: 7000 });
                setLoading(false);
                return;
              }
            }
          } catch (verifyError) {
            console.error('Error verifying:', verifyError);
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
      <div className="flex items-center justify-center min-h-screen bg-purple-950" dir="rtl">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-purple-400 animate-spin" />
          <p className="text-gray-300">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-purple-950 flex items-center justify-center px-4 py-8" dir="rtl">
      <div className="w-full max-w-md">
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl border border-purple-100 overflow-hidden">
          <div className="px-6 pt-6 pb-3">
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-2 items-center text-purple-600">
                <Shield className="w-6 h-6" />
                <span className="text-base font-bold">El7lm</span>
              </div>
              <button
                type="button"
                onClick={() => router.push('/auth/register')}
                className="text-xs text-gray-600 hover:text-purple-600 transition"
              >
                حساب جديد؟ سجّل الآن
              </button>
            </div>

            <div className="text-center mb-2">
              <h1 className="text-xl font-extrabold text-gray-900 mb-1">مرحباً بعودتك!</h1>
              <p className="text-xs text-gray-500 mb-2">ادخل إلى حسابك واكمل رحلتك</p>

              <div className="min-h-[1.5rem]">
                <span
                  key={quoteIndex}
                  className="inline-block text-xs text-purple-600 font-medium transition-opacity duration-500"
                >
                  {motivationalQuotes[quoteIndex]}
                </span>
              </div>
            </div>

            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg mb-4">
              <button
                type="button"
                onClick={() => setLoginMethod('phone')}
                className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                  loginMethod === 'phone'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Phone className="inline-block w-3.5 h-3.5 ml-1" />
                رقم الهاتف
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('email')}
                className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                  loginMethod === 'email'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Mail className="inline-block w-3.5 h-3.5 ml-1" />
                البريد الإلكتروني
              </button>
            </div>
          </div>

          <form onSubmit={handleLogin} className="px-6 pb-6 space-y-3">
            {loginMethod === 'phone' ? (
              <>
                <div>
                  <label className="block mb-1.5 text-xs font-medium text-gray-700">البلد</label>
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-full py-2 px-3 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
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
                  <label className="block mb-1.5 text-xs font-medium text-gray-700">رقم الهاتف</label>
                  <div className="flex">
                    <div className="flex items-center px-3 text-sm bg-gray-50 rounded-r-lg border border-l-0 border-gray-300">
                      {countryCode}
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      className="flex-1 py-2 px-3 text-sm border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition text-left"
                      placeholder="1012345678"
                      required
                      dir="ltr"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="block mb-1.5 text-xs font-medium text-gray-700">البريد الإلكتروني</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full py-2 pr-10 pl-3 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    placeholder="example@mail.com"
                    required
                  />
                  <Mail className="absolute right-3 top-1/2 w-4 h-4 text-gray-400 -translate-y-1/2" />
                </div>
              </div>
            )}

            <div>
              <label className="block mb-1.5 text-xs font-medium text-gray-700">كلمة المرور</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full py-2 pr-10 pl-10 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  placeholder="********"
                  required
                  autoComplete="current-password"
                />
                <Lock className="absolute right-3 top-1/2 w-4 h-4 text-gray-400 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 text-gray-400 -translate-y-1/2 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-gray-600">تذكرني</span>
              </label>
              <button
                type="button"
                onClick={() => router.push('/auth/forgot-password')}
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                نسيت كلمة المرور؟
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 px-4 text-sm text-white font-semibold rounded-lg transition-all ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 shadow-lg hover:shadow-xl'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="inline-block w-4 h-4 ml-2 animate-spin" />
                  جاري تسجيل الدخول...
                </>
              ) : (
                'دخول'
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-semibold">تقييم 4.8★ من آلاف المستخدمين</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <Trophy className="w-5 h-5 mx-auto mb-1 text-yellow-400" />
              <p className="text-xs text-purple-200">فرص احترافية</p>
            </div>
            <div>
              <Shield className="w-5 h-5 mx-auto mb-1 text-green-400" />
              <p className="text-xs text-purple-200">أمان عالي</p>
            </div>
            <div>
              <Star className="w-5 h-5 mx-auto mb-1 text-purple-400" />
              <p className="text-xs text-purple-200">موثوق به</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
