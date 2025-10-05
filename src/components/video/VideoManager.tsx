'use client';

import { Video } from '@/types/player';
import { AnimatePresence, motion } from 'framer-motion';
import {
    X as Cancel,
    Edit3,
    FileVideo,
    Link,
    Play,
    Plus,
    Save,
    Trash2,
    Upload,
    X
} from 'lucide-react';
import dynamic from 'next/dynamic';
import React, { useRef, useState } from 'react';

const ReactPlayer = dynamic(() => import('react-player'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">جاري تحميل الفيديو...</div>
});

interface VideoManagerProps {
  videos: Video[];
  onUpdate: (videos: Video[]) => void;
  maxVideos?: number;
  allowedTypes?: string[];
}

const VideoManager: React.FC<VideoManagerProps> = ({
  videos = [],
  onUpdate,
  maxVideos = 10,
  allowedTypes = ['video/mp4', 'video/webm', 'video/ogg']
}) => {
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newVideo, setNewVideo] = useState<Video>({ url: '', desc: '' });
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url'>('url');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // إضافة فيديو جديد
  const handleAddVideo = () => {
    if (newVideo.url.trim()) {
      const updatedVideos = [...videos, { ...newVideo }];
      onUpdate(updatedVideos);
      setNewVideo({ url: '', desc: '' });
      setIsAddingVideo(false);
    }
  };

  // حذف فيديو
  const handleDeleteVideo = async (index: number) => {
    const videoToDelete = videos[index];

    // التأكد من الحذف
    if (!confirm('هل تريد حذف هذا الفيديو نهائياً؟')) {
      return;
    }

    try {
      // إذا كان الفيديو مرفوع على Supabase Storage، احذفه من هناك أيضاً
      if (videoToDelete.url && videoToDelete.url.includes('supabase.co')) {
        console.log('🗑️ حذف الفيديو من Supabase Storage:', videoToDelete.url);

        const response = await fetch(`/api/upload/video?url=${encodeURIComponent(videoToDelete.url)}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ خطأ في حذف الفيديو من Storage:', errorData.error);
        } else {
          console.log('✅ تم حذف الفيديو من Supabase Storage');
        }
      }

      // حذف الفيديو من القائمة
      const updatedVideos = videos.filter((_, i) => i !== index);
      onUpdate(updatedVideos);

    } catch (error) {
      console.error('❌ خطأ في حذف الفيديو:', error);

      // حتى لو فشل حذف الملف من Storage، احذفه من القائمة
      if (confirm('حدث خطأ أثناء حذف الملف من التخزين. هل تريد حذفه من القائمة على أي حال؟')) {
        const updatedVideos = videos.filter((_, i) => i !== index);
        onUpdate(updatedVideos);
      }
    }
  };

  // تعديل فيديو
  const handleEditVideo = (index: number, updatedVideo: Video) => {
    const updatedVideos = videos.map((video, i) =>
      i === index ? updatedVideo : video
    );
    onUpdate(updatedVideos);
    setEditingIndex(null);
  };

  // رفع ملف فيديو
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // التحقق من حجم الملف أولاً (100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      alert(`❌ حجم الفيديو كبير جداً!\n\nحجم الملف: ${fileSizeMB} ميجابايت\nالحد الأقصى المسموح: 100 ميجابايت\n\n💡 نصائح:\n• جرب ضغط الفيديو قبل الرفع\n• اختر فيديو أقصر مدة\n• استخدم برامج ضغط الفيديو مثل HandBrake`);
      return;
    }

    // التحقق من صحة الملف
    const { validateVideoFile } = await import('@/lib/supabase/video-storage');
    const validation = validateVideoFile(file, { allowedTypes });
    const validationResult = validation as { isValid: boolean; errors: string[] };
    if (!validationResult.isValid) {
      alert(validationResult.errors.join('\n'));
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // الحصول على معرف المستخدم من Firebase Auth
      const { auth } = await import('@/lib/firebase/config');
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('يجب تسجيل الدخول أولاً');
      }

      console.log('🚀 بدء رفع الفيديو للمستخدم:', currentUser.uid);

      // إنشاء FormData للرفع
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', currentUser.uid);

      // رفع الفيديو عبر API route
      const response = await fetch('/api/upload/video', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (jsonError) {
          // إذا فشل في تحليل JSON، استخدم رسالة افتراضية
          console.error('❌ فشل في تحليل استجابة الخادم:', jsonError);
          errorData = { error: 'استجابة غير صحيحة من الخادم' };
        }

        // معالجة خاصة لخطأ حجم الملف الكبير
        if (response.status === 413 || errorData.error?.includes('حجم الفيديو كبير') || errorData.error?.includes('حجم الملف كبير')) {
          const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
          throw new Error(`❌ حجم الفيديو كبير جداً!\n\nحجم الملف: ${fileSizeMB} ميجابايت\nالحد الأقصى المسموح: 100 ميجابايت\n\n💡 نصائح:\n• جرب ضغط الفيديو قبل الرفع\n• اختر فيديو أقصر مدة\n• استخدم برامج ضغط الفيديو مثل HandBrake`);
        }

        // معالجة أخطاء أخرى
        if (response.status === 503) {
          throw new Error('خدمة التخزين غير متاحة حالياً. يرجى المحاولة لاحقاً.');
        }

        if (response.status === 400) {
          throw new Error(errorData.error || 'بيانات الطلب غير صحيحة');
        }

        throw new Error(errorData.error || `فشل في رفع الفيديو (${response.status})`);
      }

      const result = await response.json();

      console.log('✅ تم رفع الفيديو بنجاح:', result.url);

      setNewVideo(prev => ({ ...prev, url: result.url }));
      setUploadMethod('url');

    } catch (error) {
      console.error('❌ خطأ في رفع الفيديو:', error);
      let errorMessage = 'فشل في رفع الفيديو. يرجى المحاولة مرة أخرى.';

      if (error instanceof Error) {
        errorMessage = error.message;

        // إذا كانت رسالة الخطأ تحتوي على نصائح، استخدم toast بدلاً من alert
        if (errorMessage.includes('💡 نصائح:')) {
          // يمكن استخدام toast library هنا إذا كان متوفراً
          alert(errorMessage);
        } else {
          alert(errorMessage);
        }
      } else {
        alert(errorMessage);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // التحقق من صحة URL
  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-6">
      {/* عرض الفيديوهات الموجودة */}
      {videos.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileVideo className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">لا توجد فيديوهات</h3>
          <p className="text-gray-500 mb-4">ابدأ بإضافة فيديو جديد لعرض مهاراتك</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {videos.map((video, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white rounded-lg shadow-md overflow-hidden"
            >
              {editingIndex === index ? (
                // وضع التعديل
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      رابط الفيديو
                    </label>
                    <input
                      type="url"
                      value={video.url}
                      onChange={(e) => {
                        const updatedVideos = [...videos];
                        updatedVideos[index] = { ...video, url: e.target.value };
                        onUpdate(updatedVideos);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      وصف الفيديو
                    </label>
                    <textarea
                      value={video.desc}
                      onChange={(e) => {
                        const updatedVideos = [...videos];
                        updatedVideos[index] = { ...video, desc: e.target.value };
                        onUpdate(updatedVideos);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="اكتب وصف للفيديو..."
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditVideo(index, video)}
                      className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-md hover:shadow-lg"
                    >
                      <Save className="w-4 h-4" />
                      حفظ
                    </button>
                    <button
                      onClick={() => setEditingIndex(null)}
                      className="flex items-center gap-2 px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors shadow-md hover:shadow-lg"
                    >
                      <Cancel className="w-4 h-4" />
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                // وضع العرض
                <>
                  <div className="aspect-video">
                    <ReactPlayer
                      url={video.url}
                      width="100%"
                      height="100%"
                      controls
                      light
                      playIcon={
                        <div className="flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full">
                          <Play className="w-8 h-8 text-white" />
                        </div>
                      }
                      config={{
                        youtube: {
                          embedOptions: {
                            host: 'https://www.youtube.com'
                          },
                          playerVars: {
                            origin: typeof window !== 'undefined' ? window.location.origin : '',
                            rel: 0,
                            modestbranding: 1,
                            showinfo: 0,
                            enablejsapi: 1,
                            iv_load_policy: 3,
                            cc_load_policy: 0,
                            fs: 1,
                            disablekb: 0,
                            autoplay: 0,
                            mute: 0,
                            loop: 0,
                            controls: 1,
                            playsinline: 1,
                            color: 'white',
                            hl: 'ar',
                            cc_lang_pref: 'ar',
                            end: 0,
                            start: 0,
                            vq: 'hd720',
                            wmode: 'transparent',
                            allowfullscreen: true,
                            allowscriptaccess: 'always'
                          }
                        }
                      }}
                    />
                  </div>

                  <div className="p-4">
                    <p className="text-gray-700 text-sm mb-3">
                      {video.desc || 'لا يوجد وصف'}
                    </p>

                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingIndex(index)}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                        >
                          <Edit3 className="w-4 h-4" />
                          تعديل
                        </button>
                        <button
                          onClick={() => handleDeleteVideo(index)}
                          className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-md hover:shadow-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                          حذف
                        </button>
                      </div>

                      <span className="text-xs text-gray-500">
                        فيديو {index + 1}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* زر إضافة فيديو جديد */}
      {videos.length < maxVideos && !isAddingVideo && (
        <button
          onClick={() => setIsAddingVideo(true)}
          className="w-full p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors flex flex-col items-center gap-2 text-gray-600 hover:text-blue-600"
        >
          <Plus className="w-8 h-8" />
          <span className="font-medium">إضافة فيديو جديد</span>
          <span className="text-sm">({videos.length}/{maxVideos})</span>
        </button>
      )}

      {/* نموذج إضافة فيديو جديد */}
      <AnimatePresence>
        {isAddingVideo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">إضافة فيديو جديد</h3>
                <button
                  onClick={() => {
                    setIsAddingVideo(false);
                    setNewVideo({ url: '', desc: '' });
                    setUploadMethod('url');
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  title="إغلاق"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* اختيار طريقة الإضافة */}
              <div className="flex gap-4 mb-4">
                <button
                  onClick={() => setUploadMethod('url')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                    uploadMethod === 'url'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Link className="w-4 h-4" />
                  رابط فيديو
                </button>
                <button
                  onClick={() => setUploadMethod('file')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                    uploadMethod === 'file'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  رفع ملف
                </button>
              </div>

              {uploadMethod === 'url' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رابط الفيديو
                  </label>
                  <input
                    type="url"
                    value={newVideo.url}
                    onChange={(e) => setNewVideo(prev => ({ ...prev, url: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ملف الفيديو
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    className="hidden"
                    title="اختر ملف فيديو"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors flex flex-col items-center gap-2 text-gray-600 hover:text-blue-600 disabled:opacity-50"
                  >
                    <FileVideo className="w-8 h-8" />
                    <span className="font-medium">
                      {isUploading ? 'جاري الرفع...' : 'اختر ملف فيديو'}
                    </span>
                    <span className="text-sm">MP4, WebM, OGG (حد أقصى 100MB)</span>
                  </button>

                  {isUploading && (
                    <div className="mt-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>جاري الرفع...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  وصف الفيديو
                </label>
                <textarea
                  value={newVideo.desc}
                  onChange={(e) => setNewVideo(prev => ({ ...prev, desc: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="اكتب وصف مختصر للفيديو (اختياري)..."
                />
              </div>

              {/* معاينة الفيديو */}
              {newVideo.url && isValidUrl(newVideo.url) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    معاينة
                  </label>
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <ReactPlayer
                      url={newVideo.url}
                      width="100%"
                      height="100%"
                      controls
                      light
                      config={{
                        youtube: {
                          embedOptions: {
                            host: 'https://www.youtube.com'
                          },
                          playerVars: {
                            origin: typeof window !== 'undefined' ? window.location.origin : '',
                            rel: 0,
                            modestbranding: 1,
                            showinfo: 0,
                            enablejsapi: 1,
                            iv_load_policy: 3,
                            cc_load_policy: 0,
                            fs: 1,
                            disablekb: 0,
                            autoplay: 0,
                            mute: 0,
                            loop: 0,
                            controls: 1,
                            playsinline: 1,
                            color: 'white',
                            hl: 'ar',
                            cc_lang_pref: 'ar',
                            end: 0,
                            start: 0,
                            vq: 'hd720',
                            wmode: 'transparent',
                            allowfullscreen: true,
                            allowscriptaccess: 'always'
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAddVideo}
                  disabled={!newVideo.url || isUploading}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  إضافة الفيديو
                </button>
                <button
                  onClick={() => {
                    setIsAddingVideo(false);
                    setNewVideo({ url: '', desc: '' });
                    setUploadMethod('url');
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors shadow-md hover:shadow-lg"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* رسالة عند الوصول للحد الأقصى */}
      {videos.length >= maxVideos && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
            وصلت للحد الأقصى من الفيديوهات ({maxVideos}). يمكنك حذف فيديو موجود لإضافة فيديو جديد.
          </p>
        </div>
      )}
    </div>
  );
};

export default VideoManager;
