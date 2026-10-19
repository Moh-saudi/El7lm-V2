'use client';

import React from 'react';
import {
    User, Play, CheckCircle2, MessageCircle, Trash2, Sparkles,
    Film, PlaySquare, Music2, AlertTriangle, XCircle, Clock
} from 'lucide-react';
import { MediaItem, detectMediaSource } from '../types';

interface Props {
    items: MediaItem[];
    selectedIds: Set<string>;
    onToggleSelect: (id: string) => void;
    onToggleGroupSelect: (ids: string[]) => void;
    onItemClick: (item: MediaItem) => void;
    onQuickApprove: (item: MediaItem) => void;
    onQuickDelete: (item: MediaItem) => void;
    isDeleting?: boolean;
}

interface PlayerGroup {
    playerId: string;
    playerName: string;
    playerImage?: string;
    playerPosition?: string;
    playerCountry?: string;
    playerPhone?: string;
    items: MediaItem[];
    maxScore: number;
    pendingCount: number;
    approvedCount: number;
}

export function PlayerDossierView({
    items,
    selectedIds,
    onToggleSelect,
    onToggleGroupSelect,
    onItemClick,
    onQuickApprove,
    onQuickDelete,
    isDeleting = false,
}: Props) {
    // ── Group by player ──
    const groups: PlayerGroup[] = React.useMemo(() => {
        const map = new Map<string, PlayerGroup>();

        items.forEach(item => {
            const pid = item.userId || 'unknown';
            let group = map.get(pid);
            if (!group) {
                group = {
                    playerId: pid,
                    playerName: item.userName || 'لاعب مسجل',
                    playerImage: item.userImage,
                    playerPosition: item.position || 'لاعب',
                    playerCountry: item.country,
                    playerPhone: item.userPhone,
                    items: [],
                    maxScore: 0,
                    pendingCount: 0,
                    approvedCount: 0,
                };
                map.set(pid, group);
            }
            group.items.push(item);
            const score = item.overallScore || item.aiRating || 0;
            if (score > group.maxScore) group.maxScore = score;
            if (item.status === 'pending') group.pendingCount++;
            if (item.status === 'approved') group.approvedCount++;
        });

        return Array.from(map.values()).sort((a, b) => b.items.length - a.items.length);
    }, [items]);

    if (groups.length === 0) {
        return (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-xs">
                <Film className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-slate-800 text-base">لا توجد ملفات لاعبين مطابقة</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 text-right" dir="rtl">
            {groups.map(group => {
                const groupIds = group.items.map(i => i.id);
                const allGroupSelected = groupIds.length > 0 && groupIds.every(id => selectedIds.has(id));
                const cleanPhone = (group.playerPhone || '').replace(/\D/g, '');
                const waUrl = cleanPhone.length >= 8
                    ? `https://wa.me/${cleanPhone.startsWith('0') ? '2' + cleanPhone : cleanPhone}?text=${encodeURIComponent(`مرحباً كابتن ${group.playerName}، بخصوص ملفك الرياضي في منصة الحلم: `)}`
                    : null;

                return (
                    <div
                        key={group.playerId}
                        className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden transition-all hover:border-slate-300 hover:shadow-md"
                    >
                        {/* ── Dossier Header ── */}
                        <div className="bg-slate-50/70 border-b border-slate-200/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                            {/* Left: Player Profile & Identity */}
                            <div className="flex items-center gap-3 min-w-0">
                                <input
                                    type="checkbox"
                                    checked={allGroupSelected}
                                    onChange={() => onToggleGroupSelect(groupIds)}
                                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                    title="تحديد كافة مقاطع اللاعب"
                                />

                                {group.playerImage ? (
                                    <img
                                        src={group.playerImage}
                                        alt={group.playerName}
                                        className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-xs"
                                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-emerald-100 border-2 border-white text-emerald-800 font-black flex items-center justify-center text-sm shadow-xs">
                                        {group.playerName.charAt(0)}
                                    </div>
                                )}

                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-900 text-sm">{group.playerName}</h3>
                                        <span className="px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 text-[10px] font-bold">
                                            {group.playerPosition}
                                        </span>
                                        {group.playerCountry && (
                                            <span className="text-[10px] text-slate-400">
                                                {group.playerCountry}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                                        <span>{group.items.length} مقطع فيديو</span>
                                        {group.maxScore > 0 && (
                                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                                                <Sparkles className="w-3 h-3 text-emerald-500" />
                                                أعلى تقييم: {group.maxScore} OVR
                                            </span>
                                        )}
                                        {group.pendingCount > 0 && (
                                            <span className="text-amber-600 font-bold">
                                                {group.pendingCount} بانتظار التحليل
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Quick Player Actions */}
                            <div className="flex items-center gap-2">
                                {waUrl && (
                                    <a
                                        href={waUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 hover:bg-green-600 text-green-700 hover:text-white border border-green-200 text-xs font-bold transition-colors shadow-2xs"
                                    >
                                        <MessageCircle className="w-3.5 h-3.5" />
                                        <span>واتساب اللاعب</span>
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* ── Horizontal Video Reel / Compact Grid ── */}
                        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {group.items.map(item => {
                                const isChecked = selectedIds.has(item.id);
                                const source = detectMediaSource(item);

                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => onItemClick(item)}
                                        className={`group relative rounded-xl border border-slate-200 bg-slate-50 overflow-hidden cursor-pointer transition-all hover:border-emerald-500 hover:shadow-md ${
                                            isChecked ? 'ring-2 ring-emerald-500 border-emerald-500' : ''
                                        }`}
                                    >
                                        {/* Thumbnail Container */}
                                        <div className="relative aspect-video bg-slate-900 overflow-hidden">
                                            {item.thumbnailUrl ? (
                                                <img
                                                    src={item.thumbnailUrl}
                                                    alt={item.title}
                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                                    <Play className="w-6 h-6 text-slate-500" />
                                                </div>
                                            )}

                                            {/* Hover Play Button */}
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg">
                                                    <Play className="w-4 h-4 fill-white ml-0.5" />
                                                </div>
                                            </div>

                                            {/* Checkbox */}
                                            <div
                                                onClick={e => { e.stopPropagation(); onToggleSelect(item.id); }}
                                                className={`absolute top-1.5 right-1.5 z-10 w-4.5 h-4.5 rounded border flex items-center justify-center cursor-pointer transition-all ${
                                                    isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-black/50 border-white/60 hover:border-white'
                                                }`}
                                            >
                                                {isChecked && (
                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>

                                            {/* Source Tag */}
                                            <div className="absolute bottom-1 right-1">
                                                {source === 'youtube' && (
                                                    <span className="px-1 py-0.2 rounded bg-red-600 text-white text-[8px] font-bold">
                                                        YouTube
                                                    </span>
                                                )}
                                                {source === 'tiktok' && (
                                                    <span className="px-1 py-0.2 rounded bg-slate-950 text-white text-[8px] font-bold">
                                                        TikTok
                                                    </span>
                                                )}
                                                {source === 'direct' && (
                                                    <span className="px-1 py-0.2 rounded bg-emerald-700 text-white text-[8px] font-bold">
                                                        سحابي
                                                    </span>
                                                )}
                                            </div>

                                            {/* Status Badge */}
                                            <div className="absolute top-1.5 left-1.5">
                                                {item.status === 'approved' && (
                                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white shadow-xs block" title="معتمد" />
                                                )}
                                                {item.status === 'pending' && (
                                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white shadow-xs block" title="بانتظار التحليل" />
                                                )}
                                                {item.status === 'flagged' && (
                                                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 ring-2 ring-white shadow-xs block" title="تنبيه" />
                                                )}
                                                {item.status === 'rejected' && (
                                                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white shadow-xs block" title="مرفوض" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Video Meta Info */}
                                        <div className="p-2 space-y-1">
                                            <p className="text-[11px] font-bold text-slate-800 line-clamp-1 group-hover:text-emerald-700 transition-colors">
                                                {item.title || 'مقطع مهارات'}
                                            </p>
                                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                                                <span>{item.overallScore ? `${item.overallScore} OVR` : 'غير محلل'}</span>
                                                {/* Mini Quick Actions */}
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                    {item.status !== 'approved' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => onQuickApprove(item)}
                                                            className="text-emerald-600 hover:text-emerald-700"
                                                            title="اعتماد سريع"
                                                        >
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => onQuickDelete(item)}
                                                        disabled={isDeleting}
                                                        className="text-rose-600 hover:text-rose-700"
                                                        title="حذف سريع"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
