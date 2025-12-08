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
import { updatePassword, sendEmailVerification } from 'firebase/auth'; // Added sendEmailVerification
import { auth } from '@/lib/firebase/config'; // Added auth import
import {
  AlertTriangle,
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
  Inbox
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
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

const FloatingInput = ({ label, icon: Icon, error, ...props }: any) => (
  <div className="relative group">
    <input
      {...props}
      className={`block px-4 pb-2 pt-5 w-full text-sm text-slate-800 bg-slate-50/50 border rounded-xl appearance-none focus:outline-none focus:ring-0 peer transition-all ${error ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-purple-600 focus:bg-white'}`}
      placeholder=" "
    />
    <label className={`absolute text-sm duration-300 transform -translate-y-3 scale-75 top-3.5 z-10 origin-[top_right] right-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 peer-focus:text-purple-600 ${error ? 'text-red-500' : 'text-slate-400'}`}>
      {label}
    </label>
    {Icon && <Icon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${error ? 'text-red-400' : 'text-slate-400 peer-focus:text-purple-600'}`} />}
  </div>
);

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, signInWithGoogle, sendPhoneOTP, verifyPhoneOTP, setupRecaptcha } = useAuth();
  const t = (key: string) => key;

  const [formData, setFormData] = useState({
    phone: '', email: '', password: '', confirmPassword: '', accountType: 'player',
    name: '', agreeToTerms: false, country: '', countryCode: '', currency: '', currencySymbol: '', organizationCode: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrationMethod, setRegistrationMethod] = useState<'phone' | 'email' | null>(null);
  const [formStep, setFormStep] = useState(1);
  const [showOrgCode, setShowOrgCode] = useState(false);

  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false); // New State
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [showTerms, setShowTerms] = useState(false);

  const [phoneExistsError, setPhoneExistsError] = useState('');
  const [orgCodeError, setOrgCodeError] = useState('');
  const [orgPreview, setOrgPreview] = useState<any>(null);
  const phoneCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const orgCodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      if (phoneCheckTimeoutRef.current) clearTimeout(phoneCheckTimeoutRef.current);
      if (nums.length > 6) {
        phoneCheckTimeoutRef.current = setTimeout(async () => {
          if (!formData.countryCode) return;
        }, 500);
      }
      return;
    }
    setFormData(p => ({ ...p, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }));
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const c = countries.find(x => x.name === e.target.value);
    setFormData(p => ({ ...p, country: c?.name || '', countryCode: c?.code || '', phone: '' }));
  };

  const handleGoogleSignUp = async () => {
    if (!formData.accountType) { setError('اختر نوع الحساب'); return; }
    try {
      const res = await signInWithGoogle(formData.accountType as any);
      router.replace(getDashboardRoute(res.userData.accountType));
    } catch (e: any) { setError(e.message); }
  };

  /* --- Register Handler --- */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setPhoneExistsError('');

    if (!formData.name) return setError('الاسم مطلوب');
    if (!formData.country) return setError('الدولة مطلوبة');
    if (registrationMethod === 'phone' && !formData.phone) return setError('الهاتف مطلوب');
    if (registrationMethod === 'email' && !isValidEmail(formData.email)) return setError('بريد غير صحيح');

    if (formData.password.length < 8) return setError('كلمة المرور قصيرة (8+)');
    if (formData.password !== formData.confirmPassword) return setError('كلمات المرور غير متطابقة');
    if (!formData.agreeToTerms) return setError('موافقة الشروط مطلوبة');

    setLoading(true);

    try {
      if (registrationMethod === 'email') {
        console.log('Creating Email Account...');
        await registerUser(formData.email, formData.password, formData.accountType as any, {
          full_name: formData.name, country: formData.country, countryCode: formData.countryCode, organizationCode: formData.organizationCode, phone: ''
        });

        // Send Verify Email
        if (auth.currentUser) {
          console.log('Sending Verification Email...');
          await sendEmailVerification(auth.currentUser);
        }

        toast.success('تم إرسال رابط التفعيل!');
        setEmailVerificationSent(true); // Show Success UI

      } else {
        const raw = formData.phone.replace(/^0+/, '');
        const full = `${formData.countryCode}${raw}`;
        let appVerifier = (window as any).recaptchaVerifier;
        if (!appVerifier) appVerifier = await setupRecaptcha('recaptcha-container');
        const conf = await sendPhoneOTP(full, appVerifier);
        setConfirmationResult(conf);
        setPendingPhone(full);
        localStorage.setItem('pendingRegistration', JSON.stringify({ ...formData, phone: full }));
        setShowPhoneVerification(true);
      }
    } catch (err: any) {
      setError(err.message || 'فشل التسجيل');
      if ((window as any).recaptchaVerifier) (window as any).recaptchaVerifier.clear();
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
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 font-sans" dir="rtl">

        <div className="w-full max-w-[480px]">
          <div className="text-center mb-6">
            <h1 className="text-xl font-black text-slate-800 font-cairo">إنشاء حساب جديد</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

            {registrationMethod && (
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <button onClick={() => { setRegistrationMethod(null); setFormStep(1); }} className="text-xs font-bold text-slate-500 hover:text-purple-600 flex items-center gap-1"><ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" /> تغيير الطريقة</button>
                <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-md">{accountTypes.find(x => x.value === formData.accountType)?.label}</span>
              </div>
            )}

            <div className="p-5">
              <form onSubmit={handleRegister} className="space-y-5">

                {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-bold flex gap-2 items-center"><AlertTriangle className="w-4 h-4" />{error}</div>}

                {!registrationMethod && (
                  <div className="space-y-5 animate-in fade-in">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">نوع الحساب</label>
                      <div className="grid grid-cols-3 gap-2">
                        {accountTypes.map(t => (
                          <button type="button" key={t.value} onClick={() => setFormData(p => ({ ...p, accountType: t.value }))} className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border transition-all h-20 ${formData.accountType === t.value ? 'border-purple-600 bg-purple-50 text-purple-700 ring-1 ring-purple-600/20' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-300'}`}>
                            <t.icon className="w-5 h-5" />
                            <span className="text-[10px] font-bold">{t.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2"><div className="h-px bg-slate-100 flex-1"></div><span className="text-[10px] font-bold text-slate-400">التسجيل بواسطة</span><div className="h-px bg-slate-100 flex-1"></div></div>
                      <div className="flex gap-2">
                        <button type="button" onClick={handleGoogleSignUp} className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all text-xs font-bold text-slate-700 shadow-sm"><svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg> Google</button>
                        <button type="button" disabled title="غير متاح حالياً" className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed text-xs font-bold shadow-none opacity-60"><Phone className="w-4 h-4" /> الهاتف (قريباً)</button>
                        <button type="button" onClick={() => setRegistrationMethod('email')} className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border border-slate-200 hover:bg-teal-50 hover:border-teal-200 transition-all text-xs font-bold text-teal-700 shadow-sm"><Mail className="w-4 h-4" /> البريد</button>
                      </div>
                    </div>
                  </div>
                )}

                {registrationMethod && (
                  <div className="space-y-4 animate-in slide-in-from-right-4">

                    {formStep === 1 && (
                      <div className="space-y-3">
                        <FloatingInput name="name" label="الاسم الكامل" value={formData.name} onChange={handleInputChange} icon={User} required />

                        <div className="relative group">
                          <select name="country" value={formData.country} onChange={handleCountryChange} className="block px-4 pb-2 pt-5 w-full text-sm font-semibold text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:border-purple-600 peer cursor-pointer">
                            <option value="">اختر الدولة</option>
                            {countries.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
                          </select>
                          <label className="absolute text-sm text-slate-400 duration-300 transform -translate-y-3 scale-75 top-3.5 z-10 origin-[top_right] right-4 peer-focus:text-purple-600 pointer-events-none">الدولة</label>
                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>

                        <FloatingInput name="email" label="البريد الإلكتروني" type="email" value={formData.email} onChange={handleInputChange} icon={Mail} required />

                        <button type="button" onClick={() => { if (formData.name && formData.country && isValidEmail(formData.email)) setFormStep(2); else setError('أكمل البيانات'); }} className="w-full bg-slate-900 text-white font-bold h-12 rounded-xl text-sm shadow-lg shadow-slate-200 mt-2">التالي</button>
                      </div>
                    )}

                    {formStep === 2 && (
                      <div className="space-y-3 animate-in slide-in-from-right-4">
                        <FloatingInput name="password" label="كلمة المرور" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleInputChange} icon={Lock} />
                        <FloatingInput name="confirmPassword" label="تأكيد كلمة المرور" type={showPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={handleInputChange} icon={Lock} />

                        <button type="button" onClick={() => setShowOrgCode(!showOrgCode)} className="text-[10px] text-purple-600 font-bold flex items-center gap-1 hover:underline">
                          {showOrgCode ? 'إخفاء كود الانضمام' : 'لديك كود انضمام؟'}
                        </button>
                        {showOrgCode && (
                          <FloatingInput name="organizationCode" label="كود الانضمام" value={formData.organizationCode} onChange={handleInputChange} icon={Users} />
                        )}

                        <div className="flex items-start gap-2 py-2">
                          <input type="checkbox" checked={formData.agreeToTerms} onChange={(e) => setFormData(p => ({ ...p, agreeToTerms: e.target.checked }))} className="mt-1 w-4 h-4 accent-purple-600" />
                          <span className="text-xs text-slate-500 font-medium leading-tight">أوافق على <button type="button" onClick={() => setShowTerms(true)} className="text-purple-600 font-bold underline">الشروط</button></span>
                        </div>

                        <div className="flex gap-2">
                          <button type="button" onClick={() => setFormStep(1)} className="px-4 bg-slate-100 text-slate-600 font-bold h-12 rounded-xl text-sm">رجوع</button>
                          <button type="submit" disabled={loading} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold h-12 rounded-xl text-sm shadow-lg shadow-purple-200 transition-all">{loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'تأكيد التسجيل'}</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-center pt-2">
                  <p className="text-xs text-slate-400">لديك حساب؟ <button type="button" onClick={() => router.push('/auth/login')} className="text-purple-600 font-bold hover:underline">دخول</button></p>
                </div>
              </form>
            </div>
          </div>

          <WhatsAppOTPVerification phoneNumber={pendingPhone || ''} name={formData.name} isOpen={showPhoneVerification} onVerificationSuccess={() => { }} onVerificationFailed={setError} onClose={() => setShowPhoneVerification(false)} onOTPVerify={(otp) => { verifyPhoneOTP(confirmationResult, otp, formData.accountType as any, { full_name: formData.name, country: formData.country, countryCode: formData.countryCode, phone: pendingPhone }); }} title="تفعيل الهاتف" subtitle="أدخل الرمز المرسل" otpExpirySeconds={300} maxAttempts={3} language="ar" t={t} />
          <div id="recaptcha-container"></div>
        </div>
      </div>
    </>
  );
}
