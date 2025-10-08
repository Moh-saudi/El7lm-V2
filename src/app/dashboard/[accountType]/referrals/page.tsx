'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { useParams } from 'next/navigation';
import { referralService } from '@/lib/referral/referral-service';
import { POINTS_CONVERSION, BADGES } from '@/types/referral';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { organizationReferralService } from '@/lib/organization/organization-referral-service';
import { OrganizationReferral, PlayerJoinRequest } from '@/types/organization-referral';
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
  Building,
  GraduationCap,
  Briefcase,
  Shield,
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

// معلومات أنواع الحسابات
const ACCOUNT_TYPE_INFO = {
  player: {
    title: 'نظام الإحالات والمكافآت',
    subtitle: 'نظام المكافآت',
    icon: Trophy,
    color: 'from-blue-500 to-blue-600',
    referralLabel: 'اللاعبين المحالين',
    referralIcon: Users,
    referralColor: 'from-purple-500 to-purple-600'
  },
  club: {
    title: 'نظام الإحالات والمكافآت',
    subtitle: 'نظام المكافآت',
    icon: Building,
    color: 'from-green-500 to-green-600',
    referralLabel: 'اللاعبين المحالين',
    referralIcon: Users,
    referralColor: 'from-purple-500 to-purple-600'
  },
  admin: {
    title: 'نظام الإحالات والمكافآت',
    subtitle: 'نظام المكافآت',
    icon: Shield,
    color: 'from-red-500 to-red-600',
    referralLabel: 'المستخدمين المحالين',
    referralIcon: Users,
    referralColor: 'from-purple-500 to-purple-600'
  },
  agent: {
    title: 'نظام الإحالات والمكافآت',
    subtitle: 'نظام المكافآت',
    icon: Briefcase,
    color: 'from-orange-500 to-orange-600',
    referralLabel: 'العملاء المحالين',
    referralIcon: Users,
    referralColor: 'from-purple-500 to-purple-600'
  },
  academy: {
    title: 'نظام الإحالات والمكافآت',
    subtitle: 'نظام المكافآت',
    icon: GraduationCap,
    color: 'from-indigo-500 to-indigo-600',
    referralLabel: 'الطلاب المحالين',
    referralIcon: Users,
    referralColor: 'from-purple-500 to-purple-600'
  },
  trainer: {
    title: 'نظام الإحالات والمكافآت',
    subtitle: 'نظام المكافآت',
    icon: Target,
    color: 'from-pink-500 to-pink-600',
    referralLabel: 'اللاعبين المحالين',
    referralIcon: Users,
    referralColor: 'from-purple-500 to-purple-600'
  }
};

export default function SharedReferralsPage() {
  const { user, userData } = useAuth();
  const params = useParams();
  const accountType = params.accountType as string;

  const [loading, setLoading] = useState(true);
  const [playerRewards, setPlayerRewards] = useState<PlayerRewards | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const [showQR, setShowQR] = useState(false);
  // Organization referrals & join requests (for non-player accounts)
  const [organizationReferrals, setOrganizationReferrals] = useState<OrganizationReferral[]>([]);
  const [joinRequests, setJoinRequests] = useState<PlayerJoinRequest[]>([]);

  const accountInfo = ACCOUNT_TYPE_INFO[accountType as keyof typeof ACCOUNT_TYPE_INFO] || ACCOUNT_TYPE_INFO.player;
  const IconComponent = accountInfo.icon;

  useEffect(() => {
    if (user?.uid) {
      loadPlayerData();
      if (accountType !== 'player') {
        loadOrganizationReferrals();
        loadJoinRequests();
      }
    }
  }, [user]);

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

  // Organization: load referrals
  const loadOrganizationReferrals = async () => {
    try {
      const referrals = await organizationReferralService.getOrganizationReferrals(user!.uid);
      setOrganizationReferrals(referrals);
    } catch (err) {
      console.error('خطأ في تحميل أكواد الإحالة:', err);
    }
  };

  // Organization: load join requests
  const loadJoinRequests = async () => {
    try {
      const requests = await organizationReferralService.getOrganizationJoinRequests(user!.uid);
      setJoinRequests(requests);
    } catch (err) {
      console.error('خطأ في تحميل طلبات الانضمام:', err);
    }
  };

  // Organization: create new referral
  const createNewReferralCode = async () => {
    try {
      await organizationReferralService.createOrganizationReferral(
        user!.uid,
        (userData as any)?.accountType,
        (userData as any)?.full_name || 'المنظمة'
      );
      toast.success('تم إنشاء كود إحالة جديد');
      loadOrganizationReferrals();
    } catch (err) {
      console.error('فشل في إنشاء كود الإحالة', err);
      toast.error('فشل في إنشاء كود الإحالة');
    }
  };

  const updateReferral = async (ref: OrganizationReferral, updates: Partial<OrganizationReferral>) => {
    try {
      const res = await fetch('/api/organization-referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_referral',
          referralId: ref.id,
          organizationId: user!.uid,
          updates: {
            referralCode: updates.referralCode,
            isActive: updates.isActive,
            maxUsage: updates.maxUsage,
            description: updates.description,
            expiresAt: updates.expiresAt as any
          }
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'فشل التحديث');
      toast.success('تم تحديث كود الإحالة');
      await loadOrganizationReferrals();
    } catch (e) {
      console.error(e);
      toast.error('تعذر تحديث كود الإحالة');
    }
  };

  const approveJoin = async (requestId: string) => {
    try {
      await organizationReferralService.approveJoinRequest(
        requestId,
        user!.uid,
        (userData as any)?.full_name || 'المنظمة'
      );
      toast.success('تم قبول اللاعب بنجاح');
      await loadJoinRequests();
    } catch (err) {
      console.error('فشل في قبول اللاعب', err);
      toast.error('فشل في قبول اللاعب');
    }
  };

  const rejectJoin = async (requestId: string) => {
    try {
      await organizationReferralService.rejectJoinRequest(
        requestId,
        user!.uid,
        (userData as any)?.full_name || 'المنظمة',
        'تم الرفض'
      );
      toast.success('تم رفض الطلب');
      await loadJoinRequests();
    } catch (err) {
      console.error('فشل في رفض الطلب', err);
      toast.error('فشل في رفض الطلب');
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
    const messages = referralService.createShareMessages(referralCode, user?.displayName || 'مستخدم');
    window.open(messages.whatsapp, '_blank');
  };

  const shareViaSMS = () => {
    const messages = referralService.createShareMessages(referralCode, user?.displayName || 'مستخدم');
    window.open(messages.sms, '_blank');
  };

  const shareViaEmail = () => {
    const messages = referralService.createShareMessages(referralCode, user?.displayName || 'مستخدم');
    window.open(messages.email, '_blank');
  };

  const getEarningsInEGP = (dollars: number) => {
    return (dollars * POINTS_CONVERSION.DOLLAR_TO_EGP).toFixed(2);
  };

  const formatDateSafe = (value: any): string => {
    try {
      if (!value) return 'غير محدد';
      if (typeof value === 'object' && typeof value.toDate === 'function') {
        return value.toDate().toLocaleDateString('ar');
      }
      const d = new Date(value);
      if (isNaN(d.getTime())) return 'غير محدد';
      return d.toLocaleDateString('ar');
    } catch {
      return 'غير محدد';
    }
  };

  const shareOrgLinkWhatsApp = (referralCode: string, orgName?: string) => {
    try {
      const resolvedOrgName = (orgName && orgName.trim()) || ((userData as any)?.full_name && String((userData as any)?.full_name).trim()) || 'المنظمة';
      const displayOrg = `*${resolvedOrgName}*`;
      const message = `⚽ انضم لفريق ${displayOrg} على منصة الحلم\n🎯 هدفنا: تسويق وبيع اللاعبين للأندية المحلية والدولية بالتعاون مع شركة ميسك القطرية\n- ادخل كود الانضمام: *${referralCode}*\n- سجّل بياناتك هنا:\nhttps://www.el7lm.com/auth/register`;
      const text = encodeURIComponent(message);
      window.open(`https://wa.me/?text=${text}`, '_blank');
    } catch (e) {
      toast.error('تعذر فتح واتساب');
    }
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
        <h1 className="text-3xl font-bold text-gray-900">{accountInfo.title}</h1>
        <div className="flex items-center gap-2">
          <IconComponent className="w-6 h-6 text-yellow-500" />
          <span className="text-lg font-semibold">{accountInfo.subtitle}</span>
        </div>
      </div>

      {/* بطاقة النقاط والإحصائيات */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <Card className={`bg-gradient-to-r ${accountInfo.color} text-white`}>
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

        <Card className={`bg-gradient-to-r ${accountInfo.referralColor} text-white`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100">{accountInfo.referralLabel}</p>
                <p className="text-3xl font-bold">{playerRewards?.referralCount}</p>
              </div>
              <accountInfo.referralIcon className="w-8 h-8" />
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

      {/* قسم أكواد الإحالة للمنظمة وطلبات الانضمام - يظهر لغير اللاعبين */}
      {accountType !== 'player' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">أكواد الإحالة</h2>
              <Button onClick={createNewReferralCode} className="bg-purple-600 hover:bg-purple-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                إنشاء كود جديد
              </Button>
            </div>
            <div className="grid gap-4">
              {organizationReferrals.map((referral) => (
                <div key={referral.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        defaultValue={referral.referralCode}
                        onBlur={(e) => {
                          const val = e.target.value.trim();
                          if (val && val !== referral.referralCode) {
                            updateReferral(referral, { referralCode: val });
                          }
                        }}
                        className="font-mono text-lg px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-purple-500"
                        title="تغيير كود الإحالة"
                      />
                      <Badge variant="outline" className="text-xs">استخدم {referral.currentUsage} / {referral.maxUsage ?? '∞'}</Badge>
                    </div>
                    {referral.isActive ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">
                        نشط
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-600 border border-gray-200">
                        غير نشط
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{referral.description}</p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <label className="text-xs">الحد الأقصى:</label>
                      <input
                        type="number"
                        min={0}
                        defaultValue={referral.maxUsage ?? 0}
                        onBlur={(e) => {
                          const max = parseInt(e.target.value || '0');
                          if ((referral.maxUsage ?? 0) !== max) updateReferral(referral, { maxUsage: max });
                        }}
                        className="w-24 px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-purple-500"
                        title="تحديد حد الاستخدام"
                      />
                      <Button
                        size="sm"
                        className={`${referral.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white`}
                        onClick={() => updateReferral(referral, { isActive: !referral.isActive })}
                      >
                        {referral.isActive ? 'تعطيل' : 'تفعيل'}
                      </Button>
                    </div>
                    <span>تم الإنشاء: {formatDateSafe(referral.createdAt)}</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-purple-300 text-purple-700 hover:bg-purple-50"
                      onClick={() => navigator.clipboard.writeText(referral.referralCode).then(() => toast.success('تم نسخ الكود'))}
                    >
                      نسخ الكود
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-purple-300 text-purple-700 hover:bg-purple-50"
                      onClick={() => navigator.clipboard.writeText(referral.inviteLink).then(() => toast.success('تم نسخ الرابط'))}
                    >
                      نسخ الرابط
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => shareOrgLinkWhatsApp(referral.referralCode, referral.organizationName)}
                    >
                      مشاركة واتساب
                    </Button>
                  </div>
                </div>
              ))}
              {organizationReferrals.length === 0 && (
                <p className="text-center text-gray-500 py-8">لا توجد أكواد إحالة حالياً</p>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold mb-6">طلبات الانضمام</h2>
            <div className="space-y-4">
              {joinRequests.filter(r => r.status === 'pending').map((request) => (
                <div key={request.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{request.playerName}</h3>
                    <Badge className="bg-amber-100 text-amber-700 border border-amber-200">في الانتظار</Badge>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>📧 {request.playerEmail}</p>
                    {request.playerPhone && <p>📱 {request.playerPhone}</p>}
                    {request.playerData?.position && <p>⚽ المركز: {request.playerData.position}</p>}
                    {request.playerData?.age && <p>🎂 العمر: {request.playerData.age}</p>}
                    <p>📅 طلب الانضمام: {new Date(request.requestedAt as any).toLocaleDateString('ar')}</p>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => approveJoin(request.id)}>✅ قبول</Button>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => rejectJoin(request.id)}>❌ رفض</Button>
                  </div>
                </div>
              ))}
              {joinRequests.filter(r => r.status === 'pending').length === 0 && (
                <p className="text-center text-gray-500 py-8">لا توجد طلبات انضمام في الانتظار</p>
              )}
            </div>
          </Card>
        </div>
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
                    <span>إحالة {getAccountTypeLabel(accountType)} جديد</span>
                    <Badge variant="secondary">10,000 نقطة</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>مكافأة {getAccountTypeLabel(accountType)} الجديد</span>
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

// دالة مساعدة للحصول على اسم نوع الحساب
function getAccountTypeLabel(accountType: string): string {
  const labels = {
    player: 'لاعب',
    club: 'نادي',
    admin: 'مدير',
    agent: 'وكيل',
    academy: 'أكاديمية',
    trainer: 'مدرب'
  };

  return labels[accountType as keyof typeof labels] || 'مستخدم';
}

