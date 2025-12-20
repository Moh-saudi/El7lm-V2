'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { referralService } from '@/lib/referral/referral-service';
import { organizationReferralService } from '@/lib/organization/organization-referral-service';
import { PlayerJoinRequest } from '@/types/organization-referral';
import { POINTS_CONVERSION, BADGES } from '@/types/referral';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import JoinOrganizationModal from '@/components/referrals/JoinOrganizationModal';
import {
  UserPlus,
  Copy,
  Share2,
  Trophy,
  DollarSign,
  Users,
  TrendingUp,
  Award,
  Star,
  Crown,
  Flame,
  Target,
  BarChart3,
  Calendar,
  MessageCircle,
  Mail,
  Phone,
  Download,
  QrCode,
  Building2,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface PlayerRewards {
  playerId: string;
  totalPoints: number;
  availablePoints: number;
  totalEarnings: number;
  referralCount: number;
  badges: any[];
  lastUpdated: any;
}

interface ReferralStats {
  playerId: string;
  totalReferrals: number;
  completedReferrals: number;
  totalPointsEarned: number;
  totalEarnings: number;
  monthlyReferrals: { [month: string]: number };
  topReferrers: any[];
}

export default function PlayerReferralsPage() {
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [playerRewards, setPlayerRewards] = useState<PlayerRewards | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinRequests, setJoinRequests] = useState<PlayerJoinRequest[]>([]);

  useEffect(() => {
    if (user?.uid) {
      loadPlayerData();
      loadJoinRequests();
    }
  }, [user]);

  const loadJoinRequests = async () => {
    try {
      const requests = await organizationReferralService.getPlayerJoinRequests(user!.uid);
      setJoinRequests(requests);
    } catch (error) {
      console.error('Error loading join requests:', error);
    }
  };

  const loadPlayerData = async () => {
    try {
      setLoading(true);

      // إنشاء أو جلب نظام مكافآت اللاعب
      const rewards = await referralService.createOrUpdatePlayerRewards(user!.uid);
      setPlayerRewards(rewards);

      // جلب إحصائيات الإحالات
      const stats = await referralService.getPlayerReferralStats(user!.uid);
      setReferralStats(stats);

      // إنشاء كود إحالة إذا لم يكن موجوداً
      if (!referralCode) {
        const code = referralService.generateReferralCode();
        setReferralCode(code);
        await referralService.createReferral(user!.uid, code);
      }

    } catch (error) {
      console.error('خطأ في تحميل بيانات اللاعب:', error);
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
    const messages = referralService.createShareMessages(referralCode, user?.displayName || 'لاعب');
    window.open(messages.whatsapp, '_blank');
  };

  const shareViaSMS = () => {
    const messages = referralService.createShareMessages(referralCode, user?.displayName || 'لاعب');
    window.open(messages.sms, '_blank');
  };

  const shareViaEmail = () => {
    const messages = referralService.createShareMessages(referralCode, user?.displayName || 'لاعب');
    window.open(messages.email, '_blank');
  };

  const getEarningsInEGP = (dollars: number) => {
    return (dollars * POINTS_CONVERSION.DOLLAR_TO_EGP).toFixed(2);
  };

  const getNextBadge = () => {
    if (!playerRewards) return null;

    const currentCount = playerRewards.referralCount;
    const earnedBadgeIds = playerRewards.badges.map(b => b.id);

    for (const badge of BADGES.REFERRAL_BADGES) {
      if (currentCount < badge.requirement && !earnedBadgeIds.includes(badge.id)) {
        return badge;
      }
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">جاري التحميل...</div>
      </div>
    );
  }

  const nextBadge = getNextBadge();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">نظام الإحالات والمكافآت</h1>
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <span className="text-lg font-semibold">نظام المكافآت</span>
        </div>
      </div>

      {/* بطاقة النقاط والإحصائيات */}
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
                <p className="text-3xl font-bold">{playerRewards?.availablePoints.toLocaleString()}</p>
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
                <p className="text-3xl font-bold">${playerRewards?.totalEarnings.toFixed(2)}</p>
                <p className="text-sm text-green-100">≈ {getEarningsInEGP(playerRewards?.totalEarnings || 0)} ج.م</p>
              </div>
              <TrendingUp className="w-8 h-8" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100">اللاعبين المحالين</p>
                <p className="text-3xl font-bold">{playerRewards?.referralCount}</p>
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
                <p className="text-3xl font-bold">{playerRewards?.badges.length}</p>
              </div>
              <Award className="w-8 h-8" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* قسم الانضمام لمنظمة */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Building2 className="w-5 w-5 text-emerald-600" />
                الانضمام لمنظمة
              </span>
              <Button
                onClick={() => setShowJoinModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                انضم الآن
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              انضم إلى أكاديمية أو نادي للحصول على تدريب احترافي ومتابعة مستمرة وفرص أفضل.
            </p>

            {joinRequests.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm mb-2">طلباتك:</h4>
                {joinRequests.slice(0, 3).map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border"
                  >
                    <div>
                      <p className="font-medium text-sm">{request.organizationName}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(request.requestedAt as any).toLocaleDateString('ar')}
                      </p>
                    </div>
                    <Badge
                      className={
                        request.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : request.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                      }
                    >
                      {request.status === 'approved'
                        ? 'مقبول'
                        : request.status === 'pending'
                          ? 'قيد المراجعة'
                          : 'مرفوض'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Join Organization Modal */}
      {user && userData && (
        <JoinOrganizationModal
          playerId={user.uid}
          playerName={userData.full_name || user.displayName || 'اللاعب'}
          isOpen={showJoinModal}
          onClose={() => setShowJoinModal(false)}
          onSuccess={loadJoinRequests}
        />
      )}

      {/* كود الإحالة */}
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
                  {/* هنا يمكن إضافة مكتبة QR Code */}
                  <div className="w-32 h-32 bg-white rounded-lg flex items-center justify-center">
                    <span className="text-xs text-gray-600">QR Code</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* الشارات */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              الشارات المكتسبة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {playerRewards?.badges.map((badge, index) => (
                <div key={badge.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${badge.color}`}>
                    {badge.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold">{badge.name}</h4>
                    <p className="text-sm text-gray-600">{badge.description}</p>
                  </div>
                </div>
              ))}

              {nextBadge && (
                <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl bg-gray-300">
                    {nextBadge.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-600">{nextBadge.name}</h4>
                    <p className="text-sm text-gray-500">
                      تحتاج {nextBadge.requirement - (playerRewards?.referralCount || 0)} إحالة أخرى
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* معلومات المكافآت */}
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
                    <span>إحالة لاعب جديد</span>
                    <Badge variant="secondary">10,000 نقطة</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>مكافأة اللاعب الجديد</span>
                    <Badge variant="secondary">5,000 نقطة</Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-blue-600">📹 الفيديوهات</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>رفع فيديو جديد</span>
                    <Badge variant="secondary">1,000 نقطة</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>إكمال الملف الشخصي</span>
                    <Badge variant="secondary">2,000 نقطة</Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-purple-600">📚 أكاديمية الحلم</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>شراء درس جديد</span>
                    <Badge variant="secondary">2,000 نقطة</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>أول اشتراك</span>
                    <Badge variant="secondary">5,000 نقطة</Badge>
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
