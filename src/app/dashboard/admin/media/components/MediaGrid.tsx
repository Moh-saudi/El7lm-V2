'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    Play, Star, BrainCircuit, Clock, CheckCircle, XCircle, Flag,
    Eye, ChevronDown, ChevronUp, ExternalLink, User, Sparkles, Cloud,
    PlaySquare, Music2, Image as ImageIcon, ShieldCheck, Film, Layers
} from 'lucide-react';
import { MediaItem, detectMediaSource, DetectedSource } from '../types';
import { getYouTubeId } from '../hooks/useMediaData';

// Cache for R2 video thumbnails in client
const r2ThumbCache = new Map<string, string | null>();

/** Extracts a thumbnail frame from an R2 video via canvas (lazy on view) */
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
    // Bulk selection
    selectedIds: Set<string>;
    onToggleSelect: (id: string) => void;
    onToggleGroupSelect: (ids: string[]) => void;
}

const STATUS_BADGE: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    pending:  { label: 'بانتظار التحليل', cls: 'bg-amber-500/90 text-white border border-amber-400/40', icon: <Clock className="w-2.5 h-2.5" /> },
    approved: { label: 'معتمد ومزامَن', cls: 'bg-emerald-600/95 text-white border border-emerald-400/40', icon: <CheckCircle className="w-2.5 h-2.5" /> },
    rejected: { label: 'مرفوض',         cls: 'bg-rose-600/90 text-white border border-rose-400/40',       icon: <XCircle className="w-2.5 h-2.5" /> },
    flagged:  { label: 'تنبيه / مراقبة', cls: 'bg-orange-500/90 text-white border border-orange-400/40', icon: <Flag className="w-2.5 h-2.5" /> },
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
            return { label: 'سحابي R2', cls: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40', icon: Cloud };
        case 'youtube':
            return { label: 'YouTube', cls: 'bg-red-500/20 text-red-300 border border-red-500/40', icon: PlaySquare };
        case 'tiktok':
            return { label: 'TikTok', cls: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40', icon: Music2 };
        case 'vimeo':
            return { label: 'Vimeo', cls: 'bg-sky-500/20 text-sky-300 border border-sky-500/40', icon: PlaySquare };
        case 'image':
            return { label: 'صورة', cls: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40', icon: ImageIcon };
        default:
            return { label: 'خارجي', cls: 'bg-slate-700/60 text-slate-300 border border-slate-600', icon: ExternalLink };
    }
}

// ── Cinema MediaCard ──────────────────────────────────────────────
function MediaCard({ item, onSelect, isSelected, isChecked, onToggleCheck }: {
    item: MediaItem;
    onSelect: () => void;
    isSelected: boolean;
    isChecked: boolean;
    onToggleCheck: (e: React.MouseEvent) => void;
}) {
    const badge      = STATUS_BADGE[item.status] || STATUS_BADGE.pending;
    const source     = detectMediaSource(item);
    const sourceInfo = getSourceBadge(source);
    const ytThumb    = getThumbnailUrl(item);
    const tkThumb    = useTikTokThumb(item.url);
    const isR2Vid    = item.type === 'video' && source === 'direct' && !item.thumbnailUrl;
    const r2Thumb    = useR2Thumb(item.url, isR2Vid && !ytThumb && !tkThumb);
    const thumb      = ytThumb || tkThumb || r2Thumb;
    const isExt      = source !== 'direct' && item.type === 'video';

    // Age / category helper
    const ageCategory = item.age
        ? item.age <= 12 ? 'براعم U-11' : item.age <= 17 ? 'ناشئين U-17' : 'كبار'
        : item.category || 'موهبة';

    return (
        <div className="relative group text-right">
            {/* Checkbox overlay */}
            <div
                onClick={onToggleCheck}
                className={`absolute top-2 left-2 z-20 w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all
                    ${isChecked
                        ? 'bg-emerald-600 border-emerald-500 shadow-md'
                        : 'bg-black/60 border-slate-500 opacity-0 group-hover:opacity-100 hover:border-emerald-400'}`}
            >
                {isChecked && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                )}
            </div>

            <button
                onClick={onSelect}
                className={`group relative rounded-xl overflow-hidden bg-slate-950 aspect-video text-right transition-all focus:outline-none w-full cursor-pointer border
                    ${isSelected
                        ? 'ring-2 ring-emerald-500 border-emerald-500 shadow-2xl scale-[1.01]'
                        : isChecked
                            ? 'ring-2 ring-emerald-400/80 border-emerald-500/80'
                            : 'border-slate-800 hover:border-slate-700 hover:shadow-xl hover:scale-[1.015]'}`}
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
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-black">
                        <Play className="w-10 h-10 text-slate-700 group-hover:text-emerald-500/40 transition-colors" />
                    </div>
                )}

                {/* Cinema Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-black/60" />

                {/* Top badges: Status & OVR / Source */}
                <div className="absolute top-2 right-2 left-2 flex justify-between items-start gap-1 z-10">
                    <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold shadow-md ${badge.cls}`}>
                        {badge.icon} {badge.label}
                    </span>

                    <div className="flex items-center gap-1">
                        {item.overallScore ? (
                            <span className="flex items-center gap-1 bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded-md text-[10px] font-black shadow-md">
                                <Sparkles className="w-2.5 h-2.5 fill-slate-950 text-slate-950" /> {item.overallScore} OVR
                            </span>
                        ) : item.aiRating ? (
                            <span className="flex items-center gap-0.5 bg-cyan-600/90 text-white px-1.5 py-0.5 rounded-md text-[10px] font-bold shadow-md">
                                <Star className="w-2.5 h-2.5 fill-yellow-300 text-yellow-300" /> {item.aiRating}
                            </span>
                        ) : null}

                        {/* Source Badge */}
                        <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold backdrop-blur-xs ${sourceInfo.cls}`}>
                            <sourceInfo.icon className="w-2.5 h-2.5" />
                            <span>{sourceInfo.label}</span>
                        </span>
                    </div>
                </div>

                {/* Play icon center */}
                {item.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-lg backdrop-blur-xs
                            ${isExt ? 'bg-white/20 group-hover:bg-emerald-500/40' : 'bg-black/50 border border-white/20 group-hover:bg-emerald-600 group-hover:border-emerald-500'}`}>
                            {isExt
                                ? <ExternalLink className="w-4 h-4 text-white" />
                                : <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                            }
                        </div>
                    </div>
                )}

                {/* AI / Vision Telemetry Badge */}
                {item.aiAnalysis && (
                    <div className="absolute bottom-9 left-2 z-10">
                        <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded text-[9px] font-bold shadow-md backdrop-blur-xs">
                            <BrainCircuit className="w-2.5 h-2.5" /> تقرير كشفي معتمد
                        </span>
                    </div>
                )}

                {/* Bottom info */}
                <div className="absolute bottom-0 right-0 left-0 px-2.5 py-2 z-10 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
                    <p className="text-white text-[11px] font-bold truncate leading-tight">{item.title}</p>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                        <span className="text-amber-400 font-bold">{ageCategory}</span>
                        <div className="flex items-center gap-1.5">
                            {item.fileSize && item.fileSize > 0 && (
                                <span className="font-mono text-[9px] text-slate-400">
                                    {item.fileSize >= 1024 * 1024
                                        ? `${(item.fileSize / 1024 / 1024).toFixed(1)}MB`
                                        : `${(item.fileSize / 1024).toFixed(0)}KB`}
                                </span>
                            )}
                            {item.views > 0 && (
                                <span className="flex items-center gap-0.5">
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

// ── PlayerGroup (Titanium Team Roster Card) ─────────────────────────────
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
        : firstItem?.category || 'موهبة صاعدة';

    return (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl transition-all">
            {/* Group Header */}
            <div className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800/50 transition-colors text-right">
                {/* Group checkbox */}
                <div
                    onClick={e => { e.stopPropagation(); onToggleGroupSelect(allIds); }}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer flex-shrink-0 transition-all
                        ${allChecked
                            ? 'bg-emerald-600 border-emerald-500 shadow-md'
                            : someChecked
                                ? 'bg-emerald-950 border-emerald-500'
                                : 'border-slate-700 hover:border-emerald-400'}`}
                >
                    {allChecked && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                    {someChecked && !allChecked && <div className="w-2 h-0.5 bg-emerald-400 rounded" />}
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
                            className="w-10 h-10 rounded-full object-cover border border-slate-700 flex-shrink-0 shadow-md"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 text-emerald-400 font-bold text-sm shadow-md">
                            {imgError ? initial : <User className="w-5 h-5 text-emerald-400" />}
                        </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0 text-right">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-black text-white text-sm truncate">{userName}</p>
                            {playerOVR && (
                                <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-md shadow-xs">
                                    {playerOVR} OVR
                                </span>
                            )}
                            <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.2 rounded-full font-bold">
                                {ageCategory}
                            </span>
                            {firstItem?.position && (
                                <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.2 rounded-md">
                                    {firstItem.position}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
                            {directVideos > 0 && (
                                <span className="text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded font-bold">
                                    ☁️ {directVideos} رفع مباشر
                                </span>
                            )}
                            {youtubeVideos > 0 && (
                                <span className="text-[10px] text-red-300 bg-red-500/10 border border-red-500/20 px-1.5 py-0.2 rounded font-bold">
                                    🔴 {youtubeVideos} YouTube
                                </span>
                            )}
                            {otherVideos > 0 && (
                                <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded font-medium">
                                    🌐 {otherVideos} خارجي
                                </span>
                            )}
                            {images > 0 && (
                                <span className="text-[10px] text-sky-300 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.2 rounded font-medium">
                                    {images} صورة
                                </span>
                            )}
                            {pending > 0 && (
                                <span className="text-[10px] bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                                    {pending} بانتظار التحليل
                                </span>
                            )}
                            {approved > 0 && (
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                                    {approved} معتمد
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Toggle icon */}
                    <div className="text-slate-500 flex-shrink-0 p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
                        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                </button>
            </div>

            {/* Media Grid */}
            {open && (
                <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 border-t border-slate-800/80 pt-3.5 bg-slate-950/40">
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
                <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 animate-pulse" />
                        <div className="flex-1 space-y-1.5">
                            <div className="h-3.5 bg-slate-800 rounded animate-pulse w-32" />
                            <div className="h-2.5 bg-slate-800/60 rounded animate-pulse w-20" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[1, 2, 3, 4].map(j => <div key={j} className="aspect-video bg-slate-800 rounded-xl animate-pulse" />)}
                    </div>
                </div>
            ))}
        </div>
    );

    if (grouped.length === 0) return (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col items-center justify-center py-20 text-slate-400 shadow-xl">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-3 text-emerald-400 border border-slate-700">
                <Play className="w-8 h-8 fill-emerald-400/20" />
            </div>
            <p className="font-bold text-white text-sm">لا توجد وسائط مطابقة للبحث أو الفلتر المختار</p>
            <p className="text-xs text-slate-500 mt-1">جرّب تغيير مصدر الفيديو أو اختيار فلاتر أخرى من شريط التحكم</p>
        </div>
    );

    return (
        <div className="space-y-4 pb-12">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-1">
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
