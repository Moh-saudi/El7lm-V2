'use client';

import React from 'react';
import {
    Search, SlidersHorizontal, ArrowUpDown, CalendarRange, X,
    Film, Image, Cloud, Globe, PlaySquare, Music2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { MediaType, MediaStatus, MediaSortKey, DateFilter, MediaSourceFilter } from '../types';

interface Props {
    searchTerm: string;
    onSearch: (v: string) => void;
    typeFilter: MediaType | 'all';
    onTypeFilter: (v: MediaType | 'all') => void;
    sourceFilter: MediaSourceFilter;
    onSourceFilter: (v: MediaSourceFilter) => void;
    statusFilter: MediaStatus | 'all';
    onStatusFilter: (v: MediaStatus | 'all') => void;
    accountFilter: string;
    onAccountFilter: (v: string) => void;
    sortKey: MediaSortKey;
    onSort: (v: MediaSortKey) => void;
    dateFilter: DateFilter;
    onDateFilter: (v: DateFilter) => void;
    total: number;
}

const TYPE_OPTS: { value: MediaType | 'all'; label: string; icon: React.ElementType }[] = [
    { value: 'all',   label: 'الكل',     icon: SlidersHorizontal },
    { value: 'video', label: 'فيديوهات', icon: Film },
    { value: 'image', label: 'صور',      icon: Image },
];

const SOURCE_OPTS: { value: MediaSourceFilter; label: string; icon: React.ElementType; color?: string }[] = [
    { value: 'all',      label: 'كل المصادر',       icon: Globe },
    { value: 'direct',   label: 'رفع سحابي مباشر',   icon: Cloud,       color: 'text-emerald-600' },
    { value: 'youtube',  label: 'يوتيوب (YouTube)', icon: PlaySquare,  color: 'text-red-600' },
    { value: 'tiktok',   label: 'تيك توك (TikTok)', icon: Music2,      color: 'text-slate-900' },
    { value: 'external', label: 'روابط خارجية أخرى', icon: Globe,       color: 'text-sky-600' },
];

const STATUS_OPTS: { value: MediaStatus | 'all'; label: string; activeClass: string }[] = [
    { value: 'all',      label: 'الكل',         activeClass: 'bg-slate-900 text-white border-slate-900' },
    { value: 'pending',  label: 'بانتظار التحليل', activeClass: 'bg-amber-500 text-white border-amber-500' },
    { value: 'approved', label: 'معتمد ومزامَن', activeClass: 'bg-emerald-600 text-white border-emerald-600' },
    { value: 'rejected', label: 'مرفوض',        activeClass: 'bg-rose-600 text-white border-rose-600' },
    { value: 'flagged',  label: 'تنبيه / إعادة', activeClass: 'bg-orange-500 text-white border-orange-500' },
];

const ACCOUNT_OPTS = [
    { value: 'all',     label: 'جميع الحسابات' },
    { value: 'player',  label: 'لاعبون' },
    { value: 'coach',   label: 'مدربون' },
    { value: 'academy', label: 'أكاديميات' },
    { value: 'club',    label: 'أندية' },
    { value: 'agent',   label: 'وكلاء' },
];

const SORT_OPTS: { value: MediaSortKey; label: string }[] = [
    { value: 'date_desc', label: 'الأحدث أولاً' },
    { value: 'date_asc',  label: 'الأقدم أولاً' },
    { value: 'name_asc',  label: 'الاسم (أ-ي)' },
    { value: 'status',    label: 'الحالة (بانتظار التحليل)' },
    { value: 'size_desc', label: 'الحجم (الأكبر)' },
    { value: 'type',      label: 'النوع' },
];

export function MediaToolbar({
    searchTerm, onSearch,
    typeFilter, onTypeFilter,
    sourceFilter, onSourceFilter,
    statusFilter, onStatusFilter,
    accountFilter, onAccountFilter,
    sortKey, onSort,
    dateFilter, onDateFilter,
    total,
}: Props) {
    const hasDateFilter = !!(dateFilter.from || dateFilter.to);

    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3.5">
            {/* ── ROW 1: SEARCH & COUNT ── */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        value={searchTerm}
                        onChange={e => onSearch(e.target.value)}
                        placeholder="ابحث بالاسم، الإيميل، الأكاديمية/النادي، المركز، الدولة، عنوان الفيديو..."
                        className="pr-9 pl-8 h-10 bg-slate-50/80 border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => onSearch('')}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 whitespace-nowrap">
                    <span className="text-emerald-700 font-black">{total}</span> نتيجة مطابقة
                </div>
            </div>

            {/* ── ROW 2: PRIMARY FILTER BUTTONS (TYPE + SOURCE + STATUS) ── */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                {/* Media Type Segmented Control */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60">
                    {TYPE_OPTS.map(o => {
                        const Icon = o.icon;
                        const isSelected = typeFilter === o.value;
                        return (
                            <button
                                key={o.value}
                                onClick={() => onTypeFilter(o.value)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    isSelected
                                        ? 'bg-white shadow-xs text-slate-900 font-black'
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                <span>{o.label}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="hidden sm:block w-px h-6 bg-slate-200 mx-1" />

                {/* Video Source Segmented Control (New Essential Differentiator) */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-400 px-2 select-none">المصدر:</span>
                    {SOURCE_OPTS.map(o => {
                        const Icon = o.icon;
                        const isSelected = sourceFilter === o.value;
                        return (
                            <button
                                key={o.value}
                                onClick={() => onSourceFilter(o.value)}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    isSelected
                                        ? 'bg-white shadow-xs text-slate-900 border border-slate-200 font-black'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                                }`}
                            >
                                <Icon className={`w-3.5 h-3.5 ${o.color || 'text-slate-500'}`} />
                                <span>{o.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── ROW 3: STATUS PILLS + ACCOUNTS + SORT + DATES ── */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                {/* Moderation Status */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-400 pl-1">الحالة:</span>
                    {STATUS_OPTS.map(o => {
                        const isSelected = statusFilter === o.value;
                        return (
                            <button
                                key={o.value}
                                onClick={() => onStatusFilter(o.value)}
                                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                    isSelected
                                        ? o.activeClass + ' shadow-xs font-black'
                                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                {o.label}
                            </button>
                        );
                    })}
                </div>

                {/* Dropdowns & Date */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Account Type */}
                    <select
                        value={accountFilter}
                        onChange={e => onAccountFilter(e.target.value)}
                        className="h-8 text-xs font-bold border border-slate-200 rounded-xl px-2.5 bg-slate-50/80 text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 hover:bg-white"
                    >
                        {ACCOUNT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>

                    {/* Sort Order */}
                    <div className="flex items-center gap-1 bg-slate-50/80 border border-slate-200 rounded-xl px-2 h-8">
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                        <select
                            value={sortKey}
                            onChange={e => onSort(e.target.value as MediaSortKey)}
                            className="text-xs font-bold bg-transparent text-slate-700 cursor-pointer focus:outline-none"
                        >
                            {SORT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>

                    {/* Date Pickers */}
                    <div className="flex items-center gap-1.5 bg-slate-50/80 border border-slate-200 rounded-xl px-2.5 h-8">
                        <CalendarRange className="w-3.5 h-3.5 text-slate-400" />
                        <input
                            type="date"
                            value={dateFilter.from}
                            onChange={e => onDateFilter({ ...dateFilter, from: e.target.value })}
                            className="text-xs font-medium bg-transparent text-slate-700 cursor-pointer focus:outline-none"
                            title="تاريخ البداية"
                        />
                        <span className="text-[10px] text-slate-400">-</span>
                        <input
                            type="date"
                            value={dateFilter.to}
                            onChange={e => onDateFilter({ ...dateFilter, to: e.target.value })}
                            className="text-xs font-medium bg-transparent text-slate-700 cursor-pointer focus:outline-none"
                            title="تاريخ النهاية"
                        />
                        {hasDateFilter && (
                            <button
                                onClick={() => onDateFilter({ from: '', to: '' })}
                                className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                title="إلغاء فلتر التاريخ"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
