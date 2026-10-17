'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { MediaItem, FootballSkills } from '../types';
import {
    X, CheckCircle, XCircle, Flag, BrainCircuit, MessageSquare,
    Info, User, Phone, Mail, MapPin, Star, Sparkles, RefreshCw,
    Copy, AlertCircle, Send, Trash2, ExternalLink, Activity,
    Sliders, ShieldCheck, ArrowRight, Zap, Target, Gauge, Award
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
}

type Tab = 'scout' | 'info' | 'message';

const STATUS_COLOR: Record<string, string> = {
    pending:  'bg-amber-100 text-amber-800 border-amber-200',
    approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    rejected: 'bg-rose-100 text-rose-800 border-rose-200',
    flagged:  'bg-orange-100 text-orange-800 border-orange-200',
};

const STATUS_LABEL: Record<string, string> = {
    pending: 'بانتظار التحليل', approved: 'معتمد ومزامَن', rejected: 'مرفوض', flagged: 'تنبيه'
};

// حساب لون شريط المهارة بحسب الدرجة
function getSkillColor(val: number) {
    if (val >= 85) return 'from-emerald-500 to-teal-500 text-emerald-700 bg-emerald-50';
    if (val >= 75) return 'from-teal-500 to-indigo-500 text-teal-700 bg-teal-50';
    if (val >= 65) return 'from-amber-500 to-yellow-500 text-amber-700 bg-amber-50';
    return 'from-rose-500 to-orange-500 text-rose-700 bg-rose-50';
}

function getScoreTier(ovr: number) {
    if (ovr >= 85) return { label: 'نخبة ELITE', bg: 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black' };
    if (ovr >= 75) return { label: 'محترف PRO', bg: 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold' };
    if (ovr >= 65) return { label: 'واعد PROMISING', bg: 'bg-gradient-to-r from-blue-600 to-indigo-500 text-white font-bold' };
    return { label: 'تحت التطوير', bg: 'bg-slate-700 text-white font-medium' };
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
            canvas.width = 640; canvas.height = 360;
            const ctx = canvas.getContext('2d')!;
            const frames: string[] = [];
            let i = 0;

            const next = () => { if (i >= times.length) { resolve(frames); return; } video.currentTime = times[i]; };
            video.addEventListener('seeked', () => {
                ctx.drawImage(video, 0, 0, 640, 360);
                frames.push(canvas.toDataURL('image/jpeg', 0.7));
                i++; next();
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
    userId
}: Props) {
    const [tab, setTab] = useState<Tab>('scout');
    const [updating, setUpdating] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    // Direct Message state
    const [message, setMessage] = useState('');
    const [sendingMsg, setSendingMsg] = useState(false);

    // AI state
    const [analyzing, setAnalyzing] = useState(false);
    const [aiText, setAiText] = useState<string | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);

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

    // Reset state upon item change
    useEffect(() => {
        setTab('scout');
        setMessage('');
        setAiError(null);
        setConfirmDelete(false);

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

            const res = await fetch('/api/media/analyze-video', {
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
            toast.success('اكتمل التحليل الكروي الذكي وتم ملء درجات المهارات!');

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
        if (!confirmDelete) { setConfirmDelete(true); return; }
        setDeleting(true);
        try {
            await onDelete(item);
            toast.success('تم حذف العنصر');
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
            toast.success(`تم إرسال الإشعار إلى ${item.userName}`);
            setMessage('');
        } catch (e: any) {
            toast.error('فشل إرسال الرسالة: ' + e.message);
        } finally {
            setSendingMsg(false);
        }
    };

    if (!item) return null;

    const tier = getScoreTier(calculatedOverall);

    return (
        <Sheet open={!!item} onOpenChange={open => !open && onClose()}>
            <SheetContent
                side="left"
                className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col bg-slate-50 border-r border-slate-200 gap-0 shadow-2xl"
                dir="rtl"
            >
                <SheetTitle className="sr-only">{item.title}</SheetTitle>
                <SheetDescription className="sr-only">استوديو تحليل أداء اللاعب</SheetDescription>

                {/* ── Top Bar: Player Header ───────────────────────── */}
                <div className="bg-white px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 flex-shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-emerald-500 p-0.5 shadow-sm flex-shrink-0">
                            {item.userImage ? (
                                <img src={item.userImage} alt={item.userName} className="w-full h-full rounded-full object-cover bg-white" />
                            ) : (
                                <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-700 text-sm">
                                    {item.userName.charAt(0) || 'ل'}
                                </div>
                            )}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h2 className="font-black text-slate-900 text-sm truncate">{item.userName}</h2>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${STATUS_COLOR[item.status]}`}>
                                    {STATUS_LABEL[item.status]}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 truncate">
                                <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded">
                                    {item.position || 'لاعب'}
                                </span>
                                {item.age && <span>• {item.age} سنة</span>}
                                {item.country && <span>• {item.country}</span>}
                                {item.organization && <span>• {item.organization}</span>}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        <a
                            href={`/profile/${item.userId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">البروفايل</span>
                        </a>
                        <Button variant="ghost" size="icon" onClick={onClose} className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700">
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* ── Media Player ───────────────────────── */}
                <div className="relative bg-black aspect-video flex-shrink-0 shadow-inner">
                    {item.type === 'video' ? (
                        (() => {
                            const isStoredVideo = item.sourceType === 'r2'
                                || item.url.includes('supabase.co/storage')
                                || item.url.includes('assets.el7lm.com')
                                || /\.(mp4|mov|webm|avi|mkv)(\?|$)/i.test(item.url);
                            const isExternalPlatform = item.url.includes('youtu') || item.url.includes('tiktok')
                                || item.url.includes('vimeo') || item.url.includes('instagram');

                            if (isStoredVideo) {
                                return (
                                    <video
                                        src={item.url}
                                        controls
                                        playsInline
                                        preload="metadata"
                                        className="w-full h-full object-contain"
                                    />
                                );
                            }

                            if (item.url.includes('youtu')) {
                                const ytMatch = item.url.match(/(?:youtu\.be\/|watch\?v=|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
                                const ytId = ytMatch ? ytMatch[1] : null;
                                return ytId ? (
                                    <iframe
                                        src={`https://www.youtube.com/embed/${ytId}?autoplay=0&rel=0`}
                                        className="w-full h-full border-0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 text-center">
                                        <ExternalLink className="w-8 h-8 text-white/50" />
                                        <a href={item.url} target="_blank" rel="noreferrer" className="text-white text-xs underline font-bold">
                                            فتح الفيديو في يوتيوب
                                        </a>
                                    </div>
                                );
                            }

                            return (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-4 text-center">
                                    <ExternalLink className="w-8 h-8 text-white/60" />
                                    <p className="text-white/80 text-xs font-semibold">فيديو من منصة خارجية ({item.url.split('/')[2]})</p>
                                    <a
                                        href={item.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 bg-white text-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold shadow hover:bg-slate-100"
                                    >
                                        تشغيل الفيديو خارجياً <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                </div>
                            );
                        })()
                    ) : (
                        <img
                            src={item.url}
                            alt={item.title}
                            className="w-full h-full object-contain"
                        />
                    )}
                </div>

                {/* ── Studio Navigation Tabs ───────────────────────── */}
                <div className="flex border-b border-slate-200 bg-white flex-shrink-0 px-3">
                    {[
                        { id: 'scout',   label: 'استوديو التحليل (AI + المحلل)', icon: Activity },
                        { id: 'info',    label: 'تفاصيل الوسيط والاتصال',         icon: Info },
                        { id: 'message', label: 'مراسلة اللاعب',                 icon: MessageSquare },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id as Tab)}
                            className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                                tab === t.id
                                    ? 'border-emerald-600 text-emerald-800 bg-emerald-50/40'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <t.icon className="w-4 h-4" />
                            <span>{t.label}</span>
                        </button>
                    ))}
                </div>

                {/* ── Drawer Body ──────────────────────────── */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">

                    {/* ══ TAB 1: SCOUT & PERFORMANCE STUDIO ══ */}
                    {tab === 'scout' && (
                        <div className="space-y-4">

                            {/* Top AI Action Banner */}
                            <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-emerald-950 rounded-2xl p-4 text-white shadow-md relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-emerald-400" />
                                            <span className="text-xs font-black tracking-wide text-emerald-400 uppercase">مساعد الكشاف الذكي — Gemini AI</span>
                                        </div>
                                        <p className="text-xs text-slate-300 mt-1 max-w-sm">
                                            تحليل تلقائي لحركات اللاعب واستخراج مصفوفة المهارات الكروية لتدقيقها واعتمادها.
                                        </p>
                                    </div>
                                    <Button
                                        onClick={handleAnalyze}
                                        disabled={analyzing}
                                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black h-10 px-4 text-xs gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer flex-shrink-0"
                                    >
                                        <Sparkles className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
                                        <span>{analyzing ? 'جاري الفحص التكتيكي...' : 'تشغيل تحليل AI ⚡'}</span>
                                    </Button>
                                </div>
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

                            {/* Football Card Overall Score Header */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 p-0.5 shadow-md flex items-center justify-center flex-shrink-0">
                                            <div className="w-full h-full bg-slate-950 rounded-[14px] flex flex-col items-center justify-center text-white">
                                                <span className="text-2xl font-black text-amber-400 leading-none">{calculatedOverall}</span>
                                                <span className="text-[9px] font-black text-white/70 tracking-wider">OVR</span>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-black text-slate-900">التقييم الكروي الإجمالي</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${tier.bg}`}>
                                                    {tier.label}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                متوسط المهارات الست المعتمدة لمركز ({item.position || 'اللاعب'})
                                            </p>
                                        </div>
                                    </div>

                                    {/* Dominant Foot Selection */}
                                    <div className="text-left flex flex-col items-end">
                                        <span className="text-[10px] font-bold text-slate-400 mb-1">القدم المفضلة</span>
                                        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                            {['يمين', 'يسار', 'كلتاهما'].map(foot => (
                                                <button
                                                    key={foot}
                                                    type="button"
                                                    onClick={() => setDominantFoot(foot)}
                                                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                                                        dominantFoot === foot
                                                            ? 'bg-white shadow text-slate-900'
                                                            : 'text-slate-500 hover:text-slate-900'
                                                    }`}
                                                >
                                                    {foot}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── THE 6 FOOTBALL CORE SKILLS (SLIDERS) ── */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <div className="flex items-center gap-1.5">
                                        <Sliders className="w-4 h-4 text-emerald-600" />
                                        <h3 className="text-xs font-black text-slate-900">المهارات الست الأساسية (EA Sports Standard)</h3>
                                    </div>
                                    <span className="text-[10px] text-slate-400">قابلة للتعديل المباشر باللمس</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    {[
                                        { key: 'pace',      label: '⚡ السرعة والتسارع (PAC)', desc: 'الانطلاق وسرعة الجري بالكرة' },
                                        { key: 'shooting',  label: '⚽ التسديد وإنهاء الهجمات (SHO)', desc: 'قوة ودقة التسديد على المرمى' },
                                        { key: 'passing',   label: '🎯 التمرير وصناعة اللعب (PAS)', desc: 'الرؤية ودقة التمريرات القصيرة والطويلة' },
                                        { key: 'dribbling', label: '👟 المراوغة والتحكم (DRI)', desc: 'الرشاقة وحفظ الكرة تحت الضغط' },
                                        { key: 'defending', label: '🛡️ الدفاع والافتكاك (DEF)', desc: 'التمركز وقطع الكرات والمساندة' },
                                        { key: 'physical',  label: '💪 القوة واللياقة البدنية (PHY)', desc: 'الالتحامات والارتقاء والتحمل' },
                                    ].map(s => {
                                        const val = skills[s.key as keyof FootballSkills];
                                        const colorTheme = getSkillColor(val);
                                        return (
                                            <div key={s.key} className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3 flex flex-col justify-between">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-[11px] font-bold text-slate-800">{s.label}</span>
                                                    <span className={`text-xs font-black px-2 py-0.5 rounded-md ${colorTheme}`}>
                                                        {val}
                                                    </span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="40"
                                                    max="99"
                                                    value={val}
                                                    onChange={e => handleSkillChange(s.key as keyof FootballSkills, parseInt(e.target.value) || 50)}
                                                    className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                                                />
                                                <span className="text-[9px] text-slate-400 mt-1 truncate">{s.desc}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Strengths & Development Areas Tags */}
                            {(tacticalStrengths.length > 0 || developmentAreas.length > 0) && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {tacticalStrengths.length > 0 && (
                                        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3">
                                            <p className="text-[11px] font-bold text-emerald-900 mb-1.5 flex items-center gap-1">
                                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> نقاط القوة البارزة:
                                            </p>
                                            <div className="flex flex-wrap gap-1">
                                                {tacticalStrengths.map((str, idx) => (
                                                    <span key={idx} className="bg-white text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200/80 shadow-2xs">
                                                        {str}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {developmentAreas.length > 0 && (
                                        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3">
                                            <p className="text-[11px] font-bold text-amber-900 mb-1.5 flex items-center gap-1">
                                                <Target className="w-3.5 h-3.5 text-amber-600" /> جوانب تحتاج لتطوير:
                                            </p>
                                            <div className="flex flex-wrap gap-1">
                                                {developmentAreas.map((dev, idx) => (
                                                    <span key={idx} className="bg-white text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-200/80 shadow-2xs">
                                                        {dev}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Human Analyst Technical Report & Notes */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <Award className="w-4 h-4 text-indigo-600" />
                                        <h4 className="text-xs font-black text-slate-900">تقرير وتوصية محلل الأداء المعتمدة</h4>
                                    </div>
                                    <span className="text-[10px] text-slate-400">تظهر في تقرير اللاعب</span>
                                </div>
                                <Textarea
                                    rows={3}
                                    value={analystNotes}
                                    onChange={e => setAnalystNotes(e.target.value)}
                                    placeholder="اكتب التوصيات الفنية أو الملاحظات التكتيكية التي تريد توجيهها للاعب والمدربين..."
                                    className="text-xs bg-slate-50 border-slate-200 leading-relaxed resize-none focus:bg-white"
                                />
                                {aiText && (
                                    <details className="mt-2 text-xs">
                                        <summary className="text-[11px] text-indigo-600 font-bold cursor-pointer hover:underline">
                                            عرض التقرير المفصل الصادر من الذكاء الاصطناعي (Gemini)
                                        </summary>
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mt-2 text-slate-700 leading-relaxed text-[11px] whitespace-pre-line max-h-48 overflow-y-auto">
                                            {aiText}
                                        </div>
                                    </details>
                                )}
                            </div>

                            {/* ── ACTION BUTTONS ── */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm space-y-2 sticky bottom-0 z-20">
                                <Button
                                    onClick={handleApproveAndSync}
                                    disabled={syncing}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black h-12 text-sm gap-2 shadow-lg shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer"
                                >
                                    <ShieldCheck className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
                                    <span>{syncing ? 'جاري الاعتماد والمزامنة...' : `🌟 اعتماد ومزامنة كارت اللاعب (${calculatedOverall} OVR)`}</span>
                                </Button>

                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleQuickStatus('flagged')}
                                        disabled={updating}
                                        className="gap-1.5 text-xs font-bold border-amber-200 text-amber-700 hover:bg-amber-50 h-9"
                                    >
                                        <Flag className="w-3.5 h-3.5 text-amber-600" />
                                        <span>تنبيه / طلب إعادة</span>
                                    </Button>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleQuickStatus('rejected')}
                                        disabled={updating}
                                        className="gap-1.5 text-xs font-bold border-rose-200 text-rose-700 hover:bg-rose-50 h-9"
                                    >
                                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                        <span>رفض الفيديو</span>
                                    </Button>
                                </div>
                            </div>

                        </div>
                    )}

                    {/* ══ TAB 2: MEDIA INFO & CONTACT ══ */}
                    {tab === 'info' && (
                        <div className="space-y-4">
                            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                                <div>
                                    <p className="text-[10px] text-indigo-600 font-bold uppercase mb-0.5">{item.category || 'وسائط رياضية'}</p>
                                    <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                                    {item.description && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.description}</p>}
                                </div>

                                <div className="bg-slate-50 rounded-xl p-3.5 space-y-2 text-xs">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">قنوات التواصل مع اللاعب</p>
                                    {item.userPhone && (
                                        <div className="flex items-center justify-between text-slate-700">
                                            <span className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /> {item.userPhone}</span>
                                            <a
                                                href={`https://wa.me/${item.userPhone.replace(/\D/g,'')}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[11px] font-bold text-emerald-600 hover:underline"
                                            >
                                                واتساب 💬
                                            </a>
                                        </div>
                                    )}
                                    {item.userEmail && (
                                        <div className="flex items-center gap-2 text-slate-700">
                                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                                            <span>{item.userEmail}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                        <p className="text-sm font-black text-slate-800">{item.views}</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">المشاهدات</p>
                                    </div>
                                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                        <p className="text-sm font-black text-slate-800">{item.likes}</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">الإعجابات</p>
                                    </div>
                                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                        <p className="text-sm font-black text-slate-800">
                                            {item.fileSize ? `${(item.fileSize / 1024 / 1024).toFixed(1)} MB` : '—'}
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">الحجم</p>
                                    </div>
                                </div>
                            </div>

                            {/* Danger zone delete */}
                            <div className="border border-rose-200/60 bg-rose-50/40 rounded-2xl p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-rose-900">حذف هذا الملف نهائياً</p>
                                    <p className="text-[10px] text-rose-600 mt-0.5">سيتم إزالة الملف من الخادم وقاعدة البيانات</p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="border-rose-300 text-rose-700 hover:bg-rose-100 text-xs font-bold"
                                >
                                    <Trash2 className="w-3.5 h-3.5 ml-1" />
                                    {confirmDelete ? 'تأكيد الحذف؟' : 'حذف الملف'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* ══ TAB 3: MESSAGE PLAYER ══ */}
                    {tab === 'message' && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                            <div>
                                <h3 className="text-xs font-black text-slate-900">إرسال إشعار مباشر لهاتف اللاعب</h3>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    يصل الإشعار فورا في مركز إشعارات التطبيق للاعب ({item.userName}).
                                </p>
                            </div>
                            <Textarea
                                rows={4}
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                placeholder="اكتب رسالتك أو توجيهك المباشر للاعب هنا..."
                                className="text-xs bg-slate-50 border-slate-200 leading-relaxed resize-none focus:bg-white"
                            />
                            <Button
                                onClick={handleSendMessage}
                                disabled={sendingMsg || !message.trim()}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 text-xs gap-2"
                            >
                                <Send className={`w-3.5 h-3.5 ${sendingMsg ? 'animate-spin' : ''}`} />
                                <span>{sendingMsg ? 'جاري الإرسال...' : 'إرسال الإشعار لهاتف اللاعب'}</span>
                            </Button>
                        </div>
                    )}

                </div>
            </SheetContent>
        </Sheet>
    );
}
