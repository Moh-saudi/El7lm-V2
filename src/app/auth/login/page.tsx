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
import { toast, Toaster } from 'sonner';

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
      router.replace(getDashboardRoute(userData.accountType));
    }
  }, [user, userData, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-purple-950" dir="rtl">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 w-12 h-12 text-purple-400 animate-spin" />
          <p className="text-gray-300">جاري التحميل...</p>
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
          className: '!text-sm sm:!text-base',
          style: {
            maxWidth: '90vw',
            width: 'auto',
            minWidth: '280px',
            fontSize: '14px',
            fontFamily: 'Cairo, sans-serif',
          },
        }}
      />
      <div className="flex justify-center items-center px-4 py-8 min-h-screen bg-purple-950" dir="rtl">
        <div className="grid grid-cols-1 gap-6 w-full max-w-5xl md:grid-cols-2">

        {/* Login Form Card - Right Side (compact) */}
        <div className="order-1 md:order-2">
          <div className="p-6 mx-auto max-w-md rounded-2xl border border-purple-100 shadow-2xl backdrop-blur bg-white/95">
            {/* Header */}
            <div className="mb-6 text-center">
              <div className="inline-flex justify-center items-center mb-3 w-14 h-14 bg-purple-100 rounded-2xl">
                <Shield className="w-7 h-7 text-purple-600" />
              </div>
              <h1 className="mb-1 text-2xl font-bold text-gray-900">مرحباً بعودتك!</h1>
              <p className="text-sm text-gray-600">سجل دخولك وانطلق نحو حلمك</p>
            </div>

            {/* Login Method Toggle */}
            <div className="flex gap-2 p-1 mb-5 bg-gray-100 rounded-lg">
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

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {loginMethod === 'phone' ? (
                <>
                  <div>
                    <label className="block mb-1.5 text-xs font-medium text-gray-700">البلد</label>
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="px-3 py-2 w-full text-sm rounded-lg border border-gray-300 transition focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                        className="flex-1 px-3 py-2 text-sm text-left rounded-l-lg border border-gray-300 transition focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  <label className="block mb-1.5 text-xs font-medium text-gray-700">البريد الإلكتروني</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="py-2 pr-9 pl-3 w-full text-sm rounded-lg border border-gray-300 transition focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="example@mail.com"
                      required
                      autoComplete="email"
                    />
                    <Mail className="absolute right-3 top-1/2 w-4 h-4 text-gray-400 -translate-y-1/2" />
                  </div>
                </div>
              )}

              {/* Password Field */}
              <div>
                <label className="block mb-1.5 text-xs font-medium text-gray-700">كلمة المرور</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="py-2 pr-9 pl-9 w-full text-sm rounded-lg border border-gray-300 transition focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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

              {/* Remember Me & Forgot Password */}
              <div className="flex justify-between items-center text-xs">
                <label className="flex gap-2 items-center cursor-pointer">
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
                  className="font-medium text-purple-600 hover:text-purple-700"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>

              {/* Submit Button */}
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
                    <Loader2 className="inline-block ml-2 w-4 h-4 animate-spin" />
                    جاري الدخول...
                  </>
                ) : (
                  'تسجيل الدخول'
                )}
              </button>

              {/* Register Link */}
              <div className="pt-3 text-center border-t border-gray-200">
                <p className="text-xs text-gray-600">
                  ليس لديك حساب؟{' '}
                  <button
                    type="button"
                    onClick={() => router.push('/auth/register')}
                    className="font-semibold text-purple-600 hover:text-purple-700"
                  >
                    سجّل الآن
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>

        {/* Testimonials Panel - Left Side */}
        <div className="hidden order-2 md:order-1 md:block">
          <div className="flex flex-col justify-center p-6 h-full text-white rounded-2xl border backdrop-blur-sm bg-white/10 border-white/20">
            <div className="mb-6 text-center">
              <Star className="mx-auto mb-3 w-10 h-10 text-yellow-400 fill-yellow-400" />
              <h2 className="mb-2 text-2xl font-bold">شهادات ثقة</h2>
              <p className="text-sm text-purple-200">آراء من مستخدمينا</p>
            </div>

            <div className="space-y-4">
              {testimonials.map((t, idx) => (
                <div key={idx} className={`transition-opacity duration-1000 ${idx === testimonialIndex ? 'opacity-100' : 'opacity-0 hidden'}`}>
                  <div className="p-4 rounded-xl border backdrop-blur-sm bg-white/10 border-white/10">
                    <p className="mb-3 text-sm italic leading-relaxed">"{t.quote}"</p>
                    <div className="text-xs">
                      <span className="font-semibold text-white">{t.author}</span>
                      <span className="text-purple-300"> — {t.role}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        </div>
      </div>
    </>
  );
}
