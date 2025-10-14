'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Phone, KeyRound, ShieldCheck, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

// Re-using the same country list from the old implementation
const countries = [
  { name: 'السعودية', code: '+966', phoneLength: 9 },
  { name: 'الإمارات', code: '+971', phoneLength: 9 },
  { name: 'الكويت', code: '+965', phoneLength: 8 },
  { name: 'قطر', code: '+974', phoneLength: 8 },
  { name: 'البحرين', code: '+973', phoneLength: 8 },
  { name: 'عمان', code: '+968', phoneLength: 8 },
  { name: 'مصر', code: '+20', phoneLength: 10 },
  { name: 'الأردن', code: '+962', phoneLength: 9 },
  { name: 'المغرب', code: '+212', phoneLength: 9 },
  // Add other countries as needed
];

type Step = 'phone' | 'otp' | 'password';

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

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const renderStep = () => {
    switch (step) {
      case 'phone':
        return (
          <form onSubmit={handlePhoneSubmit}>
            <CardHeader>
              <CardTitle>إعادة تعيين كلمة المرور</CardTitle>
              <CardDescription>أدخل رقم هاتفك المسجل لإرسال رمز التحقق.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="country">الدولة</Label>
                <select
                  id="country"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  {countries.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <div className="flex">
                   <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-r-0 border-gray-300 rounded-l-md">
                     {countryCode}
                   </span>
                  <Input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="1012345678"
                    required
                    className="rounded-l-none"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Phone className="mr-2 h-4 w-4" />}
                إرسال الرمز
              </Button>
            </CardFooter>
          </form>
        );
      case 'otp':
        return (
          <form onSubmit={handleOtpSubmit}>
            <CardHeader>
              <CardTitle>التحقق من الرمز</CardTitle>
              <CardDescription>أدخل الرمز المكون من 6 أرقام الذي تم إرساله إلى {fullPhoneNumber}.</CardDescription>
            </CardHeader>
            <CardContent>
              <Label htmlFor="otp">رمز التحقق</Label>
              <Input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                placeholder="_ _ _ _ _ _"
                required
                className="text-center tracking-[1em]"
              />
            </CardContent>
            <CardFooter className="flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                تحقق من الرمز
              </Button>
              <Button variant="link" onClick={() => setStep('phone')}>
                تغيير رقم الهاتف
              </Button>
            </CardFooter>
          </form>
        );
      case 'password':
        return (
          <form onSubmit={handlePasswordSubmit}>
            <CardHeader>
              <CardTitle>تعيين كلمة مرور جديدة</CardTitle>
              <CardDescription>أدخل كلمة المرور الجديدة لحسابك.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                حفظ كلمة المرور
              </Button>
            </CardFooter>
          </form>
        );
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4" dir="rtl">
      <div className="w-full max-w-md">
        <Card>
          {renderStep()}
        </Card>
        {step !== 'phone' && (
            <Button variant="ghost" onClick={() => router.push('/auth/login')} className="w-full mt-4">
                العودة إلى تسجيل الدخول
                <ArrowRight className="mr-2 h-4 w-4" />
            </Button>
        )}
      </div>
    </div>
  );
}
