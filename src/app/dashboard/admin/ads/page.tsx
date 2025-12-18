'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Plus, Edit, Trash2, Eye, Video, FileText, Image, Calendar,
  Users, Target, BarChart3, AlertCircle, Upload, ExternalLink,
  Gift, Clock, Zap, Settings, X
} from 'lucide-react';
import { useAccountTypeAuth } from '@/hooks/useAccountTypeAuth';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import AdAnalytics from '@/components/ads/AdAnalytics';
import { ensureAdsBucketExists, getAdsStorageStats } from '@/lib/supabase/ads-storage';
import AdFormDialog from '@/components/ads/AdFormDialog';
import { Ad } from '@/types/ads';

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

  const handleAdSubmit = async (formData: Partial<Ad>) => {
    try {
      const adData: Partial<Ad> = {
        ...formData,
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
      await fetchAds();
    } catch (error) {
      console.error('Error saving ad:', error);
    }
  };

  const handleEdit = (ad: Ad) => {
    setEditingAd(ad);
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
                    يجب إنشاء bucket باسم "ads" في Supabase Storage أو Cloudflare R2 لتمكين رفع ملفات الإعلانات.
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

                    {/* Popup Info */}
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
                            className={`text-xs px-1.5 py-0.5 ${ad.urgency === 'critical' ? 'border-red-200 text-red-700' :
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

      {/* Refactored Add/Edit Dialog */}
      <AdFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        editingAd={editingAd}
        onSubmit={handleAdSubmit}
      />

      {/* Preview Dialog */}
      <Dialog open={!!previewAd} onOpenChange={() => setPreviewAd(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-0 shadow-2xl rounded-2xl" aria-describedby="preview-desc">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 text-white text-center relative">
            <button
              onClick={() => setPreviewAd(null)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 rounded-full p-1 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="text-lg font-bold flex items-center justify-center gap-2">
              <Eye className="h-5 w-5" />
              معاينة الإعلان
            </h3>
            <DialogDescription id="preview-desc" className="text-blue-100 text-xs mt-1">
              كيف سيظهر الإعلان للمستخدم
            </DialogDescription>
          </div>

          {previewAd && (
            <div className="max-h-[80vh] overflow-y-auto bg-gray-50">
              <div className="p-5 space-y-5">
                {/* Ad Card Preview */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  {previewAd.mediaUrl && (
                    <div className="relative w-full">
                      {previewAd.type === 'image' ? (
                        <img
                          src={previewAd.mediaUrl}
                          alt={previewAd.title}
                          className="w-full h-auto object-cover max-h-[250px]"
                        />
                      ) : previewAd.type === 'video' ? (
                        <div className="w-full aspect-video bg-gray-900 flex items-center justify-center">
                          <Video className="h-12 w-12 text-white/50" />
                        </div>
                      ) : null}

                      {previewAd.showCloseButton && (
                        <div className="absolute top-2 right-2 bg-black/50 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">✕</div>
                      )}
                    </div>
                  )}

                  <div className="p-4 text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">{previewAd.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">{previewAd.description}</p>

                    {previewAd.ctaText && (
                      <Button
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all active:scale-95"
                        onClick={() => {
                          if (previewAd.ctaUrl) {
                            const url = previewAd.ctaUrl.startsWith('http') ? previewAd.ctaUrl : `${window.location.origin}${previewAd.ctaUrl}`;
                            window.open(url, '_blank');
                          }
                        }}
                      >
                        {previewAd.ctaText}
                      </Button>
                    )}
                  </div>

                  {previewAd.showProgressBar && (
                    <div className="h-1 bg-gray-100 w-full"><div className="h-full bg-blue-600 w-1/3"></div></div>
                  )}
                </div>

                {/* Meta Info Compact */}
                <div className="bg-white p-3 rounded-xl border border-gray-200 text-xs text-gray-500 space-y-2">
                  <div className="flex justify-between border-b border-gray-100 pb-2 mb-2">
                    <span className="font-semibold text-gray-700">معلومات تقنية</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex justify-between">
                      <span>النوع:</span>
                      <span className="font-medium text-gray-900">{previewAd.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>الموقع:</span>
                      <span className="font-medium text-gray-900">{previewAd.displayLocation}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>الجمهور:</span>
                      <span className="font-medium text-gray-900">{previewAd.targetAudience}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>الحالة:</span>
                      <span className={`font-medium ${previewAd.isActive ? 'text-green-600' : 'text-red-600'}`}>
                        {previewAd.isActive ? 'نشط' : 'متوقف'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto" aria-describedby="analytics-desc">
          <DialogHeader className="bg-gradient-to-r from-purple-50 to-violet-50 p-6 rounded-t-xl">
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-purple-900">
              <BarChart3 className="h-7 w-7" />
              التحليلات المتقدمة للإعلانات المنبثقة
            </DialogTitle>
            <DialogDescription id="analytics-desc" className="text-purple-700 text-lg mt-2">
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
