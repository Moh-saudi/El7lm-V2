'use client';

import React from 'react';
import {
    Play, CheckCircle2, XCircle, AlertTriangle, Clock, Trash2,
    MessageCircle, Sparkles, ExternalLink, ShieldCheck, Film, PlaySquare, Music2,
    Target, Eye, Check, User
} from 'lucide-react';
import { MediaItem, MediaStatus, detectMediaSource } from '../types';
import { CountryFlag } from './CountryFlag';

interface Props {
    items: MediaItem[];
    selectedIds: Set<string>;
    onToggleSelect: (id: string) => void;
    onItemClick: (item: MediaItem) => void;
    onQuickApprove: (item: MediaItem) => void;
    onQuickDelete: (item: MediaItem) => void;
    isDeleting?: boolean;
}

const STATUS_CONFIG: Record<MediaStatus, { label: string; bg: string; text: string; border: string; icon: React.ElementType }> = {
    pending:  { label: 'بانتظار التحليل', bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',  icon: Clock },
    approved: { label: 'معتمد ومزامَن',  bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
    flagged:  { label: 'تنبيه ومراقبة',  bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  icon: AlertTriangle },
    rejected: { label: 'مرفوض',          bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',    icon: XCircle },
};

function formatUploadDate(date: Date): string {
    try {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'اليوم';
        if (diffDays === 1) return 'أمس';
        if (diffDays < 7) return `منذ ${diffDays} أيام`;
        return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
    } catch {
        return '';
    }
}

export function ScoutingCanvasGrid({
    items,
    selectedIds,
    onToggleSelect,
    onItemClick,
    onQuickApprove,
    onQuickDelete,
    isDeleting = false,
}: Props) {
    if (items.length === 0) {
        return (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-500 shadow-xs">
                <Target className="w-14 h-14 text-slate-300 mx-auto mb-3" />
                <p className="text-base font-bold text-slate-700">لا توجد مقاطع مطابقة للفلاتر المحددة</p>
                <p className="text-xs text-slate-400 mt-1">جرّب تغيير فلاتر المراكز أو التقييم أو تفريغ الفلاتر النشطة</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" dir="rtl">
            {items.map(item => {
                const isSelected = selectedIds.has(item.id);
                const source = detectMediaSource(item);
                const statusMeta = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
                const StatusIcon = statusMeta.icon;
                const hasScore = typeof item.overallScore === 'number' && item.overallScore > 0;
                const score = item.overallScore ?? item.aiRating ?? 0;
                const isElite = score >= 85;
                const isAdvanced = score >= 75 && score < 85;

                return (
                    <div
                        key={item.id}
                        className={`group bg-white rounded-2xl border transition-all duration-200 flex flex-col overflow-hidden shadow-xs hover:shadow-lg ${
                            isSelected
                                ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                                : 'border-slate-200/90 hover:border-slate-300'
                        }`}
                    >
                        {/* ── CARD HEADER: PLAYER IDENTITY + OVR SHIELD + SELECT CHECKBOX ── */}
                        <div className="p-3.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between gap-2.5">
                            {/* Checkbox */}
                            <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => onToggleSelect(item.id)}
                                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                            />

                            {/* Player info */}
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="relative shrink-0">
                                    {item.userImage ? (
                                        <img
                                            src={item.userImage}
                                            alt={item.userName}
                                            className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center">
                                            {item.userName ? item.userName.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                                        </div>
                                    )}
                                    {item.country && (
                                        <div
                                            className="absolute -bottom-1 -left-1 bg-white p-0.5 rounded-full shadow-xs border border-slate-200 flex items-center justify-center overflow-hidden"
                                            title={item.country}
                                        >
                                            <CountryFlag country={item.country} size="xs" />
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <h3 className="text-xs font-black text-slate-900 truncate leading-snug">
                                            {item.userName || 'لاعب مسجل'}
                                        </h3>
                                        {item.status === 'approved' && (
                                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium truncate mt-0.5">
                                        <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded text-[10px]">
                                            {item.position || 'لاعب'}
                                        </span>
                                        {item.country && (
                                            <span className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200/60 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-slate-200 shrink-0">
                                                <CountryFlag country={item.country} size="xs" />
                                                <span className="truncate max-w-[80px]">{item.country}</span>
                                            </span>
                                        )}
                                        {item.organization && (
                                            <>
                                                <span>•</span>
                                                <span className="text-slate-400 truncate">{item.organization}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* OVR Score Badge */}
                            {score > 0 ? (
                                <div className={`flex flex-col items-center justify-center px-2 py-1 rounded-xl text-center shrink-0 font-black border ${
                                    isElite
                                        ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white border-amber-300 shadow-xs'
                                        : isAdvanced
                                        ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-emerald-400 shadow-xs'
                                        : 'bg-slate-800 text-white border-slate-700'
                                }`}>
                                    <span className="text-sm leading-none">{score}</span>
                                    <span className="text-[8px] uppercase tracking-wider opacity-90">OVR</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80 text-[10px] font-bold shrink-0">
                                    <Clock className="w-3 h-3 text-amber-500" />
                                    <span>بانتظار AI</span>
                                </div>
                            )}
                        </div>

                        {/* ── CINEMATIC 16:9 VIDEO CONTAINER ── */}
                        <div
                            onClick={() => onItemClick(item)}
                            className="relative aspect-video w-full bg-slate-950 cursor-pointer overflow-hidden group/screen"
                        >
                            {/* Video / Thumbnail */}
                            {item.thumbnailUrl ? (
                                <img
                                    src={item.thumbnailUrl}
                                    alt={item.title}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover/screen:scale-105"
                                />
                            ) : item.type === 'video' ? (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950 text-slate-500">
                                    <Film className="w-10 h-10 mb-1 text-slate-700" />
                                    <span className="text-[10px] font-mono text-slate-400">معاينة استوديو الكشافة</span>
                                </div>
                            ) : (
                                <img
                                    src={item.url}
                                    alt={item.title}
                                    className="w-full h-full object-cover"
                                />
                            )}

                            {/* Source Badge (Top-Right) */}
                            <div className="absolute top-2.5 right-2.5 z-10">
                                {source === 'direct' && (
                                    <span className="flex items-center gap-1 bg-emerald-600/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                                        <Film className="w-3 h-3" /> سحابي مباشر HD
                                    </span>
                                )}
                                {source === 'tiktok' && (
                                    <span className="flex items-center gap-1 bg-black/85 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                                        <Music2 className="w-3 h-3 text-pink-400" /> TikTok
                                    </span>
                                )}
                                {source === 'youtube' && (
                                    <span className="flex items-center gap-1 bg-red-600/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                                        <PlaySquare className="w-3 h-3" /> YouTube
                                    </span>
                                )}
                                {source === 'external' && (
                                    <span className="flex items-center gap-1 bg-slate-800/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                                        <ExternalLink className="w-3 h-3" /> رابط خارجي
                                    </span>
                                )}
                            </div>

                            {/* Floating Country Badge (Top-Left) */}
                            {item.country && (
                                <div className="absolute top-2.5 left-2.5 z-10">
                                    <span className="flex items-center gap-1 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs border border-white/15">
                                        <CountryFlag country={item.country} size="xs" />
                                        <span className="truncate max-w-[80px]">{item.country}</span>
                                    </span>
                                </div>
                            )}

                            {/* Hover Play Button Glow */}
                            <div className="absolute inset-0 bg-black/35 opacity-0 group-hover/screen:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="w-12 h-12 rounded-full bg-white/95 text-emerald-700 flex items-center justify-center shadow-2xl transform scale-90 group-hover/screen:scale-100 transition-transform">
                                    <Play className="w-6 h-6 fill-current translate-x-0.5" />
                                </div>
                            </div>

                            {/* Bottom Info Bar over Video */}
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 pt-6 flex items-center justify-between text-white text-[11px]">
                                <span className="font-semibold truncate max-w-[70%]">
                                    {item.title || 'مقطع كروي للمعاينة'}
                                </span>
                                <span className="text-[10px] text-slate-300 font-mono">
                                    {formatUploadDate(item.uploadDate)}
                                </span>
                            </div>
                        </div>

                        {/* ── CARD BODY: SKILL MINI BARS OR AI TRIGGER ── */}
                        <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
                            {/* Skills Radar Mini Pills */}
                            {item.skills ? (
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                        <span>رادار المهارات الفنية</span>
                                        <span className="text-emerald-700 font-mono">{score} OVR</span>
                                    </div>
                                    <div className="grid grid-cols-6 gap-1 text-center font-mono text-[10px]">
                                        <div className="bg-slate-100 rounded p-1 border border-slate-200">
                                            <div className="text-[9px] text-slate-400">PAC</div>
                                            <div className="font-bold text-slate-800">{item.skills.pace}</div>
                                        </div>
                                        <div className="bg-slate-100 rounded p-1 border border-slate-200">
                                            <div className="text-[9px] text-slate-400">SHO</div>
                                            <div className="font-bold text-slate-800">{item.skills.shooting}</div>
                                        </div>
                                        <div className="bg-slate-100 rounded p-1 border border-slate-200">
                                            <div className="text-[9px] text-slate-400">PAS</div>
                                            <div className="font-bold text-slate-800">{item.skills.passing}</div>
                                        </div>
                                        <div className="bg-slate-100 rounded p-1 border border-slate-200">
                                            <div className="text-[9px] text-slate-400">DRI</div>
                                            <div className="font-bold text-slate-800">{item.skills.dribbling}</div>
                                        </div>
                                        <div className="bg-slate-100 rounded p-1 border border-slate-200">
                                            <div className="text-[9px] text-slate-400">DEF</div>
                                            <div className="font-bold text-slate-800">{item.skills.defending}</div>
                                        </div>
                                        <div className="bg-slate-100 rounded p-1 border border-slate-200">
                                            <div className="text-[9px] text-slate-400">PHY</div>
                                            <div className="font-bold text-slate-800">{item.skills.physical}</div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => onItemClick(item)}
                                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-50/80 hover:bg-amber-100/80 text-amber-800 border border-amber-200 text-xs font-bold transition-colors cursor-pointer"
                                >
                                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                    <span>تحليل المهارات الست بنسر AI</span>
                                </button>
                            )}

                            {/* Status badge row */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}>
                                    <StatusIcon className="w-3 h-3" />
                                    {statusMeta.label}
                                </span>

                                {item.fileSize && item.fileSize > 0 && (
                                    <span className="text-[10px] text-slate-400 font-mono">
                                        {(item.fileSize / (1024 * 1024)).toFixed(1)} MB
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* ── CARD FOOTER: 4 QUICK DECISION ACTIONS ── */}
                        <div className="p-2.5 bg-slate-50 border-t border-slate-100 grid grid-cols-4 gap-1.5">
                            {/* 1. Quick Approve */}
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onQuickApprove(item); }}
                                disabled={item.status === 'approved'}
                                className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    item.status === 'approved'
                                        ? 'bg-emerald-100 text-emerald-800 opacity-60 cursor-default'
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                }`}
                                title="اعتماد ومزامنة في البروفايل"
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span className="text-[11px]">اعتماد</span>
                            </button>

                            {/* 2. Open Full Studio Modal */}
                            <button
                                type="button"
                                onClick={() => onItemClick(item)}
                                className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                                title="فتح استوديو التحليل الكشفي"
                            >
                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                                <span className="text-[11px]">معاينة</span>
                            </button>

                            {/* 3. WhatsApp Direct */}
                            {item.userPhone ? (
                                <a
                                    href={`https://wa.me/${item.userPhone.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                                    title="مراسلة واتساب فورية"
                                >
                                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-[11px]">واتساب</span>
                                </a>
                            ) : (
                                <button
                                    type="button"
                                    disabled
                                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200/60 opacity-60 cursor-not-allowed"
                                    title="لا يوجد رقم هاتف"
                                >
                                    <MessageCircle className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-[11px]">واتساب</span>
                                </button>
                            )}

                            {/* 4. Quick Delete with Notify */}
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onQuickDelete(item); }}
                                disabled={isDeleting}
                                className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                                title="حذف وإشعار اللاعب"
                            >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                <span className="text-[11px]">حذف</span>
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
