'use client';

import { useAuth } from '@/lib/firebase/auth-provider';
import { supabase } from '@/lib/supabase/config';
import {
    Briefcase,
    CheckCircle,
    ChevronRight,
    Home,
    Loader2,
    ShieldCheck,
    User,
    UserCheck,
    Users,
    Phone,
    Star
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast, Toaster } from 'sonner';
import WhatsAppOTPVerification from '@/components/shared/WhatsAppOTPVerification';
import { useTranslation } from '@/lib/i18n';

const getRoles = (t: any) => [
    {
        id: 'player',
        title: t('auth.rolePlayer'),
        description: t('auth.rolePlayerSelectDesc'),
        icon: Star,
        color: 'text-yellow-500',
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        hover: 'hover:border-yellow-400',
        ring: 'focus:ring-yellow-500'
    },
    {
        id: 'club',
        title: t('auth.roleClub'),
        description: t('auth.roleClubSelectDesc'),
        icon: Home,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        hover: 'hover:border-blue-400',
        ring: 'focus:ring-blue-500'
    },
    {
        id: 'academy',
        title: t('auth.roleAcademy'),
        description: t('auth.roleAcademySelectDesc'),
        icon: Users,
        color: 'text-purple-600',
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        hover: 'hover:border-purple-400',
        ring: 'focus:ring-purple-500'
    },
    {
        id: 'agent',
        title: t('auth.roleAgent'),
        description: t('auth.roleAgentSelectDesc'),
        icon: UserCheck,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        hover: 'hover:border-emerald-400',
        ring: 'focus:ring-emerald-500'
    },
    {
        id: 'trainer',
        title: t('auth.roleTrainer'),
        description: t('auth.roleTrainerSelectDesc'),
        icon: User,
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        hover: 'hover:border-orange-400',
        ring: 'focus:ring-orange-500'
    },
    {
        id: 'marketer',
        title: t('auth.roleMarketer'),
        description: t('auth.roleMarketerSelectDesc'),
        icon: Briefcase,
        color: 'text-pink-600',
        bg: 'bg-pink-50',
        border: 'border-pink-200',
        hover: 'hover:border-pink-400',
        ring: 'focus:ring-pink-500'
    }
];

export default function SelectRolePage() {
    const router = useRouter();
    const { user, userData, loading: authLoading, refreshUserData } = useAuth();
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { t, isRTL } = useTranslation();

    // Linking State
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [showOTPModal, setShowOTPModal] = useState(false);
    const [isLinking, setIsLinking] = useState(false);

    const { sendPhoneOTP } = useAuth();
    const roles = getRoles(t);

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/auth/login');
        }
    }, [user, authLoading, router]);

    const handleContinue = async () => {
        if (!selectedRole || !user) return;

        setIsSubmitting(true);
        try {
            const now = new Date().toISOString();
            const roleData = {
                accountType: selectedRole,
                updated_at: now,
                isActive: true
            };

            // 1. Update 'users' table
            await supabase.from('users').update(roleData).eq('id', user.id);

            // 2. Create/Update role-specific table record
            const baseData = {
                id: user.id,
                email: user.email,
                full_name: userData?.full_name || user.user_metadata?.full_name || '',
                profile_image: userData?.profile_image || user.user_metadata?.avatar_url || '',
                phone: userData?.phone || '',
                ...roleData,
                created_at: userData?.created_at || now
            };

            const collectionName = selectedRole === 'academy' ? 'academies' : `${selectedRole}s`;
            await supabase.from(collectionName).upsert(baseData);

            // 3. Refresh local user data
            await refreshUserData();

            toast.success(t('auth.selectRoleSuccessToast'));

            // 4. Redirect
            const routes: Record<string, string> = {
                player: '/dashboard/player',
                club: '/dashboard/club',
                agent: '/dashboard/agent',
                academy: '/dashboard/academy',
                trainer: '/dashboard/trainer',
                admin: '/dashboard/admin',
                marketer: '/dashboard/marketer',
            };

            setTimeout(() => {
                router.replace(routes[selectedRole]);
            }, 500);

        } catch (error) {
            console.error('Error updating role:', error);
            toast.error(t('auth.selectRoleErrorToast'));
        } finally {
            setIsSubmitting(false);
        }
    };

    /* --- Account Recovery Logic --- */
    const handleStartLink = async () => {
        if (!phoneNumber) {
            toast.error(t('auth.selectRoleEnterPhoneToast'));
            return;
        }

        const fullPhone = phoneNumber.startsWith('+')
            ? phoneNumber.replace(/\s+/g, '')
            : `+966${phoneNumber.replace(/^0+/, '')}`;

        setIsLinking(true);
        toast.loading(t('auth.selectRoleSendingOtpToast'), { id: 'link-otp' });

        try {
            await sendPhoneOTP(fullPhone, null);
            setShowOTPModal(true);
            toast.success(t('auth.selectRoleOtpSentToast'), { id: 'link-otp' });
            setShowLinkInput(false);
        } catch (error: any) {
            console.error('Error sending OTP:', error);
            toast.error(error.message || t('auth.selectRoleOtpFailedToast'), { id: 'link-otp' });
        } finally {
            setIsLinking(false);
        }
    };

    const handleVerifyAndLink = async (otp: string) => {
        try {
            toast.loading(t('auth.loggingIn'), { id: 'verify-link' });

            const fullPhone = phoneNumber.startsWith('+')
                ? phoneNumber.replace(/\s+/g, '')
                : `+966${phoneNumber.replace(/^0+/, '')}`;

            // 1. Verify OTP and get credentials for the old phone account
            const response = await fetch('/api/auth/otp-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: fullPhone, otp })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || t('auth.otpVerificationFailed'));
            }

            // 2. Switch to the old phone account session
            await supabase.auth.signInWithPassword({
                email: data.authEmail,
                password: data.authPassword,
            });

            // 3. Update the phone account with the current user's Google email if available
            const currentEmail = user?.email;
            if (currentEmail && data.userId) {
                await supabase.from('users').update({
                    email: currentEmail,
                    isGoogleLinked: true,
                    updated_at: new Date().toISOString()
                }).eq('id', data.userId);
            }

            toast.success(t('auth.selectRoleRestoreSuccessToast'), { id: 'verify-link' });

            await refreshUserData();
            window.location.href = '/dashboard';

        } catch (error: any) {
            console.error('Link/Recover error:', error);

            let msg = t('auth.errorDefault');
            if (error.message?.includes('invalid') || error.message?.includes('expired')) {
                msg = t('auth.errorWrongPassword');
            } else if (error.message) {
                msg = error.message;
            }
            toast.error(msg, { id: 'verify-link' });
            throw error;
        }
    };

    if (authLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-slate-50">
                <Loader2 className="w-10 h-10 text-slate-300 animate-spin" />
            </div>
        );
    }

    return (
        <>
            <Toaster position="top-center" dir={isRTL ? 'rtl' : 'ltr'} richColors />
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="w-full max-w-4xl">

                    <div className="text-center mb-10 space-y-3 animate-in slide-in-from-top-10 fade-in duration-700">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-100 mb-4">
                            <ShieldCheck className="w-8 h-8 text-purple-600" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-800 font-cairo">
                            {t('auth.selectRoleTitleQuestion')}
                        </h1>
                        <p className="text-slate-500 text-lg max-w-lg mx-auto">
                            {t('auth.selectRoleSubtitle')}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
                        {roles.map((role, idx) => {
                            const Icon = role.icon;
                            const isSelected = selectedRole === role.id;

                            return (
                                <button
                                    key={role.id}
                                    onClick={() => setSelectedRole(role.id)}
                                    className={`
                    relative group flex flex-col items-start p-6 rounded-2xl border-2 transition-all duration-300
                    hover:shadow-lg text-right w-full
                    ${isSelected
                                            ? `${role.border} ${role.bg} ring-2 ring-offset-2 ${role.ring}`
                                            : 'bg-white border-slate-100 hover:border-slate-300'
                                        }
                  `}
                                    style={{ animationDelay: `${idx * 100}ms` }}
                                >
                                    <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors
                    ${isSelected ? 'bg-white shadow-sm' : 'bg-slate-50 group-hover:bg-slate-100'}
                  `}>
                                        <Icon className={`w-6 h-6 ${isSelected ? role.color : 'text-slate-400 group-hover:text-slate-600'}`} />
                                    </div>

                                    <div className="space-y-1">
                                        <h3 className={`font-bold text-lg ${isSelected ? 'text-slate-800' : 'text-slate-700'}`}>
                                            {role.title}
                                        </h3>
                                        <p className={`text-sm leading-relaxed ${isSelected ? 'text-slate-600' : 'text-slate-400'}`}>
                                            {role.description}
                                        </p>
                                    </div>

                                    {isSelected && (
                                        <div className="absolute top-4 left-4 text-purple-600 animate-in zoom-in spin-in-12 duration-300">
                                            <CheckCircle className="w-6 h-6 fill-purple-600 text-white" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex justify-center animate-in slide-in-from-bottom-10 fade-in duration-1000">
                        <div className="flex flex-col items-center w-full gap-4">
                            <button
                                onClick={handleContinue}
                                disabled={!selectedRole || isSubmitting}
                                className={`
                    group relative w-full md:w-auto md:min-w-[300px] h-14 rounded-xl font-bold text-lg shadow-xl shadow-purple-200
                    transition-all duration-300 flex items-center justify-center gap-3
                    ${!selectedRole || isSubmitting
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                        : 'bg-slate-900 text-white hover:bg-slate-800 hover:-translate-y-1'
                                    }
                `}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>
                                        <span>{t('auth.selectRoleContinue')}</span>
                                        {isRTL ? (
                                            <ChevronRight className="w-5 h-5 rotate-180 group-hover:translate-x-1 transition-transform" />
                                        ) : (
                                            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        )}
                                    </>
                                )}
                            </button>

                            {/* Account Recovery Section */}
                            <div className="mt-8 text-center pt-8 border-t border-slate-200 w-full max-w-md">
                                {!showLinkInput ? (
                                    <div className="space-y-2">
                                        <p className="text-slate-500 font-medium">{t('auth.selectRoleRegisteredPhone')}</p>
                                        <button
                                            onClick={() => setShowLinkInput(true)}
                                            className="text-purple-600 font-bold hover:text-purple-700 hover:underline flex items-center justify-center gap-2 mx-auto"
                                        >
                                            <Phone className="w-4 h-4" />
                                            {t('auth.selectRoleRestoreBtn')}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                                        <label className="text-sm font-bold text-slate-700">{t('auth.selectRoleRestorePlaceholder')}</label>
                                        <div className="flex gap-2" dir="ltr">
                                            <input
                                                type="tel"
                                                value={phoneNumber}
                                                onChange={(e) => setPhoneNumber(e.target.value)}
                                                placeholder="+9665xxxxxxxx"
                                                className="flex-1 h-11 px-4 rounded-xl border border-slate-300 text-left"
                                            />
                                        </div>
                                        <div className="flex gap-2 justify-center">
                                            <button
                                                onClick={() => setShowLinkInput(false)}
                                                className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium text-sm"
                                            >
                                                {t('common.cancel')}
                                            </button>
                                            <button
                                                onClick={handleStartLink}
                                                disabled={isLinking}
                                                className="px-6 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50"
                                            >
                                                {isLinking ? <Loader2 className="w-4 h-4 animate-spin" /> : t('auth.selectRoleRestoreBtn').split(' ')[0]}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <WhatsAppOTPVerification
                        phoneNumber={phoneNumber}
                        isOpen={showOTPModal}
                        onClose={() => setShowOTPModal(false)}
                        onVerificationSuccess={() => { }}
                        onVerificationFailed={(err) => toast.error(err)}
                        onOTPVerify={handleVerifyAndLink}
                        title={t('auth.selectRoleConfirmOwnership')}
                        subtitle={t('auth.selectRoleConfirmOwnershipSub')}
                    />

                </div>
            </div>
        </>
    );
}
