'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Play, Star, BrainCircuit, Clock, CheckCircle, XCircle, Flag, Eye, ChevronDown, ChevronUp, ExternalLink, User, Sparkles } from 'lucide-react';
import { MediaItem } from '../types';
import { getYouTubeId } from '../hooks/useMediaData';

// كاش مصغرات R2 في الـ client
const r2ThumbCache = new Map<string, string | null>();

/** يولّد مصغرة من فيديو R2 عبر canvas — lazy بمجرد ظهور العنصر في الشاشة */
function useR2Thumb(url: string, enabled: boolean): string | null {
    const [thumb, setThumb] = useState<string | null>(() => r2ThumbCache.get(url) ?? null);
    const triedRef = useRef(false);

    useEffect(() => {
        if (!enabled || !url || triedRef.current || r2ThumbCache.has(url)) return;
        triedRef.current = true;

        const proxyUrl = `/api/media/proxy-video?url=${encodeURIComponent(url)}`;
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.preload = 'metadata';
        video.muted = true;

        const capture = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 320; canvas.height = 180;
                canvas.getContext('2d')?.drawImage(video, 0, 0, 320, 180);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
                r2ThumbCache.set(url, dataUrl);
                setThumb(dataUrl);
            } catch { r2ThumbCache.set(url, null); }
            video.src = '';
        };

        video.addEventListener('loadedmetadata', () => {
            video.currentTime = Math.min(2, video.duration * 0.1 || 1);
        });
        video.addEventListener('seeked', capture);
        video.addEventListener('error', () => { r2ThumbCache.set(url, null); video.src = ''; });
        video.src = proxyUrl;

        return () => { video.src = ''; };
    }, [url, enabled]);

    return thumb;
}

// كاش TikTok thumbnails في الـ client
const tiktokThumbCache = new Map<string, string | null>();

function useTikTokThumb(url: string): string | null {
    const [thumb, setThumb] = useState<string | null>(tiktokThumbCache.get(url) ?? null);

    useEffect(() => {
        if (!url.includes('tiktok')) return;
        if (tiktokThumbCache.has(url)) { setThumb(tiktokThumbCache.get(url) ?? null); return; }

        fetch(`/api/media/tiktok-thumb?url=${encodeURIComponent(url)}`)
            .then(r => r.json())
            .then(d => {
                tiktokThumbCache.set(url, d.thumbnail || null);
                setThumb(d.thumbnail || null);
            })
            .catch(() => { tiktokThumbCache.set(url, null); });
    }, [url]);

    return thumb;
}

interface Props {
    items: MediaItem[];
    loading: boolean;
    onSelect: (item: MediaItem) => void;
    selectedId?: string;
    // Bulk selection
    selectedIds: Set<string>;
    onToggleSelect: (id: string) => void;
    onToggleGroupSelect: (ids: string[]) => void;
}

const STATUS_BADGE: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    pending:  { label: 'بانتظار التحليل', cls: 'bg-amber-500/95 text-white',   icon: <Clock className="w-2.5 h-2.5" />     },
    approved: { label: 'معتمد ومزامَن', cls: 'bg-emerald-600/95 text-white', icon: <CheckCircle className="w-2.5 h-2.5" /> },
    rejected: { label: 'مرفوض',         cls: 'bg-rose-500/95 text-white',    icon: <XCircle className="w-2.5 h-2.5" />    },
    flagged:  { label: 'تنبيه',          cls: 'bg-orange-500/95 text-white',  icon: <Flag className="w-2.5 h-2.5" />       },
};

function getThumbnailUrl(item: MediaItem): string | null {
    if (item.thumbnailUrl) return item.thumbnailUrl;
    if (item.type === 'image') return item.url;
    const ytId = getYouTubeId(item.url);
    if (ytId) return `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
    return null;
}

function getPlatformBadge(url: string) {
    if (url.includes('youtu')) return { label: 'YouTube', cls: 'bg-red-600', dot: '▶' };
    if (url.includes('tiktok')) return { label: 'TikTok',  cls: 'bg-black',  dot: '♪' };
    if (url.includes('vimeo'))  return { label: 'Vimeo',   cls: 'bg-sky-600', dot: '▶' };
    return null;
}

// ── MediaCard ──────────────────────────────────────────────
function MediaCard({ item, onSelect, isSelected, isChecked, onToggleCheck }: {
    item: MediaItem;
    onSelect: () => void;
    isSelected: boolean;
    isChecked: boolean;
    onToggleCheck: (e: React.MouseEvent) => void;
}) {
    const badge    = STATUS_BADGE[item.status] || STATUS_BADGE.pending;
    const ytThumb  = getThumbnailUrl(item);
    const tkThumb  = useTikTokThumb(item.url);
    const isR2Vid  = item.type === 'video' && item.sourceType === 'r2' && !item.thumbnailUrl;
    const r2Thumb  = useR2Thumb(item.url, isR2Vid && !ytThumb && !tkThumb);
    const thumb    = ytThumb || tkThumb || r2Thumb;
    const platform = getPlatformBadge(item.url);
    const isExt    = !!(item.url.includes('youtu') || item.url.includes('tiktok') || item.url.includes('vimeo'));

    return (
        <div className="relative group">
            {/* Checkbox overlay */}
            <div
                onClick={onToggleCheck}
                className={`absolute top-2 left-2 z-20 w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all
                    ${isChecked
                        ? 'bg-emerald-600 border-emerald-600 shadow-sm'
                        : 'bg-black/40 border-white/70 opacity-0 group-hover:opacity-100 hover:border-white'}`}
            >
                {isChecked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
            </div>

            <button
                onClick={onSelect}
                className={`group relative rounded-xl overflow-hidden bg-slate-900 aspect-video text-right transition-all focus:outline-none w-full cursor-pointer
                    ${isSelected ? 'ring-2 ring-emerald-500 ring-offset-2 shadow-xl scale-[1.01]' : ''}
                    ${isChecked  ? 'ring-2 ring-emerald-400 ring-offset-1' : 'hover:shadow-lg hover:scale-[1.02]'}`}
            >
                {/* Thumbnail */}
                {thumb ? (
                    <img
                        src={thumb}
                        alt={item.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950">
                        <Play className="w-10 h-10 text-white/20" />
                    </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/35" />

                {/* Top badges */}
                <div className="absolute top-2 right-2 left-2 flex justify-between items-start gap-1 z-10">
                    <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold shadow-xs ${badge.cls}`}>
                        {badge.icon} {badge.label}
                    </span>
                    <div className="flex items-center gap-1">
                        {item.overallScore ? (
                            <span className="flex items-center gap-1 bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded-md text-[10px] font-black shadow-xs">
                                <Sparkles className="w-2.5 h-2.5 fill-slate-950 text-slate-950" /> {item.overallScore} OVR
                            </span>
                        ) : item.aiRating ? (
                            <span className="flex items-center gap-0.5 bg-purple-600/90 text-white px-1.5 py-0.5 rounded-md text-[10px] font-bold shadow-xs">
                                <Star className="w-2.5 h-2.5 fill-yellow-300 text-yellow-300" /> {item.aiRating}
                            </span>
                        ) : null}

                        {platform ? (
                            <span className={`${platform.cls} text-white px-1.5 py-0.5 rounded-md text-[10px] font-bold shadow-xs`}>
                                {platform.label}
                            </span>
                        ) : item.sourceType === 'r2' ? (
                            <span className="bg-slate-900/90 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-md text-[9px] font-bold shadow-xs">
                                📱 الموبايل
                            </span>
                        ) : null}
                    </div>
                </div>

                {/* Play button center */}
                {item.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md
                            ${isExt ? 'bg-white/25 group-hover:bg-white/40' : 'bg-white/20 group-hover:bg-white/30'}`}>
                            {isExt
                                ? <ExternalLink className="w-4 h-4 text-white" />
                                : <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                            }
                        </div>
                    </div>
                )}

                {/* AI analyzed indicator */}
                {item.aiAnalysis && (
                    <div className="absolute bottom-7 left-2 z-10">
                        <span className="flex items-center gap-1 bg-purple-600/90 text-white px-1.5 py-0.5 rounded text-[9px] font-bold shadow-xs">
                            <BrainCircuit className="w-2.5 h-2.5" /> محلل
                        </span>
                    </div>
                )}

                {/* Bottom info */}
                <div className="absolute bottom-0 right-0 left-0 px-2.5 py-2 z-10">
                    <p className="text-white text-[11px] font-bold truncate leading-tight">{item.title}</p>
                    <div className="flex items-center justify-between mt-0.5">
                        <span className="text-white/60 text-[10px]">{item.category || 'مهارات'}</span>
                        <div className="flex items-center gap-1.5">
                            {item.fileSize && item.fileSize > 0 && (
                                <span className="text-white/50 text-[9px]">
                                    {item.fileSize >= 1024 * 1024
                                        ? `${(item.fileSize / 1024 / 1024).toFixed(1)}MB`
                                        : `${(item.fileSize / 1024).toFixed(0)}KB`}
                                </span>
                            )}
                            {item.views > 0 && (
                                <span className="text-white/60 text-[10px] flex items-center gap-0.5">
                                    <Eye className="w-2.5 h-2.5" /> {item.views}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </button>
        </div>
    );
}

// ── PlayerGroup ─────────────────────────────────────────────
function PlayerGroup({ userId, userName, userImage, items, onSelect, selectedId, selectedIds, onToggleSelect, onToggleGroupSelect }: {
    userId: string;
    userName: string;
    userImage: string;
    items: MediaItem[];
    onSelect: (item: MediaItem) => void;
    selectedId?: string;
    selectedIds: Set<string>;
    onToggleSelect: (id: string) => void;
    onToggleGroupSelect: (ids: string[]) => void;
}) {
    const [open, setOpen] = useState(true);
    const [imgError, setImgError] = useState(false);
    const videos = items.filter(i => i.type === 'video');
    const images = items.filter(i => i.type === 'image');
    const pending = items.filter(i => i.status === 'pending').length;
    const approved = items.filter(i => i.status === 'approved').length;
    const initial = userName.charAt(0) || '?';
    const allIds = items.map(i => i.id);
    const allChecked = allIds.length > 0 && allIds.every(id => selectedIds.has(id));
    const someChecked = allIds.some(id => selectedIds.has(id));

    // استخراج التقييم الكروي الأحدث إن وجد
    const playerOVR = items.find(i => i.overallScore)?.overallScore;

    return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow">
            {/* Group Header */}
            <div className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/80 transition-colors text-right">
                {/* Group checkbox */}
                <div
                    onClick={e => { e.stopPropagation(); onToggleGroupSelect(allIds); }}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer flex-shrink-0 transition-all
                        ${allChecked
                            ? 'bg-emerald-600 border-emerald-600 shadow-sm'
                            : someChecked
                                ? 'bg-emerald-100 border-emerald-400'
                                : 'border-slate-300 hover:border-emerald-400'}`}
                >
                    {allChecked  && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    {someChecked && !allChecked && <div className="w-2 h-0.5 bg-emerald-600 rounded" />}
                </div>

                <button
                    onClick={() => setOpen(o => !o)}
                    className="flex-1 flex items-center gap-3 text-right cursor-pointer"
                >
                    {/* Avatar */}
                    {userImage && !imgError ? (
                        <img
                            src={userImage}
                            alt={userName}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 flex-shrink-0 shadow-2xs"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-700 font-bold text-sm shadow-2xs">
                            {imgError ? initial : <User className="w-5 h-5 text-emerald-600" />}
                        </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0 text-right">
                        <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900 text-sm truncate">{userName}</p>
                            {playerOVR && (
                                <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-md">
                                    {playerOVR} OVR
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            {videos.length > 0 && <span className="text-[11px] text-slate-400 font-medium">{videos.length} فيديو</span>}
                            {images.length > 0 && <span className="text-[11px] text-slate-400 font-medium">{images.length} صورة</span>}
                            {pending > 0 && (
                                <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                                    {pending} بانتظار التحليل
                                </span>
                            )}
                            {approved > 0 && (
                                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                                    {approved} معتمد
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Toggle icon */}
                    <div className="text-slate-400 flex-shrink-0 p-1 rounded-lg hover:bg-slate-100">
                        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                </button>
            </div>

            {/* Media Grid */}
            {open && (
                <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 border-t border-slate-100 pt-3.5 bg-slate-50/40">
                    {items.map(item => (
                        <MediaCard
                            key={item.id}
                            item={item}
                            onSelect={() => onSelect(item)}
                            isSelected={item.id === selectedId}
                            isChecked={selectedIds.has(item.id)}
                            onToggleCheck={e => { e.stopPropagation(); onToggleSelect(item.id); }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ── MediaGrid (main export) ──────────────────────────────────
export function MediaGrid({ items, loading, onSelect, selectedId, selectedIds, onToggleSelect, onToggleGroupSelect }: Props) {
    // تجميع بالاعب
    const grouped = useMemo(() => {
        const map = new Map<string, { userName: string; userImage: string; items: MediaItem[] }>();
        for (const item of items) {
            if (!map.has(item.userId)) {
                map.set(item.userId, { userName: item.userName, userImage: item.userImage || '', items: [] });
            }
            map.get(item.userId)!.items.push(item);
        }
        // ترتيب: الأكثر محتوى معلقاً أولاً
        return [...map.entries()].sort((a, b) => {
            const aPending = a[1].items.filter(i => i.status === 'pending').length;
            const bPending = b[1].items.filter(i => i.status === 'pending').length;
            return bPending - aPending;
        });
    }, [items]);

    if (loading) return (
        <div className="space-y-4">
            {[1, 2, 3].map(i => (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse" />
                        <div className="flex-1 space-y-1.5">
                            <div className="h-3.5 bg-slate-200 rounded animate-pulse w-32" />
                            <div className="h-2.5 bg-slate-100 rounded animate-pulse w-20" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[1,2,3,4].map(j => <div key={j} className="aspect-video bg-slate-200 rounded-xl animate-pulse" />)}
                    </div>
                </div>
            ))}
        </div>
    );

    if (grouped.length === 0) return (
        <div className="bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center py-20 text-slate-400 shadow-xs">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-3 text-emerald-600">
                <Play className="w-8 h-8 fill-emerald-600/20" />
            </div>
            <p className="font-bold text-slate-700 text-sm">لا توجد وسائط مطابقة للبحث</p>
            <p className="text-xs text-slate-400 mt-1">جرّب تغيير الفلاتر أو البحث باسم لاعب آخر</p>
        </div>
    );

    return (
        <div className="space-y-4 pb-12">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
                <span>استعراض الفيديوهات مجمعة لكل لاعب ({grouped.length} لاعب مسجل)</span>
                <span>إجمالي الملفات: {items.length}</span>
            </div>
            {grouped.map(([userId, { userName, userImage, items: playerItems }]) => (
                <PlayerGroup
                    key={userId}
                    userId={userId}
                    userName={userName}
                    userImage={userImage}
                    items={playerItems}
                    onSelect={onSelect}
                    selectedId={selectedId}
                    selectedIds={selectedIds}
                    onToggleSelect={onToggleSelect}
                    onToggleGroupSelect={onToggleGroupSelect}
                />
            ))}
        </div>
    );
}
