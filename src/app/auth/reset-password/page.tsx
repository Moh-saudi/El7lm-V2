'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Loader2, ShieldCheck, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';

export default function ResetPasswordPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const { t, isRTL } = useTranslation();

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
            setError(t('auth.resetPasswordInvalidLinkDesc'));
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
                setError(data.error || t('auth.resetPasswordInvalidLinkDesc'));
            }
        } catch (err) {
            setError(t('auth.resetPasswordError'));
        } finally {
            setVerifying(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError(t('auth.passwordsDoNotMatch'));
            return;
        }

        if (newPassword.length < 8) {
            setError(t('auth.resetPasswordReqLength'));
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
                throw new Error(data.error || t('auth.passwordResetError'));
            }

            toast.success(t('auth.passwordResetSuccess'));

            // Auto-login
            try {
                const { supabase } = await import('@/lib/supabase/config');
                await supabase.auth.signInWithPassword({ email, password: newPassword });
                toast.success(t('auth.resetPasswordAutoLoginSuccess'));
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
            setError(err.message || t('auth.passwordResetError'));
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (verifying) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4" dir={isRTL ? 'rtl' : 'ltr'}>
                <Card className="w-full max-w-md shadow-2xl">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center space-y-4">
                            <Loader2 className="h-12 w-12 text-purple-600 animate-spin" />
                            <p className="text-gray-600">{t('auth.resetPasswordVerifyingLink')}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!valid) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4" dir={isRTL ? 'rtl' : 'ltr'}>
                <Card className="w-full max-w-md shadow-2xl border-red-200">
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-red-100 p-3 rounded-full w-fit mb-4">
                            <AlertCircle className="h-8 w-8 text-red-600" />
                        </div>
                        <CardTitle className="text-red-800">{t('auth.resetPasswordInvalidLink')}</CardTitle>
                        <CardDescription className="text-red-600">{error}</CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button
                            className="w-full bg-purple-600 hover:bg-purple-700"
                            onClick={() => router.push('/auth/forgot-password')}
                        >
                            {t('auth.resetPasswordRequestNewLink')}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4" dir={isRTL ? 'rtl' : 'ltr'}>
            <Card className="w-full max-w-md shadow-2xl shadow-purple-500/10 border border-purple-100">
                {/* Header with Logo */}
                <CardHeader className="text-center space-y-4">
                    {/* Logo/Brand Area */}
                    <div className="mx-auto bg-gradient-to-br from-purple-600 to-blue-600 p-4 rounded-2xl w-fit mb-2 shadow-lg">
                        <ShieldCheck className="h-12 w-12 text-white" />
                    </div>

                    {/* Title & Description */}
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-1">{t('common.siteName')}</h1>
                        <p className="text-sm text-gray-500 mb-4">
                            {t('common.siteSubtitle')}
                        </p>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                        <CardTitle className="text-xl">{t('auth.newPasswordLabel')}</CardTitle>
                        <CardDescription className="mt-2">
                            {t('auth.resetPasswordDesc')}
                        </CardDescription>
                    </div>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {/* Email Display */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm text-blue-800">
                                <span className="font-medium">{t('auth.emailLabel')}:</span> {email}
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
                            <Label htmlFor="newPassword">{t('auth.newPasswordLabel')}</Label>
                            <div className="relative">
                                <Input
                                    id="newPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="********"
                                    required
                                    className={isRTL ? "pr-3 pl-10 text-right" : "pl-3 pr-10 text-left"}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className={`absolute top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 ${isRTL ? 'left-3' : 'right-3'}`}
                                    aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                                    title={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">{t('auth.confirmPasswordLabel')}</Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showConfirm ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="********"
                                    required
                                    className={isRTL ? "pr-3 pl-10 text-right" : "pl-3 pr-10 text-left"}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    className={`absolute top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 ${isRTL ? 'left-3' : 'right-3'}`}
                                    aria-label={showConfirm ? t('auth.hidePasswordConfirmation') : t('auth.showPasswordConfirmation')}
                                    title={showConfirm ? t('auth.hidePasswordConfirmation') : t('auth.showPasswordConfirmation')}
                                >
                                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Password Requirements */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <p className="text-xs text-gray-600 mb-2 font-medium">{t('auth.resetPasswordRequirements')}</p>
                            <ul className="text-xs text-gray-600 space-y-1">
                                <li className={newPassword.length >= 8 ? 'text-green-600' : ''}>
                                    {newPassword.length >= 8 ? '✓' : '○'} {t('auth.resetPasswordReqLength')}
                                </li>
                                <li className={newPassword === confirmPassword && newPassword ? 'text-green-600' : ''}>
                                    {newPassword === confirmPassword && newPassword ? '✓' : '○'} {t('auth.resetPasswordReqMatch')}
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
                                    {t('auth.resetPasswordSaving')}
                                </>
                            ) : (
                                <>
                                    <ShieldCheck className="mr-2 h-4 w-4" />
                                    {t('auth.resetPasswordSaveBtn')}
                                </>
                            )}
                        </Button>

                        {/* Footer Info */}
                        <div className="w-full pt-4 border-t border-gray-200">
                            <p className="text-xs text-center text-gray-500">
                                {t('auth.resetPasswordBrandFooter')}
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
