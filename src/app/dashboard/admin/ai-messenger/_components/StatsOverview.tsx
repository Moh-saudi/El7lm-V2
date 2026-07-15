'use client';
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  BarChart,
  CheckCircle2,
  Send,
  Eye,
  Users,
  TrendingUp,
  MessageSquare,
  Heart,
  UserCheck,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/config';
import { useTranslation } from '@/lib/i18n';

interface DayStat { label: string; count: number; }
interface TypeStat { type: string; label: string; count: number; icon: React.ElementType; color: string; }

const TYPE_META: Record<string, { icon: React.ElementType; color: string }> = {
  profile_view:     { icon: Eye,           color: 'text-indigo-500' },
  video_view:       { icon: Eye,           color: 'text-blue-500' },
  message_received: { icon: MessageSquare, color: 'text-emerald-500' },
  video_like:       { icon: Heart,         color: 'text-rose-500' },
  follow:           { icon: UserCheck,     color: 'text-amber-500' },
};

export const StatsOverview: React.FC = () => {
  const { locale, isRTL, getTranslations } = useTranslation();
  const copy = getTranslations<any>('aiMessenger.stats');
  const numberLocale = ({ ar: 'ar-EG', en: 'en-US', es: 'es-ES', pt: 'pt-PT' } as const)[locale];
  const [loading, setLoading] = useState(true);
  const [totalNotifs, setTotalNotifs] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [typeStats, setTypeStats] = useState<TypeStat[]>([]);
  const [dayStats, setDayStats] = useState<DayStat[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // ── 1. Notifications (last 30 days) ──────────────────────────────
        const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: notifsData } = await supabase
          .from('interaction_notifications')
          .select('*')
          .gte('createdAt', since30);
        const notifs = notifsData || [];
        setTotalNotifs(notifs.length);

        // ── 2. By type ────────────────────────────────────────────────────
        const typeCounts: Record<string, number> = {};
        notifs.forEach(n => {
          const t = n.type || 'unknown';
          typeCounts[t] = (typeCounts[t] || 0) + 1;
        });
        const stats: TypeStat[] = Object.entries(typeCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([type, count]) => ({
            type, count,
            label: copy.types[type] || type,
            icon:  TYPE_META[type]?.icon  || Send,
            color: TYPE_META[type]?.color || 'text-slate-400',
          }));
        setTypeStats(stats);

        // ── 3. Last 7 days activity ────────────────────────────────────────
        const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const days7: Record<string, number> = {};
        for (let i = 6; i >= 0; i--) {
          const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
          days7[d.toDateString()] = 0;
        }
        notifs.forEach(n => {
          const ts = n.createdAt;
          if (!ts) return;
          const date = new Date(ts);
          if (date >= since7) {
            const key = date.toDateString();
            if (key in days7) days7[key]++;
          }
        });
        setDayStats(
          Object.entries(days7).map(([dateStr, count]) => {
            const d = new Date(dateStr);
            return { label: copy.days[d.getDay()], count };
          })
        );

        // ── 4. Total users with phone ──────────────────────────────────────
        const userCols = ['users', 'players', 'academies', 'clubs', 'trainers', 'agents'];
        const counts = await Promise.all(
          userCols.map(col => supabase.from(col).select('id', { count: 'exact', head: true }).then(r => r.count || 0).then(undefined, () => 0))
        );
        setTotalUsers(counts.reduce((a, b) => a + b, 0));

      } catch (err) {
        console.error('StatsOverview load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [locale]);

  const maxDay = Math.max(...dayStats.map(d => d.count), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        <span className="text-sm text-slate-500">{copy.loading}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full overflow-y-auto custom-scrollbar p-1" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* ── Top metrics ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total notifications */}
        <Card className="border-none shadow-xl">
          <CardHeader className="p-4 flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-slate-500">{copy.totalNotifications}</CardTitle>
            <Send className="w-4 h-4 text-indigo-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-slate-800">{totalNotifs.toLocaleString(numberLocale)}</div>
            <p className="text-[10px] text-slate-400 mt-1">{copy.interactiveNotifications}</p>
          </CardContent>
        </Card>

        {/* Total audience */}
        <Card className="border-none shadow-xl">
          <CardHeader className="p-4 flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-slate-500">{copy.totalUsers}</CardTitle>
            <Users className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-slate-800">{totalUsers.toLocaleString(numberLocale)}</div>
            <p className="text-[10px] text-slate-400 mt-1">{copy.registeredUsers}</p>
          </CardContent>
        </Card>

        {/* Today's activity */}
        <Card className="border-none shadow-xl">
          <CardHeader className="p-4 flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-slate-500">{copy.todayActivity}</CardTitle>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-slate-800">
              {(dayStats[dayStats.length - 1]?.count ?? 0).toLocaleString(numberLocale)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{copy.notificationsToday}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Charts row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 7-day bar chart */}
        <Card className="lg:col-span-2 border-none shadow-xl">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-1">
              <BarChart className="w-4 h-4 text-emerald-500" />
              {copy.activityTitle}
            </CardTitle>
            <CardDescription className="text-[10px] text-slate-400">{copy.activityDescription}</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {dayStats.every(d => d.count === 0) ? (
              <div className="flex items-center justify-center h-28 text-slate-400 text-xs">
                {copy.noRecentData}
              </div>
            ) : (
              <div className="flex items-end gap-2 h-28">
                {dayStats.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] font-bold text-slate-600">{d.count}</span>
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-emerald-500 to-teal-400 transition-all duration-500"
                      style={{ height: `${Math.max((d.count / maxDay) * 80, d.count > 0 ? 4 : 0)}px` }}
                    />
                    <span className="text-[9px] text-slate-400 truncate w-full text-center">{d.label}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By type breakdown */}
        <Card className="border-none shadow-xl">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-indigo-500" />
              {copy.typeDistribution}
            </CardTitle>
            <CardDescription className="text-[10px] text-slate-400">{copy.last30Days}</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-2">
            {typeStats.length === 0 ? (
              <div className="text-center text-slate-400 text-xs py-8">{copy.noNotifications}</div>
            ) : (
              typeStats.map((t, i) => {
                const Icon = t.icon;
                const pct = totalNotifs > 0 ? Math.round((t.count / totalNotifs) * 100) : 0;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`flex items-center gap-1 text-[11px] font-medium text-slate-600`}>
                        <Icon className={`w-3 h-3 ${t.color}`} />
                        {t.label}
                      </span>
                      <span className="text-[11px] font-bold text-slate-700">{t.count} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
