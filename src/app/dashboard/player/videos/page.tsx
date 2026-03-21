'use client';

import React, {
  useState, useEffect, useCallback, useMemo, useRef,
} from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { uploadPlayerVideo } from '@/lib/firebase/upload-media';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video as VideoIcon, Save, Loader2, Upload, Youtube, Eye, Heart,
  MessageCircle, Share2, Calendar, Trash2, Edit3, Plus, Film,
  TrendingUp, Play, X, Link as LinkIcon, CheckCircle2, AlertCircle,
  Clapperboard, Camera, Smartphone, ArrowLeft, ChevronDown,
  ChevronUp, Zap, Star, Lightbulb, Clock, RotateCw, Trophy,
  Facebook, ExternalLink, Info, BarChart3,
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

// ─── Types ────────────────────────────────────────────────────────────────────

interface FirestoreVideo {
  url: string;
  title?: string;
  desc?: string;
  type?: 'youtube' | 'vimeo' | 'other' | 'uploaded';
  createdAt?: string;
  created_at?: any;
  likes?: number;
  comments?: any;
  commentsCount?: number;
  shares?: number;
  views?: number;
  thumbnail?: string;
  category?: string;
  duration?: string;
  [key: string]: any;
}

type UploadTab = 'camera' | 'file' | 'url';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getYoutubeThumbnail(url: string): string | null {
  const m = url?.match(/(?:youtube\.com.*[?&]v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
}

function getVideoThumbnail(v: FirestoreVideo): string {
  if (v.thumbnail) return v.thumbnail;
  const yt = getYoutubeThumbnail(v.url || '');
  if (yt) return yt;
  return '';
}

function getCommentCount(v: FirestoreVideo): number {
  if (Array.isArray(v.comments)) return v.comments.length;
  if (typeof v.commentsCount === 'number') return v.commentsCount;
  if (typeof v.comments === 'number') return v.comments;
  return 0;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}م`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}ك`;
  return String(n || 0);
}

function getUploadDate(v: FirestoreVideo): Date | null {
  if (v.createdAt) return new Date(v.createdAt);
  if (v.created_at?.toDate) return v.created_at.toDate();
  if (v.created_at) return new Date(v.created_at);
  return null;
}

function isYoutubeUrl(url: string): boolean {
  return !!(url && (url.includes('youtube.com') || url.includes('youtu.be')));
}

function isTikTokUrl(url: string): boolean {
  return !!(url && url.includes('tiktok.com'));
}

function isVimeoUrl(url: string): boolean {
  return !!(url && url.includes('vimeo.com'));
}

function getVideosUploadedThisWeek(videos: FirestoreVideo[]): number {
  const weekStart = dayjs().startOf('week').toDate();
  return videos.filter(v => {
    const d = getUploadDate(v);
    return d && d >= weekStart;
  }).length;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Platform Guide Data ──────────────────────────────────────────────────────

const PLATFORMS = [
  {
    name: 'YouTube',
    color: '#FF0000',
    bg: 'bg-red-50',
    border: 'border-red-200',
    textColor: 'text-red-600',
    icon: Youtube,
    steps: [
      'افتح تطبيق YouTube',
      'انتقل للفيديو الذي تريده',
      'اضغط "مشاركة" أو Share',
      'انسخ الرابط',
    ],
    example: 'https://youtube.com/watch?v=...',
    note: 'الأفضل للتحميل والمشاهدة — ينصح بتحميل مقاطعك على YouTube',
  },
  {
    name: 'TikTok',
    color: '#000000',
    bg: 'bg-gray-50',
    border: 'border-gray-300',
    textColor: 'text-gray-700',
    icon: Smartphone,
    steps: [
      'افتح TikTok',
      'افتح الفيديو',
      'اضغط على "مشاركة" (السهم)',
      'اختر "نسخ الرابط"',
    ],
    example: 'https://vm.tiktok.com/...',
    note: 'تأكد أن الفيديو عام (Public) وليس خاصاً',
  },
  {
    name: 'Vimeo',
    color: '#1AB7EA',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    textColor: 'text-sky-600',
    icon: Film,
    steps: [
      'افتح Vimeo',
      'افتح الفيديو',
      'اضغط "Share"',
      'انسخ الرابط المباشر',
    ],
    example: 'https://vimeo.com/123456789',
    note: 'جودة عالية جداً — مناسب للتسليط الاحترافي',
  },
  {
    name: 'Facebook',
    color: '#1877F2',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    textColor: 'text-blue-600',
    icon: Facebook,
    steps: [
      'افتح Facebook',
      'ابحث عن الفيديو',
      'اضغط على النقاط الثلاث (⋯)',
      'اختر "نسخ الرابط"',
    ],
    example: 'https://fb.watch/...',
    note: 'تأكد أن الفيديو منشور بشكل عام',
  },
];

// ─── Filming Tips ─────────────────────────────────────────────────────────────

const FILMING_TIPS = [
  {
    icon: Lightbulb,
    color: 'text-yellow-500',
    bg: 'bg-yellow-50',
    title: 'الإضاءة',
    tips: [
      'صوّر في مكان مضاء جيداً أو في الهواء الطلق أثناء النهار',
      'تجنب التصوير ضد الشمس — ضع الشمس خلف الكاميرا',
      'الإضاءة الطبيعية أفضل من الفلاش الصناعي',
    ],
  },
  {
    icon: Camera,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    title: 'الزاوية والإطار',
    tips: [
      'صوّر بالوضع الأفقي (Landscape) دائماً للحصول على صورة أوسع',
      'احرص على ظهور كامل جسمك في الإطار',
      'ابعد الكاميرا بما يكفي لرؤية حركاتك كلها',
    ],
  },
  {
    icon: Clock,
    color: 'text-green-500',
    bg: 'bg-green-50',
    title: 'المدة والمحتوى',
    tips: [
      'المقطع المثالي بين 30 ثانية و3 دقائق',
      'ابدأ بأفضل لحظاتك في أول 10 ثوانٍ',
      'يفضل فيديو مهارة واحدة على أكثر من مهارة في نفس المقطع',
    ],
  },
  {
    icon: Star,
    color: 'text-purple-500',
    bg: 'bg-purple-50',
    title: 'المحتوى الاحترافي',
    tips: [
      'أضف اسمك ومركزك في أول ثانية باللقطة أو بنص على الفيديو',
      'نظّف الملعب أو الخلفية قبل التصوير',
      'سجّل مقاطع تتنوع بين: الضربات، المراوغات، التمريرات',
    ],
  },
  {
    icon: Smartphone,
    color: 'text-orange-500',
    bg: 'bg-orange-50',
    title: 'التقنيات والجودة',
    tips: [
      'امسح العدسة قبل التصوير',
      'أوقف الإشعارات لتجنب انقطاع التصوير',
      'ارفع على YouTube أو رفع مباشر بجودة أقل من 200MB',
    ],
  },
];

// ─── Filming Day Suggestions ──────────────────────────────────────────────────

const FILMING_SUGGESTIONS = [
  { emoji: '⚽', label: 'يوم مباريات', title: 'لقطات من مباراة اليوم' },
  { emoji: '🦶', label: 'مهارات القدم', title: 'مهارات ومراوغات بالقدم' },
  { emoji: '🤯', label: 'مهارات الرأس', title: 'تصويب ومهارات بالرأس' },
  { emoji: '🎯', label: 'يوم التمريرات', title: 'دقة التمريرات والتوزيع' },
  { emoji: '🛡️', label: 'يوم الدفاع', title: 'مواقف دفاعية واعتراض' },
  { emoji: '🏃', label: 'السرعة والتحرك', title: 'سرعة التحرك بدون كرة' },
  { emoji: '🥅', label: 'حراسة المرمى', title: 'تصدي وحراسة مرمى' },
  { emoji: '✨', label: 'لقطة خاصة', title: 'لقطة مهارة مميزة' },
];

// ─── Weekly Challenge Banner ──────────────────────────────────────────────────

function WeeklyChallenge({ videosThisWeek }: { videosThisWeek: number }) {
  const goal = 2;
  const done = Math.min(videosThisWeek, goal);
  const pct = (done / goal) * 100;
  const daysLeft = 7 - dayjs().day();
  const isComplete = done >= goal;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl p-5 ${isComplete
          ? 'bg-gradient-to-l from-emerald-600 to-teal-600'
          : 'bg-gradient-to-l from-blue-600 to-indigo-700'
        }`}
    >
      {/* BG glow */}
      <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl translate-x-1/4 translate-y-1/4" />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-yellow-300" />
              <span className="text-white/80 text-xs font-bold uppercase tracking-wider">تحدي الأسبوع</span>
            </div>
            <h3 className="text-white text-xl font-black leading-tight">
              {isComplete ? 'أنجزت التحدي هذا الأسبوع!' : 'ارفع فيديوين هذا الأسبوع'}
            </h3>
            <p className="text-white/60 text-xs mt-1">
              {isComplete
                ? 'رائع! ستظهر ملفك في أعلى نتائج البحث'
                : `${daysLeft} أيام متبقية — ارفع ${goal - done} فيديو ${goal - done === 1 ? 'إضافي' : 'إضافيين'}`
              }
            </p>
          </div>
          <div className="text-right">
            <span className="text-white text-3xl font-black">{done}</span>
            <span className="text-white/50 text-lg font-bold">/{goal}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, type: 'spring', stiffness: 80 }}
            className={`h-full rounded-full ${isComplete ? 'bg-yellow-300' : 'bg-white'}`}
          />
        </div>

        {/* Checkboxes */}
        <div className="flex gap-3 mt-3">
          {Array.from({ length: goal }).map((_, i) => (
            <div key={i} className={`flex items-center gap-1.5 text-xs font-bold ${i < done ? 'text-yellow-300' : 'text-white/40'}`}>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                ${i < done ? 'bg-yellow-300 border-yellow-300' : 'border-white/30'}`}>
                {i < done && <CheckCircle2 className="w-3 h-3 text-green-800" />}
              </div>
              فيديو {i + 1}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Quick Upload Buttons ─────────────────────────────────────────────────────

function QuickUploadButtons({
  onCamera,
  onFile,
  onUrl,
  disabled,
}: {
  onCamera: () => void;
  onFile: () => void;
  onUrl: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Camera */}
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={onCamera}
        disabled={disabled}
        className="flex flex-col items-center gap-2 py-4 px-2 rounded-2xl bg-gradient-to-b from-rose-500 to-red-600 text-white shadow-lg shadow-red-500/25 active:opacity-90 disabled:opacity-50"
      >
        <Camera className="w-7 h-7" />
        <span className="text-xs font-black leading-tight text-center">تصوير فوري</span>
      </motion.button>

      {/* File */}
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={onFile}
        disabled={disabled}
        className="flex flex-col items-center gap-2 py-4 px-2 rounded-2xl bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/25 active:opacity-90 disabled:opacity-50"
      >
        <Upload className="w-7 h-7" />
        <span className="text-xs font-black leading-tight text-center">رفع من الجهاز</span>
      </motion.button>

      {/* URL */}
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={onUrl}
        disabled={disabled}
        className="flex flex-col items-center gap-2 py-4 px-2 rounded-2xl bg-gradient-to-b from-violet-500 to-purple-700 text-white shadow-lg shadow-purple-500/25 active:opacity-90 disabled:opacity-50"
      >
        <LinkIcon className="w-7 h-7" />
        <span className="text-xs font-black leading-tight text-center">رابط فيديو</span>
      </motion.button>
    </div>
  );
}

// ─── Platform Guide ────────────────────────────────────────────────────────────

function PlatformGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--sidebar-border, #e2e8f0)' }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5"
        style={{ background: 'var(--header-bg, #fff)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
            <Info className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-sm" style={{ color: 'var(--header-text, #0f172a)' }}>
            كيف أحصل على رابط الفيديو؟
          </span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              className="px-4 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-3"
              style={{ background: 'var(--main-bg, #f8fafc)' }}
            >
              {PLATFORMS.map((p) => {
                const Icon = p.icon;
                return (
                  <div key={p.name} className={`rounded-xl border p-4 ${p.bg} ${p.border}`}>
                    <div className={`flex items-center gap-2 mb-3 ${p.textColor} font-black`}>
                      <Icon className="w-5 h-5" />
                      {p.name}
                    </div>
                    <ol className="space-y-1.5 mb-3">
                      {p.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                          <span className={`flex-shrink-0 w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center text-white ${p.textColor.replace('text-', 'bg-')}`}
                            style={{ background: p.color }}>
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                    <div className="text-[10px] text-gray-500 bg-white/60 rounded-lg px-2 py-1.5 font-mono break-all">
                      {p.example}
                    </div>
                    <p className={`text-[10px] mt-2 font-medium ${p.textColor}`}>{p.note}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Filming Tips Section ──────────────────────────────────────────────────────

function FilmingTips() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--sidebar-border, #e2e8f0)' }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5"
        style={{ background: 'var(--header-bg, #fff)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-sm" style={{ color: 'var(--header-text, #0f172a)' }}>
            نصائح التصوير الاحترافي
          </span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              className="px-4 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-3"
              style={{ background: 'var(--main-bg, #f8fafc)' }}
            >
              {FILMING_TIPS.map((section) => {
                const Icon = section.icon;
                return (
                  <div key={section.title} className={`rounded-xl p-4 ${section.bg}`}>
                    <div className={`flex items-center gap-2 font-black text-sm mb-2 ${section.color}`}>
                      <Icon className="w-4 h-4" />
                      {section.title}
                    </div>
                    <ul className="space-y-1.5">
                      {section.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                          <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${section.color}`} />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Upload Sheet ─────────────────────────────────────────────────────────────

function UploadSheet({
  isOpen,
  initialTab,
  onClose,
  onSave,
  initial,
  isEdit,
  userId,
  preloadFile,
}: {
  isOpen: boolean;
  initialTab: UploadTab;
  onClose: () => void;
  onSave: (v: Partial<FirestoreVideo>) => void;
  initial?: FirestoreVideo;
  isEdit?: boolean;
  userId: string;
  preloadFile?: File;
}) {
  const [tab, setTab] = useState<UploadTab>(initialTab);
  const [url, setUrl] = useState(initial?.url || '');
  const [title, setTitle] = useState(initial?.title || '');
  const [desc, setDesc] = useState(initial?.desc || '');
  const [urlError, setUrlError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setUrl(initial?.url || '');
      setTitle(initial?.title || '');
      setDesc(initial?.desc || '');
      setUrlError('');
      setUploadProgress(0);
      if (preloadFile) {
        setFile(preloadFile);
        setPreview(URL.createObjectURL(preloadFile));
      } else {
        setFile(null);
        setPreview(null);
      }
    }
  }, [isOpen, initialTab, initial, preloadFile]);

  const ytThumb = useMemo(() => getYoutubeThumbnail(url), [url]);

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (!selectedFile.type.startsWith('video/')) {
      toast.error('الملف يجب أن يكون فيديو (mp4, mov, avi...)');
      return;
    }
    const maxMB = 500;
    if (selectedFile.size > maxMB * 1024 * 1024) {
      toast.error(`حجم الفيديو يتجاوز ${maxMB}MB، يرجى ضغط الفيديو أو رفعه على YouTube`);
      return;
    }
    setFile(selectedFile);
    if (!title) setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
    // Create local preview URL
    const objUrl = URL.createObjectURL(selectedFile);
    setPreview(objUrl);
  }, [title]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
    e.target.value = '';
  };

  // Simulate upload progress (Supabase doesn't give real progress)
  const simulateProgress = useCallback((onDone: () => void) => {
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 15 + 5;
      if (p >= 90) { clearInterval(iv); onDone(); return; }
      setUploadProgress(Math.min(p, 90));
    }, 400);
    return iv;
  }, []);

  const handleUploadFile = useCallback(async () => {
    if (!file || !userId) return;
    setUploading(true);
    setUploadProgress(0);

    let iv: ReturnType<typeof setInterval>;
    iv = simulateProgress(() => setUploadProgress(90));

    try {
      const { url: uploadedUrl } = await uploadPlayerVideo(file, userId, userId, 'independent');
      clearInterval(iv);
      setUploadProgress(100);
      await new Promise(r => setTimeout(r, 300));
      onSave({
        url: uploadedUrl,
        title: title.trim() || file.name.replace(/\.[^/.]+$/, ''),
        desc: desc.trim(),
        type: 'uploaded',
      });
    } catch (err: any) {
      clearInterval(iv);
      console.error('Upload error:', err);
      toast.error('فشل رفع الفيديو: ' + (err?.message || 'خطأ غير معروف'));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [file, userId, title, desc, onSave, simulateProgress]);

  const handleSubmitUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) { setUrlError('الرابط مطلوب'); return; }
    try { new URL(url.trim()); } catch { setUrlError('الرابط غير صحيح'); return; }
    setUrlError('');
    const type = isYoutubeUrl(url) ? 'youtube' : isTikTokUrl(url) ? 'other' : isVimeoUrl(url) ? 'vimeo' : 'other';
    onSave({ url: url.trim(), title: title.trim(), desc: desc.trim(), type });
  };

  const tabs: { id: UploadTab; label: string; icon: React.ReactNode }[] = [
    { id: 'camera', label: 'تصوير', icon: <Camera className="w-4 h-4" /> },
    { id: 'file', label: 'رفع ملف', icon: <Upload className="w-4 h-4" /> },
    { id: 'url', label: 'رابط', icon: <LinkIcon className="w-4 h-4" /> },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            onClick={!uploading ? onClose : undefined}
          />

          <motion.div
            key="sheet"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            className="fixed bottom-0 inset-x-0 z-[60] bg-white rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
            style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-0">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="text-lg font-black text-gray-900">
                {isEdit ? 'تعديل الفيديو' : 'إضافة فيديو جديد'}
              </h2>
              {!uploading && (
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              )}
            </div>

            {/* Tabs */}
            {!isEdit && (
              <div className="px-5 mb-4">
                <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => !uploading && setTab(t.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-black transition-all duration-200
                        ${tab === t.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {t.icon}
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="px-5 space-y-4" dir="rtl" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>

              {/* ── Camera Tab ── */}
              {(tab === 'camera') && !isEdit && (
                <div className="space-y-4">
                  {/* Filming day suggestions */}
                  {!file && (
                    <div>
                      <p className="text-xs font-black text-gray-500 mb-2.5">💡 اختر نوع الفيديو اليوم:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {FILMING_SUGGESTIONS.map((s) => (
                          <button
                            key={s.label}
                            type="button"
                            onClick={() => { setTitle(s.title); cameraInputRef.current?.click(); }}
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-right active:scale-95 transition-transform hover:border-rose-300 hover:bg-rose-50"
                          >
                            <span className="text-xl leading-none">{s.emoji}</span>
                            <div>
                              <p className="text-xs font-black text-gray-800 leading-tight">{s.label}</p>
                              <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{s.title}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Or open camera freely */}
                  <div
                    onClick={() => !uploading && cameraInputRef.current?.click()}
                    className="relative flex flex-col items-center justify-center gap-4 p-6 rounded-2xl border-2 border-dashed border-rose-300 bg-rose-50 cursor-pointer active:scale-95 transition-transform"
                  >
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="video/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleInputChange}
                    />
                    <div className="w-16 h-16 rounded-full bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-400/40">
                      <Camera className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-center">
                      <p className="font-black text-rose-600 text-base">
                        {file ? 'تغيير التصوير' : 'افتح الكاميرا الآن'}
                      </p>
                      <p className="text-rose-400 text-xs mt-0.5">اضغط هنا لتصوير مقطعك مباشرة</p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-center">
                      {['الوضع الأفقي أفضل', 'إضاءة كافية', 'مدة 30ث - 3د'].map(tip => (
                        <span key={tip} className="text-[11px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-bold">
                          {tip}
                        </span>
                      ))}
                    </div>
                  </div>

                  {file && (
                    <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-200">
                      <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                        <VideoIcon className="w-6 h-6 text-rose-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-gray-800 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                      <button onClick={() => { setFile(null); setPreview(null); }} className="text-gray-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── File Upload Tab ── */}
              {(tab === 'file') && !isEdit && (
                <div className="space-y-4">
                  <div
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    className="relative flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 cursor-pointer active:scale-95 transition-transform"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={handleInputChange}
                    />
                    <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-400/40">
                      <Upload className="w-10 h-10 text-white" />
                    </div>
                    <div className="text-center">
                      <p className="font-black text-blue-600 text-lg">
                        {file ? 'تغيير الملف' : 'اختر فيديو من جهازك'}
                      </p>
                      <p className="text-blue-400 text-sm mt-1">
                        MP4, MOV, AVI — الحد الأقصى 500MB
                      </p>
                    </div>
                    {!file && (
                      <div className="text-[11px] text-blue-500 bg-blue-100 px-3 py-1.5 rounded-full font-bold">
                        يُرفع مباشرةً وبأمان على منصتنا
                      </div>
                    )}
                  </div>

                  {file && (
                    <div className="rounded-xl overflow-hidden border border-gray-200">
                      <div className="flex items-center gap-3 bg-gray-50 p-3">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <VideoIcon className="w-6 h-6 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-gray-800 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                        </div>
                        {!uploading && (
                          <button onClick={() => { setFile(null); setPreview(null); }} className="text-gray-400 hover:text-red-500">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {preview && (
                        <video src={preview} className="w-full max-h-40 object-cover" controls muted playsInline />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── URL Tab ── */}
              {(tab === 'url' || isEdit) && (
                <div className="space-y-4">
                  {/* Platform quick pick */}
                  {!isEdit && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-2">منصات مدعومة:</p>
                      <div className="flex gap-2 flex-wrap">
                        {PLATFORMS.map(p => {
                          const Icon = p.icon;
                          return (
                            <div key={p.name} className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${p.bg} ${p.border} ${p.textColor}`}>
                              <Icon className="w-3.5 h-3.5" />
                              {p.name}
                            </div>
                          );
                        })}
                        <div className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border bg-gray-50 border-gray-200 text-gray-600">
                          <LinkIcon className="w-3.5 h-3.5" />
                          رابط مباشر
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">
                      رابط الفيديو <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {isYoutubeUrl(url) ? <Youtube className="w-5 h-5 text-red-500" />
                          : isTikTokUrl(url) ? <Smartphone className="w-5 h-5 text-gray-800" />
                            : isVimeoUrl(url) ? <Film className="w-5 h-5 text-sky-500" />
                              : <LinkIcon className="w-5 h-5 text-gray-400" />}
                      </div>
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => { setUrl(e.target.value); setUrlError(''); }}
                        placeholder="https://www.youtube.com/watch?v=..."
                        style={{ fontSize: '16px' }}
                        className={`w-full pr-10 pl-4 py-3 rounded-xl border outline-none transition-colors
                          ${urlError ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus:border-blue-400 focus:bg-white'}`}
                      />
                    </div>
                    {urlError && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {urlError}
                      </p>
                    )}
                  </div>

                  {ytThumb && (
                    <div className="rounded-xl overflow-hidden aspect-video border border-gray-200">
                      <img src={ytThumb} alt="معاينة" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              )}

              {/* ── Shared fields: Title + Desc ── */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">عنوان الفيديو</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: هدف رائع من مسافة 30 متر"
                  maxLength={80}
                  style={{ fontSize: '16px' }}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:border-blue-400 focus:bg-white outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">وصف (اختياري)</label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="صف المهارة أو اللقطة..."
                  rows={2}
                  maxLength={200}
                  style={{ fontSize: '16px' }}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:border-blue-400 focus:bg-white outline-none resize-none transition-colors"
                />
              </div>

              {/* ── Upload progress ── */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-blue-700 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      جاري رفع الفيديو...
                    </span>
                    <span className="font-black text-blue-600">{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      animate={{ width: `${uploadProgress}%` }}
                      className="h-full bg-gradient-to-r from-blue-500 to-violet-600 rounded-full"
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 text-center">لا تغلق الصفحة أثناء الرفع</p>
                </div>
              )}

              {/* ── Submit button ── */}
              {!uploading && (
                <>
                  {(tab === 'camera' || tab === 'file') && !isEdit ? (
                    <button
                      onClick={handleUploadFile}
                      disabled={!file}
                      className="w-full py-4 rounded-2xl font-black text-base transition-all flex items-center justify-center gap-2
                        bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Upload className="w-5 h-5" />
                      رفع الفيديو
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmitUrl}
                      className="w-full py-4 rounded-2xl font-black text-base bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/25 flex items-center justify-center gap-2 transition-colors"
                    >
                      {isEdit ? <><Edit3 className="w-5 h-5" /> حفظ التعديلات</> : <><Plus className="w-5 h-5" /> إضافة الفيديو</>}
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Video Card ───────────────────────────────────────────────────────────────

function VideoCard({
  video, index, onEdit, onDelete,
}: {
  video: FirestoreVideo; index: number;
  onEdit: (i: number) => void; onDelete: (i: number) => void;
}) {
  const thumb = getVideoThumbnail(video);
  const commentCount = getCommentCount(video);
  const uploadDate = getUploadDate(video);
  const isYT = isYoutubeUrl(video.url || '');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100"
    >
      <div className="relative aspect-video bg-gray-900 overflow-hidden">
        {thumb
          ? <img src={thumb} alt={video.title || 'فيديو'} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
              <VideoIcon className="w-10 h-10 text-white/20" />
            </div>
        }

        {/* Play overlay — visible on hover (desktop) */}
        <div className="absolute inset-0 hidden sm:flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <a href={video.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
            className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
            <Play className="w-5 h-5 text-gray-900 ml-0.5" />
          </a>
        </div>
        {/* Play icon — always visible on mobile */}
        <a href={video.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
          className="sm:hidden absolute bottom-2 right-2 w-9 h-9 rounded-full bg-black/60 flex items-center justify-center">
          <Play className="w-4 h-4 text-white ml-0.5" />
        </a>

        {/* Platform badge */}
        {isYT && (
          <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Youtube className="w-3 h-3" /> YouTube
          </div>
        )}
        {video.type === 'uploaded' && (
          <div className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Upload className="w-3 h-3" /> مرفوع
          </div>
        )}

        {/* Actions */}
        <div className="absolute top-2 left-2 flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onEdit(index); }}
            className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow hover:bg-white">
            <Edit3 className="w-3.5 h-3.5 text-gray-700" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(index); }}
            className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow hover:bg-red-50">
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </button>
        </div>
      </div>

      <div className="p-3.5">
        <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-2.5 leading-snug">
          {video.title || video.desc || 'بدون عنوان'}
        </h3>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Eye className="w-3.5 h-3.5 text-blue-500" />
            <span className="font-semibold text-gray-700">{formatCount(video.views || 0)}</span>
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Heart className="w-3.5 h-3.5 text-red-500" />
            <span className="font-semibold text-gray-700">{formatCount(video.likes || 0)}</span>
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <MessageCircle className="w-3.5 h-3.5 text-green-500" />
            <span className="font-semibold text-gray-700">{formatCount(commentCount)}</span>
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Share2 className="w-3.5 h-3.5 text-purple-500" />
            <span className="font-semibold text-gray-700">{formatCount(video.shares || 0)}</span>
          </span>
        </div>
        {uploadDate && (
          <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-2">
            <Calendar className="w-3 h-3" />
            {dayjs(uploadDate).locale('ar').fromNow()}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({ isOpen, onConfirm, onCancel, title }: {
  isOpen: boolean; onConfirm: () => void; onCancel: () => void; title: string;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]" onClick={onCancel} />
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[60] bg-white rounded-2xl p-6 shadow-2xl max-w-sm mx-auto"
            style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="font-black text-gray-900 text-lg mb-2">حذف الفيديو؟</h3>
              <p className="text-gray-500 text-sm mb-6">
                سيتم حذف <strong>"{title || 'هذا الفيديو'}"</strong> نهائياً
              </p>
              <div className="flex gap-3">
                <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50">إلغاء</button>
                <button onClick={onConfirm} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-black hover:bg-red-700">حذف</button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VideosPage() {
  const router = useRouter();
  const [user, authLoading] = useAuthState(auth);
  const [videos, setVideos] = useState<FirestoreVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [formTab, setFormTab] = useState<UploadTab>('url');
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [pendingCameraFile, setPendingCameraFile] = useState<File | null>(null);
  const pageCameraInputRef = useRef<HTMLInputElement>(null);

  const MAX_VIDEOS = 10;

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/auth/login'); return; }
    const fetchVideos = async () => {
      try {
        setIsLoading(true);
        const snap = await getDoc(doc(db, 'players', user.uid));
        if (snap.exists()) setVideos(snap.data().videos || []);
      } catch { toast.error('خطأ في تحميل الفيديوهات'); }
      finally { setIsLoading(false); }
    };
    fetchVideos();
  }, [user, authLoading, router]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    count: videos.length,
    views: videos.reduce((s, v) => s + (v.views || 0), 0),
    likes: videos.reduce((s, v) => s + (v.likes || 0), 0),
    comments: videos.reduce((s, v) => s + getCommentCount(v), 0),
    thisWeek: getVideosUploadedThisWeek(videos),
  }), [videos]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!user || isSaving) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'players', user.uid), { videos, updated_at: new Date() });
      setHasUnsavedChanges(false);
      toast.success('تم الحفظ بنجاح', {
        style: { borderRadius: '16px', background: '#1e293b', color: '#fff', fontFamily: "'Cairo', sans-serif" },
      });
    } catch { toast.error('فشل في الحفظ'); }
    finally { setIsSaving(false); }
  }, [user, videos, isSaving]);

  // ── Add / Edit ─────────────────────────────────────────────────────────────
  const handleFormSave = useCallback((data: Partial<FirestoreVideo>) => {
    setVideos(prev => {
      const updated = [...prev];
      if (editIndex !== null) {
        updated[editIndex] = { ...updated[editIndex], ...data };
      } else {
        updated.push({
          url: data.url || '',
          title: data.title || '',
          desc: data.desc || '',
          type: data.type || (isYoutubeUrl(data.url || '') ? 'youtube' : 'other'),
          createdAt: new Date().toISOString(),
          likes: 0, comments: [], commentsCount: 0, shares: 0, views: 0,
        });
      }
      return updated;
    });
    setHasUnsavedChanges(true);
    setShowForm(false);
    setEditIndex(null);
    setPendingCameraFile(null);
    toast.success(editIndex !== null ? 'تم التعديل — احفظ التغييرات' : 'تمت الإضافة — لا تنسَ الحفظ!', {
      style: { borderRadius: '16px', background: '#1e293b', color: '#fff', fontFamily: "'Cairo', sans-serif" },
    });
  }, [editIndex]);

  const handleEdit = useCallback((idx: number) => {
    setEditIndex(idx);
    setFormTab('url');
    setShowForm(true);
  }, []);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDeleteConfirm = useCallback(() => {
    if (deleteIndex === null) return;
    setVideos(prev => prev.filter((_, i) => i !== deleteIndex));
    setHasUnsavedChanges(true);
    setDeleteIndex(null);
    toast.success('تم الحذف');
  }, [deleteIndex]);

  // ── Unsaved warning ────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [hasUnsavedChanges]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" style={{ fontFamily: "'Cairo', sans-serif" }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          className="w-14 h-14 rounded-full border-4 border-blue-100 border-t-blue-600" />
        <p className="text-gray-500 font-medium">جاري تحميل مكتبة الفيديوهات...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32" dir="rtl"
      style={{ background: 'var(--main-bg, #f8fafc)', fontFamily: "'Cairo', 'Tajawal', sans-serif" }}>
      <Toaster position="top-center" />

      {/* ── Sticky Header ──────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 border-b"
        style={{ background: 'var(--header-bg, rgba(255,255,255,0.96))', backdropFilter: 'blur(12px)', borderColor: 'var(--sidebar-border, #e2e8f0)' }}>
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow">
              <Clapperboard className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h1 className="text-base font-black" style={{ color: 'var(--header-text, #0f172a)' }}>
                مكتبة الفيديوهات
              </h1>
              <p className="text-[11px]" style={{ color: 'var(--header-text-muted, #64748b)' }}>
                {stats.count}/{MAX_VIDEOS} فيديو
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/dashboard/player/player-videos')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors"
              style={{ background: 'var(--main-bg, #f1f5f9)', color: 'var(--header-text-muted, #64748b)' }}>
              <Film className="w-3.5 h-3.5" /> وضع السينما
            </button>
            <motion.button onClick={handleSave} disabled={isSaving || !hasUnsavedChanges}
              animate={hasUnsavedChanges ? { scale: [1, 1.04, 1] } : {}}
              transition={{ repeat: hasUnsavedChanges ? Infinity : 0, duration: 2 }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all
                ${hasUnsavedChanges ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              حفظ
            </motion.button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

        {/* ── Weekly Challenge ────────────────────────────────────────────── */}
        <WeeklyChallenge videosThisWeek={stats.thisWeek} />

        {/* ── Stats Overview ──────────────────────────────────────────────── */}
        {videos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { icon: VideoIcon, value: stats.count, label: 'فيديو', color: 'text-blue-600', bg: 'bg-blue-50' },
              { icon: Eye, value: stats.views, label: 'مشاهدة', color: 'text-sky-600', bg: 'bg-sky-50' },
              { icon: Heart, value: stats.likes, label: 'إعجاب', color: 'text-red-500', bg: 'bg-red-50' },
              { icon: MessageCircle, value: stats.comments, label: 'تعليق', color: 'text-emerald-600', bg: 'bg-emerald-50' },
            ].map(({ icon: Icon, value, label, color, bg }) => (
              <div key={label} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <p className={`text-lg font-black ${color} leading-none`}>{formatCount(value)}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Unsaved Banner ──────────────────────────────────────────────── */}
        <AnimatePresence>
          {hasUnsavedChanges && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-bold">تغييرات غير محفوظة</span>
              </div>
              <button onClick={handleSave} disabled={isSaving}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 text-white text-xs font-black">
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                حفظ الآن
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Quick Upload Buttons ─────────────────────────────────────────── */}
        {videos.length < MAX_VIDEOS && (
          <div>
            {/* Hidden camera input — triggers native camera directly */}
            <input
              ref={pageCameraInputRef}
              type="file"
              accept="video/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setPendingCameraFile(f);
                  setEditIndex(null);
                  setFormTab('camera');
                  setShowForm(true);
                }
                e.target.value = '';
              }}
            />
            <p className="text-xs font-black text-gray-500 mb-2.5 uppercase tracking-wide">أضف فيديو جديد</p>
            <QuickUploadButtons
              onCamera={() => pageCameraInputRef.current?.click()}
              onFile={() => { setEditIndex(null); setFormTab('file'); setShowForm(true); }}
              onUrl={() => { setEditIndex(null); setFormTab('url'); setShowForm(true); }}
            />
          </div>
        )}

        {/* ── Platform Guide ──────────────────────────────────────────────── */}
        <PlatformGuide />

        {/* ── Filming Tips ────────────────────────────────────────────────── */}
        <FilmingTips />

        {/* ── Video Library ───────────────────────────────────────────────── */}
        {videos.length > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black" style={{ color: 'var(--header-text, #0f172a)' }}>
                فيديوهاتي ({videos.length})
              </h2>
              <button onClick={() => router.push('/dashboard/player/player-videos')}
                className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800">
                <Film className="w-3.5 h-3.5" /> السينما <ArrowLeft className="w-3 h-3" />
              </button>
            </div>

            <AnimatePresence mode="popLayout">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {videos.map((video, idx) => (
                  <VideoCard key={`${video.url}-${idx}`} video={video} index={idx} onEdit={handleEdit} onDelete={setDeleteIndex} />
                ))}
                {videos.length < MAX_VIDEOS && (
                  <motion.button layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    onClick={() => { setEditIndex(null); setFormTab('url'); setShowForm(true); }}
                    className="aspect-video rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-blue-500 transition-all group">
                    <Plus className="w-8 h-8" />
                    <span className="text-xs font-bold">{MAX_VIDEOS - videos.length} متبقٍ</span>
                  </motion.button>
                )}
              </div>
            </AnimatePresence>
          </>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="text-center py-12">
            <div className="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <Film className="w-10 h-10 text-blue-400" />
            </div>
            <h2 className="text-xl font-black mb-2" style={{ color: 'var(--header-text, #1e293b)' }}>
              لا توجد فيديوهات بعد
            </h2>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">
              استخدم الأزرار أعلاه لإضافة أول فيديو لك
            </p>
          </motion.div>
        )}
      </div>

      {/* ── Upload / Edit Sheet ─────────────────────────────────────────────── */}
      <UploadSheet
        isOpen={showForm}
        initialTab={formTab}
        onClose={() => { setShowForm(false); setEditIndex(null); setPendingCameraFile(null); }}
        onSave={handleFormSave}
        initial={editIndex !== null ? videos[editIndex] : undefined}
        isEdit={editIndex !== null}
        userId={user?.uid || ''}
        preloadFile={pendingCameraFile || undefined}
      />

      {/* ── Delete Confirm ──────────────────────────────────────────────────── */}
      <DeleteConfirm
        isOpen={deleteIndex !== null}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteIndex(null)}
        title={deleteIndex !== null ? (videos[deleteIndex]?.title || videos[deleteIndex]?.desc || '') : ''}
      />

      {/* ── Floating Save Bar ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {hasUnsavedChanges && !isSaving && (
          <motion.div initial={{ opacity: 0, y: 80 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 80 }}
            className="fixed inset-x-4 z-40 max-w-sm mx-auto"
            style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}>
            <button onClick={handleSave}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-blue-600 text-white font-black shadow-2xl shadow-blue-500/40 hover:bg-blue-700">
              <Save className="w-5 h-5" /> حفظ التغييرات
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
