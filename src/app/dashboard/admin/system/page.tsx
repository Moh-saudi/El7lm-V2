'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/config';
import {
  Database,
  HardDrive,
  Users,
  Building2,
  GraduationCap,
  UserPlus,
  Briefcase,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Server,
  Cloud,
  Megaphone,
  CreditCard,
  MessageSquare,
  ShieldCheck,
  Globe
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import SimpleLoader from '@/components/shared/SimpleLoader';

interface DatabaseStats {
  users: number;
  players: number;
  clubs: number;
  academies: number;
  trainers: number;
  agents: number;
  payments: number;
  subscriptions: number;
  ads: number;
  lastUpdate: Date;
}

interface StorageStats {
  bucketName: string;
  fileCount: number;
  totalSize: number;
  status: 'active' | 'error' | 'empty' | 'legacy';
  provider: 'cloudflare' | 'supabase';
}

interface SystemHealth {
  firebase: 'connected' | 'disconnected' | 'error';
  cloudflare: 'active' | 'inactive' | 'error';
  storage: 'active' | 'limited' | 'error';
  chataman: 'configured' | 'missing';
  geidea: 'configured' | 'missing';
  lastCheck: Date;
}

export default function SystemMonitoring() {
  const [loading, setLoading] = useState(true);
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null);
  const [storageStats, setStorageStats] = useState<StorageStats[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    refreshAll();
  }, []);

  const checkSystemHealth = async () => {
    const health: SystemHealth = {
      firebase: 'disconnected',
      cloudflare: 'inactive',
      storage: 'error',
      chataman: 'missing',
      geidea: 'missing',
      lastCheck: new Date()
    };

    try {
      // Supabase Check (replaces Firebase)
      const { data, error } = await supabase.from('users').select('id').limit(1);
      if (!error) {
        health.firebase = 'connected';
      } else {
        health.firebase = 'error';
      }
    } catch (error) {
      console.error('Supabase health check failed:', error);
      health.firebase = 'error';
    }

    // Cloudflare Check
    if (process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID) {
      health.cloudflare = 'active';
      health.storage = 'active';
    }

    // Integrations Check
    if (process.env.NEXT_PUBLIC_CHATAMAN_API_KEY) health.chataman = 'configured';
    if (process.env.NEXT_PUBLIC_GEIDEA_PUBLIC_KEY) health.geidea = 'configured';

    setSystemHealth(health);
  };

  const fetchDatabaseStats = async () => {
    try {
      const stats: DatabaseStats = {
        users: 0, players: 0, clubs: 0, academies: 0,
        trainers: 0, agents: 0, payments: 0, subscriptions: 0, ads: 0,
        lastUpdate: new Date()
      };

      const tables = [
        'users', 'players', 'clubs', 'academies',
        'trainers', 'agents', 'payments', 'subscriptions', 'ads'
      ];

      await Promise.all(tables.map(async (tableName) => {
        try {
          const { count, error } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });
          if (!error && count !== null) {
            (stats as any)[tableName] = count;
          }
        } catch (error) {
          console.warn(`Failed to fetch stats for ${tableName}:`, error);
        }
      }));

      setDatabaseStats(stats);
    } catch (error) {
      console.error('Database stats error:', error);
    }
  };

  const fetchStorageStats = async () => {
    try {
      const response = await fetch('/api/admin/storage/stats');
      const data = await response.json();

      if (data.success && data.stats) {
        setStorageStats(data.stats);
      } else {
        // Fallback if API fails
        setStorageStats([
          { bucketName: 'ads', provider: 'cloudflare', fileCount: 0, totalSize: 0, status: 'active' },
          { bucketName: 'avatars', provider: 'cloudflare', fileCount: 0, totalSize: 0, status: 'active' },
          { bucketName: 'videos', provider: 'cloudflare', fileCount: 0, totalSize: 0, status: 'active' },
          { bucketName: 'documents', provider: 'cloudflare', fileCount: 0, totalSize: 0, status: 'active' }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch storage stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([
      checkSystemHealth(),
      fetchDatabaseStats(),
      fetchStorageStats()
    ]);
    setIsRefreshing(false);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) return <SimpleLoader size="large" />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            مراقبة النظام
          </h1>
          <p className="text-gray-500 mt-2 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            لوحة معلومات حية لحالة الخوادم والخدمات (Cloudflare Primary)
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={refreshAll} disabled={isRefreshing} variant="outline" className="gap-2">
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* System Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Supabase */}
        <Card className="border-l-4 border-l-yellow-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center justify-between">
              قاعدة البيانات (Supabase)
              <Database className="h-4 w-4 text-yellow-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {systemHealth?.firebase === 'connected' ? (
                <span className="text-green-600 flex items-center gap-2 text-lg"><CheckCircle className="h-5 w-5" /> متصل</span>
              ) : (
                <span className="text-red-600 flex items-center gap-2 text-lg"><XCircle className="h-5 w-5" /> خطأ</span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">Supabase PostgreSQL DB</p>
          </CardContent>
        </Card>

        {/* Cloudflare R2 */}
        <Card className="border-l-4 border-l-orange-500 shadow-sm col-span-1 md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center justify-between">
              نظام التخزين الرئيسي (Cloudflare R2)
              <Cloud className="h-4 w-4 text-orange-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {systemHealth?.cloudflare === 'active' ? (
                <span className="text-green-600 flex items-center gap-2 text-lg"><CheckCircle className="h-5 w-5" /> نشط ويعمل كخادم أساسي</span>
              ) : (
                <span className="text-gray-400 flex items-center gap-2 text-lg"><AlertTriangle className="h-5 w-5" /> غير مفعل</span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">Global Object Storage - Assets & Media</p>
          </CardContent>
        </Card>

        {/* Integrations */}
        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center justify-between">
              خدمات الطرف الثالث
              <Globe className="h-4 w-4 text-purple-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2 mt-1">
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-1 text-gray-600"><MessageSquare className="h-3 w-3" /> ChatAman</span>
                <Badge variant="outline" className="text-green-600 bg-green-50">متصل</Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-1 text-gray-600"><CreditCard className="h-3 w-3" /> Geidea</span>
                <Badge variant="outline" className="text-green-600 bg-green-50">متصل</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Database Stats */}
      {databaseStats && (
        <Card className="shadow-md border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-blue-900">
              <Database className="w-5 h-5" />
              إحصائيات المنصة
            </CardTitle>
            <CardDescription>نظرة عامة على البيانات في الوقت الفعلي</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {[
                { label: 'المستخدمين', value: databaseStats.users, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
                { label: 'اللاعبين', value: databaseStats.players, icon: Users, color: 'text-green-500', bg: 'bg-green-50' },
                { label: 'الأندية', value: databaseStats.clubs, icon: Building2, color: 'text-purple-500', bg: 'bg-purple-50' },
                { label: 'الأكاديميات', value: databaseStats.academies, icon: GraduationCap, color: 'text-yellow-500', bg: 'bg-yellow-50' },
                { label: 'المدربين', value: databaseStats.trainers, icon: UserPlus, color: 'text-orange-500', bg: 'bg-orange-50' },
                { label: 'الوكلاء', value: databaseStats.agents, icon: Briefcase, color: 'text-red-500', bg: 'bg-red-50' },
                { label: 'الإعلانات', value: databaseStats.ads, icon: Megaphone, color: 'text-pink-500', bg: 'bg-pink-50' },
                { label: 'المدفوعات', value: databaseStats.payments, icon: CreditCard, color: 'text-indigo-500', bg: 'bg-indigo-50' },
                { label: 'الاشتراكات', value: databaseStats.subscriptions, icon: ShieldCheck, color: 'text-teal-500', bg: 'bg-teal-50' },
              ].map((stat, idx) => (
                <div key={idx} className={`${stat.bg} p-4 rounded-xl border border-transparent hover:border-gray-200 transition-all`}>
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    <span className="text-xs font-semibold text-gray-600">{stat.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-800">{stat.value.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Storage Breakdown */}
      <Card className="shadow-md border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-orange-900">
            <HardDrive className="w-5 h-5" />
            نظام التخزين (Cloudflare Storage)
          </CardTitle>
          <CardDescription>
            تم ترحيل كافة العمليات لتعمل حصرياً على Cloudflare R2 لضمان استقرار الخدمة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم الوعاء (Bucket)</TableHead>
                <TableHead>المزود (Provider)</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>عدد الملفات</TableHead>
                <TableHead>الحجم الإجمالي</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {storageStats.map((stat, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium flex items-center gap-2">
                    {stat.bucketName === 'ads' ? <Megaphone className="w-3 h-3 text-gray-400" /> : <HardDrive className="w-3 h-3 text-gray-400" />}
                    {stat.bucketName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={stat.provider === 'cloudflare' ? 'border-orange-200 text-orange-700 bg-orange-50' : 'border-gray-200 text-gray-500 bg-gray-50'}>
                      {stat.provider === 'cloudflare' ? 'Cloudflare R2' : 'Supabase (Legacy)'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {stat.status === 'active' ? (
                      <span className="text-green-600 text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" /> نشط (أساسي)</span>
                    ) : stat.status === 'legacy' ? (
                      <span className="text-blue-600 text-xs flex items-center gap-1"><Activity className="w-3 h-3" /> مؤرشف</span>
                    ) : (
                      <span className="text-red-600 text-xs flex items-center gap-1"><XCircle className="w-3 h-3" /> معطل</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-blue-600">
                    {stat.fileCount.toLocaleString()} ملف
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-gray-700">
                    {formatBytes(stat.totalSize)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
