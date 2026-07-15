'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { organizationReferralService } from '@/lib/organization/organization-referral-service';
import { useTranslation } from '@/lib/i18n';

interface ReferralWelcomeModalProps {
    playerId: string;
    playerName: string;
    onClose: () => void;
}

export default function ReferralWelcomeModal({ playerId, playerName, onClose }: ReferralWelcomeModalProps) {
    const { t, isRTL } = useTranslation();
    const rt = (key: string) => t(`sharedComponents.referrals.${key}`);
    const [isVisible, setIsVisible] = useState(true);
    const [referralCode, setReferralCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    useEffect(() => {
        // إغلاق تلقائي بعد 7 ثواني
        const timer = setTimeout(() => {
            handleClose();
        }, 7000);

        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        // حفظ الخيار إذا اختار "لا تظهر مرة أخرى"
        if (dontShowAgain) {
            localStorage.setItem(`never_show_referral_modal_${playerId}`, 'true');
        }
        setIsVisible(false);
        setTimeout(onClose, 300); // انتظر انتهاء الأنيميشن
    };

    const handleSubmit = async () => {
        if (!referralCode.trim()) {
            toast.error(rt('codeRequired'));
            return;
        }

        try {
            setIsSubmitting(true);

            // إنشاء طلب انضمام
            await organizationReferralService.createJoinRequest(
                playerId,
                { name: playerName, enteredAt: new Date().toISOString() },
                referralCode.trim()
            );

            toast.success(`🎉 ${rt('requestSent')}`);
            handleClose();
        } catch (error: any) {
            console.error('Error submitting referral code:', error);
            toast.error(error.message || rt('codeSendFailed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <>
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                        onClick={handleClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[95%] max-w-lg"
                    >
                        <div className="relative bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 rounded-2xl shadow-2xl overflow-hidden">
                            {/* Close Button */}
                            <button
                                onClick={handleClose}
                                className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-200 backdrop-blur-sm z-10"
                            >
                                <X className="h-5 w-5 text-white" />
                            </button>

                            {/* Decorative Elements */}
                            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                                <motion.div
                                    animate={{
                                        rotate: 360,
                                        scale: [1, 1.2, 1],
                                    }}
                                    transition={{
                                        duration: 20,
                                        repeat: Infinity,
                                        ease: 'linear',
                                    }}
                                    className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl"
                                />
                                <motion.div
                                    animate={{
                                        rotate: -360,
                                        scale: [1, 1.3, 1],
                                    }}
                                    transition={{
                                        duration: 15,
                                        repeat: Infinity,
                                        ease: 'linear',
                                    }}
                                    className="absolute -bottom-20 -left-20 w-40 h-40 bg-white/10 rounded-full blur-3xl"
                                />
                            </div>

                            {/* Content */}
                            <div className="relative p-8 text-white" dir={isRTL ? 'rtl' : 'ltr'}>
                                {/* Header */}
                                <div className="text-center mb-6">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                                        className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-md rounded-full mb-4 shadow-lg"
                                    >
                                        <Gift className="h-10 w-10 text-white" />
                                    </motion.div>

                                    <motion.h2
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="text-3xl font-bold mb-2"
                                    >
                                        🎉 {rt('welcome')}
                                    </motion.h2>

                                    <motion.p
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 }}
                                        className="text-white/90 text-lg"
                                    >
                                        {rt('haveReferralCode')}
                                    </motion.p>
                                </div>

                                {/* Benefits */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                    className="bg-white/10 backdrop-blur-md rounded-xl p-4 mb-6 space-y-3"
                                >
                                    <div className="flex items-start gap-3">
                                        <CheckCircle2 className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
                                        <p className="text-white/95 text-sm">
                                            <strong>{rt('joinAcademy')}:</strong> {rt('joinAcademyBenefit')}
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <CheckCircle2 className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
                                        <p className="text-white/95 text-sm">
                                            <strong>{rt('betterOpportunities')}:</strong> {rt('betterOpportunitiesBenefit')}
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <CheckCircle2 className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
                                        <p className="text-white/95 text-sm">
                                            <strong>{rt('fullSupport')}:</strong> {rt('fullSupportBenefit')}
                                        </p>
                                    </div>
                                </motion.div>

                                {/* Input */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6 }}
                                    className="space-y-3"
                                >
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder={rt('codePlaceholder')}
                                            value={referralCode}
                                            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                                            className="flex-1 bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:bg-white/30 focus:border-white/50 transition-all"
                                            disabled={isSubmitting}
                                        />
                                        <Button
                                            onClick={handleSubmit}
                                            disabled={isSubmitting || !referralCode.trim()}
                                            className="bg-white text-emerald-600 hover:bg-white/90 font-semibold px-6 shadow-lg"
                                        >
                                            {isSubmitting ? rt('sending') : rt('joinNow')}
                                        </Button>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        onClick={handleClose}
                                        className="w-full text-white/80 hover:text-white hover:bg-white/10"
                                    >
                                        {rt('noCodeNow')}
                                    </Button>

                                    {/* Don't show again checkbox */}
                                    <div className="flex items-center gap-2 justify-center mt-2">
                                        <Checkbox
                                            id="dontShowAgain"
                                            checked={dontShowAgain}
                                            onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
                                            className="border-white/40 data-[state=checked]:bg-white data-[state=checked]:text-emerald-600"
                                        />
                                        <label
                                            htmlFor="dontShowAgain"
                                            className="text-sm text-white/70 cursor-pointer hover:text-white/90 transition-colors"
                                        >
                                            {rt('doNotShowAgain')}
                                        </label>
                                    </div>
                                </motion.div>

                                {/* Footer Note */}
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.7 }}
                                    className="text-center text-white/70 text-xs mt-4"
                                >
                                    💡 {rt('addCodeLater')}
                                </motion.p>

                                {/* Auto-close timer indicator */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.8 }}
                                    className="mt-4"
                                >
                                    <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: '100%' }}
                                            animate={{ width: '0%' }}
                                            transition={{ duration: 7, ease: 'linear' }}
                                            className="h-full bg-white/60"
                                        />
                                    </div>
                                    <p className="text-center text-white/50 text-xs mt-1">
                                        {rt('closesInSevenSeconds')}
                                    </p>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
