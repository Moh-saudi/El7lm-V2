'use client';

import { FileVideo, Link, Play, Trash2, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import ReactPlayer from 'react-player';

interface Video {
  url: string;
  desc: string;
  thumbnail?: string;
  title?: string;
}

interface VideoManagerProps {
  videos: Video[];
  onUpdate: (videos: Video[]) => void;
  allowedTypes?: string[];
}

export default function VideoManager({
  videos,
  onUpdate,
  allowedTypes = ['video/mp4', 'video/webm', 'video/ogg']
}) {
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newVideo, setNewVideo] = useState<Video>({ url: '', desc: '' });
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url' | 'youtube'>('youtube');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // إضافة فيديو جديد
  const handleAddVideo = () => {
    if (!newVideo.url.trim()) {
      alert('يرجى إدخال رابط الفيديو');
      return;
    }

    let finalUrl = newVideo.url.trim();

    // إذا كان YouTube، قم بتحويله إلى embed
    if (uploadMethod === 'youtube') {
      const videoId = extractVideoId(finalUrl);
      if (videoId) {
        finalUrl = `https://www.youtube.com/embed/${videoId}`;
        console.log('✅ تم تحويل رابط YouTube إلى embed:', finalUrl);
      } else {
        alert('رابط YouTube غير صحيح');
        return;
      }
    }

    const updatedVideos = [...videos, { ...newVideo, url: finalUrl }];
    onUpdate(updatedVideos);
    setNewVideo({ url: '', desc: '' });
    setIsAddingVideo(false);
  };

  // حذف فيديو
  const handleDeleteVideo = async (index: number) => {
    const videoToDelete = videos[index];

    // إذا كان الفيديو من Supabase، احذفه من التخزين
    if (videoToDelete.url.includes('supabase')) {
      try {
        const response = await fetch(`/api/upload/video?url=${encodeURIComponent(videoToDelete.url)}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          console.warn('فشل في حذف الفيديو من التخزين، سيتم حذفه من القائمة فقط');
        }
      } catch (error) {
        console.warn('خطأ في حذف الفيديو من التخزين:', error);
      }
    }

    const updatedVideos = videos.filter((_, i) => i !== index);
    onUpdate(updatedVideos);
  };

  // رفع ملف فيديو بسيط
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // التحقق من حجم الملف (100MB الحد الأقصى)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      alert(`❌ حجم الفيديو كبير جداً!\n\nحجم الملف: ${fileSizeMB} ميجابايت\nالحد الأقصى المسموح: 100 ميجابايت`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // الحصول على معرف المستخدم
      const { auth } = await import('@/lib/firebase/config');
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('يجب تسجيل الدخول أولاً');
      }

      console.log('🚀 بدء رفع الفيديو البسيط للمستخدم:', currentUser.uid);

      // إنشاء اسم فريد للملف
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop() || 'mp4';
      const baseFileName = file.name.split('.').slice(0, -1).join('.').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${timestamp}_${baseFileName}.${fileExt}`;
      const filePath = `videos/${currentUser.uid}/${fileName}`;

      // رفع مباشر إلى Supabase
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      console.log('📤 رفع الفيديو مباشرة إلى Supabase...');

      const { data, error } = await supabase.storage
        .from('videos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (error) {
        throw error;
      }

      // الحصول على الرابط العام
      const { data: urlData } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error('فشل في الحصول على رابط الفيديو');
      }

      console.log('✅ تم رفع الفيديو بنجاح:', urlData.publicUrl);

      setNewVideo(prev => ({ ...prev, url: urlData.publicUrl }));
      setUploadMethod('url');
      setUploadProgress(100);

    } catch (error) {
      console.error('❌ خطأ في رفع الفيديو:', error);
      let errorMessage = 'فشل في رفع الفيديو. يرجى المحاولة مرة أخرى.';

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      alert(`❌ خطأ في رفع الفيديو:\n\n${errorMessage}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // استخراج معرف الفيديو من رابط YouTube
  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  // توليد صورة مصغرة للفيديو
  const generateThumbnail = (url: string): string => {
    // إذا كان YouTube، استخدم صورة YouTube المصغرة
    const videoId = extractVideoId(url);
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }

    // إذا كان فيديو مباشر، استخدم صورة افتراضية
    if (url.includes('supabase') || url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg')) {
      return '/images/video-thumbnail-default.svg';
    }

    // صورة افتراضية
    return '/images/video-thumbnail-default.svg';
  };

  // رفع صورة مصغرة مخصصة
  const handleThumbnailUpload = async (file: File, videoIndex: number) => {
    if (!file) return;

    // التحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة صحيح');
      return;
    }

    // التحقق من حجم الملف (5MB الحد الأقصى)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert('حجم الصورة كبير جداً! الحد الأقصى 5 ميجابايت');
      return;
    }

    try {
      // الحصول على معرف المستخدم
      const { auth } = await import('@/lib/firebase/config');
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('يجب تسجيل الدخول أولاً');
      }

      // إنشاء اسم فريد للملف
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `thumbnail_${timestamp}.${fileExt}`;
      const filePath = `thumbnails/${currentUser.uid}/${fileName}`;

      // رفع مباشر إلى Supabase
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (error) {
        throw error;
      }

      // الحصول على الرابط العام
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error('فشل في الحصول على رابط الصورة');
      }

      // تحديث الفيديو بالصورة المصغرة الجديدة
      const updatedVideos = [...videos];
      updatedVideos[videoIndex] = { ...updatedVideos[videoIndex], thumbnail: urlData.publicUrl };
      onUpdate(updatedVideos);

      console.log('✅ تم رفع الصورة المصغرة بنجاح:', urlData.publicUrl);

    } catch (error) {
      console.error('❌ خطأ في رفع الصورة المصغرة:', error);
      alert('فشل في رفع الصورة المصغرة');
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد فيديوهات</h3>
          <p className="text-gray-500 mb-4">ابدأ بإضافة فيديو جديد لعرضه هنا</p>
          <button
            onClick={() => setIsAddingVideo(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            إضافة فيديو
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* عرض الفيديوهات في قائمة مع الصور المصغرة */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {videos.map((video, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
                {/* الصورة المصغرة */}
                <div className="aspect-video relative">
                  <img
                    src={video.thumbnail || generateThumbnail(video.url)}
                    alt={video.title || `فيديو ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/images/video-thumbnail-default.svg';
                    }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                      <Play className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                      className="p-1.5 bg-white bg-opacity-90 text-gray-600 hover:text-blue-600 hover:bg-opacity-100 rounded-md transition-colors"
                      title="تعديل"
                      aria-label="تعديل الفيديو"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteVideo(index)}
                      className="p-1.5 bg-white bg-opacity-90 text-gray-600 hover:text-red-600 hover:bg-opacity-100 rounded-md transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* معلومات الفيديو */}
                <div className="p-4">
                  {video.title && (
                    <h4 className="font-semibold text-gray-900 mb-2 overflow-hidden" style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>{video.title}</h4>
                  )}
                  {video.desc && (
                    <p className="text-gray-600 text-sm overflow-hidden" style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>{video.desc}</p>
                  )}
                  <button
                    onClick={() => {
                      // فتح الفيديو في نافذة منبثقة أو عرض مفصل
                      setEditingIndex(index);
                    }}
                    className="mt-3 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    عرض الفيديو
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* عرض مفصل للفيديو المحدد */}
          {editingIndex !== null && (
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              {/* شريط الأدوات */}
              <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                <div className="flex items-center gap-2">
                  <FileVideo className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    فيديو {index + 1}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title="تعديل"
                    aria-label="تعديل الفيديو"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteVideo(index)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* محتوى الفيديو */}
              <div className="p-4">
                {editingIndex === index ? (
                  // وضع التعديل
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        رابط الفيديو
                      </label>
                      <input
                        type="url"
                        value={video.url}
                        onChange={(e) => {
                          const updatedVideos = [...videos];
                          updatedVideos[index] = { ...updatedVideos[index], url: e.target.value };
                          onUpdate(updatedVideos);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://www.youtube.com/watch?v=..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        عنوان الفيديو
                      </label>
                      <input
                        type="text"
                        value={video.title || ''}
                        onChange={(e) => {
                          const updatedVideos = [...videos];
                          updatedVideos[index] = { ...updatedVideos[index], title: e.target.value };
                          onUpdate(updatedVideos);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="عنوان الفيديو..."
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
                          updatedVideos[index] = { ...updatedVideos[index], desc: e.target.value };
                          onUpdate(updatedVideos);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        placeholder="وصف الفيديو..."
                      />
                    </div>

                    {/* رفع صورة مصغرة مخصصة */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        صورة مصغرة مخصصة
                      </label>
                      <div className="flex items-center gap-4">
                        {video.thumbnail && (
                          <div className="w-20 h-12 rounded-md overflow-hidden border">
                            <img
                              src={video.thumbnail}
                              alt="صورة مصغرة"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleThumbnailUpload(file, index);
                          }}
                          className="hidden"
                          id={`thumbnail-${index}`}
                        />
                        <label
                          htmlFor={`thumbnail-${index}`}
                          className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer text-sm"
                        >
                          {video.thumbnail ? 'تغيير الصورة' : 'إضافة صورة'}
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        الصورة المصغرة ستظهر في قائمة الفيديوهات
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingIndex(null)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                      >
                        حفظ
                      </button>
                      <button
                        onClick={() => setEditingIndex(null)}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  // وضع العرض
                  <>
                    <div className="aspect-video relative">
                      <ReactPlayer
                        url={video.url}
                        width="100%"
                        height="100%"
                        controls
                        light={video.thumbnail || generateThumbnail(video.url)}
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
                      {video.title && (
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">{video.title}</h4>
                      )}
                      {video.desc && (
                        <p className="text-gray-700 text-sm leading-relaxed">{video.desc}</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* زر إضافة فيديو جديد */}
      {!isAddingVideo && (
        <div className="text-center">
          <button
            onClick={() => setIsAddingVideo(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Upload className="w-5 h-5" />
            إضافة فيديو جديد
          </button>
        </div>
      )}

      {/* نموذج إضافة فيديو جديد */}
      {isAddingVideo && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">إضافة فيديو جديد</h3>
            <button
              onClick={() => {
                setIsAddingVideo(false);
                setNewVideo({ url: '', desc: '' });
              }}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              title="إغلاق"
              aria-label="إغلاق نموذج إضافة الفيديو"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* اختيار طريقة الإضافة */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setUploadMethod('youtube')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm ${
                uploadMethod === 'youtube'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="text-red-600">📺</span>
              YouTube
            </button>
            <button
              onClick={() => setUploadMethod('url')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm ${
                uploadMethod === 'url'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Link className="w-4 h-4" />
              رابط
            </button>
            <button
              onClick={() => setUploadMethod('file')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm ${
                uploadMethod === 'file'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Upload className="w-4 h-4" />
              رفع ملف
            </button>
          </div>

          {uploadMethod === 'youtube' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رابط YouTube
              </label>
              <input
                type="url"
                value={newVideo.url}
                onChange={(e) => setNewVideo(prev => ({ ...prev, url: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="https://www.youtube.com/watch?v=..."
              />
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">
                  💡 <strong>الأسهل والأسرع!</strong> لا حدود حجم، جودة ممتازة، مجاني تماماً
                </p>
              </div>
            </div>
          ) : uploadMethod === 'url' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رابط الفيديو
              </label>
              <input
                type="url"
                value={newVideo.url}
                onChange={(e) => setNewVideo(prev => ({ ...prev, url: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/video.mp4"
              />
            </div>
          ) : (
            <div>
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-start gap-2">
                  <div className="text-green-600 mt-0.5">✅</div>
                  <div className="text-sm text-green-800">
                    <p className="font-medium mb-1">رفع مباشر إلى Supabase</p>
                    <p>حد الرفع: 100 ميجابايت - رفع سريع ومباشر بدون تعقيدات</p>
                  </div>
                </div>
              </div>
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
                  className="w-full p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors flex flex-col items-center gap-2 text-gray-600 hover:text-green-600 disabled:opacity-50"
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
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                        aria-label={`تقدم الرفع ${uploadProgress}%`}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* عنوان الفيديو */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              عنوان الفيديو (اختياري)
            </label>
            <input
              type="text"
              value={newVideo.title || ''}
              onChange={(e) => setNewVideo(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="عنوان الفيديو..."
            />
          </div>

          {/* وصف الفيديو */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              وصف الفيديو (اختياري)
            </label>
            <textarea
              value={newVideo.desc}
              onChange={(e) => setNewVideo(prev => ({ ...prev, desc: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="وصف الفيديو..."
            />
          </div>

          {/* صورة مصغرة مخصصة */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              صورة مصغرة مخصصة (اختياري)
            </label>
            <div className="flex items-center gap-4">
              {newVideo.thumbnail && (
                <div className="w-20 h-12 rounded-md overflow-hidden border">
                  <img
                    src={newVideo.thumbnail}
                    alt="صورة مصغرة"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // رفع الصورة المصغرة للفيديو الجديد
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      setNewVideo(prev => ({ ...prev, thumbnail: event.target?.result as string }));
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="hidden"
                id="new-video-thumbnail"
              />
              <label
                htmlFor="new-video-thumbnail"
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer text-sm"
              >
                {newVideo.thumbnail ? 'تغيير الصورة' : 'إضافة صورة مصغرة'}
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              الصورة المصغرة ستظهر في قائمة الفيديوهات
            </p>
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleAddVideo}
              disabled={!newVideo.url.trim() || isUploading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              إضافة الفيديو
            </button>
            <button
              onClick={() => {
                setIsAddingVideo(false);
                setNewVideo({ url: '', desc: '' });
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
}