'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { auth } from '@/lib/firebase/config';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { CheckCircle, Info, KeyRound, Loader2, Phone, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { COUNTRIES_FROM_REGISTER } from '@/data/countries-from-register';

// تنسيق رقم الهاتف
const formatPhoneNumber = (phone: string): string => {
    if (!phone) return '';
    let cleaned = phone.replace(/[^\d+]/g, '');
    if (!cleaned.startsWith('+') && cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
    }
    return cleaned.trim();
};

const BABASERVICE_CONFIG = {
    INSTANCE_ID: process.env.NEXT_PUBLIC_BABASERVICE_INSTANCE_ID || '68F243B3A8D8D'
};

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

export default function WhatsAppPasswordReset() {
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
    const [whatsappStatus, setWhatsappStatus] = useState<'checking' | 'connected' | 'disconnected' | null>(null);
    const [detailedError, setDetailedError] = useState<string>('');

    // تسجيل الخروج ومسح البيانات المحفوظة عند تحميل الصفحة
    useEffect(() => {
        const clearAuthData = async () => {
            try {
                // تسجيل الخروج من Firebase
                if (auth.currentUser) {
                    await firebaseSignOut(auth);
                }

                // مسح البيانات المحفوظة في localStorage
                localStorage.removeItem('rememberMe');
                localStorage.removeItem('userPhone');
                localStorage.removeItem('userEmail');
                localStorage.removeItem('accountType');
            } catch (error) {
                console.error('خطأ في مسح بيانات المصادقة:', error);
            }
        };

        clearAuthData();
    }, []);

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
        setDetailedError('');
        setWhatsappStatus('checking');
        const fullNumber = `${countryCode}${phoneNumber}`;
        setFullPhoneNumber(fullNumber);

        try {
            // تنسيق رقم الهاتف بالطريقة الجديدة باستخدام formatPhoneNumber
            const normalizedPhone = fullNumber.replace(/^\+/, ''); // إزالة + أولاً
            const formattedPhone = formatPhoneNumber(normalizedPhone); // تنسيق الرقم حسب الدولة

            console.log('📱 [Forgot Password] تنسيق رقم الهاتف:', {
                original: fullNumber,
                normalized: normalizedPhone,
                formatted: formattedPhone
            });

            // 1️⃣ التحقق من وجود المستخدم أولاً قبل إرسال OTP
            console.log('🔍 [Step 1/3] التحقق من وجود المستخدم...');
            const checkRes = await fetch('/api/auth/check-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: formattedPhone }),
            });
            const checkData = await checkRes.json();
            console.log('📋 [Step 1/3] نتيجة التحقق من المستخدم:', checkData);

            if (!checkRes.ok || !checkData.exists) {
                const errorMsg = 'رقم الهاتف غير مسجل في النظام. يرجى إنشاء حساب جديد أولاً.';
                setDetailedError(errorMsg);
                toast.error(errorMsg);
                setWhatsappStatus(null);
                setLoading(false);
                return;
            }

            console.log('✅ [Step 1/3] المستخدم موجود:', checkData.userName);

            // 2️⃣ إذا كان المستخدم موجوداً، نرسل OTP عبر الخدمة الموحدة
            console.log('📤 [Step 2/3] إرسال OTP عبر الخدمة الموحدة...');
            console.log('📱 الرقم المنسق:', formattedPhone);

            // استخدام الخدمة الموحدة لإرسال OTP (WhatsApp أو SMS تلقائياً)
            const res = await fetch('/api/otp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phoneNumber: formattedPhone,
                    name: checkData.userName || 'مستخدم',
                    purpose: 'password_reset',
                    channel: 'auto', // سيحاول WhatsApp أولاً، ثم SMS إذا فشل
                    instanceId: BABASERVICE_CONFIG.INSTANCE_ID || '68F243B3A8D8D'
                }),
            });

            const data = await res.json();
            console.log('📥 [Step 2/3] رد API إرسال OTP:', {
                status: res.status,
                ok: res.ok,
                data: { ...data, otp: data.otp ? '***' : undefined } // إخفاء OTP في الـ logs
            });

            if (!res.ok || !data.success) {
                const errorMsg = data.error || 'فشل إرسال الرمز';
                console.error('❌ [Step 2/3] فشل إرسال OTP:', errorMsg);
                setDetailedError(`خطأ في الإرسال: ${errorMsg}`);
                setWhatsappStatus(data.channel === 'whatsapp' ? 'disconnected' : null);
                throw new Error(errorMsg);
            }

            console.log('✅ [Step 2/3] تم إرسال OTP بنجاح عبر', data.channel);
            setWhatsappStatus(data.channel === 'whatsapp' ? 'connected' : 'sms' as any);

            // حفظ OTP المُرسل والرقم المنسق للتحقق لاحقاً
            if (data.otp) {
                sessionStorage.setItem('reset_otp', data.otp);
                sessionStorage.setItem('reset_otp_time', Date.now().toString());
                sessionStorage.setItem('reset_formatted_phone', formattedPhone);
            }

            console.log('✅ [Step 3/3] الانتقال لخطوة إدخال OTP');
            toast.success('تم إرسال رمز التحقق عبر WhatsApp بنجاح ✅');
            setStep('otp');
            setResendCooldown(60);
        } catch (error: any) {
            console.error('❌ [Forgot Password] خطأ كامل:', error);
            toast.error(error.message || 'فشل إرسال رمز التحقق');
            setWhatsappStatus('disconnected');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            console.log('🔐 [OTP Verification] بدء التحقق من رمز OTP...');
            console.log('📱 الرمز المدخل:', otp);

            // استخدام Firestore للتحقق من OTP (الطريقة الجديدة)
            const formattedPhone = sessionStorage.getItem('reset_formatted_phone') || fullPhoneNumber;

            if (!formattedPhone) {
                throw new Error('رقم الهاتف غير موجود. يرجى طلب رمز جديد');
            }

            const verifyResponse = await fetch('/api/whatsapp/babaservice/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phoneNumber: formattedPhone,
                    otp: otp
                })
            });

            const verifyData = await verifyResponse.json();

            if (!verifyResponse.ok || !verifyData.success) {
                // Fallback: التحقق المحلي من sessionStorage (للتوافق مع OTP القديمة)
                const savedOtp = sessionStorage.getItem('reset_otp');
                const savedTime = sessionStorage.getItem('reset_otp_time');

                if (savedOtp && savedTime) {
                    const otpAge = Date.now() - parseInt(savedTime);
                    // التحقق المحلي في حالة OTP قديم جداً: 1 دقيقة فقط
                    if (otpAge <= 1 * 60 * 1000 && otp === savedOtp) {
                        console.log('✅ [OTP Verification] تم التحقق محلياً (fallback)');
                        sessionStorage.removeItem('reset_otp');
                        sessionStorage.removeItem('reset_otp_time');
                        toast.success('تم التحقق من الرمز بنجاح ✅ يمكنك الآن إدخال كلمة المرور الجديدة');
                        setStep('password');
                        setLoading(false);
                        return;
                    }
                }

                throw new Error(verifyData.error || 'رمز التحقق غير صحيح');
            }

            console.log('✅ [OTP Verification] تم التحقق من الرمز بنجاح عبر Firestore');

            // تنظيف sessionStorage
            sessionStorage.removeItem('reset_otp');
            sessionStorage.removeItem('reset_otp_time');

            toast.success('تم التحقق من الرمز بنجاح ✅ يمكنك الآن إدخال كلمة المرور الجديدة');
            setStep('password');
        } catch (error: any) {
            console.error('❌ [OTP Verification] خطأ:', error);
            toast.error(error.message || 'فشل التحقق من الرمز');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        console.log('🔑 [Step 1/5] بدء عملية تحديث كلمة المرور...');

        if (newPassword !== confirmPassword) {
            toast.error('كلمتا المرور غير متطابقتين');
            return;
        }

        // التحقق من قوة كلمة المرور - 8 أحرف على الأقل
        if (newPassword.length < 8) {
            toast.error('يجب أن تتكون كلمة المرور من 8 أحرف على الأقل');
            return;
        }

        const isNumbersOnly = /^\d+$/.test(newPassword);

        // منع الأرقام المتسلسلة والمتكررة إذا كانت كلمة المرور أرقام فقط
        const weakPatterns = [
            /^(\d)\1+$/, // نفس الرقم متكرر (111111)
            /^(0123456789|9876543210)/, // أرقام متسلسلة
            /^12345678$/, /^87654321$/,
            /^123456/, /^654321/,
            /^111111/, /^000000/, /^666666/, /^888888/
        ];

        if (isNumbersOnly && weakPatterns.some(pattern => pattern.test(newPassword))) {
            toast.error('كلمة المرور ضعيفة جداً. تجنب الأرقام المتسلسلة أو المتكررة');
            return;
        }

        console.log('✅ [Step 1/5] كلمة المرور اجتازت جميع التحققات');
        setLoading(true);

        try {
            // استخدام الرقم المنسق المحفوظ
            const formattedPhone = sessionStorage.getItem('reset_formatted_phone');

            if (!formattedPhone) {
                throw new Error('حدث خطأ في استرجاع رقم الهاتف. يرجى المحاولة مرة أخرى.');
            }

            console.log('🔑 [Step 2/5] إرسال طلب تحديث كلمة المرور...');
            console.log('📱 رقم الهاتف المنسق:', formattedPhone);
            console.log('🔐 طول كلمة المرور الجديدة:', newPassword.length);

            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: formattedPhone, newPassword }),
            });

            const data = await res.json();
            console.log('📥 [Step 2/5] رد API تحديث كلمة المرور:', {
                status: res.status,
                ok: res.ok,
                data: data
            });

            if (!res.ok) {
                console.error('❌ [Step 2/5] فشل تحديث كلمة المرور:', data.error);
                throw new Error(data.error || 'فشل تحديث كلمة المرور');
            }

            console.log('✅ [Step 3/5] تم تحديث كلمة المرور بنجاح في Firebase و Firestore');
            toast.success('✅ تم تحديث كلمة المرور بنجاح! جاري تسجيل الدخول...');

            // مسح البيانات المؤقتة
            sessionStorage.removeItem('reset_otp');
            sessionStorage.removeItem('reset_otp_time');
            console.log('🧹 [Step 3/5] تم مسح البيانات المؤقتة');

            // استخدام نفس الرقم المُنسَّق الذي استخدمناه في تحديث كلمة المرور
            const resetFormattedPhone = sessionStorage.getItem('reset_formatted_phone');
            console.log('📱 [Step 4/5] الرقم المنسق المستخدم:', resetFormattedPhone);

            // الحصول على البريد الإلكتروني من ردّ API تحديث كلمة المرور مباشرة
            const exactEmail = data.email || data.userEmail;
            console.log('📧 [Step 4/5] البريد من API:', exactEmail);

            // تنظيف sessionStorage
            sessionStorage.removeItem('reset_formatted_phone');

            if (exactEmail) {
                console.log('✅ [Step 4/5] تم العثور على البريد الإلكتروني من API');

                // تسجيل الدخول التلقائي باستخدام نفس البريد والرقم السري
                console.log('🔐 [Step 5/5] تسجيل الدخول التلقائي...');
                console.log('📧 [Step 5/5] البريد:', exactEmail);
                console.log('🔐 [Step 5/5] كلمة المرور (أول رقمين):', newPassword.substring(0, 2) + '******');

                const { signInWithEmailAndPassword } = await import('firebase/auth');

                try {
                    const userCredential = await signInWithEmailAndPassword(auth, exactEmail, newPassword);
                    console.log('✅✅✅ [Step 5/5] تم تسجيل الدخول بنجاح!');
                    console.log('👤 [Step 5/5] User UID:', userCredential.user.uid);

                    toast.success('🎉 تم تسجيل الدخول بنجاح! جاري التوجيه للوحة التحكم...');

                    // انتظر قليلاً ثم أعد التوجيه للوحة التحكم
                    setTimeout(() => {
                        console.log('🚀 [Step 5/5] إعادة التوجيه للوحة التحكم...');
                        window.location.href = '/dashboard/player';
                    }, 1500);

                } catch (loginError: any) {
                    console.error('❌❌❌ [Step 5/5] فشل تسجيل الدخول التلقائي!');
                    console.error('❌ [Step 5/5] Error code:', loginError.code);
                    console.error('❌ [Step 5/5] Error message:', loginError.message);
                    console.error('❌ [Step 5/5] البريد المستخدم:', exactEmail);

                    // إذا فشل تسجيل الدخول التلقائي، وجه للوحة الدخول
                    localStorage.setItem('resetPasswordPhone', fullPhoneNumber);
                    localStorage.setItem('resetPasswordEmail', exactEmail);
                    toast.error('تم تحديث كلمة المرور ولكن فشل تسجيل الدخول التلقائي. يرجى تسجيل الدخول يدوياً.');
                    setTimeout(() => router.push('/auth/login?from=reset-password'), 2000);
                }
            } else {
                // إذا لم يتم العثور على البريد من API
                console.error('❌ [Step 4/5] لم يتم العثور على البريد الإلكتروني في ردّ API');
                localStorage.setItem('resetPasswordPhone', fullPhoneNumber);
                toast.success('تم تحديث كلمة المرور! يرجى تسجيل الدخول بكلمة المرور الجديدة');
                setTimeout(() => router.push('/auth/login?from=reset-password'), 2000);
            }

        } catch (error: any) {
            console.error('❌ [Password Reset] خطأ في تحديث كلمة المرور:', error);
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const StepIcon = () => {
        switch (step) {
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
                                    aria-label="اختر الدولة"
                                >
                                    {COUNTRIES_FROM_REGISTER.slice(0, 30).map(c => <option key={`${c.code}-${c.name}`} value={c.code}>{c.name} ({c.code})</option>)}
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

                            {/* عرض حالة WhatsApp أو رسائل الخطأ */}
                            {whatsappStatus === 'checking' && (
                                <Alert className="border-yellow-200 bg-yellow-50">
                                    <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />
                                    <AlertDescription className="text-yellow-700 text-xs">
                                        جاري التحقق من حالة الاتصال وإرسال الرمز...
                                    </AlertDescription>
                                </Alert>
                            )}

                            {whatsappStatus === 'disconnected' && detailedError && (
                                <Alert className="border-red-200 bg-red-50">
                                    <XCircle className="h-4 w-4 text-red-600" />
                                    <AlertTitle className="text-red-800 text-sm font-bold">⚠️ فشل الإرسال</AlertTitle>
                                    <AlertDescription className="text-red-700 text-xs space-y-2">
                                        <p className="font-semibold">{detailedError}</p>
                                    </AlertDescription>
                                </Alert>
                            )}
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
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
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
                            </div>

                            {/* معلومات إضافية عن OTP */}
                            <Alert className="border-green-200 bg-green-50">
                                <Info className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-700 text-xs">
                                    <p className="font-semibold mb-1">📱 تم إرسال رمز التحقق عبر WhatsApp</p>
                                    <p className="font-semibold text-green-800">📩 افتح تطبيق WhatsApp الآن وستجد رسالة من منصة الحلم، ثم أدخل الرمز في الحقل بالأسفل.</p>
                                    <p>• الرمز مكون من 6 أرقام</p>
                                    <p>• صالح لمدة 10 دقائق</p>
                                    <p>• تحقق من رسائل WhatsApp على رقم: {fullPhoneNumber}</p>
                                </AlertDescription>
                            </Alert>
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
                                className="text-purple-600 hover:text-purple-700"
                            >
                                {resendCooldown > 0 ? `⏱️ أعد الإرسال بعد ${resendCooldown} ثانية` : '🔄 ألم تستلم الرمز؟ أعد الإرسال'}
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
                                    autoComplete="new-password"
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
                                    autoComplete="new-password"
                                />
                            </div>
                            <div className="space-y-2 text-xs text-gray-500 pt-2">
                                <div className="flex items-center">
                                    <ShieldAlert className="w-4 h-4 ml-2 flex-shrink-0" />
                                    <span>8 أحرف على الأقل</span>
                                </div>
                                <div className="text-green-600 text-xs text-right">
                                    ✅ يفضل استخدام مزيج من الأرقام والحروف لبناء كلمة مرور قوية
                                </div>
                                <div className="text-red-500 text-xs">
                                    ⚠️ ممنوع: 12345678، 11111111، 00000000
                                </div>
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
    );
}
