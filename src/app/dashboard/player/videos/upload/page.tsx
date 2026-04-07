'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { videoService } from '@/lib/video/video-service';
import { referralService } from '@/lib/referral/referral-service';
import { POINTS_CONVERSION } from '@/types/referral';
import type { PlayerVideo, VideoCategory } from '@/lib/video/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Video,
  Upload,
  Play,
  Clock,
  Eye,
  ThumbsUp,
  DollarSign,
  Award,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileVideo,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

const CATEGORY_OPTIONS: { value: VideoCategory; label: string }[] = [
  { value: 'skills', label: 'مهارات' },
  { value: 'match', label: 'مباراة' },
  { value: 'training', label: 'تدريب' },
  { value: 'attack', label: 'هجوم' },
  { value: 'midfield', label: 'وسط' },
  { value: 'defense', label: 'دفاع' },
  { value: 'goalkeeper', label: 'حراسة مرمى' },
  { value: 'other', label: 'أخرى' },
];

interface PlayerRewards {
  totalPoints: number;
  availablePoints: number;
}

export default function VideoUploadPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [playerRewards, setPlayerRewards] = useState<PlayerRewards | null>(null);
  const [uploadedVideos, setUploadedVideos] = useState<PlayerVideo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [videoCategory, setVideoCategory] = useState<VideoCategory>('other');
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rewards, videos] = await Promise.all([
        referralService.createOrUpdatePlayerRewards(user!.id).catch(() => null),
        videoService.getByPlayer(user!.id).catch(() => []),
      ]);
      if (rewards) setPlayerRewards(rewards);
      setUploadedVideos(videos);
    } catch (error) {
      console.error('خطأ في تحميل البيانات:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error('يرجى اختيار ملف فيديو صحيح');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      const mb = (file.size / (1024 * 1024)).toFixed(0);
      toast.error(`حجم الملف (${mb} MB) يتجاوز الحد الأقصى 500 MB`);
      return;
    }

    setSelectedFile(file);
    setVideoTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
  };

  const handleUpload = async () => {
    if (!selectedFile || !videoTitle.trim() || !user?.id) return;

    setUploading(true);
    setUploadProgress(0);

    // Simulate progress (real progress needs XHR, not fetch)
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 3, 90));
    }, 300);

    try {
      const { video } = await videoService.upload({
        file: selectedFile,
        playerId: user.id,
        title: videoTitle,
        description: videoDescription,
        category: videoCategory,
        accountType: 'independent',
        autoQueueAnalysis: false,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      setUploadedVideos(prev => [video, ...prev]);

      toast.success('تم رفع الفيديو بنجاح! سيتم مراجعته قريباً');
      setShowUploadModal(false);
      setSelectedFile(null);
      setVideoTitle('');
      setVideoDescription('');
      setVideoCategory('other');

    } catch (error) {
      clearInterval(progressInterval);
      console.error('خطأ في رفع الفيديو:', error);
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء رفع الفيديو');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'approved') return 'bg-green-500';
    if (status === 'rejected') return 'bg-red-500';
    return 'bg-yellow-500';
  };

  const getStatusText = (status: string) => {
    if (status === 'approved') return 'تمت الموافقة';
    if (status === 'rejected') return 'مرفوض';
    return 'قيد المراجعة';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'approved') return <CheckCircle className="w-4 h-4" />;
    if (status === 'rejected') return <XCircle className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">رفع الفيديوهات</h1>
        <div className="flex items-center gap-2">
          <Video className="w-6 h-6 text-blue-500" />
          <span className="text-lg font-semibold">كسب النقاط</span>
        </div>
      </div>

      {/* بطاقة النقاط */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">النقاط المتوفرة</p>
                <p className="text-3xl font-bold">
                  {playerRewards?.availablePoints.toLocaleString() ?? '—'}
                </p>
                <p className="text-sm text-blue-100">
                  ≈ ${((playerRewards?.availablePoints ?? 0) / POINTS_CONVERSION.POINTS_PER_DOLLAR).toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-12 h-12" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* كيف تكسب النقاط */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              كيف تكسب النقاط من الفيديوهات؟
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: <Upload className="w-8 h-8 text-blue-600" />, step: '1', title: 'ارفع فيديو', desc: 'ارفع فيديو يظهر مهاراتك في كرة القدم (حتى 500 MB)', bg: 'bg-blue-100' },
                { icon: <CheckCircle className="w-8 h-8 text-yellow-600" />, step: '2', title: 'انتظر المراجعة', desc: 'سيقوم فريقنا بمراجعة الفيديو خلال 24 ساعة', bg: 'bg-yellow-100' },
                { icon: <DollarSign className="w-8 h-8 text-green-600" />, step: '3', title: 'احصل على النقاط', desc: '1,000 نقطة لكل فيديو تمت الموافقة عليه', bg: 'bg-green-100' },
              ].map(({ icon, step, title, desc, bg }) => (
                <div key={step} className="text-center">
                  <div className={`w-16 h-16 ${bg} rounded-full flex items-center justify-center mx-auto mb-4`}>
                    {icon}
                  </div>
                  <h3 className="font-semibold mb-2">{step}. {title}</h3>
                  <p className="text-sm text-gray-600">{desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* زر الرفع */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardContent className="p-6 text-center">
            <Button
              onClick={() => setShowUploadModal(true)}
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
            >
              <Upload className="w-5 h-5 mr-2" />
              رفع فيديو جديد
            </Button>
            <p className="text-sm text-gray-500 mt-2">احصل على 1,000 نقطة لكل فيديو تمت الموافقة عليه</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* قائمة الفيديوهات */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              الفيديوهات المرفوعة ({uploadedVideos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {uploadedVideos.length === 0 ? (
              <div className="text-center py-8">
                <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">لم تقم برفع أي فيديوهات بعد</p>
                <Button onClick={() => setShowUploadModal(true)} variant="outline" className="mt-4">
                  رفع أول فيديو
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {uploadedVideos.map((video) => (
                  <div key={video.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Play className="w-8 h-8 text-gray-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{video.title}</h3>
                      <p className="text-sm text-gray-600 line-clamp-1">{video.description}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>{new Date(video.createdAt).toLocaleDateString('ar-SA')}</span>
                        {video.fileSize && <span>{formatFileSize(video.fileSize)}</span>}
                        {video.duration > 0 && (
                          <span>{Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}</span>
                        )}
                        {video.category && video.category !== 'other' && (
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {CATEGORY_OPTIONS.find(c => c.value === video.category)?.label}
                          </span>
                        )}
                        {/* Analysis badge */}
                        {video.analysisStatus === 'completed' && (
                          <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Eye className="w-3 h-3" /> تم التحليل
                            {video.analysisResult?.overallScore != null && (
                              <span className="font-bold">{video.analysisResult.overallScore}/100</span>
                            )}
                          </span>
                        )}
                        {video.analysisStatus === 'queued' && (
                          <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                            في طابور التحليل
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <Badge className={`${getStatusColor(video.status)} text-white`}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(video.status)}
                          {getStatusText(video.status)}
                        </div>
                      </Badge>
                      {video.status === 'approved' && video.pointsEarned > 0 && (
                        <div className="text-sm text-green-600 mt-1 font-semibold">
                          +{video.pointsEarned.toLocaleString()} نقطة
                        </div>
                      )}
                      {video.status === 'rejected' && video.adminNotes && (
                        <div className="text-xs text-red-600 mt-1 max-w-32 text-right">
                          {video.adminNotes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* مودال الرفع */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">رفع فيديو جديد</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowUploadModal(false)}>
                <XCircle className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* اختيار الملف */}
              <div>
                <label className="block text-sm font-medium mb-2">اختر ملف الفيديو</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/ogg,video/avi,video/mov,video/quicktime"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="video-upload"
                  />
                  <label htmlFor="video-upload" className="cursor-pointer">
                    <FileVideo className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    {selectedFile ? (
                      <div>
                        <p className="text-sm font-medium text-gray-800 truncate">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-600">انقر لاختيار ملف فيديو</p>
                        <p className="text-xs text-gray-400 mt-1">MP4, WebM, MOV — حتى 500 MB</p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* العنوان */}
              <div>
                <label className="block text-sm font-medium mb-1">عنوان الفيديو *</label>
                <Input
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="أدخل عنوان الفيديو"
                  maxLength={100}
                />
              </div>

              {/* التصنيف */}
              <div>
                <label className="block text-sm font-medium mb-1">تصنيف الفيديو</label>
                <select
                  value={videoCategory}
                  onChange={(e) => setVideoCategory(e.target.value as VideoCategory)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* الوصف */}
              <div>
                <label className="block text-sm font-medium mb-1">وصف الفيديو</label>
                <Textarea
                  value={videoDescription}
                  onChange={(e) => setVideoDescription(e.target.value)}
                  placeholder="وصف مختصر للفيديو..."
                  rows={3}
                  maxLength={500}
                />
              </div>

              {/* شريط التقدم */}
              {uploading && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>جاري الرفع...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* نصائح */}
              <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 space-y-1">
                <p className="font-semibold">نصائح للحصول على الموافقة:</p>
                <p>• تأكد من جودة الفيديو والإضاءة الجيدة</p>
                <p>• اظهر مهاراتك بوضوح في الفيديو</p>
                <p>• اختر التصنيف المناسب ليُسهّل التحليل الذكي</p>
                <p>• تجنب المحتوى المسيء</p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || !videoTitle.trim() || uploading}
                  className="flex-1"
                >
                  {uploading ? `جاري الرفع... ${uploadProgress}%` : 'رفع الفيديو'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setShowUploadModal(false); setSelectedFile(null); }}
                  disabled={uploading}
                  className="flex-1"
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
