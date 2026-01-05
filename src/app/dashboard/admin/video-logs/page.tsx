'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Clock,
  User,
  Video,
  MessageSquare,
  CheckCircle,
  XCircle,
  Flag,
  Upload,
  Search,
  Filter,
  Calendar,
  Eye,
  Download,
  RefreshCw,
  Activity,
  ChevronRight,
  ShieldCheck,
  History,
  ArrowUpDown,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { actionLogService } from '@/lib/admin/action-logs';
import { VideoLogEntry, PlayerLogEntry } from '@/types/admin';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function VideoLogsPage() {
  const { user } = useAuth();
  const [videoLogs, setVideoLogs] = useState<VideoLogEntry[]>([]);
  const [playerLogs, setPlayerLogs] = useState<PlayerLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [playerFilter, setPlayerFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [urlVideoId, setUrlVideoId] = useState<string | null>(null);
  const [urlPlayerId, setUrlPlayerId] = useState<string | null>(null);

  const loadLogs = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      let videoLogsData: VideoLogEntry[] = [];
      let playerLogsData: PlayerLogEntry[] = [];

      if (urlVideoId) {
        videoLogsData = await actionLogService.getVideoLogs(urlVideoId, 100);
        if (videoLogsData.length > 0) {
          const pId = videoLogsData[0].playerId;
          playerLogsData = await actionLogService.getPlayerLogs(pId, 100);
        }
      } else if (urlPlayerId) {
        playerLogsData = await actionLogService.getPlayerLogs(urlPlayerId, 100);
        const allVideoLogs = await actionLogService.getAllVideoLogs(200);
        videoLogsData = allVideoLogs.filter(log => log.playerId === urlPlayerId);
      } else {
        [videoLogsData, playerLogsData] = await Promise.all([
          actionLogService.getAllVideoLogs(200),
          actionLogService.getAllPlayerLogs(200)
        ]);
      }

      setVideoLogs(videoLogsData);
      setPlayerLogs(playerLogsData);

      if (!silent && (urlVideoId || urlPlayerId)) {
        toast.info(urlVideoId ? `تم عرض سجلات الفيديو المحدد` : `تم عرض سجلات اللاعب المحدد`);
      }
    } catch (error) {
      console.error('Error loading logs:', error);
      toast.error('حدث خطأ أثناء تحميل السجلات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const vid = urlParams.get('videoId');
      const pid = urlParams.get('playerId');
      if (vid) setUrlVideoId(vid);
      if (pid) setUrlPlayerId(pid);
    }

    if (user?.uid) {
      loadLogs();
    }
  }, [user?.uid]);

  const filteredVideoLogs = useMemo(() => {
    let filtered = [...videoLogs];
    const term = searchTerm.toLowerCase();

    if (term) {
      filtered = filtered.filter(log =>
        log.playerName.toLowerCase().includes(term) ||
        log.videoTitle.toLowerCase().includes(term) ||
        log.notes?.toLowerCase().includes(term)
      );
    }

    if (actionFilter !== 'all') filtered = filtered.filter(log => log.action === actionFilter);
    if (playerFilter !== 'all') filtered = filtered.filter(log => log.playerId === playerFilter);

    if (dateFilter !== 'all') {
      const filterDate = new Date();
      if (dateFilter === 'today') filterDate.setHours(0, 0, 0, 0);
      else if (dateFilter === 'week') filterDate.setDate(new Date().getDate() - 7);
      else if (dateFilter === 'month') filterDate.setMonth(new Date().getMonth() - 1);

      filtered = filtered.filter(log => {
        const logDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
        return logDate >= filterDate;
      });
    }

    return filtered;
  }, [videoLogs, searchTerm, actionFilter, playerFilter, dateFilter]);

  const filteredPlayerLogs = useMemo(() => {
    let filtered = [...playerLogs];
    const term = searchTerm.toLowerCase();

    if (term) {
      filtered = filtered.filter(log =>
        log.playerName.toLowerCase().includes(term) ||
        log.action.toLowerCase().includes(term)
      );
    }

    if (actionFilter !== 'all') filtered = filtered.filter(log => log.action === actionFilter);
    if (playerFilter !== 'all') filtered = filtered.filter(log => log.playerId === playerFilter);

    if (dateFilter !== 'all') {
      const filterDate = new Date();
      if (dateFilter === 'today') filterDate.setHours(0, 0, 0, 0);
      else if (dateFilter === 'week') filterDate.setDate(new Date().getDate() - 7);
      else if (dateFilter === 'month') filterDate.setMonth(new Date().getMonth() - 1);

      filtered = filtered.filter(log => {
        const logDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
        return logDate >= filterDate;
      });
    }

    return filtered;
  }, [playerLogs, searchTerm, actionFilter, playerFilter, dateFilter]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'upload':
      case 'video_upload': return <Upload className="w-4 h-4" />;
      case 'status_change': return <CheckCircle className="w-4 h-4" />;
      case 'notification_sent': return <MessageSquare className="w-4 h-4" />;
      case 'video_review': return <Eye className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'upload':
      case 'video_upload': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'status_change':
      case 'video_review': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'notification_sent': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'upload': return 'رفع فيديو';
      case 'status_change': return 'تغيير الحالة';
      case 'notification_sent': return 'إرسال إشعار';
      case 'video_upload': return 'رفع فيديو';
      case 'video_review': return 'مراجعة فيديو';
      default: return action;
    }
  };

  const formatDate = (timestamp: any) => {
    try {
      const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch { return '---'; }
  };

  const exportLogs = () => {
    const csvContent = [
      ['التاريخ', 'اللاعب', 'الفيديو', 'الإجراء', 'الملاحظات', 'نوع الإشعار'].join(','),
      ...filteredVideoLogs.map(log => [
        formatDate(log.timestamp),
        log.playerName,
        log.videoTitle,
        getActionLabel(log.action),
        log.notes || '',
        log.notificationType || ''
      ].map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `video-logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('تم تصدير السجلات بنجاح');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6" dir="rtl">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            <Activity className="absolute inset-0 m-auto w-6 h-6 text-indigo-600 animate-pulse" />
          </div>
          <p className="text-slate-600 font-bold text-lg animate-pulse">جاري تحميل مركز العمليات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/10 to-slate-50 p-6 sm:p-10" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-900 rounded-2xl shadow-xl">
                <History className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">سجل العمليات</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="bg-white border-slate-200 text-slate-500 font-bold px-3 py-1">
                    لوحة المراقبة المركزية
                  </Badge>
                  <div className="h-1 w-1 bg-slate-300 rounded-full" />
                  <span className="text-slate-500 text-sm font-medium">تتبع جميع التغييرات والإجراءات</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => loadLogs(true)} className="bg-white hover:bg-slate-50 h-12 px-6 rounded-xl border-slate-200">
              <RefreshCw className={`w-4 h-4 ml-2 ${refreshing ? 'animate-spin' : ''}`} />
              تحديث السجلات
            </Button>
            <Button onClick={exportLogs} className="bg-indigo-600 hover:bg-indigo-700 text-white h-12 px-6 rounded-xl shadow-lg font-bold gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              تصدير البيانات
            </Button>
          </div>
        </div>

        {/* Analytics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'إجمالي العمليات', value: videoLogs.length + playerLogs.length, icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-100/50' },
            { label: 'عمليات الفيديو', value: videoLogs.length, icon: Video, color: 'text-blue-600', bg: 'bg-blue-100/50' },
            { label: 'عمليات اللاعبين', value: playerLogs.length, icon: User, color: 'text-purple-600', bg: 'bg-purple-100/50' },
            { label: 'نتائج البحث', value: filteredVideoLogs.length + filteredPlayerLogs.length, icon: Search, color: 'text-emerald-600', bg: 'bg-emerald-100/50' },
          ].map((stat, i) => (
            <Card key={i} className="border-none shadow-sm bg-white overflow-hidden rounded-2xl ring-1 ring-slate-100">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">{stat.label}</p>
                  <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter Toolbar */}
        <Card className="border-none shadow-sm bg-white/80 backdrop-blur-md rounded-2xl sticky top-6 z-30 ring-1 ring-slate-100">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="ابحث باسم اللاعب، عنوان الفيديو، أو الملاحظات..."
                  className="pr-10 h-11 border-slate-200 bg-white/50 focus:bg-white rounded-xl"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-[160px] h-11 bg-white border-slate-200 rounded-xl">
                    <SelectValue placeholder="نوع الإجراء" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الإجراءات</SelectItem>
                    <SelectItem value="upload">رفع فيديو</SelectItem>
                    <SelectItem value="status_change">تغيير الحالة</SelectItem>
                    <SelectItem value="notification_sent">إرسال إشعار</SelectItem>
                    <SelectItem value="video_review">مراجعة فيديو</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[140px] h-11 bg-white border-slate-200 rounded-xl">
                    <SelectValue placeholder="التاريخ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الأوقات</SelectItem>
                    <SelectItem value="today">اليوم</SelectItem>
                    <SelectItem value="week">آخر 7 أيام</SelectItem>
                    <SelectItem value="month">آخر 30 يوم</SelectItem>
                  </SelectContent>
                </Select>

                <div className="h-8 w-px bg-slate-200 mx-1 hidden lg:block" />

                {(urlVideoId || urlPlayerId) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setUrlVideoId(null);
                      setUrlPlayerId(null);
                      window.history.pushState({}, '', '/dashboard/admin/video-logs');
                      loadLogs(true);
                    }}
                    className="text-red-600 hover:bg-red-50 rounded-xl font-bold"
                  >
                    إلغاء التصفية الخاصة
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Tabs */}
        <Tabs defaultValue="videos" className="space-y-6">
          <TabsList className="bg-slate-100 p-1 rounded-2xl inline-flex gap-1 border border-slate-200">
            <TabsTrigger value="videos" className="rounded-xl px-8 h-10 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 font-bold gap-2">
              <Video className="w-4 h-4" /> سجلات الفيديوهات
              <Badge variant="secondary" className="ml-1 bg-slate-200/50 text-slate-700">{filteredVideoLogs.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="players" className="rounded-xl px-8 h-10 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-600 font-bold gap-2">
              <User className="w-4 h-4" /> سجلات اللاعبين
              <Badge variant="secondary" className="ml-1 bg-slate-200/50 text-slate-700">{filteredPlayerLogs.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="space-y-4">
            <Card className="border-none shadow-sm bg-white rounded-2xl ring-1 ring-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">التاريخ</th>
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">الفيديو</th>
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">المستخدم</th>
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">الإجراء</th>
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">بواسطة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    <AnimatePresence mode="popLayout">
                      {filteredVideoLogs.map((log) => (
                        <motion.tr
                          key={log.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-slate-50/50 transition-colors group"
                        >
                          <td className="p-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900">{formatDate(log.timestamp).split(',')[0]}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{formatDate(log.timestamp).split(',')[1]}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold group-hover:scale-110 transition-transform">
                                <Video className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="text-sm font-bold text-slate-900">{log.videoTitle}</div>
                                <div className="text-[10px] text-slate-400 line-clamp-1 max-w-[200px]">{log.notes || '---'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-[10px] font-bold">
                                {log.playerName.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="text-sm font-medium text-slate-700">{log.playerName}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge className={`border px-2 py-0.5 rounded-lg text-[10px] font-bold ${getActionColor(log.action)}`}>
                              {getActionIcon(log.action)}
                              <span className="mr-1">{getActionLabel(log.action)}</span>
                            </Badge>
                          </td>
                          <td className="p-4 text-sm font-medium text-slate-500">
                            {log.actionBy === 'admin' ? (
                              <div className="flex items-center gap-1.5 text-blue-600">
                                <ShieldCheck className="w-4 h-4" />
                                مدير
                              </div>
                            ) : (
                              <span className="text-slate-400">النظام</span>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                    {filteredVideoLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-20 text-center">
                          <div className="flex flex-col items-center gap-3 opacity-20">
                            <Search className="w-12 h-12" />
                            <p className="font-bold">لا يوجد سجلات مطابقة</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="players" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlayerLogs.map((log) => (
                <motion.div
                  key={log.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="border-none shadow-sm bg-white hover:shadow-lg transition-all duration-300 rounded-2xl ring-1 ring-slate-100 group">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 font-black group-hover:scale-110 transition-transform">
                            {log.playerName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 break-words line-clamp-1">{log.playerName}</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{formatDate(log.timestamp)}</p>
                          </div>
                        </div>
                        <Badge className={`border ${getActionColor(log.action)} px-2 py-0.5 text-[10px]`}>
                          {getActionLabel(log.action)}
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        {log.details?.videoTitle && (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                            <Video className="w-4 h-4 text-slate-400" />
                            <span className="text-xs font-bold text-slate-600 line-clamp-1">{log.details.videoTitle}</span>
                          </div>
                        )}

                        <p className="text-sm text-slate-500 leading-relaxed bg-indigo-50/30 p-4 rounded-2xl border border-indigo-50 line-clamp-3">
                          {log.details?.notificationMessage || 'تم تنفيذ العملية بنجاح بدون ملاحظات إضافية.'}
                        </p>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {formatDate(log.timestamp).split(',')[1]}
                        </span>
                        <Button variant="ghost" size="sm" className="h-7 px-2 rounded-lg text-indigo-600 hover:bg-indigo-50 font-bold gap-1 group">
                          التفاصيل
                          <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
              {filteredPlayerLogs.length === 0 && (
                <div className="col-span-full py-20 text-center opacity-20">
                  <User className="w-16 h-16 mx-auto mb-4" />
                  <p className="font-bold">لا يوجد سجلات مطابقة</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
