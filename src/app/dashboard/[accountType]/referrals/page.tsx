'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { useParams, useRouter } from 'next/navigation';
import { referralService } from '@/lib/referral/referral-service';
import { POINTS_CONVERSION, BADGES } from '@/types/referral';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { organizationReferralService } from '@/lib/organization/organization-referral-service';
import { getOrganizationDetails } from '@/utils/player-organization';
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
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  MoreVertical,
  ArrowUpRight,
  Percent,
  FileText,
  Gift
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// --- Interfaces & Types ---
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

// Custom Badge Configuration per account type
const ACCOUNT_TYPE_INFO = {
  player: {
    title: 'سفراء الحلم',
    subtitle: 'برنامج سفراء المنصة والمكافآت',
    icon: Trophy,
    gradient: 'from-blue-600 via-indigo-600 to-purple-600',
    accent: 'blue',
    referralLabel: 'اللاعبين المحالين',
    referralIcon: Users,
    bgLight: 'bg-blue-50/50'
  },
  club: {
    title: 'سفراء الحلم - الأندية',
    subtitle: 'إدارة الانتساب والنمو الرياضي',
    icon: Building,
    gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
    accent: 'emerald',
    referralLabel: 'اللاعبين المنتسبين',
    referralIcon: Users,
    bgLight: 'bg-emerald-50/50'
  },
  academy: {
    title: 'سفراء الحلم - الأكاديميات',
    subtitle: 'إدارة المواهب والانتساب للأكاديمية',
    icon: GraduationCap,
    gradient: 'from-indigo-600 via-blue-600 to-emerald-600',
    accent: 'indigo',
    referralLabel: 'المواهب المسجلة',
    referralIcon: Users,
    bgLight: 'bg-indigo-50/50'
  },
  trainer: {
    title: 'سفراء الحلم - المدربين',
    subtitle: 'برنامج المدرب السفير والمكافآت',
    icon: Target,
    gradient: 'from-pink-600 via-rose-600 to-orange-600',
    accent: 'pink',
    referralLabel: 'المتدربين المحالين',
    referralIcon: Users,
    bgLight: 'bg-pink-50/50'
  }
};

export default function EnhancedReferralsPage() {
  const { user, userData } = useAuth();
  const params = useParams();
  const router = useRouter();
  const accountType = params.accountType as string;

  const [loading, setLoading] = useState(true);
  const [playerRewards, setPlayerRewards] = useState<PlayerRewards | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const [showQR, setShowQR] = useState(false);

  // Organization State
  const [organizationReferrals, setOrganizationReferrals] = useState<OrganizationReferral[]>([]);
  const [joinRequests, setJoinRequests] = useState<PlayerJoinRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [newCodeName, setNewCodeName] = useState('');
  const [isCreatingCode, setIsCreatingCode] = useState(false);

  const config = (ACCOUNT_TYPE_INFO[accountType as keyof typeof ACCOUNT_TYPE_INFO] || ACCOUNT_TYPE_INFO.player) as any;
  const MainIcon = config.icon;

  useEffect(() => {
    if (user?.uid) {
      loadInitialData();
    }
  }, [user]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadRewardsAndStats(),
        accountType !== 'player' ? loadOrganizationData() : loadPlayerOnlyData()
      ]);
    } catch (err) {
      console.error('Initial load error:', err);
      toast.error('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const loadRewardsAndStats = async () => {
    const rewards = await referralService.createOrUpdatePlayerRewards(user!.uid);
    setPlayerRewards(rewards);
    const stats = await referralService.getPlayerReferralStats(user!.uid);
    setReferralStats(stats);

    // Check/Generate personal code
    const codes = await referralService.getUserReferralCodes(user!.uid);
    if (codes && codes.length > 0) {
      setReferralCode(codes[0].referralCode);
    } else {
      const newCode = referralService.generateReferralCode();
      setReferralCode(newCode);
      await referralService.createReferral(user!.uid, newCode);
    }
  };

  const loadOrganizationData = async () => {
    const [referrals, requests] = await Promise.all([
      organizationReferralService.getOrganizationReferrals(user!.uid),
      organizationReferralService.getOrganizationJoinRequests(user!.uid)
    ]);
    setOrganizationReferrals(referrals);
    setJoinRequests(requests);
  };

  const loadPlayerOnlyData = async () => {
    const requests = await organizationReferralService.getPlayerJoinRequests(user!.uid);
    setJoinRequests(requests);
  };

  // --- Actions ---

  const handleCreateCode = async () => {
    try {
      setIsCreatingCode(true);
      let orgName = userData?.full_name || userData?.name || 'المنظمة';
      // Specific org names
      if (accountType === 'club') orgName = userData?.club_name || orgName;
      if (accountType === 'academy') orgName = userData?.academy_name || orgName;

      await organizationReferralService.createOrganizationReferral(
        user!.uid,
        accountType,
        orgName,
        {
          description: newCodeName.trim() || undefined
        }
      );
      toast.success('تم إنشاء كود إحالة سفير بنجاح');
      setNewCodeName('');
      loadOrganizationData();
    } catch (err) {
      toast.error('فشل في إنشاء الكود');
    } finally {
      setIsCreatingCode(false);
    }
  };

  const toggleCodeStatus = async (ref: OrganizationReferral) => {
    try {
      await organizationReferralService.updateOrganizationReferral(ref.id, user!.uid, {
        isActive: !ref.isActive
      });
      toast.success(ref.isActive ? 'تم تعطيل الكود' : 'تم تفعيل الكود');
      loadOrganizationData();
    } catch (err) {
      toast.error('حدث خطأ');
    }
  };

  const handleProcessRequest = async (requestId: string, approve: boolean) => {
    try {
      if (approve) {
        await organizationReferralService.approveJoinRequest(requestId, user!.uid, userData?.full_name || 'المنظمة');
        toast.success('تم قبول انضمام اللاعب');
      } else {
        await organizationReferralService.rejectJoinRequest(requestId, user!.uid, userData?.full_name || 'المنظمة');
        toast.error('تم رفض الطلب');
      }
      loadOrganizationData();
    } catch (err) {
      toast.error('تعذر معالجة الطلب');
    }
  };

  // --- Helpers ---

  const filteredRequests = useMemo(() => {
    return joinRequests.filter(req =>
      req.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.playerEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [joinRequests, searchTerm]);

  const copyToClipboard = (text: string, msg = 'تم النسخ بنجاح') => {
    navigator.clipboard.writeText(text);
    toast.success(msg);
  };

  const shareViaWhatsApp = (code: string, isOrg = false) => {
    let message = '';
    if (isOrg) {
      const orgName = userData?.academy_name || userData?.club_name || userData?.full_name || 'المنظمة';

      // Determine account type label
      let typeLabel = 'منظمة';
      if (accountType === 'academy') typeLabel = 'أكاديمية';
      else if (accountType === 'club') typeLabel = 'نادي';
      else if (accountType === 'trainer') typeLabel = 'مدرب';
      else if (accountType === 'agent') typeLabel = 'وكيل';

      message = `انضم إلى *${typeLabel} ${orgName}* على منصة الحلم!\n\nاستخدم كود الانضمام المميز: *${code}*\n(يرجى كتابة الكود في خانة "كود المنظمة" أثناء التسجيل لربط حسابك مباشرة)\n\nسجل الآن عبر الرابط التالي:\nhttps://el7lm.com/auth/register`;
    } else {
      message = `انضم لمنصة الحلم وسجل مهاراتك الرياضية!\nاستخدم كودي الخاص للحصول على مكافأة: *${code}*\nالرابط: https://el7lm.com`;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">مقبول</Badge>;
      case 'pending': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200">قيد المراجعة</Badge>;
      case 'rejected': return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-200">مرفوض</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: any) => {
    if (!date) return '-';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-t-transparent border-indigo-600 animate-spin" />
          <div className="absolute inset-2 rounded-full border-4 border-b-transparent border-emerald-500 animate-spin-reverse" />
        </div>
        <p className="text-gray-500 font-medium animate-pulse">جاري تحميل بيانات الشراكة...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 pb-12">
      {/* --- Page Header --- */}
      <header className="relative overflow-hidden rounded-3xl p-8 md:p-12 text-white">
        <div className={cn("absolute inset-0 opacity-90 bg-gradient-to-br", config.gradient)} />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                <MainIcon className="w-8 h-8 text-white" />
              </div>
              <Badge className="bg-white/20 text-white hover:bg-white/30 border-none backdrop-blur-md">
                برنامج النخبة
              </Badge>
            </div>
            <h1 className="text-3xl md:text-5xl font-black">{config.title}</h1>
            <p className="text-white/80 text-lg font-medium max-w-xl">
              {config.subtitle} - قم بدعوة المواهب، ابنِ فريقك، واربح مكافآت حصرية مقابل كل انضمام ناجح.
            </p>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="text-right">
              <p className="text-white/70 text-sm font-bold uppercase tracking-wider">الرصيد القابل للسحب</p>
              <div className="flex items-center gap-2">
                <span className="text-4xl md:text-6xl font-black">${playerRewards?.totalEarnings.toFixed(0)}</span>
                <div className="flex flex-col">
                  <span className="text-xs text-white/60 font-medium">دولار أمريكي</span>
                  <span className="text-sm font-bold text-emerald-300">≈ {Number(playerRewards?.totalEarnings || 0) * 50} ج.م</span>
                </div>
              </div>
            </div>
            <Button className="bg-white text-indigo-700 hover:bg-indigo-50 font-bold rounded-2xl h-12 px-8 shadow-xl">
              <ArrowUpRight className="w-4 h-4 mr-2" />
              طلب سحب الأرباح
            </Button>
          </div>
        </div>
      </header>

      {/* --- Stats Grid --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'النقاط الإجمالية', value: playerRewards?.availablePoints.toLocaleString(), icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: config.referralLabel, value: playerRewards?.referralCount, icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50' },
          { label: 'طلبات جديدة', value: joinRequests.filter(r => r.status === 'pending').length, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' },
          { label: 'مستوى الانتشار', value: '84%', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' }
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="border-none shadow-sm h-full hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-bold mb-1">{stat.label}</p>
                  <p className="text-2xl font-black text-gray-900">{stat.value}</p>
                </div>
                <div className={cn("p-4 rounded-2xl", stat.bg)}>
                  <stat.icon className={cn("w-6 h-6", stat.color)} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* --- Tabs Section --- */}
      <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <TabsList className="bg-gray-100 p-1 rounded-2xl h-14">
            <TabsTrigger value="overview" className="rounded-xl px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">نظرة عامة</TabsTrigger>
            {accountType !== 'player' && (
              <TabsTrigger value="links" className="rounded-xl px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">أكواد المنظمة</TabsTrigger>
            )}
            <TabsTrigger value="requests" className="rounded-xl px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">طلبات الانضمام</TabsTrigger>
            {accountType !== 'player' && (
              <TabsTrigger value="affiliations" className="rounded-xl px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">اللاعبين المسجلين</TabsTrigger>
            )}
          </TabsList>

          {activeTab === 'links' && (
            <Button onClick={handleCreateCode} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 shadow-lg shadow-indigo-200">
              <Plus className="w-4 h-4 mr-2" />
              توليد كود إحالة جديد
            </Button>
          )}

          {activeTab === 'requests' && (
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="بحث عن لاعب..."
                className="pl-10 rounded-xl h-12 bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* --- Overview Tab --- */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* My Personal Referral Code */}
            <Card className="lg:col-span-2 border-none shadow-sm bg-gradient-to-br from-indigo-50 to-blue-50 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Users className="w-32 h-32" />
              </div>
              <CardContent className="p-8 space-y-6">
                <div>
                  <h3 className="text-2xl font-black text-indigo-900 mb-2">كود الإحالة الشخصي</h3>
                  <p className="text-indigo-700/70 font-medium">شارك كودك مع اللاعبين والزملاء واكسب 10,000 نقطة عن كل اشتراك جديد.</p>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 bg-white rounded-2xl p-4 border-2 border-indigo-100 flex items-center justify-between shadow-sm">
                    <span className="text-2xl font-black tracking-widest text-indigo-600 font-mono">{referralCode}</span>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(referralCode)} className="text-indigo-400 hover:text-indigo-600">
                      <Copy className="w-5 h-5" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => shareViaWhatsApp(referralCode)} className="bg-emerald-600 hover:bg-emerald-700 rounded-2xl h-full px-6 text-white font-bold">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      مشاركة واتساب
                    </Button>
                    <Button variant="outline" onClick={() => setShowQR(!showQR)} className="bg-white border-none rounded-2xl h-full aspect-square shadow-sm">
                      <QrCode className="w-5 h-5 text-indigo-600" />
                    </Button>
                  </div>
                </div>

                {showQR && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex justify-center p-6 bg-white rounded-3xl">
                    <div className="text-center space-y-2">
                      <div className="w-40 h-40 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-200">
                        <span className="text-xs text-gray-400">QR CODE HERE</span>
                      </div>
                      <p className="text-sm font-bold text-gray-400">امسح الكود للتسجيل فوراً</p>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {/* Badges Progress */}
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600" />
                  المسار والترقي
                </CardTitle>
                <CardDescription>ارتقِ بتقييمك وافتح ميزات جديدة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  {BADGES.REFERRAL_BADGES.slice(0, 3).map((badge, i) => {
                    const isEarned = playerRewards?.badges.some(b => b.id === badge.id);
                    return (
                      <div key={badge.id} className={cn("flex items-center gap-4 p-3 rounded-2xl border transition-all", isEarned ? "bg-indigo-50/50 border-indigo-100" : "bg-gray-50 border-transparent opacity-60")}>
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm", badge.color)}>
                          {badge.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 leading-none mb-1">{badge.name}</h4>
                          <p className="text-xs text-gray-500">{badge.description}</p>
                        </div>
                        {isEarned && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                      </div>
                    )
                  })}
                </div>
                <Button variant="ghost" className="w-full text-sm font-bold text-indigo-600" onClick={() => setActiveTab('badges')}>
                  تصفح كافة الشارات
                  <ChevronRight className="w-4 h-4 ml-1 rotate-180" />
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">كيفية الربح؟</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { title: "الإحالة المباشرة", points: "10,000", desc: "عن كل لاعب يشترك عبر رابطك الشخصي", icon: Target, color: "bg-blue-50 text-blue-600" },
                  { title: "مكافأة التسجيل", points: "5,000", desc: "نقاط ترحيبية للاعب المحال فور تفعيل حسابه", icon: Gift, color: "bg-emerald-50 text-emerald-600" },
                  { title: "الربح السنوي", points: "20,000", desc: "مكافأة إضافية عند تجديد اللاعب لاشتراكه", icon: Crown, color: "bg-amber-50 text-amber-600" }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
                    <div className={cn("p-3 rounded-xl", item.color)}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900">{item.title}</h4>
                        <span className="text-xs font-black text-gray-400 px-2 py-0.5 bg-gray-100 rounded-full">{item.points} نقطة</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-indigo-600 text-white">
              <CardContent className="p-8 flex flex-col justify-between h-full space-y-8">
                <div className="space-y-4">
                  <h3 className="text-2xl font-black">تحويل النقاط إلى كاش</h3>
                  <p className="text-indigo-100/80 font-medium leading-relaxed">
                    عند وصول رصيدك إلى الحد الأدنى (50,000 نقطة)، يمكنك تحويلها مباشرة إلى رصيد مالي في محفظتك الإلكترونية أو عبر PayPal.
                  </p>
                </div>
                <div className="p-6 bg-white/10 rounded-3xl backdrop-blur-sm border border-white/10">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-indigo-200 text-xs font-bold uppercase mb-1">التقدم نحو السحب القادم</p>
                      <p className="text-2xl font-black">{(playerRewards?.availablePoints || 0) / 500}% مكتمل</p>
                    </div>
                    <Percent className="w-8 h-8 text-white/30" />
                  </div>
                  <div className="w-full h-2 bg-white/20 rounded-full mt-4 overflow-hidden">
                    <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (playerRewards?.availablePoints || 0) / 500)}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* --- Links Tab (Organization Only) --- */}
        <TabsContent value="links" className="space-y-6">
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-gray-50 pb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-black flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-indigo-600" />
                    إدارة أكواد السفراء (سفراء الحلم)
                  </CardTitle>
                  <CardDescription>قم بإنشاء وتتبع أكواد الإحالة الخاصة بمؤسستك.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Input
                    placeholder="اسم السفير أو اسم الحملة (مثال: كابتن أحمد - حملة الصيف)"
                    className="h-12 rounded-xl bg-gray-50 border-gray-100 pl-12"
                    value={newCodeName}
                    onChange={(e) => setNewCodeName(e.target.value)}
                  />
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                <Button
                  onClick={handleCreateCode}
                  disabled={isCreatingCode}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 px-8 font-bold shadow-lg shadow-indigo-100 shrink-0"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {isCreatingCode ? 'جاري الإنشاء...' : 'إنشاء كود سفير جديد'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {organizationReferrals.length === 0 ? (
            <div className="p-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900">لا توجد أكواد حالياً</h3>
              <p className="text-gray-500 max-w-sm mx-auto mb-8">ابدأ الآن بإنشاء كودك الأول وابدأ في دعوة اللاعبين لمنظمتك.</p>
            </div>
          ) : (
            <Card className="border-none shadow-sm overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 text-gray-500 text-[10px] font-black uppercase tracking-wider border-b border-gray-100">
                      <th className="px-6 py-4">اسم السفير / الوصف</th>
                      <th className="px-6 py-4">كود الإحالة</th>
                      <th className="px-6 py-4">إحصائيات الاستخدام</th>
                      <th className="px-6 py-4">معدل التحويل</th>
                      <th className="px-6 py-4 text-center">الحالة</th>
                      <th className="px-6 py-4 text-left">العمليات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <AnimatePresence mode="popLayout">
                      {organizationReferrals.map((ref, i) => (
                        <motion.tr
                          key={ref.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={cn(
                            "group transition-colors hover:bg-gray-50/50",
                            !ref.isActive && "opacity-60 grayscale-[0.5]"
                          )}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center font-black",
                                ref.isActive ? "bg-indigo-50 text-indigo-600" : "bg-gray-100 text-gray-400"
                              )}>
                                {ref.description?.charAt(0) || <Target className="w-5 h-5" />}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-900 leading-tight">
                                  {ref.description || 'كود سفير غير مسمى'}
                                </span>
                                <span className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                                  معرف: {ref.id.slice(0, 8)}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 group/code">
                              <Badge variant="outline" className="font-mono text-sm tracking-widest border-indigo-100 text-indigo-700 bg-indigo-50/30 px-3 py-1">
                                {ref.referralCode}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-400 hover:text-indigo-600 opacity-0 group-hover/code:opacity-100 transition-opacity"
                                onClick={() => copyToClipboard(ref.referralCode)}
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1.5 w-32">
                              <div className="flex justify-between items-end text-[10px] font-black uppercase">
                                <span className="text-gray-400">الاستخدام</span>
                                <span className="text-gray-900">{ref.currentUsage} / {ref.maxUsage || '∞'}</span>
                              </div>
                              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(100, (ref.currentUsage / (ref.maxUsage || 100)) * 100)}%` }}
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    ref.isActive ? "bg-indigo-600" : "bg-gray-400"
                                  )}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <TrendingUp className={cn("w-4 h-4", ref.isActive ? "text-emerald-500" : "text-gray-400")} />
                              <span className="text-lg font-black text-gray-900">
                                {((ref.currentUsage / (ref.maxUsage || 100)) * 100).toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "rounded-full px-4 h-8 font-bold text-xs",
                                ref.isActive
                                  ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                              )}
                              onClick={() => toggleCodeStatus(ref)}
                            >
                              {ref.isActive ? (
                                <><CheckCircle2 className="w-3 h-3 mr-1.5" /> نشط</>
                              ) : (
                                <><XCircle className="w-3 h-3 mr-1.5" /> معطل</>
                              )}
                            </Button>
                          </td>
                          <td className="px-6 py-4 text-left">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                className="bg-gray-900 hover:bg-black text-white font-bold h-9 rounded-xl px-4"
                                onClick={() => shareViaWhatsApp(ref.referralCode, true)}
                              >
                                <Share2 className="w-4 h-4 mr-2" />
                                مشاركة
                              </Button>
                              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-gray-100">
                                <MoreVertical className="w-4 h-4 text-gray-400" />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* --- Requests Tab --- */}
        <TabsContent value="requests" className="space-y-4">
          <Card className="border-none shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 text-gray-500 text-xs font-black uppercase tracking-wider">
                    <th className="px-6 py-4">اللاعب</th>
                    <th className="px-6 py-4">المركز / التميز</th>
                    <th className="px-6 py-4">تاريخ الطلب</th>
                    <th className="px-6 py-4">الحالة</th>
                    <th className="px-6 py-4 text-left">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRequests.map((req, i) => (
                    <tr key={req.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-white shadow-sm flex items-center justify-center font-bold text-gray-400">
                            {req.playerName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{req.playerName}</p>
                            <p className="text-xs text-gray-400 font-medium">{req.playerEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Badge variant="secondary" className="rounded-full bg-indigo-50 text-indigo-600 border-none font-bold">
                          {req.playerData?.position || 'غير محدد'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-500">
                        {formatDate(req.requestedAt)}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(req.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-start gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {req.status === 'pending' ? (
                            <>
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-9" onClick={() => handleProcessRequest(req.id, true)}>قبول</Button>
                              <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50 rounded-lg h-9" onClick={() => handleProcessRequest(req.id, false)}>رفض</Button>
                            </>
                          ) : (
                            <Button variant="ghost" size="sm" className="rounded-lg">
                              <FileText className="w-4 h-4 mr-2" />
                              التفاصيل
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredRequests.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-medium">
                        لا توجد طلبات مطابقة للبحث
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* --- Affiliations Tab (Organization Only) --- */}
        <TabsContent value="affiliations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {joinRequests.filter(r => r.status === 'approved').map((req, i) => (
              <Card key={req.id} className="border-none shadow-sm hover:shadow-md transition-all overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="rounded-full bg-white/50 backdrop-blur-sm">
                    <MoreVertical className="w-4 h-4 text-gray-500" />
                  </Button>
                </div>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-2xl font-black text-indigo-300">
                      {req.playerName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900 text-lg">{req.playerName}</h4>
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        لاعب مثبت
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 py-2 border-y border-gray-100">
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-400 font-black uppercase">المركز</p>
                      <p className="text-sm font-bold text-gray-700">{req.playerData?.position || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-400 font-black uppercase">عضو منذ</p>
                      <p className="text-sm font-bold text-gray-700">{formatDate(req.processedAt || req.requestedAt)}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1 bg-white border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 rounded-xl h-10 font-bold"
                      onClick={() => router.push(`/dashboard/player/search/profile/player/${req.playerId}`)}
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-2" />
                      عرض الملف
                    </Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 w-10 flex items-center justify-center">
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {joinRequests.filter(r => r.status === 'approved').length === 0 && (
              <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">لم يتم قبول أي لاعبين بعد.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* --- Footer Tips --- */}
      <footer className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 border-t border-gray-100">
        {[
          { title: "توسيع الشبكة", desc: "كلما شاركت كودك في مجموعات رياضية متخصصة، زادت فرصك في استقطاب مواهب حقيقية.", icon: Users },
          { title: "الأمان والخصوصية", desc: "نظام إحالة الحلم مشفر بالكامل ويضمن وصول المكافآت لمستحقيها بآلية دقيقة.", icon: Shield },
          { title: "قواعد المكافآت", desc: "تخضع المكافآت لشروط الاستخدام، ويتم تدقيق كل حالة انضمام لضمان الجودة.", icon: FileText }
        ].map((tip, i) => (
          <div key={i} className="flex gap-4">
            <div className="p-3 h-fit bg-gray-50 rounded-xl">
              <tip.icon className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <h5 className="font-bold text-gray-900 mb-1">{tip.title}</h5>
              <p className="text-sm text-gray-500 leading-relaxed">{tip.desc}</p>
            </div>
          </div>
        ))}
      </footer>
    </div>
  );
}

function getAccountTypeLabel(type: string) {
  const labels: any = {
    player: 'لاعب',
    club: 'نادي',
    academy: 'أكاديمية',
    trainer: 'مدرب',
    agent: 'وكيل'
  };
  return labels[type] || 'مستخدم';
}
