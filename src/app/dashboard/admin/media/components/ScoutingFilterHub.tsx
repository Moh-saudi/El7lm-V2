'use client';

import React from 'react';
import {
    Search, X, RotateCcw, LayoutGrid, Table,
    Globe, Shield, Sparkles, Target, ArrowUpDown,
    CheckCircle2, Clock, AlertTriangle, XCircle, Film
} from 'lucide-react';
import { MediaStatus, MediaStats, MediaSortKey, MediaSourceFilter } from '../types';

export type TacticalPositionFilter = 'all' | 'gk' | 'def' | 'mid' | 'fwd';
export type AiOvrFilter = 'all' | 'elite' | 'advanced' | 'promising' | 'pending';
export type SkillTagFilter = 'all' | 'dribble' | 'goals' | 'speed' | 'passing' | 'saves' | 'defending';
export type TimeframeFilter = 'all' | 'today' | 'week' | 'month';

interface Props {
    // Basic search & status
    searchTerm: string;
    onSearchChange: (q: string) => void;
    activeStatus: MediaStatus | 'all';
    onStatusChange: (status: MediaStatus | 'all') => void;
    stats: MediaStats;

    // Distinctive Football Filters
    positionFilter: TacticalPositionFilter;
    onPositionChange: (pos: TacticalPositionFilter) => void;
    aiOvrFilter: AiOvrFilter;
    onAiOvrChange: (ovr: AiOvrFilter) => void;
    countryFilter: string;
    onCountryChange: (c: string) => void;
    availableCountries: { name: string; count: number }[];
    skillFilter: SkillTagFilter;
    onSkillChange: (skill: SkillTagFilter) => void;
    sourceFilter: MediaSourceFilter;
    onSourceChange: (source: MediaSourceFilter) => void;
    sortKey: MediaSortKey;
    onSortChange: (sort: MediaSortKey) => void;

    // View mode & Actions
    viewMode: 'canvas' | 'table';
    onViewModeChange: (mode: 'canvas' | 'table') => void;
    onResetFilters: () => void;
    totalFiltered: number;
    totalAll: number;
    loading: boolean;
    onRefresh: () => void;
}

const STATUS_PILLS: { key: MediaStatus | 'all'; label: string; countKey: keyof MediaStats; color: string; activeColor: string }[] = [
    { key: 'all',      label: 'الكل',             countKey: 'videos',   color: 'text-slate-600 hover:bg-slate-100', activeColor: 'bg-slate-900 text-white font-black shadow-xs' },
    { key: 'pending',  label: 'بانتظار التحليل', countKey: 'pending',  color: 'text-amber-700 hover:bg-amber-50',  activeColor: 'bg-amber-500 text-white font-black shadow-xs' },
    { key: 'approved', label: 'معتمد ومزامَن',  countKey: 'approved', color: 'text-emerald-700 hover:bg-emerald-50', activeColor: 'bg-emerald-600 text-white font-black shadow-xs' },
    { key: 'flagged',  label: 'تنبيه ومراقبة',  countKey: 'flagged',  color: 'text-orange-700 hover:bg-orange-50',  activeColor: 'bg-orange-500 text-white font-black shadow-xs' },
    { key: 'rejected', label: 'مرفوض',          countKey: 'rejected', color: 'text-rose-700 hover:bg-rose-50',    activeColor: 'bg-rose-600 text-white font-black shadow-xs' },
];

export function ScoutingFilterHub({
    searchTerm,
    onSearchChange,
    activeStatus,
    onStatusChange,
    stats,
    positionFilter,
    onPositionChange,
    aiOvrFilter,
    onAiOvrChange,
    countryFilter,
    onCountryChange,
    availableCountries,
    skillFilter,
    onSkillChange,
    sourceFilter,
    onSourceChange,
    sortKey,
    onSortChange,
    viewMode,
    onViewModeChange,
    onResetFilters,
    totalFiltered,
    totalAll,
    loading,
    onRefresh,
}: Props) {
    // Check if any non-default filter is active
    const hasActiveFilters =
        searchTerm.trim() !== '' ||
        activeStatus !== 'all' ||
        positionFilter !== 'all' ||
        aiOvrFilter !== 'all' ||
        countryFilter !== 'all' ||
        skillFilter !== 'all' ||
        sourceFilter !== 'all';

    return (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-4 space-y-3.5 text-right" dir="rtl">
            {/* ── ROW 1: BRAND TITLE + VIEW SWITCHER + STATUS PILLS ── */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                {/* Title & Live Status */}
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
                        <Target className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base font-black text-slate-900 tracking-tight">استوديو الكشافة الفني وتحليل الأداء</h1>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Pro Scouting Studio
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">
                            تقييم ومراجعة مهارات اللاعبين الكشفية واعتمادها بنظام نسر الذكي والمزامنة الفورية
                        </p>
                    </div>
                </div>

                {/* View Switcher (Canvas vs Table) + Refresh */}
                <div className="flex items-center gap-2 self-start lg:self-center">
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                            type="button"
                            onClick={() => onViewModeChange('canvas')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                viewMode === 'canvas'
                                    ? 'bg-white text-emerald-700 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            <span>كانفاس الكشافة</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => onViewModeChange('table')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                viewMode === 'table'
                                    ? 'bg-white text-emerald-700 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Table className="w-3.5 h-3.5" />
                            <span>الجدول الرياضي</span>
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={onRefresh}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-200"
                        title="تحديث البيانات"
                    >
                        <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
                        <span>تحديث</span>
                    </button>
                </div>
            </div>

            {/* ── ROW 2: SEARCH + LIVE KPI STATUS TABS ── */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[240px]">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => onSearchChange(e.target.value)}
                        placeholder="ابحث بالاسم، المركز، الدولة، النادي، أو عنوان المقطع..."
                        className="w-full text-xs pr-9 pl-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 placeholder-slate-400 transition-all font-medium"
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => onSearchChange('')}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Status Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                    {STATUS_PILLS.map(p => {
                        const count = stats[p.countKey] || 0;
                        const active = activeStatus === p.key;
                        return (
                            <button
                                key={p.key}
                                type="button"
                                onClick={() => onStatusChange(p.key)}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs transition-all shrink-0 cursor-pointer ${
                                    active ? p.activeColor : `${p.color} bg-slate-50 border border-slate-200/80`
                                }`}
                            >
                                <span>{p.label}</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                    active ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'
                                }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── ROW 3: DISTINCTIVE FOOTBALL FILTERS BAR ── */}
            <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-2.5">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {/* 1. Tactical Position */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                            <Shield className="w-3 h-3 text-emerald-600" /> المركز التكتيكي
                        </label>
                        <select
                            value={positionFilter}
                            onChange={e => onPositionChange(e.target.value as TacticalPositionFilter)}
                            className="w-full text-xs py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold cursor-pointer"
                        >
                            <option value="all">كل المراكز</option>
                            <option value="gk">🧤 حراسة المرمى (GK)</option>
                            <option value="def">🛡️ خط الدفاع (DEF)</option>
                            <option value="mid">⚙️ خط الوسط (MID)</option>
                            <option value="fwd">⚡ خط الهجوم (FWD)</option>
                        </select>
                    </div>

                    {/* 2. AI OVR Score */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-500" /> تقييم نسر AI
                        </label>
                        <select
                            value={aiOvrFilter}
                            onChange={e => onAiOvrChange(e.target.value as AiOvrFilter)}
                            className="w-full text-xs py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold cursor-pointer"
                        >
                            <option value="all">كل التقييمات</option>
                            <option value="elite">🏆 النخبة (85+ OVR)</option>
                            <option value="advanced">🌟 متقدم (75 - 84 OVR)</option>
                            <option value="promising">📈 واعد (60 - 74 OVR)</option>
                            <option value="pending">⏳ بانتظار التحليل</option>
                        </select>
                    </div>

                    {/* 3. Country / Nationality */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                            <Globe className="w-3 h-3 text-sky-600" /> الدولة / الجنسية
                        </label>
                        <select
                            value={countryFilter}
                            onChange={e => onCountryChange(e.target.value)}
                            className="w-full text-xs py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold cursor-pointer"
                        >
                            <option value="all">جميع الدول ({availableCountries.reduce((a, b) => a + b.count, 0)})</option>
                            {availableCountries.map(c => (
                                <option key={c.name} value={c.name}>
                                    {c.name} ({c.count})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 4. Football Skill Tag */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                            <Target className="w-3 h-3 text-indigo-600" /> المهارة المستهدفة
                        </label>
                        <select
                            value={skillFilter}
                            onChange={e => onSkillChange(e.target.value as SkillTagFilter)}
                            className="w-full text-xs py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold cursor-pointer"
                        >
                            <option value="all">كل المهارات</option>
                            <option value="dribble">⚽ مراوغة وفنيات</option>
                            <option value="goals">🎯 أهداف وتسديد</option>
                            <option value="speed">⚡ سرعة وانطلاقات</option>
                            <option value="passing">🪄 صناعة لعب وتمرير</option>
                            <option value="saves">🧤 تصديات حراس</option>
                            <option value="defending">🛡️ مهارات دفاعية</option>
                        </select>
                    </div>

                    {/* 5. Platform Source */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                            <Film className="w-3 h-3 text-rose-500" /> مصدر الفيديو
                        </label>
                        <select
                            value={sourceFilter}
                            onChange={e => onSourceChange(e.target.value as MediaSourceFilter)}
                            className="w-full text-xs py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold cursor-pointer"
                        >
                            <option value="all">كل المصادر</option>
                            <option value="direct">☁️ فيديوهات مباشرة (R2)</option>
                            <option value="tiktok">🎵 TikTok</option>
                            <option value="youtube">📺 YouTube</option>
                            <option value="external">🌐 روابط خارجية</option>
                        </select>
                    </div>

                    {/* 6. Sort Key */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                            <ArrowUpDown className="w-3 h-3 text-slate-600" /> الترتيب
                        </label>
                        <select
                            value={sortKey}
                            onChange={e => onSortChange(e.target.value as MediaSortKey)}
                            className="w-full text-xs py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold cursor-pointer"
                        >
                            <option value="date_desc">الأحدث أولاً</option>
                            <option value="date_asc">الأقدم أولاً</option>
                            <option value="name_asc">اسم اللاعب (أ - ي)</option>
                            <option value="status">الحالة الإدارية</option>
                            <option value="size_desc">الحجم الأكبر</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* ── ROW 4: ACTIVE FILTER CHIPS & SUMMARY COUNTER ── */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                {/* Result count */}
                <div className="text-slate-500 text-xs font-bold">
                    تم العثور على <span className="text-emerald-700 font-black">{totalFiltered}</span> مقطع
                    {totalFiltered !== totalAll && (
                        <span className="text-slate-400 font-normal"> (من إجمالي {totalAll})</span>
                    )}
                </div>

                {/* Reset button & active indicators */}
                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={onResetFilters}
                        className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                        <X className="w-3 h-3" />
                        <span>تفريغ الفلاتر</span>
                    </button>
                )}
            </div>
        </div>
    );
}
