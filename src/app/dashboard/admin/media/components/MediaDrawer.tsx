'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MediaItem, FootballSkills } from '../types';
import {
    X, CheckCircle, XCircle, Flag, Sparkles, RefreshCw,
    Phone, Mail, ExternalLink, Activity, Sliders, ShieldCheck,
    Target, Award, Play, Pause, FastForward, Rewind, Maximize2,
    Minimize2, ZoomIn, ZoomOut, Volume2, VolumeX, ChevronRight,
    ChevronLeft, ChevronDown, ChevronUp, MessageSquare, Info,
    Trash2, AlertCircle, Send, User, Film, Copy, Check, Share2,
    Gauge, BarChart3, FileText, CheckCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { authenticatedFetch } from '@/lib/api/authenticated-fetch';

interface Props {
    item: MediaItem | null;
    onClose: () => void;
    onUpdateStatus: (item: MediaItem, status: 'approved' | 'rejected' | 'flagged', notes?: string) => Promise<void>;
    onApproveAndSync?: (
        item: MediaItem,
        skills: FootballSkills,
        overallScore: number,
        dominantFoot: string,
        analystNotes: string,
        analysisText: string
    ) => Promise<void>;
    onAIResult: (id: string, analysis: string, rating: number | null) => void;
    onDelete: (item: MediaItem) => Promise<void>;
    userId: string;
    onNext?: () => void;
    onPrev?: () => void;
    hasNext?: boolean;
    hasPrev?: boolean;
    currentIndex?: number;
    totalCount?: number;
}

const STATUS_COLOR: Record<string, string> = {
    pending:  'bg-amber-500/15 text-amber-400 border-amber-500/30',
    approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    rejected: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    flagged:  'bg-orange-500/15 text-orange-400 border-orange-500/30',
};

const STATUS_LABEL: Record<string, string> = {
    pending: 'بانتظار التحليل',
    approved: 'معتمد ومزامَن',
    rejected: 'مرفوض',
    flagged: 'تنبيه / إعادة',
};

// حساب لون شريط المهارة بحسب الدرجة
function getSkillColor(val: number) {
    if (val >= 85) return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
    if (val >= 75) return 'text-teal-400 bg-teal-500/15 border-teal-500/30';
    if (val >= 65) return 'text-amber-400 bg-amber-500/15 border-amber-500/30';
    return 'text-rose-400 bg-rose-500/15 border-rose-500/30';
}

function getScoreTier(ovr: number) {
    if (ovr >= 85) return { label: 'نخبة ELITE', textCls: 'text-amber-300', bgCls: 'bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border-amber-400/40 text-amber-300' };
    if (ovr >= 75) return { label: 'محترف PRO', textCls: 'text-emerald-300', bgCls: 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300' };
    if (ovr >= 65) return { label: 'واعد PROMISING', textCls: 'text-sky-300', bgCls: 'bg-sky-500/20 border-sky-400/40 text-sky-300' };
    return { label: 'تحت التطوير', textCls: 'text-slate-300', bgCls: 'bg-slate-700/30 border-slate-600 text-slate-300' };
}

// ── توليد التقرير الكشفي المعتمد لمنصة الحلم (El7lm Pro Scouting Dossier) ──
function generateEl7lmDossier(
    item: MediaItem,
    skills: FootballSkills,
    overallScore: number,
    dominantFoot: string,
    notes: string,
    analysisText: string,
    strengths: string[],
    areas: string[]
): string {
    const today = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    const tier = getScoreTier(overallScore).label;

    const strengthsText = strengths.length > 0
        ? strengths.map((s, i) => `${i + 1}. ${s}`).join('\n')
        : '1. التحكم الإيجابي بالكرة والسرعة في تغيير الاتجاه\n2. الرؤية الميدانية والتحرك الواعي في المساحات';

    const areasText = areas.length > 0
        ? areas.map((d, i) => `${i + 1}. ${d}`).join('\n')
        : '1. رفع الكثافة البدنية في الالتحامات القوية\n2. دقة إنهاء الكرات تحت الضغط العالي';

    return `📋 تقرير التقييم الكشفي المعتمد — منصة الحلم (El7lm Pro Scouting Dossier)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 بيانات اللاعب الأساسية:
• اسم اللاعب: ${item.userName}
• المركز التكتيكي: ${item.position || 'لاعب كرة قدم'}
• العمر: ${item.age ? `${item.age} سنة` : 'موهبة صاعدة'}
• الدولة: ${item.country || 'مصر'}
• النادي / الأكاديمية: ${item.organization || 'لاعب حر'}
• القدم المفضلة: ${dominantFoot}
• التقييم الكروي الإجمالي: ${overallScore} OVR (${tier})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 مصفوفة الحلم للأداء الكروي (El7lm 100 Performance Matrix):
⚡ السرعة والتسارع (PAC): ${skills.pace}/100
⚽ التسديد وإنهاء الهجمات (SHO): ${skills.shooting}/100
🎯 التمرير وصناعة اللعب (PAS): ${skills.passing}/100
👟 المراوغة والتحكم بالكرة (DRI): ${skills.dribbling}/100
🛡️ التمركز والواجب الدفاعي (DEF): ${skills.defending}/100
💪 القوة البدنية والالتحامات (PHY): ${skills.physical}/100
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⭐ أبرز نقاط القوة التكتيكية (Key Strengths):
${strengthsText}

🎯 جوانب التطوير المستهدفة (Areas for Development):
${areasText}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 التقييم الفني والتوصية الكشفية (Scout Recommendation):
${notes.trim() || 'لاعب واعد يمتلك أساسيات فنية ممتازة تؤهله للاندماج السريع في التمارين التكتيكية التخصصية.'}

📝 التقرير التحليلي للأداء:
${analysisText.trim() || 'أظهر اللاعب مرونة حركية عالية واستيعاباً لمجريات اللعب أثناء فحص اللقطات المسجلة.'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 تاريخ التحليل: ${today}
🏷️ جهة التقييم: استوديو الأداء الرياضي الذكي — منصة الحلم (El7lm AI Studio)
🌐 بروفايل اللاعب: https://www.el7lm.com/profile/${item.userId}
`.trim();
}

async function captureFrames(videoUrl: string): Promise<string[]> {
    return new Promise(resolve => {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.src = videoUrl;
        video.preload = 'auto';
        video.muted = true;

        video.addEventListener('loadedmetadata', () => {
            const dur = video.duration;
            const count = Math.min(6, Math.max(2, Math.floor(dur / 4)));
            const times = Array.from({ length: count }, (_, i) => (dur / (count + 1)) * (i + 1));
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 360;
            const ctx = canvas.getContext('2d')!;
            const frames: string[] = [];
            let i = 0;

            const next = () => {
                if (i >= times.length) {
                    resolve(frames);
                    return;
                }
                video.currentTime = times[i];
            };
            video.addEventListener('seeked', () => {
                ctx.drawImage(video, 0, 0, 640, 360);
                frames.push(canvas.toDataURL('image/jpeg', 0.7));
                i++;
                next();
            });
            next();
        });
        video.addEventListener('error', () => resolve([]));
        video.load();
    });
}

export function MediaDrawer({
    item,
    onClose,
    onUpdateStatus,
    onApproveAndSync,
    onAIResult,
    onDelete,
    userId,
    onNext,
    onPrev,
    hasNext = false,
    hasPrev = false,
    currentIndex = 0,
    totalCount = 0
}: Props) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    // ── Clean 3-Tab Segmented Workspace (Zero Bloat, Zero Crowding) ──
    const [activeTab, setActiveTab] = useState<'matrix' | 'dossier' | 'contact'>('matrix');
    const [showFullAiReport, setShowFullAiReport] = useState(false);
    const [copiedReport, setCopiedReport] = useState(false);

    // Free Tier Usage State (1,500 analyses / day)
    const [usage, setUsage] = useState({
        todayCount: 8,
        dailyLimit: 1500,
        remaining: 1492,
        isFreeTier: true,
        model: 'Gemini 1.5 Flash (Free Tier)'
    });

    // Direct Message state
    const [message, setMessage] = useState('');
    const [sendingMsg, setSendingMsg] = useState(false);

    // AI state
    const [analyzing, setAnalyzing] = useState(false);
    const [aiText, setAiText] = useState<string | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);

    // Video Player & Scout HUD State
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [isMuted, setIsMuted] = useState(false);

    // ── Human Performance Analyst State (المهارات الست) ──
    const [skills, setSkills] = useState<FootballSkills>({
        pace: 75,
        shooting: 72,
        passing: 74,
        dribbling: 78,
        defending: 60,
        physical: 70,
    });
    const [dominantFoot, setDominantFoot] = useState<string>('يمين');
    const [analystNotes, setAnalystNotes] = useState<string>('');
    const [tacticalStrengths, setTacticalStrengths] = useState<string[]>([]);
    const [developmentAreas, setDevelopmentAreas] = useState<string[]>([]);

    // حساب التقييم الإجمالي العام
    const calculatedOverall = useMemo(() => {
        const sum = skills.pace + skills.shooting + skills.passing + skills.dribbling + skills.defending + skills.physical;
        return Math.round(sum / 6);
    }, [skills]);

    // جلب عداد الاستهلاك المجاني لـ Gemini عند التحميل
    const fetchUsage = useCallback(async () => {
        try {
            const res = await authenticatedFetch('/api/media/analyze-video');
            if (res.ok) {
                const data = await res.json();
                if (data.usage) {
                    setUsage(data.usage);
                }
            }
        } catch {
            // صامت
        }
    }, []);

    useEffect(() => {
        fetchUsage();
    }, [fetchUsage]);

    // Reset and sync state when item changes
    useEffect(() => {
        setMessage('');
        setAiError(null);
        setConfirmDelete(false);
        setIsPlaying(false);
        setCurrentTime(0);
        setPlaybackRate(1.0);
        setZoomLevel(1.0);
        setCopiedReport(false);

        if (item) {
            setAiText(item.aiAnalysis || null);
            setAnalystNotes(item.notes || '');
            setDominantFoot(item.dominantFoot || 'يمين');
            setTacticalStrengths(item.tacticalStrengths || []);
            setDevelopmentAreas(item.developmentAreas || []);

            if (item.skills) {
                setSkills(item.skills);
            } else if (item.aiRating) {
                const base = Math.round(item.aiRating * 10);
                setSkills({
                    pace: Math.min(95, base + 2),
                    shooting: Math.max(50, base - 3),
                    passing: base,
                    dribbling: Math.min(95, base + 4),
                    defending: Math.max(45, base - 12),
                    physical: Math.max(55, base - 4),
                });
            } else {
                setSkills({
                    pace: 75,
                    shooting: 72,
                    passing: 74,
                    dribbling: 78,
                    defending: 60,
                    physical: 70,
                });
            }
        }
    }, [item?.id]);

    const handleSkillChange = (key: keyof FootballSkills, val: number) => {
        setSkills(prev => ({
            ...prev,
            [key]: Math.min(99, Math.max(30, val)),
        }));
    };

    // ── Video Controls Handlers ────────────────────────────────
    const togglePlay = useCallback(() => {
        if (!videoRef.current) return;
        if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    }, []);

    const handleSeek = (time: number) => {
        if (!videoRef.current) return;
        videoRef.current.currentTime = Math.max(0, Math.min(duration, time));
        setCurrentTime(videoRef.current.currentTime);
    };

    const handleSpeedChange = (rate: number) => {
        if (!videoRef.current) return;
        videoRef.current.playbackRate = rate;
        setPlaybackRate(rate);
        toast.info(`سرعة التشغيل: ${rate}x`);
    };

    const handleStepFrame = (frames: number) => {
        if (!videoRef.current) return;
        videoRef.current.pause();
        setIsPlaying(false);
        videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + frames * 0.033));
        setCurrentTime(videoRef.current.currentTime);
    };

    const toggleMute = () => {
        if (!videoRef.current) return;
        videoRef.current.muted = !videoRef.current.muted;
        setIsMuted(videoRef.current.muted);
    };

    const toggleZoom = () => {
        setZoomLevel(prev => {
            if (prev === 1.0) return 1.5;
            if (prev === 1.5) return 2.0;
            return 1.0;
        });
    };

    // ── نسخ التقرير الكشفي المعتمد إلى الحافظة بنقرة واحدة ─────────
    const handleCopyDossier = async () => {
        if (!item) return;
        const text = generateEl7lmDossier(
            item,
            skills,
            calculatedOverall,
            dominantFoot,
            analystNotes,
            aiText || '',
            tacticalStrengths,
            developmentAreas
        );

        try {
            await navigator.clipboard.writeText(text);
            setCopiedReport(true);
            toast.success('تم نسخ التقرير الكشفي المعتمد لمنصة الحلم بنجاح! 📋');
            setTimeout(() => setCopiedReport(false), 3000);
        } catch {
            toast.error('تعذر النسخ التلقائي للحافظة');
        }
    };

    // ── مشاركة التقرير الكشفي المعتمد عبر واتساب مباشرة للأندية ────
    const handleShareWhatsApp = () => {
        if (!item) return;
        const text = generateEl7lmDossier(
            item,
            skills,
            calculatedOverall,
            dominantFoot,
            analystNotes,
            aiText || '',
            tacticalStrengths,
            developmentAreas
        );
        const encoded = encodeURIComponent(text);
        window.open(`https://wa.me/?text=${encoded}`, '_blank');
    };

    // ── Keyboard Shortcuts for Sports Scout ────────────────────
    useEffect(() => {
        if (!item) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea') return;

            if (e.code === 'Space') {
                e.preventDefault();
                togglePlay();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                handleSeek(currentTime + 5);
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handleSeek(currentTime - 5);
            } else if (e.key === 'j' || e.key === 'J') {
                if (hasPrev && onPrev) {
                    e.preventDefault();
                    onPrev();
                }
            } else if (e.key === 'k' || e.key === 'K') {
                if (hasNext && onNext) {
                    e.preventDefault();
                    onNext();
                }
            } else if (e.key === 'f' || e.key === 'F') {
                setIsFullscreen(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [item, togglePlay, currentTime, duration, hasNext, hasPrev, onNext, onPrev]);

    // ── تشغيل تحليل Gemini AI ──────────────────────────────────
    const handleAnalyze = async () => {
        if (!item) return;
        setAnalyzing(true);
        setAiError(null);

        try {
            let frameUrls: string[] = [];

            if (item.type === 'image') {
                frameUrls = [item.url];
                toast.info('جاري إرسال الصورة للتحليل...');
            } else if (item.url.match(/\.(mp4|mov|webm|avi)/i)) {
                toast.info('جاري استخراج لقطات من الفيديو...');
                const captureUrl = `/api/media/proxy-video?url=${encodeURIComponent(item.url)}`;
                try {
                    frameUrls = await captureFrames(captureUrl);
                } catch {
                    frameUrls = [];
                }
            }

            const res = await authenticatedFetch('/api/media/analyze-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoUrl:       item.url,
                    thumbnailUrl:   item.thumbnailUrl,
                    frameUrls,
                    mediaType:      item.type,
                    playerName:     item.userName,
                    playerPosition: item.position,
                    playerAge:      item.age,
                    playerCountry:  item.country,
                    category:       item.category,
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'فشل التحليل الذكي');
            }

            // تحديث عداد الاستهلاك
            if (data.usage) {
                setUsage(data.usage);
            }

            // تحديث الواجهة بالمخرجات المهيكلة
            if (data.skills) {
                setSkills(data.skills);
            }
            if (data.dominantFoot) {
                setDominantFoot(data.dominantFoot);
            }
            if (data.tacticalStrengths) {
                setTacticalStrengths(data.tacticalStrengths);
            }
            if (data.developmentAreas) {
                setDevelopmentAreas(data.developmentAreas);
            }
            if (data.analysis) {
                setAiText(data.analysis);
            }
            if (data.scoutRecommendation && !analystNotes) {
                setAnalystNotes(data.scoutRecommendation);
            }

            onAIResult(item.id, data.analysis, data.rating);
            toast.success('اكتمل التحليل الكروي الذكي وتم ملء درجات المهارات والتقرير الكشفي!');

        } catch (e: any) {
            setAiError(e.message || 'خطأ أثناء تشغيل التحليل');
            toast.error(e.message || 'تعذر تشغيل التحليل');
        } finally {
            setAnalyzing(false);
        }
    };

    // ── اعتماد التقييم ومزامنة بروفايل اللاعب ────────────────
    const handleApproveAndSync = async () => {
        if (!item || syncing) return;
        setSyncing(true);

        try {
            if (onApproveAndSync) {
                await onApproveAndSync(
                    item,
                    skills,
                    calculatedOverall,
                    dominantFoot,
                    analystNotes,
                    aiText || ''
                );
            } else {
                await onUpdateStatus(item, 'approved', analystNotes);
                toast.success('تم اعتماد الفيديو بنجاح');
            }
        } catch (e: any) {
            toast.error('فشل اعتماد التقييم: ' + e.message);
        } finally {
            setSyncing(false);
        }
    };

    const handleQuickStatus = async (status: 'rejected' | 'flagged') => {
        if (!item || updating) return;
        setUpdating(true);
        try {
            await onUpdateStatus(item, status, analystNotes.trim() || undefined);
        } finally {
            setUpdating(false);
        }
    };

    const handleDelete = async () => {
        if (!item || deleting) return;
        if (!confirmDelete) {
            setConfirmDelete(true);
            return;
        }
        setDeleting(true);
        try {
            await onDelete(item);
            toast.success('تم حذف العنصر بنجاح');
            onClose();
        } catch (e: any) {
            toast.error('فشل الحذف: ' + e.message);
        } finally {
            setDeleting(false);
            setConfirmDelete(false);
        }
    };

    const handleSendMessage = async () => {
        if (!message.trim() || !item) return;
        setSendingMsg(true);
        try {
            const res = await authenticatedFetch('/api/notifications/dispatch', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    eventType:       'message_received',
                    targetUserId:    item.userId,
                    actorId:         userId,
                    actorName:       'مسؤول ومحلل أداء المنصة',
                    actorAccountType:'admin',
                    metadata:        { messagePreview: message.trim().substring(0, 100) },
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'فشل الإرسال');
            toast.success(`تم إرسال الإشعار إلى هاتف ${item.userName}`);
            setMessage('');
        } catch (e: any) {
            toast.error('فشل إرسال الرسالة: ' + e.message);
        } finally {
            setSendingMsg(false);
        }
    };

    if (!item) return null;

    const tier = getScoreTier(calculatedOverall);

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const currentDossierText = generateEl7lmDossier(
        item,
        skills,
        calculatedOverall,
        dominantFoot,
        analystNotes,
        aiText || '',
        tacticalStrengths,
        developmentAreas
    );

    const usagePercent = Math.min(100, Math.round((usage.todayCount / usage.dailyLimit) * 100));

    return (
        <DialogPrimitive.Root open={!!item} onOpenChange={open => !open && onClose()}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md transition-opacity animate-in fade-in duration-200" />
                <DialogPrimitive.Content
                    className={`fixed z-50 outline-none flex flex-col bg-slate-950 text-white border border-slate-800 shadow-2xl overflow-hidden duration-200 animate-in fade-in zoom-in-95 ${
                        isFullscreen
                            ? 'inset-0 rounded-none'
                            : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[98vw] max-w-[1600px] h-[95vh] rounded-2xl md:rounded-3xl'
                    }`}
                    dir="rtl"
                >
                    <DialogPrimitive.Title className="sr-only">
                        {item.title} — استوديو تحليل أداء اللاعب
                    </DialogPrimitive.Title>
                    <DialogPrimitive.Description className="sr-only">
                        استوديو الكشافة الفني وتحليل أداء اللاعبين بالذكاء الاصطناعي والمحلل البشري
                    </DialogPrimitive.Description>

                    {/* ═══════════════════════════════════════════════════════════════
                        TOP BAR: STUDIO HEADER & SCOUT NAVIGATOR
                    ═══════════════════════════════════════════════════════════════ */}
                    <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0 z-30">
                        {/* Player Profile & Identity */}
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="relative flex-shrink-0">
                                <div className="w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-emerald-500 to-indigo-500 shadow-md">
                                    {item.userImage ? (
                                        <img src={item.userImage} alt={item.userName} className="w-full h-full rounded-full object-cover bg-slate-900" />
                                    ) : (
                                        <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center font-black text-amber-400 text-sm">
                                            {item.userName.charAt(0) || 'ل'}
                                        </div>
                                    )}
                                </div>
                                <span className="absolute -bottom-1 -right-1 bg-slate-900 border border-slate-700 text-[10px] font-black text-amber-400 px-1 rounded-sm">
                                    {calculatedOverall}
                                </span>
                            </div>

                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h2 className="font-black text-white text-sm md:text-base truncate">{item.userName}</h2>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${STATUS_COLOR[item.status]}`}>
                                        {STATUS_LABEL[item.status]}
                                    </span>
                                    <span className="hidden sm:inline-flex text-[10px] font-black px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                                        {item.position || 'لاعب كرة قدم'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 truncate">
                                    {item.age && <span>{item.age} سنة</span>}
                                    {item.country && <span>• {item.country}</span>}
                                    {item.organization && <span>• {item.organization}</span>}
                                </div>
                            </div>
                        </div>

                        {/* Center: Review Queue Navigator */}
                        <div className="hidden md:flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onPrev}
                                disabled={!hasPrev}
                                className="h-7 px-2 text-xs font-bold text-slate-300 hover:text-white disabled:opacity-30 gap-1 cursor-pointer"
                                title="الفيديو السابق (مفتاح J)"
                            >
                                <ChevronRight className="w-3.5 h-3.5" />
                                <span>السابق</span>
                            </Button>

                            {totalCount > 0 && (
                                <span className="text-[11px] font-mono font-bold text-amber-400/90 px-1 border-x border-slate-800">
                                    {currentIndex} / {totalCount}
                                </span>
                            )}

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onNext}
                                disabled={!hasNext}
                                className="h-7 px-2 text-xs font-bold text-slate-300 hover:text-white disabled:opacity-30 gap-1 cursor-pointer"
                                title="الفيديو التالي (مفتاح K)"
                            >
                                <span>التالي</span>
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </Button>
                        </div>

                        {/* Left: Window Controls */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <a
                                href={`/profile/${item.userId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg transition-colors"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>البروفايل</span>
                            </a>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsFullscreen(prev => !prev)}
                                className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                                title={isFullscreen ? 'تصغير النافذة' : 'ملء الشاشة (مفتاح F)'}
                            >
                                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                                title="إغلاق الاستوديو (Esc)"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* ═══════════════════════════════════════════════════════════════
                        CANVAS: SPLIT-SCREEN SCOUTING ARENA (60% VIDEO | 40% CONSOLE)
                    ═══════════════════════════════════════════════════════════════ */}
                    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-slate-950">

                        {/* ─────────────────────────────────────────────────────────────
                            COLUMN 1: THE SPORTS CINEMA VIDEO ARENA (7 Cols = ~60%)
                        ───────────────────────────────────────────────────────────── */}
                        <div className="lg:col-span-7 xl:col-span-7 flex flex-col min-h-0 border-b lg:border-b-0 lg:border-l border-slate-800/80 bg-black/80 relative">
                            {/* Video Viewport */}
                            <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden group select-none">
                                {item.type === 'video' ? (
                                    (() => {
                                        const isStoredVideo = item.sourceType === 'r2'
                                            || item.url.includes('supabase.co/storage')
                                            || item.url.includes('assets.el7lm.com')
                                            || /\.(mp4|mov|webm|avi|mkv)(\?|$)/i.test(item.url);

                                        if (isStoredVideo) {
                                            return (
                                                <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                                                    <video
                                                        ref={videoRef}
                                                        src={item.url}
                                                        playsInline
                                                        preload="auto"
                                                        onClick={togglePlay}
                                                        onTimeUpdate={() => {
                                                            if (videoRef.current) {
                                                                setCurrentTime(videoRef.current.currentTime);
                                                            }
                                                        }}
                                                        onLoadedMetadata={() => {
                                                            if (videoRef.current) {
                                                                setDuration(videoRef.current.duration);
                                                            }
                                                        }}
                                                        onEnded={() => setIsPlaying(false)}
                                                        style={{
                                                            transform: `scale(${zoomLevel})`,
                                                            transformOrigin: 'center center',
                                                            transition: 'transform 0.2s ease-out'
                                                        }}
                                                        className="w-full h-full object-contain cursor-pointer"
                                                    />

                                                    {/* Central Play/Pause Watermark on click */}
                                                    {!isPlaying && (
                                                        <div
                                                            onClick={togglePlay}
                                                            className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
                                                        >
                                                            <div className="w-16 h-16 rounded-full bg-emerald-500/90 text-slate-950 flex items-center justify-center shadow-xl shadow-emerald-500/30 hover:scale-105 transition-all">
                                                                <Play className="w-8 h-8 fill-slate-950 ml-1" />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Zoom Indicator Badge */}
                                                    {zoomLevel > 1 && (
                                                        <div className="absolute top-3 left-3 bg-slate-900/80 border border-slate-700 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-md pointer-events-none">
                                                            تكبير {zoomLevel}x
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }

                                        if (item.url.includes('youtu')) {
                                            const ytMatch = item.url.match(/(?:youtu\.be\/|watch\?v=|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
                                            const ytId = ytMatch ? ytMatch[1] : null;
                                            return ytId ? (
                                                <iframe
                                                    src={`https://www.youtube.com/embed/${ytId}?autoplay=0&rel=0&modestbranding=1`}
                                                    className="w-full h-full border-0"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                                                    <ExternalLink className="w-10 h-10 text-white/50" />
                                                    <a href={item.url} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline text-sm font-bold">
                                                        فتح الفيديو في منصة YouTube ↗
                                                    </a>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                                                <ExternalLink className="w-10 h-10 text-white/60" />
                                                <p className="text-white/80 text-sm font-semibold">فيديو من منصة خارجية ({item.url.split('/')[2]})</p>
                                                <a
                                                    href={item.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow"
                                                >
                                                    تشغيل الفيديو خارجياً <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            </div>
                                        );
                                    })()
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center p-4">
                                        <img
                                            src={item.url}
                                            alt={item.title}
                                            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* ── SCOUT HUD CONTROLS BAR (For Stored Videos) ── */}
                            {item.type === 'video' && (item.sourceType === 'r2' || /\.(mp4|mov|webm)(\?|$)/i.test(item.url)) && (
                                <div className="bg-slate-900/95 border-t border-slate-800 p-3 space-y-2 flex-shrink-0">
                                    {/* Timeline Scrubber */}
                                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                                        <span className="w-10 text-left">{formatTime(currentTime)}</span>
                                        <input
                                            type="range"
                                            min="0"
                                            max={duration || 100}
                                            step="0.1"
                                            value={currentTime}
                                            onChange={e => handleSeek(parseFloat(e.target.value))}
                                            className="flex-1 h-1.5 accent-emerald-500 bg-slate-800 rounded-lg cursor-pointer"
                                        />
                                        <span className="w-10 text-right">{formatTime(duration)}</span>
                                    </div>

                                    {/* HUD Buttons */}
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        {/* Playback & Seek */}
                                        <div className="flex items-center gap-1.5">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={togglePlay}
                                                className="h-8 px-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg gap-1.5 cursor-pointer"
                                            >
                                                {isPlaying ? <Pause className="w-4 h-4 text-emerald-400" /> : <Play className="w-4 h-4 fill-emerald-400 text-emerald-400" />}
                                                <span className="text-xs">{isPlaying ? 'إيقاف' : 'تشغيل'}</span>
                                            </Button>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleSeek(currentTime - 5)}
                                                className="w-8 h-8 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                                                title="رجوع 5 ثوانٍ"
                                            >
                                                <Rewind className="w-3.5 h-3.5" />
                                            </Button>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleSeek(currentTime + 5)}
                                                className="w-8 h-8 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                                                title="تقديم 5 ثوانٍ"
                                            >
                                                <FastForward className="w-3.5 h-3.5" />
                                            </Button>

                                            {/* Micro-frame Stepper */}
                                            <div className="hidden sm:flex items-center border border-slate-800 rounded-lg overflow-hidden ml-1">
                                                <button
                                                    onClick={() => handleStepFrame(-1)}
                                                    className="px-2 py-1 text-[10px] text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                                                    title="إطار للخلف"
                                                >
                                                    ◄ إطار
                                                </button>
                                                <button
                                                    onClick={() => handleStepFrame(1)}
                                                    className="px-2 py-1 text-[10px] text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer border-r border-slate-800"
                                                    title="إطار للأمام"
                                                >
                                                    إطار ►
                                                </button>
                                            </div>
                                        </div>

                                        {/* Speed & Zoom */}
                                        <div className="flex items-center gap-1.5">
                                            {/* Slow Motion Pills */}
                                            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                                                {[0.25, 0.5, 1.0, 1.5].map(rate => (
                                                    <button
                                                        key={rate}
                                                        onClick={() => handleSpeedChange(rate)}
                                                        className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                                                            playbackRate === rate
                                                                ? 'bg-emerald-600 text-white shadow-xs'
                                                                : 'text-slate-400 hover:text-white'
                                                        }`}
                                                    >
                                                        {rate === 1.0 ? '1x' : `${rate}x`}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Zoom toggle */}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={toggleZoom}
                                                className={`h-7 px-2 text-[10px] font-bold rounded-lg border border-slate-800 cursor-pointer ${
                                                    zoomLevel > 1 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'text-slate-400 hover:text-white'
                                                }`}
                                                title="تكبير اللقطة للتركيز على حركة قدم اللاعب"
                                            >
                                                <ZoomIn className="w-3 h-3 ml-1" />
                                                <span>{zoomLevel}x</span>
                                            </Button>

                                            {/* Audio toggle */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={toggleMute}
                                                className="w-7 h-7 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                                            >
                                                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Video Metadata Ribbon */}
                            <div className="bg-slate-950 px-4 py-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 flex-shrink-0">
                                <div className="flex items-center gap-2 truncate">
                                    <Film className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                    <span className="font-bold text-white truncate">{item.title}</span>
                                    <span className="text-[10px] text-slate-500">• {item.category || 'فيديو مهارات'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-[10px] text-slate-400 flex-shrink-0">
                                    {item.sourceType === 'r2' && (
                                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                                            📱 رفع مباشر Cloudflare R2
                                        </span>
                                    )}
                                    {item.fileSize && (
                                        <span>{(item.fileSize / 1024 / 1024).toFixed(1)} MB</span>
                                    )}
                                    <span>{item.views} مشاهدة</span>
                                </div>
                            </div>
                        </div>

                        {/* ─────────────────────────────────────────────────────────────
                            COLUMN 2: SCOUTING & PERFORMANCE CONSOLE (5 Cols = ~40%)
                        ───────────────────────────────────────────────────────────── */}
                        <div className="lg:col-span-5 xl:col-span-5 flex flex-col min-h-0 bg-slate-900/60 border-r border-slate-800">
                            {/* ── TOP SEGMENTED TAB SWITCHER (3 TABS) ── */}
                            <div className="p-3 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-2 flex-shrink-0">
                                <div className="grid grid-cols-3 gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 w-full">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('matrix')}
                                        className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            activeTab === 'matrix'
                                                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                                                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                                        }`}
                                    >
                                        <Sliders className="w-3.5 h-3.5" />
                                        <span>مصفوفة المهارات</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('dossier')}
                                        className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer relative ${
                                            activeTab === 'dossier'
                                                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                                                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                                        }`}
                                    >
                                        <FileText className="w-3.5 h-3.5" />
                                        <span>الملف الكشفي المعتمد</span>
                                        {aiText && (
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-0.5" />
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('contact')}
                                        className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            activeTab === 'contact'
                                                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                                                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                                        }`}
                                    >
                                        <User className="w-3.5 h-3.5" />
                                        <span>التواصل والإشعار</span>
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable Evaluation Body */}
                            <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">

                                {activeTab === 'matrix' && (
                                    <>

                                {/* 1. AI Gemini Assistant Header with Real-Time Free Tier Gauge */}
                                <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950 border border-indigo-500/30 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                                    
                                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 text-emerald-400" />
                                                <span className="text-xs font-black tracking-wide text-emerald-400 uppercase">
                                                    مساعد الكشاف الذكي — Gemini AI Suite
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-300 mt-1 max-w-sm">
                                                استخراج فوري لمصفوفة المهارات الكروية وتوصيات التمركز لتدقيقها واعتمادها.
                                            </p>
                                        </div>
                                        <Button
                                            onClick={handleAnalyze}
                                            disabled={analyzing}
                                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black h-9 px-3.5 text-xs gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer flex-shrink-0"
                                        >
                                            <Sparkles className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
                                            <span>{analyzing ? 'جاري الفحص التكتيكي...' : 'تشغيل تحليل AI ⚡'}</span>
                                        </Button>
                                    </div>

                                    {/* ── Real-time Free Tier Consumption Tracker ── */}
                                    <div className="relative z-10 mt-3 pt-2.5 border-t border-slate-800/80 flex flex-col gap-1.5 text-[10px]">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                                                <Gauge className="w-3 h-3 text-emerald-400" />
                                                <span>الباقة المجانية الرسمية (Google AI Studio)</span>
                                            </div>
                                            <span className="font-mono font-bold text-amber-300">
                                                {usage.todayCount} / {usage.dailyLimit} تحليل اليوم (متبقي {usage.remaining})
                                            </span>
                                        </div>
                                        {/* Progress bar */}
                                        <div className="w-full bg-slate-950/80 rounded-full h-1.5 overflow-hidden border border-slate-800">
                                            <div
                                                className={`h-full transition-all duration-500 ${
                                                    usagePercent > 80
                                                        ? 'bg-rose-500'
                                                        : usagePercent > 50
                                                        ? 'bg-amber-500'
                                                        : 'bg-emerald-500'
                                                }`}
                                                style={{ width: `${Math.max(2, usagePercent)}%` }}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between text-[9px] text-slate-400 font-medium">
                                            <span>🛡️ باقة مجانية 100% — لا توجد أي تكاليف أو اشتراكات</span>
                                            <span>15 طلب/دقيقة كحد أقصى</span>
                                        </div>
                                    </div>
                                </div>

                                {aiError && (
                                    <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-300">
                                        <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="font-bold">تنبيه أثناء التحليل:</p>
                                            <p className="mt-0.5 text-rose-300/80">{aiError}</p>
                                        </div>
                                    </div>
                                )}

                                {/* 2. 3D FUT FIFA/FC STYLE PLAYER CARD (Gold / Elite Card) */}
                                <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl relative overflow-hidden">
                                    <div className="flex items-center justify-between gap-4">
                                        {/* Card Visual Left */}
                                        <div className="relative w-28 h-40 bg-gradient-to-br from-amber-400 via-yellow-600 to-amber-700 rounded-xl p-0.5 shadow-2xl flex-shrink-0">
                                            <div className="w-full h-full bg-slate-950 rounded-[10px] p-2 flex flex-col justify-between relative overflow-hidden">
                                                {/* Card Background Pattern */}
                                                <div className="absolute inset-0 bg-radial from-amber-500/10 via-transparent to-transparent pointer-events-none" />

                                                {/* Top Row: OVR & Position */}
                                                <div className="relative z-10 flex flex-col items-center">
                                                    <span className="text-2xl font-black text-amber-400 leading-none tracking-tight">
                                                        {calculatedOverall}
                                                    </span>
                                                    <span className="text-[10px] font-black text-white/80 uppercase">
                                                        {item.position || 'ST'}
                                                    </span>
                                                </div>

                                                {/* Center Avatar Cutout */}
                                                <div className="relative z-10 w-12 h-12 mx-auto rounded-full bg-slate-900 border border-amber-500/40 overflow-hidden flex items-center justify-center">
                                                    {item.userImage ? (
                                                        <img src={item.userImage} alt={item.userName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User className="w-6 h-6 text-amber-400/60" />
                                                    )}
                                                </div>

                                                {/* Player Name */}
                                                <div className="relative z-10 text-center">
                                                    <p className="text-[10px] font-black text-amber-300 truncate uppercase">
                                                        {item.userName.split(' ')[0] || 'PLAYER'}
                                                    </p>
                                                </div>

                                                {/* Mini Stats 6 attributes */}
                                                <div className="relative z-10 grid grid-cols-2 gap-x-1 text-[8px] font-bold text-white/80 border-t border-amber-500/30 pt-1 text-center font-mono">
                                                    <span>{skills.pace} PAC</span>
                                                    <span>{skills.dribbling} DRI</span>
                                                    <span>{skills.shooting} SHO</span>
                                                    <span>{skills.defending} DEF</span>
                                                    <span>{skills.passing} PAS</span>
                                                    <span>{skills.physical} PHY</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card Details Right */}
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${tier.bgCls}`}>
                                                    {tier.label}
                                                </span>
                                                <span className="text-xs text-slate-400 font-bold">
                                                    بطاقة الأداء الرياضي
                                                </span>
                                            </div>

                                            <p className="text-xs text-slate-300 leading-relaxed font-medium">
                                                متوسط المهارات الست المعتمدة لمركز ({item.position || 'اللاعب'}) مع التحديث اللحظي المباشر.
                                            </p>

                                            {/* Dominant Foot Selection */}
                                            <div className="pt-1 flex items-center gap-2">
                                                <span className="text-[11px] font-bold text-slate-400">القدم المفضلة:</span>
                                                <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                                                    {['يمين', 'يسار', 'كلتاهما'].map(foot => (
                                                        <button
                                                            key={foot}
                                                            type="button"
                                                            onClick={() => setDominantFoot(foot)}
                                                            className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                                                                dominantFoot === foot
                                                                    ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                                                                    : 'text-slate-400 hover:text-white'
                                                            }`}
                                                        >
                                                            {foot}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 3. THE 6 FOOTBALL CORE SKILLS (SLIDERS WITH FINE-TUNING) */}
                                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
                                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                                        <div className="flex items-center gap-1.5">
                                            <Sliders className="w-4 h-4 text-emerald-400" />
                                            <h3 className="text-xs font-black text-white">المهارات الست الأساسية (EA Sports FC Matrix)</h3>
                                        </div>
                                        <span className="text-[10px] text-slate-400">تحديث لحظي لـ OVR</span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        {[
                                            { key: 'pace',      label: '⚡ السرعة (PAC)', desc: 'الانطلاق وسرعة الجري بالكرة' },
                                            { key: 'shooting',  label: '⚽ التسديد (SHO)', desc: 'قوة وإنهاء الكرات بالمرمى' },
                                            { key: 'passing',   label: '🎯 التمرير (PAS)', desc: 'صناعة اللعب والرؤية' },
                                            { key: 'dribbling', label: '👟 المراوغة (DRI)', desc: 'الرشاقة وحفظ الكرة تحت الضغط' },
                                            { key: 'defending', label: '🛡️ الدفاع (DEF)', desc: 'التمركز وقطع الكرات' },
                                            { key: 'physical',  label: '💪 البدنية (PHY)', desc: 'الالتحام والارتقاء والتحمل' },
                                        ].map(s => {
                                            const val = skills[s.key as keyof FootballSkills];
                                            const badgeCls = getSkillColor(val);
                                            return (
                                                <div key={s.key} className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 flex flex-col justify-between">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-[11px] font-bold text-slate-200">{s.label}</span>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSkillChange(s.key as keyof FootballSkills, val - 1)}
                                                                className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center cursor-pointer"
                                                            >
                                                                -
                                                            </button>
                                                            <span className={`text-xs font-black px-1.5 py-0.5 rounded-md border font-mono ${badgeCls}`}>
                                                                {val}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSkillChange(s.key as keyof FootballSkills, val + 1)}
                                                                className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center cursor-pointer"
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="30"
                                                        max="99"
                                                        value={val}
                                                        onChange={e => handleSkillChange(s.key as keyof FootballSkills, parseInt(e.target.value) || 50)}
                                                        className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                                                    />
                                                    <span className="text-[9px] text-slate-400 mt-1 truncate">{s.desc}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                        {/* Performance Analyst Technical Recommendation & Notes */}
                                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    <Award className="w-4 h-4 text-emerald-400" />
                                                    <h4 className="text-xs font-black text-white">توصيات وملاحظات الكشاف المعتمد</h4>
                                                </div>
                                                <span className="text-[10px] text-slate-400">تظهر في تقرير اللاعب والبروفايل</span>
                                            </div>
                                            <Textarea
                                                rows={3}
                                                value={analystNotes}
                                                onChange={e => setAnalystNotes(e.target.value)}
                                                placeholder="اكتب التوصيات الفنية أو الملاحظات التكتيكية التي تريد توجيهها للاعب والأندية..."
                                                className="text-xs bg-slate-950 border-slate-800 text-slate-200 leading-relaxed resize-none focus:border-emerald-500"
                                            />
                                        </div>
                                    </>
                                )}

                                {/* ==============================================================
                                    TAB 2: EL7LM PRO SCOUTING DOSSIER (الملف الكشفي المعتمد)
                                ============================================================== */}
                                {activeTab === 'dossier' && (
                                    <>
                                        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 rounded-2xl p-4 shadow-xl space-y-3">
                                            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                                        <FileText className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xs font-black text-white">ملف الكشاف المعتمد — منصة الحلم</h3>
                                                        <p className="text-[10px] text-slate-400">El7lm Pro Scouting Dossier</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5">
                                                    <Button
                                                        onClick={handleShareWhatsApp}
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 px-2.5 text-[11px] font-bold border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 gap-1 cursor-pointer"
                                                        title="مشاركة التقرير عبر واتساب للأندية والوكلاء"
                                                    >
                                                        <Share2 className="w-3.5 h-3.5" />
                                                        <span className="hidden sm:inline">واتساب للأندية</span>
                                                    </Button>

                                                    <Button
                                                        onClick={handleCopyDossier}
                                                        size="sm"
                                                        className={`h-8 px-3 text-xs font-black gap-1.5 transition-all cursor-pointer shadow-md ${
                                                            copiedReport
                                                                ? 'bg-emerald-600 text-white'
                                                                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                                                        }`}
                                                    >
                                                        {copiedReport ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                        <span>{copiedReport ? 'تم النسخ!' : 'نسخ التقرير الكشفي 📋'}</span>
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* El7lm Dossier Preview Monospace Box */}
                                            <div className="bg-slate-950/95 border border-slate-800 rounded-xl p-3.5 text-xs font-mono text-slate-200 leading-relaxed whitespace-pre-line max-h-80 overflow-y-auto custom-scrollbar select-all shadow-inner">
                                                {currentDossierText}
                                            </div>
                                        </div>

                                        {/* Tactical Strengths & Development Areas */}
                                        {(tacticalStrengths.length > 0 || developmentAreas.length > 0) && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {tacticalStrengths.length > 0 && (
                                                    <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3">
                                                        <p className="text-[11px] font-bold text-emerald-400 mb-1.5 flex items-center gap-1">
                                                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> نقاط القوة التكتيكية:
                                                        </p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {tacticalStrengths.map((str, idx) => (
                                                                <span key={idx} className="bg-emerald-500/15 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-500/30">
                                                                    {str}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {developmentAreas.length > 0 && (
                                                    <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3">
                                                        <p className="text-[11px] font-bold text-amber-400 mb-1.5 flex items-center gap-1">
                                                            <Target className="w-3.5 h-3.5 text-amber-400" /> جوانب بحاجة لتطوير:
                                                        </p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {developmentAreas.map((dev, idx) => (
                                                                <span key={idx} className="bg-amber-500/15 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-500/30">
                                                                    {dev}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* AI Detailed Breakdown */}
                                        {aiText && (
                                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowFullAiReport(prev => !prev)}
                                                    className="w-full text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center justify-between cursor-pointer"
                                                >
                                                    <span className="flex items-center gap-1.5">
                                                        <Sparkles className="w-3.5 h-3.5" />
                                                        <span>عرض التقرير الفني المفصل المستخرج بالذكاء الاصطناعي</span>
                                                    </span>
                                                    {showFullAiReport ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                </button>
                                                {showFullAiReport && (
                                                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 mt-2 text-slate-300 leading-relaxed text-xs whitespace-pre-line max-h-56 overflow-y-auto">
                                                        {aiText}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* ==============================================================
                                    TAB 3: CONTACT & NOTIFICATION (التواصل وإشعار اللاعب)
                                ============================================================== */}
                                {activeTab === 'contact' && (
                                    <>
                                        {/* Player Direct Contact Card */}
                                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                                            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                                                <User className="w-4 h-4 text-emerald-400" />
                                                <h4 className="text-xs font-black text-white">قنوات التواصل المباشر مع اللاعب</h4>
                                            </div>

                                            <div className="bg-slate-950 rounded-xl p-3.5 space-y-2.5 text-xs">
                                                {item.userPhone ? (
                                                    <div className="flex items-center justify-between text-slate-300">
                                                        <span className="flex items-center gap-2 font-mono">
                                                            <Phone className="w-3.5 h-3.5 text-slate-500" /> {item.userPhone}
                                                        </span>
                                                        <a
                                                            href={`https://wa.me/${item.userPhone.replace(/\D/g, '')}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1"
                                                        >
                                                            <span>مراسلة واتساب 💬</span>
                                                        </a>
                                                    </div>
                                                ) : (
                                                    <p className="text-slate-500 text-xs">لا يوجد رقم هاتف مسجل</p>
                                                )}

                                                {item.userEmail && (
                                                    <div className="flex items-center gap-2 text-slate-300">
                                                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                                                        <span className="font-mono">{item.userEmail}</span>
                                                    </div>
                                                )}

                                                <div className="pt-1 text-[11px] text-slate-400 border-t border-slate-900 flex items-center justify-between">
                                                    <span>النادي / الأكاديمية:</span>
                                                    <span className="text-white font-bold">{item.organization || 'لاعب حر'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Instant Mobile Notification Box */}
                                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                                            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                                                <MessageSquare className="w-4 h-4 text-teal-400" />
                                                <h4 className="text-xs font-black text-white">إرسال إشعار فوري لهاتف اللاعب</h4>
                                            </div>
                                            <p className="text-[11px] text-slate-400">
                                                يصل الإشعار فوراً في شريط إشعارات الهاتف لـ ({item.userName}).
                                            </p>
                                            <Textarea
                                                rows={3}
                                                value={message}
                                                onChange={e => setMessage(e.target.value)}
                                                placeholder="اكتب التوجيه الفني أو التنبيه المباشر للاعب..."
                                                className="text-xs bg-slate-950 border-slate-800 text-slate-200 resize-none focus:border-teal-500"
                                            />
                                            <Button
                                                onClick={handleSendMessage}
                                                disabled={sendingMsg || !message.trim()}
                                                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold h-9 text-xs gap-2 cursor-pointer"
                                            >
                                                <Send className={`w-3.5 h-3.5 ${sendingMsg ? 'animate-spin' : ''}`} />
                                                <span>{sendingMsg ? 'جاري الإرسال...' : 'إرسال الإشعار لهاتف اللاعب'}</span>
                                            </Button>
                                        </div>

                                        {/* Danger Zone: Delete Video */}
                                        <div className="bg-rose-950/20 border border-rose-500/20 rounded-2xl p-4 flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-bold text-rose-300">حذف هذا الفيديو</p>
                                                <p className="text-[10px] text-rose-400/70">إزالة ملف الفيديو والبيانات المرتبطة نهائياً من الخادم</p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleDelete}
                                                disabled={deleting}
                                                className="border border-rose-500/40 text-rose-400 hover:bg-rose-500/20 text-xs font-bold h-8.5 cursor-pointer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 ml-1" />
                                                {confirmDelete ? 'تأكيد الحذف النهائي؟' : 'حذف الفيديو'}
                                            </Button>
                                        </div>
                                    </>
                                )}

                            </div>

                            {/* ═══════════════════════════════════════════════════════════════
                                STICKY STUDIO ACTION FOOTER (ALWAYS VISIBLE - NEVER CUT OFF)
                            ═══════════════════════════════════════════════════════════════ */}
                            <div className="border-t border-slate-800 bg-slate-900/95 backdrop-blur-md px-4 py-3.5 space-y-2 flex-shrink-0 z-20">
                                {/* Primary Approval Button */}
                                <Button
                                    onClick={handleApproveAndSync}
                                    disabled={syncing}
                                    className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black h-11 text-sm gap-2 shadow-xl shadow-emerald-600/25 active:scale-98 transition-all cursor-pointer"
                                >
                                    <ShieldCheck className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
                                    <span>
                                        {syncing ? 'جاري الاعتماد وتحديث كارت اللاعب...' : `🌟 اعتماد ومزامنة كارت اللاعب (${calculatedOverall} OVR)`}
                                    </span>
                                </Button>

                                {/* Secondary Decision Actions & Quick Nav */}
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleQuickStatus('flagged')}
                                        disabled={updating}
                                        className="gap-1.5 text-xs font-bold border-amber-500/30 text-amber-400 hover:bg-amber-500/10 h-8.5 cursor-pointer"
                                    >
                                        <Flag className="w-3.5 h-3.5 text-amber-400" />
                                        <span>تنبيه / طلب إعادة</span>
                                    </Button>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleQuickStatus('rejected')}
                                        disabled={updating}
                                        className="gap-1.5 text-xs font-bold border-rose-500/30 text-rose-400 hover:bg-rose-500/10 h-8.5 cursor-pointer"
                                    >
                                        <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                        <span>رفض الفيديو</span>
                                    </Button>
                                </div>
                            </div>
                        </div>

                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
