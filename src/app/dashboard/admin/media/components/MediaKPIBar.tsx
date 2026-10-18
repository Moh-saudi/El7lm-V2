'use client';

import React from 'react';
import { Film, Image, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
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
        ring: string;
        filterKey: MediaStatus | 'all';
        clickable: boolean;
    }[] = [
        {
            label: 'إجمالي الفيديوهات',
            subLabel: `${stats.directVideos || 0} رفع مباشر • ${stats.youtubeVideos || 0} YouTube`,
            value: stats.videos,
            icon: Film,
            color: 'text-indigo-600',
            bgIcon: 'bg-indigo-50 border-indigo-100 text-indigo-600',
            ring: 'ring-indigo-500 border-indigo-400 bg-indigo-50/20',
            filterKey: 'all',
            clickable: true,
        },
        {
            label: 'صور ومستندات',
            subLabel: 'الأصول والشهادات',
            value: stats.images,
            icon: Image,
            color: 'text-sky-600',
            bgIcon: 'bg-sky-50 border-sky-100 text-sky-600',
            ring: 'ring-sky-500 border-sky-400 bg-sky-50/20',
            filterKey: 'all',
            clickable: false,
        },
        {
            label: 'بانتظار التحليل',
            subLabel: 'تتطلب قرار الكشاف',
            value: stats.pending,
            icon: Clock,
            color: 'text-amber-600',
            bgIcon: 'bg-amber-50 border-amber-200 text-amber-600',
            ring: 'ring-amber-500 border-amber-400 bg-amber-50/30',
            filterKey: 'pending',
            clickable: true,
        },
        {
            label: 'معتمد ومزامَن',
            subLabel: 'محدث في بروفايل اللاعب',
            value: stats.approved,
            icon: CheckCircle2,
            color: 'text-emerald-600',
            bgIcon: 'bg-emerald-50 border-emerald-200 text-emerald-600',
            ring: 'ring-emerald-500 border-emerald-500 bg-emerald-50/30',
            filterKey: 'approved',
            clickable: true,
        },
        {
            label: 'تنبيه / مراقبة',
            subLabel: 'متابعة دورية أو تحسين',
            value: stats.flagged,
            icon: AlertTriangle,
            color: 'text-orange-600',
            bgIcon: 'bg-orange-50 border-orange-200 text-orange-600',
            ring: 'ring-orange-500 border-orange-400 bg-orange-50/30',
            filterKey: 'flagged',
            clickable: true,
        },
        {
            label: 'مرفوض',
            subLabel: 'غير مطابق للمعايير',
            value: stats.rejected,
            icon: XCircle,
            color: 'text-rose-600',
            bgIcon: 'bg-rose-50 border-rose-200 text-rose-600',
            ring: 'ring-rose-500 border-rose-400 bg-rose-50/30',
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
                            bg-white border border-slate-200/90 rounded-2xl p-3.5 flex flex-col justify-between text-right transition-all shadow-xs
                            ${c.clickable
                                ? `cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:translate-y-0
                                   ${isActive ? `ring-2 ${c.ring} shadow-sm` : 'hover:border-slate-300'}`
                                : 'cursor-default opacity-85'
                            }
                        `}
                    >
                        <div className="flex items-center justify-between w-full mb-2">
                            <span className={`p-1.5 rounded-xl border ${c.bgIcon}`}>
                                <c.icon className="w-4 h-4" />
                            </span>
                            {c.clickable && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${
                                    isActive
                                        ? 'bg-slate-900 text-white font-black'
                                        : 'text-slate-500 bg-slate-100 border border-slate-200'
                                }`}>
                                    {isActive ? 'نشط' : 'تصفية'}
                                </span>
                            )}
                        </div>

                        <div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-black font-mono tracking-tight text-slate-900">
                                    {c.value}
                                </span>
                            </div>
                            <p className="text-[11px] font-bold text-slate-800 truncate mt-0.5">{c.label}</p>
                            <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5" title={c.subLabel}>
                                {c.subLabel}
                            </p>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
