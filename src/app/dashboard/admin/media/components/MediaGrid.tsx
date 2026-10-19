'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    Play, Star, BrainCircuit, Clock, CheckCircle, XCircle, Flag,
    Eye, ChevronDown, ChevronUp, ExternalLink, User, Sparkles, Cloud,
    PlaySquare, Music2, Image as ImageIcon
} from 'lucide-react';
import { MediaItem, detectMediaSource, DetectedSource } from '../types';
import { getYouTubeId } from '../hooks/useMediaData';

// Cache for R2 video thumbnails in client
const r2ThumbCache = new Map<string, string | null>();

/** Extracts a thumbnail frame from an R2 video via canvas */
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

// Cache for TikTok thumbnails in client
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
    selectedIds: Set<string>;
    onToggleSelect: (id: string) => void;
    onToggleGroupSelect: (ids: string[]) => void;
}

// ── Helpers ────────────────────────────────────────────────────────
function formatVideoDisplayTitle(title: string, index?: number): string {
    const trimmed = (title || '').trim();
    if (!trimmed || /^\d{5,}$/.test(trimmed) || trimmed.startsWith('فيديو المنصة')) {
        return index ? `مقطع فيديو #${index}` : 'مقطع فيديو';
    }
    return trimmed;
}

function formatArabicDate(date: Date | string): string {
    try {
        const d = typeof date === 'string' ? new Date(date) : date;
        if (!d || isNaN(d.getTime())) return '';
        const diffMs = Date.now() - d.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'اليوم';
        if (diffDays === 1) return 'أمس';
        if (diffDays < 7) return `منذ ${diffDays} أيام`;
        return d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
    } catch {
        return '';
    }
}

const STATUS_PILL: Record<string, { label: string; dot: string; text: string; bg: string }> = {
    pending:  { label: 'بانتظار التحليل', dot: 'bg-amber-500',   text: 'text-amber-800',  bg: 'bg-amber-50 border-amber-200/90' },
    approved: { label: 'معتمد ومزامَن',  dot: 'bg-emerald-500', text: 'text-emerald-800', bg: 'bg-emerald-50 border-emerald-200/90' },
    rejected: { label: 'مرفوض',          dot: 'bg-rose-500',    text: 'text-rose-800',    bg: 'bg-rose-50 border-rose-200/90' },
    flagged:  { label: 'تنبيه / مراقبة',  dot: 'bg-orange-500',  text: 'text-orange-800',  bg: 'bg-orange-50 border-orange-200/90' },
};

function getThumbnailUrl(item: MediaItem): string | null {
    if (item.thumbnailUrl) return item.thumbnailUrl;
    if (item.type === 'image') return item.url;
    const ytId = getYouTubeId(item.url);
    if (ytId) return `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
    return null;
}

function getSourceBadge(source: DetectedSource) {
    switch (source) {
        case 'direct':
            return { label: 'منصة', cls: 'bg-emerald-600 text-white', icon: Cloud };
        case 'youtube':
            return { label: 'YouTube', cls: 'bg-red-600 text-white', icon: PlaySquare };
        case 'tiktok':
            return { label: 'TikTok', cls: 'bg-slate-950 text-white', icon: Music2 };
        case 'vimeo':
            return { label: 'Vimeo', cls: 'bg-sky-600 text-white', icon: PlaySquare };
        case 'image':
            return { label: 'صورة', cls: 'bg-indigo-600 text-white', icon: ImageIcon };
        default:
            return { label: 'رابط', cls: 'bg-slate-700 text-white', icon: ExternalLink };
    }
}

// ── Clean Daylight MediaCard ─────────────────────────────────────────
function MediaCard({ item, onSelect, isSelected, isChecked, onToggleCheck, index }: {
    item: MediaItem;
    onSelect: () => void;
    isSelected: boolean;
    isChecked: boolean;
    onToggleCheck: (e: React.MouseEvent) => void;
    index?: number;
}) {
    const statusInfo = STATUS_PILL[item.status] || STATUS_PILL.pending;
    const source     = detectMediaSource(item);
    const sourceInfo = getSourceBadge(source);
    const ytThumb    = getThumbnailUrl(item);
    const tkThumb    = useTikTokThumb(item.url);
    const isR2Vid    = item.type === 'video' && source === 'direct' && !item.thumbnailUrl;
    const r2Thumb    = useR2Thumb(item.url, isR2Vid && !ytThumb && !tkThumb);
    const thumb      = ytThumb || tkThumb || r2Thumb;
    const isExt      = source !== 'direct' && item.type === 'video';

    const displayTitle = formatVideoDisplayTitle(item.title, index);

    return (
        <div
            onClick={onSelect}
            className={`group relative flex flex-col bg-white rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden text-right
                ${isSelected
                    ? 'ring-2 ring-emerald-500 border-emerald-500 shadow-lg -translate-y-0.5'
                    : isChecked
                        ? 'ring-2 ring-emerald-400 border-emerald-300 shadow-sm'
                        : 'border-slate-200/90 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5'}`}
        >
            {/* ── ZONE 1: THUMBNAIL AREA (16:9 Aspect Ratio) ── */}
            <div className="relative aspect-video w-full bg-slate-950 overflow-hidden flex items-center justify-center select-none">
                {thumb ? (
                    <img
                        src={thumb}
                        alt={displayTitle}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950/80 p-4">
                        <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-xs border border-white/15 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 transition-all shadow-md">
                            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                        </div>
                    </div>
                )}

                {/* Subtle vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25 pointer-events-none" />

                {/* Top-Right: Selection Checkbox */}
                <div
                    onClick={e => { e.stopPropagation(); onToggleCheck(e); }}
                    className={`absolute top-2 right-2 z-20 w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all
                        ${isChecked
                            ? 'bg-emerald-600 border-emerald-600 shadow-sm'
                            : 'bg-black/40 border-white/70 opacity-0 group-hover:opacity-100 hover:border-white'}`}
                >
                    {isChecked && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                </div>

                {/* Top-Left: Discrete Source Pill */}
                <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
                    {source === 'youtube' && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold text-white bg-red-600 shadow-xs backdrop-blur-md">
                            <PlaySquare className="w-2.5 h-2.5" /> YouTube
                        </span>
                    )}
                    {source === 'tiktok' && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold text-white bg-slate-950 shadow-xs backdrop-blur-md">
                            <Music2 className="w-2.5 h-2.5" /> TikTok
                        </span>
                    )}
                    {source === 'direct' && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-emerald-300 bg-black/50 backdrop-blur-md border border-emerald-500/30">
                            <Cloud className="w-2.5 h-2.5" /> منصة
                        </span>
                    )}
                    {source === 'external' && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold text-white bg-sky-600 shadow-xs">
                            <ExternalLink className="w-2.5 h-2.5" /> رابط
                        </span>
                    )}
                </div>

                {/* Center Hover Play Cue */}
                {thumb && item.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/25">
                        <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                            {isExt ? <ExternalLink className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                        </div>
                    </div>
                )}

                {/* Bottom Overlays: OVR & File Size */}
                <div className="absolute bottom-2 left-2 right-2 z-10 flex items-center justify-between pointer-events-none">
                    {item.overallScore ? (
                        <span className="flex items-center gap-1 bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded-md text-[10px] font-black shadow-xs">
                            <Sparkles className="w-2.5 h-2.5 fill-slate-950 text-slate-950" /> {item.overallScore} OVR
                        </span>
                    ) : item.aiRating ? (
                        <span className="flex items-center gap-0.5 bg-indigo-600 text-white px-1.5 py-0.5 rounded-md text-[10px] font-bold shadow-xs">
                            <Star className="w-2.5 h-2.5 fill-yellow-300 text-yellow-300" /> {item.aiRating}
                        </span>
                    ) : <span />}

                    {item.fileSize && item.fileSize > 0 ? (
                        <span className="bg-black/60 backdrop-blur-xs text-white/90 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded">
                            {item.fileSize >= 1024 * 1024
                                ? `${(item.fileSize / 1024 / 1024).toFixed(1)} MB`
                                : `${(item.fileSize / 1024).toFixed(0)} KB`}
                        </span>
                    ) : null}
                </div>
            </div>

            {/* ── ZONE 2: CLEAN METADATA BODY (White Daylight Card) ── */}
            <div className="p-3 flex flex-col justify-between gap-2.5 flex-1 bg-white">
                <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate leading-tight" title={item.title}>
                        {displayTitle}
                    </h4>
                    {item.description && (
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {item.description}
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px]">
                    {/* Status Pill with colored dot */}
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.bg} ${statusInfo.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                        {statusInfo.label}
                    </span>

                    {/* Upload Date */}
                    <span className="text-slate-400 font-medium">
                        {formatArabicDate(item.uploadDate)}
                    </span>
                </div>
            </div>
        </div>
    );
}

// ── PlayerGroup (Daylight Team Roster Card) ─────────────────────────────
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

    const directVideos = items.filter(i => i.type === 'video' && detectMediaSource(i) === 'direct').length;
    const youtubeVideos = items.filter(i => i.type === 'video' && detectMediaSource(i) === 'youtube').length;
    const otherVideos = items.filter(i => i.type === 'video' && !['direct', 'youtube'].includes(detectMediaSource(i))).length;
    const images = items.filter(i => i.type === 'image').length;

    const pending = items.filter(i => i.status === 'pending').length;
    const approved = items.filter(i => i.status === 'approved').length;
    const initial = userName.charAt(0) || '?';
    const allIds = items.map(i => i.id);
    const allChecked = allIds.length > 0 && allIds.every(id => selectedIds.has(id));
    const someChecked = allIds.some(id => selectedIds.has(id));

    // Player metadata from first item
    const firstItem = items[0];
    const playerOVR = items.find(i => i.overallScore)?.overallScore;
    const ageCategory = firstItem?.age
        ? firstItem.age <= 12 ? `براعم U-11 (${firstItem.age} سنة)` : firstItem.age <= 17 ? `ناشئين U-17 (${firstItem.age} سنة)` : `${firstItem.age} سنة`
        : (firstItem?.category && !['سحابي مباشر', 'روابط خارجية', 'YouTube', 'TikTok'].includes(firstItem.category)) ? firstItem.category : null;

    return (
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow">
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
                    {allChecked && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    )}
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
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-black text-slate-900 text-sm truncate">{userName}</p>
                            {playerOVR && (
                                <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-md shadow-2xs">
                                    {playerOVR} OVR
                                </span>
                            )}
                            {ageCategory && (
                                <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.2 rounded-full font-bold">
                                    {ageCategory}
                                </span>
                            )}
                            {firstItem?.position && (
                                <span className="text-[10px] text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.2 rounded-md">
                                    {firstItem.position}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
                            {directVideos > 0 && (
                                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-bold">
                                    ☁️ {directVideos} رفع مباشر
                                </span>
                            )}
                            {youtubeVideos > 0 && (
                                <span className="text-[10px] text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded font-bold">
                                    🔴 {youtubeVideos} YouTube
                                </span>
                            )}
                            {otherVideos > 0 && (
                                <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded font-medium">
                                    🌐 {otherVideos} خارجي
                                </span>
                            )}
                            {images > 0 && (
                                <span className="text-[10px] text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.2 rounded font-medium">
                                    {images} صورة
                                </span>
                            )}
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
                    <div className="text-slate-400 flex-shrink-0 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                </button>
            </div>

            {/* Media Grid (Spacious 1 to 4 responsive columns with generous breathing room) */}
            {open && (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 border-t border-slate-100 bg-slate-50/40">
                    {items.map((item, idx) => (
                        <MediaCard
                            key={item.id}
                            item={item}
                            index={idx + 1}
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

// ── MediaGrid (Main Export) ──────────────────────────────────
export function MediaGrid({ items, loading, onSelect, selectedId, selectedIds, onToggleSelect, onToggleGroupSelect }: Props) {
    // Group by player
    const grouped = useMemo(() => {
        const map = new Map<string, { userName: string; userImage: string; items: MediaItem[] }>();
        for (const item of items) {
            if (!map.has(item.userId)) {
                map.set(item.userId, { userName: item.userName, userImage: item.userImage || '', items: [] });
            }
            map.get(item.userId)!.items.push(item);
        }
        // Sort: most pending content first
        return [...map.entries()].sort((a, b) => {
            const aPending = a[1].items.filter(i => i.status === 'pending').length;
            const bPending = b[1].items.filter(i => i.status === 'pending').length;
            return bPending - aPending;
        });
    }, [items]);

    if (loading) return (
        <div className="space-y-4">
            {[1, 2, 3].map(i => (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse" />
                        <div className="flex-1 space-y-1.5">
                            <div className="h-3.5 bg-slate-200 rounded animate-pulse w-32" />
                            <div className="h-2.5 bg-slate-100 rounded animate-pulse w-20" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[1, 2, 3, 4].map(j => <div key={j} className="aspect-video bg-slate-200 rounded-xl animate-pulse" />)}
                    </div>
                </div>
            ))}
        </div>
    );

    if (grouped.length === 0) return (
        <div className="bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center py-20 text-slate-400 shadow-xs">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-3 text-emerald-600 border border-emerald-100">
                <Play className="w-8 h-8 fill-emerald-600/20" />
            </div>
            <p className="font-bold text-slate-700 text-sm">لا توجد وسائط مطابقة للبحث أو الفلتر المختار</p>
            <p className="text-xs text-slate-400 mt-1">جرّب تغيير مصدر الفيديو أو اختيار فلاتر أخرى من شريط التحكم</p>
        </div>
    );

    return (
        <div className="space-y-4 pb-12">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
                <span>استعراض الفيديوهات مجمعة لكل لاعب ({grouped.length} لاعب مسجل)</span>
                <span>إجمالي الملفات المعروضة: {items.length}</span>
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
