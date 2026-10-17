'use client';

import { Film, Image, Clock, CheckCircle2, XCircle, AlertTriangle, Sparkles } from 'lucide-react';
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
        bg: string;
        border: string;
        ring: string;
        filterKey: MediaStatus | 'all';
        clickable: boolean;
    }[] = [
        {
            label: 'فيديوهات المهارات',
            subLabel: 'المرفوعة بالمنصة',
            value: stats.videos,
            icon: Film,
            color: 'text-indigo-600',
            bg: 'bg-white',
            border: 'border-slate-200',
            ring: 'ring-indigo-400',
            filterKey: 'all',
            clickable: false,
        },
        {
            label: 'صور ومستندات',
            subLabel: 'الأصول البصرية',
            value: stats.images,
            icon: Image,
            color: 'text-sky-600',
            bg: 'bg-white',
            border: 'border-slate-200',
            ring: 'ring-sky-400',
            filterKey: 'all',
            clickable: false,
        },
        {
            label: 'بانتظار التحليل',
            subLabel: 'تتطلب قرار الكشاف',
            value: stats.pending,
            icon: Clock,
            color: 'text-amber-600',
            bg: 'bg-amber-50/60',
            border: 'border-amber-200',
            ring: 'ring-amber-500',
            filterKey: 'pending',
            clickable: true,
        },
        {
            label: 'معتمد ومزامَن',
            subLabel: 'في رادار المهارات',
            value: stats.approved,
            icon: CheckCircle2,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50/60',
            border: 'border-emerald-200',
            ring: 'ring-emerald-500',
            filterKey: 'approved',
            clickable: true,
        },
        {
            label: 'مرفوض',
            subLabel: 'غير مطابق للمعايير',
            value: stats.rejected,
            icon: XCircle,
            color: 'text-rose-600',
            bg: 'bg-rose-50/50',
            border: 'border-rose-200',
            ring: 'ring-rose-500',
            filterKey: 'rejected',
            clickable: true,
        },
        {
            label: 'تنبيه / إعادة',
            subLabel: 'مطلوب تحسين الجودة',
            value: stats.flagged,
            icon: AlertTriangle,
            color: 'text-orange-600',
            bg: 'bg-orange-50/50',
            border: 'border-orange-200',
            ring: 'ring-orange-500',
            filterKey: 'flagged',
            clickable: true,
        },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {cards.map(c => {
                const isActive = c.clickable && activeStatus === c.filterKey;
                return (
                    <button
                        key={c.label}
                        onClick={() => c.clickable && onStatusClick(c.filterKey)}
                        disabled={!c.clickable}
                        className={`
                            ${c.bg} ${c.border} border rounded-2xl p-3.5 flex flex-col justify-between text-right transition-all
                            ${c.clickable
                                ? `cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:translate-y-0
                                   ${isActive ? `ring-2 ${c.ring} shadow-md bg-white border-transparent` : 'hover:border-slate-300'}`
                                : 'cursor-default'
                            }
                        `}
                    >
                        <div className="flex items-center justify-between w-full mb-2">
                            <span className={`p-1.5 rounded-xl ${isActive ? 'bg-slate-100' : 'bg-white shadow-2xs'} ${c.color}`}>
                                <c.icon className="w-4 h-4" />
                            </span>
                            {c.clickable && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-all ${
                                    isActive ? 'bg-slate-900 text-white' : 'text-slate-400 opacity-60'
                                }`}>
                                    {isActive ? 'نشط' : 'تصفية'}
                                </span>
                            )}
                        </div>

                        <div>
                            <div className="flex items-baseline gap-1.5">
                                <span className={`text-2xl font-black tracking-tight ${c.color}`}>
                                    {c.value}
                                </span>
                            </div>
                            <p className="text-[11px] font-bold text-slate-800 truncate mt-0.5">{c.label}</p>
                            <p className="text-[10px] text-slate-400 font-medium truncate">{c.subLabel}</p>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
