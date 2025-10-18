'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/firebase/auth-provider';
import secureConsole from '@/utils/secureConsole';
import {
  ArrowRight,
  CheckCircle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Phone,
  Shield,
  Star,
  Trophy,
  Users,
  Zap
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

// Platform features for marketing
const platformFeatures = [
  { icon: Users, title: 'آلاف المستخدمين', description: 'انضم لمجتمع كبير من اللاعبين والأندية' },
  { icon: Trophy, title: 'فرص حقيقية', description: 'احصل على عروض احترافية من أندية عالمية' },
  { icon: Zap, title: 'سهولة الاستخدام', description: 'منصة بسيطة وسريعة لعرض موهبتك' },
  { icon: Shield, title: 'أمان وموثوقية', description: 'بياناتك محمية بأعلى معايير الأمان' },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, user, userData, loading: authLoading } = useAuth();
  
  // States
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('phone');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+20');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Load Remember Me data
  useEffect(() => {
    const savedRememberMe = localStorage.getItem('rememberMe');
    const savedPhone = localStorage.getItem('userPhone');
    const savedEmail = localStorage.getItem('userEmail');
    const resetPasswordPhone = localStorage.getItem('resetPasswordPhone');

    // إذا جاء المستخدم من صفحة إعادة تعيين كلمة المرور
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
      toast.success('✅ تم تحديث كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة');
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

  // Find Firebase email by phone
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
      console.error('Error finding user by phone:', error);
      return null;
    }
  };

  // Get dashboard route based on account type
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

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let loginEmail: string;

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
        
        toast.loading('جاري التحقق من الحساب...', { id: 'login' });
        const firebaseEmail = await findFirebaseEmailByPhone(fullPhone);

        if (!firebaseEmail) {
          toast.error('❌ رقم الهاتف غير مسجل في النظام', { id: 'login', duration: 4000 });
          toast.info('💡 يرجى إنشاء حساب جديد أولاً', { duration: 4000 });
          setLoading(false);
          return;
        }

        loginEmail = firebaseEmail;
        console.log('✅ Account found for phone:', fullPhone);
      }

      if (!password) {
        toast.error('يرجى إدخال كلمة المرور');
        setLoading(false);
        return;
      }

      secureConsole.log('🔐 Attempting login...');
      toast.loading('جاري تسجيل الدخول...', { id: 'login' });

      const result = await login(loginEmail, password);

      if (!result.userData.accountType) {
        toast.error('نوع الحساب غير صالح. يرجى التواصل مع الدعم الفني.', { id: 'login' });
        setLoading(false);
        return;
      }

      // Save Remember Me
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
      setTimeout(() => {
        router.replace(dashboardRoute);
      }, 500);

    } catch (err: any) {
      secureConsole.error('Login failed:', err);

      let errorMessage = 'حدث خطأ أثناء تسجيل الدخول';
      let errorIcon = '❌';

      if (err.code === 'auth/user-not-found') {
        errorIcon = '👤';
        if (loginMethod === 'email') {
          errorMessage = 'البريد الإلكتروني غير مسجل في النظام';
          toast.error(`${errorIcon} ${errorMessage}`, { id: 'login', duration: 4000 });
          toast.info('💡 يرجى التأكد من البريد أو إنشاء حساب جديد', { duration: 4000 });
        } else {
          errorMessage = 'رقم الهاتف غير مسجل';
          toast.error(`${errorIcon} ${errorMessage}`, { id: 'login', duration: 4000 });
          toast.info('💡 يرجى إنشاء حساب جديد', { duration: 4000 });
        }
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errorIcon = '🔒';
        errorMessage = 'كلمة المرور غير صحيحة';
        toast.error(`${errorIcon} ${errorMessage}`, { id: 'login', duration: 4000 });
        toast.info('💡 يمكنك استخدام "نسيت كلمة المرور؟" لإعادة تعيينها', { duration: 5000 });
      } else if (err.code === 'auth/too-many-requests') {
        errorIcon = '⏱️';
        errorMessage = 'تم تجاوز عدد المحاولات المسموحة';
        toast.error(`${errorIcon} ${errorMessage}`, { id: 'login', duration: 4000 });
        toast.info('💡 يرجى الانتظار قليلاً ثم المحاولة مرة أخرى', { duration: 5000 });
      } else if (err.code === 'auth/network-request-failed') {
        errorIcon = '🌐';
        errorMessage = 'خطأ في الاتصال بالإنترنت';
        toast.error(`${errorIcon} ${errorMessage}`, { id: 'login', duration: 4000 });
        toast.info('💡 يرجى التحقق من اتصالك بالإنترنت', { duration: 4000 });
      } else if (err.code === 'auth/user-disabled') {
        errorIcon = '🚫';
        errorMessage = 'تم تعطيل هذا الحساب';
        toast.error(`${errorIcon} ${errorMessage}`, { id: 'login', duration: 4000 });
        toast.info('💡 يرجى التواصل مع الدعم الفني', { duration: 5000 });
      } else if (err.code === 'auth/invalid-email') {
        errorIcon = '📧';
        errorMessage = 'صيغة البريد الإلكتروني غير صحيحة';
        toast.error(`${errorIcon} ${errorMessage}`, { id: 'login', duration: 4000 });
      } else {
        toast.error(`${errorIcon} ${errorMessage}`, { id: 'login', duration: 4000 });
        if (err.message) {
          secureConsole.error('Detailed error:', err.message);
        }
      }

      setLoading(false);
    }
  };

  // If user is already logged in
  if (user && userData && !authLoading) {
    const dashboardRoute = getDashboardRoute(userData.accountType);
    router.replace(dashboardRoute);
    return null;
  }

  // Loading state
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
          
          {/* Login Form Panel (Left) */}
          <div className="md:col-span-6 bg-white rounded-2xl shadow-xl p-8">
            {/* Logo & Header */}
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
                  <>
                    <ArrowRight className="inline-block w-5 h-5 ml-2" />
                    دخول
                  </>
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

          {/* Marketing Panel (Right) */}
          <div className="hidden md:flex md:col-span-6 bg-gradient-to-br from-purple-600 to-purple-900 rounded-2xl p-8 flex-col justify-center text-white shadow-2xl">
            <div className="space-y-8">
              {/* Rating Badge */}
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-white/20 backdrop-blur-sm rounded-full mb-6">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">تقييم 4.8★ من آلاف المستخدمين</span>
                </div>
                
                <h2 className="text-3xl font-bold mb-4">ابدأ رحلتك الاحترافية اليوم</h2>
                <p className="text-purple-100 text-lg">
                  انضم لآلاف اللاعبين والأندية الذين يثقون بمنصتنا
                </p>
              </div>

              {/* Features */}
              <div className="space-y-4">
                {platformFeatures.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-all"
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <feature.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{feature.title}</h3>
                      <p className="text-purple-100 text-sm">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Testimonial */}
              <div className="p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <div className="flex items-center gap-2 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-purple-50 leading-relaxed mb-4">
                  "منصة رائعة ساعدتني في الوصول لفرص احترافية لم أكن أحلم بها. التواصل سريع والخدمة ممتازة!"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold">أحمد محمد</p>
                    <p className="text-sm text-purple-200">لاعب محترف</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/20">
                <div className="text-center">
                  <p className="text-3xl font-bold mb-1">15K+</p>
                  <p className="text-sm text-purple-200">مستخدم نشط</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold mb-1">500+</p>
                  <p className="text-sm text-purple-200">نادي ومؤسسة</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold mb-1">98%</p>
                  <p className="text-sm text-purple-200">رضا العملاء</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

