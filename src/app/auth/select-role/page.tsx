'use client';

import { useAuth } from '@/lib/firebase/auth-provider';
import { db } from '@/lib/firebase/config';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import {
    Briefcase,
    CheckCircle,
    ChevronRight,
    Home,
    Loader2,
    ShieldCheck,
    Star,
    User,
    UserCheck,
    Users,
    Phone
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast, Toaster } from 'sonner';
import { deleteUser, GoogleAuthProvider, linkWithPopup, PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import WhatsAppOTPVerification from '@/components/shared/WhatsAppOTPVerification';

const roles = [
    {
        id: 'player',
        title: 'لاعب',
        description: 'أبحث عن فرصة لاحتراف كرة القدم والانضمام للأندية.',
        icon: Star,
        color: 'text-yellow-500',
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        hover: 'hover:border-yellow-400',
        ring: 'focus:ring-yellow-500'
    },
    {
        id: 'club',
        title: 'نادي',
        description: 'أبحث عن مواهب جديدة لضمها إلى صفوف النادي.',
        icon: Home,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        hover: 'hover:border-blue-400',
        ring: 'focus:ring-blue-500'
    },
    {
        id: 'academy',
        title: 'أكاديمية',
        description: 'نبحث عن لاعبين جدد وتطوير المواهب الشابة.',
        icon: Users,
        color: 'text-purple-600',
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        hover: 'hover:border-purple-400',
        ring: 'focus:ring-purple-500'
    },
    {
        id: 'agent',
        title: 'وكيل لاعبين',
        description: 'أبحث عن تمثيل اللاعبين وتسويقهم للأندية.',
        icon: UserCheck,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        hover: 'hover:border-emerald-400',
        ring: 'focus:ring-emerald-500'
    },
    {
        id: 'trainer',
        title: 'مدرب',
        description: 'مدرب محترف أبحث عن فرص تدريبية.',
        icon: User,
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        hover: 'hover:border-orange-400',
        ring: 'focus:ring-orange-500'
    },
    {
        id: 'marketer',
        title: 'مسوق',
        description: 'أعمل في مجال التسويق الرياضي.',
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

    // Linking State
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [showOTPModal, setShowOTPModal] = useState(false);
    const [confirmationResult, setConfirmationResult] = useState<any>(null);
    const [isLinking, setIsLinking] = useState(false);

    const { sendPhoneOTP, setupRecaptcha } = useAuth();

    useEffect(() => {
        // If not logged in, go to login
        if (!authLoading && !user) {
            router.replace('/auth/login');
            return;
        }

        // If logged in and already has a valid role (not player default for new google users IF we change logic),
        // For now, we assume this page is only visited if we force redirect or user comes here manually.
        // However, if we change the auth provider to set "unknown" initially, we check that.
        // Currently, auth provider sets 'player' by default for Google. 
        // We will update AuthProvider to be smarter, but for now let's allow role selection if it matches 'player' (default) or 'unknown'.
        // Or simpler: This page is valid for anyone who wants to "set" their initial role.
    }, [user, authLoading, router]);

    const handleContinue = async () => {
        if (!selectedRole || !user) return;

        setIsSubmitting(true);
        try {
            const roleData = {
                accountType: selectedRole,
                updated_at: new Date(),
                // Ensure profile is active
                isActive: true
            };

            // 1. Update 'users' collection
            await updateDoc(doc(db, 'users', user.uid), roleData);

            // 2. Create/Update role-specific collection doc
            // We need to copy basic data to the new collection
            const baseData = {
                uid: user.uid,
                email: user.email,
                full_name: userData?.full_name || user.displayName || '',
                profile_image: userData?.profile_image || user.photoURL || '',
                phone: userData?.phone || '',
                ...roleData,
                created_at: userData?.created_at || new Date()
            };

            const collectionName = selectedRole === 'academy' ? 'academies' : `${selectedRole}s`;

            await setDoc(doc(db, collectionName, user.uid), baseData, { merge: true });

            // 3. Refresh local user data
            await refreshUserData();

            toast.success('تم تحديث نوع الحساب بنجاح!');

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
            toast.error('حدث خطأ أثناء تحديث نوع الحساب');
        } finally {
            setIsSubmitting(false);
        }
    };

    /* --- Account Linking / Recovery Logic --- */
    const handleStartLink = async () => {
        if (!phoneNumber) {
            toast.error('يرجى إدخال رقم الهاتف');
            return;
        }

        const fullPhone = phoneNumber.startsWith('+')
            ? phoneNumber.replace(/\s+/g, '')
            : `+966${phoneNumber.replace(/^0+/, '')}`; // Default to SA if no code, or handled better 

        // Better: Validate format. For now, assuming user enters correctly or we use simple format
        // Ideally we should use the same phone input component as login, but for simplicity:
        // We will assume user enters full international format or just handle local formatting if we had country code.
        // Let's just prompt user to enter with country code or assume default.

        setIsLinking(true);
        toast.loading('جاري إرسال رمز التحقق...', { id: 'link-otp' });

        try {
            let appVerifier = (window as any).recaptchaVerifier;
            if (!appVerifier) {
                appVerifier = await setupRecaptcha('recaptcha-container-link');
            }

            const confirmation = await sendPhoneOTP(fullPhone, appVerifier);
            setConfirmationResult(confirmation);
            setShowOTPModal(true);
            toast.success('تم إرسال الرمز بنجاح', { id: 'link-otp' });
            setShowLinkInput(false);
        } catch (error: any) {
            console.error('Error sending OTP:', error);
            toast.error(error.message || 'فشل إرسال الرمز', { id: 'link-otp' });
        } finally {
            setIsLinking(false);
        }
    };

    const handleVerifyAndLink = async (otp: string) => {
        // This function is passed to WhatsAppOTPVerification to handle the custom flow
        // The flow:
        // 1. Delete current temp Google user (to free up the Google credential)
        // 2. Sign in with the Phone credential
        // 3. Link the Google credential to the Phone user

        try {
            toast.loading('جاري استعادة الحساب وربط البيانات...', { id: 'verify-link' });

            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error('No active session');

            // 1. Delete current empty Google User
            // Note: This relies on the user having *just* signed in, so no re-auth needed usually.
            await deleteUser(currentUser);
            console.log('✅ Temporary Google user deleted');

            // 2. Sign In with Phone
            // confirmationResult is from firebase.auth.RecaptchaVerifier
            // We need to confirm it.
            const credential = PhoneAuthProvider.credential(confirmationResult.verificationId, otp);
            const userCredential = await signInWithCredential(auth, credential);
            const phoneUser = userCredential.user;
            console.log('✅ Signed in with Phone:', phoneUser.uid);

            // 3. Link Google
            // We need to trigger the Google Link Popup.
            // Since we are now on the 'Old' account, we add Google to it.
            const googleProvider = new GoogleAuthProvider();
            await linkWithPopup(phoneUser, googleProvider);
            console.log('✅ Google linked to old account');

            // 4. Update Email in Firestore if missing 
            // (Optional, but good practice to sync the Google email to the old account)
            if (phoneUser.email) {
                const userRef = doc(db, 'users', phoneUser.uid);
                await updateDoc(userRef, {
                    email: phoneUser.email,
                    isGoogleLinked: true,
                    updated_at: new Date()
                });
            }

            toast.success('🎉 تم استعادة حسابك القديم وربطه بنجاح!', { id: 'verify-link' });

            // 5. Force Refresh / Redirect
            // We need to find the OLD account type to redirect correctly
            await refreshUserData(); // This might pick up new user data

            // We can't know the role easily without querying. 
            // But verifyAndLink is async, we can query quickly or let auth-provider handle logic?
            // Auth provider updates user/userData state.
            // Let's wait a moment or just redirect to home/dashboard and let middleware handle it
            window.location.href = '/dashboard'; // Safe fallback

        } catch (error: any) {
            console.error('Link/Recover error:', error);
            // If delete failed (re-auth needed), we are stuck. 
            // If link failed (credential in use?), we are signed in as Phone at least.

            let msg = 'حدث خطأ أثناء العملية.';
            if (error.code === 'auth/credential-already-in-use') {
                msg = 'هذا الحساب مرتبط بالفعل بحساب آخر.';
            } else if (error.code === 'auth/requires-recent-login') {
                msg = 'انتهت جلسة الدخول، يرجى إعادة المحاولة من جديد.';
            }
            toast.error(msg, { id: 'verify-link' });
            throw error; // Propagate so modal shows error if needed
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
            <Toaster position="top-center" dir="rtl" richColors />
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4" dir="rtl">
                <div className="w-full max-w-4xl">

                    <div className="text-center mb-10 space-y-3 animate-in slide-in-from-top-10 fade-in duration-700">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-100 mb-4">
                            <ShieldCheck className="w-8 h-8 text-purple-600" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-800 font-cairo">
                            كيف تود استخدام المنصة؟
                        </h1>
                        <p className="text-slate-500 text-lg max-w-lg mx-auto">
                            اختر نوع الحساب الذي يناسبك للبدء في رحلتك مع الحلم
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
                                        <span>متابعة</span>
                                        <ChevronRight className="w-5 h-5 rtl:rotate-180 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>

                            {/* Account Recovery Section */}
                            <div className="mt-8 text-center pt-8 border-t border-slate-200 w-full max-w-md">
                                {!showLinkInput ? (
                                    <div className="space-y-2">
                                        <p className="text-slate-500 font-medium">سجلت سابقاً برقم الهاتف؟</p>
                                        <button
                                            onClick={() => setShowLinkInput(true)}
                                            className="text-purple-600 font-bold hover:text-purple-700 hover:underline flex items-center justify-center gap-2 mx-auto"
                                        >
                                            <Phone className="w-4 h-4" />
                                            استعادة حسابي القديم وربطه
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                                        <label className="text-sm font-bold text-slate-700">أدخل رقم هاتفك المسجل</label>
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
                                                إلغاء
                                            </button>
                                            <button
                                                onClick={handleStartLink}
                                                disabled={isLinking}
                                                className="px-6 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50"
                                            >
                                                {isLinking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'استعادة'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div id="recaptcha-container-link"></div>

                    <WhatsAppOTPVerification
                        phoneNumber={phoneNumber}
                        isOpen={showOTPModal}
                        onClose={() => setShowOTPModal(false)}
                        onVerificationSuccess={() => { }} // We handle logic in verify
                        onVerificationFailed={(err) => toast.error(err)}
                        onOTPVerify={handleVerifyAndLink}
                        title="تأكيد ملكية الحساب"
                        subtitle="أدخل الرمز المرسل لهاتفك لإثبات الملكية ودمج الحسابين"
                    />

                </div>
            </div>
        </>
    );
}
