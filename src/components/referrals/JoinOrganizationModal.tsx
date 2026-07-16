'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Building2, GraduationCap, Briefcase, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { organizationReferralService } from '@/lib/organization/organization-referral-service';
import { getOrganizationDetails } from '@/utils/player-organization';
import { useTranslation } from '@/lib/i18n';

interface JoinOrganizationModalProps {
    playerId: string;
    playerName: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const getOrganizationIcon = (type: string) => {
    switch (type) {
        case 'academy':
            return GraduationCap;
        case 'club':
            return Building2;
        case 'agent':
            return Briefcase;
        default:
            return Building2;
    }
};

const getOrganizationTypeLabel = (type: string) => {
    switch (type) {
        case 'academy':
            return 'academy';
        case 'club':
            return 'club';
        case 'agent':
            return 'agent';
        case 'trainer':
            return 'trainer';
        default:
            return 'organization';
    }
};

export default function JoinOrganizationModal({
    playerId,
    playerName,
    isOpen,
    onClose,
    onSuccess
}: JoinOrganizationModalProps) {
    const { t, isRTL } = useTranslation();
    const rt = (key: string) => t(`sharedComponents.referrals.${key}`);
    const [referralCode, setReferralCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [verifiedOrg, setVerifiedOrg] = useState<any>(null);

    const handleVerifyCode = async () => {
        if (!referralCode.trim()) {
            toast.error(rt('codeRequired'));
            return;
        }

        try {
            setIsVerifying(true);
            setVerifiedOrg(null);

            // التحقق من الكود
            const orgReferral = await organizationReferralService.verifyReferralCode(referralCode.trim());

            if (!orgReferral) {
                toast.error(rt('invalidCode'));
                return;
            }

            // جلب تفاصيل المنظمة
            const orgDetails = await getOrganizationDetails(
                orgReferral.organizationId,
                orgReferral.organizationType
            );

            setVerifiedOrg({
                ...orgReferral,
                details: orgDetails
            });

            toast.success(rt('codeVerified'));
        } catch (error: any) {
            console.error('Error verifying code:', error);
            toast.error(error.message || rt('codeVerifyFailed'));
        } finally {
            setIsVerifying(false);
        }
    };

    const handleSubmitRequest = async () => {
        if (!verifiedOrg) return;

        try {
            setIsSubmitting(true);

            await organizationReferralService.createJoinRequest(
                playerId,
                { name: playerName, enteredAt: new Date().toISOString() },
                referralCode.trim()
            );

            toast.success(`🎉 ${rt('requestSent')}`);
            onSuccess();
            handleClose();
        } catch (error: any) {
            console.error('Error submitting request:', error);
            toast.error(error.message || rt('requestSendFailed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setReferralCode('');
        setVerifiedOrg(null);
        onClose();
    };

    const OrgIcon = verifiedOrg ? getOrganizationIcon(verifiedOrg.organizationType) : Building2;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent
                className="w-[calc(100%-2rem)] max-w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto p-5 sm:w-full sm:max-w-lg sm:p-6 md:max-w-xl md:rounded-2xl md:p-8"
                dir={isRTL ? 'rtl' : 'ltr'}
            >
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-center">
                        {verifiedOrg ? `✅ ${rt('confirmJoin')}` : `🔍 ${rt('joinOrganization')}`}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-3 sm:py-4 md:space-y-5">
                    {!verifiedOrg ? (
                        // مرحلة إدخال الكود
                        <>
                            <div className="text-center mb-4">
                                <p className="text-sm text-gray-600">
                                    {rt('enterCodeDescription')}
                                </p>
                            </div>

                            <div className="space-y-3 md:flex md:items-stretch md:gap-3 md:space-y-0">
                                <Input
                                    placeholder={rt('codePlaceholder')}
                                    value={referralCode}
                                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                                    className="h-12 text-center text-lg font-mono md:flex-1"
                                    disabled={isVerifying}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            handleVerifyCode();
                                        }
                                    }}
                                />

                                <Button
                                    onClick={handleVerifyCode}
                                    disabled={isVerifying || !referralCode.trim()}
                                    className="h-12 w-full bg-emerald-600 hover:bg-emerald-700 md:w-auto md:min-w-[11rem]"
                                    size="lg"
                                >
                                    {isVerifying ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            {rt('verifying')}
                                        </>
                                    ) : (
                                        <>
                                            <Search className="h-4 w-4 mr-2" />
                                            {rt('verifyCode')}
                                        </>
                                    )}
                                </Button>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                                <p className="text-xs text-blue-800">
                                    💡 <strong>{rt('note')}:</strong> {rt('verifyNote')}
                                </p>
                            </div>
                        </>
                    ) : (
                        // مرحلة التأكيد
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                        >
                            {/* بطاقة المنظمة */}
                            <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl p-6">
                                <div className="flex items-start gap-4">
                                    {/* أيقونة المنظمة */}
                                    <div className="flex-shrink-0">
                                        <div className="w-16 h-16 bg-emerald-600 rounded-xl flex items-center justify-center">
                                            <OrgIcon className="h-8 w-8 text-white" />
                                        </div>
                                    </div>

                                    {/* تفاصيل المنظمة */}
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                                            {verifiedOrg.organizationName}
                                        </h3>
                                        <p className="text-sm text-emerald-700 font-medium mb-2">
                                            {rt(`orgTypes.${getOrganizationTypeLabel(verifiedOrg.organizationType)}`)}
                                        </p>

                                        {verifiedOrg.description && (
                                            <p className="text-xs text-gray-600 mb-2">
                                                {verifiedOrg.description}
                                            </p>
                                        )}

                                        <div className="flex flex-wrap gap-2 mt-2">
                                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-full text-xs">
                                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                                                <span>{rt('validCode')}</span>
                                            </div>
                                            {verifiedOrg.currentUsage !== undefined && verifiedOrg.maxUsage && (
                                                <div className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-full text-xs">
                                                    📊 {verifiedOrg.currentUsage}/{verifiedOrg.maxUsage} {rt('joined')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* معلومات إضافية */}
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <p className="text-xs text-amber-800">
                                    ⚠️ {rt('requestWillBeSent')} <strong>{verifiedOrg.organizationName}</strong>.
                                    {' '}{rt('approvalRequired')}
                                </p>
                            </div>

                            {/* أزرار التأكيد */}
                            <div className="flex gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={handleClose}
                                    className="flex-1"
                                    disabled={isSubmitting}
                                >
                                    {rt('cancel')}
                                </Button>
                                <Button
                                    onClick={handleSubmitRequest}
                                    disabled={isSubmitting}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            {rt('sending')}
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                            {rt('confirmJoin')}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
