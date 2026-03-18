'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getBrandingData, BrandingData } from '@/lib/content/branding-service';
import { countries } from '@/lib/constants/countries';
import { validatePhoneForCountry } from '@/lib/validation/phone-validation';
import { toast, Toaster } from 'sonner';
import Image from 'next/image';
import { Loader2, Star, ChevronRight, Eye, EyeOff } from 'lucide-react';

type Method = 'whatsapp' | 'email';
type WhatsAppStep = 'phone' | 'otp' | 'password' | 'success';
type EmailStep = 'input' | 'sent';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [method, setMethod] = useState<Method>('whatsapp');

  /* ─── WhatsApp flow state ─── */
  const [waStep, setWaStep] = useState<WhatsAppStep>('phone');
  const [selectedCountry, setSelectedCountry] = useState(
    () => countries.find(c => c.code === '+20') || countries[0]
  );
  const [phone, setPhone] = useState('');
  const [phoneFormatError, setPhoneFormatError] = useState<string | null>(null);
  const [sendLoading, setSendLoading] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const resendTimer = useRef<NodeJS.Timeout | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  /* ─── Email flow state ─── */
  const [emailStep, setEmailStep] = useState<EmailStep>('input');
  const [email, setEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  const fullPhone = `${selectedCountry.code}${phone.replace(/^0+/, '').trim()}`;

  /* ─── Init ─── */
  useEffect(() => {
    getBrandingData().then(setBranding).catch(() => {});
  }, []);

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
        if (code) { const c = countries.find(x => x.code === code); if (c) setSelectedCountry(c); }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const clean = phone.replace(/^0+/, '').trim().replace(/\D/g, '');
    if (clean.length < 4) { setPhoneFormatError(null); return; }
    setPhoneFormatError(validatePhoneForCountry(clean, selectedCountry.code));
  }, [phone, selectedCountry]);

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

  /* ─── WhatsApp handlers ─── */
  const handleSendOTP = async () => {
    const clean = phone.replace(/^0+/, '').trim();
    if (clean.length < 7) { toast.error('يرجى إدخال رقم واتساب صحيح'); return; }
    if (phoneFormatError) { toast.error(`⚠️ ${phoneFormatError}`); return; }

    setSendLoading(true);
    try {
      const checkRes = await fetch('/api/auth/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: fullPhone }),
      });
      const checkData = await checkRes.json();
      if (!checkData.exists) {
        toast.error('رقم الهاتف غير مسجل في المنصة');
        return;
      }
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: fullPhone, purpose: 'password_reset', channel: 'whatsapp' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'فشل إرسال الرمز');
      toast.success('تم إرسال رمز التحقق عبر WhatsApp ✅');
      setOtp(['', '', '', '', '', '']);
      setWaStep('otp');
      startResendTimer();
      setTimeout(() => otpRefs.current[0]?.focus(), 150);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSendLoading(false);
    }
  };

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

  const handleVerifyOTP = async (otpCode: string) => {
    if (verifyLoading) return;
    setVerifyLoading(true);
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: fullPhone, otp: otpCode }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'رمز غير صحيح');
        setOtp(['', '', '', '', '', '']);
        setTimeout(() => otpRefs.current[0]?.focus(), 50);
        return;
      }
      setWaStep('password');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResend = async () => {
    setSendLoading(true);
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: fullPhone, purpose: 'password_reset', channel: 'whatsapp' }),
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
      setSendLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 8) { toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return; }
    if (newPassword !== confirmPassword) { toast.error('كلمتا المرور غير متطابقتين'); return; }
    setResetLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: fullPhone, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'فشل تغيير كلمة المرور');
      setWaStep('success');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  /* ─── Email handler ─── */
  const handleSendResetEmail = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('يرجى إدخال بريد إلكتروني صحيح');
      return;
    }
    setEmailLoading(true);
    try {
      const res = await fetch('/api/auth/generate-reset-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'فشل إرسال الرابط');
      setEmailStep('sent');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setEmailLoading(false);
    }
  };

  /* ─── UI helpers ─── */
  const isInProgress = (method === 'whatsapp' && waStep !== 'phone') ||
                       (method === 'email' && emailStep !== 'input');
  const isSuccess = (method === 'whatsapp' && waStep === 'success') ||
                    (method === 'email' && emailStep === 'sent');

  // Progress dots for WhatsApp: phone(0) → otp(1) → password(2)
  const waStepIndex: Record<WhatsAppStep, number> = { phone: 0, otp: 1, password: 2, success: 2 };

  const pageTitle = () => {
    if (method === 'email') return emailStep === 'sent' ? 'تم الإرسال!' : 'نسيت كلمة المرور';
    if (waStep === 'success') return 'تم بنجاح!';
    if (waStep === 'password') return 'كلمة مرور جديدة';
    if (waStep === 'otp') return 'رمز التحقق';
    return 'نسيت كلمة المرور';
  };

  const pageSubtitle = () => {
    if (method === 'email') return emailStep === 'sent' ? 'تحقق من صندوق بريدك الإلكتروني' : 'سنرسل رابط إعادة التعيين لبريدك';
    if (waStep === 'success') return 'يمكنك الآن تسجيل الدخول بكلمة مرورك الجديدة';
    if (waStep === 'password') return 'أدخل كلمة المرور الجديدة';
    if (waStep === 'otp') return 'أُرسل رمز التحقق عبر WhatsApp';
    return 'أدخل رقم واتساب المسجل في حسابك';
  };

  return (
    <div className="min-h-screen bg-[#f7f7f8] flex flex-col items-center justify-center py-4 sm:py-10 px-4 font-cairo" dir="rtl">
      <Toaster position="top-center" dir="rtl" richColors />

      {/* Progress dots — WhatsApp only */}
      {method === 'whatsapp' && !isSuccess && (
        <div className="flex items-center gap-2 mb-4">
          {[0, 1, 2].map(i => (
            <div key={i} className={`transition-all duration-300 rounded-full ${
              i === waStepIndex[waStep] ? 'w-6 h-2 bg-slate-900'
              : i < waStepIndex[waStep] ? 'w-2 h-2 bg-slate-400'
              : 'w-2 h-2 bg-slate-200'
            }`} />
          ))}
        </div>
      )}
      {/* Spacer for email or success to keep layout consistent */}
      {(method === 'email' || isSuccess) && <div className="mb-4 h-4" />}

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-8">

        {/* Logo + heading */}
        <div className="flex flex-col items-center mb-5 sm:mb-6">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden relative mb-3 flex items-center justify-center bg-slate-100">
            {branding?.logoUrl
              ? <Image src={branding.logoUrl} alt={branding.siteName || 'El7lm'} fill className="object-contain p-1.5" />
              : <Star className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700 fill-slate-700" />
            }
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">{pageTitle()}</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 text-center">{pageSubtitle()}</p>
        </div>

        {/* ── Method toggle (only on first step) ── */}
        {!isInProgress && !isSuccess && (
          <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl mb-5">
            <button
              type="button"
              onClick={() => setMethod('whatsapp')}
              className={`flex-1 h-9 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-lg transition-all ${
                method === 'whatsapp' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>💬</span> واتساب
            </button>
            <button
              type="button"
              onClick={() => setMethod('email')}
              className={`flex-1 h-9 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-lg transition-all ${
                method === 'email' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>✉️</span> البريد الإلكتروني
            </button>
          </div>
        )}

        {/* ════════════════ WhatsApp Flow ════════════════ */}

        {/* Step 1: Phone */}
        {method === 'whatsapp' && waStep === 'phone' && (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex gap-2">
              <select
                value={selectedCountry.code}
                onChange={e => {
                  const c = countries.find(x => x.code === e.target.value);
                  if (c) { setSelectedCountry(c); setPhone(''); }
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
                  phoneFormatError ? 'border-orange-400 focus:ring-orange-400' : 'border-slate-200 focus:ring-slate-900'
                }`}
              />
            </div>
            {phoneFormatError && <p className="text-xs text-orange-600 font-medium">⚠️ {phoneFormatError}</p>}
            <button
              type="button"
              onClick={handleSendOTP}
              disabled={sendLoading || phone.length < 7 || !!phoneFormatError}
              className="w-full h-10 sm:h-11 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {sendLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إرسال رمز التحقق عبر WhatsApp'}
            </button>
          </div>
        )}

        {/* Step 2: OTP */}
        {method === 'whatsapp' && waStep === 'otp' && (
          <div className="space-y-4 sm:space-y-5">
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-xs text-slate-600 font-medium" dir="ltr">
                <span>{fullPhone}</span>
                <button type="button" onClick={() => { setWaStep('phone'); setOtp(['', '', '', '', '', '']); }}
                  className="text-slate-400 hover:text-slate-700 transition-colors leading-none">✕</button>
              </div>
            </div>
            <div className="flex justify-center gap-2 sm:gap-2.5" dir="ltr">
              {otp.map((digit, i) => (
                <input key={i} ref={el => { otpRefs.current[i] = el; }}
                  type="text" inputMode="numeric" maxLength={1} value={digit}
                  onChange={e => handleOTPChange(i, e.target.value)}
                  onKeyDown={e => handleOTPKeyDown(i, e)}
                  onPaste={i === 0 ? handleOTPPaste : undefined}
                  disabled={verifyLoading || sendLoading}
                  className={`w-10 h-12 sm:w-11 text-center text-lg font-bold rounded-xl border-2 transition-all focus:outline-none disabled:opacity-50 ${
                    digit ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900 focus:border-slate-900'
                  }`}
                />
              ))}
            </div>
            {verifyLoading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                <p className="text-xs text-slate-400">جاري التحقق...</p>
              </div>
            ) : (
              <div className="text-center">
                {canResend
                  ? <button type="button" onClick={handleResend} disabled={sendLoading} className="text-sm text-slate-900 font-semibold hover:underline disabled:opacity-50">إعادة إرسال الرمز</button>
                  : <p className="text-sm text-slate-400">إعادة الإرسال خلال <span className="font-mono font-bold text-slate-600">0:{String(resendSeconds).padStart(2, '0')}</span></p>
                }
              </div>
            )}
            <button type="button" onClick={() => { setWaStep('phone'); setOtp(['', '', '', '', '', '']); }}
              className="w-full flex items-center justify-center gap-1 text-sm text-slate-400 hover:text-slate-700 transition-colors">
              <ChevronRight className="w-4 h-4" /> تغيير الرقم
            </button>
          </div>
        )}

        {/* Step 3: New Password */}
        {method === 'whatsapp' && waStep === 'password' && (
          <div className="space-y-3 sm:space-y-4">
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={newPassword}
                onChange={e => setNewPassword(e.target.value)} placeholder="كلمة المرور الجديدة"
                className="w-full h-10 sm:h-11 rounded-lg border border-slate-200 bg-white px-3 pl-10 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="relative">
              <input type={showConfirm ? 'text' : 'password'} value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleResetPassword()}
                placeholder="تأكيد كلمة المرور"
                className={`w-full h-10 sm:h-11 rounded-lg border bg-white px-3 pl-10 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                  confirmPassword && confirmPassword !== newPassword ? 'border-red-300 focus:ring-red-400' : 'border-slate-200 focus:ring-slate-900'
                }`}
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && confirmPassword !== newPassword && <p className="text-xs text-red-500">كلمتا المرور غير متطابقتين</p>}
            {newPassword.length > 0 && newPassword.length < 8 && <p className="text-xs text-orange-500">⚠️ يجب أن تكون 8 أحرف على الأقل</p>}
            <button type="button" onClick={handleResetPassword}
              disabled={resetLoading || newPassword.length < 8 || newPassword !== confirmPassword}
              className="w-full h-10 sm:h-11 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ كلمة المرور الجديدة'}
            </button>
          </div>
        )}

        {/* ════════════════ Email Flow ════════════════ */}

        {/* Email input */}
        {method === 'email' && emailStep === 'input' && (
          <div className="space-y-3 sm:space-y-4">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendResetEmail()}
              placeholder="البريد الإلكتروني المسجل"
              dir="ltr"
              className="w-full h-10 sm:h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
            />
            <button
              type="button"
              onClick={handleSendResetEmail}
              disabled={emailLoading || !email.trim()}
              className="w-full h-10 sm:h-11 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {emailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إرسال رابط إعادة التعيين'}
            </button>
          </div>
        )}

        {/* ════════════════ Success screens ════════════════ */}

        {/* WhatsApp success */}
        {method === 'whatsapp' && waStep === 'success' && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-slate-500">يمكنك الآن تسجيل الدخول بكلمة مرورك الجديدة</p>
            <button type="button" onClick={() => router.push('/auth/login')}
              className="w-full h-10 sm:h-11 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors">
              تسجيل الدخول
            </button>
          </div>
        )}

        {/* Email sent success */}
        {method === 'email' && emailStep === 'sent' && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-700">تم إرسال الرابط إلى</p>
              <p className="text-sm font-bold text-slate-900 dir-ltr" dir="ltr">{email}</p>
            </div>
            <div className="w-full bg-slate-50 rounded-xl p-4 text-right space-y-2">
              <p className="text-xs font-semibold text-slate-600">الخطوات التالية:</p>
              <ol className="text-xs text-slate-500 space-y-1 list-decimal list-inside">
                <li>افتح صندوق البريد الإلكتروني</li>
                <li>ابحث عن رسالة من منصة الحلم</li>
                <li>اضغط على رابط إعادة التعيين</li>
              </ol>
            </div>
            <div className="flex gap-2 w-full">
              <button type="button"
                onClick={() => { setEmailStep('input'); setEmail(''); }}
                className="flex-1 h-10 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors">
                تغيير البريد
              </button>
              <button type="button" onClick={() => router.push('/auth/login')}
                className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors">
                تسجيل الدخول
              </button>
            </div>
          </div>
        )}

        {/* ── Back link (first steps only) ── */}
        {!isInProgress && !isSuccess && (
          <p className="text-center text-xs sm:text-sm text-slate-500 mt-4">
            تذكرت كلمة المرور؟{' '}
            <button type="button" onClick={() => router.push('/auth/login')} className="text-slate-900 font-semibold hover:underline">
              تسجيل الدخول
            </button>
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-4 mt-5 text-xs text-slate-400">
        <a href="/privacy" className="hover:text-slate-600 transition-colors">الخصوصية</a>
        <span>·</span>
        <a href="/support" className="hover:text-slate-600 transition-colors">المساعدة</a>
      </div>
    </div>
  );
}
