'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MediaItem, FootballSkills, detectMediaSource, DetectedSource } from '../types';
import {
    X, CheckCircle, XCircle, Flag, Sparkles, RefreshCw,
    Phone, Mail, ExternalLink, Activity, Sliders, ShieldCheck,
    Target, Award, Play, Pause, FastForward, Rewind, Maximize2,
    Minimize2, ZoomIn, ZoomOut, Volume2, VolumeX, ChevronRight,
    ChevronLeft, ChevronDown, ChevronUp, MessageSquare, Info,
    Trash2, AlertCircle, Send, User, Film, Copy, Check, Share2,
    Gauge, FileText, CheckCheck, Cloud, PlaySquare, Music2, Globe
} from 'lucide-react';
import { toast } from 'sonner';
import { authenticatedFetch } from '@/lib/api/authenticated-fetch';
import { MediaAvatar } from './MediaAvatar';

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

/** تحديد هل المركز هو حراسة مرمى */
function checkIsGoalkeeper(position?: string): boolean {
    const p = (position || '').toLowerCase();
    return p.includes('حارس') || p.includes('gk') || p.includes('keeper') || p.includes('مرمى');
}

/** مصفوفة المهارات المخصصة للمركز (حارس مرمى vs لاعب ميدان) */
function getSkillDefinitions(isGK: boolean): { key: keyof FootballSkills; label: string; short: string; icon: string; desc: string }[] {
    if (isGK) {
        return [
            { key: 'pace',      label: 'الارتماء والتصدي المباشر', short: 'DIV', icon: '🧤', desc: 'التصدي للتسديدات وزوايا المرمى الصعبة' },
            { key: 'shooting',  label: 'الإمساك والتعامل مع الكرة', short: 'HAN', icon: '🤲', desc: 'الإمساك ومنع الارتداد والتقاط العرضيات' },
            { key: 'passing',   label: 'التوزيع وبناء اللعب بالقدم', short: 'KIC', icon: '🎯', desc: 'دقة ركل وتوزيع الكرات الطويلة والقصيرة' },
            { key: 'dribbling', label: 'سرعة ردود الفعل الخاطفة', short: 'REF', icon: '⚡', desc: 'الاستجابة الفورية في الانفرادات والتسديد القريب' },
            { key: 'defending', label: 'الخروج والتغطية كحارس قشاش', short: 'SPD', icon: '🏃', desc: 'توقيت الخروج لقطع الانفرادات وخارج الصندوق' },
            { key: 'physical',  label: 'التمركز وتوجيه خط الدفاع', short: 'POS', icon: '🛡️', desc: 'حسن التمركز بين القائمين والقيادة للمدافعين' },
        ];
    }

    return [
        { key: 'pace',      label: 'السرعة والتسارع والانطلاق', short: 'PAC', icon: '⚡', desc: 'الانطلاق وسرعة الجري بالكرة في المساحات' },
        { key: 'shooting',  label: 'التسديد وإنهاء الهجمات',    short: 'SHO', icon: '⚽', desc: 'قوة ودقة إنهاء الكرات في الشباك' },
        { key: 'passing',   label: 'التمرير وصناعة اللعب',      short: 'PAS', icon: '🎯', desc: 'دقة التمرير وصناعة الفرص وكسر الخطوط' },
        { key: 'dribbling', label: 'المراوغة والتحكم بالكرة',   short: 'DRI', icon: '👟', desc: 'الرشاقة وحفظ الكرة وتجاوز المنافسين' },
        { key: 'defending', label: 'التمركز والواجب الدفاعي',   short: 'DEF', icon: '🛡️', desc: 'التمركز السليم وافتكاك الكرة والضغط' },
        { key: 'physical',  label: 'القوة البدنية والالتحامات',  short: 'PHY', icon: '💪', desc: 'الصراعات البدنية والارتقاء والتحمل' },
    ];
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
    const isGK = checkIsGoalkeeper(item.position);

    const strengthsText = strengths.length > 0
        ? strengths.map((s, i) => `${i + 1}. ${s}`).join('\n')
        : isGK
            ? '1. سرعة رد الفعل والتصدي في المواقف الفردية (1v1)\n2. التمركز السليم بين القائمين وحماية زوايا المرمى'
            : '1. التحكم الإيجابي بالكرة والسرعة في تغيير الاتجاه\n2. الرؤية الميدانية والتحرك الواعي في المساحات';

    const areasText = areas.length > 0
        ? areas.map((d, i) => `${i + 1}. ${d}`).join('\n')
        : isGK
            ? '1. دقة التمرير بالقدمين تحت الضغط لبناء الهجمة من الخلف\n2. زيادة التواصل الصوتي المستمر مع قلبي الدفاع'
            : '1. رفع الكثافة البدنية في الالتحامات القوية\n2. دقة إنهاء الكرات تحت الضغط العالي';

    const matrixSection = isGK
        ? `📊 مصفوفة الحلم لحراسة المرمى (El7lm Goalkeeper Performance Matrix):
🧤 الارتماء والتصدي المباشر (DIV): ${skills.pace}/100
🤲 الإمساك والتعامل مع الكرة (HAN): ${skills.shooting}/100
🎯 التوزيع وبناء اللعب بالقدم (KIC): ${skills.passing}/100
⚡ سرعة ردود الفعل الخاطفة (REF): ${skills.dribbling}/100
🏃 الخروج والتغطية كحارس قشاش (SPD): ${skills.defending}/100
🛡️ التمركز وتوجيه خط الدفاع (POS): ${skills.physical}/100`
        : `📊 مصفوفة الحلم للأداء الكروي (El7lm Performance Matrix):
⚡ السرعة والتسارع والانطلاق (PAC): ${skills.pace}/100
⚽ التسديد وإنهاء الهجمات (SHO): ${skills.shooting}/100
🎯 التمرير وصناعة اللعب (PAS): ${skills.passing}/100
👟 المراوغة والتحكم بالكرة (DRI): ${skills.dribbling}/100
🛡️ التمركز والواجب الدفاعي (DEF): ${skills.defending}/100
💪 القوة البدنية والالتحامات (PHY): ${skills.physical}/100`;

    const defaultRecommendation = isGK
        ? 'حارس مرمى واعد يمتلك ردود أفعال رشيقة وشجاعة في المواجهات المباشرة. يُوصى بالتركيز على تدريبات بناء اللعب بالقدمين لتطويره إلى حارس قشاش عصري.'
        : 'لاعب واعد يمتلك أساسيات فنية ممتازة تؤهله للاندماج السريع في التمارين التكتيكية التخصصية للأندية المحترفة.';

    const defaultAnalysis = isGK
        ? `التقرير الفني التكتيكي (تحليل حراسة المرمى):
أظهر الحارس ثباتاً انفعالياً مميزاً وسرعة استجابة عالية في الذود عن مرماه، مع قدرة لافتة على تقدير مسار الكرات العرضية وسرعة العودة لخط المرمى.
يتميز الحارس بالمرونة والتوازن الحركي أثناء الارتقاء، ويحتاج إلى مواصلة العمل على توقيت الخروج خارج منطقة الجزاء والتعامل بالقدمين.`
        : `التقرير الفني التكتيكي:
أظهر اللاعب مستوى واعداً في التحكم بالكرة والمرونة الحركية، مع قدرة واضحة على قراءة مجريات اللعب والتفاعل الإيجابي مع زملائه في الملعب.
يوصى بتكثيف الحصص التدريبية لرفع اللياقة البدنية والسرعة التكتيكية.`;

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
${matrixSection}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⭐ أبرز نقاط القوة التكتيكية (Key Strengths):
${strengthsText}

🎯 جوانب التطوير المستهدفة (Areas for Development):
${areasText}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 التقييم الفني والتوصية الكشفية (Scout Recommendation):
${notes.trim() || defaultRecommendation}

📝 التقرير التحليلي للأداء:
${analysisText.trim() || defaultAnalysis}
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
    totalCount = 0,
}: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);

    // ── Tab Management ──
    const [activeTab, setActiveTab] = useState<'matrix' | 'dossier' | 'contact'>('matrix');

    // ── Video HUD & Cinema State ──
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [isMuted, setIsMuted] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // ── Football Skills State (0-100 scale) ──
    const [skills, setSkills] = useState<FootballSkills>({
        pace: 75,
        shooting: 70,
        passing: 72,
        dribbling: 78,
        defending: 65,
        physical: 74,
    });
    const [dominantFoot, setDominantFoot] = useState<string>('يمين');
    const [tacticalStrengths, setTacticalStrengths] = useState<string[]>([]);
    const [developmentAreas, setDevelopmentAreas] = useState<string[]>([]);
    const [analystNotes, setAnalystNotes] = useState('');
    const [aiText, setAiText] = useState('');

    // ── Action States ──
    const [analyzing, setAnalyzing] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [copiedReport, setCopiedReport] = useState(false);
    const [showRawDossier, setShowRawDossier] = useState(false);

    // ── AI Usage Tracker ──
    const [usage, setUsage] = useState<{ used: number; total: number; remaining: number }>({
        used: 14, total: 1500, remaining: 1486,
    });

    // ── Direct Notification ──
    const [message, setMessage] = useState('');
    const [sendingMsg, setSendingMsg] = useState(false);

    // هل اللاعب حارس مرمى؟
    const isGK = useMemo(() => checkIsGoalkeeper(item?.position), [item?.position]);
    const skillDefs = useMemo(() => getSkillDefinitions(isGK), [isGK]);

    // Detect media source
    const detectedSource = useMemo(() => {
        if (!item) return 'external';
        return detectMediaSource(item);
    }, [item]);

    // Calculate OVR dynamically
    const calculatedOverall = useMemo(() => {
        if (isGK) {
            // حارس المرمى: وزن أعلى للتصدي والانعكاس والتمركز
            const avg = Math.round(
                (skills.pace * 0.22) +      // DIV
                (skills.shooting * 0.20) +  // HAN
                (skills.passing * 0.14) +   // KIC
                (skills.dribbling * 0.22) + // REF
                (skills.defending * 0.10) + // SPD
                (skills.physical * 0.12)    // POS
            );
            return Math.min(99, Math.max(40, avg));
        }

        const avg = Math.round(
            (skills.pace * 0.20) +
            (skills.shooting * 0.18) +
            (skills.passing * 0.20) +
            (skills.dribbling * 0.20) +
            (skills.defending * 0.10) +
            (skills.physical * 0.12)
        );
        return Math.min(99, Math.max(40, avg));
    }, [skills, isGK]);

    // Sync state on item change
    useEffect(() => {
        if (item) {
            const playerIsGk = checkIsGoalkeeper(item.position);
            setSkills(item.skills || (playerIsGk ? {
                pace: 82,      // DIV
                shooting: 78,  // HAN
                passing: 74,   // KIC
                dribbling: 85, // REF
                defending: 72, // SPD
                physical: 80,  // POS
            } : {
                pace: 75,
                shooting: 70,
                passing: 72,
                dribbling: 78,
                defending: 65,
                physical: 74,
            }));
            setDominantFoot(item.dominantFoot || 'يمين');
            setTacticalStrengths(item.tacticalStrengths || []);
            setDevelopmentAreas(item.developmentAreas || []);
            setAnalystNotes(item.notes || item.scoutRecommendation || '');
            setAiText(item.aiAnalysis || '');
            setAiError(null);
            setIsPlaying(false);
            setCurrentTime(0);
            setPlaybackRate(1.0);
            setZoomLevel(1);
            setConfirmDelete(false);
            setCopiedReport(false);
            setShowRawDossier(false);
        }
    }, [item]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!item) return;
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

            if (e.key === 'Escape') onClose();
            if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                togglePlay();
            }
            if (e.key === 'k' || e.key === 'K') {
                if (hasNext && onNext) onNext();
            }
            if (e.key === 'j' || e.key === 'J') {
                if (hasPrev && onPrev) onPrev();
            }
            if (e.key === 'f' || e.key === 'F') {
                setIsFullscreen(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [item, hasNext, hasPrev, onNext, onPrev, onClose]);

    // Video Control Handlers
    const togglePlay = () => {
        if (!videoRef.current) return;
        if (videoRef.current.paused) {
            videoRef.current.play().catch(() => {});
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    const handleSeek = (time: number) => {
        if (!videoRef.current) return;
        videoRef.current.currentTime = Math.max(0, Math.min(time, duration));
        setCurrentTime(videoRef.current.currentTime);
    };

    const handleStepFrame = (frames: number) => {
        if (!videoRef.current) return;
        videoRef.current.pause();
        setIsPlaying(false);
        videoRef.current.currentTime += frames * (1 / 30);
    };

    const handleSpeedChange = (rate: number) => {
        setPlaybackRate(rate);
        if (videoRef.current) videoRef.current.playbackRate = rate;
    };

    const toggleMute = () => {
        if (!videoRef.current) return;
        videoRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    const toggleZoom = () => {
        setZoomLevel(prev => (prev === 1 ? 1.5 : prev === 1.5 ? 2.0 : 1));
    };

    const handleSkillChange = (key: keyof FootballSkills, val: number) => {
        setSkills(prev => ({ ...prev, [key]: Math.min(99, Math.max(30, val)) }));
    };

    const handleCopyDossier = () => {
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
        navigator.clipboard.writeText(text);
        setCopiedReport(true);
        toast.success('تم نسخ التقرير الكشفي المعتمد بنجاح!');
        setTimeout(() => setCopiedReport(false), 3000);
    };

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
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    // ── AI Video Performance Analysis ──
    const handleAnalyze = async () => {
        if (!item) return;
        setAnalyzing(true);
        setAiError(null);

        try {
            toast.info(`جاري فحص لقطات اللاعب (${item.userName}) واستخراج التقييم الكشفي المتخصص...`);

            let frames: string[] = [];
            const isStoredVideo = detectedSource === 'direct';

            if (isStoredVideo) {
                try {
                    frames = await captureFrames(item.url);
                } catch {
                    frames = [];
                }
            }

            const res = await authenticatedFetch('/api/media/analyze-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    r2Key: item.r2Key,
                    videoUrl: item.url,
                    url: item.url,
                    title: item.title,
                    description: item.description,
                    playerPosition: item.position,
                    position: item.position,
                    playerAge: item.age,
                    age: item.age,
                    playerName: item.userName,
                    userName: item.userName,
                    playerCountry: item.country,
                    country: item.country,
                    frameUrls: frames.length > 0 ? frames : undefined,
                    frames: frames.length > 0 ? frames : undefined,
                    category: item.category,
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'فشل التحليل');
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
            if (data.scoutRecommendation) {
                setAnalystNotes(data.scoutRecommendation);
            }

            onAIResult(item.id, data.analysis, data.rating);
            toast.success(`اكتمل التحليل الكروي لمركز (${item.position || 'اللاعب'}) وتم تحديث التقرير الكشفي بنجاح!`);

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
                {/* Backdrop */}
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200" />
                
                {/* Executive Container */}
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
                                <MediaAvatar src={item.userImage} alt={item.userName} size="lg" />
                                <span className="absolute -bottom-1 -right-1 bg-emerald-600 border border-white text-[10px] font-black text-white px-1.5 py-0.2 rounded-full shadow-xs">
                                    {calculatedOverall}
                                </span>
                            </div>

                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="font-black text-slate-900 text-sm md:text-base truncate">{item.userName}</h2>
                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${STATUS_COLOR[item.status]}`}>
                                        {STATUS_LABEL[item.status]}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border bg-slate-100 text-slate-800 border-slate-200">
                                        {isGK ? '🧤 حارس مرمى' : (item.position || 'لاعب كرة قدم')}
                                    </span>

                                    {/* Video Source Tag in Header */}
                                    {detectedSource === 'youtube' && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200">
                                            <PlaySquare className="w-3 h-3 text-red-600" /> فيديو YouTube
                                        </span>
                                    )}
                                    {detectedSource === 'direct' && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            <Cloud className="w-3 h-3 text-emerald-600" /> رفع سحابي مباشر
                                        </span>
                                    )}
                                    {detectedSource === 'tiktok' && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-300">
                                            <Music2 className="w-3 h-3 text-slate-800" /> فيديو TikTok
                                        </span>
                                    )}
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
                                        if (detectedSource === 'direct') {
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

                                        if (detectedSource === 'youtube') {
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
                                                    <PlaySquare className="w-12 h-12 text-red-500" />
                                                    <a href={item.url} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline text-sm font-bold">
                                                        فتح الفيديو في منصة YouTube ↗
                                                    </a>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                                                <Globe className="w-12 h-12 text-sky-400" />
                                                <p className="text-white/80 text-sm font-semibold">فيديو عبر رابط خارجي</p>
                                                <a
                                                    href={item.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow"
                                                >
                                                    مشاهدة الرابط الأصلي <ExternalLink className="w-3.5 h-3.5" />
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

                            {/* ── SCOUT HUD CONTROLS BAR (Only For Direct Stored Videos) ── */}
                            {item.type === 'video' && detectedSource === 'direct' && (
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
                            <div className="bg-slate-900 px-4 py-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 flex-shrink-0">
                                <div className="flex items-center gap-2 truncate">
                                    <Film className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                    <span className="font-bold text-white truncate">{item.title}</span>
                                    <span className="text-[10px] text-slate-400">• {item.category || 'فيديو مهارات'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-[10px] text-slate-400 flex-shrink-0">
                                    {detectedSource === 'direct' && (
                                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                                            ☁️ رفع سحابي مباشر
                                        </span>
                                    )}
                                    {detectedSource === 'youtube' && (
                                        <span className="bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded font-bold">
                                            🔴 فيديو عبر رابط خارجي (YouTube)
                                        </span>
                                    )}
                                    {detectedSource === 'tiktok' && (
                                        <span className="bg-slate-800 text-slate-200 border border-slate-700 px-2 py-0.5 rounded font-bold">
                                            🖤 فيديو عبر رابط خارجي (TikTok)
                                        </span>
                                    )}
                                    {item.fileSize && item.fileSize > 0 && (
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
                            
                            {/* ── TOP SEGMENTED TAB SWITCHER ── */}
                            <div className="p-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-2 flex-shrink-0">
                                <div className="grid grid-cols-3 gap-1 bg-slate-200/80 p-1 rounded-xl w-full">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('matrix')}
                                        className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            activeTab === 'matrix'
                                                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                                        }`}
                                    >
                                        <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>{isGK ? 'مصفوفة الحراسة' : 'مصفوفة المهارات'}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('dossier')}
                                        className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer relative ${
                                            activeTab === 'dossier'
                                                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                                        }`}
                                    >
                                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                                        <span>التقرير الكشفي</span>
                                        {aiText && (
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-0.5" />
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('contact')}
                                        className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            activeTab === 'contact'
                                                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                                        }`}
                                    >
                                        <User className="w-3.5 h-3.5 text-sky-600" />
                                        <span>التواصل والإشعار</span>
                                    </button>
                                </div>
                            </div>

                            {/* ── TAB CONTENT BODY ── */}
                            <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 bg-slate-50/60">

                                {/* ==============================================================
                                    TAB 1: MATRIX & SKILLS (مصفوفة المهارات والتقييم)
                                ============================================================== */}
                                {activeTab === 'matrix' && (
                                    <>
                                        {/* AI Quick Assistant Bar */}
                                        <div className="bg-white border border-emerald-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center flex-shrink-0 shadow-xs">
                                                    <Sparkles className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-xs font-black text-slate-900">
                                                            {detectedSource === 'direct'
                                                                ? 'مساعد الكشاف — فحص اللقطات المباشرة (Computer Vision)'
                                                                : detectedSource === 'youtube'
                                                                    ? 'مساعد الكشاف — فحص لقطات YouTube 🔴'
                                                                    : 'مساعد الكشاف — التقييم التكتيكي التخصصي 🌐'}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded shadow-2xs">
                                                            {isGK ? 'تحليل حراسة المرمى 🧤' : 'تحليل الأداء الرياضي ⚽'}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-600 mt-0.5">
                                                        {detectedSource === 'direct'
                                                            ? `فيديو مرفوع سحابياً • استخراج الإطارات الحركية لمركز (${item.position || 'اللاعب'}) وتوزيع المهارات`
                                                            : detectedSource === 'youtube'
                                                                ? `رابط YouTube • استخراج اللقطات الزمنية من الفيديو وتوليد تقرير كشفي لمركز (${item.position || 'اللاعب'})`
                                                                : `رابط خارجي • تطبيق معايير الكشافة الفنية المتخصصة لمركز (${item.position || 'اللاعب'})`}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                onClick={handleAnalyze}
                                                disabled={analyzing}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8.5 px-3.5 text-xs gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer flex-shrink-0"
                                            >
                                                <Sparkles className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
                                                <span>
                                                    {analyzing
                                                        ? 'جاري الفحص التكتيكي...'
                                                        : detectedSource === 'direct'
                                                            ? 'تشغيل الفحص البصري التكتيكي ⚡'
                                                            : detectedSource === 'youtube'
                                                                ? 'تحليل لقطات YouTube ⚡'
                                                                : 'تطبيق التقييم المقترح 📋'}
                                                </span>
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
                                                    <MediaAvatar src={item.userImage} alt={item.userName} size="xl" />
                                                    <div>
                                                        <h3 className="font-black text-slate-900 text-sm">{item.userName}</h3>
                                                        <p className="text-xs text-slate-500 font-bold">{isGK ? '🧤 حارس مرمى' : (item.position || 'لاعب كرة قدم')} • {item.age ? `${item.age} سنة` : 'موهبة صاعدة'}</p>
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

                                        {/* Skill Sliders Grid (Goalkeeper Aware) */}
                                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                                <div className="flex items-center gap-1.5">
                                                    <Sliders className="w-4 h-4 text-emerald-600" />
                                                    <h4 className="text-xs font-black text-slate-900">
                                                        {isGK ? 'مصفوفة حراسة المرمى الدولية (GK Core Matrix)' : 'مصفوفة المهارات الكروية (معايير الحلم الدولية)'}
                                                    </h4>
                                                </div>
                                                <span className="text-[11px] text-slate-500">اسحب للضبط اليدوي</span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                {skillDefs.map(s => {
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
                                                placeholder={isGK ? "اكتب التوصيات التكتيكية لمركز حراسة المرمى (التمركز، ردود الفعل، توجيه الدفاع)..." : "اكتب التوصيات الفنية أو الملاحظات التكتيكية التي تريد توجيهها للاعب والأندية..."}
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
                                        {/* Dossier Header Bar */}
                                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between gap-3 flex-wrap">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shadow-xs">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-black text-slate-900">ملف الكشاف المعتمد — منصة الحلم</h3>
                                                    <p className="text-[10px] text-slate-500 font-mono">El7lm Pro Scouting Dossier</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Button
                                                    onClick={handleShareWhatsApp}
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 px-2.5 text-xs font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-1.5 cursor-pointer"
                                                    title="مشاركة التقرير عبر واتساب للأندية والوكلاء"
                                                >
                                                    <Share2 className="w-3.5 h-3.5" />
                                                    <span>واتساب للأندية</span>
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

                                        {/* Executive White Dossier Sheet */}
                                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                                            {/* Sheet Header */}
                                            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-base font-black text-slate-900">📋 بطاقة التقييم الكشفي الرسمي</span>
                                                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                        {isGK ? 'تحليل حراسة مرمى معتمد' : 'معتمد رسمياً'}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowRawDossier(prev => !prev)}
                                                    className="text-xs text-slate-500 hover:text-slate-800 font-bold underline cursor-pointer"
                                                >
                                                    {showRawDossier ? 'عرض النموذج المنسق' : 'عرض كود التقرير المباشر'}
                                                </button>
                                            </div>

                                            {showRawDossier ? (
                                                <div className="bg-slate-50 text-slate-800 border border-slate-200 rounded-xl p-4 text-xs font-mono leading-relaxed whitespace-pre-line max-h-80 overflow-y-auto select-all">
                                                    {currentDossierText}
                                                </div>
                                            ) : (
                                                <div className="space-y-4 text-xs">
                                                    {/* Player Dossier Bio Summary */}
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                                                        <div>
                                                            <span className="text-[10px] text-slate-400 block">اسم اللاعب</span>
                                                            <span className="font-black text-slate-900">{item.userName}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] text-slate-400 block">المركز التكتيكي</span>
                                                            <span className="font-bold text-slate-800">{isGK ? '🧤 حارس مرمى' : (item.position || 'لاعب كرة قدم')}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] text-slate-400 block">العمر والدولة</span>
                                                            <span className="font-bold text-slate-800">{item.age ? `${item.age} سنة` : 'موهبة صاعدة'} • {item.country || 'مصر'}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] text-slate-400 block">النادي / الأكاديمية</span>
                                                            <span className="font-bold text-slate-800">{item.organization || 'لاعب حر'}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] text-slate-400 block">القدم المفضلة</span>
                                                            <span className="font-bold text-emerald-700">{dominantFoot}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] text-slate-400 block">التقييم العام</span>
                                                            <span className="font-black text-emerald-700">{calculatedOverall} OVR ({tier.label})</span>
                                                        </div>
                                                    </div>

                                                    {/* Skills Performance Badges */}
                                                    <div className="space-y-1.5">
                                                        <span className="text-xs font-black text-slate-800 block">
                                                            {isGK ? 'مصفوفة الحراسة (El7lm GK Matrix):' : 'مصفوفة الأداء الكروي (معايير الحلم الدولية):'}
                                                        </span>
                                                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                                            {skillDefs.map(s => {
                                                                const val = skills[s.key as keyof FootballSkills];
                                                                const badgeCls = getSkillBadgeColor(val);
                                                                return (
                                                                    <div key={s.key} className="bg-slate-50 border border-slate-200/80 p-2 rounded-xl text-center">
                                                                        <span className="text-[10px] text-slate-500 font-bold block">{s.short}</span>
                                                                        <span className={`text-sm font-black font-mono block mt-0.5 rounded px-1 py-0.5 border ${badgeCls}`}>
                                                                            {val}
                                                                        </span>
                                                                        <span className="text-[9px] text-slate-400 block mt-0.5 truncate">{s.label.split(' ')[0]}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Strengths & Development Areas */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                                        <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3">
                                                            <p className="text-xs font-bold text-emerald-800 mb-1 flex items-center gap-1">
                                                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> نقاط القوة التكتيكية للمركز:
                                                            </p>
                                                            <div className="space-y-1">
                                                                {(tacticalStrengths.length > 0 ? tacticalStrengths : (
                                                                    isGK
                                                                        ? ['سرعة رد الفعل والتصدي في المواقف الفردية (1v1)', 'التمركز السليم بين القائمين']
                                                                        : ['التحكم الإيجابي بالكرة والسرعة في تغيير الاتجاه', 'الرؤية الميدانية والتحرك في المساحات']
                                                                )).map((str, idx) => (
                                                                    <p key={idx} className="text-[11px] text-emerald-950 font-medium leading-tight">
                                                                        • {str}
                                                                    </p>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3">
                                                            <p className="text-xs font-bold text-amber-800 mb-1 flex items-center gap-1">
                                                                <Target className="w-3.5 h-3.5 text-amber-600" /> جوانب التطوير المستهدفة:
                                                            </p>
                                                            <div className="space-y-1">
                                                                {(developmentAreas.length > 0 ? developmentAreas : (
                                                                    isGK
                                                                        ? ['دقة التوزيع بالقدمين تحت الضغط لبناء الهجمة من الخلف', 'توجيه المدافعين والتواصل الصوتي']
                                                                        : ['رفع الكثافة البدنية في الالتحامات', 'دقة إنهاء الكرات تحت الضغط العالي']
                                                                )).map((dev, idx) => (
                                                                    <p key={idx} className="text-[11px] text-amber-950 font-medium leading-tight">
                                                                        • {dev}
                                                                    </p>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Scout Recommendation Box */}
                                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                                                        <span className="text-xs font-bold text-slate-800 block">التوصية الفنية للكشاف:</span>
                                                        <p className="text-xs text-slate-700 leading-relaxed">
                                                            {analystNotes.trim() || (isGK
                                                                ? 'حارس مرمى واعد يمتلك ردود أفعال رشيقة وشجاعة في المواجهات المباشرة. يُوصى بالتركيز على تدريبات بناء اللعب بالقدمين لتطويره إلى حارس قشاش عصري.'
                                                                : 'لاعب واعد يمتلك أساسيات فنية ممتازة تؤهله للاندماج السريع في التمارين التكتيكية التخصصية للأندية المحترفة.'
                                                            )}
                                                        </p>
                                                    </div>

                                                    {/* AI Full Report Collapsible */}
                                                    {aiText && (
                                                        <div className="border border-slate-200 rounded-xl p-3 bg-white">
                                                            <span className="text-xs font-bold text-emerald-700 block mb-1">التقرير التحليلي المستخرج:</span>
                                                            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line max-h-40 overflow-y-auto">
                                                                {aiText}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
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
                                STICKY STUDIO ACTION FOOTER (ALWAYS VISIBLE)
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
