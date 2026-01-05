'use client';

import UnifiedMediaModal from '@/components/admin/media/UnifiedMediaModal';
import StatusBadge from '@/components/admin/videos/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { actionLogService } from '@/lib/admin/action-logs';
import { useAuth } from '@/lib/firebase/auth-provider';
import { db } from '@/lib/firebase/config';
import { cleanPhoneNumber } from '@/lib/utils/whatsapp-share';
import { collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import {
  CheckCircle,
  XCircle,
  Flag,
  Play,
  Search,
  Trash2,
  User,
  Video,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Activity,
  TrendingUp,
  Keyboard,
  Layers,
  Grid3X3,
  List as ListIcon,
  Eye,
  Star,
  MessageSquare,
  Phone,
  Calendar,
  BarChart3,
  Target,
  FileVideo,
  Image as ImageIconAlt,
  Zap,
  Clock,
  CheckSquare,
  Filter
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import ReactPlayer from 'react-player';

// Types
interface MediaData {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnailUrl?: string;
  uploadDate: any;
  userId: string;
  userEmail: string;
  userName: string;
  accountType: string;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  views: number;
  likes: number;
  comments: number;
  phone?: string;
  sourceType?: 'youtube' | 'supabase' | 'external' | 'firebase';
  imageType?: 'profile' | 'cover' | 'additional' | 'avatar' | 'unknown';
}

type ViewMode = 'queue' | 'grid' | 'list';
type MediaType = 'videos' | 'images';

export default function ModernMediaReviewPage() {
  const { user, userData } = useAuth();

  // State Management
  const [activeTab, setActiveTab] = useState<MediaType>('videos');
  const [viewMode, setViewMode] = useState<ViewMode>('queue');
  const [selectedMedia, setSelectedMedia] = useState<MediaData | null>(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data
  const [videos, setVideos] = useState<MediaData[]>([]);
  const [images, setImages] = useState<MediaData[]>([]);

  // Fetch Media - Placeholder (replace with actual fetch logic)
  useEffect(() => {
    const fetchMedia = async () => {
      setLoading(true);
      try {
        // TODO: Implement actual fetching from R2/Firebase
        // For now, using empty arrays
        setVideos([]);
        setImages([]);
      } catch (error) {
        console.error('Error fetching media:', error);
        toast.error('خطأ في تحميل الوسائط');
      } finally {
        setLoading(false);
      }
    };

    fetchMedia();
  }, [activeTab]);

  const currentMediaList = activeTab === 'videos' ? videos : images;

  // Filtered Media
  const filteredMedia = useMemo(() => {
    return currentMediaList.filter(item => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesSearch = !searchTerm ||
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.userName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [currentMediaList, statusFilter, searchTerm]);

  // Auto-select first item in queue mode
  useEffect(() => {
    if (viewMode === 'queue' && filteredMedia.length > 0 && !selectedMedia) {
      setSelectedMedia(filteredMedia[0]);
      setCurrentIndex(0);
    }
  }, [filteredMedia, viewMode, selectedMedia]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!selectedMedia || viewMode !== 'queue') return;

      if ((e.target as HTMLElement).tagName === 'INPUT' ||
        (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      switch (e.key.toLowerCase()) {
        case 'a':
          handleQuickApprove();
          break;
        case 'r':
          handleQuickReject();
          break;
        case 'f':
          handleQuickFlag();
          break;
        case 'n':
        case 'arrowright':
          handleNext();
          break;
        case 'p':
        case 'arrowleft':
          handlePrevious();
          break;
        case '?':
          setShowKeyboardHelp(!showKeyboardHelp);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedMedia, viewMode, showKeyboardHelp]);

  // Actions
  const handleQuickApprove = useCallback(async () => {
    if (!selectedMedia) return;
    try {
      // TODO: Implement actual approval in Firebase
      toast.success(`تمت الموافقة على ${selectedMedia.title}`);
      handleNext();
    } catch (error) {
      toast.error('حدث خطأ أثناء الموافقة');
    }
  }, [selectedMedia]);

  const handleQuickReject = useCallback(async () => {
    if (!selectedMedia) return;
    try {
      // TODO: Implement actual rejection in Firebase
      toast.error(`تم رفض ${selectedMedia.title}`);
      handleNext();
    } catch (error) {
      toast.error('حدث خطأ أثناء الرفض');
    }
  }, [selectedMedia]);

  const handleQuickFlag = useCallback(async () => {
    if (!selectedMedia) return;
    try {
      // TODO: Implement actual flagging in Firebase
      toast(`تم وضع علامة على ${selectedMedia.title}`, { icon: '🚩' });
      handleNext();
    } catch (error) {
      toast.error('حدث خطأ');
    }
  }, [selectedMedia]);

  const handleNext = useCallback(() => {
    if (currentIndex < filteredMedia.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setSelectedMedia(filteredMedia[nextIndex]);
    }
  }, [currentIndex, filteredMedia]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      setSelectedMedia(filteredMedia[prevIndex]);
    }
  }, [currentIndex, filteredMedia]);

  // Stats
  const stats = useMemo(() => ({
    total: currentMediaList.length,
    pending: currentMediaList.filter(m => m.status === 'pending').length,
    approved: currentMediaList.filter(m => m.status === 'approved').length,
    rejected: currentMediaList.filter(m => m.status === 'rejected').length,
    progress: currentMediaList.length > 0
      ? Math.round((currentMediaList.filter(m => m.status !== 'pending').length / currentMediaList.length) * 100)
      : 0
  }), [currentMediaList]);

  const formatDate = (date: any) => {
    if (!date) return 'غير محدد';
    try {
      const d = date?.toDate ? date.toDate() : new Date(date);
      return d.toLocaleDateString('ar-EG', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'تاريخ غير صحيح';
    }
  };

  // Check permissions
  const isAdmin = userData?.accountType === 'admin' || userData?.role === 'admin';

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <User className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">غير مصرح لك بالوصول</h3>
          <p className="text-gray-600">يجب تسجيل الدخول أولاً</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <User className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">غير مصرح لك بالوصول</h3>
          <p className="text-gray-600">هذه الصفحة مخصصة للمديرين فقط</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-7 h-7 text-blue-600" />
                  مركز تحليل الأداء الرياضي
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  مراجعة وتحليل الوسائط الرياضية
                </p>
              </div>

              <div className="h-12 w-px bg-slate-200" />

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MediaType)} className="w-auto">
                <TabsList className="grid grid-cols-2 h-10 bg-slate-100">
                  <TabsTrigger value="videos" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                    <FileVideo className="w-4 h-4" />
                    فيديوهات ({videos.length})
                  </TabsTrigger>
                  <TabsTrigger value="images" className="flex items-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                    <ImageIconAlt className="w-4 h-4" />
                    صور ({images.length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex items-center gap-4">
              <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-xs text-slate-500">التقدم اليومي</p>
                      <p className="text-lg font-bold text-slate-900">{stats.progress}%</p>
                    </div>
                  </div>
                  <div className="w-px h-8 bg-blue-200" />
                  <div className="flex gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">معلق</p>
                      <p className="font-bold text-amber-600">{stats.pending}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">مُوافق</p>
                      <p className="font-bold text-green-600">{stats.approved}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
                className="gap-2"
              >
                <Keyboard className="w-4 h-4" />
                اختصارات
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="max-w-[1920px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">وضع العرض:</span>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'queue' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('queue')}
                className="gap-2"
              >
                <Layers className="w-4 h-4" />
                طابور المراجعة
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <ListIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="بحث سريع..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 w-64"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="pending">في الانتظار</SelectItem>
                <SelectItem value="approved">موافق عليها</SelectItem>
                <SelectItem value="rejected">مرفوضة</SelectItem>
                <SelectItem value="flagged">معلّمة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-[600px]">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-600">جاري التحميل...</p>
            </div>
          </div>
        ) : viewMode === 'queue' ? (
          <QueueView
            media={selectedMedia}
            mediaList={filteredMedia}
            currentIndex={currentIndex}
            onSelectMedia={(media, index) => {
              setSelectedMedia(media);
              setCurrentIndex(index);
            }}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onApprove={handleQuickApprove}
            onReject={handleQuickReject}
            onFlag={handleQuickFlag}
            formatDate={formatDate}
            mediaType={activeTab}
          />
        ) : viewMode === 'grid' ? (
          <GridView
            mediaList={filteredMedia}
            onSelectMedia={setSelectedMedia}
            formatDate={formatDate}
            mediaType={activeTab}
          />
        ) : (
          <ListView
            mediaList={filteredMedia}
            onSelectMedia={setSelectedMedia}
            formatDate={formatDate}
            mediaType={activeTab}
          />
        )}
      </div>

      {/* Keyboard Help Modal */}
      {showKeyboardHelp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowKeyboardHelp(false)}>
          <Card className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Keyboard className="w-6 h-6 text-blue-600" />
                اختصارات لوحة المفاتيح
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <KeyboardShortcut keys={['A']} description="موافقة سريعة" />
                <KeyboardShortcut keys={['R']} description="رفض سريع" />
                <KeyboardShortcut keys={['F']} description="وضع علامة" />
                <KeyboardShortcut keys={['N', '→']} description="التالي" />
                <KeyboardShortcut keys={['P', '←']} description="السابق" />
                <KeyboardShortcut keys={['?']} description="عرض المساعدة" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Queue View Component
function QueueView({ media, mediaList, currentIndex, onSelectMedia, onNext, onPrevious, onApprove, onReject, onFlag, formatDate, mediaType }: any) {
  if (!media) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center">
          <Activity className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">لا توجد وسائط للمراجعة</p>
          <p className="text-sm text-slate-400 mt-2">جميع الوسائط تمت مراجعتها ✓</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-280px)]">
      {/* Media List Sidebar */}
      <div className="col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            قائمة المراجعة ({mediaList.length})
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            العنصر {currentIndex + 1} من {mediaList.length}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {mediaList.map((item: MediaData, index: number) => (
            <div
              key={item.id}
              onClick={() => onSelectMedia(item, index)}
              className={`p-3 border-b border-slate-100 cursor-pointer transition-all ${item.id === media.id
                  ? 'bg-blue-50 border-r-4 border-r-blue-600'
                  : 'hover:bg-slate-50'
                }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-16 h-16 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 ${item.id === media.id ? 'ring-2 ring-blue-600' : ''
                  }`}>
                  {mediaType === 'videos' ? (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600">
                      <Video className="w-6 h-6 text-white" />
                    </div>
                  ) : (
                    <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{item.userName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadgeMini status={item.status} />
                    <span className="text-xs text-slate-400">{formatDate(item.uploadDate)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="col-span-6 bg-slate-900 rounded-xl overflow-hidden shadow-2xl flex flex-col">
        <div className="flex-1 flex items-center justify-center p-8 relative">
          {mediaType === 'videos' ? (
            <div className="w-full h-full rounded-lg overflow-hidden">
              <ReactPlayer
                url={media.url}
                width="100%"
                height="100%"
                controls
                config={{
                  youtube: { playerVars: { modestbranding: 1 } }
                }}
              />
            </div>
          ) : (
            <img
              src={media.url}
              alt={media.title}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
          )}
        </div>

        <div className="p-4 bg-slate-800 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <Button
              onClick={onPrevious}
              disabled={currentIndex === 0}
              variant="ghost"
              className="text-white hover:bg-slate-700"
            >
              <ChevronRight className="w-5 h-5 ml-2" />
              السابق
            </Button>

            <div className="flex gap-2">
              <Button
                onClick={onApprove}
                className="bg-green-600 hover:bg-green-700 text-white gap-2 px-6"
              >
                <CheckCircle className="w-5 h-5" />
                موافقة
                <kbd className="hidden lg:inline-block px-2 py-0.5 text-xs bg-green-700 rounded">A</kbd>
              </Button>
              <Button
                onClick={onReject}
                variant="destructive"
                className="gap-2 px-6"
              >
                <XCircle className="w-5 h-5" />
                رفض
                <kbd className="hidden lg:inline-block px-2 py-0.5 text-xs bg-red-700 rounded">R</kbd>
              </Button>
              <Button
                onClick={onFlag}
                variant="outline"
                className="border-amber-500 text-amber-500 hover:bg-amber-50"
              >
                <Flag className="w-5 h-5" />
              </Button>
            </div>

            <Button
              onClick={onNext}
              disabled={currentIndex === mediaList.length - 1}
              variant="ghost"
              className="text-white hover:bg-slate-700"
            >
              التالي
              <ChevronLeft className="w-5 h-5 mr-2" />
            </Button>
          </div>
        </div>
      </div>

      {/* Details Panel */}
      <div className="col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            تحليل الأداء
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <Card className="border-blue-100 bg-blue-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                  {media.userName.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{media.userName}</p>
                  <p className="text-xs text-slate-500">{media.accountType}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4" />
                  {formatDate(media.uploadDate)}
                </div>
                {media.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4" />
                    {media.phone}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-2">
            <Card>
              <CardContent className="p-3 text-center">
                <Eye className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-slate-900">{media.views}</p>
                <p className="text-xs text-slate-500">مشاهدة</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <Star className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-slate-900">{media.likes}</p>
                <p className="text-xs text-slate-500">إعجاب</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <MessageSquare className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-slate-900">{media.comments}</p>
                <p className="text-xs text-slate-500">تعليق</p>
              </CardContent>
            </Card>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-2">الوصف</h4>
            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
              {media.description || 'لا يوجد وصف'}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-2">إجراءات سريعة</h4>
            <div className="flex flex-col gap-2">
              <Button variant="outline" size="sm" className="justify-start gap-2">
                <MessageSquare className="w-4 h-4" />
                إرسال ملاحظات
              </Button>
              <Button variant="outline" size="sm" className="justify-start gap-2">
                <Target className="w-4 h-4" />
                إضافة تقييم
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Grid & List Views
function GridView({ mediaList, onSelectMedia, formatDate, mediaType }: any) {
  if (mediaList.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center">
          <Filter className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">لا توجد نتائج</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {mediaList.map((item: MediaData) => (
        <Card
          key={item.id}
          className="group hover:shadow-xl transition-all cursor-pointer border-2 hover:border-blue-400"
          onClick={() => onSelectMedia(item)}
        >
          <div className="aspect-video bg-slate-100 relative overflow-hidden">
            {mediaType === 'videos' ? (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600">
                <Video className="w-12 h-12 text-white" />
              </div>
            ) : (
              <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
            )}
            <div className="absolute top-2 right-2">
              <StatusBadgeMini status={item.status} />
            </div>
          </div>
          <CardContent className="p-3">
            <p className="font-medium text-sm text-slate-900 truncate">{item.title}</p>
            <p className="text-xs text-slate-500 truncate">{item.userName}</p>
            <p className="text-xs text-slate-400 mt-1">{formatDate(item.uploadDate)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ListView({ mediaList, onSelectMedia, formatDate, mediaType }: any) {
  if (mediaList.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center">
          <Filter className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">لا توجد نتائج</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {mediaList.map((item: MediaData) => (
        <Card
          key={item.id}
          className="hover:shadow-md transition-all cursor-pointer border hover:border-blue-400"
          onClick={() => onSelectMedia(item)}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-24 h-16 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
              {mediaType === 'videos' ? (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600">
                  <Video className="w-6 h-6 text-white" />
                </div>
              ) : (
                <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 truncate">{item.title}</p>
              <p className="text-sm text-slate-500 truncate">{item.userName}</p>
            </div>

            <div className="flex items-center gap-4">
              <StatusBadgeMini status={item.status} />
              <div className="text-right">
                <p className="text-sm text-slate-600">{formatDate(item.uploadDate)}</p>
                <p className="text-xs text-slate-400">{item.accountType}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StatusBadgeMini({ status }: { status: string }) {
  const styles = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    approved: 'bg-green-100 text-green-700 border-green-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
    flagged: 'bg-orange-100 text-orange-700 border-orange-200'
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${styles[status as keyof typeof styles] || styles.pending}`}>
      {status === 'pending' ? 'معلق' : status === 'approved' ? 'موافق' : status === 'rejected' ? 'مرفوض' : 'معلّم'}
    </span>
  );
}

function KeyboardShortcut({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
      <span className="text-sm text-slate-700">{description}</span>
      <div className="flex gap-1">
        {keys.map((key, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-slate-400 mx-1">أو</span>}
            <kbd className="px-3 py-1 bg-white border border-slate-300 rounded shadow-sm text-sm font-mono">
              {key}
            </kbd>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
