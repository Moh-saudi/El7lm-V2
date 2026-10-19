'use client';

import React from 'react';
import {
    Play, CheckCircle2, XCircle, AlertTriangle, Clock, Trash2,
    MessageCircle, Sparkles, ExternalLink, ShieldCheck, Film, PlaySquare, Music2, Globe
} from 'lucide-react';
import { MediaItem, MediaStatus, detectMediaSource } from '../types';
import { CountryFlag } from './CountryFlag';

interface Props {
    items: MediaItem[];
    selectedIds: Set<string>;
    onToggleSelect: (id: string) => void;
    onSelectAll: () => void;
    onItemClick: (item: MediaItem) => void;
    onQuickApprove: (item: MediaItem) => void;
    onQuickDelete: (item: MediaItem) => void;
    onQuickAIAnalyze?: (item: MediaItem) => void;
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
        return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return '';
    }
}

export function MediaTable({
    items,
    selectedIds,
    onToggleSelect,
    onSelectAll,
    onItemClick,
    onQuickApprove,
    onQuickDelete,
    onQuickAIAnalyze,
    isDeleting = false,
}: Props) {
    const allSelected = items.length > 0 && items.every(i => selectedIds.has(i.id));
    const someSelected = items.some(i => selectedIds.has(i.id));

    if (items.length === 0) {
        return (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-xs">
                <Film className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-slate-800 text-base">لا توجد وسائط مطابقة لخيارات البحث أو الفلترة</p>
                <p className="text-xs text-slate-400 mt-1">جرّب تغيير كلمات البحث أو إعادة تعيين الفلاتر لعرض كافة المقاطع</p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden text-right" dir="rtl">
            <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                    {/* ── Table Header ── */}
                    <thead className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200 uppercase text-[11px]">
                        <tr>
                            <th className="py-3.5 px-3 w-10 text-center">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                                    onChange={onSelectAll}
                                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                    title="تحديد الكل"
                                />
                            </th>
                            <th className="py-3.5 px-3 min-w-[140px]">المقطع والفيديو</th>
                            <th className="py-3.5 px-3 min-w-[180px]">اللاعب والمركز</th>
                            <th className="py-3.5 px-3 min-w-[160px]">عنوان وتاريخ الرفع</th>
                            <th className="py-3.5 px-3 text-center min-w-[110px]">تقييم نسر الذكي (AI)</th>
                            <th className="py-3.5 px-3 text-center min-w-[120px]">الحالة الحالية</th>
                            <th className="py-3.5 px-3 text-center min-w-[150px]">إجراءات سريعة</th>
                        </tr>
                    </thead>

                    {/* ── Table Body ── */}
                    <tbody className="divide-y divide-slate-100">
                        {items.map(item => {
                            const isChecked = selectedIds.has(item.id);
                            const source = detectMediaSource(item);
                            const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
                            const StatusIcon = status.icon;

                            // WhatsApp URL
                            const cleanPhone = (item.userPhone || '').replace(/\D/g, '');
                            const waUrl = cleanPhone.length >= 8
                                ? `https://wa.me/${cleanPhone.startsWith('0') ? '2' + cleanPhone : cleanPhone}?text=${encodeURIComponent(`مرحباً ${item.userName}، بخصوص مقطعك في منصة الحلم (${item.title}): `)}`
                                : null;

                            return (
                                <tr
                                    key={item.id}
                                    className={`transition-colors group hover:bg-slate-50/80 ${isChecked ? 'bg-emerald-50/40' : ''}`}
                                >
                                    {/* Checkbox */}
                                    <td className="py-3 px-3 text-center" onClick={e => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => onToggleSelect(item.id)}
                                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                        />
                                    </td>

                                    {/* Video Thumbnail & Platform */}
                                    <td className="py-3 px-3">
                                        <div
                                            onClick={() => onItemClick(item)}
                                            className="flex items-center gap-2.5 cursor-pointer group/vid"
                                        >
                                            <div className="relative w-20 h-13 rounded-xl bg-slate-900 overflow-hidden flex-shrink-0 shadow-xs border border-slate-200">
                                                {item.thumbnailUrl ? (
                                                    <img
                                                        src={item.thumbnailUrl}
                                                        alt={item.title}
                                                        className="w-full h-full object-cover transition-transform duration-300 group-hover/vid:scale-105"
                                                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-emerald-950">
                                                        <Film className="w-5 h-5 text-emerald-400" />
                                                    </div>
                                                )}

                                                {/* Play Button Overlay */}
                                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover/vid:opacity-100 transition-opacity">
                                                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
                                                        <Play className="w-3 h-3 fill-white ml-0.5" />
                                                    </div>
                                                </div>

                                                {/* Source Badge */}
                                                <div className="absolute bottom-1 right-1">
                                                    {source === 'youtube' && (
                                                        <span className="p-0.5 rounded bg-red-600 text-white flex items-center shadow-xs">
                                                            <PlaySquare className="w-2.5 h-2.5" />
                                                        </span>
                                                    )}
                                                    {source === 'tiktok' && (
                                                        <span className="p-0.5 rounded bg-slate-950 text-white flex items-center shadow-xs">
                                                            <Music2 className="w-2.5 h-2.5" />
                                                        </span>
                                                    )}
                                                    {source === 'direct' && (
                                                        <span className="px-1 py-0.2 rounded bg-emerald-700/90 text-white text-[8px] font-bold shadow-xs">
                                                            سحابي
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={() => onItemClick(item)}
                                                    className="font-bold text-slate-800 hover:text-emerald-700 text-right line-clamp-1 cursor-pointer transition-colors"
                                                >
                                                    {item.title || 'مقطع فيديو رياضي'}
                                                </button>
                                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                                    {source === 'youtube' ? 'YouTube' : source === 'tiktok' ? 'TikTok' : 'سحابة المنصة'}
                                                </span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Player Info */}
                                    <td className="py-3 px-3">
                                        <div className="flex items-center gap-2">
                                            {item.userImage ? (
                                                <img
                                                    src={item.userImage}
                                                    alt={item.userName}
                                                    className="w-7 h-7 rounded-full object-cover border border-slate-200 flex-shrink-0"
                                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            ) : (
                                                <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                                                    {item.userName.charAt(0)}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-900 truncate">{item.userName}</p>
                                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                                                    <span className="px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 font-medium">
                                                        {item.position || 'لاعب'}
                                                    </span>
                                                    {item.country && (
                                                        <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100 px-1 py-0.2 rounded text-[9.5px] font-bold border border-slate-200">
                                                            <CountryFlag country={item.country} size="xs" />
                                                            <span className="truncate max-w-[75px]">{item.country}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Date & Title */}
                                    <td className="py-3 px-3">
                                        <div className="text-slate-600">
                                            <p className="text-[11px] font-medium text-slate-700">{formatUploadDate(item.uploadDate)}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{item.description || 'لا يوجد وصف مضاف'}</p>
                                        </div>
                                    </td>

                                    {/* NISR AI Evaluation */}
                                    <td className="py-3 px-3 text-center">
                                        {item.aiRating || item.overallScore ? (
                                            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-300 text-emerald-800 font-black text-xs shadow-2xs">
                                                <Sparkles className="w-3 h-3 text-emerald-600 animate-pulse" />
                                                <span>{item.overallScore || item.aiRating} OVR</span>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => onQuickAIAnalyze ? onQuickAIAnalyze(item) : onItemClick(item)}
                                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 text-[10px] font-bold transition-colors cursor-pointer"
                                                title="تشغيل فحص الذكاء الاصطناعي"
                                            >
                                                <Sparkles className="w-3 h-3 text-amber-500" />
                                                <span>تحليل AI</span>
                                            </button>
                                        )}
                                    </td>

                                    {/* Status Badge */}
                                    <td className="py-3 px-3 text-center">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${status.bg} ${status.text} ${status.border}`}>
                                            <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                                            <span>{status.label}</span>
                                        </span>
                                    </td>

                                    {/* Quick Actions */}
                                    <td className="py-3 px-3 text-center">
                                        <div className="inline-flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                            {/* 1. Quick Approve Button */}
                                            {item.status !== 'approved' && (
                                                <button
                                                    type="button"
                                                    onClick={() => onQuickApprove(item)}
                                                    className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
                                                    title="اعتماد المهارات ونشرها فورياً"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}

                                            {/* 2. Instant Studio Preview */}
                                            <button
                                                type="button"
                                                onClick={() => onItemClick(item)}
                                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-800 text-slate-700 hover:text-white border border-slate-200 transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
                                                title="معاينة سينمائية وفحص كامل للمهارات"
                                            >
                                                <Play className="w-3.5 h-3.5 ml-0.5" />
                                            </button>

                                            {/* 3. WhatsApp Direct */}
                                            {waUrl ? (
                                                <a
                                                    href={waUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-7 h-7 rounded-lg bg-green-50 hover:bg-green-600 text-green-700 hover:text-white border border-green-200 transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
                                                    title="مراسلة اللاعب على واتساب"
                                                >
                                                    <MessageCircle className="w-3.5 h-3.5" />
                                                </a>
                                            ) : (
                                                <div className="w-7 h-7" />
                                            )}

                                            {/* 4. Delete & Notify */}
                                            <button
                                                type="button"
                                                onClick={() => onQuickDelete(item)}
                                                disabled={isDeleting}
                                                className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
                                                title="حذف المقطع وإشعار اللاعب"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
