'use client';
import { Film, Image, Clock, CheckCircle, XCircle, Flag } from 'lucide-react';
import { MediaStats, MediaStatus } from '../types';

interface Props {
    stats: MediaStats;
    activeStatus: MediaStatus | 'all';
    onStatusClick: (status: MediaStatus | 'all') => void;
}

export function MediaKPIBar({ stats, activeStatus, onStatusClick }: Props) {
    const cards: {
        label: string;
        value: number;
        icon: React.ElementType;
        color: string;
        bg: string;
        border: string;
        ring: string;
        filterKey: MediaStatus | 'all';
        clickable: boolean;
    }[] = [
        { label: 'فيديوهات',        value: stats.videos,   icon: Film,        color: 'text-indigo-600',  bg: 'bg-indigo-50',  border: 'border-indigo-100', ring: 'ring-indigo-400',  filterKey: 'all',      clickable: false },
        { label: 'صور',             value: stats.images,   icon: Image,       color: 'text-sky-600',     bg: 'bg-sky-50',     border: 'border-sky-100',    ring: 'ring-sky-400',     filterKey: 'all',      clickable: false },
        { label: 'بانتظار المراجعة', value: stats.pending,  icon: Clock,       color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100',  ring: 'ring-amber-400',   filterKey: 'pending',  clickable: true  },
        { label: 'معتمد',           value: stats.approved, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100',ring: 'ring-emerald-400', filterKey: 'approved', clickable: true  },
        { label: 'مرفوض',           value: stats.rejected, icon: XCircle,     color: 'text-rose-600',    bg: 'bg-rose-50',    border: 'border-rose-100',   ring: 'ring-rose-400',    filterKey: 'rejected', clickable: true  },
        { label: 'تنبيه',           value: stats.flagged,  icon: Flag,        color: 'text-orange-600',  bg: 'bg-orange-50',  border: 'border-orange-100', ring: 'ring-orange-400',  filterKey: 'flagged',  clickable: true  },
    ];

    return (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {cards.map(c => {
                const isActive = c.clickable && activeStatus === c.filterKey;
                return (
                    <button
                        key={c.label}
                        onClick={() => c.clickable && onStatusClick(c.filterKey)}
                        disabled={!c.clickable}
                        className={`
                            ${c.bg} ${c.border} border rounded-xl p-3 flex flex-col gap-1 text-right transition-all
                            ${c.clickable
                                ? `cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98]
                                   ${isActive ? `ring-2 ${c.ring} shadow-md` : ''}`
                                : 'cursor-default'
                            }
                        `}
                    >
                        <div className={`${c.color} flex items-center gap-1.5`}>
                            <c.icon className="w-4 h-4" />
                            <span className="text-[11px] font-semibold">{c.label}</span>
                            {c.clickable && (
                                <span className={`mr-auto text-[9px] px-1 rounded ${isActive ? 'bg-white/60' : 'opacity-0'}`}>
                                    ✓
                                </span>
                            )}
                        </div>
                        <span className={`text-2xl font-black ${isActive ? c.color : 'text-slate-800'}`}>
                            {c.value}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
