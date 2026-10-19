'use client';

import React from 'react';
import {
    LayoutList, Users, RefreshCw, Search, X, Filter,
    CheckCircle2, Clock, AlertTriangle, XCircle, ArrowUpDown, Film
} from 'lucide-react';
import { MediaStatus, MediaStats, MediaSortKey, MediaSourceFilter } from '../types';

interface Props {
    viewMode: 'table' | 'dossiers';
    onViewModeChange: (mode: 'table' | 'dossiers') => void;
    stats: MediaStats;
    activeStatus: MediaStatus | 'all';
    onStatusChange: (status: MediaStatus | 'all') => void;
    searchTerm: string;
    onSearchChange: (q: string) => void;
    sourceFilter: MediaSourceFilter;
    onSourceChange: (source: MediaSourceFilter) => void;
    sortKey: MediaSortKey;
    onSortChange: (sort: MediaSortKey) => void;
    loading: boolean;
    onRefresh: () => void;
    lastFetched: Date | null;
}

const STATUS_PILLS: { key: MediaStatus | 'all'; label: string; countKey: keyof MediaStats; color: string; activeColor: string }[] = [
    { key: 'all',      label: 'الكل',             countKey: 'videos',   color: 'text-slate-600 hover:bg-slate-100', activeColor: 'bg-slate-900 text-white font-black shadow-xs' },
    { key: 'pending',  label: 'بانتظار التحليل', countKey: 'pending',  color: 'text-amber-700 hover:bg-amber-50',  activeColor: 'bg-amber-500 text-white font-black shadow-xs' },
    { key: 'approved', label: 'معتمد ومزامَن',  countKey: 'approved', color: 'text-emerald-700 hover:bg-emerald-50', activeColor: 'bg-emerald-600 text-white font-black shadow-xs' },
    { key: 'flagged',  label: 'تنبيه ومراقبة',  countKey: 'flagged',  color: 'text-orange-700 hover:bg-orange-50',  activeColor: 'bg-orange-500 text-white font-black shadow-xs' },
    { key: 'rejected', label: 'مرفوض',          countKey: 'rejected', color: 'text-rose-700 hover:bg-rose-50',    activeColor: 'bg-rose-600 text-white font-black shadow-xs' },
];

export function MediaSlimHeader({
    viewMode,
    onViewModeChange,
    stats,
    activeStatus,
    onStatusChange,
    searchTerm,
    onSearchChange,
    sourceFilter,
    onSourceChange,
    sortKey,
    onSortChange,
    loading,
    onRefresh,
    lastFetched,
}: Props) {
    const formattedTime = lastFetched
        ? lastFetched.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' })
        : null;

    return (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-4 space-y-3.5 text-right" dir="rtl">
            {/* ── ROW 1: BRAND TITLE + VIEW SWITCHER + REFRESH ── */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Title & Live indicator */}
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-xs">
                        <Film className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base font-black text-slate-900 tracking-tight">استوديو الكشافة الفني والوسائط</h1>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {stats.videos} فيديو
                            </span>
                        </div>
                        {formattedTime && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                                آخر مزامنة لحظية: {formattedTime}
                            </p>
                        )}
                    </div>
                </div>

                {/* Right: View Switcher & Refresh */}
                <div className="flex items-center gap-2">
                    {/* View Switcher: Table vs Dossiers */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                        <button
                            type="button"
                            onClick={() => onViewModeChange('table')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                viewMode === 'table'
                                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <LayoutList className="w-3.5 h-3.5" />
                            <span>الجدول الإداري</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => onViewModeChange('dossiers')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                viewMode === 'dossiers'
                                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Users className="w-3.5 h-3.5" />
                            <span>ملفات اللاعبين</span>
                        </button>
                    </div>

                    {/* Refresh Button */}
                    <button
                        type="button"
                        onClick={onRefresh}
                        disabled={loading}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                        title="تحديث البيانات من السيرفر"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
                        <span className="hidden md:inline">تحديث</span>
                    </button>
                </div>
            </div>

            {/* ── ROW 2: INTERACTIVE STATUS KPIS + SEARCH & FILTERS ── */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                {/* 1. Quick Interactive Status Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 lg:pb-0">
                    {STATUS_PILLS.map(p => {
                        const isActive = activeStatus === p.key;
                        const count = stats[p.countKey] || 0;
                        return (
                            <button
                                key={p.key}
                                type="button"
                                onClick={() => onStatusChange(p.key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                    isActive
                                        ? `${p.activeColor} border-transparent`
                                        : `${p.color} bg-white border-slate-200`
                                }`}
                            >
                                <span>{p.label}</span>
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                                }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* 2. Unified Search & Filters */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                    {/* Search Input */}
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => onSearchChange(e.target.value)}
                            placeholder="ابحث باللاعب أو المركز أو العنوان..."
                            className="w-full h-8.5 pr-8 pl-7 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => onSearchChange('')}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {/* Source Selector */}
                    <select
                        value={sourceFilter}
                        onChange={e => onSourceChange(e.target.value as MediaSourceFilter)}
                        className="h-8.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                        <option value="all">كل المصادر</option>
                        <option value="direct">سحابي مباشر</option>
                        <option value="youtube">YouTube</option>
                        <option value="tiktok">TikTok</option>
                        <option value="external">روابط خارجية</option>
                    </select>

                    {/* Sort Selector */}
                    <select
                        value={sortKey}
                        onChange={e => onSortChange(e.target.value as MediaSortKey)}
                        className="h-8.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                        <option value="date_desc">الأحدث أولاً</option>
                        <option value="date_asc">الأقدم أولاً</option>
                        <option value="name_asc">اسم اللاعب (أ-ي)</option>
                        <option value="status">بحسب الحالة</option>
                    </select>
                </div>
            </div>
        </div>
    );
}
