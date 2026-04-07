'use client';

import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MediaItem } from '../types';
import {
    X, CheckCircle, XCircle, Flag, BrainCircuit, MessageSquare,
    Info, User, Phone, Mail, MapPin, Star, Sparkles, RefreshCw,
    Copy, AlertCircle, Send, Trash2, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
    item: MediaItem | null;
    onClose: () => void;
    onUpdateStatus: (item: MediaItem, status: 'approved' | 'rejected' | 'flagged', notes?: string) => Promise<void>;
    onAIResult: (id: string, analysis: string, rating: number | null) => void;
    onDelete: (item: MediaItem) => Promise<void>;
    userId: string;
}

type Tab = 'info' | 'ai' | 'message';

const STATUS_COLOR: Record<string, string> = {
    pending:  'bg-amber-100 text-amber-800 border-amber-200',
    approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    rejected: 'bg-rose-100 text-rose-800 border-rose-200',
    flagged:  'bg-orange-100 text-orange-800 border-orange-200',
};
const STATUS_LABEL: Record<string, string> = {
    pending: 'معلق', approved: 'معتمد', rejected: 'مرفوض', flagged: 'تنبيه'
};

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

export function MediaDrawer({ item, onClose, onUpdateStatus, onAIResult, onDelete, userId }: Props) {
    const [tab, setTab] = useState<Tab>('info');
    const [updating, setUpdating] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [message, setMessage] = useState('');
    const [sendingMsg, setSendingMsg] = useState(false);

    // Player error fallback
    const [playerError, setPlayerError] = useState(false);
    const [avatarError, setAvatarError] = useState(false);

    // Action notes
    const [actionNotes, setActionNotes] = useState('');

    // AI state
    const [analyzing, setAnalyzing] = useState(false);
    const [aiText, setAiText] = useState<string | null>(null);
    const [aiRating, setAiRating] = useState<number | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);

    // Reset on item change
    useEffect(() => {
        setTab('info');
        setMessage('');
        setActionNotes('');
        setAiError(null);
        setPlayerError(false);
        setAvatarError(false);
        setConfirmDelete(false);
        if (item?.aiAnalysis) {
            setAiText(item.aiAnalysis);
            setAiRating(item.aiRating ?? null);
        } else {
            setAiText(null);
            setAiRating(null);
        }
    }, [item?.id]);

    const handleStatus = async (status: 'approved' | 'rejected' | 'flagged') => {
        if (!item || updating) return;
        setUpdating(true);
        try { await onUpdateStatus(item, status, actionNotes.trim() || undefined); }
        finally { setUpdating(false); }
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

    const handleAnalyze = async () => {
        if (!item) return;
        setAnalyzing(true); setAiError(null); setAiText(null); setAiRating(null);
        try {
            let frameUrls: string[] = [];

            if (item.type === 'image') {
                // للصور: أرسل الرابط الحقيقي — الـ API يحمّله server-side مباشرة
                frameUrls = [item.url];
                toast.info('جاري تحليل الصورة...');
            } else if (item.url.match(/\.(mp4|mov|webm|avi)/i)) {
                toast.info('جاري استخراج لقطات من الفيديو...');
                // proxy للـ canvas (client-side) — CORS
                const captureUrl = `/api/media/proxy-video?url=${encodeURIComponent(item.url)}`;
                frameUrls = await captureFrames(captureUrl);
                // إذا فشل استخراج الـ frames أرسل الرابط الحقيقي للـ API
                if (frameUrls.length === 0) {
                    frameUrls = [];
                }
            }

            const res = await fetch('/api/media/analyze-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoUrl:       item.url,
                    frameUrls,
                    mediaType:      item.type,
                    playerName:     item.userName,
                    playerPosition: item.position,
                    playerAge:      item.age,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) { setAiError(data.error || 'فشل التحليل'); return; }
            setAiText(data.analysis);
            setAiRating(data.rating);
            onAIResult(item.id, data.analysis, data.rating);
            toast.success('اكتمل التحليل');
        } catch (e: any) {
            setAiError(e.message || 'خطأ غير متوقع');
        } finally { setAnalyzing(false); }
    };

    const handleSendMessage = async () => {
        if (!message.trim() || !item) return;
        setSendingMsg(true);
        try {
            const res = await fetch('/api/notifications/dispatch', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    eventType:       'message_received',
                    targetUserId:    item.userId,
                    actorId:         userId,
                    actorName:       'مسؤول المنصة',
                    actorAccountType:'admin',
                    metadata:        { messagePreview: message.trim().substring(0, 100) },
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'فشل الإرسال');
            toast.success(`تم إرسال الرسالة إلى ${item.userName}`);
            setMessage('');
        } catch (e: any) {
            toast.error('فشل إرسال الرسالة: ' + e.message);
        } finally {
            setSendingMsg(false);
        }
    };

    return (
        <Sheet open={!!item} onOpenChange={open => !open && onClose()}>
            <SheetContent
                side="left"
                className="w-full sm:max-w-lg md:max-w-xl p-0 flex flex-col bg-white border-r border-slate-200 gap-0"
            >
                <SheetTitle className="sr-only">{item?.title || 'معاينة الوسائط'}</SheetTitle>
                <SheetDescription className="sr-only">معاينة وإدارة الوسائط</SheetDescription>
                {item && (
                    <>
                        {/* ── Media Player ───────────────────────── */}
                        <div className="relative bg-black aspect-video flex-shrink-0">
                            {item.type === 'video' ? (
                                (() => {
                                    // فيديو مباشر (Supabase/R2/assets) — HTML video عادي
                                    const isStoredVideo = item.sourceType === 'r2'
                                        || item.url.includes('supabase.co/storage')
                                        || /\.(mp4|mov|webm|avi|mkv)(\?|$)/i.test(item.url);
                                    const isExternalPlatform = item.url.includes('youtu') || item.url.includes('tiktok')
                                        || item.url.includes('vimeo') || item.url.includes('instagram');
                                    const usePlayer = !playerError && isStoredVideo && !isExternalPlatform;

                                    if (usePlayer) {
                                        const proxySrc = `/api/media/proxy-video?url=${encodeURIComponent(item.url)}`;
                                        return (
                                            <video
                                                key={item.url}
                                                src={proxySrc}
                                                controls
                                                className="absolute inset-0 w-full h-full"
                                                poster={item.thumbnailUrl}
                                                preload="metadata"
                                                onError={(e) => {
                                                    console.error('[video] failed:', item.url, (e.target as HTMLVideoElement).error);
                                                    setPlayerError(true);
                                                }}
                                            />
                                        );
                                    }

                                    // إذا فشل الـ player أو الفيديو خارجي — عرض thumbnail + زر
                                    const isYT = item.url.includes('youtu');
                                    const isTK = item.url.includes('tiktok');
                                    const isVM = item.url.includes('vimeo');
                                    const isIG = item.url.includes('instagram');
                                    const ytId = item.url.match(/(?:youtu\.be\/|v=|shorts\/)([^?&\s]+)/)?.[1];
                                    const bgThumb = ytId
                                        ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
                                        : item.thumbnailUrl || null;
                                    const platformLabel = isYT ? 'YouTube' : isTK ? 'TikTok' : isVM ? 'Vimeo' : isIG ? 'Instagram' : 'فتح الفيديو';
                                    const btnCls = isYT ? 'bg-red-600' : isTK ? 'bg-black border-2 border-white/20' : isIG ? 'bg-gradient-to-br from-pink-500 to-orange-400' : 'bg-white/25 border border-white/30';
                                    return (
                                        <a href={item.url} target="_blank" rel="noreferrer"
                                            className="absolute inset-0 flex flex-col items-center justify-center group overflow-hidden">
                                            {bgThumb && <img src={bgThumb} alt="" className="absolute inset-0 w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                                            <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors" />
                                            <div className={`relative w-14 h-14 rounded-full flex items-center justify-center mb-2 shadow-lg ${btnCls}`}>
                                                <svg className="w-6 h-6 text-white fill-white ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                            </div>
                                            <span className="relative text-white font-bold text-sm drop-shadow">
                                                {playerError ? '⚠️ خطأ في التشغيل — ' : ''}{platformLabel}
                                            </span>
                                            {playerError && (
                                                <span className="relative text-white/60 text-xs mt-1">انقر لفتح الرابط مباشرة</span>
                                            )}
                                        </a>
                                    );
                                })()
                            ) : (
                                <img src={item.url} alt={item.title} className="w-full h-full object-contain" />
                            )}
                            {/* Close */}
                            <button onClick={onClose} className="absolute top-3 left-3 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors z-10">
                                <X className="w-4 h-4" />
                            </button>
                            {/* Status */}
                            <div className="absolute top-3 right-3">
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLOR[item.status]}`}>
                                    {STATUS_LABEL[item.status]}
                                </span>
                            </div>
                        </div>

                        {/* ── Header info ─────────────────────────── */}
                        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
                            {item.userImage && !avatarError ? (
                                <img
                                    src={item.userImage}
                                    alt={item.userName}
                                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                                    onError={() => setAvatarError(true)}
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                                    {item.userName.charAt(0)}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-bold text-slate-900 text-sm truncate">{item.userName}</p>
                                    <a
                                        href={`/profile/${item.userId}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-indigo-500 hover:text-indigo-700 transition-colors flex-shrink-0"
                                        title="فتح ملف اللاعب"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                </div>
                                <p className="text-[11px] text-slate-400">{item.position || item.accountType} {item.country ? `· ${item.country}` : ''}</p>
                            </div>
                            {item.aiRating && (
                                <div className="flex items-center gap-1 bg-purple-50 border border-purple-100 rounded-lg px-2 py-1">
                                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                    <span className="text-xs font-black text-purple-700">{item.aiRating}/10</span>
                                </div>
                            )}
                        </div>

                        {/* ── Tabs ─────────────────────────────────── */}
                        <div className="flex border-b border-slate-100 bg-white flex-shrink-0">
                            {([
                                { id: 'info',    label: 'المعلومات', icon: Info          },
                                { id: 'ai',      label: 'تحليل AI',  icon: BrainCircuit  },
                                { id: 'message', label: 'رسالة',     icon: MessageSquare },
                            ] as const).map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setTab(t.id)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                                        tab === t.id
                                            ? 'border-indigo-600 text-indigo-600'
                                            : 'border-transparent text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    <t.icon className="w-3.5 h-3.5" />
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {/* ── Tab Content ──────────────────────────── */}
                        <div className="flex-1 overflow-y-auto">

                            {/* INFO */}
                            {tab === 'info' && (
                                <div className="p-5 space-y-4">
                                    {/* Title */}
                                    <div>
                                        <p className="text-[10px] text-indigo-600 font-bold uppercase mb-0.5">{item.category}</p>
                                        <h2 className="text-base font-bold text-slate-900">{item.title}</h2>
                                        {item.description && <p className="text-sm text-slate-500 mt-1 leading-relaxed">{item.description}</p>}
                                    </div>

                                    {/* Contact */}
                                    <div className="bg-slate-50 rounded-xl p-4 space-y-2.5">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase">بيانات الاتصال</p>
                                        {item.userPhone && (
                                            <div className="flex items-center gap-2 text-sm text-slate-700">
                                                <Phone className="w-4 h-4 text-slate-400" />
                                                <a href={`https://wa.me/${item.userPhone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="hover:text-indigo-600 transition-colors">{item.userPhone}</a>
                                            </div>
                                        )}
                                        {item.userEmail && (
                                            <div className="flex items-center gap-2 text-sm text-slate-700">
                                                <Mail className="w-4 h-4 text-slate-400" />
                                                <span>{item.userEmail}</span>
                                            </div>
                                        )}
                                        {item.organization && (
                                            <div className="flex items-center gap-2 text-sm text-slate-700">
                                                <User className="w-4 h-4 text-slate-400" />
                                                <span>{item.organization}</span>
                                            </div>
                                        )}
                                        {item.country && (
                                            <div className="flex items-center gap-2 text-sm text-slate-700">
                                                <MapPin className="w-4 h-4 text-slate-400" />
                                                <span>{item.country}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { label: 'المشاهدات', value: item.views },
                                            { label: 'الإعجابات', value: item.likes },
                                            { label: 'الحجم', value: item.fileSize ? `${(item.fileSize / 1024 / 1024).toFixed(1)} MB` : '—' },
                                        ].map(s => (
                                            <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center">
                                                <p className="text-lg font-black text-slate-800">{s.value}</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <p className="text-[10px] text-slate-300 text-center">
                                        رُفع: {item.uploadDate.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>
                            )}

                            {/* AI */}
                            {tab === 'ai' && (
                                <div className="p-5 space-y-4">
                                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <BrainCircuit className="w-4 h-4 text-purple-600" />
                                            <span className="text-sm font-bold text-purple-900">تحليل الأداء — Gemini AI</span>
                                        </div>
                                        <p className="text-xs text-purple-500">
                                            {item.type === 'image'
                                                ? 'يحلل الصورة رياضياً ويقيّم وضعية اللاعب وأسلوبه'
                                                : 'يستخرج لقطات من الفيديو ويحللها رياضياً بالعربية'}
                                        </p>
                                    </div>

                                    {!aiText && !analyzing && (
                                        <Button onClick={handleAnalyze} className="w-full bg-purple-600 hover:bg-purple-700 text-white h-11 gap-2 font-bold">
                                            <Sparkles className="w-4 h-4" /> بدء التحليل
                                        </Button>
                                    )}

                                    {analyzing && (
                                        <div className="flex flex-col items-center py-10 bg-white border border-slate-100 rounded-xl">
                                            <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mb-3 animate-pulse">
                                                <BrainCircuit className="w-6 h-6 text-purple-500" />
                                            </div>
                                            <p className="font-semibold text-slate-700 text-sm">جاري التحليل...</p>
                                            <p className="text-xs text-slate-400 mt-1">قد يستغرق حتى 30 ثانية</p>
                                        </div>
                                    )}

                                    {aiError && (
                                        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <AlertCircle className="w-4 h-4 text-red-500" />
                                                <span className="text-sm font-bold text-red-700">فشل التحليل</span>
                                            </div>
                                            <p className="text-xs text-red-500 mb-3">{aiError}</p>
                                            <Button onClick={handleAnalyze} variant="outline" size="sm" className="gap-1 border-red-200 text-red-700 hover:bg-red-50">
                                                <RefreshCw className="w-3 h-3" /> إعادة المحاولة
                                            </Button>
                                        </div>
                                    )}

                                    {aiText && (
                                        <div className="space-y-3">
                                            {aiRating !== null && (
                                                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-4 flex items-center justify-between text-white">
                                                    <div className="flex items-center gap-2">
                                                        <Star className="w-5 h-5 fill-yellow-300 text-yellow-300" />
                                                        <span className="font-bold">التقييم العام</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-4xl font-black">{aiRating}</span>
                                                        <span className="text-white/60 text-sm"> /10</span>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="bg-white border border-slate-200 rounded-xl p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="text-sm font-bold text-slate-900">التقرير التفصيلي</span>
                                                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-slate-400 hover:text-slate-700"
                                                        onClick={() => { navigator.clipboard.writeText(aiText); toast.success('تم نسخ التقرير'); }}>
                                                        <Copy className="w-3 h-3" /> نسخ
                                                    </Button>
                                                </div>
                                                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{aiText}</div>
                                            </div>

                                            <Button onClick={handleAnalyze} variant="outline" className="w-full gap-2 border-purple-200 text-purple-700 hover:bg-purple-50">
                                                <RefreshCw className="w-4 h-4" /> إعادة التحليل
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* MESSAGE */}
                            {tab === 'message' && (
                                <div className="p-5 space-y-4">
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                                        <p className="text-sm font-bold text-emerald-800 mb-0.5">تواصل مع {item.userName}</p>
                                        <p className="text-xs text-emerald-600">ملاحظاتك الفنية تساعد اللاعب على التطور</p>
                                    </div>
                                    <Textarea
                                        value={message}
                                        onChange={e => setMessage(e.target.value)}
                                        placeholder="اكتب ملاحظتك أو تقييمك هنا..."
                                        className="min-h-[140px] resize-none text-sm"
                                    />
                                    <Button
                                        onClick={handleSendMessage}
                                        disabled={!message.trim() || sendingMsg}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 gap-2 font-bold"
                                    >
                                        <Send className="w-4 h-4" />
                                        {sendingMsg ? 'جاري الإرسال...' : 'إرسال الرسالة'}
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* ── Notes + Action Buttons ───────────────── */}
                        <div className="px-4 pt-3 pb-0 border-t border-slate-100 bg-white flex-shrink-0">
                            {item.notes && !actionNotes && (
                                <p className="text-[11px] text-slate-400 mb-2 bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-100">
                                    <span className="font-semibold text-slate-500">ملاحظة سابقة: </span>{item.notes}
                                </p>
                            )}
                            <input
                                type="text"
                                value={actionNotes}
                                onChange={e => setActionNotes(e.target.value)}
                                placeholder="سبب الإجراء (اختياري)..."
                                className="w-full h-8 text-xs border border-slate-200 rounded-lg px-3 bg-slate-50 text-slate-700 mb-2 focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder:text-slate-400"
                            />
                        </div>
                        <div className="px-4 pb-4 bg-white flex gap-2 flex-shrink-0">
                            <Button onClick={() => handleStatus('approved')} disabled={updating || item.status === 'approved'}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 gap-1.5 text-sm">
                                <CheckCircle className="w-4 h-4" /> اعتماد
                            </Button>
                            <Button onClick={() => handleStatus('rejected')} disabled={updating || item.status === 'rejected'}
                                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold h-10 gap-1.5 text-sm">
                                <XCircle className="w-4 h-4" /> رفض
                            </Button>
                            <Button onClick={() => handleStatus('flagged')} disabled={updating || item.status === 'flagged'}
                                variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50 h-10 px-3">
                                <Flag className="w-4 h-4" />
                            </Button>
                            <Button
                                onClick={handleDelete}
                                disabled={deleting}
                                variant="outline"
                                className={`h-10 px-3 transition-all ${
                                    confirmDelete
                                        ? 'border-red-500 bg-red-500 text-white hover:bg-red-600'
                                        : 'border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500 hover:bg-red-50'
                                }`}
                                title={confirmDelete ? 'اضغط مرة أخرى للتأكيد' : 'حذف'}
                            >
                                <Trash2 className="w-4 h-4" />
                                {confirmDelete && <span className="text-xs mr-1">تأكيد؟</span>}
                            </Button>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
