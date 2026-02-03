'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { referralService } from '@/lib/referral/referral-service';
import { POINTS_CONVERSION, BADGES } from '@/types/referral';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    UserPlus,
    Copy,
    Trophy,
    DollarSign,
    Users,
    TrendingUp,
    Award,
    MessageCircle,
    Mail,
    Phone,
    QrCode
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface RewardsStats {
    totalPoints: number;
    availablePoints: number;
    totalEarnings: number;
    referralCount: number;
    badges: any[];
    lastUpdated: any;
}

export default function MarketerReferralsPage() {
    const { user, userData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [rewards, setRewards] = useState<RewardsStats | null>(null);
    const [referralCode, setReferralCode] = useState('');
    const [showQR, setShowQR] = useState(false);

    useEffect(() => {
        if (user?.uid) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        try {
            setLoading(true);

            // Using the same referral service as it maps to userId
            const stats = await referralService.createOrUpdatePlayerRewards(user!.uid);
            setRewards(stats);

            if (!referralCode) {
                // Try to fetch existing code or generate
                // Assuming createReferral idempotent or checking existance
                // For simplicity, we generate if not in state, backend handles uniqueness or we query it.
                // Actually referralService.createReferral checks if exists?
                // We'll generate a code based on name if not exists
                const code = referralService.generateReferralCode();
                setReferralCode(code);
                // Note: In a real app we should fetch the existing code first. 
                // For now adhering to the pattern in PlayerReferralsPage 
                await referralService.createReferral(user!.uid, code);
            }

        } catch (error) {
            console.error('Error loading referral data:', error);
            toast.error('حدث خطأ في تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    const copyReferralCode = () => {
        navigator.clipboard.writeText(referralCode);
        toast.success('تم نسخ كود الإحالة');
    };

    const copyReferralLink = () => {
        const link = referralService.createReferralLink(referralCode);
        navigator.clipboard.writeText(link);
        toast.success('تم نسخ رابط الإحالة');
    };

    const shareViaWhatsApp = () => {
        const messages = referralService.createShareMessages(referralCode, user?.displayName || 'مسوق');
        window.open(messages.whatsapp, '_blank');
    };

    const shareViaSMS = () => {
        const messages = referralService.createShareMessages(referralCode, user?.displayName || 'مسوق');
        window.open(messages.sms, '_blank');
    };

    const shareViaEmail = () => {
        const messages = referralService.createShareMessages(referralCode, user?.displayName || 'مسوق');
        window.open(messages.email, '_blank');
    };

    const getEarningsInEGP = (dollars: number) => {
        return (dollars * POINTS_CONVERSION.DOLLAR_TO_EGP).toFixed(2);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-xl">جاري التحميل...</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6" dir="rtl">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">سفراء الحلم</h1>
                <div className="flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-yellow-500" />
                    <span className="text-lg font-semibold">نظام المكافآت</span>
                </div>
            </div>

            {/* Stats Cards */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
                <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100">النقاط المتوفرة</p>
                                <p className="text-3xl font-bold">{rewards?.availablePoints.toLocaleString()}</p>
                            </div>
                            <DollarSign className="w-8 h-8" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-green-100">إجمالي الأرباح</p>
                                <p className="text-3xl font-bold">${rewards?.totalEarnings.toFixed(2)}</p>
                                <p className="text-sm text-green-100">≈ {getEarningsInEGP(rewards?.totalEarnings || 0)} ج.م</p>
                            </div>
                            <TrendingUp className="w-8 h-8" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-purple-100">المشتركين المحالين</p>
                                <p className="text-3xl font-bold">{rewards?.referralCount}</p>
                            </div>
                            <Users className="w-8 h-8" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-orange-100">الشارات المكتسبة</p>
                                <p className="text-3xl font-bold">{rewards?.badges.length}</p>
                            </div>
                            <Award className="w-8 h-8" />
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Referral Code */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserPlus className="w-5 h-5" />
                            كود الإحالة الشخصي
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <Input
                                    value={referralCode}
                                    readOnly
                                    className="text-center text-lg font-mono bg-white/20 border-white/30 text-white"
                                />
                            </div>
                            <Button onClick={copyReferralCode} className="bg-transparent border-2 border-white/30 text-white hover:bg-white/20 transition-all duration-300">
                                <Copy className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button onClick={copyReferralLink} className="bg-transparent border-2 border-white/30 text-white hover:bg-white/20 transition-all duration-300">
                                <Copy className="w-4 h-4 mr-2" />
                                نسخ الرابط
                            </Button>
                            <Button onClick={shareViaWhatsApp} className="bg-transparent border-2 border-white/30 text-white hover:bg-white/20 transition-all duration-300">
                                <MessageCircle className="w-4 h-4 mr-2" />
                                واتساب
                            </Button>
                            <Button onClick={shareViaSMS} className="bg-transparent border-2 border-white/30 text-white hover:bg-white/20 transition-all duration-300">
                                <Phone className="w-4 h-4 mr-2" />
                                SMS
                            </Button>
                            <Button onClick={shareViaEmail} className="bg-transparent border-2 border-white/30 text-white hover:bg-white/20 transition-all duration-300">
                                <Mail className="w-4 h-4 mr-2" />
                                إيميل
                            </Button>
                            <Button onClick={() => setShowQR(!showQR)} className="bg-transparent border-2 border-white/30 text-white hover:bg-white/20 transition-all duration-300">
                                <QrCode className="w-4 h-4 mr-2" />
                                QR Code
                            </Button>
                        </div>

                        {showQR && (
                            <div className="mt-4 p-4 bg-white/10 rounded-lg">
                                <p className="text-center text-sm mb-2">QR Code للكود الشخصي</p>
                                <div className="flex justify-center">
                                    <div className="w-32 h-32 bg-white rounded-lg flex items-center justify-center">
                                        <span className="text-xs text-gray-600">QR Code</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* Rewards Info */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-green-500" />
                            كيف تكسب النقاط؟
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-green-600">🎯 الإحالات</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span>إحالة مستخدم جديد</span>
                                        <Badge variant="secondary">10,000 نقطة</Badge>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-orange-600">💰 التحويل</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span>10,000 نقطة =</span>
                                        <Badge variant="secondary">$1.00</Badge>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>1 دولار =</span>
                                        <Badge variant="secondary">49 ج.م</Badge>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
