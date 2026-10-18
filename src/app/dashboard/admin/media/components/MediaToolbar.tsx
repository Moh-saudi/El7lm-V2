'use client';

import React from 'react';
import {
    Search, ArrowUpDown, CalendarRange, X,
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

const SOURCE_TABS: { value: MediaSourceFilter; label: string; icon: React.ElementType; color?: string }[] = [
    { value: 'all',      label: 'كل المصادر',       icon: Globe },
    { value: 'direct',   label: 'رفع سحابي مباشر',   icon: Cloud,      color: 'text-emerald-600' },
    { value: 'youtube',  label: 'YouTube',          icon: PlaySquare, color: 'text-red-600' },
    { value: 'tiktok',   label: 'TikTok',           icon: Music2,     color: 'text-slate-900' },
    { value: 'external', label: 'روابط خارجية',      icon: Globe,      color: 'text-sky-600' },
];

const STATUS_OPTS: { value: MediaStatus | 'all'; label: string }[] = [
    { value: 'all',      label: 'كل الحالات' },
    { value: 'pending',  label: 'بانتظار التحليل' },
    { value: 'approved', label: 'معتمد ومزامَن' },
    { value: 'flagged',  label: 'تنبيه / مراقبة' },
    { value: 'rejected', label: 'مرفوض' },
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
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs space-y-3 text-right">
            {/* ── ROW 1: SEARCH + SOURCE TABS + RESULT COUNT ── */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                {/* Search Box */}
                <div className="relative flex-1 min-w-[280px]">
                    <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        value={searchTerm}
                        onChange={e => onSearch(e.target.value)}
                        placeholder="ابحث بالاسم، الإيميل، الأكاديمية/النادي، المركز، الدولة، عنوان الفيديو..."
                        className="pr-10 pl-8 h-9.5 bg-slate-50 border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500"
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

                {/* Segmented Source Tabs */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/70 overflow-x-auto scrollbar-none flex-shrink-0">
                    {SOURCE_TABS.map(tab => {
                        const Icon = tab.icon;
                        const isSelected = sourceFilter === tab.value;
                        return (
                            <button
                                key={tab.value}
                                onClick={() => onSourceFilter(tab.value)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                                    isSelected
                                        ? 'bg-white text-slate-900 shadow-xs font-black'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                                }`}
                            >
                                <Icon className={`w-3.5 h-3.5 ${tab.color || 'text-slate-500'}`} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Match Counter Badge */}
                <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 whitespace-nowrap flex-shrink-0">
                    <span className="text-emerald-700 font-mono font-black text-sm">{total}</span>
                    <span className="text-slate-500 text-[11px]">عنصر مطابق</span>
                </div>
            </div>

            {/* ── ROW 2: STATUS PILLS + TYPE + FILTERS ── */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
                {/* Moderation Status Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
                    <span className="text-[10px] font-bold text-slate-400 pl-1 select-none">الحالة:</span>
                    {STATUS_OPTS.map(o => {
                        const isSelected = statusFilter === o.value;
                        return (
                            <button
                                key={o.value}
                                onClick={() => onStatusFilter(o.value)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                                    isSelected
                                        ? 'bg-emerald-600 text-white border-emerald-600 font-black shadow-xs'
                                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                {o.label}
                            </button>
                        );
                    })}
                </div>

                {/* Dropdowns, Type & Dates */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Media Type (Video vs Image) */}
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
                        <button
                            onClick={() => onTypeFilter('all')}
                            className={`px-2 py-1 text-xs font-bold rounded-md cursor-pointer ${typeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            الكل
                        </button>
                        <button
                            onClick={() => onTypeFilter('video')}
                            className={`px-2 py-1 text-xs font-bold rounded-md flex items-center gap-1 cursor-pointer ${typeFilter === 'video' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            <Film className="w-3 h-3 text-indigo-600" />
                            <span>فيديو</span>
                        </button>
                        <button
                            onClick={() => onTypeFilter('image')}
                            className={`px-2 py-1 text-xs font-bold rounded-md flex items-center gap-1 cursor-pointer ${typeFilter === 'image' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            <Image className="w-3 h-3 text-sky-600" />
                            <span>صور</span>
                        </button>
                    </div>

                    {/* Account Type */}
                    <select
                        value={accountFilter}
                        onChange={e => onAccountFilter(e.target.value)}
                        className="h-7.5 text-xs font-bold border border-slate-200 rounded-lg px-2 bg-slate-50 text-slate-700 cursor-pointer focus:outline-none focus:border-emerald-500 hover:bg-white"
                    >
                        {ACCOUNT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>

                    {/* Sort Order */}
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 h-7.5">
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        <select
                            value={sortKey}
                            onChange={e => onSort(e.target.value as MediaSortKey)}
                            className="text-xs font-bold bg-transparent text-slate-700 cursor-pointer focus:outline-none"
                        >
                            {SORT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>

                    {/* Date Filter */}
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 h-7.5 text-slate-700">
                        <CalendarRange className="w-3 h-3 text-slate-400" />
                        <input
                            type="date"
                            value={dateFilter.from}
                            onChange={e => onDateFilter({ ...dateFilter, from: e.target.value })}
                            className="text-[11px] font-medium bg-transparent text-slate-700 cursor-pointer focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-400">-</span>
                        <input
                            type="date"
                            value={dateFilter.to}
                            onChange={e => onDateFilter({ ...dateFilter, to: e.target.value })}
                            className="text-[11px] font-medium bg-transparent text-slate-700 cursor-pointer focus:outline-none"
                        />
                        {hasDateFilter && (
                            <button
                                onClick={() => onDateFilter({ from: '', to: '' })}
                                className="text-slate-400 hover:text-rose-600 cursor-pointer"
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
