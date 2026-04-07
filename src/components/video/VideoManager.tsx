'use client';

import { FileVideo, Link, Play, Trash2, Upload, X, Plus, Edit3, Youtube, AlertCircle, CheckCircle2, MoreVertical, ExternalLink, Calendar, Tag, PlayCircle, Clock } from 'lucide-react';
import { useRef, useState, useMemo } from 'react';
import ReactPlayer from 'react-player';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Video {
  url: string;
  desc: string;
  thumbnail?: string;
  title?: string;
  category?: 'match' | 'skills' | 'training' | 'other';
  duration?: string;
  created_at?: any;
}

interface VideoManagerProps {
  videos: Video[];
  onUpdate: (videos: Video[]) => void;
  allowedTypes?: string[];
  maxVideos?: number;
}

const VideoManager: React.FC<VideoManagerProps> = ({
  videos,
  onUpdate,
  maxVideos = 10
}) => {
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newVideo, setNewVideo] = useState<Video>({ url: '', desc: '', title: '', category: 'skills' });
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url' | 'youtube'>('youtube');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filter, setFilter] = useState<'all' | Video['category']>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredVideos = useMemo(() => {
    const list = videos.map((v, i) => ({ ...v, originalIndex: i }));
    if (filter === 'all') return list;
    return list.filter(v => v.category === filter);
  }, [videos, filter]);

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const generateThumbnail = (url: string): string => {
    const videoId = extractVideoId(url);
    if (videoId) return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    return 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800&auto=format&fit=crop';
  };

  const handleAddVideo = () => {
    if (!newVideo.url.trim()) return;

    let finalUrl = newVideo.url.trim();
    if (uploadMethod === 'youtube') {
      const videoId = extractVideoId(finalUrl);
      if (videoId) {
        finalUrl = `https://www.youtube.com/embed/${videoId}`;
      } else {
        alert('رابط YouTube غير صحيح');
        return;
      }
    }

    const updatedVideos = [...videos, { ...newVideo, url: finalUrl, created_at: new Date() }];
    onUpdate(updatedVideos);
    setNewVideo({ url: '', desc: '', title: '', category: 'skills' });
    setIsAddingVideo(false);
  };

  const handleDeleteVideo = (index: number) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الفيديو؟')) {
      const updatedVideos = videos.filter((_, i) => i !== index);
      onUpdate(updatedVideos);
    }
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && newVideo.url.trim()) {
      const updatedVideos = [...videos];
      updatedVideos[editingIndex] = newVideo;
      onUpdate(updatedVideos);
      setEditingIndex(null);
      setNewVideo({ url: '', desc: '', title: '', category: 'skills' });
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      alert('حجم الملف كبير جداً (الحد الأقصى 100MB)');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const { storageManager } = await import('@/lib/storage');
      const { supabase } = await import('@/lib/supabase/config');
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('يجب تسجيل الدخول');

      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const filePath = `videos/${currentUser.id}/${fileName}`;

      const result = await storageManager.upload('videos', filePath, file, {
        contentType: file.type,
      });

      setNewVideo(prev => ({ ...prev, url: result.publicUrl }));
      setUploadMethod('url');
      setUploadProgress(100);
    } catch (error: any) {
      alert(`خطأ في الرفع: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8 p-1 sm:p-4">
      {/* List Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-8 bg-blue-600 rounded-full hidden sm:block"></div>
            <h3 className="text-xl font-bold text-slate-900">مكتبة المقاطع</h3>
          </div>

          <div className="flex p-1 bg-slate-100/80 rounded-2xl overflow-x-auto no-scrollbar">
            {(['all', 'skills', 'match', 'training'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                  filter === f
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                {f === 'all' ? 'الكل' :
                  f === 'skills' ? 'مهارات' :
                    f === 'match' ? 'مباريات' : 'تدريب'}
              </button>
            ))}
          </div>
        </div>

        {videos.length < maxVideos && (
          <button
            onClick={() => {
              setEditingIndex(null);
              setNewVideo({ url: '', desc: '', title: '', category: 'skills' });
              setIsAddingVideo(true);
            }}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all text-sm font-bold shadow-lg shadow-slate-200 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>إضافة فيديو جديد</span>
          </button>
        )}
      </div>

      {/* Videos Grid */}
      <AnimatePresence mode="popLayout">
        {filteredVideos.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16 lg:py-24 px-6 border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-slate-50/30"
          >
            <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center shadow-xl shadow-slate-200/50 mb-6">
              <FileVideo className="w-10 h-10 text-slate-200" />
            </div>
            <h4 className="text-xl font-black text-slate-900 mb-2">
              {filter === 'all' ? 'رحلتك تبدأ هنا' : 'لا توجد مقاطع في هذا القسم'}
            </h4>
            <p className="text-slate-500 text-center max-w-sm mb-10 leading-relaxed">
              {filter === 'all'
                ? 'ارفع أول فيديو لمهاراتك لتبدأ في لفت أنظار الكشافين والأندية حول العالم.'
                : 'لم تقم بإضافة أي فيديوهات لهذا القسم بعد.'}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => setIsAddingVideo(true)}
                className="px-10 py-4 bg-blue-600 text-white rounded-[1.5rem] font-bold shadow-2xl shadow-blue-500/20 hover:bg-blue-700 transition-all group overflow-hidden relative"
              >
                <span className="relative z-10">ارفع أول مهارة لك 🔥</span>
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8"
          >
            {filteredVideos.map((video) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                key={video.originalIndex}
                className="group relative bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition-all duration-500 overflow-hidden flex flex-col h-full"
              >
                {/* Thumbnail Area */}
                <div className="aspect-[16/10] relative overflow-hidden bg-slate-900">
                  <img
                    src={video.thumbnail || generateThumbnail(video.url)}
                    alt={video.title || 'Video preview'}
                    className="w-full h-full object-cover group-hover:scale-110 group-hover:rotate-1 transition-transform duration-700 opacity-90"
                  />

                  {/* Overlay on Hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      onClick={() => {
                        setNewVideo(video);
                        setEditingIndex(video.originalIndex);
                      }}
                      className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center border border-white/30 transform scale-90 group-hover:scale-100 shadow-2xl transition-all duration-300"
                    >
                      <Play className="w-7 h-7 fill-current ml-1" />
                    </button>
                  </div>

                  {/* Top Badges */}
                  <div className="absolute top-4 inset-x-4 flex justify-between items-start">
                    <span className="px-4 py-1.5 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-wider text-slate-900 shadow-xl border border-white/50">
                      {video.category === 'match' ? '⚽ مباراة' :
                        video.category === 'skills' ? '🔥 مهارة' :
                          video.category === 'training' ? '🏋️ تدريب' : '📺 منوعة'}
                    </span>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setNewVideo(video);
                          setEditingIndex(video.originalIndex);
                        }}
                        className="p-2.5 bg-white/90 backdrop-blur rounded-xl text-slate-700 hover:text-blue-600 shadow-lg transition-all scale-90 hover:scale-100 opacity-0 group-hover:opacity-100"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteVideo(video.originalIndex)}
                        className="p-2.5 bg-red-500 text-white rounded-xl shadow-lg transition-all scale-90 hover:scale-100 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Video URL Type Badge */}
                  <div className="absolute bottom-4 left-4">
                    {video.url.toLowerCase().includes('youtube') && (
                      <div className="flex items-center gap-1 bg-red-600 text-white px-2 py-1 rounded-lg text-[10px] font-bold">
                        <Youtube className="w-3 h-3" />
                        YouTube
                      </div>
                    )}
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex-grow">
                    <h4 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors mb-2 line-clamp-1">
                      {video.title || 'فيديو مهارات بدون عنوان'}
                    </h4>
                    <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed h-[2.5rem]">
                      {video.desc || 'لا يوجد وصف متاح لهذا المقطع. تأكد من إضافة وصف لجذب انتباه الكشافين.'}
                    </p>
                  </div>

                  <div className="mt-6 pt-5 border-t border-slate-50 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{video.duration || '00:00'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{video.created_at ? new Date(video.created_at).toLocaleDateString('ar-EG') : 'تم الرفع حديثاً'}</span>
                    </div>
                  </div>
                </div>

                {/* Visual Accent */}
                <div className="h-1.5 w-0 group-hover:w-full bg-blue-600 transition-all duration-500" />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Modal Overlay */}
      <AnimatePresence>
        {(isAddingVideo || editingIndex !== null) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => {
                if (!isUploading) {
                  setIsAddingVideo(false);
                  setEditingIndex(null);
                }
              }}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white sm:rounded-[2.5rem] shadow-2xl min-h-screen sm:min-h-0 flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 sm:p-8 flex items-center justify-between border-b border-slate-50 sticky top-0 bg-white sm:static z-10">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                    {editingIndex !== null ? 'تحديث المهارة' : 'مشاركة مهارة جديدة'}
                  </h3>
                  <p className="text-slate-500 text-xs sm:text-sm mt-1 font-medium">اجذب انتباه العالم بلقطاتك الاحترافية</p>
                </div>
                <button
                  onClick={() => {
                    if (!isUploading) {
                      setIsAddingVideo(false);
                      setEditingIndex(null);
                    }
                  }}
                  className="p-3 hover:bg-slate-100 rounded-2xl transition-all"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 sm:p-10 flex-grow max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
                <div className="space-y-8">
                  {/* Method Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-900 block px-1">طريقة الإضافة</label>
                    <div className="grid grid-cols-3 p-1.5 bg-slate-100/80 rounded-2xl gap-2">
                      {[
                        { id: 'youtube', label: 'يوتيوب', icon: Youtube, color: 'text-red-600' },
                        { id: 'url', label: 'رابط', icon: Link, color: 'text-blue-600' },
                        { id: 'file', label: 'ملف', icon: Upload, color: 'text-emerald-600' }
                      ].map(method => (
                        <button
                          key={method.id}
                          disabled={isUploading}
                          onClick={() => setUploadMethod(method.id as any)}
                          className={cn(
                            "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 sm:py-4 rounded-xl font-bold text-[10px] sm:text-xs transition-all",
                            uploadMethod === method.id
                              ? "bg-white text-slate-900 shadow-xl shadow-slate-200/50"
                              : "text-slate-500 hover:bg-white/50"
                          )}
                        >
                          <method.icon className={cn("w-4 h-4", method.color)} />
                          <span>{method.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Input Fields */}
                  <div className="space-y-6">
                    {uploadMethod === 'file' ? (
                      <div
                        onClick={() => !isUploading && fileInputRef.current?.click()}
                        className={cn(
                          "group cursor-pointer border-2 border-dashed rounded-[2rem] p-8 sm:p-12 flex flex-col items-center justify-center transition-all",
                          isUploading ? "border-emerald-200 bg-emerald-50/20" : "border-slate-200 hover:border-blue-400 hover:bg-blue-50/50"
                        )}
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="video/*"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                        />
                        {isUploading ? (
                          <div className="w-full max-w-xs text-center">
                            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                              <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
                            </div>
                            <p className="text-emerald-700 font-black mb-4">جاري المعالجة... {uploadProgress}%</p>
                            <div className="w-full bg-emerald-100/50 rounded-full h-2.5 overflow-hidden">
                              <motion.div
                                className="bg-emerald-500 h-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="w-20 h-20 bg-blue-50 rounded-[1.5rem] flex items-center justify-center shadow-sm mb-6 group-hover:scale-110 transition-transform duration-500">
                              <Upload className="w-10 h-10 text-blue-500" />
                            </div>
                            <h4 className="text-slate-900 font-black text-lg text-center">اضغط لاختيار ملف الفيديو</h4>
                            <p className="text-slate-400 text-xs mt-3 uppercase tracking-widest font-bold">MP4, MOV (MAX 100MB)</p>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-900 block px-1">رابط الفيديو</label>
                        <div className="relative group">
                          <input
                            type="url"
                            value={newVideo.url}
                            onChange={(e) => setNewVideo({ ...newVideo, url: e.target.value })}
                            className="w-full h-16 pr-14 pl-6 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all font-bold placeholder:font-medium placeholder:text-slate-300"
                            placeholder={uploadMethod === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://example.com/video.mp4'}
                          />
                          <div className="absolute inset-y-0 right-0 pr-5 flex items-center pointer-events-none text-slate-300 group-focus-within:text-blue-500 transition-colors">
                            {uploadMethod === 'youtube' ? <Youtube className="w-6 h-6" /> : <Link className="w-6 h-6" />}
                          </div>
                        </div>
                        {uploadMethod === 'youtube' && (
                          <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-2xl text-[11px] font-bold border border-red-100/50 leading-relaxed">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>نظامنا متوافق مع فيديوهات Shorts وفيديوهات YouTube العادية بجميع أنواعها.</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-900 block px-1">عنوان المقطع</label>
                        <input
                          type="text"
                          value={newVideo.title}
                          onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                          className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all font-bold"
                          placeholder="مثال: أهداف الموسم 2024"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-900 block px-1">تصنيف المهارة</label>
                        <div className="relative">
                          <select
                            value={newVideo.category}
                            onChange={(e) => setNewVideo({ ...newVideo, category: e.target.value as any })}
                            className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all appearance-none font-bold cursor-pointer"
                          >
                            <option value="skills">🔥 لقطات مهارية فنية</option>
                            <option value="match">⚽ مباراة كاملة / ملخص</option>
                            <option value="training">🏋️ تمارين بدنية وفنية</option>
                            <option value="other">📺 أنواع أخرى</option>
                          </select>
                          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                            <Tag className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-900 block px-1">وصف المهارة</label>
                      <textarea
                        value={newVideo.desc}
                        onChange={(e) => setNewVideo({ ...newVideo, desc: e.target.value })}
                        rows={4}
                        className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2rem] focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all resize-none font-bold placeholder:font-medium"
                        placeholder="اوصف لقطاتك بكلمات تشد المحترفين..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 sm:p-10 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-4 sticky bottom-0 sm:static">
                <button
                  onClick={() => {
                    if (!isUploading) {
                      setIsAddingVideo(false);
                      setEditingIndex(null);
                    }
                  }}
                  className="w-full sm:w-auto px-8 py-4 text-slate-500 font-black hover:text-slate-800 transition-colors order-2 sm:order-1"
                >
                  تراجع
                </button>
                <button
                  onClick={editingIndex !== null ? handleSaveEdit : handleAddVideo}
                  disabled={isUploading || !newVideo.url}
                  className="w-full sm:w-auto px-12 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-2xl shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3 order-1 sm:order-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{editingIndex !== null ? 'تأكيد التعديلات' : 'نشر الفيديو الآن'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Loader2 = ({ className }: { className?: string }) => (
  <svg
    className={cn("animate-spin", className)}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export default VideoManager;