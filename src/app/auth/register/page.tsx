'use client';

import { toast, Toaster } from 'sonner';
import WhatsAppOTPVerification from '@/components/shared/WhatsAppOTPVerification';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/lib/firebase/auth-provider';
import { FloatingInput, FloatingSelect } from '@/components/shared/PremiumInputs';
import { type UserRole } from '@/types';
import { updatePassword, sendEmailVerification } from 'firebase/auth'; // Added sendEmailVerification
import { auth } from '@/lib/firebase/config'; // Added auth import
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Home,
  Loader2,
  Lock,
  Mail,
  Star,
  User,
  UserCheck,
  Users,
  ArrowRight,
  Globe,
  Phone,
  Briefcase,
  ChevronLeft,
  ChevronDown,
  Inbox,
  X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { organizationReferralService } from '@/lib/organization/organization-referral-service';
import { countries } from '@/lib/constants/countries';

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

const getDashboardRoute = (accountType: string) => {
  switch (accountType) {
    case 'player': return '/dashboard/player';
    case 'club': return '/dashboard/club';
    case 'agent': return '/dashboard/agent';
    case 'academy': return '/dashboard/academy';
    case 'trainer': return '/dashboard/trainer';
    case 'marketer': return '/dashboard/marketer';
    default: return '/dashboard';
  }
};



export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, signInWithGoogle } = useAuth();
  const t = (key: string) => key;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    country: '',
    countryCode: '',
    password: '',
    confirmPassword: '',
    accountType: 'player' as UserRole,
    organizationCode: '',
    agreeToTerms: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(''); // Keep for general/critical errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({}); // Field-specific errors
  const [loading, setLoading] = useState(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [phoneExistsError, setPhoneExistsError] = useState('');
  const [phoneStatus, setPhoneStatus] = useState<'idle' | 'checking' | 'exists' | 'available' | 'invalid'>('idle');
  const [registrationMethod, setRegistrationMethod] = useState<'email' | 'phone' | 'google'>('phone');
  const phoneCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear field error when user starts typing
  const clearFieldError = (fieldName: string) => {
    setFieldErrors(prev => {
      const updated = { ...prev };
      delete updated[fieldName];
      return updated;
    });
  };

  const accountTypes = [
    { value: 'player', label: 'لاعب', icon: Star },
    { value: 'club', label: 'نادي', icon: Home },
    { value: 'academy', label: 'أكاديمية', icon: Users },
    { value: 'agent', label: 'وكيل', icon: UserCheck },
    { value: 'trainer', label: 'مدرب', icon: User },
    { value: 'marketer', label: 'مسوق', icon: Briefcase }
  ];

  /* --- Logic Handlers --- */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (name === 'phone') {
      const nums = value.replace(/[^0-9]/g, '');
      setFormData(p => ({ ...p, [name]: nums }));
      setPhoneStatus('idle');
      setPhoneExistsError('');
      clearFieldError('phone'); // Clear phone error when typing

      if (phoneCheckTimeoutRef.current) clearTimeout(phoneCheckTimeoutRef.current);

      const country = countries.find(c => c.name === formData.country);
      if (!country) return;

      // Real-time Validation & Search
      if (nums.length === country.phoneLength) {
        setPhoneStatus('checking');
        phoneCheckTimeoutRef.current = setTimeout(async () => {
          try {
            console.log(`[Real-time Check] Fetching for phone: ${nums}`);
            const res = await fetch('/api/auth/check-user-exists', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone: nums, countryCode: formData.countryCode.replace('+', '') })
            });
            const data = await res.json();
            console.log(`[Real-time Check] API Response:`, data);

            if (data.phoneExists) {
              console.log(`[Real-time Check] 🔴 Setting status to 'exists'`);
              setPhoneStatus('exists');
              setPhoneExistsError('📱 هذا الرقم مسجل بالفعل في النظام');
              setFieldErrors({ phone: 'هذا الرقم مسجل بالفعل في النظام' });
            } else {
              console.log(`[Real-time Check] ✅ Setting status to 'available'`);
              setPhoneStatus('available');
              setPhoneExistsError('');
            }
          } catch (err) {
            console.error(`[Real-time Check] ❌ Error:`, err);
            setPhoneStatus('idle');
          }
        }, 600);
      } else if (nums.length > 0 && nums.length !== country.phoneLength) {
        if (nums.length > country.phoneLength) {
          setPhoneStatus('invalid');
          setPhoneExistsError(`الرقم طويل جداً، طول الرقم في ${country.name} هو ${country.phoneLength} أرقام`);
        } else {
          // Keep idle or show 'typing' if needed
        }
      }
      return;
    }
    setFormData(p => ({ ...p, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }));
    // Clear error for the field being edited
    clearFieldError(name);
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const c = countries.find(x => x.name === e.target.value);
    setFormData(p => ({ ...p, country: c?.name || '', countryCode: c?.code || '', phone: '' }));
    setPhoneStatus('idle');
    setPhoneExistsError('');
  };

  const handleGoogleSignUp = async () => {
    if (!formData.accountType) { setError('اختر نوع الحساب'); return; }
    try {
      const res = await signInWithGoogle(formData.accountType as any);
      router.replace(getDashboardRoute(res.userData.accountType));
    } catch (e: any) { setError(e.message); }
  };

  /* --- Register Handler --- */
  /* --- Register Handler --- */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPhoneExistsError('');
    setFieldErrors({}); // Clear all field errors

    if (!formData.name) {
      setFieldErrors({ name: 'الاسم الكامل مطلوب' });
      return;
    }
    if (!formData.country) {
      setFieldErrors({ country: 'يرجى اختيار الدولة' });
      return;
    }

    // Validate Method Specifics
    console.log(`🔍 [Registration] Validating ${registrationMethod} method`);
    if (registrationMethod === 'email') {
      if (!formData.email) {
        setFieldErrors({ email: 'البريد الإلكتروني مطلوب' });
        return;
      }
      if (!isValidEmail(formData.email)) {
        setFieldErrors({ email: 'صيغة البريد الإلكتروني غير صحيحة' });
        return;
      }
    } else {
      const country = countries.find(c => c.name === formData.country);
      const rawPhone = formData.phone.replace(/^0+/, '');
      if (!formData.phone) {
        setFieldErrors({ phone: 'رقم الهاتف مطلوب' });
        return;
      }
      if (country && rawPhone.length !== country.phoneLength) {
        setFieldErrors({ phone: `رقم الهاتف في ${country.name} يجب أن يكون ${country.phoneLength} أرقام (بدون الصفر)` });
        return;
      }

      // Mandatory API re-check ONLY if we haven't already verified in real-time
      if (phoneStatus !== 'available') {
        setLoading(true);
        console.log(`🔍 [Registration] Final phone check: ${rawPhone} (${formData.countryCode})`);
        const checkStartTime = Date.now();

        try {
          // Add timeout to prevent indefinite hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout (reduced)

          const checkRes = await fetch('/api/auth/check-user-exists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: rawPhone, countryCode: formData.countryCode.replace('+', '') }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);
          const checkDuration = Date.now() - checkStartTime;
          console.log(`✅ [Registration] Final check completed in ${checkDuration}ms`);

          const checkData = await checkRes.json();

          if (checkData.phoneExists || checkData.exists) {
            setPhoneStatus('exists');
            setLoading(false);
            console.log(`⚠️ [Registration] Phone ${rawPhone} already exists`);
            setFieldErrors({ phone: '📱 رقم الهاتف مسجل بالفعل في النظام. يرجى تسجيل الدخول أو استخدام رقم هاتف آخر.' });
            return;
          }
          setPhoneStatus('available');
          console.log(`✅ [Registration] Phone ${rawPhone} is available`);
        } catch (checkErr: any) {
          const checkDuration = Date.now() - checkStartTime;
          console.error(`❌ [Registration] Final check failed after ${checkDuration}ms:`, checkErr);

          // If timeout or network error
          if (checkErr.name === 'AbortError') {
            setLoading(false);
            setFieldErrors({ phone: '⏱️ انتهت مهلة التحقق من رقم الهاتف. يرجى التأكد من اتصال الإنترنت والمحاولة مرة أخرى.' });
            return;
          }

          setLoading(false);
          setFieldErrors({ phone: '❌ فشل التحقق من توفر رقم الهاتف. يرجى التأكد من اتصالك بالإنترنت والمحاولة مرة أخرى.' });
          return;
        }
      } else {
        console.log(`⚡ [Registration] Skipping final check - already verified as available`);
      }
    }

    console.log('✅ [Registration] All validations passed');
    if (formData.password.length < 8) {
      setFieldErrors({ password: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' });
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setFieldErrors({ confirmPassword: 'كلمات المرور غير متطابقة' });
      return;
    }
    if (!formData.agreeToTerms) {
      setError('موافقة الشروط مطلوبة');
      return;
    }

    setLoading(true);

    try {
      console.log(`🚀 Registration via ${registrationMethod} (Bypass Mode)`);

      const finalEmail = registrationMethod === 'email'
        ? formData.email
        : `${formData.countryCode.replace('+', '')}${formData.phone}@el7lm.com`;

      const rawPhone = formData.phone.replace(/^0+/, '');
      const fullPhone = formData.phone ? `${formData.countryCode}${rawPhone}` : '';

      const res = await registerUser(finalEmail, formData.password, formData.accountType as any, {
        full_name: formData.name,
        country: formData.country,
        countryCode: formData.countryCode,
        organizationCode: formData.organizationCode,
        phone: fullPhone,
        email: formData.email, // Preserve original email if provided
        isVerifiedLocal: true,
        createdAt: new Date(), // ✅ تاريخ التسجيل
        created_at: new Date() // ✅ نسخة احتياطية للتوافق
      });

      // Auto-create join request if code is provided
      if (formData.organizationCode && formData.accountType === 'player' && res) {
        try {
          await organizationReferralService.createJoinRequest(res.uid, res, formData.organizationCode);
          console.log('✅ Auto-join request created for code:', formData.organizationCode);
        } catch (joinErr) {
          console.warn('⚠️ Could not create auto-join request:', joinErr);
        }
      }

      toast.success('تم إنشاء حسابك بنجاح! جاري التحويل...');

      const dashboardRoute = getDashboardRoute(formData.accountType);
      router.replace(dashboardRoute);

    } catch (err: any) {
      // Customize error messages based on registration method
      let errorMessage = err.message || 'فشل التسجيل';

      // Phone-specific errors
      if (registrationMethod === 'phone') {
        if (errorMessage.includes('email-already-in-use') || errorMessage.includes('already in use') || errorMessage.includes('مسجل بالفعل')) {
          errorMessage = '📱 رقم الهاتف مسجل بالفعل في النظام';
          // Show prominent toast
          toast.error(errorMessage + ' - يرجى تسجيل الدخول أو استخدام رقم آخر', {
            id: 'registration-error',
            duration: 8000
          });
          setFieldErrors({ phone: errorMessage });
        } else if (errorMessage.includes('invalid-phone')) {
          errorMessage = '❌ رقم الهاتف غير صحيح. يرجى التحقق من الرقم والمحاولة مرة أخرى.';
          setFieldErrors({ phone: errorMessage });
        } else if (errorMessage.includes('weak-password')) {
          errorMessage = '🔒 كلمة المرور ضعيفة. يرجى استخدام كلمة مرور أقوى (8 أحرف على الأقل).';
          setFieldErrors({ password: errorMessage });
        } else {
          setError(errorMessage);
        }
      }
      // Email-specific errors
      else if (registrationMethod === 'email') {
        if (errorMessage.includes('email-already-in-use') || errorMessage.includes('already in use')) {
          errorMessage = '📧 البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول أو استخدام بريد إلكتروني آخر.';
          setFieldErrors({ email: errorMessage });
        } else if (errorMessage.includes('invalid-email')) {
          errorMessage = '❌ صيغة البريد الإلكتروني غير صحيحة.';
          setFieldErrors({ email: errorMessage });
        } else if (errorMessage.includes('weak-password')) {
          errorMessage = '🔒 كلمة المرور ضعيفة. يرجى استخدام كلمة مرور أقوى (8 أحرف على الأقل).';
          setFieldErrors({ password: errorMessage });
        } else {
          setError(errorMessage);
        }
      } else {
        setError(errorMessage);
      }

      console.error('Registration error:', err);
    } finally { setLoading(false); }
  };

  // Success Screen (Email)
  if (emailVerificationSent) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 font-sans" dir="rtl">
        <div className="w-full max-w-[400px] bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center space-y-4 animate-in fade-in zoom-in-95">
          <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto text-teal-600 mb-2">
            <Inbox className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-800 font-cairo">تحقق من بريدك</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            لقد أرسلنا رابط تفعيل إلى: <br />
            <span className="font-bold text-slate-800">{formData.email}</span>
          </p>
          <div className="bg-orange-50/50 border border-orange-100 p-3 rounded-lg text-xs font-bold text-orange-700 animate-pulse">
            ⚠️ لم تجد الرسالة؟ تحقق من مجلد "الرسائل غير المرغوب فيها" (Spam) ومجلد "الرسائل الترويجية"
          </div>
          <div className="pt-4">
            <button onClick={() => router.push('/auth/login')} className="w-full bg-slate-900 text-white font-bold h-12 rounded-xl text-sm shadow-md hover:bg-black transition-all">
              الانتقال لتسجيل الدخول
            </button>
            <button onClick={() => { setEmailVerificationSent(false); }} className="mt-4 text-xs font-bold text-slate-400 hover:text-purple-600">
              العودة
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" dir="rtl" richColors toastOptions={{ className: '!text-sm font-cairo' }} />

      {/* Terms of Service Modal */}
      <AlertDialog open={showTerms} onOpenChange={setShowTerms}>
        <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white rounded-3xl p-8 border-none shadow-2xl animate-in fade-in zoom-in-95 duration-300">
          <AlertDialogHeader className="relative pb-4 border-b border-slate-100 mb-6">
            <AlertDialogTitle className="text-2xl font-black text-slate-800 font-cairo flex items-center gap-3">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                <Star className="w-6 h-6" />
              </div>
              شروط وأحكام منصة الحلم
            </AlertDialogTitle>
            <button onClick={() => setShowTerms(false)} className="absolute left-0 top-1 p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-all">
              <X className="w-5 h-5" />
            </button>
          </AlertDialogHeader>

          <div className="space-y-8 text-sm text-slate-600 leading-relaxed font-medium text-right" dir="rtl">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
              <p className="text-slate-800 font-black mb-1">الجهة المالكة: شركة ميسك ذات مسؤولية محدودة (Mesk LLC)</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">تاريخ آخر تحديث: يناير 2026</p>
            </div>

            {/* Document 1: Terms of Service */}
            <section className="space-y-4">
              <div className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-black mb-2">
                الوثيقة الأولى: شروط الخدمة والاستخدام
              </div>
              <h3 className="text-base font-black text-slate-800">مقدمة:</h3>
              <p>أهلاً بك في منصة "الحلم" (El7lm). بمجرد تسجيلك أو استخدامك لتطبيقنا أو موقعنا الإلكتروني، فإنك توافق، دون قيد أو شرط، على الالتزام بهذه الشروط. إذا كنت لا توافق على أي بند، يرجى التوقف عن استخدام المنصة فوراً.</p>

              <div className="space-y-3">
                <h4 className="font-black text-slate-800">1. الأهلية والتسجيل</h4>
                <ul className="list-disc pr-5 space-y-1">
                  <li><span className="font-bold">السن القانوني:</span> إذا كان عمرك أقل من 18 عاماً، لا يجوز لك إنشاء حساب إلا بموافقة وإشراف "ولي الأمر". يحتفظ النظام بحق طلب وثائق إثبات الهوية في أي وقت.</li>
                  <li><span className="font-bold">دقة البيانات:</span> تتعهد بأن جميع البيانات المدخلة (الاسم، تاريخ الميلاد، الجنسية) صحيحة تماماً. نحن نطبق سياسة "صفر تسامح" مع تزوير الأعمار، وأي تلاعب يؤدي للحظر النهائي دون استرداد للأموال.</li>
                </ul>

                <h4 className="font-black text-slate-800">2. طبيعة الخدمات (إخلاء مسؤولية)</h4>
                <ul className="list-disc pr-5 space-y-1">
                  <li><span className="font-bold">أداة وليست وعداً:</span> منصة "الحلم" توفر أدوات تحليلية، بيانات إحصائية، وفرص عرض أمام الأندية، لكننا لا نضمن ولا نعد بالاحتراف في نادٍ معين أو تحقيق دخل مالي للاعب.</li>
                  <li><span className="font-bold">التقييم الفني:</span> تقييمات الذكاء الاصطناعي (AI Ratings) هي استرشادية وتعتمد على جودة الفيديو المدخل، ولا يحق للمستخدم الاعتراض عليها قانونياً.</li>
                </ul>

                <h4 className="font-black text-slate-800">3. الاشتراكات والمدفوعات</h4>
                <ul className="list-disc pr-5 space-y-1">
                  <li><span className="font-bold">سياسة الدفع غير النقدي (Cashless Policy):</span> تقبل المنصة المدفوعات الإلكترونية فقط. يُحظر دفع أي مبالغ نقدية لموظفينا.</li>
                  <li><span className="font-bold">الاسترداد (Refunds):</span> رسوم الاشتراكات والباقات واشتراك البطولات غير قابلة للاسترداد بمجرد تفعيل الخدمة أو الانسحاب الطوعي.</li>
                </ul>

                <h4 className="font-black text-slate-800">4. التزامات الوكلاء والمدربين</h4>
                <p>إذا كنت مسجلاً كـ "شريك" أو "سفير"، فإن علاقتك بالشركة هي علاقة "تعاقد حر" (Freelance) وليست علاقة توظيف.</p>

                <h4 className="font-black text-slate-800">5. الملكية الفكرية</h4>
                <p>جميع الخوارزميات والشعارات هي ملكية حصرية لشركة ميسك. بمجرد رفع أي فيديو، فإنك تمنحنا ترخيصاً لاستخدامه في التحليل والتسويق.</p>

                <h4 className="font-black text-slate-800">6. القانون الواجب التطبيق</h4>
                <p>تخضع هذه الشروط لقوانين دولة قطر، ويتم الفصل في النزاعات عبر التحكيم في الدوحة.</p>
              </div>
            </section>

            <hr className="border-slate-100" />

            {/* Document 2: Privacy Policy */}
            <section className="space-y-4">
              <div className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-black mb-2">
                الوثيقة الثانية: سياسة الخصوصية وحماية البيانات
              </div>
              <p className="font-bold">نحن نأخذ خصوصيتك وخصوصية أطفالك على محمل الجد.</p>

              <div className="space-y-3">
                <h4 className="font-black text-slate-800">1. البيانات التي نجمعها</h4>
                <p>نجمع البيانات الشخصية (الاسم، الهاتف) والبيانات الرياضية (مقاطع الفيديو، بيانات أجهزة التتبع GPS مثل السرعة والمسافة ونبضات القلب).</p>

                <h4 className="font-black text-slate-800">2. معالجة الذكاء الاصطناعي (V-Lab)</h4>
                <p>بموافقتك، نستخدم خوارزميات الذكاء الاصطناعي لاستخراج الإحصائيات وبناء "بطاقة اللاعب" ومشاركتها مع الكشافة والأندية.</p>

                <h4 className="font-black text-slate-800">3. حماية القاصرين</h4>
                <p>لا يتم نشر بيانات الاتصال المباشرة للقاصرين علناً. التواصل يتم حصراً من خلال "ولي الأمر" المسجل.</p>

                <h4 className="font-black text-slate-800">4. الحق في النسيان</h4>
                <p>يحق لك طلب حذف حسابك وبياناتك نهائياً عبر info@el7lm.com، وسيتم التنفيذ خلال 30 يوماً.</p>
              </div>
            </section>

            <hr className="border-slate-100" />

            {/* Document 3: Event Waiver */}
            <section className="space-y-4">
              <div className="inline-block px-3 py-1 bg-teal-100 text-teal-700 rounded-lg text-xs font-black mb-2">
                الوثيقة الثالثة: إقرار المشاركة الميدانية وإخلاء المسؤولية
              </div>
              <p className="font-bold text-xs text-slate-500">خاص باللاعبين المشاركين في البطولات والمعسكرات</p>

              <div className="space-y-3">
                <h4 className="font-black text-slate-800">1. الإقرار الطبي</h4>
                <p>أقر بأنني (أو ابني) لائق بدنياً لممارسة كرة القدم ولا أعاني من أمراض مزمنة تمنعني من اللعب.</p>

                <h4 className="font-black text-slate-800">2. إخلاء المسؤولية عن الإصابات</h4>
                <p>أوافق على إخلاء مسؤولية شركة ميسك ومنصة الحلم عن أي إصابات جسدية تقع أثناء المباريات أو التدريبات.</p>

                <h4 className="font-black text-slate-800">3. الموافقة الإعلامية</h4>
                <p>أمنح شركة ميسك الحق في تصويري واستخدام صورتي واسمي في البث المباشر والمواد الترويجية دون تعويض مالي.</p>
              </div>
            </section>

            <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 text-center">
              <p className="text-sm text-purple-800 font-black">
                بضغطك على زر "موافق" أو "تسجيل"، فإنك تقر بأنك قرأت وفهمت ووافقت على كافة البنود الواردة أعلاه.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => setShowTerms(false)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-black px-8 py-3 rounded-xl transition-all shadow-lg shadow-purple-200"
            >
              فهمت وأوافق
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-slate-50 to-purple-50 font-sans" dir="rtl">

        <div className="w-full max-w-[540px] animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-indigo-700 font-cairo mb-2">أهلاً بك في منصة الحلم</h1>
            <p className="text-slate-500 text-sm font-medium">ابدأ رحلتك الرياضية اليوم باختيار نوع حسابك</p>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-purple-200/50 border border-white overflow-hidden">



            <div className="p-6 md:p-8">
              <form onSubmit={handleRegister} className="space-y-6">

                {/* Only show generic error for critical issues (like terms not agreed) */}
                {error && !Object.keys(fieldErrors).length && (
                  <div className="p-4 bg-red-50/80 backdrop-blur-sm text-red-600 rounded-2xl text-xs font-bold flex gap-3 items-center border border-red-100 animate-in shake duration-500">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    {error}
                  </div>
                )}

                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-widest">اختر دورك</label>
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">مطلوب</span>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-between">
                      {accountTypes.map(t => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setFormData(p => ({ ...p, accountType: t.value as UserRole }))}
                          className={`flex-1 min-w-[80px] group relative flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl border transition-all duration-300 ${formData.accountType === t.value
                            ? 'border-purple-600 bg-purple-50/50 text-purple-700 ring-1 ring-purple-600/20 shadow-sm'
                            : 'border-slate-100 bg-white text-slate-500 hover:border-purple-200'
                            }`}
                        >
                          <div className={`p-1.5 rounded-lg transition-all duration-300 ${formData.accountType === t.value ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-purple-100'}`}>
                            <t.icon className="w-4 h-4" />
                          </div>
                          <span className="text-[9px] font-black underline-offset-2">{t.label}</span>
                          {formData.accountType === t.value && <CheckCircle className="absolute top-1 left-1 w-3 h-3 text-purple-600" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-slate-100 my-2"></div>

                  {/* Method Tabs */}
                  <div className="bg-slate-50 p-1.5 rounded-2xl flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => { setRegistrationMethod('phone'); setError(''); setPhoneExistsError(''); setPhoneStatus('idle'); }}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1.5 ${registrationMethod === 'phone' ? 'bg-white text-purple-700 shadow-sm ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>رقم الهاتف</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRegistrationMethod('email'); setError(''); setPhoneExistsError(''); setPhoneStatus('idle'); }}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1.5 ${registrationMethod === 'email' ? 'bg-white text-purple-700 shadow-sm ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>البريد الإلكتروني</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRegistrationMethod('google'); setError(''); setPhoneExistsError(''); setPhoneStatus('idle'); }}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1.5 ${registrationMethod === 'google' ? 'bg-white text-purple-700 shadow-sm ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                      <span>Google</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {registrationMethod === 'google' ? (
                      <div className="py-8 space-y-6 text-center animate-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-purple-100/50">
                          <svg className="w-10 h-10" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-slate-800 mb-1">تسجيل سريع وآمن</h3>
                          <p className="text-sm text-slate-500">استخدم حساب Google لإنشاء حسابك في ثوانٍ</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleGoogleSignUp}
                          className="w-full flex items-center justify-center gap-4 h-15 bg-white hover:bg-slate-50 border-2 border-slate-100 rounded-2xl transition-all shadow-sm group py-4"
                        >
                          <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                          <span className="text-base font-black text-slate-700">المتابعة باستخدام Google</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        <FloatingInput id="reg-name" name="name" label="الاسم الكامل" value={formData.name} onChange={handleInputChange} icon={User} error={fieldErrors.name} required />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FloatingSelect
                            id="reg-country"
                            name="country"
                            label="الدولة"
                            value={formData.country}
                            onChange={handleCountryChange}
                            icon={Globe}
                            error={fieldErrors.country}
                            required
                          >
                            <option value="">📍 اختر دولتك</option>
                            {countries.map(c => (
                              <option key={c.code} value={c.name}>
                                {c.name} ({c.code})
                              </option>
                            ))}
                          </FloatingSelect>

                          {registrationMethod === 'phone' ? (
                            <div className="relative">
                              <FloatingInput
                                id="reg-phone"
                                name="phone"
                                label="رقم الهاتف"
                                type="tel"
                                dir="ltr"
                                value={formData.phone}
                                onChange={handleInputChange}
                                icon={
                                  phoneStatus === 'checking' ? Loader2 :
                                    phoneStatus === 'available' ? CheckCircle :
                                      phoneStatus === 'exists' ? AlertTriangle :
                                        Phone
                                }
                                className={`text-left font-mono tracking-wider text-lg ${formData.countryCode ? 'pl-24' : ''}`}
                                placeholder={formData.countryCode ? '123456789' : 'اختر الدولة أولاً'}
                                error={fieldErrors.phone || phoneExistsError || (phoneStatus === 'invalid' ? 'رقم غير صحيح' : '')}
                                required
                                disabled={!formData.country}
                              />
                              {/* Country Code Badge - Inside Input */}
                              {formData.countryCode && (
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
                                  <span className="text-sm font-black text-white bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1.5 rounded-lg shadow-md border-2 border-white">
                                    {formData.countryCode}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <FloatingInput id="reg-email" name="email" label="البريد الإلكتروني" type="email" value={formData.email} onChange={handleInputChange} icon={Mail} error={fieldErrors.email} required />
                          )}
                        </div>


                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="relative">
                            <FloatingInput id="reg-password" name="password" label="كلمة المرور" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleInputChange} icon={Lock} error={fieldErrors.password} required />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-600 transition-colors p-1 z-10">
                              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <div className="relative">
                            <FloatingInput id="reg-confirm-password" name="confirmPassword" label="تأكيد كلمة المرور" type={showConfirmPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={handleInputChange} icon={Lock} error={fieldErrors.confirmPassword} required />
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-600 transition-colors p-1 z-10">
                              {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {formData.accountType === 'player' && (
                          <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4 flex gap-3 items-center">
                            <Users className="w-5 h-5 text-purple-600 shrink-0" />
                            <div className="flex-1">
                              <FloatingInput
                                id="reg-org-code"
                                name="organizationCode"
                                label="كود الانضمام لنادي أو أكاديمية (اختياري)"
                                value={formData.organizationCode}
                                onChange={handleInputChange}
                                className="bg-white"
                              />
                            </div>
                          </div>
                        )}

                        <div className={`flex items-start gap-3 p-3 border rounded-2xl transition-all ${error && error.includes('شروط') ? 'bg-red-50/50 border-red-300' : 'bg-slate-50/50 border-slate-100'}`}>
                          <input
                            id="terms-checkbox"
                            type="checkbox"
                            checked={formData.agreeToTerms}
                            onChange={(e) => { setFormData(p => ({ ...p, agreeToTerms: e.target.checked })); setError(''); }}
                            className="w-5 h-5 mt-0.5 rounded-lg border-slate-200 text-purple-600 cursor-pointer accent-purple-600"
                          />
                          <label htmlFor="terms-checkbox" className="text-[10px] text-slate-500 font-medium leading-normal">
                            أوافق على <button type="button" onClick={() => setShowTerms(true)} className="text-purple-700 font-black underline decoration-purple-200 underline-offset-2 hover:text-purple-900 transition-colors">شروط الخدمة</button> و سياسة الخصوصية الخاصة بمنصة الحلم.
                          </label>
                        </div>
                        {error && error.includes('شروط') && (
                          <div className="flex items-start gap-2 mt-[-8px] mb-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200 animate-in slide-in-from-top-1 duration-200" role="alert">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span className="flex-1">{error}</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={loading}
                          onClick={(e) => {
                            console.log('🔴 [DEBUG] Submit button clicked!');
                            console.log('🔴 [DEBUG] Form data:', { name: formData.name, country: formData.country, phone: formData.phone, agreeToTerms: formData.agreeToTerms });
                          }}
                          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black h-14 rounded-2xl text-base shadow-xl shadow-purple-200 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-70 group"
                        >
                          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                            <>
                              <span>إنشاء حسابك الآن</span>
                              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 rtl:rotate-180 transition-transform" />
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-center pt-4 border-t border-slate-50/50">
                  <p className="text-sm text-slate-400 font-medium">
                    لديك حساب بالفعل؟
                    <button type="button" onClick={() => router.push('/auth/login')} className="bg-slate-100 hover:bg-slate-200 text-purple-700 font-black px-4 py-1.5 rounded-full mr-2 transition-all">دخول</button>
                  </p>
                </div>
              </form>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

