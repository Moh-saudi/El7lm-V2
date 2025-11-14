'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
   Plus, 
   Edit, 
   Trash2, 
   Eye, 
   EyeOff, 
   Image, 
   Video, 
   FileText,
   Calendar,
   Users,
   Target,
   BarChart3,
   Save,
   X,
   Clock,
   AlertCircle,
   TrendingUp,
   CheckCircle,
   Info,
   Gift,
   Zap,
   Settings,
   ExternalLink,
   Upload
 } from 'lucide-react';
import { useAccountTypeAuth } from '@/hooks/useAccountTypeAuth';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdAnalytics from '@/components/ads/AdAnalytics';
import AdFileUpload from '@/components/ads/AdFileUpload';
import { ensureAdsBucketExists, getAdsStorageStats } from '@/lib/supabase/ads-storage';

interface Ad {
  id?: string;
  title: string;
  description: string;
  type: 'video' | 'image' | 'text';
  mediaUrl?: string;
  ctaText?: string;
  ctaUrl?: string;
  customUrl?: string;
  isActive: boolean;
  priority: number;
  targetAudience: 'all' | 'new_users' | 'returning_users';
  startDate?: string;
  endDate?: string;
  createdAt: Date;
  updatedAt: Date;
  views: number;
  clicks: number;
  // Display location - where the ad should appear
  displayLocation?: 'landing' | 'dashboard' | 'player' | 'club' | 'academy' | 'trainer' | 'agent' | 'admin' | 'all';
  // New popup-specific fields
  popupType: 'modal' | 'toast' | 'banner' | 'side-panel';
  displayDelay: number; // seconds
  maxDisplays: number;
  displayFrequency: 'once' | 'daily' | 'weekly' | 'always';
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  showCloseButton: boolean;
  autoClose?: number; // seconds
  showProgressBar: boolean;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  discount?: string;
  countdown?: string;
}

export default function AdminAdsPage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [previewAd, setPreviewAd] = useState<Ad | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [bucketStatus, setBucketStatus] = useState<'checking' | 'exists' | 'missing'>('checking');
  const [storageStats, setStorageStats] = useState<{
    totalFiles: number;
    totalSize: number;
    imagesCount: number;
    videosCount: number;
  } | null>(null);
  
  const [formData, setFormData] = useState<Partial<Ad>>({
    title: '',
    description: '',
    type: 'text',
    mediaUrl: '',
    ctaText: '',
     ctaUrl: '',
     customUrl: '',
    isActive: true,
    priority: 1,
    targetAudience: 'new_users',
    displayLocation: 'all', // Default: show everywhere
    startDate: '',
    endDate: '',
    // New popup fields
    popupType: 'modal',
    displayDelay: 3,
    maxDisplays: 1,
    displayFrequency: 'once',
    showCloseButton: true,
    autoClose: 0,
    showProgressBar: false,
    urgency: 'medium',
    discount: '',
    countdown: ''
  });

  const stats = [
    {
      title: "إجمالي الإعلانات",
      value: ads.length.toString(),
      icon: BarChart3,
      color: "text-blue-600"
    },
    {
      title: "الإعلانات النشطة",
      value: ads.filter(ad => ad.isActive).length.toString(),
      icon: Eye,
      color: "text-green-600"
    },
    {
      title: "إجمالي المشاهدات",
      value: ads.reduce((sum, ad) => sum + ad.views, 0).toString(),
      icon: Users,
      color: "text-purple-600"
    },
    {
      title: "إجمالي النقرات",
      value: ads.reduce((sum, ad) => sum + ad.clicks, 0).toString(),
      icon: Target,
      color: "text-orange-600"
    }
  ];

  const { isAuthorized, isCheckingAuth } = useAccountTypeAuth({ allowedTypes: ['admin'] });

  useEffect(() => {
    fetchAds();
    checkBucketStatus();
  }, []);

  const checkBucketStatus = async () => {
    try {
      const exists = await ensureAdsBucketExists();
      setBucketStatus(exists ? 'exists' : 'missing');
      
      if (exists) {
        const stats = await getAdsStorageStats();
        setStorageStats(stats);
      }
    } catch (error) {
      console.error('Error checking bucket status:', error);
      setBucketStatus('missing');
    }
  };

  const fetchAds = async () => {
    try {
      const q = query(collection(db, 'ads'), orderBy('priority', 'asc'));
      const snapshot = await getDocs(q);
      const adsData: Ad[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        views: doc.data().views || 0,
        clicks: doc.data().clicks || 0
      })) as Ad[];
      setAds(adsData);
    } catch (error) {
      console.error('Error fetching ads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Handle custom URL logic
      let finalCtaUrl = formData.ctaUrl;
      if (formData.ctaUrl === 'custom' && formData.customUrl) {
        // Validate custom URL
        if (!formData.customUrl.startsWith('http://') && !formData.customUrl.startsWith('https://')) {
          alert('يجب أن يبدأ الرابط المخصص بـ http:// أو https://');
          return;
        }
        finalCtaUrl = formData.customUrl;
      }
      
      const adData: Partial<Ad> = {
        ...formData,
        ctaUrl: finalCtaUrl,
        createdAt: editingAd ? editingAd.createdAt : new Date(),
        updatedAt: new Date(),
        views: editingAd?.views || 0,
        clicks: editingAd?.clicks || 0
      };

      if (editingAd?.id) {
        await updateDoc(doc(db, 'ads', editingAd.id), adData);
      } else {
        await addDoc(collection(db, 'ads'), adData);
      }

      setShowAddDialog(false);
      setEditingAd(null);
      resetForm();
      await fetchAds();
    } catch (error) {
      console.error('Error saving ad:', error);
    }
  };

  const handleEdit = (ad: Ad) => {
    setEditingAd(ad);
    
    // Handle custom URL logic for editing
    let ctaUrl = ad.ctaUrl || '';
    let customUrl = '';
    
    // Check if the URL is one of our predefined options
    const predefinedUrls = [
      '/auth/register', '/auth/login', '/dashboard', '/dashboard/player', 
      '/dashboard/club', '/dashboard/academy', '/dashboard/trainer', '/dashboard/agent',
      '/pricing', '/about', '/contact', '/features', '/testimonials', 
      '/blog', '/support', '/careers', '/platform', '/dashboard/dream-academy', 
      '/dashboard/player/referrals'
    ];
    
    if (ctaUrl && !predefinedUrls.includes(ctaUrl)) {
      customUrl = ctaUrl;
      ctaUrl = 'custom';
    }
    
    setFormData({
      title: ad.title,
      description: ad.description,
      type: ad.type,
      mediaUrl: ad.mediaUrl || '',
      ctaText: ad.ctaText || '',
      ctaUrl: ctaUrl,
      customUrl: customUrl,
      isActive: ad.isActive,
      priority: ad.priority,
      targetAudience: ad.targetAudience,
      displayLocation: ad.displayLocation || 'all',
      startDate: ad.startDate || '',
      endDate: ad.endDate || '',
      // Popup fields
      popupType: ad.popupType || 'modal',
      displayDelay: ad.displayDelay || 3,
      maxDisplays: ad.maxDisplays || 1,
      displayFrequency: ad.displayFrequency || 'once',
      showCloseButton: ad.showCloseButton !== false,
      autoClose: ad.autoClose || 0,
      showProgressBar: ad.showProgressBar || false,
      urgency: ad.urgency || 'medium',
      discount: ad.discount || '',
      countdown: ''
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الإعلان؟')) {
      try {
        await deleteDoc(doc(db, 'ads', id));
        await fetchAds();
      } catch (error) {
        console.error('Error deleting ad:', error);
      }
    }
  };

  const toggleActive = async (ad: Ad) => {
    try {
      await updateDoc(doc(db, 'ads', ad.id!), { 
        isActive: !ad.isActive,
        updatedAt: new Date()
      });
      await fetchAds();
    } catch (error) {
      console.error('Error toggling ad status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'text',
      mediaUrl: '',
      ctaText: '',
      ctaUrl: '',
      customUrl: '',
      isActive: true,
      priority: 1,
      targetAudience: 'new_users',
      displayLocation: 'all',
      startDate: '',
      endDate: '',
      // Reset popup fields
      popupType: 'modal',
      displayDelay: 3,
      maxDisplays: 1,
      displayFrequency: 'once',
      showCloseButton: true,
      autoClose: 0,
      showProgressBar: false,
      urgency: 'medium',
      discount: '',
      countdown: ''
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'image': return <Image className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'video': return 'bg-purple-100 text-purple-700';
      case 'image': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getAudienceColor = (audience: string) => {
    switch (audience) {
      case 'new_users': return 'bg-green-100 text-green-700';
      case 'returning_users': return 'bg-orange-100 text-orange-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  if (isCheckingAuth) {
    return null;
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="mb-6">
            {/* تنبيه حالة bucket الإعلانات */}
            {bucketStatus === 'missing' && (
              <div className="mb-4 lg:mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 lg:p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-yellow-800 mb-2">
                      تنبيه: bucket الإعلانات غير موجود
                    </h3>
                    <p className="text-sm text-yellow-700 leading-relaxed">
                      يجب إنشاء bucket باسم "ads" في Supabase Storage لتمكين رفع ملفات الإعلانات.
                      <br />
                      <strong>الخطوات:</strong>
                      <br />
                      1. اذهب إلى Supabase Dashboard
                      <br />
                      2. انتقل إلى Storage
                      <br />
                      3. أنشئ bucket جديد باسم "ads"
                      <br />
                      4. اضبط السياسات للوصول الآمن
                      <br />
                      <br />
                      <strong>ملاحظة مهمة:</strong> تأكد من تشغيل ملف <code className="bg-yellow-100 px-2 py-1 rounded text-xs">supabase-ads-policies-simple.sql</code> 
                      في SQL Editor لإنشاء السياسات البسيطة المطلوبة.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">إدارة الإعلانات</h1>
                <p className="text-gray-600">إدارة الإعلانات المعروضة على صفحة الترحيب</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={() => setShowAnalytics(true)}
                  variant="outline"
                  className="border-purple-300 text-purple-700 hover:bg-purple-100 hover:border-purple-400 hover:text-purple-800 px-4 py-2.5 h-auto transition-all duration-200 shadow-sm hover:shadow-md font-medium"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  التحليلات المتقدمة
                </Button>
                <Button 
                  onClick={() => {
                    setEditingAd(null);
                    resetForm();
                    setShowAddDialog(true);
                  }}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 px-6 py-2.5 h-auto shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة إعلان جديد
                </Button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map((stat, index) => (
              <Card key={index} className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-md bg-white overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-500 mb-2 truncate">{stat.title}</p>
                      <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                    </div>
                    <div className="ml-4 p-3 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 flex-shrink-0">
                      {React.createElement(stat.icon as any, { className: `h-6 w-6 ${stat.color}` })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Storage Stats Card */}
            {bucketStatus === 'exists' && storageStats && (
              <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50 overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-blue-600 mb-2">ملفات التخزين</p>
                      <p className="text-3xl font-bold text-blue-900 mb-2">{storageStats.totalFiles}</p>
                      <div className="text-xs text-blue-600 space-y-0.5">
                        <div className="truncate">الصور: {storageStats.imagesCount}</div>
                        <div className="truncate">الفيديوهات: {storageStats.videosCount}</div>
                        <div className="truncate">الحجم: {(storageStats.totalSize / (1024 * 1024)).toFixed(1)}MB</div>
                      </div>
                    </div>
                    <div className="ml-4 p-3 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-200 flex-shrink-0">
                      <Upload className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Ads Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {loading ? (
              <div className="col-span-full text-center py-12 lg:py-16">
                <div className="w-16 h-16 lg:w-20 lg:h-20 mx-auto mb-4 lg:mb-6 border-4 border-blue-200 rounded-full border-t-blue-600 animate-spin shadow-lg"></div>
                <p className="text-gray-600 text-base lg:text-lg font-medium">جاري تحميل الإعلانات...</p>
                <p className="text-gray-500 text-sm mt-2">يرجى الانتظار قليلاً</p>
              </div>
            ) : ads.length === 0 ? (
              <div className="col-span-full text-center py-12 lg:py-16">
                <div className="w-24 h-24 lg:w-32 lg:h-32 mx-auto mb-4 lg:mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-lg">
                  <BarChart3 className="h-12 w-12 lg:h-16 lg:w-16 text-gray-400" />
                </div>
                <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-2 lg:mb-3">لا توجد إعلانات</h3>
                <p className="text-gray-600 mb-4 lg:mb-6 text-sm lg:text-base">ابدأ بإضافة إعلان جديد لعرضه على العملاء</p>
                <Button 
                  onClick={() => {
                    setEditingAd(null);
                    resetForm();
                    setShowAddDialog(true);
                  }}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 px-6 lg:px-12 py-3 lg:py-4 h-12 lg:h-14 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 text-sm lg:text-base font-semibold"
                >
                  <Plus className="h-5 w-5 lg:h-6 lg:w-6 mr-2" />
                  إضافة إعلان جديد
                </Button>
              </div>
            ) : (
              ads.map((ad) => (
                <Card key={ad.id} className="flex flex-col h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-md bg-white overflow-hidden group">
                  <CardHeader className="pb-4 bg-gradient-to-br from-gray-50 to-gray-100 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="p-2 rounded-lg bg-white shadow-sm flex-shrink-0">
                          {getTypeIcon(ad.type)}
                        </div>
                        <Badge className={`${getTypeColor(ad.type)} text-xs px-2 py-1 flex-shrink-0`}>
                          {ad.type === 'video' ? 'فيديو' : ad.type === 'image' ? 'صورة' : 'نص'}
                        </Badge>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <Badge className={`text-xs px-2 py-0.5 ${ad.displayLocation === 'all' ? 'bg-purple-100 text-purple-700 border border-purple-300' : 
                          ad.displayLocation === 'landing' ? 'bg-blue-100 text-blue-700 border border-blue-300' :
                          ad.displayLocation === 'player' ? 'bg-green-100 text-green-700 border border-green-300' :
                          ad.displayLocation === 'club' ? 'bg-orange-100 text-orange-700 border border-orange-300' :
                          ad.displayLocation === 'academy' ? 'bg-indigo-100 text-indigo-700 border border-indigo-300' :
                          'bg-gray-100 text-gray-700 border border-gray-300'}`}>
                          {ad.displayLocation === 'all' ? '🌐 الكل' :
                           ad.displayLocation === 'landing' ? '🏠 الرئيسية' :
                           ad.displayLocation === 'dashboard' ? '📊 عام' :
                           ad.displayLocation === 'player' ? '⚽ لاعب' :
                           ad.displayLocation === 'club' ? '🏟️ نادي' :
                           ad.displayLocation === 'academy' ? '🎓 أكاديمية' :
                           ad.displayLocation === 'trainer' ? '👨‍🏫 مدرب' :
                           ad.displayLocation === 'agent' ? '🤝 وكيل' :
                           ad.displayLocation === 'admin' ? '⚙️ أدمن' : '🌐 الكل'}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={ad.isActive}
                            onCheckedChange={() => toggleActive(ad)}
                            className={`${ad.isActive ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'} flex-shrink-0`}
                          />
                        </div>
                      </div>
                      <Badge className={`text-xs px-2 py-0.5 ${ad.isActive ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300'}`}>
                        {ad.isActive ? 'نشط' : 'معطل'}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">{ad.title}</CardTitle>
                    <CardDescription className="line-clamp-2 text-gray-600 text-sm leading-relaxed">
                      {ad.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="p-5 flex-1 flex flex-col">
                    {ad.mediaUrl && (
                      <div className="mb-4 flex-shrink-0">
                        {ad.type === 'image' ? (
                          <div className="relative overflow-hidden rounded-lg aspect-video">
                            <img 
                              src={ad.mediaUrl} 
                              alt={ad.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
                          </div>
                        ) : ad.type === 'video' ? (
                          <div className="w-full aspect-video bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center relative overflow-hidden">
                            <Video className="h-10 w-10 text-purple-400 relative z-10" />
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-100/50 to-blue-100/50"></div>
                          </div>
                        ) : null}
                      </div>
                    )}
                    
                    <div className="space-y-2 text-sm flex-1">
                      <div className="flex items-center gap-2 bg-blue-50 p-2.5 rounded-lg">
                        <Calendar className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <span className="text-blue-700 font-medium text-xs">الأولوية: {ad.priority}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-green-50 p-2.5 rounded-lg">
                        <Users className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-green-700 font-medium text-xs">المشاهدات: {ad.views.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-orange-50 p-2.5 rounded-lg">
                        <Target className="h-4 w-4 text-orange-600 flex-shrink-0" />
                        <span className="text-orange-700 font-medium text-xs">النقرات: {ad.clicks.toLocaleString()}</span>
                      </div>
                      {ad.ctaUrl && (
                        <div className="flex items-center gap-2 bg-indigo-50 p-2.5 rounded-lg">
                          <ExternalLink className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                          <span className="text-indigo-700 font-medium text-xs truncate">
                            {ad.ctaUrl.startsWith('http') ? 'رابط خارجي' : ad.ctaUrl}
                          </span>
                        </div>
                      )}
                      
                      {/* Popup Info - Compact */}
                      <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-3 rounded-lg border border-purple-100 mt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="h-3.5 w-3.5 text-purple-600 flex-shrink-0" />
                          <span className="text-xs font-semibold text-purple-700">إعدادات النافذة</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-xs">
                          <div className="bg-white p-1.5 rounded text-center">
                            <span className="text-purple-600 font-medium block mb-0.5">النوع</span>
                            <Badge variant="outline" className="text-xs px-1.5 py-0.5 border-purple-200 text-purple-700">
                              {ad.popupType === 'modal' ? 'مركزي' : 
                               ad.popupType === 'toast' ? 'إشعار' : 
                               ad.popupType === 'banner' ? 'شريط' : 'جانبي'}
                            </Badge>
                          </div>
                          <div className="bg-white p-1.5 rounded text-center">
                            <span className="text-purple-600 font-medium block mb-0.5">الأهمية</span>
                            <Badge 
                              variant="outline" 
                              className={`text-xs px-1.5 py-0.5 ${
                                ad.urgency === 'critical' ? 'border-red-200 text-red-700' :
                                ad.urgency === 'high' ? 'border-orange-200 text-orange-700' :
                                ad.urgency === 'medium' ? 'border-blue-200 text-blue-700' :
                                'border-green-200 text-green-700'
                              }`}
                            >
                              {ad.urgency === 'critical' ? 'عاجل' :
                               ad.urgency === 'high' ? 'مهم' :
                               ad.urgency === 'medium' ? 'عادي' : 'منخفض'}
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Special Features */}
                        {(ad.discount || ad.countdown || ad.autoClose) && (
                          <div className="mt-2 pt-2 border-t border-purple-200">
                            <div className="flex flex-wrap gap-1.5 justify-center">
                              {ad.discount && (
                                <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs px-2 py-0.5">
                                  <Gift className="h-3 w-3 mr-1 inline" />
                                  {ad.discount}
                                </Badge>
                              )}
                              {ad.countdown && (
                                <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs px-2 py-0.5">
                                  <Clock className="h-3 w-3 mr-1 inline" />
                                  {ad.countdown}
                                </Badge>
                              )}
                              {ad.autoClose && ad.autoClose > 0 && (
                                <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-2 py-0.5">
                                  <Settings className="h-3 w-3 mr-1 inline" />
                                  إغلاق تلقائي
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 flex-shrink-0">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setPreviewAd(ad)}
                        className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-100 hover:border-blue-400 hover:text-blue-800 transition-all h-9 text-xs font-medium"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        معاينة
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEdit(ad)}
                        className="flex-1 border-green-300 text-green-700 hover:bg-green-100 hover:border-green-400 hover:text-green-800 transition-all h-9 text-xs font-medium"
                      >
                        <Edit className="h-3.5 w-3.5 mr-1" />
                        تعديل
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDelete(ad.id!)}
                        className="flex-1 border-red-300 text-red-700 hover:bg-red-100 hover:border-red-400 hover:text-red-800 transition-all h-9 text-xs font-medium"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        حذف
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Add/Edit Dialog - Premium Design */}
        <Dialog open={showAddDialog} onOpenChange={(open) => {
          console.log('Dialog state changing to:', open);
          setShowAddDialog(open);
        }}>
          <DialogContent className="max-w-[90vw] lg:max-w-5xl max-h-[90vh] overflow-hidden p-0 bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] border-0 flex flex-col">
            <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
              {/* Premium Header with Glass Effect */}
              <div className="relative bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-6 py-4 overflow-hidden flex-shrink-0">
                {/* Animated Background Pattern */}
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
                  <div className="absolute top-0 -right-4 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
                  <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
                </div>
                
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative p-3 bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
                      <div className="relative">
                        {editingAd ? (
                          <Edit className="h-6 w-6 text-white drop-shadow-lg" />
                        ) : (
                          <Plus className="h-6 w-6 text-white drop-shadow-lg" />
                        )}
                      </div>
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-extrabold text-white mb-1 drop-shadow-lg tracking-tight">
                        {editingAd ? '✏️ تعديل الإعلان' : '✨ إنشاء إعلان جديد'}
                      </DialogTitle>
                      <DialogDescription className="text-white/80 text-xs font-medium">
                        صمم إعلانك الاحترافي بخطوات بسيطة
                      </DialogDescription>
                    </div>
                  </div>
                  
                  {/* Enhanced Progress Indicator */}
                  <div className="flex items-center gap-3 bg-white/15 backdrop-blur-xl rounded-2xl px-5 py-2.5 border border-white/20 shadow-xl">
                    <div className="flex items-center gap-2.5">
                      <div className={`relative w-3 h-3 rounded-full ${formData.title && formData.description ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50' : 'bg-white/40'}`}>
                        {formData.title && formData.description && (
                          <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-75"></div>
                        )}
                      </div>
                      <span className="text-xs font-bold text-white tracking-wide">
                        {formData.title && formData.description ? '✅ جاهز للنشر' : '⏳ قيد الإنشاء'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content - Split Layout */}
              <div className="flex-1 flex overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50/30 min-h-0 flex-shrink">
                {/* Left Side - Form */}
                <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 pr-2">
                  <div className="p-5">
                    <Tabs defaultValue="basic" className="space-y-4">
                      {/* Premium Tabs Navigation */}
                      <div className="flex gap-2 border-b-2 border-gray-200/50 pb-2">
                        <TabsList className="bg-gradient-to-r from-gray-100 to-gray-50 p-1 rounded-xl shadow-inner border border-gray-200/50">
                          <TabsTrigger 
                            value="basic" 
                            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg px-4 py-2 rounded-lg font-semibold text-xs transition-all duration-300"
                          >
                            <FileText className="h-3 w-3 ml-1.5" />
                            الأساسية
                          </TabsTrigger>
                          <TabsTrigger 
                            value="media" 
                            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg px-4 py-2 rounded-lg font-semibold text-xs transition-all duration-300"
                          >
                            <Image className="h-3 w-3 ml-1.5" />
                            الوسائط
                          </TabsTrigger>
                          <TabsTrigger 
                            value="settings" 
                            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg px-4 py-2 rounded-lg font-semibold text-xs transition-all duration-300"
                          >
                            <Settings className="h-3 w-3 ml-1.5" />
                            الإعدادات
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      {/* Tab Content - Basic */}
                      <TabsContent value="basic" className="mt-4">
                      <div className="grid grid-cols-1 gap-4">
                        {/* Right Column - Title, Type, Description */}
                        <div className="space-y-4 w-full">
                          {/* Title & Type - Premium Card */}
                          <div className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 rounded-xl border-2 border-blue-200/50 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-200/20 to-purple-200/20 rounded-full blur-2xl"></div>
                            <div className="relative">
                              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
                                  <Zap className="h-3 w-3 text-white" />
                                </div>
                                معلومات أساسية
                              </h3>
                              
                              <div className="space-y-3">
                                <div>
                                  <Label htmlFor="title" className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5 block">
                                    <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                                    عنوان الإعلان *
                                  </Label>
                                  <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
                                    placeholder="عنوان جذاب ومميز..."
                                    required
                                    className="h-11 text-sm border-2 border-blue-200 focus:border-indigo-500 rounded-lg shadow-sm focus:shadow-md transition-all bg-white"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="type" className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5 block">
                                    <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                                    نوع الإعلان *
                                  </Label>
                                  <Select 
                                    value={formData.type} 
                                    onValueChange={(value) => setFormData(prev => ({...prev, type: value as any}))}
                                  >
                                    <SelectTrigger className="h-11 text-sm border-2 border-blue-200 focus:border-indigo-500 rounded-lg shadow-sm focus:shadow-md bg-white">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="text">📝 نص</SelectItem>
                                      <SelectItem value="image">🖼️ صورة</SelectItem>
                                      <SelectItem value="video">🎥 فيديو</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Description - Premium Card */}
                          <div className="relative bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-4 rounded-xl border-2 border-purple-200/50 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-purple-200/20 to-pink-200/20 rounded-full blur-2xl"></div>
                            <div className="relative">
                              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <div className="p-1.5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-md">
                                  <FileText className="h-3 w-3 text-white" />
                                </div>
                                وصف الإعلان *
                              </h3>
                              
                              <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                                placeholder="اكتب وصفاً مفصلاً وجذاباً..."
                                rows={5}
                                required
                                className="text-sm resize-none border-2 border-purple-200 focus:border-purple-500 rounded-lg shadow-sm focus:shadow-md transition-all bg-white min-h-[120px]"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Left Column - CTA */}
                        <div className="space-y-4 w-full">
                          <div className="relative bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 p-4 rounded-xl border-2 border-emerald-200/50 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-br from-emerald-200/20 to-teal-200/20 rounded-full blur-2xl"></div>
                            <div className="relative">
                              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg shadow-md">
                                  <Target className="h-3 w-3 text-white" />
                                </div>
                                زر الإجراء (CTA)
                              </h3>
                              
                              <div className="space-y-3">
                                <div>
                                  <Label htmlFor="ctaText" className="text-xs font-semibold text-gray-700 mb-1.5 block">
                                    نص الزر
                                  </Label>
                                  <Input
                                    id="ctaText"
                                    value={formData.ctaText}
                                    onChange={(e) => setFormData(prev => ({...prev, ctaText: e.target.value}))}
                                    placeholder="مثال: اشترك الآن..."
                                    className="h-11 text-sm border-2 border-emerald-200 focus:border-emerald-500 rounded-lg shadow-sm focus:shadow-md transition-all bg-white"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="ctaUrl" className="text-xs font-semibold text-gray-700 mb-1.5 block">
                                    وجهة الزر
                                  </Label>
                                  <Select 
                                    value={formData.ctaUrl} 
                                    onValueChange={(value) => setFormData(prev => ({...prev, ctaUrl: value}))}
                                  >
                                    <SelectTrigger className="h-11 text-sm border-2 border-emerald-200 focus:border-emerald-500 rounded-lg shadow-sm focus:shadow-md bg-white">
                                      <SelectValue placeholder="اختر الوجهة" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="/auth/register">📝 التسجيل</SelectItem>
                                      <SelectItem value="/auth/login">🔑 تسجيل الدخول</SelectItem>
                                      <SelectItem value="/dashboard">🏠 لوحة التحكم</SelectItem>
                                      <SelectItem value="/dashboard/player">⚽ لوحة اللاعب</SelectItem>
                                      <SelectItem value="/dashboard/club">🏟️ لوحة النادي</SelectItem>
                                      <SelectItem value="/dashboard/academy">🎓 لوحة الأكاديمية</SelectItem>
                                      <SelectItem value="/dashboard/trainer">👨‍🏫 لوحة المدرب</SelectItem>
                                      <SelectItem value="/dashboard/agent">🤝 لوحة الوكيل</SelectItem>
                                      <SelectItem value="/pricing">💰 الأسعار</SelectItem>
                                      <SelectItem value="custom">🔗 رابط مخصص</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                {formData.ctaUrl === 'custom' && (
                                  <div>
                                    <Label htmlFor="customUrl" className="text-xs font-semibold text-gray-700 mb-1.5 block">
                                      الرابط المخصص
                                    </Label>
                                    <Input
                                      id="customUrl"
                                      value={formData.customUrl || ''}
                                      onChange={(e) => setFormData(prev => ({...prev, customUrl: e.target.value}))}
                                      placeholder="https://example.com"
                                      className="h-11 text-sm border-2 border-emerald-200 focus:border-emerald-500 rounded-lg shadow-sm focus:shadow-md transition-all bg-white"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Premium Tips Card */}
                          <div className="relative bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-4 rounded-xl border-2 border-amber-200/50 shadow-lg overflow-hidden">
                            <div className="relative">
                              <div className="flex items-start gap-2 mb-2">
                                <div className="p-1.5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg shadow-md">
                                  <Gift className="h-3 w-3 text-white" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="text-xs font-bold text-gray-900 mb-1.5">💡 نصائح لإعلان ناجح</h3>
                                  <ul className="text-[10px] text-gray-700 space-y-1 font-medium">
                                    <li className="flex items-start gap-1.5">
                                      <span className="text-amber-600 mt-0.5 text-xs">✓</span>
                                      <span>عنوان جذاب ومباشر</span>
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                      <span className="text-amber-600 mt-0.5 text-xs">✓</span>
                                      <span>وصف واضح ومختصر</span>
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                      <span className="text-amber-600 mt-0.5 text-xs">✓</span>
                                      <span>CTA قوي ومحفز</span>
                                    </li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Tab Content - Media */}
                    <TabsContent value="media" className="mt-0">
                      {(formData.type === 'image' || formData.type === 'video') ? (
                        <div className="grid grid-cols-1 gap-4">
                          {/* Upload Section */}
                          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                            <h3 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2">
                              <Upload className="h-4 w-4" />
                              رفع {formData.type === 'image' ? 'صورة' : 'فيديو'}
                            </h3>
                            
                            <AdFileUpload
                              adId={editingAd?.id || `temp_${Date.now()}`}
                              fileType={formData.type}
                              onFileUploaded={(url) => {
                                setFormData(prev => ({...prev, mediaUrl: url}));
                              }}
                              onFileDeleted={() => {
                                setFormData(prev => ({...prev, mediaUrl: ''}));
                              }}
                              currentFileUrl={formData.mediaUrl}
                            />
                          </div>

                          {/* Manual URL */}
                          <div className="bg-violet-50 p-4 rounded-lg border border-violet-200">
                            <h3 className="text-sm font-bold text-violet-900 mb-3 flex items-center gap-2">
                              <ExternalLink className="h-4 w-4" />
                              رابط مباشر
                            </h3>
                            
                            <div>
                              <Label htmlFor="mediaUrl" className="text-xs font-semibold mb-1.5 block">
                                أدخل الرابط
                              </Label>
                              <Input
                                id="mediaUrl"
                                value={formData.mediaUrl}
                                onChange={(e) => setFormData(prev => ({...prev, mediaUrl: e.target.value}))}
                                placeholder={`https://example.com/${formData.type === 'image' ? 'image.jpg' : 'video.mp4'}`}
                                className="h-11 text-sm"
                              />
                            </div>

                            {/* Preview if URL exists */}
                            {formData.mediaUrl && (
                              <div className="mt-3 p-2 bg-white rounded border">
                                <p className="text-xs text-gray-600 mb-2">معاينة:</p>
                                {formData.type === 'image' ? (
                                  <img src={formData.mediaUrl} alt="Preview" className="w-full h-32 object-cover rounded" />
                                ) : (
                                  <div className="w-full h-32 bg-gray-200 rounded flex items-center justify-center">
                                    <Video className="h-10 w-10 text-gray-400" />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <FileText className="h-16 w-16 text-gray-400 mb-4" />
                          <h3 className="text-lg font-bold text-gray-900 mb-2">لا يوجد محتوى وسائط</h3>
                          <p className="text-sm text-gray-600">
                            اختر "صورة" أو "فيديو" من التبويب الأول
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    {/* Tab Content - Settings */}
                    <TabsContent value="settings" className="mt-0">
                      <div className="grid grid-cols-1 gap-4">
                        {/* Right Column - Basic Settings */}
                        <div className="space-y-4">
                          {/* Basic Settings */}
                          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                            <h3 className="text-sm font-bold text-orange-900 mb-3 flex items-center gap-2">
                              <Settings className="h-4 w-4" />
                              إعدادات أساسية
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="priority" className="text-xs font-semibold mb-1.5 block">
                                  الأولوية
                                </Label>
                                <Input
                                  id="priority"
                                  type="number"
                                  value={formData.priority}
                                  onChange={(e) => setFormData(prev => ({...prev, priority: parseInt(e.target.value)}))}
                                  min="1"
                                  max="10"
                                  className="h-11 text-sm w-full"
                                />
                              </div>
                              <div>
                                <Label htmlFor="targetAudience" className="text-xs font-semibold mb-1.5 block">
                                  الجمهور
                                </Label>
                                <Select 
                                  value={formData.targetAudience} 
                                  onValueChange={(value) => setFormData(prev => ({...prev, targetAudience: value as any}))}
                                >
                                  <SelectTrigger className="h-11 text-sm w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">الجميع</SelectItem>
                                    <SelectItem value="new_users">جدد</SelectItem>
                                    <SelectItem value="returning_users">عائدين</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="mt-3">
                              <Label htmlFor="displayLocation" className="text-xs font-semibold mb-1.5 block">
                                مكان الظهور
                              </Label>
                              <Select 
                                value={formData.displayLocation || 'all'} 
                                onValueChange={(value) => setFormData(prev => ({...prev, displayLocation: value as any}))}
                              >
                                <SelectTrigger className="h-11 text-sm w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">🌐 جميع الصفحات</SelectItem>
                                  <SelectItem value="landing">🏠 الصفحة الرئيسية</SelectItem>
                                  <SelectItem value="dashboard">📊 لوحة التحكم</SelectItem>
                                  <SelectItem value="player">⚽ لوحة اللاعب</SelectItem>
                                  <SelectItem value="club">🏟️ لوحة النادي</SelectItem>
                                  <SelectItem value="academy">🎓 لوحة الأكاديمية</SelectItem>
                                  <SelectItem value="trainer">👨‍🏫 لوحة المدرب</SelectItem>
                                  <SelectItem value="agent">🤝 لوحة الوكيل</SelectItem>
                                  <SelectItem value="admin">⚙️ لوحة الأدمن</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Active Status */}
                            <div className="mt-3 flex items-center justify-between p-3 bg-white rounded-lg border">
                              <div className="flex items-center gap-2">
                                <Switch
                                  id="isActive"
                                  checked={formData.isActive}
                                  onCheckedChange={(checked) => setFormData(prev => ({...prev, isActive: checked}))}
                                  className={formData.isActive ? 'bg-green-600' : 'bg-gray-300'}
                                />
                                <Label htmlFor="isActive" className="text-xs font-semibold">
                                  حالة الإعلان
                                </Label>
                              </div>
                              <Badge variant={formData.isActive ? "default" : "secondary"} className={`text-xs ${formData.isActive ? "bg-green-500" : ""}`}>
                                {formData.isActive ? 'نشط' : 'معطل'}
                              </Badge>
                            </div>
                          </div>

                          {/* Schedule */}
                          <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
                            <h3 className="text-sm font-bold text-cyan-900 mb-3 flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              جدولة العرض
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="md:col-span-1">
                                <Label htmlFor="startDate" className="text-xs font-semibold mb-1.5 block">
                                  تاريخ البداية
                                </Label>
                                <Input
                                  id="startDate"
                                  type="date"
                                  value={formData.startDate}
                                  onChange={(e) => setFormData(prev => ({...prev, startDate: e.target.value}))}
                                  className="h-11 text-sm w-full"
                                />
                              </div>
                              <div className="md:col-span-1">
                                <Label htmlFor="endDate" className="text-xs font-semibold mb-1.5 block">
                                  تاريخ النهاية
                                </Label>
                                <Input
                                  id="endDate"
                                  type="date"
                                  value={formData.endDate}
                                  onChange={(e) => setFormData(prev => ({...prev, endDate: e.target.value}))}
                                  className="h-11 text-sm w-full"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Left Column - Popup Settings */}
                        <div className="bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 p-4 rounded-lg border-2 border-violet-200 shadow-lg">
                          <h3 className="text-sm font-bold text-violet-900 mb-3 flex items-center gap-2">
                            <Zap className="h-4 w-4 text-violet-600" />
                            إعدادات النافذة المنبثقة
                          </h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                            <div className="md:col-span-1">
                              <Label htmlFor="popupType" className="text-xs font-semibold mb-1.5 block text-violet-700">
                                النوع
                              </Label>
                              <Select 
                                value={formData.popupType} 
                                onValueChange={(value) => setFormData(prev => ({...prev, popupType: value as any}))}
                              >
                                <SelectTrigger className="h-11 text-sm w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="modal">🎯 نافذة مركزية</SelectItem>
                                  <SelectItem value="toast">🔔 إشعار صغير</SelectItem>
                                  <SelectItem value="banner">📢 شريط علوي</SelectItem>
                                  <SelectItem value="side-panel">📋 لوحة جانبية</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="md:col-span-1">
                              <Label htmlFor="displayDelay" className="text-xs font-semibold mb-1.5 block text-violet-700">
                                التأخير (ث)
                              </Label>
                              <Input
                                id="displayDelay"
                                type="number"
                                value={formData.displayDelay}
                                onChange={(e) => setFormData(prev => ({...prev, displayDelay: parseInt(e.target.value)}))}
                                min="0"
                                max="60"
                                className="h-11 text-sm w-full"
                              />
                            </div>
                            <div className="md:col-span-1">
                              <Label htmlFor="displayFrequency" className="text-xs font-semibold mb-1.5 block text-violet-700">
                                التكرار
                              </Label>
                              <Select 
                                value={formData.displayFrequency} 
                                onValueChange={(value) => setFormData(prev => ({...prev, displayFrequency: value as any}))}
                              >
                                <SelectTrigger className="h-11 text-sm w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="once">1️⃣ مرة</SelectItem>
                                  <SelectItem value="daily">📅 يومياً</SelectItem>
                                  <SelectItem value="weekly">📆 أسبوعياً</SelectItem>
                                  <SelectItem value="always">♾️ دائماً</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="md:col-span-1">
                              <Label htmlFor="maxDisplays" className="text-xs font-semibold mb-1.5 block text-violet-700">
                                الحد الأقصى
                              </Label>
                              <Input
                                id="maxDisplays"
                                type="number"
                                value={formData.maxDisplays}
                                onChange={(e) => setFormData(prev => ({...prev, maxDisplays: parseInt(e.target.value)}))}
                                min="1"
                                max="100"
                                className="h-11 text-sm w-full"
                              />
                            </div>
                            <div className="md:col-span-1">
                              <Label htmlFor="autoClose" className="text-xs font-semibold mb-1.5 block text-violet-700">
                                إغلاق تلقائي (ث)
                              </Label>
                              <Input
                                id="autoClose"
                                type="number"
                                value={formData.autoClose || 0}
                                onChange={(e) => setFormData(prev => ({...prev, autoClose: parseInt(e.target.value)}))}
                                min="0"
                                max="300"
                                placeholder="0 = بدون إغلاق"
                                className="h-11 text-sm w-full"
                              />
                            </div>
                            <div className="md:col-span-1">
                              <Label htmlFor="urgency" className="text-xs font-semibold mb-1.5 block text-violet-700">
                                مستوى الأهمية
                              </Label>
                              <Select 
                                value={formData.urgency || 'medium'} 
                                onValueChange={(value) => setFormData(prev => ({...prev, urgency: value as any}))}
                              >
                                <SelectTrigger className="h-11 text-sm w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">🟢 منخفض</SelectItem>
                                  <SelectItem value="medium">🟡 متوسط</SelectItem>
                                  <SelectItem value="high">🟠 عالي</SelectItem>
                                  <SelectItem value="critical">🔴 حرج</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                            <div className="flex items-center gap-2 p-3 bg-white rounded-lg border-2 border-violet-200 shadow-sm">
                              <Switch
                                id="showCloseButton"
                                checked={formData.showCloseButton}
                                onCheckedChange={(checked) => setFormData(prev => ({...prev, showCloseButton: checked}))}
                                className={formData.showCloseButton ? 'bg-violet-600' : 'bg-gray-300'}
                              />
                              <Label htmlFor="showCloseButton" className="text-xs font-semibold text-violet-700">
                                زر إغلاق
                              </Label>
                            </div>
                            <div className="flex items-center gap-2 p-3 bg-white rounded-lg border-2 border-violet-200 shadow-sm">
                              <Switch
                                id="showProgressBar"
                                checked={formData.showProgressBar}
                                onCheckedChange={(checked) => setFormData(prev => ({...prev, showProgressBar: checked}))}
                                className={formData.showProgressBar ? 'bg-fuchsia-600' : 'bg-gray-300'}
                              />
                              <Label htmlFor="showProgressBar" className="text-xs font-semibold text-violet-700">
                                شريط تقدم
                              </Label>
                            </div>
                          </div>

                          {/* Additional Fields */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-1">
                              <Label htmlFor="discount" className="text-xs font-semibold mb-1.5 block text-violet-700">
                                خصم (اختياري)
                              </Label>
                              <Input
                                id="discount"
                                value={formData.discount || ''}
                                onChange={(e) => setFormData(prev => ({...prev, discount: e.target.value}))}
                                placeholder="مثال: 50%"
                                className="h-11 text-sm border-2 border-violet-200 focus:border-violet-500 rounded-lg w-full"
                              />
                            </div>
                            <div className="md:col-span-1">
                              <Label htmlFor="countdown" className="text-xs font-semibold mb-1.5 block text-violet-700">
                                عد تنازلي (اختياري)
                              </Label>
                              <Input
                                id="countdown"
                                value={formData.countdown || ''}
                                onChange={(e) => setFormData(prev => ({...prev, countdown: e.target.value}))}
                                placeholder="مثال: 24:00:00"
                                className="h-11 text-sm border-2 border-violet-200 focus:border-violet-500 rounded-lg w-full"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    </Tabs>
                  </div>
                </div>

                {/* Right Side - Premium Live Preview */}
                <div className="w-[280px] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 flex flex-col border-l-4 border-purple-400 shadow-2xl relative overflow-hidden min-h-0 flex-shrink-0">
                  {/* Animated Background */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-10 right-10 w-40 h-40 bg-purple-500 rounded-full mix-blend-screen filter blur-2xl animate-pulse"></div>
                    <div className="absolute bottom-10 left-10 w-32 h-32 bg-pink-500 rounded-full mix-blend-screen filter blur-2xl animate-pulse animation-delay-2000"></div>
                  </div>
                  
                  <div className="relative mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative p-3 bg-gradient-to-br from-white/25 to-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
                        <Eye className="h-6 w-6 text-white drop-shadow-lg relative z-10" />
                      </div>
                      <div>
                        <h3 className="text-lg font-extrabold text-white drop-shadow-lg">المعاينة الحية</h3>
                        <p className="text-xs text-white/80 font-medium">شاهد إعلانك كما سيظهر للمستخدمين</p>
                      </div>
                    </div>
                  </div>

                  {/* Premium Live Preview Card */}
                  <div className="flex-1 bg-white/10 backdrop-blur-2xl rounded-xl p-4 border-2 border-white/20 shadow-xl overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-purple-400 scrollbar-track-purple-200/30">
                    {formData.title ? (
                      <div className="bg-white rounded-xl p-4 shadow-xl transform transition-all duration-300">
                        <div className="text-center mb-3">
                          <h3 className="font-bold text-gray-900 text-base mb-2 line-clamp-2 leading-tight">
                            {formData.title}
                          </h3>
                          {formData.description && (
                            <p className="text-xs text-gray-600 mb-3 line-clamp-3 leading-relaxed">
                              {formData.description}
                            </p>
                          )}
                        </div>

                        {formData.mediaUrl && (
                          <div className="my-3">
                            {formData.type === 'image' ? (
                              <img 
                                src={formData.mediaUrl} 
                                alt="Preview"
                                className="w-full h-32 object-cover rounded-lg shadow-lg"
                              />
                            ) : formData.type === 'video' ? (
                              <div className="w-full h-32 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 rounded-lg flex items-center justify-center shadow-lg">
                                <Video className="h-12 w-12 text-gray-600" />
                              </div>
                            ) : null}
                          </div>
                        )}

                        {formData.ctaText && (
                          <Button 
                            type="button"
                            size="sm" 
                            className="w-full h-9 text-xs bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 font-bold shadow-lg hover:shadow-xl transition-all"
                          >
                            {formData.ctaText}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="bg-white/5 rounded-xl p-6 text-center border-2 border-dashed border-white/30">
                        <div className="p-3 bg-white/10 rounded-xl inline-block mb-3">
                          <FileText className="h-12 w-12 text-white/40" />
                        </div>
                        <p className="text-xs text-white/80 leading-relaxed font-medium">
                          ابدأ بإدخال البيانات<br />لرؤية المعاينة الحية
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Premium Quick Stats */}
                  <div className="mt-3 grid grid-cols-3 gap-2 flex-shrink-0">
                    <div className="relative bg-white/15 backdrop-blur-xl rounded-lg p-2.5 text-center border border-white/20 shadow-lg overflow-hidden">
                      <div className="text-lg font-black text-white mb-0.5 drop-shadow-lg">
                        {formData.priority || 1}
                      </div>
                      <div className="text-[10px] text-white/90 font-semibold">الأولوية</div>
                    </div>
                    <div className="relative bg-white/15 backdrop-blur-xl rounded-lg p-2.5 text-center border border-white/20 shadow-lg overflow-hidden">
                      <div className="text-lg font-black text-white mb-0.5 drop-shadow-lg">
                        {formData.isActive ? '✓' : '✗'}
                      </div>
                      <div className="text-[10px] text-white/90 font-semibold">الحالة</div>
                    </div>
                    <div className="relative bg-white/15 backdrop-blur-xl rounded-lg p-2.5 text-center border border-white/20 shadow-lg overflow-hidden">
                      <div className="text-lg font-black text-white mb-0.5 drop-shadow-lg">
                        {formData.type === 'video' ? '🎥' : formData.type === 'image' ? '🖼️' : '📝'}
                      </div>
                      <div className="text-[10px] text-white/90 font-semibold">النوع</div>
                    </div>
                  </div>
                </div>
              </div>
                
              {/* Premium Footer */}
              <div className="relative px-6 py-4 bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 border-t-4 border-purple-400 overflow-hidden flex-shrink-0">
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`relative w-4 h-4 rounded-full ${formData.title && formData.description ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50' : 'bg-white/40'}`}>
                      {formData.title && formData.description && (
                        <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-75"></div>
                      )}
                    </div>
                    <span className="text-sm font-extrabold text-white drop-shadow-lg">
                      {formData.title && formData.description ? '✅ جاهز للنشر' : '⏳ قيد الإنشاء'}
                    </span>
                  </div>

                  <div className="flex gap-3">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setShowAddDialog(false)}
                      className="h-10 px-6 border-2 border-white/30 bg-white/10 backdrop-blur-md hover:bg-red-500/20 hover:border-red-400 hover:text-white transition-all font-bold text-white shadow-xl text-sm"
                    >
                      <X className="h-4 w-4 mr-2" />
                      إلغاء
                    </Button>
                    <Button 
                      type="submit"
                      className="h-10 px-8 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white font-black shadow-2xl hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all transform hover:scale-105 text-sm"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {editingAd ? '💾 تحديث' : '🚀 نشر'}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={!!previewAd} onOpenChange={() => setPreviewAd(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-t-xl">
               <DialogTitle className="text-2xl font-bold text-blue-900 flex items-center gap-2">
                 <Eye className="h-6 w-6" />
                 معاينة الإعلان
               </DialogTitle>
            </DialogHeader>
            
            {previewAd && (
              <div className="space-y-6 p-6">
                 <div className="text-center bg-gradient-to-r from-gray-50 to-blue-50 p-6 rounded-xl">
                   <h3 className="text-2xl font-bold mb-3 text-gray-900">{previewAd.title}</h3>
                   <p className="text-gray-600 text-lg leading-relaxed">{previewAd.description}</p>
                 </div>

                                 {previewAd.mediaUrl && (
                   <div className="text-center">
                     {previewAd.type === 'image' ? (
                       <div className="relative overflow-hidden rounded-xl shadow-lg">
                         <img 
                           src={previewAd.mediaUrl} 
                           alt={previewAd.title}
                           className="w-full max-h-80 object-cover mx-auto"
                         />
                         <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
                       </div>
                     ) : previewAd.type === 'video' ? (
                       <div className="w-full h-80 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center shadow-lg">
                         <div className="text-center">
                           <Video className="h-20 w-20 text-gray-400 mx-auto mb-4" />
                           <span className="text-gray-600 text-lg font-medium">معاينة الفيديو</span>
                         </div>
                       </div>
                     ) : null}
                   </div>
                 )}

                                                    {previewAd.ctaText && previewAd.ctaUrl && (
                     <div className="text-center">
                       <Button 
                         className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 px-10 py-4 h-14 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 text-lg font-semibold"
                         onClick={() => {
                           const url = previewAd.ctaUrl?.startsWith('http') ? previewAd.ctaUrl : `${window.location.origin}${previewAd.ctaUrl}`;
                           window.open(url, '_blank');
                         }}
                       >
                         {previewAd.ctaText}
                       </Button>
                     </div>
                   )}

                                 <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 rounded-xl">
                   <h4 className="text-lg font-semibold text-gray-900 mb-4 text-center">معلومات الإعلان</h4>
                   <div className="grid grid-cols-2 gap-4 text-sm">
                     <div className="bg-white p-3 rounded-lg shadow-sm">
                       <strong className="text-blue-600">النوع:</strong> 
                       <span className="text-gray-700 mr-2">{previewAd.type === 'video' ? 'فيديو' : previewAd.type === 'image' ? 'صورة' : 'نص'}</span>
                     </div>
                     <div className="bg-white p-3 rounded-lg shadow-sm">
                       <strong className="text-green-600">الجمهور:</strong> 
                       <span className="text-gray-700 mr-2">{previewAd.targetAudience === 'new_users' ? 'مستخدمين جدد' : 
                        previewAd.targetAudience === 'returning_users' ? 'مستخدمين عائدين' : 'الجميع'}</span>
                     </div>
                     <div className="bg-white p-3 rounded-lg shadow-sm">
                       <strong className="text-orange-600">الأولوية:</strong> 
                       <span className="text-gray-700 mr-2">{previewAd.priority}</span>
                     </div>
                     <div className="bg-white p-3 rounded-lg shadow-sm">
                       <strong className="text-purple-600">الحالة:</strong> 
                       <span className={`mr-2 ${previewAd.isActive ? 'text-green-600' : 'text-red-600'}`}>
                         {previewAd.isActive ? 'نشط' : 'غير نشط'}
                       </span>
                     </div>
                     {previewAd.ctaUrl && (
                       <div className="bg-white p-3 rounded-lg shadow-sm col-span-2">
                         <strong className="text-indigo-600">وجهة الزر:</strong> 
                         <span className="text-gray-700 mr-2 break-all">
                           {previewAd.ctaUrl.startsWith('http') ? previewAd.ctaUrl : `${window.location.origin}${previewAd.ctaUrl}`}
                         </span>
                       </div>
                     )}
                   </div>
                 </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

                 {/* Analytics Dialog */}
         <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
           <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
             <DialogHeader className="bg-gradient-to-r from-purple-50 to-violet-50 p-6 rounded-t-xl">
               <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-purple-900">
                 <BarChart3 className="h-7 w-7" />
                 التحليلات المتقدمة للإعلانات المنبثقة
               </DialogTitle>
               <DialogDescription className="text-purple-700 text-lg mt-2">
                 إحصائيات مفصلة عن أداء الإعلانات المنبثقة مع مقاييس متقدمة
               </DialogDescription>
             </DialogHeader>
             <div className="p-6">
               <AdAnalytics />
             </div>
           </DialogContent>
        </Dialog>
      </div>
  );
}
