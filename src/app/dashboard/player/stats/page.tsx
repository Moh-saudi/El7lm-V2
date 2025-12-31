'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from '@/lib/firebase/auth-provider';
import { db } from '@/lib/firebase/config';
import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import {
  Zap,
  Target,
  TrendingUp,
  Shield,
  Activity,
  BrainCircuit,
  Award,
  Video,
  Clock,
  ChevronRight,
  Info,
  Sparkles,
  ArrowUpRight,
  Gauge
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// --- Components ---

const FIFAStyledCard = ({ rating, playerName, position, stats }: { rating: number, playerName: string, position: string, stats: any }) => (
  <motion.div
    initial={{ rotateY: 30, opacity: 0 }}
    animate={{ rotateY: 0, opacity: 1 }}
    className="relative w-full max-w-[280px] aspect-[2/3] mx-auto group cursor-pointer"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-yellow-200 to-yellow-500 rounded-[2rem] shadow-2xl overflow-hidden transform group-hover:scale-105 transition-transform duration-500">
      {/* Glossy Overlay */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-white/20 to-transparent"></div>

      {/* Texture */}
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>

      {/* Content */}
      <div className="relative h-full p-6 flex flex-col items-center">
        {/* Rating & Position */}
        <div className="absolute left-6 top-10 flex flex-col items-center">
          <div className="text-5xl font-black text-slate-900 leading-none">{rating || 0}</div>
          <div className="text-lg font-bold text-slate-800 uppercase mt-1">{position || 'ST'}</div>
        </div>

        {/* Player Image Placeholder (Future: Profile Pic) */}
        <div className="w-32 h-32 bg-slate-200/50 rounded-full mt-8 border-4 border-white/30 flex items-center justify-center">
          <Zap className="w-16 h-16 text-yellow-600 opacity-30" />
        </div>

        {/* Name */}
        <div className="mt-6 w-full text-center border-b-2 border-slate-900/5 pb-2">
          <div className="text-xl font-black text-slate-900 truncate">{playerName}</div>
        </div>

        {/* Mini Stats */}
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 w-full px-2">
          <StatPair label="PAC" value={stats.speed} />
          <StatPair label="SHO" value={stats.shooting} />
          <StatPair label="PAS" value={stats.passing} />
          <StatPair label="DRI" value={stats.dribbling} />
          <StatPair label="DEF" value={stats.defending} />
          <StatPair label="PHY" value={stats.stamina} />
        </div>
      </div>
    </div>
  </motion.div>
);

const StatPair = ({ label, value }: { label: string, value: number }) => (
  <div className="flex justify-between items-center gap-2">
    <span className="text-[10px] font-black text-slate-700">{label}</span>
    <span className="text-sm font-black text-slate-900">{value || 0}</span>
  </div>
);

const InsightBadge = ({ text, type = 'success' }: { text: string, type?: 'success' | 'warning' | 'info' }) => (
  <div className={cn(
    "px-4 py-3 rounded-2xl flex items-center gap-3 border",
    type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-700" :
      type === 'warning' ? "bg-amber-50 border-amber-100 text-amber-700" :
        "bg-sky-50 border-sky-100 text-sky-700"
  )}>
    <div className={cn(
      "w-2 h-2 rounded-full",
      type === 'success' ? "bg-emerald-500" : type === 'warning' ? "bg-amber-500" : "bg-sky-500"
    )} />
    <span className="text-sm font-bold">{text}</span>
  </div>
);

// --- Main Page ---

export default function StatsPage() {
  const { user } = useAuth();
  const [playerData, setPlayerData] = useState<any>(null);
  const [playerStats, setPlayerStats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPlayerData() {
      if (!user?.uid) return;
      try {
        const playerDoc = await getDoc(doc(db, 'players', user.uid));
        if (playerDoc.exists()) {
          setPlayerData(playerDoc.data());
        }

        const statsQuery = query(
          collection(db, 'player_stats'),
          where('player_id', '==', user.uid),
          orderBy('date', 'desc')
        );
        const statsSnapshot = await getDocs(statsQuery);
        const statsData = statsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate ? doc.data().date.toDate() : new Date(doc.data().date)
        }));
        setPlayerStats(statsData);
      } catch (error) {
        console.error('Error fetching player data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPlayerData();
  }, [user]);

  const latestStats = playerStats[0] || {
    speed: 0, stamina: 0, shooting: 0, passing: 0, dribbling: 0, defending: 0
  };

  const radarData = [
    { subject: 'السرعة', A: latestStats.speed || 0, fullMark: 100 },
    { subject: 'التسديد', A: latestStats.shooting || 0, fullMark: 100 },
    { subject: 'التمرير', A: latestStats.passing || 0, fullMark: 100 },
    { subject: 'المراوغة', A: latestStats.dribbling || 0, fullMark: 100 },
    { subject: 'الدفاع', A: latestStats.defending || 0, fullMark: 100 },
    { subject: 'التحمل', A: latestStats.stamina || 0, fullMark: 100 },
  ];

  const overallRating = useMemo(() => {
    const vals = [latestStats.speed, latestStats.shooting, latestStats.passing, latestStats.dribbling, latestStats.defending, latestStats.stamina];
    const avg = vals.reduce((a, b) => (a || 0) + (b || 0), 0) / vals.length;
    return Math.round(avg) || 0;
  }, [latestStats]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
          <Loader2 className="w-12 h-12 text-blue-600" />
        </motion.div>
        <p className="mt-4 text-slate-500 font-bold">جاري تحليل بيانات الأداء عبر AI...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#fcfdfe] min-h-screen text-slate-900 pb-20" dir="rtl">

      {/* Header Section */}
      <div className="relative overflow-hidden bg-white border-b border-slate-100 pt-10 pb-16 mb-8">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-blue-50/50 via-transparent to-transparent"></div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div>
              <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest mb-4 shadow-xl shadow-slate-200">
                <BrainCircuit className="w-4 h-4 text-blue-400" />
                تحليل الذكاء الاصطناعي نشط
              </div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-2">إحصائيات <span className="text-blue-600">الأداء</span></h1>
              <p className="text-slate-500 font-medium max-w-lg">يتم استخراج هذه البيانات تلقائياً من خلال تحليل فيديوهاتك المرفوعة باستخدام تقنيات رؤية الحاسوب.</p>
            </div>

            <div className="hidden lg:block">
              <FIFAStyledCard
                rating={overallRating}
                playerName={playerData?.full_name || 'اللاعب'}
                position={playerData?.primary_position || 'ST'}
                stats={latestStats}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Main Stats Column */}
          <div className="lg:col-span-8 space-y-8">

            {/* Rapid Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <QuickStat label="دقة التسديد" value={`${latestStats.shooting}%`} icon={Target} color="text-red-500" />
              <QuickStat label="أقصى سرعة" value={`${latestStats.speed} km/h`} icon={Zap} color="text-yellow-500" />
              <QuickStat label="التمرير" value={`${latestStats.passing}%`} icon={Award} color="text-blue-500" />
              <QuickStat label="اللياقة" value={`${latestStats.stamina}%`} icon={Activity} color="text-emerald-500" />
            </div>

            {/* Radar Analysis Section */}
            <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-xl overflow-hidden relative group">
              <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4 text-center sm:text-right">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 mb-1">الرادار الفني</h3>
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">توزيع القوى والمهارات الأساسية</p>
                </div>
                <div className="flex items-center gap-2 px-6 py-2 bg-blue-50 text-blue-600 rounded-2xl font-black text-sm">
                  مستوى المحترفين
                </div>
              </div>

              <div className="h-[400px] w-full transform group-hover:scale-105 transition-transform duration-700">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: '#64748b', fontSize: 13, fontWeight: '900' }}
                    />
                    <Radar
                      name="Player Stats"
                      dataKey="A"
                      stroke="#2563eb"
                      strokeWidth={3}
                      fill="#3b82f6"
                      fillOpacity={0.6}
                    />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontWeight: '900' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* AI Analysis & Improvements */}
            <div className="bg-slate-950 rounded-[3rem] p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/20 blur-[100px] rounded-full -mr-40 -mt-40"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-500/40 animate-pulse">
                    <BrainCircuit className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black">تقرير الذكاء الاصطناعي 🤖</h3>
                    <p className="text-blue-200/60 font-medium text-sm">التوصيات التقنية بناءً على أداء الشهر الأخير</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-blue-400 font-black uppercase text-xs tracking-widest">نقاط القوة الرئيسية</h4>
                    <div className="space-y-3">
                      <InsightBadge text="سرعة تفاعل ممتازة في منطقة الجزاء" />
                      <InsightBadge text="دقة عالية في التمريرات البينية الطويلة" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-amber-400 font-black uppercase text-xs tracking-widest">مجالات التحسين</h4>
                    <div className="space-y-3">
                      <InsightBadge text="تحسين التغطية الدفاعية عند المرتدات" type="warning" />
                      <InsightBadge text="زيادة معدل الركض عالي الكثافة (Sprint)" type="warning" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Area */}
          <div className="lg:col-span-4 space-y-8">

            {/* Mobile FIFA Card (Hidden on Large Screen since it is in Header) */}
            <div className="lg:hidden">
              <FIFAStyledCard
                rating={overallRating}
                playerName={playerData?.full_name || 'اللاعب'}
                position={playerData?.primary_position || 'ST'}
                stats={latestStats}
              />
            </div>

            {/* Progress History */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl">
              <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                رحلة التطور
              </h3>

              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={playerStats.slice().reverse()}>
                    <defs>
                      <linearGradient id="colorOvr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" hide />
                    <YAxis hide domain={[0, 100]} />
                    <RechartsTooltip />
                    <Area
                      type="monotone"
                      dataKey="speed"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#colorOvr)"
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <p className="text-xs text-slate-400 text-center mt-4 font-bold uppercase tracking-widest">تطور مهارة السرعة خلال آخر 5 تحليلات</p>
            </div>

            {/* AI Status / Pending Analysis */}
            <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-blue-500/30 overflow-hidden relative">
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-[40px]"></div>
              <div className="relative z-10">
                <h4 className="text-xl font-black mb-4">حالة المحلل الآلي</h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md transition-all hover:bg-white/20">
                    <div className="w-10 h-10 rounded-xl bg-emerald-400 flex items-center justify-center">
                      <Award className="w-6 h-6 text-emerald-950" />
                    </div>
                    <div className="flex-1 truncate">
                      <p className="text-sm font-black">تصنيف محترف</p>
                      <p className="text-[10px] text-blue-100/70 font-bold uppercase">تم التحديث منذ يومين</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md opacity-60">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <Video className="w-5 h-5" />
                    </div>
                    <div className="flex-1 truncate">
                      <p className="text-sm font-black italic">فيديو مهارات جديد</p>
                      <p className="text-[10px] text-blue-100/70 font-bold uppercase">بانتظار المعالجة</p>
                    </div>
                  </div>
                </div>

                <button className="w-full mt-8 bg-white text-blue-600 font-black py-4 rounded-2xl hover:bg-blue-50 transition-all flex items-center justify-center gap-2 group shadow-xl">
                  رفع فيديو للتحليل
                  <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stats Card Utility Component
const QuickStat = ({ label, value, icon: Icon, color }: { label: string, value: string, icon: any, color: string }) => (
  <motion.div
    whileHover={{ y: -5 }}
    className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center text-center group"
  >
    <div className={cn("w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform", color)}>
      <Icon className="w-6 h-6" />
    </div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className="text-lg font-black text-slate-900">{value}</p>
  </motion.div>
);

const Loader2 = ({ className }: { className?: string }) => (
  <svg className={cn("animate-spin", className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);
