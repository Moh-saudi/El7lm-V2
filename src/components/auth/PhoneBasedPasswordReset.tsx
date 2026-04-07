'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/config';
import { Phone, Mail, CheckCircle, AlertCircle, Loader2, ArrowLeft, ArrowRight, Shield } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COUNTRIES_FROM_REGISTER, Country } from '@/data/countries-from-register';
import { validatePhoneForCountry } from '@/lib/validation/phone-validation';
import { toast } from 'sonner';

interface PhoneBasedPasswordResetProps {
    onSuccess?: () => void;
    onError?: (error: string) => void;
    onCancel?: () => void;
    className?: string;
}

type Step = 'phone' | 'email' | 'success';

export default function PhoneBasedPasswordReset({
    onSuccess,
    onError,
    onCancel,
    className = ''
}: PhoneBasedPasswordResetProps) {
    const [currentStep, setCurrentStep] = useState<Step>('phone');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Phone step
    const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [userEmail, setUserEmail] = useState(''); // البريد المحفوظ في قاعدة البيانات
    const [userId, setUserId] = useState('');
    const [userCollection, setUserCollection] = useState('');
    const [phoneFormatError, setPhoneFormatError] = useState<string | null>(null);

    // Email step
    const [email, setEmail] = useState('');

    // Initialize default country (Qatar)
    useState(() => {
        const defaultCountry = COUNTRIES_FROM_REGISTER.find(c => c.code === '+974') || COUNTRIES_FROM_REGISTER[0];
        setSelectedCountry(defaultCountry);
    });

    // 🛡️ Real-time phone format validation
    useEffect(() => {
        if (!selectedCountry || !phoneNumber) {
            setPhoneFormatError(null);
            return;
        }
        const cleanPhone = phoneNumber.replace(/^0+/, '').trim().replace(/\D/g, '');
        if (cleanPhone.length < 4) {
            setPhoneFormatError(null);
            return;
        }
        const error = validatePhoneForCountry(cleanPhone, selectedCountry.code);
        setPhoneFormatError(error);
    }, [phoneNumber, selectedCountry]);

    const handlePhoneVerification = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const cleanPhone = phoneNumber.replace(/\D/g, '');

            if (!selectedCountry) {
                setError('يرجى اختيار الدولة');
                setIsLoading(false);
                return;
            }

            // 🛡️ Security: Validate phone format matches the selected country code
            const formatError = validatePhoneForCountry(cleanPhone, selectedCountry.code);
            if (formatError) {
                setError(formatError);
                setIsLoading(false);
                return;
            }

            // البحث في جميع الجداول الممكنة
            const tables = ['users', 'players', 'clubs', 'academies', 'agents', 'trainers'];
            let foundEmail = '';
            let found = false;

            for (const tableName of tables) {
                const { data } = await supabase.from(tableName).select('*').eq('phone', cleanPhone);

                if (data && data.length > 0) {
                    const userData = data[0];

                    setUserId(userData.id);
                    setUserCollection(tableName);
                    foundEmail = userData.email || '';
                    setUserEmail(foundEmail);

                    found = true;
                    break;
                }
            }

            if (!found) {
                setError('رقم الهاتف غير مسجل في النظام');
                setIsLoading(false);
                return;
            }

            // دائماً ننتقل لخطوة طلب البريد الإلكتروني للتأكيد أو الإدخال
            if (foundEmail) {
                setEmail(foundEmail);
            }

            setCurrentStep('email');

        } catch (err: any) {
            console.error('Phone verification error:', err);
            setError('حدث خطأ أثناء التحقق من رقم الهاتف');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // حفظ البريد الإلكتروني عبر API (آمن)
            const response = await fetch('/api/auth/update-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, userCollection, email })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'فشل حفظ البريد الإلكتروني');
            }

            // إرسال رابط استرجاع كلمة المرور
            await sendResetEmail(email);

        } catch (err: any) {
            console.error('Email save error:', err);
            setError(err.message || 'حدث خطأ أثناء حفظ البريد الإلكتروني');
            setIsLoading(false);
        }
    };

    const sendResetEmail = async (emailAddress: string) => {
        try {
            setIsLoading(true);

            // Generate short reset link with custom token
            const response = await fetch('/api/auth/generate-reset-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailAddress })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'فشل إنشاء رابط الاسترجاع');
            }

            if (data.emailSent) {
                toast.success('✅ تم إرسال رابط إعادة التعيين للبريد الإلكتروني');
            } else {
                toast.warning('⚠️ تم إنشاء الرابط ولكن فشل الإرسال التلقائي. يرجى التواصل مع الدعم.');
                console.error('❌ Resend Error:', data.resendError);
            }

            // Show success with the short link info
            setCurrentStep('success');

            // Store the short link for display
            sessionStorage.setItem('shortResetLink', data.resetLink);
            sessionStorage.setItem('resetToken', data.token);

            onSuccess?.();
        } catch (err: any) {
            console.error('Password reset error:', err);

            let errorMessage = '';
            const msg: string = err.message || '';
            if (msg.includes('User not found') || msg.includes('user_not_found')) {
                errorMessage = 'البريد الإلكتروني غير مسجل في نظام المصادقة';
            } else if (msg.includes('invalid') || msg.includes('Invalid')) {
                errorMessage = 'البريد الإلكتروني غير صحيح';
            } else if (msg.includes('too many') || msg.includes('rate limit')) {
                errorMessage = 'تم إرسال طلبات كثيرة، يرجى المحاولة لاحقاً';
            } else {
                errorMessage = msg || 'حدث خطأ أثناء إرسال رابط إعادة التعيين';
            }

            setError(errorMessage);
            onError?.(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setCurrentStep('phone');
        setPhoneNumber('');
        setEmail('');
        setError('');
        setUserId('');
        setUserEmail('');
        setUserCollection('');
    };

    return (
        <div className={`bg-white rounded-2xl shadow-xl p-8 ${className}`} dir="rtl">
            {/* Header */}
            <div className="text-center mb-6">
                <div className="mx-auto h-12 w-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    استرجاع كلمة المرور
                </h2>
                <p className="text-sm text-gray-600">
                    {currentStep === 'phone' && 'أدخل رقم هاتفك المسجل للتحقق من حسابك'}
                    {currentStep === 'email' && 'أدخل بريدك الإلكتروني لإرسال رابط استرجاع كلمة المرور'}
                    {currentStep === 'success' && 'تم إرسال رابط استرجاع كلمة المرور بنجاح'}
                </p>
            </div>

            {/* Progress Indicator */}
            <div className="flex items-center justify-center mb-6">
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${currentStep === 'phone' ? 'bg-blue-600 text-white' : 'bg-green-100 text-green-700'
                        }`}>
                        {currentStep === 'phone' ? '1' : <CheckCircle className="w-4 h-4" />}
                    </div>
                    <div className={`h-1 w-12 ${currentStep !== 'phone' ? 'bg-green-500' : 'bg-gray-200'}`} />
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${currentStep === 'email' ? 'bg-blue-600 text-white' :
                        currentStep === 'success' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-400'
                        }`}>
                        {currentStep === 'success' ? <CheckCircle className="w-4 h-4" /> : '2'}
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                        <AlertCircle className="h-5 w-5 text-red-600 ml-2" />
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                </div>
            )}

            {/* Step 1: Phone Verification */}
            {currentStep === 'phone' && (
                <form onSubmit={handlePhoneVerification} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            الدولة
                        </label>
                        <Select
                            value={selectedCountry?.name}
                            onValueChange={(val) => {
                                const country = COUNTRIES_FROM_REGISTER.find(c => c.name === val);
                                if (country) setSelectedCountry(country);
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="اختر الدولة" />
                            </SelectTrigger>
                            <SelectContent>
                                {COUNTRIES_FROM_REGISTER.map((country) => (
                                    <SelectItem key={country.name} value={country.name}>
                                        <div className="flex items-center justify-between w-full">
                                            <span>{country.name}</span>
                                            <span className="text-xs text-gray-500 ltr ml-2">{country.code}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                            رقم الهاتف
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <Phone className="h-5 w-5 text-gray-400" />
                            </div>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500 font-mono text-sm">
                                {selectedCountry?.code || '+966'}
                            </div>
                            <input
                                id="phone"
                                name="phone"
                                type="tel"
                                required
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                className="w-full pl-10 pr-16 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent direction-ltr text-left"
                                placeholder="5xxxxxxxx"
                                disabled={isLoading}
                            />
                        </div>
                        {/* 🛡️ Phone format validation feedback */}
                        {phoneFormatError && (
                            <p className="text-xs text-orange-600 font-medium mt-1">⚠️ {phoneFormatError}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !!phoneFormatError}
                        className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? (
                            <div className="flex items-center">
                                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                                جاري التحقق...
                            </div>
                        ) : (
                            <div className="flex items-center">
                                التالي
                                <ArrowLeft className="h-4 w-4 mr-2" />
                            </div>
                        )}
                    </button>
                </form>
            )}

            {/* Step 2: Email Input */}
            {currentStep === 'email' && (
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <div className="flex items-start">
                            <CheckCircle className="h-5 w-5 text-blue-600 ml-2 mt-0.5" />
                            <div>
                                <p className="text-sm text-blue-800 font-medium">تم التحقق من رقم الهاتف بنجاح</p>
                                <p className="text-xs text-blue-600 mt-1 font-mono direction-ltr text-right">
                                    {selectedCountry?.code}{phoneNumber}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                            البريد الإلكتروني
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <Mail className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="example@email.com"
                                disabled={isLoading}
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            سيتم إرسال رابط استرجاع كلمة المرور إلى هذا البريد
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => setCurrentStep('phone')}
                            disabled={isLoading}
                            className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition-colors"
                        >
                            <div className="flex items-center justify-center">
                                <ArrowRight className="h-4 w-4 ml-2" />
                                رجوع
                            </div>
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 py-2 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center">
                                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                                    جاري الإرسال...
                                </div>
                            ) : (
                                'إرسال رابط الاسترجاع'
                            )}
                        </button>
                    </div>
                </form>
            )}

            {/* Step 3: Success */}
            {currentStep === 'success' && (
                <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center">
                            <CheckCircle className="h-5 w-5 text-green-600 ml-2" />
                            <div className="flex-1">
                                <p className="text-sm text-green-800 font-medium text-right">
                                    ✅ تم إنشاء طلب الاسترجاع بنجاح
                                </p>
                                <p className="text-xs text-green-600 mt-1 text-right">
                                    تحقق من صندوق الوارد في بريدك الإلكتروني
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-right">
                        <h3 className="text-sm font-medium text-blue-800 mb-2">📧 الخطوات التالية:</h3>
                        <ol className="text-xs text-blue-700 space-y-2 list-decimal list-inside pr-0">
                            <li>افتح صندوق البريد الإلكتروني</li>
                            <li>ابحث عن رسالة من "منصة الحلم"</li>
                            <li>استخدم الرابط الموجود في الرسالة لاستعادة كلمة المرور</li>
                        </ol>
                    </div>

                    <button
                        onClick={handleReset}
                        className="w-full py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors mt-4"
                    >
                        استرجاع كلمة مرور لحساب آخر
                    </button>
                </div>
            )}

            {/* Back to Login Footer */}
            <div className="mt-8 text-center pt-6 border-t border-gray-100">
                <button
                    onClick={onCancel}
                    className="flex items-center justify-center text-sm text-blue-600 hover:text-blue-800 transition-colors mx-auto"
                >
                    <ArrowRight className="h-4 w-4 ml-1" />
                    العودة إلى تسجيل الدخول
                </button>
            </div>

            {/* Disclaimer */}
            <div className="mt-6 text-center">
                <p className="text-[10px] text-gray-400">
                    من شركة ميسك القطرية • جميع الحقوق محفوظة © 2024
                </p>
            </div>
        </div>
    );
}
