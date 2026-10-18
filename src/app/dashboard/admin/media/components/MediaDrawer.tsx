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
    Gauge, FileText, CheckCheck
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
    pending:  'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-rose-50 text-rose-700 border-rose-200',
    flagged:  'bg-orange-50 text-orange-700 border-orange-200',
};

const STATUS_LABEL: Record<string, string> = {
    pending: 'بانتظار التحليل',
    approved: 'معتمد ومزامَن',
    rejected: 'مرفوض',
    flagged: 'تنبيه / إعادة',
};

function getSkillBadgeColor(val: number) {
    if (val >= 85) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (val >= 75) return 'text-teal-700 bg-teal-50 border-teal-200';
    if (val >= 65) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-rose-700 bg-rose-50 border-rose-200';
}

function getScoreTier(ovr: number) {
    if (ovr >= 85) return { label: 'نخبة ELITE', textCls: 'text-amber-800', bgCls: 'bg-amber-50 border-amber-200 text-amber-800' };
    if (ovr >= 75) return { label: 'محترف PRO', textCls: 'text-emerald-800', bgCls: 'bg-emerald-50 border-emerald-200 text-emerald-800' };
    if (ovr >= 65) return { label: 'واعد PROMISING', textCls: 'text-sky-800', bgCls: 'bg-sky-50 border-sky-200 text-sky-800' };
    return { label: 'تحت التطوير', textCls: 'text-slate-600', bgCls: 'bg-slate-100 border-slate-200 text-slate-700' };
}

const SKILL_DEFS: { key: keyof FootballSkills; label: string; short: string; icon: string; desc: string }[] = [
    { key: 'pace',      label: 'السرعة والتسارع',         short: 'PAC', icon: '⚡', desc: 'الانطلاق وسرعة الجري بالكرة' },
    { key: 'shooting',  label: 'التسديد وإنهاء الهجمات', short: 'SHO', icon: '⚽', desc: 'قوة وإنهاء الكرات في المرمى' },
    { key: 'passing',   label: 'التمرير وصناعة اللعب',   short: 'PAS', icon: '🎯', desc: 'صناعة اللعب ودقة التمريرات' },
    { key: 'dribbling', label: 'المراوغة والتحكم',       short: 'DRI', icon: '👟', desc: 'الرشاقة وحفظ الكرة تحت الضغط' },
    { key: 'defending', label: 'التمركز والواجب الدفاعي', short: 'DEF', icon: '🛡️', desc: 'التمركز السليم وافتكاك الكرة' },
    { key: 'physical',  label: 'القوة البدنية والالتحام', short: 'PHY', icon: '💪', desc: 'الالتحامات القوية والارتقاء' },
];

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

    // ── Segmented Tabs ──
    const [activeTab, setActiveTab] = useState<'matrix' | 'dossier' | 'contact'>('matrix');
    const [showFullAiReport, setShowFullAiReport] = useState(false);
    const [copiedReport, setCopiedReport] = useState(false);

    // Free Tier Usage State (1,500 analyses / day)
    const [usage, setUsage] = useState({
        todayCount: 9,
        dailyLimit: 1500,
        remaining: 1491,
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
    const [zoomLevel, setZoomLevel] = useState(1);
    const [isMuted, setIsMuted] = useState(false);

    // ── Fetch Free Tier Usage on mount ──
    useEffect(() => {
        let isMounted = true;
        const fetchUsage = async () => {
            try {
                const res = await fetch('/api/media/analyze-video');
                if (!res.ok) return;
                const data = await res.json();
                if (data?.success && data?.usage && isMounted) {
                    setUsage(data.usage);
                }
            } catch {
                // Silently keep default
            }
        };
        fetchUsage();
        return () => { isMounted = false; };
    }, []);

    // ── Interactive Football Skills State ──
    const [skills, setSkills] = useState<FootballSkills>({
        pace: 75,
        shooting: 70,
        passing: 72,
        dribbling: 78,
        defending: 65,
        physical: 74,
    });
    const [dominantFoot, setDominantFoot] = useState('يمين');
    const [analystNotes, setAnalystNotes] = useState('');
    const [tacticalStrengths, setTacticalStrengths] = useState<string[]>([]);
    const [developmentAreas, setDevelopmentAreas] = useState<string[]>([]);

    // Sync on item change
    useEffect(() => {
        if (!item) return;

        setAiText(item.aiAnalysis || null);
        setAiError(null);
        setAnalystNotes(item.notes || '');
        setConfirmDelete(false);
        setMessage('');
        setActiveTab('matrix');
        setCurrentTime(0);
        setIsPlaying(false);
        setPlaybackRate(1.0);
        setZoomLevel(1);

        const pos = (item.position || '').toLowerCase();
        let defaultSkills: FootballSkills = {
            pace: 75,
            shooting: 70,
            passing: 72,
            dribbling: 78,
            defending: 65,
            physical: 74,
        };

        if (pos.includes('مهاجم') || pos.includes('st') || pos.includes('cf') || pos.includes('forward')) {
            defaultSkills = { pace: 84, shooting: 82, passing: 72, dribbling: 80, defending: 48, physical: 76 };
        } else if (pos.includes('جناح') || pos.includes('rw') || pos.includes('lw') || pos.includes('wing')) {
            defaultSkills = { pace: 88, shooting: 76, passing: 78, dribbling: 85, defending: 52, physical: 68 };
        } else if (pos.includes('وسط') || pos.includes('cm') || pos.includes('cam') || pos.includes('midfield')) {
            defaultSkills = { pace: 77, shooting: 72, passing: 83, dribbling: 81, defending: 68, physical: 74 };
        } else if (pos.includes('مدافع') || pos.includes('cb') || pos.includes('defense')) {
            defaultSkills = { pace: 72, shooting: 45, passing: 68, dribbling: 62, defending: 85, physical: 84 };
        } else if (pos.includes('ظهير') || pos.includes('rb') || pos.includes('lb') || pos.includes('fullback')) {
            defaultSkills = { pace: 85, shooting: 60, passing: 75, dribbling: 76, defending: 79, physical: 78 };
        } else if (pos.includes('حارس') || pos.includes('gk') || pos.includes('keeper')) {
            defaultSkills = { pace: 65, shooting: 30, passing: 65, dribbling: 50, defending: 86, physical: 82 };
        }

        setSkills(defaultSkills);
        setTacticalStrengths([]);
        setDevelopmentAreas([]);
    }, [item?.id]);

    const handleSkillChange = (key: keyof FootballSkills, value: number) => {
        setSkills(prev => ({
            ...prev,
            [key]: Math.min(99, Math.max(30, value))
        }));
    };

    // Calculate OVR with position weights
    const calculatedOverall = useMemo(() => {
        if (!item) return 75;
        const pos = (item.position || '').toLowerCase();
        let ovr = 0;

        if (pos.includes('مهاجم') || pos.includes('st') || pos.includes('forward')) {
            ovr = skills.shooting * 0.35 + skills.pace * 0.25 + skills.dribbling * 0.20 + skills.physical * 0.10 + skills.passing * 0.10;
        } else if (pos.includes('جناح') || pos.includes('rw') || pos.includes('lw')) {
            ovr = skills.pace * 0.35 + skills.dribbling * 0.30 + skills.shooting * 0.15 + skills.passing * 0.15 + skills.physical * 0.05;
        } else if (pos.includes('وسط') || pos.includes('cm') || pos.includes('midfield')) {
            ovr = skills.passing * 0.30 + skills.dribbling * 0.25 + skills.defending * 0.15 + skills.pace * 0.15 + skills.physical * 0.15;
        } else if (pos.includes('مدافع') || pos.includes('cb')) {
            ovr = skills.defending * 0.40 + skills.physical * 0.30 + skills.pace * 0.15 + skills.passing * 0.15;
        } else if (pos.includes('ظهير') || pos.includes('rb') || pos.includes('lb')) {
            ovr = skills.pace * 0.30 + skills.defending * 0.30 + skills.physical * 0.20 + skills.passing * 0.20;
        } else {
            ovr = (skills.pace + skills.shooting + skills.passing + skills.dribbling + skills.defending + skills.physical) / 6;
        }

        return Math.round(ovr);
    }, [skills, item?.position]);

    // ── Video Controls Handlers ──
    const togglePlay = () => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
            setIsPlaying(false);
        } else {
            videoRef.current.play();
            setIsPlaying(true);
        }
    };

    const handleSpeedChange = (rate: number) => {
        setPlaybackRate(rate);
        if (videoRef.current) {
            videoRef.current.playbackRate = rate;
        }
    };

    const handleSeek = (newTime: number) => {
        if (!videoRef.current) return;
        const target = Math.max(0, Math.min(duration, newTime));
        videoRef.current.currentTime = target;
        setCurrentTime(target);
    };

    const handleStepFrame = (frames: number) => {
        if (!videoRef.current) return;
        const frameTime = 1 / 30;
        handleSeek(videoRef.current.currentTime + frames * frameTime);
    };

    const toggleZoom = () => {
        setZoomLevel(prev => (prev === 1 ? 1.5 : prev === 1.5 ? 2.0 : 1));
    };

    const toggleMute = () => {
        if (!videoRef.current) return;
        const newMute = !isMuted;
        videoRef.current.muted = newMute;
        setIsMuted(newMute);
    };

    // ── Copy Dossier ──
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

    // ── Share WhatsApp ──
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

    // ── Keyboard Shortcuts ──
    useEffect(() => {
        if (!item) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea') return;

            if (e.code === 'Space') {
                e.preventDefault();
                togglePlay();
            } else if (e.code === 'KeyF') {
                e.preventDefault();
                setIsFullscreen(prev => !prev);
            } else if (e.code === 'ArrowRight') {
                e.preventDefault();
                handleSeek(currentTime + (e.shiftKey ? 10 : 5));
            } else if (e.code === 'ArrowLeft') {
                e.preventDefault();
                handleSeek(currentTime - (e.shiftKey ? 10 : 5));
            } else if (e.code === 'Period') {
                e.preventDefault();
                handleStepFrame(1);
            } else if (e.code === 'Comma') {
                e.preventDefault();
                handleStepFrame(-1);
            } else if (e.code === 'KeyK' && hasNext && onNext) {
                e.preventDefault();
                onNext();
            } else if (e.code === 'KeyJ' && hasPrev && onPrev) {
                e.preventDefault();
                onPrev();
            } else if (e.code === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [item, isPlaying, currentTime, duration, hasNext, hasPrev, onNext, onPrev, onClose]);

    // ── Run AI Video & Skills Analysis ──
    const handleAnalyze = async () => {
        if (!item || analyzing) return;
        setAnalyzing(true);
        setAiError(null);

        try {
            let frames: string[] = [];
            if (item.type === 'video' && (item.sourceType === 'r2' || /\.(mp4|mov|webm)(\?|$)/i.test(item.url))) {
                frames = await captureFrames(item.url);
            }

            const res = await authenticatedFetch('/api/media/analyze-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mediaId: item.id,
                    url: item.url,
                    title: item.title,
                    type: item.type,
                    sourceType: item.sourceType,
                    category: item.category,
                    userId: item.userId,
                    userName: item.userName,
                    playerPosition: item.position || '',
                    playerAge: item.age || null,
                    playerCountry: item.country || '',
                    frames
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'فشل تحليل الفيديو');
            }

            if (data.skills) {
                setSkills({
                    pace: data.skills.pace ?? 75,
                    shooting: data.skills.shooting ?? 70,
                    passing: data.skills.passing ?? 72,
                    dribbling: data.skills.dribbling ?? 78,
                    defending: data.skills.defending ?? 65,
                    physical: data.skills.physical ?? 74,
                });
            }

            if (data.dominantFoot) setDominantFoot(data.dominantFoot);
            if (Array.isArray(data.tacticalStrengths)) setTacticalStrengths(data.tacticalStrengths);
            if (Array.isArray(data.developmentAreas)) setDevelopmentAreas(data.developmentAreas);

            if (data.usage) setUsage(data.usage);

            if (data.analysis) setAiText(data.analysis);
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

    // ── Approve and Sync ──
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

    return (
        <DialogPrimitive.Root open={!!item} onOpenChange={open => !open && onClose()}>
            <DialogPrimitive.Portal>
                {/* Clean, Subtle Executive Modal Backdrop */}
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200" />
                
                {/* Executive White Container matching the El7lm Dashboard */}
                <DialogPrimitive.Content
                    className={`fixed z-50 outline-none flex flex-col bg-white text-slate-900 border border-slate-200 shadow-2xl overflow-hidden duration-200 animate-in fade-in zoom-in-95 ${
                        isFullscreen
                            ? 'inset-0 rounded-none'
                            : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[98vw] max-w-[1550px] h-[94vh] rounded-2xl md:rounded-3xl'
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
                        TOP BAR: EXECUTIVE STUDIO HEADER & SCOUT NAVIGATOR
                    ═══════════════════════════════════════════════════════════════ */}
                    <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex items-center justify-between gap-3 flex-shrink-0 z-30">
                        {/* Player Profile & Identity */}
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="relative flex-shrink-0">
                                <div className="w-11 h-11 rounded-full p-0.5 bg-slate-100 border border-slate-300 shadow-xs">
                                    {item.userImage ? (
                                        <img src={item.userImage} alt={item.userName} className="w-full h-full rounded-full object-cover bg-slate-100" />
                                    ) : (
                                        <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-700 text-sm">
                                            {item.userName.charAt(0) || 'ل'}
                                        </div>
                                    )}
                                </div>
                                <span className="absolute -bottom-1 -right-1 bg-emerald-600 border border-white text-[10px] font-black text-white px-1.5 py-0.2 rounded-full shadow-xs">
                                    {calculatedOverall}
                                </span>
                            </div>

                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h2 className="font-black text-slate-900 text-sm md:text-base truncate">{item.userName}</h2>
                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${STATUS_COLOR[item.status]}`}>
                                        {STATUS_LABEL[item.status]}
                                    </span>
                                    <span className="hidden sm:inline-flex text-[11px] font-bold px-2 py-0.5 rounded-md border bg-slate-100 text-slate-700 border-slate-200">
                                        {item.position || 'لاعب كرة قدم'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 truncate">
                                    {item.age && <span>{item.age} سنة</span>}
                                    {item.country && <span>• {item.country}</span>}
                                    {item.organization && <span>• {item.organization}</span>}
                                </div>
                            </div>
                        </div>

                        {/* Center: Review Queue Navigator */}
                        <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onPrev}
                                disabled={!hasPrev}
                                className="h-7 px-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 disabled:opacity-30 gap-1 cursor-pointer"
                                title="الفيديو السابق (مفتاح J)"
                            >
                                <ChevronRight className="w-3.5 h-3.5" />
                                <span>السابق</span>
                            </Button>

                            {totalCount > 0 && (
                                <span className="text-xs font-mono font-bold text-slate-800 px-2 border-x border-slate-200">
                                    {currentIndex} / {totalCount}
                                </span>
                            )}

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onNext}
                                disabled={!hasNext}
                                className="h-7 px-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 disabled:opacity-30 gap-1 cursor-pointer"
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
                                className="hidden sm:flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>البروفايل</span>
                            </a>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsFullscreen(prev => !prev)}
                                className="w-8 h-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                                title={isFullscreen ? 'تصغير النافذة' : 'ملء الشاشة (مفتاح F)'}
                            >
                                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="w-8 h-8 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                title="إغلاق الاستوديو (Esc)"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* ═══════════════════════════════════════════════════════════════
                        CANVAS: SPLIT-SCREEN SCOUTING ARENA (60% VIDEO | 40% CONSOLE)
                    ═══════════════════════════════════════════════════════════════ */}
                    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-slate-100">

                        {/* ─────────────────────────────────────────────────────────────
                            COLUMN 1: THE SPORTS CINEMA VIDEO ARENA (7 Cols = ~60%)
                        ───────────────────────────────────────────────────────────── */}
                        <div className="lg:col-span-7 xl:col-span-7 flex flex-col min-h-0 border-b lg:border-b-0 lg:border-l border-slate-200 bg-slate-950 relative">
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
                                                            <div className="w-16 h-16 rounded-full bg-emerald-600/90 text-white flex items-center justify-center shadow-xl shadow-emerald-600/30 hover:scale-105 transition-all">
                                                                <Play className="w-8 h-8 fill-white ml-1" />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Zoom Indicator Badge */}
                                                    {zoomLevel > 1 && (
                                                        <div className="absolute top-3 left-3 bg-slate-900/90 border border-slate-700 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md pointer-events-none">
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
                            <div className="bg-slate-900 px-4 py-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 flex-shrink-0">
                                <div className="flex items-center gap-2 truncate">
                                    <Film className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                    <span className="font-bold text-white truncate">{item.title}</span>
                                    <span className="text-[10px] text-slate-400">• {item.category || 'فيديو مهارات'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-[10px] text-slate-400 flex-shrink-0">
                                    {item.sourceType === 'r2' && (
                                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
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
                        <div className="lg:col-span-5 xl:col-span-5 flex flex-col min-h-0 bg-white border-r border-slate-200">
                            
                            {/* ── TOP SEGMENTED TAB SWITCHER (3 ELEGANT TABS) ── */}
                            <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2 flex-shrink-0">
                                <div className="grid grid-cols-3 gap-1 bg-slate-200/70 p-1 rounded-xl w-full">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('matrix')}
                                        className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            activeTab === 'matrix'
                                                ? 'bg-emerald-600 text-white shadow-xs font-black'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                        }`}
                                    >
                                        <Sliders className="w-3.5 h-3.5" />
                                        <span>مصفوفة المهارات</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('dossier')}
                                        className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer relative ${
                                            activeTab === 'dossier'
                                                ? 'bg-emerald-600 text-white shadow-xs font-black'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                        }`}
                                    >
                                        <FileText className="w-3.5 h-3.5" />
                                        <span>التقرير الكشفي</span>
                                        {aiText && (
                                            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse mr-0.5" />
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('contact')}
                                        className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            activeTab === 'contact'
                                                ? 'bg-emerald-600 text-white shadow-xs font-black'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                        }`}
                                    >
                                        <User className="w-3.5 h-3.5" />
                                        <span>التواصل والإشعار</span>
                                    </button>
                                </div>
                            </div>

                            {/* ── TAB CONTENT BODY ── */}
                            <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 bg-slate-50/50">

                                {/* ==============================================================
                                    TAB 1: MATRIX & SKILLS (مصفوفة المهارات والتقييم)
                                ============================================================== */}
                                {activeTab === 'matrix' && (
                                    <>
                                        {/* AI Quick Assistant Bar */}
                                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                                                    <Sparkles className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-black text-slate-900">مساعد الكشاف الذكي</span>
                                                        <span className="text-[10px] font-bold text-emerald-800 bg-white border border-emerald-200 px-2 py-0.5 rounded shadow-xs">
                                                            متبقي {usage.remaining} مجاناً اليوم
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-600 mt-0.5">فحص لقطات الفيديو وتوزيع درجات المهارات تلقائياً</p>
                                                </div>
                                            </div>
                                            <Button
                                                onClick={handleAnalyze}
                                                disabled={analyzing}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8.5 px-3.5 text-xs gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer flex-shrink-0"
                                            >
                                                <Sparkles className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
                                                <span>{analyzing ? 'جاري الفحص التكتيكي...' : 'تشغيل الفحص الفني ⚡'}</span>
                                            </Button>
                                        </div>

                                        {aiError && (
                                            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-800">
                                                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                                                <div className="flex-1">
                                                    <p className="font-bold">تنبيه أثناء التحليل:</p>
                                                    <p className="mt-0.5 text-rose-700">{aiError}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Executive Player Assessment Card */}
                                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                                                        {item.userImage ? (
                                                            <img src={item.userImage} alt={item.userName} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User className="w-7 h-7 text-slate-400" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-black text-slate-900 text-sm">{item.userName}</h3>
                                                        <p className="text-xs text-slate-500">{item.position || 'لاعب كرة قدم'} • {item.age ? `${item.age} سنة` : 'موهبة صاعدة'}</p>
                                                        <p className="text-[11px] text-slate-400 mt-0.5">{item.organization || item.country || 'لاعب حر'}</p>
                                                    </div>
                                                </div>

                                                {/* Score Metric Display */}
                                                <div className="flex flex-col items-center bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl">
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-2xl font-black text-emerald-600">{calculatedOverall}</span>
                                                        <span className="text-[10px] font-bold text-slate-400">/ 99</span>
                                                    </div>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border mt-1 ${tier.bgCls}`}>
                                                        {tier.label}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Dominant Foot Selection */}
                                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                                <span className="text-xs text-slate-600 font-bold">القدم المفضلة:</span>
                                                <div className="flex items-center gap-1.5">
                                                    {['يمين', 'يسار', 'كلتا القدمين'].map(f => (
                                                        <button
                                                            key={f}
                                                            type="button"
                                                            onClick={() => setDominantFoot(f)}
                                                            className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                                                dominantFoot === f
                                                                    ? 'bg-emerald-600 text-white border-emerald-600 font-black shadow-xs'
                                                                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                                                            }`}
                                                        >
                                                            {f}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Skill Sliders Grid */}
                                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                                <div className="flex items-center gap-1.5">
                                                    <Sliders className="w-4 h-4 text-emerald-600" />
                                                    <h4 className="text-xs font-black text-slate-900">مصفوفة المهارات الكروية (معايير الحلم الدولية)</h4>
                                                </div>
                                                <span className="text-[11px] text-slate-500">اسحب للضبط اليدوي</span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                {SKILL_DEFS.map(s => {
                                                    const val = skills[s.key as keyof FootballSkills];
                                                    const badgeCls = getSkillBadgeColor(val);
                                                    return (
                                                        <div key={s.key} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between">
                                                            <div className="flex items-center justify-between mb-1.5">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-xs">{s.icon}</span>
                                                                    <span className="text-xs font-bold text-slate-800">{s.label}</span>
                                                                    <span className="text-[10px] text-slate-400 font-mono">({s.short})</span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <span className={`text-xs font-mono font-black px-1.5 py-0.2 rounded border ${badgeCls}`}>
                                                                        {val}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleSkillChange(s.key as keyof FootballSkills, Math.min(99, val + 1))}
                                                                        className="w-5 h-5 text-slate-600 hover:text-slate-900 bg-slate-200/80 hover:bg-slate-300 rounded flex items-center justify-center text-xs font-black cursor-pointer"
                                                                    >
                                                                        +
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleSkillChange(s.key as keyof FootballSkills, Math.max(30, val - 1))}
                                                                        className="w-5 h-5 text-slate-600 hover:text-slate-900 bg-slate-200/80 hover:bg-slate-300 rounded flex items-center justify-center text-xs font-black cursor-pointer"
                                                                    >
                                                                        -
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <input
                                                                type="range"
                                                                min="30"
                                                                max="99"
                                                                value={val}
                                                                onChange={e => handleSkillChange(s.key as keyof FootballSkills, parseInt(e.target.value) || 50)}
                                                                className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                                                            />
                                                            <span className="text-[10px] text-slate-500 mt-1 truncate">{s.desc}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Performance Analyst Technical Recommendation & Notes */}
                                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    <Award className="w-4 h-4 text-emerald-600" />
                                                    <h4 className="text-xs font-black text-slate-900">توصيات وملاحظات الكشاف المعتمد</h4>
                                                </div>
                                                <span className="text-[11px] text-slate-500">تظهر في تقرير اللاعب والبروفايل</span>
                                            </div>
                                            <Textarea
                                                rows={3}
                                                value={analystNotes}
                                                onChange={e => setAnalystNotes(e.target.value)}
                                                placeholder="اكتب التوصيات الفنية أو الملاحظات التكتيكية التي تريد توجيهها للاعب والأندية..."
                                                className="text-xs bg-slate-50 border-slate-200 text-slate-800 leading-relaxed resize-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                            />
                                        </div>
                                    </>
                                )}

                                {/* ==============================================================
                                    TAB 2: EL7LM PRO SCOUTING DOSSIER (الملف الكشفي المعتمد)
                                ============================================================== */}
                                {activeTab === 'dossier' && (
                                    <>
                                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                                                        <FileText className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xs font-black text-slate-900">ملف الكشاف المعتمد — منصة الحلم</h3>
                                                        <p className="text-[10px] text-slate-500 font-mono">El7lm Pro Scouting Dossier</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5">
                                                    <Button
                                                        onClick={handleShareWhatsApp}
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 px-2.5 text-xs font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-1 cursor-pointer"
                                                        title="مشاركة التقرير عبر واتساب للأندية والوكلاء"
                                                    >
                                                        <Share2 className="w-3.5 h-3.5" />
                                                        <span className="hidden sm:inline">واتساب للأندية</span>
                                                    </Button>

                                                    <Button
                                                        onClick={handleCopyDossier}
                                                        size="sm"
                                                        className={`h-8 px-3 text-xs font-bold gap-1.5 transition-all cursor-pointer shadow-xs ${
                                                            copiedReport
                                                                ? 'bg-emerald-700 text-white'
                                                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                        }`}
                                                    >
                                                        {copiedReport ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                        <span>{copiedReport ? 'تم النسخ!' : 'نسخ التقرير الكشفي 📋'}</span>
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* El7lm Dossier Preview Monospace Box */}
                                            <div className="bg-slate-950 text-slate-100 border border-slate-800 rounded-xl p-4 text-xs font-mono leading-relaxed whitespace-pre-line max-h-80 overflow-y-auto select-all shadow-inner">
                                                {currentDossierText}
                                            </div>
                                        </div>

                                        {/* Tactical Strengths & Development Areas */}
                                        {(tacticalStrengths.length > 0 || developmentAreas.length > 0) && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {tacticalStrengths.length > 0 && (
                                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
                                                        <p className="text-xs font-bold text-emerald-800 mb-1.5 flex items-center gap-1">
                                                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> نقاط القوة التكتيكية:
                                                        </p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {tacticalStrengths.map((str, idx) => (
                                                                <span key={idx} className="bg-white text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs">
                                                                    {str}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {developmentAreas.length > 0 && (
                                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                                                        <p className="text-xs font-bold text-amber-800 mb-1.5 flex items-center gap-1">
                                                            <Target className="w-3.5 h-3.5 text-amber-600" /> جوانب بحاجة لتطوير:
                                                        </p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {developmentAreas.map((dev, idx) => (
                                                                <span key={idx} className="bg-white text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-md border border-amber-200 shadow-2xs">
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
                                            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-xs">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowFullAiReport(prev => !prev)}
                                                    className="w-full text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center justify-between cursor-pointer"
                                                >
                                                    <span className="flex items-center gap-1.5">
                                                        <Sparkles className="w-3.5 h-3.5" />
                                                        <span>عرض التقرير الفني المفصل المستخرج بالذكاء الاصطناعي</span>
                                                    </span>
                                                    {showFullAiReport ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                </button>
                                                {showFullAiReport && (
                                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-2 text-slate-700 leading-relaxed text-xs whitespace-pre-line max-h-56 overflow-y-auto">
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
                                        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
                                            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                                <User className="w-4 h-4 text-emerald-600" />
                                                <h4 className="text-xs font-black text-slate-900">قنوات التواصل المباشر مع اللاعب</h4>
                                            </div>

                                            <div className="bg-slate-50 rounded-xl p-3.5 space-y-2.5 text-xs border border-slate-200/80">
                                                {item.userPhone ? (
                                                    <div className="flex items-center justify-between text-slate-800">
                                                        <span className="flex items-center gap-2 font-mono">
                                                            <Phone className="w-3.5 h-3.5 text-slate-400" /> {item.userPhone}
                                                        </span>
                                                        <a
                                                            href={`https://wa.me/${item.userPhone.replace(/\D/g, '')}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1"
                                                        >
                                                            <span>مراسلة واتساب 💬</span>
                                                        </a>
                                                    </div>
                                                ) : (
                                                    <p className="text-slate-400 text-xs">لا يوجد رقم هاتف مسجل</p>
                                                )}

                                                {item.userEmail && (
                                                    <div className="flex items-center gap-2 text-slate-700">
                                                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                                                        <span className="font-mono">{item.userEmail}</span>
                                                    </div>
                                                )}

                                                <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-200/80 flex items-center justify-between">
                                                    <span>النادي / الأكاديمية:</span>
                                                    <span className="text-slate-900 font-bold">{item.organization || 'لاعب حر'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Instant Mobile Notification Box */}
                                        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
                                            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                                <MessageSquare className="w-4 h-4 text-teal-600" />
                                                <h4 className="text-xs font-black text-slate-900">إرسال إشعار فوري لهاتف اللاعب</h4>
                                            </div>
                                            <p className="text-[11px] text-slate-500">
                                                يصل الإشعار فوراً في شريط إشعارات هاتف ({item.userName}).
                                            </p>
                                            <Textarea
                                                rows={3}
                                                value={message}
                                                onChange={e => setMessage(e.target.value)}
                                                placeholder="اكتب التوجيه الفني أو التنبيه المباشر للاعب..."
                                                className="text-xs bg-slate-50 border-slate-200 text-slate-800 resize-none focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                            />
                                            <Button
                                                onClick={handleSendMessage}
                                                disabled={sendingMsg || !message.trim()}
                                                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold h-9 text-xs gap-2 cursor-pointer shadow-xs"
                                            >
                                                <Send className={`w-3.5 h-3.5 ${sendingMsg ? 'animate-spin' : ''}`} />
                                                <span>{sendingMsg ? 'جاري الإرسال...' : 'إرسال الإشعار لهاتف اللاعب'}</span>
                                            </Button>
                                        </div>

                                        {/* Danger Zone: Delete Video */}
                                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-bold text-rose-900">حذف هذا الفيديو</p>
                                                <p className="text-[11px] text-rose-700">إزالة ملف الفيديو والبيانات المرتبطة به نهائياً من المنصة</p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleDelete}
                                                disabled={deleting}
                                                className="border border-rose-300 text-rose-700 hover:bg-rose-100 text-xs font-bold h-8.5 cursor-pointer"
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
                            <div className="border-t border-slate-200 bg-white px-4 py-3.5 space-y-2 flex-shrink-0 z-20 shadow-lg">
                                {/* Primary Approval Button */}
                                <Button
                                    onClick={handleApproveAndSync}
                                    disabled={syncing}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black h-11 text-sm gap-2 shadow-sm shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer"
                                >
                                    <ShieldCheck className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
                                    <span>
                                        {syncing ? 'جاري الاعتماد وتحديث كارت اللاعب...' : `🌟 اعتماد ومزامنة تقييم اللاعب (${calculatedOverall} OVR)`}
                                    </span>
                                </Button>

                                {/* Secondary Decision Actions & Quick Nav */}
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleQuickStatus('flagged')}
                                        disabled={updating}
                                        className="gap-1.5 text-xs font-bold border-amber-300 text-amber-800 bg-amber-50/50 hover:bg-amber-100/60 h-8.5 cursor-pointer"
                                    >
                                        <Flag className="w-3.5 h-3.5 text-amber-600" />
                                        <span>تنبيه / طلب إعادة</span>
                                    </Button>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleQuickStatus('rejected')}
                                        disabled={updating}
                                        className="gap-1.5 text-xs font-bold border-rose-300 text-rose-800 bg-rose-50/50 hover:bg-rose-100/60 h-8.5 cursor-pointer"
                                    >
                                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
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
