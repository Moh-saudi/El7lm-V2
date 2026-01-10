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

const FloatingInput = ({ label, icon: Icon, error, id, ...props }: any) => (
  <div className="relative group">
    <input
      id={id}
      {...props}
      className={`block px-4 pb-2 pt-5 w-full text-sm text-slate-800 bg-slate-50/50 border rounded-xl appearance-none focus:outline-none focus:ring-0 peer transition-all ${error ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-purple-600 focus:bg-white'}`}
      placeholder=" "
    />
    <label htmlFor={id} className={`absolute text-sm duration-300 transform -translate-y-3 scale-75 top-3.5 z-10 origin-[top_right] right-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 peer-focus:text-purple-600 ${error ? 'text-red-500' : 'text-slate-400'}`}>
      {label}
    </label>
    {Icon && <Icon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${error ? 'text-red-400' : 'text-slate-400 peer-focus:text-purple-600'}`} aria-hidden="true" />}
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
  // formStep removed for single-step flow
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
        const res = await registerUser(formData.email, formData.password, formData.accountType as any, {
          full_name: formData.name, country: formData.country, countryCode: formData.countryCode, organizationCode: formData.organizationCode, phone: ''
        });

        // Auto-create join request if code is provided
        if (formData.organizationCode && formData.accountType === 'player' && res) {
          try {
            await organizationReferralService.createJoinRequest(res.uid, res, formData.organizationCode);
            console.log('✅ Auto-join request created for code:', formData.organizationCode);
          } catch (joinErr) {
            console.warn('⚠️ Could not create auto-join request:', joinErr);
            // Don't fail the whole registration if this fails
          }
        }

        // Send Verify Email (via Resend API)
        if (auth.currentUser) {
          console.log('Sending Verification Email via Resend...');
          try {
            await fetch('/api/auth/send-verification-link', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: formData.email,
                name: formData.name
              })
            });
          } catch (emailErr) {
            console.error('Failed to send verification email, but account created', emailErr);
            // We still proceed to show success UI
          }
        }

        toast.success('تم إرسال رابط التفعيل!');
        setEmailVerificationSent(true); // Show Success UI

      } else {
        const raw = formData.phone.replace(/^0+/, '');
        const full = `${formData.countryCode}${raw}`;

        // Check if phone exists
        try {
          const checkRes = await fetch('/api/auth/check-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber: full }),
          });
          const checkData = await checkRes.json();
          if (checkRes.ok && checkData.exists) {
            setError(`رقم الهاتف مسجل بالفعل باسم ${checkData.userName}. يرجى تسجيل الدخول.`);
            toast.error('هذا الرقم موجود بالفعل');
            setLoading(false);
            return;
          }
        } catch (e) { /* continue if check fails */ }

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
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-slate-50 to-purple-50 font-sans" dir="rtl">

        <div className="w-full max-w-[540px] animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-indigo-700 font-cairo mb-2">أهلاً بك في منصة الحلم</h1>
            <p className="text-slate-500 text-sm font-medium">ابدأ رحلتك الرياضية اليوم باختيار نوع حسابك</p>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-purple-200/50 border border-white overflow-hidden">

            {registrationMethod && (
              <div className="px-6 py-4 border-b border-slate-100/50 flex items-center justify-between bg-white/50">
                <button
                  onClick={() => { setRegistrationMethod(null); }}
                  className="text-xs font-bold text-slate-500 hover:text-purple-600 flex items-center gap-1 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100"
                >
                  <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                  تغيير الطريقة
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">الحساب:</span>
                  <span className="text-xs font-black text-purple-700 bg-purple-100/80 px-3 py-1 rounded-full border border-purple-200/50">
                    {accountTypes.find(x => x.value === formData.accountType)?.label}
                  </span>
                </div>
              </div>
            )}

            <div className="p-6 md:p-8">
              <form onSubmit={handleRegister} className="space-y-6">

                {error && (
                  <div className="p-4 bg-red-50/80 backdrop-blur-sm text-red-600 rounded-2xl text-xs font-bold flex gap-3 items-center border border-red-100 animate-in shake duration-500">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    {error}
                  </div>
                )}

                {!registrationMethod && (
                  <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-slate-700 uppercase tracking-widest">اختر دورك</label>
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">نوع الحساب</span>
                      </div>

                      <div className="flex flex-wrap gap-3 justify-between" role="radiogroup" aria-label="اختر دورك">
                        {accountTypes.map(t => (
                          <div key={t.value} className="w-[calc(50%-6px)] sm:w-[calc(33.33%-8px)]">
                            <button
                              type="button"
                              onClick={() => setFormData(p => ({ ...p, accountType: t.value }))}
                              role="radio"
                              aria-checked={formData.accountType === t.value}
                              className={`group relative flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition-all duration-300 min-h-[90px] w-full ${formData.accountType === t.value
                                ? 'border-purple-600 bg-purple-50/50 text-purple-700 ring-1 ring-purple-600/20 shadow-sm'
                                : 'border-slate-100 bg-white text-slate-500 hover:border-purple-200'
                                }`}
                            >
                              <div className={`p-2 rounded-xl transition-all duration-300 ${formData.accountType === t.value
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-100 text-slate-400 group-hover:bg-purple-100'
                                }`}>
                                <t.icon className="w-4 h-4" aria-hidden="true" />
                              </div>
                              <span className="text-[10px] font-black text-center leading-tight">{t.label}</span>

                              {formData.accountType === t.value && (
                                <div className="absolute top-1.5 left-1.5">
                                  <CheckCircle className="w-3.5 h-3.5 text-purple-600" />
                                </div>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="h-px bg-slate-100 flex-1"></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-3">أو استمر بواسطة</span>
                        <div className="h-px bg-slate-100 flex-1"></div>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5">
                        <button
                          type="button"
                          onClick={handleGoogleSignUp}
                          className="flex items-center justify-center gap-3 h-12 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all text-sm font-black text-slate-700 shadow-sm"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                          <span>Google</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRegistrationMethod('email')}
                          className="flex items-center justify-center gap-3 h-12 rounded-xl border border-purple-200 bg-purple-600 hover:bg-purple-700 transition-all text-sm font-black text-white shadow-lg shadow-purple-200"
                        >
                          <Mail className="w-5 h-5" />
                          <span>البريد الإلكتروني</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {registrationMethod && (
                  <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">

                    <div className="space-y-5">
                      <FloatingInput id="reg-name" name="name" label="الاسم الكامل" value={formData.name} onChange={handleInputChange} icon={User} required />

                      <div className="relative group">
                        <label htmlFor="reg-country" className="absolute text-xs font-bold text-slate-400 duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[top_right] right-4 peer-focus:text-purple-600 pointer-events-none uppercase tracking-widest">الدولة</label>
                        <select
                          id="reg-country"
                          name="country"
                          value={formData.country}
                          onChange={handleCountryChange}
                          className="block px-4 pb-2 pt-6 w-full text-sm font-black text-slate-800 bg-slate-50/50 border border-slate-200 rounded-[1.25rem] appearance-none focus:outline-none focus:border-purple-600 focus:bg-white peer cursor-pointer transition-all"
                        >
                          <option value="">اختر الدولة</option>
                          {countries.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
                        </select>
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors pointer-events-none" aria-hidden="true" />
                      </div>

                      <FloatingInput id="reg-email" name="email" label="البريد الإلكتروني" type="email" value={formData.email} onChange={handleInputChange} icon={Mail} required />

                      <div className="relative">
                        <FloatingInput id="reg-password" name="password" label="كلمة المرور" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleInputChange} icon={Lock} />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-10 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-600 transition-colors p-2 -m-2 min-w-[32px] min-h-[32px] flex items-center justify-center"
                          aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      <FloatingInput id="reg-confirm-password" name="confirmPassword" label="تأكيد كلمة المرور" type={showPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={handleInputChange} icon={Lock} />

                      {formData.accountType === 'player' && (
                        <div className="bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/80 border-2 border-dashed border-purple-200 rounded-2xl p-5 my-6 relative overflow-hidden group hover:border-purple-400 hover:shadow-md transition-all duration-300">
                          <div className="absolute top-0 left-0 w-20 h-20 bg-purple-100/50 rounded-full -translate-x-10 -translate-y-10 blur-xl"></div>

                          <div className="flex items-start gap-3 mb-4 relative z-10">
                            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0 text-purple-700 shadow-sm border border-purple-200">
                              <Users className="w-5 h-5" />
                            </div>
                            <div className="space-y-0.5">
                              <h3 className="text-sm font-black text-purple-900">هل لديك كود انضمام؟</h3>
                              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                إذا كنت تنضم إلى نادٍ أو أكاديمية، أدخل الكود الخاص بهم هنا ليتم ربط حسابك مباشرة.
                              </p>
                            </div>
                          </div>

                          <div className="relative z-10 bg-white rounded-xl shadow-sm">
                            <FloatingInput
                              id="reg-org-code"
                              name="organizationCode"
                              label="أدخل كود الانضمام (اختياري)"
                              value={formData.organizationCode}
                              onChange={handleInputChange}
                              icon={Globe}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-3 p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
                        <div className="relative flex items-center pt-0.5">
                          <input
                            id="terms-checkbox"
                            type="checkbox"
                            checked={formData.agreeToTerms}
                            onChange={(e) => setFormData(p => ({ ...p, agreeToTerms: e.target.checked }))}
                            className="w-5 h-5 rounded-lg border-slate-200 text-purple-600 focus:ring-purple-500 transition-all cursor-pointer accent-purple-600"
                          />
                        </div>
                        <label htmlFor="terms-checkbox" className="text-xs text-slate-500 font-medium leading-relaxed">
                          أوافق على <button type="button" onClick={() => setShowTerms(true)} className="text-purple-700 font-black underline decoration-purple-200 underline-offset-4 hover:decoration-purple-600 transition-all">شروط الخدمة</button> و سياسة الخصوصية الخاصة بمنصة الحلم.
                        </label>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="submit"
                          disabled={loading}
                          className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black h-14 rounded-2xl text-sm shadow-xl shadow-purple-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                            <>
                              <span>إنشاء الحساب</span>
                              <CheckCircle className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-center pt-4 border-t border-slate-50/50">
                  <p className="text-sm text-slate-400 font-medium">
                    لديك حساب بالفعل؟
                    <button type="button" onClick={() => router.push('/auth/login')} className="bg-slate-100 hover:bg-slate-200 text-purple-700 font-black px-4 py-1.5 rounded-full mr-2 transition-all">دخول</button>
                  </p>
                </div>
              </form>
            </div>
          </div>

          <WhatsAppOTPVerification
            phoneNumber={pendingPhone || ''}
            name={formData.name}
            isOpen={showPhoneVerification}
            onVerificationSuccess={() => { }}
            onVerificationFailed={setError}
            onClose={() => setShowPhoneVerification(false)}
            onOTPVerify={async (otp) => {
              const res = await verifyPhoneOTP(confirmationResult, otp, formData.accountType as any, {
                full_name: formData.name,
                country: formData.country,
                countryCode: formData.countryCode,
                phone: pendingPhone,
                organizationCode: formData.organizationCode
              });

              // Auto-create join request if code is provided
              if (formData.organizationCode && formData.accountType === 'player' && res?.userData) {
                try {
                  await organizationReferralService.createJoinRequest(res.user.uid, res.userData, formData.organizationCode);
                  console.log('✅ Auto-join request created for code:', formData.organizationCode);
                } catch (joinErr) {
                  console.warn('⚠️ Could not create auto-join request:', joinErr);
                }
              }
            }}
            title="تفعيل الهاتف"
            subtitle="أدخل الرمز المرسل"
            otpExpirySeconds={300}
            maxAttempts={3}
            language="ar"
            t={t}
          />
          <div id="recaptcha-container"></div>
        </div>
      </div>
    </>
  );
}
