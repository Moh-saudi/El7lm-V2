'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { MediaItem, FootballSkills, detectMediaSource } from '../types';
import {
    X, Maximize2, Minimize2, ChevronRight, ChevronLeft,
    ExternalLink, Sliders, FileText, User, Cloud, PlaySquare,
    Music2, ShieldCheck, Flag, XCircle, Eye, Sparkles, MessageSquareText
} from 'lucide-react';
import { toast } from 'sonner';
import { authenticatedFetch } from '@/lib/api/authenticated-fetch';
import {
    STATUS_COLOR, STATUS_LABEL, checkIsGoalkeeper, calculateOverall,
    DEFAULT_SKILLS_PLAYER, DEFAULT_SKILLS_GK, captureFrames
} from './studio-utils';

// ── Child Components ──
import { VideoPlayer } from './VideoPlayer';
import { SkillsMatrix } from './SkillsMatrix';
import { ScoutDossier } from './ScoutDossier';
import { PlayerContact } from './PlayerContact';

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

export function StudioModal({
    item, onClose, onUpdateStatus, onApproveAndSync, onAIResult, onDelete,
    userId, onNext, onPrev, hasNext = false, hasPrev = false, currentIndex = 0, totalCount = 0,
}: Props) {
    // ── Tab Management ──
    const [activeTab, setActiveTab] = useState<'matrix' | 'dossier' | 'contact'>('matrix');

    // ── Fullscreen ──
    const [isFullscreen, setIsFullscreen] = useState(false);

    // ── Skills & Telemetry State ──
    const [skills, setSkills] = useState<FootballSkills>(DEFAULT_SKILLS_PLAYER);
    const [dominantFoot, setDominantFoot] = useState<string>('يمين');
    const [tacticalStrengths, setTacticalStrengths] = useState<string[]>([]);
    const [developmentAreas, setDevelopmentAreas] = useState<string[]>([]);
    const [analystNotes, setAnalystNotes] = useState('');
    const [aiText, setAiText] = useState('');
    const [aiTelemetry, setAiTelemetry] = useState<{
        observedActivity?: string;
        ageCategory?: string;
        visionConfidence?: number;
        movementNotes?: string;
    } | null>(null);

    // ── Action States ──
    const [analyzing, setAnalyzing] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [updating, setUpdating] = useState(false);

    const isGK = useMemo(() => checkIsGoalkeeper(item?.position), [item?.position]);
    const detectedSource = useMemo(() => item ? detectMediaSource(item) : 'external', [item]);
    const calculatedOverall = useMemo(() => calculateOverall(skills, isGK), [skills, isGK]);

    // ── Sync state on item change ──
    useEffect(() => {
        if (item) {
            const playerIsGk = checkIsGoalkeeper(item.position);
            setSkills(item.skills || (playerIsGk ? DEFAULT_SKILLS_GK : DEFAULT_SKILLS_PLAYER));
            setDominantFoot(item.dominantFoot || 'يمين');
            setTacticalStrengths(item.tacticalStrengths || []);
            setDevelopmentAreas(item.developmentAreas || []);
            setAnalystNotes(item.notes || item.scoutRecommendation || '');
            setAiText(item.aiAnalysis || '');
            setAiTelemetry(item.aiTelemetry || null);
            setAiError(null);
        }
    }, [item]);

    // ── Keyboard shortcuts ──
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!item) return;
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

            if (e.key === 'Escape') onClose();
            if (e.key === 'k' || e.key === 'K') { if (hasNext && onNext) onNext(); }
            if (e.key === 'j' || e.key === 'J') { if (hasPrev && onPrev) onPrev(); }
            if (e.key === 'f' || e.key === 'F') { setIsFullscreen(prev => !prev); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [item, hasNext, hasPrev, onNext, onPrev, onClose]);

    // ── Skill change handler ──
    const handleSkillChange = useCallback((key: keyof FootballSkills, val: number) => {
        setSkills(prev => ({ ...prev, [key]: Math.min(99, Math.max(30, val)) }));
    }, []);

    // ── AI Video & Telemetry Analysis ──
    const handleAnalyze = async () => {
        if (!item) return;
        setAnalyzing(true);
        setAiError(null);
        try {
            toast.info(`جاري فحص لقطات اللاعب (${item.userName}) عبر نموذج الرؤية الحاسوبية...`);
            let frames: string[] = [];
            if (detectedSource === 'direct') {
                try { frames = await captureFrames(item.url); } catch { frames = []; }
            }
            const res = await authenticatedFetch('/api/media/analyze-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    r2Key: item.r2Key, videoUrl: item.url, url: item.url,
                    title: item.title, description: item.description,
                    playerPosition: item.position, position: item.position,
                    playerAge: item.age, age: item.age,
                    playerName: item.userName, userName: item.userName,
                    playerCountry: item.country, country: item.country,
                    frameUrls: frames.length > 0 ? frames : undefined,
                    frames: frames.length > 0 ? frames : undefined,
                    category: item.category,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'فشل التحليل');
            if (data.skills) {
                setSkills({
                    pace: data.skills.pace ?? 75, shooting: data.skills.shooting ?? 70,
                    passing: data.skills.passing ?? 72, dribbling: data.skills.dribbling ?? 78,
                    defending: data.skills.defending ?? 65, physical: data.skills.physical ?? 74,
                });
            }
            if (data.dominantFoot) setDominantFoot(data.dominantFoot);
            if (Array.isArray(data.tacticalStrengths)) setTacticalStrengths(data.tacticalStrengths);
            if (Array.isArray(data.developmentAreas)) setDevelopmentAreas(data.developmentAreas);
            if (data.analysis) setAiText(data.analysis);
            if (data.scoutRecommendation) setAnalystNotes(data.scoutRecommendation);
            if (data.aiTelemetry) setAiTelemetry(data.aiTelemetry);

            onAIResult(item.id, data.analysis, data.rating);
            toast.success(`اكتمل رصد الرؤية الحاسوبية لمركز (${item.position || 'اللاعب'})`);
        } catch (e: any) {
            setAiError(e.message || 'خطأ أثناء تشغيل التحليل');
            toast.error(e.message || 'تعذر تشغيل التحليل');
        } finally {
            setAnalyzing(false);
        }
    };

    // ── 1. Approve & Sync (اعتماد رسمي ومزامنة البروفايل) ──
    const handleApproveAndSync = async () => {
        if (!item || syncing) return;
        setSyncing(true);
        try {
            if (onApproveAndSync) {
                await onApproveAndSync(item, skills, calculatedOverall, dominantFoot, analystNotes, aiText || '');
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

    // ── 2, 3, 4 Quick Status (مراقبة / تنبيه / رفض) ──
    const handleQuickStatus = async (status: 'rejected' | 'flagged', defaultNote?: string) => {
        if (!item || updating) return;
        setUpdating(true);
        try {
            const noteToSend = analystNotes.trim() || defaultNote;
            await onUpdateStatus(item, status, noteToSend);
        } finally {
            setUpdating(false);
        }
    };

    if (!item) return null;

    return (
        <DialogPrimitive.Root open={!!item} onOpenChange={open => !open && onClose()}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md transition-opacity animate-in fade-in duration-200" />

                <DialogPrimitive.Content
                    className={`fixed z-50 outline-none flex flex-col bg-slate-950 text-slate-100 border border-slate-800 shadow-2xl overflow-hidden duration-200 animate-in fade-in zoom-in-95 ${
                        isFullscreen
                            ? 'inset-0 rounded-none'
                            : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[98vw] max-w-[1580px] h-[95vh] rounded-2xl md:rounded-3xl'
                    }`}
                    dir="rtl"
                >
                    <DialogPrimitive.Title className="sr-only">
                        {item.title} — استوديو تحليل أداء اللاعب
                    </DialogPrimitive.Title>
                    <DialogPrimitive.Description className="sr-only">
                        استوديو الكشافة الفني وتحليل أداء اللاعبين بالذكاء الاصطناعي (Wyscout Edition)
                    </DialogPrimitive.Description>

                    {/* ═══ TOP TITANIUM COMMAND BAR ═══ */}
                    <div className="bg-slate-900/90 border-b border-slate-800 px-5 py-3 flex items-center justify-between gap-3 flex-shrink-0 z-30">
                        {/* Player Identity */}
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="relative flex-shrink-0">
                                <div className="w-10 h-10 rounded-full p-0.5 bg-slate-800 border border-slate-700 shadow-md">
                                    {item.userImage ? (
                                        <img src={item.userImage} alt={item.userName} className="w-full h-full rounded-full object-cover bg-slate-800" />
                                    ) : (
                                        <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center font-black text-slate-300 text-sm">
                                            {item.userName.charAt(0) || 'ل'}
                                        </div>
                                    )}
                                </div>
                                <span className="absolute -bottom-1 -right-1 bg-emerald-600 border border-slate-900 text-[9px] font-black text-white px-1.5 py-0.2 rounded-full shadow-xs">
                                    {calculatedOverall}
                                </span>
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="font-black text-white text-sm truncate">{item.userName}</h2>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${STATUS_COLOR[item.status]}`}>
                                        {STATUS_LABEL[item.status]}
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-slate-800 text-slate-300 border-slate-700">
                                        {isGK ? '🧤 حارس مرمى' : (item.position || 'لاعب')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 truncate">
                                    {item.age && <span className="text-amber-400 font-bold">{item.age} سنة</span>}
                                    {item.country && <span>• {item.country}</span>}
                                    {item.organization && <span>• {item.organization}</span>}
                                </div>
                            </div>
                        </div>

                        {/* Queue Navigator */}
                        <div className="hidden md:flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1">
                            <Button
                                variant="ghost" size="sm"
                                onClick={onPrev}
                                disabled={!hasPrev}
                                className="h-7 px-2 text-xs font-bold text-slate-400 hover:text-white disabled:opacity-30 gap-1 cursor-pointer"
                            >
                                <ChevronRight className="w-3.5 h-3.5" /><span>السابق</span>
                            </Button>
                            {totalCount > 0 && (
                                <span className="text-xs font-mono font-bold text-slate-300 px-2 border-x border-slate-800">
                                    {currentIndex} / {totalCount}
                                </span>
                            )}
                            <Button
                                variant="ghost" size="sm"
                                onClick={onNext}
                                disabled={!hasNext}
                                className="h-7 px-2 text-xs font-bold text-slate-400 hover:text-white disabled:opacity-30 gap-1 cursor-pointer"
                            >
                                <span>التالي</span><ChevronLeft className="w-3.5 h-3.5" />
                            </Button>
                        </div>

                        {/* Window Controls */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <a
                                href={`/profile/${item.userId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="hidden sm:flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg transition-colors"
                            >
                                <ExternalLink className="w-3.5 h-3.5" /><span>بروفايل اللاعب</span>
                            </a>
                            <Button
                                variant="ghost" size="icon"
                                onClick={() => setIsFullscreen(prev => !prev)}
                                className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                            >
                                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                            </Button>
                            <Button
                                variant="ghost" size="icon"
                                onClick={onClose}
                                className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* ═══ CINEMA SPLIT SCREEN ═══ */}
                    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-slate-950">

                        {/* COL 1: Cinema Video Player (7 cols) */}
                        <div className="lg:col-span-7 xl:col-span-7 flex flex-col min-h-0 border-b lg:border-b-0 lg:border-l border-slate-800 bg-black">
                            <VideoPlayer item={item} />
                        </div>

                        {/* COL 2: Scouting Console (5 cols) */}
                        <div className="lg:col-span-5 xl:col-span-5 flex flex-col min-h-0 bg-slate-900 border-r border-slate-800">

                            {/* Tab Switcher */}
                            <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex-shrink-0">
                                <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl w-full border border-slate-800">
                                    {[
                                        { key: 'matrix' as const, label: isGK ? 'مصفوفة الحراسة' : 'مصفوفة المهارات', icon: Sliders, color: 'text-emerald-400' },
                                        { key: 'dossier' as const, label: 'التقرير الكشفي', icon: FileText, color: 'text-indigo-400' },
                                        { key: 'contact' as const, label: 'التواصل وواتساب', icon: MessageSquareText, color: 'text-sky-400' },
                                    ].map(tab => (
                                        <button
                                            key={tab.key} type="button"
                                            onClick={() => setActiveTab(tab.key)}
                                            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                activeTab === tab.key
                                                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700 font-black'
                                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                                            }`}
                                        >
                                            <tab.icon className={`w-3.5 h-3.5 ${tab.color}`} />
                                            <span>{tab.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tab Content Area */}
                            <div className="flex-1 overflow-y-auto p-4 md:p-5 bg-slate-950/40">
                                {activeTab === 'matrix' && (
                                    <SkillsMatrix
                                        item={item}
                                        skills={skills}
                                        onSkillChange={handleSkillChange}
                                        dominantFoot={dominantFoot}
                                        onDominantFootChange={setDominantFoot}
                                        analystNotes={analystNotes}
                                        onAnalystNotesChange={setAnalystNotes}
                                        analyzing={analyzing}
                                        aiError={aiError}
                                        onAnalyze={handleAnalyze}
                                        aiTelemetry={aiTelemetry}
                                    />
                                )}
                                {activeTab === 'dossier' && (
                                    <ScoutDossier
                                        item={item}
                                        skills={skills}
                                        dominantFoot={dominantFoot}
                                        analystNotes={analystNotes}
                                        aiText={aiText}
                                        tacticalStrengths={tacticalStrengths}
                                        developmentAreas={developmentAreas}
                                    />
                                )}
                                {activeTab === 'contact' && (
                                    <PlayerContact
                                        item={item}
                                        userId={userId}
                                        onDelete={onDelete}
                                        onClose={onClose}
                                    />
                                )}
                            </div>

                            {/* ═══ 4 Executive Decision Action Buttons ═══ */}
                            <div className="border-t border-slate-800 bg-slate-950/90 px-4 py-3 space-y-2 flex-shrink-0 z-20 shadow-2xl">
                                {/* 1. Main Action: Approve & Sync to Profile */}
                                <Button
                                    onClick={handleApproveAndSync}
                                    disabled={syncing}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black h-11 text-sm gap-2 shadow-lg shadow-emerald-900/30 active:scale-98 transition-all cursor-pointer"
                                >
                                    <ShieldCheck className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
                                    <span>{syncing ? 'جاري الاعتماد والمزامنة...' : `🌟 اعتماد التقييم ومزامنة البروفايل (${calculatedOverall} OVR)`}</span>
                                </Button>

                                {/* 2, 3, 4: Monitor, Flag, Reject */}
                                <div className="grid grid-cols-3 gap-2">
                                    <Button
                                        variant="outline" size="sm"
                                        onClick={() => handleQuickStatus('flagged', 'مطلوب إدراجه في قائمة المراقبة والمتابعة الدورية')}
                                        disabled={updating}
                                        className="gap-1 text-xs font-bold border-cyan-800/80 text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 h-8.5 cursor-pointer"
                                        title="وضع اللاعب تحت الملاحظة ومتابعة التطور"
                                    >
                                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                                        <span>مراقبة 👁️</span>
                                    </Button>

                                    <Button
                                        variant="outline" size="sm"
                                        onClick={() => handleQuickStatus('flagged', 'مطلوب تحسين جودة التصوير أو إعادة إرسال فيديو إضافي')}
                                        disabled={updating}
                                        className="gap-1 text-xs font-bold border-amber-800/80 text-amber-300 bg-amber-950/40 hover:bg-amber-900/50 h-8.5 cursor-pointer"
                                        title="طلب إعادة تصوير أو تحسين الجودة"
                                    >
                                        <Flag className="w-3.5 h-3.5 text-amber-400" />
                                        <span>طلب تحسين ⚠️</span>
                                    </Button>

                                    <Button
                                        variant="outline" size="sm"
                                        onClick={() => handleQuickStatus('rejected', 'الفيديو غير مطابق لمعايير القبول الفني')}
                                        disabled={updating}
                                        className="gap-1 text-xs font-bold border-rose-800/80 text-rose-300 bg-rose-950/40 hover:bg-rose-900/50 h-8.5 cursor-pointer"
                                        title="رفض الفيديو"
                                    >
                                        <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                        <span>رفض ❌</span>
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
