'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  limit as fslimit,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { DreamAcademySource, DreamAcademyCategoryId } from '@/types/dream-academy';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  Save,
  CheckCircle,
  XCircle,
  Search,
  Download,
  Play,
  ListPlus,
  Youtube,
  Filter,
  BarChart3,
  ExternalLink,
  Copy,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  Settings2,
  AlertCircle,
  RefreshCw,
  Video,
  Library,
  Layers,
  Sparkles,
  Command
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { AccountTypeProtection } from '@/hooks/useAccountTypeAuth';
import ReactPlayer from 'react-player';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function extractYouTubeIds(rawUrl: string): { videoId?: string; playlistId?: string } {
  try {
    const url = new URL(rawUrl);
    if (url.hostname.includes('youtu.be')) {
      const videoId = url.pathname.split('/')[1];
      return { videoId };
    }
    if (url.hostname.includes('youtube.com')) {
      const v = url.searchParams.get('v') || undefined;
      const list = url.searchParams.get('list') || undefined;
      const isEmbed = url.pathname.startsWith('/embed/');
      const embedId = isEmbed ? url.pathname.split('/')[2] : undefined;
      return { videoId: v || embedId, playlistId: list };
    }
  } catch { }
  return {};
}

const FALLBACK_CATEGORIES: { id: DreamAcademyCategoryId; title: string }[] = [
  { id: 'english', title: 'English (Football)' },
  { id: 'french', title: 'French (Football)' },
  { id: 'spanish', title: 'Spanish (Football)' },
  { id: 'portuguese', title: 'Portuguese (Football)' },
  { id: 'skills', title: 'Skills' },
  { id: 'life_coach', title: 'Life Coach' },
];

export default function AdminDreamAcademyVideosPage() {
  const { user } = useAuth();
  const [sources, setSources] = useState<DreamAcademySource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiKeyPresent, setApiKeyPresent] = useState<boolean | null>(null);
  const [filterCategory, setFilterCategory] = useState<DreamAcademyCategoryId | 'all'>('all');
  const [filterType, setFilterType] = useState<'all' | 'video' | 'playlist'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<DreamAcademySource | null>(null);
  const [statsMap, setStatsMap] = useState<Record<string, { views: number; likes: number }>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [importing, setImporting] = useState(false);

  const [dynamicCategories, setDynamicCategories] = useState<{ id: DreamAcademyCategoryId; title: string }[]>(FALLBACK_CATEGORIES);
  const [draft, setDraft] = useState<Partial<DreamAcademySource>>({
    provider: 'youtube',
    sourceType: 'video',
    url: '',
    categoryId: 'english',
    isActive: true,
  });

  const fetchSources = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const q = query(collection(db, 'dream_academy_sources'), orderBy('order', 'asc'));
      const snap = await getDocs(q);
      const rows: DreamAcademySource[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setSources(rows);

      // Fetch platform stats (best-effort)
      const newStats: Record<string, { views: number; likes: number }> = {};
      const statsPromises = rows.map(async (s) => {
        if (!s.id) return;
        try {
          const res = await fetch(`/api/dream-academy/stats?sourceId=${s.id}`);
          const data = await res.json();
          newStats[s.id] = { views: data?.views || 0, likes: data?.likes || 0 };
        } catch {
          // ignore
        }
      });
      await Promise.all(statsPromises);
      setStatsMap(newStats);
    } catch (error) {
      console.error('Error fetching sources:', error);
      toast.error('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSources();

    // Check YouTube API key presence
    (async () => {
      try {
        const res = await fetch('/api/debug/youtube-key');
        const data = await res.json();
        setApiKeyPresent(Boolean(data?.present));
      } catch {
        setApiKeyPresent(null);
      }
    })();

    // تحميل الفئات الديناميكية
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'dream_academy_categories')));
        const cats = snap.docs.map(d => d.data() as any).filter(c => c.isActive !== false);
        const mapped = cats.map((c: any) => ({ id: c.id as DreamAcademyCategoryId, title: c.title as string }));
        if (mapped.length > 0) {
          const unique = Array.from(new Map(mapped.map((c: any) => [c.id, c])).values());
          setDynamicCategories(unique as any);
        }
      } catch { }
    })();
  }, [fetchSources]);

  const filteredSources = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return sources
      .filter(s => (filterCategory === 'all' ? true : s.categoryId === filterCategory))
      .filter(s => (filterType === 'all' ? true : s.sourceType === filterType))
      .filter(s => (filterStatus === 'all' ? true : filterStatus === 'active' ? s.isActive : !s.isActive))
      .filter(s => (
        term
          ? (
            (s.title || s.resolvedTitle || '').toLowerCase().includes(term) ||
            (s.channelTitle || '').toLowerCase().includes(term) ||
            (s.url || '').toLowerCase().includes(term)
          )
          : true
      ))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [sources, filterCategory, filterType, filterStatus, searchTerm]);

  const stats = useMemo(() => {
    return {
      total: sources.length,
      active: sources.filter(s => s.isActive).length,
      playlists: sources.filter(s => s.sourceType === 'playlist').length,
      videos: sources.filter(s => s.sourceType === 'video').length,
    };
  }, [sources]);

  const allVisibleSelected = useMemo(() => {
    if (filteredSources.length === 0) return false;
    return filteredSources.every(s => selectedIds.includes(s.id!));
  }, [filteredSources, selectedIds]);

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(filteredSources.map(s => s.id));
      setSelectedIds(prev => prev.filter(id => !visibleIds.has(id)));
    } else {
      const toAdd = filteredSources.map(s => s.id!).filter(Boolean);
      setSelectedIds(prev => Array.from(new Set([...prev, ...toAdd])));
    }
  };

  const toggleSelect = (id?: string) => {
    if (!id) return;
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const bulkSetActive = async (active: boolean) => {
    const ids = selectedIds.slice();
    const promise = async () => {
      for (const id of ids) {
        try { await updateDoc(doc(db, 'dream_academy_sources', id), { isActive: active }); } catch { }
      }
      setSelectedIds([]);
      await fetchSources(true);
    };
    toast.promise(promise(), {
      loading: 'جاري التحديث...',
      success: 'تم تحديث الحالة بنجاح',
      error: 'حدث خطأ أثناء التحديث'
    });
  };

  const bulkChangeCategory = async (categoryId: DreamAcademyCategoryId) => {
    const ids = selectedIds.slice();
    const promise = async () => {
      for (const id of ids) {
        try { await updateDoc(doc(db, 'dream_academy_sources', id), { categoryId }); } catch { }
      }
      setSelectedIds([]);
      await fetchSources(true);
    };
    toast.promise(promise(), {
      loading: 'جاري نقل الفيديوهات...',
      success: 'تم نقل الفيديوهات بنجاح',
      error: 'حدث خطأ أثناء النقل'
    });
  };

  const bulkDelete = async () => {
    if (!window.confirm(`هل أنت متأكد من حذف ${selectedIds.length} عنصر؟`)) return;
    const ids = selectedIds.slice();
    const promise = async () => {
      for (const id of ids) {
        try { await deleteDoc(doc(db, 'dream_academy_sources', id)); } catch { }
      }
      setSelectedIds([]);
      await fetchSources(true);
    };
    toast.promise(promise(), {
      loading: 'جاري الحذف...',
      success: 'تم الحذف بنجاح',
      error: 'حدث خطأ أثناء الحذف'
    });
  };

  const copyToClipboard = async (text?: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('تم نسخ الرابط');
    } catch {
      toast.error('فشل نسخ الرابط');
    }
  };

  const resolveMeta = async () => {
    if (!draft.url) return;
    setImporting(true);
    try {
      const res = await fetch('/api/youtube/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: draft.url })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setDraft(d => ({
        ...d,
        videoId: data.videoId,
        playlistId: data.playlistId,
        title: d?.title || data.resolvedTitle,
        resolvedTitle: data.resolvedTitle,
        resolvedDescription: data.resolvedDescription,
        durationSec: data.durationSec,
        itemCount: data.itemCount,
        channelTitle: data.channelTitle,
        thumbnailUrl: data.thumbnailUrl,
        sourceType: data.playlistId ? 'playlist' : (d as any).sourceType || 'video'
      }) as any);
      toast.success('تم جلب البيانات بنجاح');
    } catch (e: any) {
      toast.error(e.message || 'فشل جلب البيانات');
    } finally {
      setImporting(false);
    }
  };

  const handleAdd = async () => {
    if (!draft.url || !draft.sourceType || !draft.categoryId) {
      toast.error('الرجاء تعبئة البيانات الأساسية');
      return;
    }
    const ids = extractYouTubeIds(draft.url);

    // Prevent duplicates
    const checkExists = async (field: 'videoId' | 'playlistId' | 'url', value?: string | null) => {
      if (!value) return false;
      const qx = query(collection(db, 'dream_academy_sources'), where(field, '==', value), fslimit(1));
      const snapx = await getDocs(qx);
      return !snapx.empty;
    };

    if (ids.videoId && await checkExists('videoId', ids.videoId)) {
      toast.error('هذا الفيديو مضاف مسبقاً');
      return;
    }
    if (ids.playlistId && await checkExists('playlistId', ids.playlistId)) {
      toast.error('هذه القائمة مضافة مسبقاً');
      return;
    }

    const payload: DreamAcademySource = {
      provider: 'youtube',
      sourceType: draft.sourceType,
      url: draft.url,
      categoryId: draft.categoryId as DreamAcademyCategoryId,
      order: draft.order || (sources.length > 0 ? Math.max(...sources.map(s => s.order || 0)) + 1 : 0),
      isActive: draft.isActive ?? true,
      title: draft.title || undefined,
      resolvedTitle: (draft as any).resolvedTitle,
      resolvedDescription: (draft as any).resolvedDescription,
      durationSec: (draft as any).durationSec,
      itemCount: (draft as any).itemCount,
      channelTitle: (draft as any).channelTitle,
      thumbnailUrl: (draft as any).thumbnailUrl,
      videoId: ids.videoId,
      playlistId: ids.playlistId,
      createdBy: user?.uid || 'system',
      createdAt: new Date(),
    };

    const stripUndefined = (obj: any) => Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== undefined)
    );

    try {
      await addDoc(collection(db, 'dream_academy_sources'), stripUndefined(payload) as any);
      setDraft({ provider: 'youtube', sourceType: 'video', url: '', categoryId: 'english', isActive: true });
      setShowAddModal(false);
      await fetchSources(true);
      toast.success('تمت الإضافة بنجاح');
    } catch (error) {
      toast.error('حدث خطأ أثناء الإضافة');
    }
  };

  const handleImportPlaylist = async () => {
    if (!apiKeyPresent) {
      toast.error('مفتاح YouTube API غير متوفر');
      return;
    }
    if (!draft.url || draft.sourceType !== 'playlist' || !draft.categoryId) return;

    setImporting(true);
    try {
      let next: string | null = null;
      let page = 0;
      let addedCount = 0;
      let skippedCount = 0;

      do {
        const res = await fetch('/api/youtube/playlist-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playlistUrlOrId: draft.url, pageToken: next })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'فشل في جلب عناصر القائمة');

        const items = (data.items || []) as any[];
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          if (!it?.videoId) { skippedCount++; continue; }

          // Check exists efficiently
          const qx = query(collection(db, 'dream_academy_sources'), where('videoId', '==', it.videoId), fslimit(1));
          const snapx = await getDocs(qx);
          if (!snapx.empty) { skippedCount++; continue; }

          const payload: DreamAcademySource = {
            provider: 'youtube',
            sourceType: 'video',
            url: `https://www.youtube.com/watch?v=${it.videoId}`,
            categoryId: draft.categoryId as DreamAcademyCategoryId,
            order: (page * 1000) + it.order,
            isActive: true,
            title: it.title,
            resolvedTitle: it.title,
            resolvedDescription: it.description,
            durationSec: it.durationSec,
            channelTitle: it.channelTitle,
            thumbnailUrl: it.thumbnailUrl,
            videoId: it.videoId,
            playlistId: data.playlistId,
            createdBy: user?.uid || 'system',
            createdAt: new Date(),
          };

          const cleanPayload = Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined));
          await addDoc(collection(db, 'dream_academy_sources'), cleanPayload as any);
          addedCount++;
        }

        next = data.nextPageToken;
        page++;
      } while (next);

      await fetchSources(true);
      setShowAddModal(false);
      toast.success(`تم الاستيراد: تمت إضافة ${addedCount} وتخطي ${skippedCount}`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'فشل استيراد قائمة التشغيل');
    } finally {
      setImporting(false);
    }
  };

  const handleImportChannelPlaylists = async () => {
    if (!apiKeyPresent) {
      toast.error('مفتاح YouTube API غير متوفر');
      return;
    }
    if (!draft.url || !draft.categoryId) return;

    setImporting(true);
    try {
      let next: string | null = null;
      const allPlaylists: { playlistId: string; title?: string }[] = [];

      do {
        const res = await fetch('/api/youtube/channel-playlists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelUrlOrId: draft.url, pageToken: next })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'فشل في جلب قوائم تشغيل القناة');

        for (const pl of data.items || []) {
          allPlaylists.push({ playlistId: pl.playlistId, title: pl.title });
        }
        next = data.nextPageToken;
      } while (next);

      if (allPlaylists.length === 0) {
        toast.info('لا توجد قوائم تشغيل متاحة لهذه القناة');
        return;
      }

      let importedVideosCount = 0;
      let skippedVideosCount = 0;

      for (const [idx, pl] of allPlaylists.entries()) {
        let nextItems: string | null = null;
        let page = 0;
        do {
          const res = await fetch('/api/youtube/playlist-items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playlistUrlOrId: pl.playlistId, pageToken: nextItems })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error || 'فشل في جلب عناصر القائمة');

          const items = (data.items || []) as any[];
          for (let i = 0; i < items.length; i++) {
            const it = items[i];

            // Fast check
            const qx = query(collection(db, 'dream_academy_sources'), where('videoId', '==', it.videoId), fslimit(1));
            const snapx = await getDocs(qx);
            if (!snapx.empty) { skippedVideosCount++; continue; }

            const payload: DreamAcademySource = {
              provider: 'youtube',
              sourceType: 'video',
              url: `https://www.youtube.com/watch?v=${it.videoId}`,
              categoryId: draft.categoryId as DreamAcademyCategoryId,
              order: (idx * 100000) + (page * 1000) + it.order,
              isActive: true,
              title: it.title,
              resolvedTitle: it.title,
              resolvedDescription: it.description,
              durationSec: it.durationSec,
              channelTitle: it.channelTitle,
              thumbnailUrl: it.thumbnailUrl,
              videoId: it.videoId,
              playlistId: data.playlistId,
              createdBy: user?.uid || 'system',
              createdAt: new Date(),
            };
            await addDoc(collection(db, 'dream_academy_sources'), payload as any);
            importedVideosCount++;
          }

          nextItems = data.nextPageToken;
          page++;
        } while (nextItems);
      }

      await fetchSources(true);
      setShowAddModal(false);
      toast.success(`تم الاستيراد: ${allPlaylists.length} قائمة - ${importedVideosCount} فيديو`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'فشل استيراد التشانل');
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id || !window.confirm('هل أنت متأكد من الحذف؟')) return;
    try {
      await deleteDoc(doc(db, 'dream_academy_sources', id));
      await fetchSources(true);
      toast.success('تم الحذف بنجاح');
    } catch {
      toast.error('فشل الحذف');
    }
  };

  const toggleActive = async (s: DreamAcademySource) => {
    if (!s.id) return;
    try {
      await updateDoc(doc(db, 'dream_academy_sources', s.id), { isActive: !s.isActive });
      await fetchSources(true);
      toast.success(s.isActive ? 'تم التعطيل' : 'تم التفعيل');
    } catch {
      toast.error('حدث خطأ');
    }
  };

  const updateOrder = async (s: DreamAcademySource, delta: number) => {
    if (!s.id) return;
    try {
      const newOrder = (s.order || 0) + delta;
      await updateDoc(doc(db, 'dream_academy_sources', s.id), { order: newOrder });
      await fetchSources(true);
    } catch { }
  };

  const openPreview = (s: DreamAcademySource) => {
    let url: string | null = null;
    const ensurePlaylistId = (raw?: string | null) => {
      try {
        if (!raw) return undefined;
        const u = new URL(raw);
        return u.searchParams.get('list') || undefined;
      } catch { return undefined; }
    };
    const playlistId = s.playlistId || ensurePlaylistId(s.url);
    if (s.sourceType === 'playlist' && playlistId) {
      url = `https://www.youtube.com/embed?listType=playlist&list=${playlistId}`;
    } else if (s.videoId) {
      url = `https://www.youtube.com/watch?v=${s.videoId}`;
    } else if (s.url) {
      url = s.url;
    }
    setPreviewUrl(url);
    setPreviewItem(s);
    setPreviewOpen(true);
  };

  const uniqueCategories = useMemo(() => {
    return Array.from(new Map(dynamicCategories.map(c => [c.id, c])).values());
  }, [dynamicCategories]);

  return (
    <AccountTypeProtection allowedTypes={["admin"]}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-50 p-6" dir="rtl">
        <div className="max-w-[1600px] mx-auto space-y-8">

          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-indigo-600 rounded-lg shadow-lg">
                  <Library className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">إدارة مكتبة الحلم</h1>
              </div>
              <p className="text-slate-500 font-medium">إدارة وتنسيق المحتوى التعليمي والفيديوهات في الأكاديمية</p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => fetchSources()}
                className="bg-white hover:bg-slate-50"
                disabled={loading || refreshing}
              >
                <RefreshCw className={`w-4 h-4 ml-2 ${refreshing ? 'animate-spin' : ''}`} />
                تحديث
              </Button>
              <Button
                onClick={() => setShowAddModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all gap-2"
              >
                <Plus className="w-5 h-5" />
                إضافة محتوى جديد
              </Button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'إجمالي المحتوى', value: stats.total, icon: Video, color: 'text-indigo-600', bg: 'bg-indigo-100/50' },
              { label: 'المحتوى النشط', value: stats.active, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100/50' },
              { label: 'قوائم التشغيل', value: stats.playlists, icon: Layers, color: 'text-purple-600', bg: 'bg-purple-100/50' },
              { label: 'فيديوهات فردية', value: stats.videos, icon: Play, color: 'text-blue-600', bg: 'bg-blue-100/50' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm overflow-hidden group hover:shadow-md transition-shadow">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
                      <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Filters & Search */}
          <Card className="border-none shadow-sm bg-white/70 backdrop-blur-md sticky top-6 z-30">
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-col lg:flex-row gap-4 items-center">
                <div className="relative flex-1 group">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  <Input
                    placeholder="ابحث بالعنوان، اسم القناة أو الرابط..."
                    className="pr-10 bg-white/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all h-11"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 p-1 bg-slate-100/50 rounded-lg">
                    <Button
                      variant={filterType === 'all' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setFilterType('all')}
                      className={filterType === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'}
                    >الكل</Button>
                    <Button
                      variant={filterType === 'video' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setFilterType('video')}
                      className={filterType === 'video' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}
                    >فيديوهات</Button>
                    <Button
                      variant={filterType === 'playlist' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setFilterType('playlist')}
                      className={filterType === 'playlist' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-600'}
                    >قوائم</Button>
                  </div>

                  <div className="h-6 w-px bg-slate-200 mx-1" />

                  <div className="flex items-center gap-1.5 p-1 bg-slate-100/50 rounded-lg">
                    <Button
                      variant={filterStatus === 'all' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setFilterStatus('all')}
                      className={filterStatus === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}
                    >الكل</Button>
                    <Button
                      variant={filterStatus === 'active' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setFilterStatus('active')}
                      className={filterStatus === 'active' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600'}
                    >نشط</Button>
                    <Button
                      variant={filterStatus === 'inactive' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setFilterStatus('inactive')}
                      className={filterStatus === 'inactive' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600'}
                    >معطل</Button>
                  </div>

                  <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v as any)}>
                    <SelectTrigger className="w-[180px] bg-white h-11 border-slate-200">
                      <SelectValue placeholder="كل الفئات" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الفئات</SelectItem>
                      {uniqueCategories.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Bulk Actions Bar */}
              <AnimatePresence>
                {selectedIds.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap items-center gap-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={allVisibleSelected}
                          onCheckedChange={toggleSelectAllVisible}
                          className="border-indigo-400 data-[state=checked]:bg-indigo-600"
                        />
                        <span className="text-sm font-semibold text-indigo-900">
                          {selectedIds.length} عنصر محدد
                        </span>
                      </div>

                      <div className="h-4 w-px bg-indigo-200 mx-2" />

                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => bulkSetActive(true)} className="bg-white text-emerald-600 hover:bg-emerald-50 border-emerald-100 gap-1.5">
                          <CheckCircle className="w-4 h-4" /> تفعيل
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => bulkSetActive(false)} className="bg-white text-orange-600 hover:bg-orange-50 border-orange-100 gap-1.5">
                          <XCircle className="w-4 h-4" /> تعطيل
                        </Button>

                        <div className="flex items-center gap-2">
                          <Select onValueChange={(v) => bulkChangeCategory(v as any)}>
                            <SelectTrigger className="h-8 w-44 bg-white border-indigo-100">
                              <SelectValue placeholder="نقل إلى فئة..." />
                            </SelectTrigger>
                            <SelectContent>
                              {uniqueCategories.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button size="sm" variant="destructive" onClick={bulkDelete} className="gap-1.5 shadow-sm">
                          <Trash2 className="w-4 h-4" /> حذف
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Library Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[16/14] bg-slate-200/50 animate-pulse rounded-2xl" />
              ))
            ) : filteredSources.length === 0 ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
                <Search className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-xl font-medium">لم يتم العثور على أي محتوى</p>
                <p className="text-sm">حاول تغيير فلاتر البحث أو إضافة محتوى جديد</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredSources.map((s, idx) => (
                  <motion.div
                    key={s.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="group relative border-none shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden bg-white/80 rounded-2xl ring-1 ring-slate-200/50">
                      {/* Media Context Overlay */}
                      <div className="relative aspect-video overflow-hidden">
                        <img
                          src={s.thumbnailUrl || 'https://placehold.co/600x400/indigo/white?text=No+Preview'}
                          alt={s.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />

                        {/* Status/Type Badges */}
                        <div className="absolute top-3 right-3 flex flex-col gap-2">
                          <Badge className={`${s.isActive ? 'bg-emerald-500/90' : 'bg-slate-500/90'} text-white border-none backdrop-blur-md`}>
                            {s.isActive ? 'نشط' : 'معطل'}
                          </Badge>
                          <Badge className={`${s.sourceType === 'playlist' ? 'bg-purple-600/90' : 'bg-blue-600/90'} text-white border-none backdrop-blur-md`}>
                            {s.sourceType === 'playlist' ? 'قائمة تشغيل' : 'فيديو فردي'}
                          </Badge>
                        </div>

                        {/* Checkbox Overlay */}
                        <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Checkbox
                            checked={selectedIds.includes(s.id!)}
                            onCheckedChange={() => toggleSelect(s.id)}
                            className="w-5 h-5 bg-white border-none data-[state=checked]:bg-indigo-600"
                          />
                        </div>

                        {/* Play Button Icon */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-300 cursor-pointer" onClick={() => openPreview(s)}>
                          <div className="p-4 bg-white/20 backdrop-blur-xl rounded-full border border-white/30 text-white shadow-2xl">
                            <Play className="w-8 h-8 fill-current" />
                          </div>
                        </div>

                        {/* Meta Bottom Left */}
                        {s.durationSec ? (
                          <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md text-white text-[10px] rounded-md font-medium">
                            {Math.round(s.durationSec / 60)}د
                          </div>
                        ) : s.itemCount ? (
                          <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-indigo-600/80 backdrop-blur-md text-white text-[10px] rounded-md font-medium flex items-center gap-1">
                            <Layers className="w-3 h-3" /> {s.itemCount} فيديو
                          </div>
                        ) : null}
                      </div>

                      <CardContent className="p-4 space-y-3">
                        {/* Title & Category */}
                        <div>
                          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">
                            {dynamicCategories.find(c => c.id === s.categoryId)?.title || s.categoryId}
                          </p>
                          <h3 className="font-bold text-slate-900 line-clamp-2 leading-snug h-10 group-hover:text-indigo-600 transition-colors">
                            {s.title || s.resolvedTitle || 'بدون عنوان'}
                          </h3>
                        </div>

                        {/* Source Info */}
                        <div className="flex items-center justify-between gap-2 overflow-hidden">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                              <Youtube className="w-3.5 h-3.5 text-red-600" />
                            </div>
                            <span className="text-xs text-slate-500 truncate font-medium">{s.channelTitle || 'قناة غير معروفة'}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="flex flex-col items-center">
                              <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-slate-100" onClick={() => updateOrder(s, -1)}>
                                <ArrowUp className="w-3 h-3 text-slate-400" />
                              </Button>
                              <span className="text-[10px] font-bold text-slate-400">{s.order || 0}</span>
                              <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-slate-100" onClick={() => updateOrder(s, 1)}>
                                <ArrowDown className="w-3 h-3 text-slate-400" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                            <BarChart3 className="w-3.5 h-3.5" />
                            {statsMap[s.id!]?.views?.toLocaleString() || 0}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                            <Sparkles className="w-3.5 h-3.5" />
                            {statsMap[s.id!]?.likes?.toLocaleString() || 0}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-none rounded-xl text-xs gap-1.5"
                            onClick={() => openPreview(s)}
                          >
                            <Play className="w-3.5 h-3.5" /> استعراض
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="rounded-xl border border-slate-100 text-slate-400 hover:text-slate-900">
                                <Command className="w-3.5 h-3.5 ml-1.5" /> خيارات
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>إدارة المحتوى</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => toggleActive(s)}>
                                {s.isActive ? (
                                  <><XCircle className="w-4 h-4 ml-2 text-orange-500" /> تعطيل</>
                                ) : (
                                  <><CheckCircle className="w-4 h-4 ml-2 text-emerald-500" /> تفعيل</>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => copyToClipboard(s.url)}>
                                <Copy className="w-4 h-4 ml-2" /> نسخ الرابط
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.open(s.url, '_blank')}>
                                <ExternalLink className="w-4 h-4 ml-2" /> فتح في يوتيوب
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(s.id)} className="text-red-600 focus:text-red-700 focus:bg-red-50">
                                <Trash2 className="w-4 h-4 ml-2" /> حذف النهائي
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Add Content Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="max-w-xl p-0 overflow-hidden bg-white/95 backdrop-blur-xl border-none shadow-2xl rounded-3xl" dir="rtl">
            <div className="p-8 bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Plus className="w-6 h-6" />
                </div>
                <DialogTitle className="text-2xl font-bold">إضافة محتوى جديد</DialogTitle>
              </div>
              <DialogDescription className="text-indigo-100 text-sm opacity-90">قم بإضافة فيديو فردي أو قائمة تشغيل كاملة من يوتيوب</DialogDescription>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    الرابط <Youtube className="w-4 h-4 text-red-600" />
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://youtube.com/watch?v=..."
                      value={draft.url || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const isPlaylist = /(?:youtube\.com\/playlist\?|[?&]list=)/.test(val);
                        setDraft((d) => ({ ...d, url: val, sourceType: isPlaylist ? 'playlist' : d.sourceType }));
                      }}
                      className="h-12 border-slate-200 focus:ring-indigo-500 rounded-xl"
                    />
                    <Button
                      variant="outline"
                      className="h-12 px-6 rounded-xl border-slate-200 hover:bg-slate-50 gap-2"
                      onClick={resolveMeta}
                      disabled={importing}
                    >
                      {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      جلب
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">نوع المحتوى</label>
                    <Select
                      value={draft.sourceType}
                      onValueChange={(v) => setDraft((d) => ({ ...d, sourceType: v as any }))}
                    >
                      <SelectTrigger className="h-12 border-slate-200 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="video">فيديو فردي</SelectItem>
                        <SelectItem value="playlist">قائمة تشغيل</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">الفئة</label>
                    <Select
                      value={draft.categoryId}
                      onValueChange={(v) => setDraft((d) => ({ ...d, categoryId: v as DreamAcademyCategoryId }))}
                    >
                      <SelectTrigger className="h-12 border-slate-200 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueCategories.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {draft.resolvedTitle && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex gap-4 items-start"
                  >
                    {draft.thumbnailUrl && <img src={draft.thumbnailUrl} className="w-24 aspect-video rounded-lg object-cover shadow-sm" alt="thumb" />}
                    <div className="flex-1 space-y-1">
                      <p className="text-xs font-bold text-indigo-600 uppercase tracking-tighter">{draft.channelTitle}</p>
                      <p className="text-sm font-bold text-slate-900 line-clamp-1">{draft.resolvedTitle}</p>
                      <div className="flex items-center gap-3 mt-2">
                        {typeof draft.durationSec === 'number' && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-white border rounded text-slate-500">
                            {Math.round(draft.durationSec / 60)} دقيقة
                          </span>
                        )}
                        {typeof draft.itemCount === 'number' && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-indigo-600">
                            {draft.itemCount} فيديو
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  className="h-12 w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg hover:shadow-indigo-300 transition-all font-bold gap-2"
                  onClick={handleAdd}
                  disabled={importing || !draft.url}
                >
                  <Save className="w-5 h-5" />
                  حفظ وإضافة للمكتبة
                </Button>

                {draft.sourceType === 'playlist' && (
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      variant="ghost"
                      onClick={handleImportPlaylist}
                      disabled={importing || !apiKeyPresent}
                      className="h-12 w-full text-blue-600 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 rounded-xl gap-2 font-medium"
                    >
                      <ListPlus className="w-5 h-5" /> استيراد كل فيديوهات القائمة
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleImportChannelPlaylists}
                      disabled={importing || !apiKeyPresent}
                      className="h-12 w-full text-purple-600 bg-purple-50/50 hover:bg-purple-50 border border-purple-100 rounded-xl gap-2 font-medium"
                    >
                      <Library className="w-5 h-5" /> استيراد جميع قوائم تشغيل القناة
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Video Preview Modal */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <AnimatePresence>
            {previewOpen && (
              <DialogContent className="max-w-5xl p-0 gap-0 overflow-hidden bg-black/95 border-none shadow-3xl rounded-3xl" dir="rtl">
                <DialogTitle className="sr-only">معاينة فيديو الأكاديمية</DialogTitle>
                <DialogDescription className="sr-only">عرض مشغل الفيديو وتفاصيل المحتوى المحدد</DialogDescription>

                <div className="grid grid-cols-1 lg:grid-cols-4 h-[70vh] lg:h-[600px]">
                  {/* Player Side */}
                  <div className="lg:col-span-3 bg-black flex items-center justify-center relative group">
                    {previewUrl ? (
                      <div className="w-full h-full relative">
                        <ReactPlayer
                          url={previewUrl}
                          width="100%"
                          height="100%"
                          controls
                          playing
                          config={{
                            youtube: {
                              embedOptions: {
                                host: 'https://www.youtube-nocookie.com'
                              },
                              playerVars: {
                                rel: 0,
                                origin: window.location.origin,
                                autoplay: 1
                              }
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4 text-slate-500">
                        <AlertCircle className="w-16 h-16 opacity-20" />
                        <p>لا يمكن تشغيل هذا المحتوى</p>
                      </div>
                    )}
                  </div>

                  {/* Sidebar Info */}
                  <div className="p-6 bg-slate-900 text-white overflow-y-auto custom-scrollbar">
                    <div className="space-y-6">
                      <div>
                        <Badge className="bg-indigo-600 mb-3 border-none shadow-sm shadow-indigo-500/50 uppercase tracking-widest text-[10px]">
                          {previewItem && dynamicCategories.find(c => c.id === previewItem.categoryId)?.title || 'تعليمي'}
                        </Badge>
                        <h2 className="text-xl font-bold leading-tight mb-2">{previewItem?.title || previewItem?.resolvedTitle || 'بدون عنوان'}</h2>
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                          <Youtube className="w-4 h-4 text-red-500" />
                          {previewItem?.channelTitle}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                          <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">المشاهدات</p>
                          <p className="text-lg font-bold">{statsMap[previewItem?.id!]?.views?.toLocaleString() || 0}</p>
                        </div>
                        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                          <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">الإعجابات</p>
                          <p className="text-lg font-bold">{statsMap[previewItem?.id!]?.likes?.toLocaleString() || 0}</p>
                        </div>
                      </div>

                      {previewItem?.resolvedDescription && (
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase mb-2">عن الفيديو</p>
                          <p className="text-sm text-slate-300 leading-relaxed max-h-40 overflow-hidden line-clamp-6">
                            {previewItem.resolvedDescription}
                          </p>
                        </div>
                      )}

                      <div className="pt-6 border-t border-white/10 space-y-3">
                        <Button
                          className="w-full h-11 bg-white hover:bg-slate-100 text-slate-900 rounded-xl shadow-lg font-bold gap-2"
                          onClick={() => window.open(previewItem?.url, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" /> فتح في يوتيوب
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full text-slate-400 hover:text-white hover:bg-white/5 rounded-xl text-xs"
                          onClick={() => setPreviewOpen(false)}
                        >
                          إغلاق المعاينة
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            )}
          </AnimatePresence>
        </Dialog>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </AccountTypeProtection>
  );
}
