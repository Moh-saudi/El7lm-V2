'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase/config';
import { confirmPasswordReset } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Loader2, ShieldCheck, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const [valid, setValid] = useState(false);
    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (token) {
            verifyToken();
        } else {
            setVerifying(false);
            setError('رابط غير صالح. يرجى طلب رابط جديد.');
        }
    }, [token]);

    const verifyToken = async () => {
        try {
            const response = await fetch('/api/auth/verify-reset-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });

            const data = await response.json();

            if (data.valid) {
                setValid(true);
                setEmail(data.email);
            } else {
                setError(data.error || 'الرابط منتهي الصلاحية أو غير صالح');
            }
        } catch (err) {
            setError('حدث خطأ في التحقق من الرابط');
        } finally {
            setVerifying(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError('كلمتا المرور غير متطابقتين');
            return;
        }

        if (newPassword.length < 8) {
            setError('يجب أن تتكون كلمة المرور من 8 أحرف على الأقل');
            return;
        }

        setLoading(true);

        try {
            // Mark token as used and get Firebase reset code
            const response = await fetch('/api/auth/use-reset-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'فشل تحديث كلمة المرور');
            }

            toast.success('✅ تم تحديث كلمة المرور بنجاح!');

            // Auto-login
            try {
                const { signInWithEmailAndPassword } = await import('firebase/auth');
                await signInWithEmailAndPassword(auth, email, newPassword);
                toast.success('🎉 تم تسجيل الدخول بنجاح!');
                setTimeout(() => {
                    window.location.href = '/dashboard/player';
                }, 1500);
            } catch (loginError) {
                // If auto-login fails, redirect to login page
                setTimeout(() => {
                    router.push('/auth/login?from=password-reset');
                }, 2000);
            }

        } catch (err: any) {
            setError(err.message || 'حدث خطأ أثناء تحديث كلمة المرور');
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (verifying) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4">
                <Card className="w-full max-w-md shadow-2xl">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center space-y-4">
                            <Loader2 className="h-12 w-12 text-purple-600 animate-spin" />
                            <p className="text-gray-600">جاري التحقق من الرابط...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!valid) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4">
                <Card className="w-full max-w-md shadow-2xl border-red-200">
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-red-100 p-3 rounded-full w-fit mb-4">
                            <AlertCircle className="h-8 w-8 text-red-600" />
                        </div>
                        <CardTitle className="text-red-800">رابط غير صالح</CardTitle>
                        <CardDescription className="text-red-600">{error}</CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button
                            className="w-full bg-purple-600 hover:bg-purple-700"
                            onClick={() => router.push('/auth/forgot-password')}
                        >
                            طلب رابط جديد
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4" dir="rtl">
            <Card className="w-full max-w-md shadow-2xl shadow-purple-500/10 border border-purple-100">
                {/* Header with Logo */}
                <CardHeader className="text-center space-y-4">
                    {/* Logo/Brand Area */}
                    <div className="mx-auto bg-gradient-to-br from-purple-600 to-blue-600 p-4 rounded-2xl w-fit mb-2 shadow-lg">
                        <ShieldCheck className="h-12 w-12 text-white" />
                    </div>

                    {/* Title & Description */}
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-1">منصة الحلم الرقمية</h1>
                        <p className="text-sm text-gray-500 mb-4">
                            أول متجر إلكتروني لتسويق وبيع اللاعبين في الشرق الأوسط
                        </p>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                        <CardTitle className="text-xl">تعيين كلمة مرور جديدة</CardTitle>
                        <CardDescription className="mt-2">
                            أدخل كلمة المرور الجديدة لحسابك
                        </CardDescription>
                    </div>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {/* Email Display */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm text-blue-800">
                                <span className="font-medium">البريد الإلكتروني:</span> {email}
                            </p>
                        </div>

                        {/* Error Alert */}
                        {error && (
                            <Alert className="border-red-200 bg-red-50">
                                <AlertCircle className="h-4 w-4 text-red-600" />
                                <AlertDescription className="text-red-800 text-sm">
                                    {error}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* New Password */}
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                            <div className="relative">
                                <Input
                                    id="newPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="********"
                                    required
                                    className="pr-10"
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showConfirm ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="********"
                                    required
                                    className="pr-10"
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Password Requirements */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <p className="text-xs text-gray-600 mb-2 font-medium">متطلبات كلمة المرور:</p>
                            <ul className="text-xs text-gray-600 space-y-1">
                                <li className={newPassword.length >= 8 ? 'text-green-600' : ''}>
                                    {newPassword.length >= 8 ? '✓' : '○'} 8 أحرف على الأقل
                                </li>
                                <li className={newPassword === confirmPassword && newPassword ? 'text-green-600' : ''}>
                                    {newPassword === confirmPassword && newPassword ? '✓' : '○'} كلمتا المرور متطابقتان
                                </li>
                            </ul>
                        </div>
                    </CardContent>

                    <CardFooter className="flex-col gap-4">
                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    جاري الحفظ...
                                </>
                            ) : (
                                <>
                                    <ShieldCheck className="mr-2 h-4 w-4" />
                                    حفظ كلمة المرور
                                </>
                            )}
                        </Button>

                        {/* Footer Info */}
                        <div className="w-full pt-4 border-t border-gray-200">
                            <p className="text-xs text-center text-gray-500">
                                من شركة ميسك القطرية
                            </p>
                            <a
                                href="https://www.mesk.qa"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-xs text-center text-blue-600 hover:text-blue-700 hover:underline mt-1"
                            >
                                www.mesk.qa
                            </a>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
