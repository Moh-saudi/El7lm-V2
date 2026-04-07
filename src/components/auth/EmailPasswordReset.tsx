'use client';

import { useState } from 'react';
import { Mail, CheckCircle, AlertCircle, Loader2, ArrowLeft, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface EmailPasswordResetProps {
    onSuccess?: () => void;
    onCancel?: () => void;
}

export default function EmailPasswordReset({ onSuccess, onCancel }: EmailPasswordResetProps) {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [resetLink, setResetLink] = useState('');
    const [resetToken, setResetToken] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // Validate email
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                throw new Error('يرجى إدخال بريد إلكتروني صحيح');
            }

            // Generate short reset link
            const response = await fetch('/api/auth/generate-reset-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                // Check if user needs support (exists in Auth but not in DB)
                if (data.needsSupport) {
                    setError(data.error + '\n\n💬 للمساعدة، تواصل مع خدمة العملاء:\nWhatsApp: +966123456789\nEmail: support@el7lm.com');
                } else {
                    throw new Error(data.error || 'فشل إنشاء رابط الاسترجاع');
                }
                setIsLoading(false);
                return;
            }

            // Using Resend ONLY - no more Firebase email
            // Email is sent from API route via Resend

            console.log('✅ [Email Reset] Email sent via Resend to:', email);
            console.log('🔗 [Email Reset] Short link:', data.resetLink);
            console.log('🔑 [Email Reset] Token:', data.token);

            // Success - email sent!
            setSuccess(true);
            setResetLink(data.resetLink);
            setResetToken(data.token);

            toast.success('✅ تم إرسال رابط إعادة التعيين للبريد الإلكتروني');

            onSuccess?.();


        } catch (err: any) {
            console.error('Email password reset error:', err);

            let errorMessage = '';
            let showSupport = false;

            const msg: string = err.message || '';
            if (msg.includes('User not found') || msg.includes('user_not_found')) {
                errorMessage = 'البريد الإلكتروني غير مسجل في النظام';
                showSupport = true;
            } else if (msg.includes('disabled') || msg.includes('banned')) {
                errorMessage = 'تم تعطيل هذا الحساب. يرجى التواصل مع خدمة العملاء';
                showSupport = true;
            } else if (msg.includes('invalid') || msg.includes('Invalid')) {
                errorMessage = 'البريد الإلكتروني غير صحيح';
            } else if (msg.includes('too many') || msg.includes('rate limit')) {
                errorMessage = 'تم إرسال طلبات كثيرة، يرجى المحاولة لاحقاً';
            } else {
                errorMessage = msg || 'حدث خطأ أثناء إرسال رابط الاسترجاع';
            }

            setError(errorMessage);

            // Show support contact if account is deleted/disabled
            if (showSupport) {
                setTimeout(() => {
                    setError(errorMessage + '\n\n💬 للمساعدة، تواصل مع خدمة العملاء:\n📱 قطر (واتساب): +974 7054 2458\n📱 مصر: +20 101 779 9580\n✉️ البريد: info@el7lm.com');
                }, 100);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setEmail('');
        setSuccess(false);
        setError('');
        setResetLink('');
        setResetToken('');
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl p-8" dir="rtl">
            {/* Header */}
            <div className="text-center mb-6">
                <div className="mx-auto h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    استرجاع كلمة المرور
                </h2>
                <p className="text-sm text-gray-600">
                    {success
                        ? 'تم إرسال رابط استرجاع كلمة المرور بنجاح'
                        : 'أدخل بريدك الإلكتروني لإرسال رابط الاسترجاع'
                    }
                </p>
            </div>

            {!success ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Error Alert */}
                    {error && (
                        <div className="space-y-3">
                            <Alert className="border-red-200 bg-red-50">
                                <AlertCircle className="h-4 w-4 text-red-600" />
                                <AlertDescription className="text-red-800 text-sm whitespace-pre-line">
                                    {error.split('\n\n')[0]}
                                </AlertDescription>
                            </Alert>

                            {/* Support Contact Card */}
                            {error.includes('💬 للمساعدة') && (
                                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                                    <h3 className="text-sm font-bold text-purple-800 mb-3">💬 تواصل مع خدمة العملاء</h3>
                                    <div className="space-y-2">
                                        <a
                                            href="https://wa.me/97470542458"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-sm text-green-700 hover:text-green-800 hover:underline"
                                        >
                                            <span className="text-lg">📱</span>
                                            <span>قطر (واتساب الرسمي): +974 7054 2458</span>
                                        </a>
                                        <a
                                            href="https://wa.me/201017799580"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-sm text-green-700 hover:text-green-800 hover:underline"
                                        >
                                            <span className="text-lg">📱</span>
                                            <span>مصر: +20 101 779 9580</span>
                                        </a>
                                        <a
                                            href="mailto:info@el7lm.com"
                                            className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-800 hover:underline"
                                        >
                                            <span className="text-lg">✉️</span>
                                            <span>البريد: info@el7lm.com</span>
                                        </a>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-3 pt-3 border-t border-purple-200">
                                        من شركة ميسك القطرية • www.mesk.qa
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Email Input */}
                    <div className="space-y-2">
                        <Label htmlFor="email">البريد الإلكتروني</Label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <Mail className="h-5 w-5 text-gray-400" />
                            </div>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-3 py-2"
                                placeholder="example@email.com"
                                disabled={isLoading}
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                        {isLoading ? (
                            <div className="flex items-center">
                                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                                جاري الإرسال...
                            </div>
                        ) : (
                            <div className="flex items-center">
                                <Mail className="h-4 w-4 ml-2" />
                                إرسال رابط الاسترجاع
                            </div>
                        )}
                    </Button>
                </form>
            ) : (
                <div className="space-y-4">
                    {/* Success Message */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center">
                            <CheckCircle className="h-5 w-5 text-green-600 ml-2" />
                            <div className="flex-1">
                                <p className="text-sm text-green-800 font-medium">
                                    ✅ تم إنشاء رابط استرجاع كلمة المرور بنجاح
                                </p>
                                <p className="text-xs text-green-600 mt-1">
                                    سيصلك رابط استرجاع كلمة المرور على البريد الإلكتروني: <strong>{email}</strong>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-blue-800 mb-2">📧 الخطوات التالية:</h3>
                        <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                            <li>افتح صندوق البريد الإلكتروني</li>
                            <li>ابحث عن رسالة من "منصة الحلم"</li>
                            <li>اضغط على زر "إعادة تعيين كلمة المرور" في البريد</li>
                            <li>أدخل كلمة المرور الجديدة</li>
                        </ol>
                        <div className="mt-3 pt-3 border-t border-blue-200">
                            <p className="text-xs text-blue-600">
                                ⏱️ الرابط صالح لمدة ساعة واحدة
                            </p>
                            <p className="text-xs text-orange-600 mt-1">
                                🔒 لأسباب أمنية، الرابط يُرسل للبريد فقط
                            </p>
                        </div>
                    </div>

                    {/* Reset Button */}
                    <Button
                        onClick={handleReset}
                        variant="outline"
                        className="w-full"
                    >
                        إرسال لبريد آخر
                    </Button>
                </div>
            )}

            {/* Instructions */}
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-800 mb-2">ملاحظات هامة:</h3>
                <ul className="text-xs text-gray-600 space-y-1">
                    <li>• الرابط صالح لمدة ساعة واحدة فقط</li>
                    <li>• تحقق من مجلد الرسائل غير المرغوب فيها (Spam)</li>
                    <li>• لا تشارك الرابط مع أي شخص آخر</li>
                    <li>• يمكنك إعادة المحاولة إذا لم تتلق الرسالة</li>
                </ul>
                <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 text-center">
                        منصة الحلم الرقمية - من شركة ميسك القطرية
                    </p>
                    <p className="text-xs text-gray-400 text-center mt-1">
                        www.mesk.qa
                    </p>
                </div>
            </div>
        </div>
    );
}
