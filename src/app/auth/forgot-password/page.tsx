'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, KeyRound, Loader2, Phone, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// Full country list from the registration page
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

type Step = 'phone' | 'otp' | 'password';

// Progress bar component to guide the user
const ProgressBar = ({ step }: { step: Step }) => {
  const steps = ['phone', 'otp', 'password'];
  const currentStepIndex = steps.indexOf(step);
  const progressPercentage = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div className="w-full px-10 pt-4 pb-2">
      <div className="relative h-2 bg-gray-200 rounded-full">
        <div
          className="absolute top-0 left-0 h-2 bg-purple-600 rounded-full transition-all duration-500"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <span>رقم الهاتف</span>
        <span>التحقق</span>
        <span>كلمة المرور</span>
      </div>
    </div>
  );
};

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullPhoneNumber, setFullPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+20');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handlePhoneSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    const fullNumber = `${countryCode}${phoneNumber}`;
    setFullPhoneNumber(fullNumber);

    try {
      const res = await fetch('/api/sms/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: fullNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إرسال الرمز');

      toast.success('تم إرسال رمز التحقق بنجاح');
      setStep('otp');
      setResendCooldown(60); // Start 60-second cooldown
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/sms/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: fullPhoneNumber, otp }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'رمز التحقق غير صحيح');

      toast.success('تم التحقق من الرمز بنجاح');
      setStep('password');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('كلمتا المرور غير متطابقتين');
      return;
    }
    if (newPassword.length < 6) {
        toast.error('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل');
        return;
    }
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: fullPhoneNumber, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تحديث كلمة المرور');

      toast.success('تم تحديث كلمة المرور بنجاح! سيتم توجيهك لتسجيل الدخول.');
      setTimeout(() => router.push('/auth/login'), 2000);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const StepIcon = () => {
      switch(step) {
          case 'phone': return <Phone className="w-8 h-8 text-purple-600" />;
          case 'otp': return <KeyRound className="w-8 h-8 text-purple-600" />;
          case 'password': return <ShieldCheck className="w-8 h-8 text-purple-600" />;
          default: return null;
      }
  }

  const renderStep = () => {
    switch (step) {
      case 'phone':
        return (
          <form onSubmit={handlePhoneSubmit}>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="country">الدولة</Label>
                <select
                  id="country"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 transition"
                >
                  {countries.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <div className="flex">
                   <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-r-0 border-gray-300 rounded-r-md">
                     {countryCode}
                   </span>
                  <Input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="1012345678"
                    required
                    className="rounded-r-none text-left"
                    dir="ltr"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Phone className="mr-2 h-4 w-4" />}
                إرسال الرمز
              </Button>
            </CardFooter>
          </form>
        );
      case 'otp':
        return (
          <form onSubmit={handleOtpSubmit}>
            <CardContent>
              <Label htmlFor="otp">رمز التحقق</Label>
              <Input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                maxLength={6}
                placeholder="· · · · · ·"
                required
                className="text-center text-2xl font-bold tracking-[0.5em] mt-2"
                dir="ltr"
              />
            </CardContent>
            <CardFooter className="flex-col gap-4">
              <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                تحقق من الرمز
              </Button>
              <Button
                variant="link"
                onClick={() => handlePhoneSubmit()}
                disabled={resendCooldown > 0 || loading}
              >
                {resendCooldown > 0 ? `أعد الإرسال بعد ${resendCooldown} ثانية` : 'ألم تستلم الرمز؟ أعد الإرسال'}
              </Button>
            </CardFooter>
          </form>
        );
      case 'password':
        return (
          <form onSubmit={handlePasswordSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="********"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="********"
                  required
                />
              </div>
               <div className="text-xs text-gray-500 flex items-center pt-2">
                   <ShieldAlert className="w-4 h-4 ml-2"/>
                   يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.
               </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                حفظ كلمة المرور
              </Button>
            </CardFooter>
          </form>
        );
    }
  };

  const titles = {
    phone: 'إعادة تعيين كلمة المرور',
    otp: 'التحقق من الرمز',
    password: 'تعيين كلمة مرور جديدة'
  }

  const descriptions = {
      phone: 'أدخل رقم هاتفك المسجل لإرسال رمز التحقق.',
      otp: `أدخل الرمز المكون من 6 أرقام الذي تم إرساله إلى ${fullPhoneNumber}.`,
      password: 'أدخل كلمة المرور الجديدة لحسابك.'
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-purple-950 p-4" dir="rtl">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl shadow-purple-500/10 border border-purple-100 bg-white/95 backdrop-blur">
          <ProgressBar step={step} />
          <CardHeader className="text-center">
            <div className="mx-auto bg-purple-100 p-3 rounded-full w-fit mb-4">
                <StepIcon />
            </div>
            <CardTitle>{titles[step]}</CardTitle>
            <CardDescription>{descriptions[step]}</CardDescription>
          </CardHeader>
          {renderStep()}
        </Card>
        <Button variant="ghost" onClick={() => router.push('/auth/login')} className="w-full mt-4 text-gray-600">
            <ArrowRight className="ml-2 h-4 w-4" />
            العودة إلى تسجيل الدخول
        </Button>
      </div>
    </div>
  );
}
