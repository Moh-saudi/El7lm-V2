'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Building2, GraduationCap, Briefcase, CheckCircle2, Loader2 } from 'lucide-react';
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
        case 'academy': return GraduationCap;
        case 'agent': return Briefcase;
        case 'club':
        case 'trainer':
        default: return Building2;
    }
};

const getOrganizationTypeLabel = (type: string) => type === 'academy' || type === 'club' || type === 'agent' || type === 'trainer' ? type : 'organization';

export default function JoinOrganizationModal({ playerId, playerName, isOpen, onClose, onSuccess }: JoinOrganizationModalProps) {
    const { t, isRTL } = useTranslation();
    const rt = (key: string) => t(`sharedComponents.referrals.${key}`);
    const [referralCode, setReferralCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [verifiedOrg, setVerifiedOrg] = useState<any>(null);

    const handleVerifyCode = async () => {
        if (!referralCode.trim()) return toast.error(rt('codeRequired'));
        try {
            setIsVerifying(true);
            setVerifiedOrg(null);
            const referral = await organizationReferralService.verifyReferralCode(referralCode.trim());
            if (!referral) return toast.error(rt('invalidCode'));
            const details = await getOrganizationDetails(referral.organizationId, referral.organizationType);
            setVerifiedOrg({ ...referral, details });
            toast.success(rt('codeVerified'));
        } catch (error: any) {
            console.error('Error verifying code:', error);
            toast.error(error.message || rt('codeVerifyFailed'));
        } finally { setIsVerifying(false); }
    };

    const handleSubmitRequest = async () => {
        if (!verifiedOrg) return;
        try {
            setIsSubmitting(true);
            await organizationReferralService.createJoinRequest(playerId, { name: playerName, enteredAt: new Date().toISOString() }, referralCode.trim());
            toast.success(`🎉 ${rt('requestSent')}`);
            onSuccess();
            handleClose();
        } catch (error: any) {
            console.error('Error submitting request:', error);
            toast.error(error.message || rt('requestSendFailed'));
        } finally { setIsSubmitting(false); }
    };

    const handleClose = () => {
        setReferralCode('');
        setVerifiedOrg(null);
        onClose();
    };

    const OrgIcon = verifiedOrg ? getOrganizationIcon(verifiedOrg.organizationType) : Building2;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="w-[calc(100%-1.5rem)] max-w-[calc(100%-1.5rem)] overflow-hidden rounded-3xl border-0 bg-slate-50 p-0 shadow-2xl sm:w-full sm:max-w-lg" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="relative overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-500 px-5 pb-7 pt-8 text-white sm:px-8">
                    <div className="absolute -left-12 -top-16 h-40 w-40 rounded-full bg-white/10" />
                    <div className="absolute -bottom-20 -right-8 h-48 w-48 rounded-full bg-teal-300/20" />
                    <div className="relative flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25"><OrgIcon className="h-6 w-6" /></div>
                        <DialogHeader className="space-y-1 text-start">
                            <DialogTitle className="text-xl font-bold tracking-tight text-white sm:text-2xl">{verifiedOrg ? rt('confirmJoin') : rt('joinOrganization')}</DialogTitle>
                            <p className="text-sm leading-6 text-emerald-50">{verifiedOrg ? rt('requestWillBeSent') : rt('enterCodeDescription')}</p>
                        </DialogHeader>
                    </div>
                </div>

                <div className="space-y-5 px-5 py-6 sm:px-8 sm:py-8">
                    <div className="flex items-center gap-3 text-xs font-semibold">
                        <div className="flex items-center gap-2 text-emerald-700"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white">{verifiedOrg ? '✓' : '1'}</span>{rt('verifyCode')}</div>
                        <div className="h-px flex-1 bg-slate-200" />
                        <div className={`flex items-center gap-2 ${verifiedOrg ? 'text-emerald-700' : 'text-slate-400'}`}><span className={`flex h-7 w-7 items-center justify-center rounded-full ${verifiedOrg ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>2</span>{rt('confirmJoin')}</div>
                    </div>

                    {!verifiedOrg ? (
                        <>
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                                <label className="mb-2 block text-sm font-semibold text-slate-800">{rt('codePlaceholder')}</label>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                    <Input aria-label={rt('codePlaceholder')} placeholder="ACAD-123" value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} className="h-14 rounded-xl border-slate-200 bg-slate-50 ps-11 text-center text-xl font-bold tracking-[0.18em] text-slate-900 placeholder:tracking-normal placeholder:text-slate-400" disabled={isVerifying} onKeyDown={(e) => { if (e.key === 'Enter') handleVerifyCode(); }} />
                                </div>
                                <Button onClick={handleVerifyCode} disabled={isVerifying || !referralCode.trim()} className="mt-4 h-12 w-full rounded-xl bg-emerald-600 text-base font-semibold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700">
                                    {isVerifying ? <><Loader2 className="h-4 w-4 animate-spin" />{rt('verifying')}</> : <><Search className="h-4 w-4" />{rt('verifyCode')}</>}
                                </Button>
                            </div>
                            <div className="flex gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900"><span className="text-lg">💡</span><p><strong>{rt('note')}:</strong> {rt('verifyNote')}</p></div>
                        </>
                    ) : (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                            <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-600/20"><OrgIcon className="h-7 w-7 text-white" /></div>
                                    <div className="min-w-0 flex-1"><h3 className="text-xl font-bold text-slate-900">{verifiedOrg.organizationName}</h3><p className="mt-1 text-sm font-semibold text-emerald-700">{rt(`orgTypes.${getOrganizationTypeLabel(verifiedOrg.organizationType)}`)}</p>{verifiedOrg.description && <p className="mt-3 text-sm leading-6 text-slate-600">{verifiedOrg.description}</p>}<div className="mt-4 flex flex-wrap gap-2"><span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />{rt('validCode')}</span>{verifiedOrg.currentUsage !== undefined && verifiedOrg.maxUsage && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">{verifiedOrg.currentUsage}/{verifiedOrg.maxUsage} {rt('joined')}</span>}</div></div>
                                </div>
                            </div>
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">⚠️ {rt('requestWillBeSent')} <strong>{verifiedOrg.organizationName}</strong>. {rt('approvalRequired')}</div>
                            <div className="flex flex-col-reverse gap-3 sm:flex-row"><Button variant="outline" onClick={handleClose} className="h-12 flex-1 rounded-xl" disabled={isSubmitting}>{rt('cancel')}</Button><Button onClick={handleSubmitRequest} disabled={isSubmitting} className="h-12 flex-1 rounded-xl bg-emerald-600 font-semibold hover:bg-emerald-700">{isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" />{rt('sending')}</> : <><CheckCircle2 className="h-4 w-4" />{rt('confirmJoin')}</>}</Button></div>
                        </motion.div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
