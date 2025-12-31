'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video as VideoIcon,
  Save,
  AlertCircle,
  Loader2,
  FileVideo,
  Upload,
  Youtube,
  Info,
  ChevronRight,
  TrendingUp,
  LayoutGrid,
  Zap,
  ShieldCheck,
  Smartphone,
  Sparkles
} from 'lucide-react';
import type { Video } from '@/types/player';
import VideoManager from '@/components/video/VideoManager';
import { Button } from '@/components/ui/button';
import { actionLogService } from '@/lib/admin/action-logs';
import { toast, Toaster } from 'react-hot-toast';

export default function VideosPage() {
  const router = useRouter();
  const [user, loading] = useAuthState(auth);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const MAX_VIDEOS = 10;

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  useEffect(() => {
    const fetchVideos = async () => {
      if (!user) {
        router.push('/auth/login');
        return;
      }

      try {
        setIsLoading(true);
        const playerDoc = await getDoc(doc(db, 'players', user.uid));

        if (playerDoc.exists()) {
          const data = playerDoc.data();
          const safeVideos = (data.videos || []).map((v: any) => ({
            url: v.url,
            desc: v.desc ?? '',
            title: v.title ?? '',
            thumbnail: v.thumbnail ?? '',
            category: v.category ?? 'skills',
            duration: v.duration ?? '00:00',
            created_at: v.created_at
          }));
          setVideos(safeVideos);
        }
      } catch (error) {
        console.error('Error fetching videos:', error);
        toast.error('حدث خطأ أثناء تحميل الفيديوهات');
      } finally {
        setIsLoading(false);
      }
    };

    if (user && !loading) {
      fetchVideos();
    }
  }, [user, loading, router]);

  const handleSaveVideos = async () => {
    if (!user) return;

    try {
      setIsSaving(true);
      await updateDoc(doc(db, 'players', user.uid), {
        videos: videos,
        updated_at: new Date()
      });

      const newVideos = videos
        .map((v, idx) => ({ v, idx }))
        .filter(({ v }) => v.url && !(v as any).status);

      for (const { v, idx } of newVideos) {
        const videoId = `${user.uid}_${idx}`;
        await actionLogService.ensureUploadLoggedAndNotified({
          videoId,
          playerId: user.uid,
          playerName: user.displayName || user.email || 'مستخدم',
          videoTitle: v.title || v.desc || v.url,
          notificationTitle: 'تم رفع فيديو جديد',
          notificationMessage: `تمت إضافة فيديو "${v.title || 'مهارة جديدة'}" وهو بانتظار المراجعة.`
        });
      }

      setHasUnsavedChanges(false);
      toast.success('تم حفظ مكتبة المهارات بنجاح! ✨', {
        style: {
          borderRadius: '20px',
          background: '#0f172a',
          color: '#fff',
          padding: '16px 24px',
        }
      });
    } catch (error) {
      console.error('Error saving videos:', error);
      toast.error('فشل في حفظ التغييرات');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateVideos = (newVideos: Video[]) => {
    setVideos(newVideos);
    setHasUnsavedChanges(true);
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (loading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center mb-6"
        >
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        </motion.div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">جاري تجهيز استوديو المهارات...</h3>
        <p className="text-slate-400 font-medium">نحن نعد لك واجهة المبدعين الخاصة بك</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfdfe] text-slate-900" dir="rtl">
      <Toaster position="top-center" />

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-white border-b border-slate-100 pt-8 sm:pt-12 pb-10 sm:pb-16 mb-6 sm:mb-10">
        <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-100/40 via-transparent to-transparent opacity-60"></div>
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 lg:gap-12"
          >
            <div className="max-w-xl">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-600 font-black text-[10px] sm:text-[11px] uppercase tracking-[0.15em] mb-6 shadow-xl shadow-blue-500/20 text-white"
              >
                <Sparkles className="w-3.5 h-3.5" />
                معرض المهارات الاحترافي
              </motion.div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 mb-4 tracking-tight leading-tight">استوديو <span className="text-blue-600">المبدعين</span> ⚽</h1>
              <p className="text-slate-500 text-base sm:text-lg leading-relaxed font-medium">هنا مساحتك الخاصة لإبهار العالم. الفيديوهات التي ترفعها هي بوابتك للاحتراف حيث يراها أهم الكشافين والأندية حول العالم.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Button
                onClick={handleSaveVideos}
                disabled={isSaving || !hasUnsavedChanges}
                className={`w-full sm:w-auto px-10 py-7 rounded-[1.8rem] shadow-2xl transition-all duration-500 flex items-center justify-center gap-3 border-none ${hasUnsavedChanges
                    ? 'bg-blue-600 hover:bg-blue-700 text-white scale-105 ring-8 ring-blue-500/10'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                  }`}
              >
                {isSaving ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Save className="w-6 h-6" />
                )}
                <span className="font-black text-base">حفظ كل التغييرات</span>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 pb-24 lg:pb-32">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10"
        >
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-8 sm:space-y-12">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <motion.div
                variants={itemVariants}
                className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 shadow-[0_15px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_25px_60px_rgba(0,0,0,0.08)] transition-all duration-500 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-1000"></div>
                <div className="relative z-10 flex items-center gap-5">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm transition-colors group-hover:bg-blue-600 group-hover:text-white group-hover:rotate-6 duration-500">
                    <VideoIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-black text-slate-400 uppercase tracking-widest mb-1">المقاطع المرفوعة</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter">{videos.length}</span>
                      <span className="text-slate-400 text-lg font-bold">/ {MAX_VIDEOS}</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 shadow-[0_15px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_25px_60px_rgba(0,0,0,0.08)] transition-all duration-500 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/50 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-1000"></div>
                <div className="relative z-10 flex items-center gap-5">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm transition-colors group-hover:bg-emerald-600 group-hover:text-white group-hover:rotate-6 duration-500">
                    <TrendingUp className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-black text-slate-400 uppercase tracking-widest mb-1">معدل الاحتراف</p>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tighter">مثالي</span>
                      <div className="p-1 bg-emerald-100 rounded-full">
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Video Manager Component */}
            <motion.div
              variants={itemVariants}
              className="bg-white p-2 rounded-[3.5rem] border border-slate-100 shadow-xl lg:shadow-2xl overflow-hidden"
            >
              <VideoManager
                videos={videos}
                onUpdate={handleUpdateVideos}
                maxVideos={MAX_VIDEOS}
              />
            </motion.div>
          </div>

          {/* Sidebar Area */}
          <div className="lg:col-span-4 space-y-8">
            <motion.div
              variants={itemVariants}
              className="bg-slate-950 rounded-[3rem] p-8 sm:p-10 text-white relative overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 right-0 w-72 h-72 bg-blue-600/30 blur-[100px] rounded-full -mr-36 -mt-36"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-600/10 blur-[80px] rounded-full -ml-24 -mb-24"></div>

              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-500/40">
                    <Info className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-black tracking-tight">قواعد النجاح 💡</h3>
                </div>

                <div className="space-y-8">
                  <div className="flex gap-5">
                    <div className="flex-shrink-0 w-12 h-12 rounded-[1.25rem] bg-white/5 border border-white/10 flex items-center justify-center text-sm font-black text-blue-400">01</div>
                    <div className="pt-1">
                      <h4 className="font-black text-base text-white mb-2 flex items-center gap-2">
                        روابط الشبكات 📱
                      </h4>
                      <p className="text-sm text-slate-400 leading-relaxed font-medium">يمكنك لصق روابط YouTube أو TikTok مباشرة. نحن نتكفل بالباقي لعرضها بأفضل طريقة.</p>
                    </div>
                  </div>

                  <div className="flex gap-5">
                    <div className="flex-shrink-0 w-12 h-12 rounded-[1.25rem] bg-white/5 border border-white/10 flex items-center justify-center text-sm font-black text-blue-400">02</div>
                    <div className="pt-1">
                      <h4 className="font-black text-base text-white mb-2 flex items-center gap-2">
                        الرفع المباشر 📤
                      </h4>
                      <p className="text-sm text-slate-400 leading-relaxed font-medium">نقبل ملفات MP4 تصل مساحتها إلى 100MB للملف الواحد. تأكد من ثبات الصورة.</p>
                    </div>
                  </div>

                  <div className="flex gap-5">
                    <div className="flex-shrink-0 w-12 h-12 rounded-[1.25rem] bg-white/5 border border-white/10 flex items-center justify-center text-sm font-black text-blue-400">03</div>
                    <div className="pt-1">
                      <h4 className="font-black text-base text-white mb-2 flex items-center gap-2">
                        الجودة هي السر ✨
                      </h4>
                      <p className="text-sm text-slate-400 leading-relaxed font-medium">الفيديوهات المصورة بالعرض (Landscape) وبدقة 1080p تعطي انطباعاً أكثر احترافية.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-12 p-6 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-md">
                  <div className="flex items-center gap-2 text-[10px] font-black text-blue-400 mb-3 uppercase tracking-[0.2em]">
                    <AlertCircle className="w-3.5 h-3.5" /> تنبيه الخصوصية
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-medium">جميع الفيديوهات تخضع للمراجعة للتأكد من المحتوى الرياضي المناسب قبل النشر النهائي.</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-[3rem] p-1 flex flex-col justify-between overflow-hidden shadow-2xl shadow-blue-600/40 relative group"
            >
              <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
              <div className="bg-white/5 p-10 rounded-[2.8rem] relative z-10">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                  <Smartphone className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-white text-2xl font-black mb-3 tracking-tight">هل تريد مونتاجاً احترافياً؟ 🎬</h3>
                <p className="text-blue-100/80 text-sm mb-10 leading-relaxed font-medium">فريقنا يمكنه مساعدتك في تجميع أفضل مهاراتك في فيديو واحد يبهر الكشافين.</p>
                <button className="w-full bg-white text-blue-800 font-black py-5 rounded-2xl hover:bg-blue-50 transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95">
                  اطلب الخدمة الآن
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Floating Save Reminder */}
      <AnimatePresence>
        {hasUnsavedChanges && !isSaving && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-10 inset-x-4 sm:left-1/2 sm:-translate-x-1/2 z-[90] sm:w-auto"
          >
            <div className="bg-white/90 backdrop-blur-2xl border border-blue-100 p-5 rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.15)] flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-12 min-w-0 sm:min-w-[500px]">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0 animate-bounce">
                  <Zap className="w-6 h-6 fill-current" />
                </div>
                <div className="text-right">
                  <p className="text-base font-black text-slate-900 leading-none mb-1.5">تعديلات قيد الانتظار!</p>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">احفظ مجهودك قبل أن تذهب</p>
                </div>
              </div>
              <Button
                onClick={handleSaveVideos}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl px-12 py-7 shadow-2xl shadow-blue-500/30 transition-all hover:scale-105"
              >
                تأكيد الحفظ
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
