'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/firebase/auth-provider';
import { secureConsole } from '@/lib/utils/secure-console';
import {
    ArrowRight,
    CheckCircle,
    Eye,
    EyeOff,
    KeyRound,
    Loader2,
    LogIn,
    Mail,
    Phone,
    Shield
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// Full country list
const countries = [
  { name: 'السعودية', code: '+966', phoneLength: 9 },
  { name: 'الإمارات', code: '+971', phoneLength: 9 },
  { name: 'الكويت', code: '+965', phoneLength: 8 },
  { name: 'قطر', code: '+974', phoneLength: 8 },
  { name: 'البحرين', code: '+973', phoneLength: 8 },
  { name: 'عمان', code: '+968', phoneLength: 8 },
  { name: 'مصر', code: '+20', phoneLength: 10 },
  { name: 'الأردن', code: '+962', phoneLength: 9 },
  { name: 'لبنان', code: '+961', phoneLength: 8 },
  { name: 'العراق', code: '+964', phoneLength: 10 },
  { name: 'سوريا', code: '+963', phoneLength: 9 },
  { name: 'المغرب', code: '+212', phoneLength: 9 },
  { name: 'الجزائر', code: '+213', phoneLength: 9 },
  { name: 'تونس', code: '+216', phoneLength: 8 },
  { name: 'ليبيا', code: '+218', phoneLength: 9 },
  { name: 'السودان', code: '+249', phoneLength: 9 },
  { name: 'السنغال', code: '+221', phoneLength: 9 },
  { name: 'ساحل العاج', code: '+225', phoneLength: 10 },
  { name: 'جيبوتي', code: '+253', phoneLength: 8 },
  { name: 'إسبانيا', code: '+34', phoneLength: 9 },
  { name: 'فرنسا', code: '+33', phoneLength: 9 },
  { name: 'إنجلترا', code: '+44', phoneLength: 10 },
  { name: 'البرتغال', code: '+351', phoneLength: 9 },
  { name: 'إيطاليا', code: '+39', phoneLength: 10 },
  { name: 'اليونان', code: '+30', phoneLength: 10 },
  { name: 'قبرص', code: '+357', phoneLength: 8 },
  { name: 'تركيا', code: '+90', phoneLength: 10 },
  { name: 'تايلاند', code: '+66', phoneLength: 9 },
  { name: 'اليمن', code: '+967', phoneLength: 9 },
];

type LoginMethod = 'phone' | 'email';

export default function LoginPage() {
  const router = useRouter();
  const { login, user, userData, loading: authLoading } = useAuth();
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('phone');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+20');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Get selected country details
  const selectedCountry = countries.find(c => c.code === countryCode) || countries[0];

  // Load Remember Me data
  useEffect(() => {
    const savedRememberMe = localStorage.getItem('rememberMe');
    const savedPhone = localStorage.getItem('userPhone');
    const savedEmail = localStorage.getItem('userEmail');
    const resetPasswordPhone = localStorage.getItem('resetPasswordPhone');

    // إذا جاء المستخدم من صفحة إعادة تعيين كلمة المرور
    if (resetPasswordPhone) {
      // استخراج كود الدولة ورقم الهاتف
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
      localStorage.removeItem('resetPasswordPhone'); // مسح بعد الاستخدام
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
      let userExists = false;

      if (loginMethod === 'email') {
        if (!email.trim()) {
          toast.error('يرجى إدخال البريد الإلكتروني');
          setLoading(false);
          return;
        }
        loginEmail = email.trim();
        // للبريد الإلكتروني، سنعرف إذا كان موجود من خطأ Firebase
        userExists = true;
      } else {
        if (!phone.trim()) {
          toast.error('يرجى إدخال رقم الهاتف');
          setLoading(false);
          return;
        }

        const fullPhone = `${countryCode}${phone.replace(/^0+/, '')}`;
        
        // التحقق من وجود الحساب أولاً
        toast.loading('جاري التحقق من الحساب...', { id: 'login' });
        const firebaseEmail = await findFirebaseEmailByPhone(fullPhone);

        if (!firebaseEmail) {
          toast.error('❌ رقم الهاتف غير مسجل في النظام', { id: 'login', duration: 4000 });
          toast.info('💡 يرجى إنشاء حساب جديد أولاً', { duration: 4000 });
          setLoading(false);
          return;
        }

        loginEmail = firebaseEmail;
        userExists = true;
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

      // معالجة دقيقة للأخطاء مع رسائل واضحة
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
        // خطأ عام
        toast.error(`${errorIcon} ${errorMessage}`, { id: 'login', duration: 4000 });
        if (err.message) {
          secureConsole.error('Detailed error:', err.message);
        }
      }

      setLoading(false);
    }
  };

  // If user is already logged in
  if (user && userData && !loading) {
    const dashboardRoute = getDashboardRoute(userData.accountType);

    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-4" dir="rtl">
        <Card className="w-full max-w-md shadow-2xl shadow-purple-500/20 border-purple-200/20">
          <CardHeader className="text-center">
            <div className="mx-auto bg-green-100 p-3 rounded-full w-fit mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">مرحباً بك!</CardTitle>
            <CardDescription>أنت مسجل دخولك بالفعل</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <p className="font-semibold text-lg mb-1">{userData.name || userData.displayName || 'مستخدم'}</p>
              <p className="text-sm text-gray-600">نوع الحساب: {userData.accountType}</p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              onClick={() => router.push(dashboardRoute)}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <ArrowRight className="ml-2 h-4 w-4" />
              الذهاب إلى لوحة التحكم
            </Button>
            <Button
              onClick={() => router.push('/auth/logout')}
              variant="outline"
              className="w-full"
            >
              تسجيل الخروج
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900" dir="rtl">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-purple-600 animate-spin" />
            <p className="text-gray-600">جاري التحميل...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-4" dir="rtl">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl shadow-purple-500/20 border-purple-200/20 bg-white/95 backdrop-blur">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto bg-purple-100 p-3 rounded-full w-fit mb-2">
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
            <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
            <CardDescription>مرحباً بك مرة أخرى في منصة El7lm</CardDescription>
          </CardHeader>

          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              {/* Security Notice */}
              <div className="flex items-center gap-2 p-3 text-sm text-blue-700 rounded-lg bg-blue-50">
                <KeyRound className="flex-shrink-0 w-4 h-4" />
                <p>نحن نستخدم أحدث تقنيات الأمان لحماية بياناتك</p>
              </div>

              {/* Login Method Toggle */}
              <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                <Button
                  type="button"
                  onClick={() => setLoginMethod('phone')}
                  variant={loginMethod === 'phone' ? 'default' : 'ghost'}
                  className={`flex-1 ${loginMethod === 'phone' ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                  size="sm"
                >
                  <Phone className="ml-2 h-4 w-4" />
                  رقم الهاتف
                </Button>
                <Button
                  type="button"
                  onClick={() => setLoginMethod('email')}
                  variant={loginMethod === 'email' ? 'default' : 'ghost'}
                  className={`flex-1 ${loginMethod === 'email' ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                  size="sm"
                >
                  <Mail className="ml-2 h-4 w-4" />
                  البريد الإلكتروني
                </Button>
              </div>

              {/* Form Fields */}
              {loginMethod === 'phone' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">البلد</Label>
                    <select
                      id="country"
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {countries.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name} ({country.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">رقم الهاتف</Label>
                    <div className="flex gap-2">
                      <div className="flex items-center justify-center px-3 border rounded-md bg-gray-50 min-w-[70px]">
                        <span className="text-sm font-medium">{countryCode}</span>
                      </div>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder={`${'0'.repeat(selectedCountry.phoneLength)}`}
                        maxLength={selectedCountry.phoneLength}
                        required
                        className="flex-1"
                        dir="ltr"
                        autoComplete="tel"
                        name="phone"
                      />
                    </div>
                    <p className="text-xs text-gray-500">مثال: {selectedCountry.phoneLength === 10 ? '1012345678' : '12345678'}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    required
                    autoComplete="email"
                  />
                </div>
              )}

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
                    تذكرني
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="link"
                  className="text-sm text-purple-600 hover:text-purple-700 p-0 h-auto"
                  onClick={() => router.push('/auth/forgot-password')}
                >
                  نسيت كلمة المرور؟
                </Button>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={loading || authLoading}
              >
                {loading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري تسجيل الدخول...
                  </>
                ) : (
                  <>
                    <LogIn className="ml-2 h-4 w-4" />
                    تسجيل الدخول
                  </>
                )}
              </Button>

              <div className="text-center text-sm text-gray-600">
                ليس لديك حساب؟{' '}
                <Button
                  type="button"
                  variant="link"
                  className="text-purple-600 hover:text-purple-700 p-0 h-auto font-semibold"
                  onClick={() => router.push('/auth/register')}
                >
                  إنشاء حساب جديد
                </Button>
              </div>

              {/* Account Types */}
              <div className="pt-3 text-center border-t">
                <p className="text-xs text-gray-500 mb-2">يمكنك التسجيل كـ:</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <span className="text-blue-600">• لاعب</span>
                  <span className="text-green-600">• نادي</span>
                  <span className="text-purple-600">• وكيل</span>
                  <span className="text-orange-600">• أكاديمية</span>
                  <span className="text-cyan-600">• مدرب</span>
                  <span className="text-red-600">• مسوق</span>
                </div>
              </div>
            </CardFooter>
          </form>
        </Card>

        <Button
          variant="ghost"
          onClick={() => router.push('/')}
          className="w-full mt-4 text-white hover:text-white hover:bg-white/10"
        >
          <ArrowRight className="ml-2 h-4 w-4" />
          العودة إلى الصفحة الرئيسية
        </Button>
      </div>
    </div>
  );
}
