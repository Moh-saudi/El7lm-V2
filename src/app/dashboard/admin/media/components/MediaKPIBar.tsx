'use client';

import React from 'react';
import { Film, Image, Clock, CheckCircle2, XCircle, AlertTriangle, Cloud, PlaySquare } from 'lucide-react';
import { MediaStats, MediaStatus } from '../types';

interface Props {
    stats: MediaStats;
    activeStatus: MediaStatus | 'all';
    onStatusClick: (status: MediaStatus | 'all') => void;
}

export function MediaKPIBar({ stats, activeStatus, onStatusClick }: Props) {
    const cards: {
        label: string;
        subLabel: string;
        value: number;
        icon: React.ElementType;
        color: string;
        bgIcon: string;
        border: string;
        ring: string;
        filterKey: MediaStatus | 'all';
        clickable: boolean;
    }[] = [
        {
            label: 'إجمالي الفيديوهات',
            subLabel: `${stats.directVideos || 0} رفع مباشر • ${stats.youtubeVideos || 0} YouTube`,
            value: stats.videos,
            icon: Film,
            color: 'text-indigo-400',
            bgIcon: 'bg-indigo-500/10 border-indigo-500/20',
            border: 'border-slate-800',
            ring: 'ring-indigo-500 border-indigo-500/50',
            filterKey: 'all',
            clickable: true,
        },
        {
            label: 'صور ومستندات',
            subLabel: 'الأصول والشهادات',
            value: stats.images,
            icon: Image,
            color: 'text-sky-400',
            bgIcon: 'bg-sky-500/10 border-sky-500/20',
            border: 'border-slate-800',
            ring: 'ring-sky-500 border-sky-500/50',
            filterKey: 'all',
            clickable: false,
        },
        {
            label: 'بانتظار التحليل',
            subLabel: 'تتطلب قرار الكشاف',
            value: stats.pending,
            icon: Clock,
            color: 'text-amber-400',
            bgIcon: 'bg-amber-500/10 border-amber-500/20',
            border: 'border-slate-800',
            ring: 'ring-amber-500 border-amber-500/50',
            filterKey: 'pending',
            clickable: true,
        },
        {
            label: 'معتمد ومزامَن',
            subLabel: 'محدث في بروفايل اللاعب',
            value: stats.approved,
            icon: CheckCircle2,
            color: 'text-emerald-400',
            bgIcon: 'bg-emerald-500/10 border-emerald-500/20',
            border: 'border-slate-800',
            ring: 'ring-emerald-500 border-emerald-500/50',
            filterKey: 'approved',
            clickable: true,
        },
        {
            label: 'تنبيه / مراقبة',
            subLabel: 'متابعة دورية أو تحسين',
            value: stats.flagged,
            icon: AlertTriangle,
            color: 'text-orange-400',
            bgIcon: 'bg-orange-500/10 border-orange-500/20',
            border: 'border-slate-800',
            ring: 'ring-orange-500 border-orange-500/50',
            filterKey: 'flagged',
            clickable: true,
        },
        {
            label: 'مرفوض',
            subLabel: 'غير مطابق للمعايير',
            value: stats.rejected,
            icon: XCircle,
            color: 'text-rose-400',
            bgIcon: 'bg-rose-500/10 border-rose-500/20',
            border: 'border-slate-800',
            ring: 'ring-rose-500 border-rose-500/50',
            filterKey: 'rejected',
            clickable: true,
        },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-right">
            {cards.map(c => {
                const isActive = c.clickable && activeStatus === c.filterKey;
                return (
                    <button
                        key={c.label}
                        onClick={() => c.clickable && onStatusClick(c.filterKey)}
                        disabled={!c.clickable}
                        className={`
                            bg-slate-900/90 ${c.border} border rounded-2xl p-3.5 flex flex-col justify-between text-right transition-all shadow-lg
                            ${c.clickable
                                ? `cursor-pointer hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0
                                   ${isActive ? `ring-2 ${c.ring} bg-slate-850 shadow-emerald-950/20` : 'hover:border-slate-700'}`
                                : 'cursor-default opacity-85'
                            }
                        `}
                    >
                        <div className="flex items-center justify-between w-full mb-2">
                            <span className={`p-1.5 rounded-xl border ${c.bgIcon} ${c.color}`}>
                                <c.icon className="w-4 h-4" />
                            </span>
                            {c.clickable && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${
                                    isActive
                                        ? 'bg-emerald-600 text-white font-black'
                                        : 'text-slate-500 bg-slate-950/60 border border-slate-800'
                                }`}>
                                    {isActive ? 'نشط' : 'تصفية'}
                                </span>
                            )}
                        </div>

                        <div>
                            <div className="flex items-baseline gap-1.5">
                                <span className={`text-2xl font-black font-mono tracking-tight ${c.color}`}>
                                    {c.value}
                                </span>
                            </div>
                            <p className="text-[11px] font-bold text-white truncate mt-0.5">{c.label}</p>
                            <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5" title={c.subLabel}>
                                {c.subLabel}
                            </p>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
