'use client';
import { Search, SlidersHorizontal, ArrowUpDown, CalendarRange, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { MediaType, MediaStatus, MediaSortKey, DateFilter } from '../types';

interface Props {
    searchTerm: string;
    onSearch: (v: string) => void;
    typeFilter: MediaType | 'all';
    onTypeFilter: (v: MediaType | 'all') => void;
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

const TYPE_OPTS: { value: MediaType | 'all'; label: string }[] = [
    { value: 'all',   label: 'الكل'      },
    { value: 'video', label: 'فيديوهات'  },
    { value: 'image', label: 'صور'       },
];

const STATUS_OPTS: { value: MediaStatus | 'all'; label: string; color: string }[] = [
    { value: 'all',      label: 'الكل',   color: 'bg-slate-700 text-white'   },
    { value: 'pending',  label: 'معلق',   color: 'bg-amber-500 text-white'   },
    { value: 'approved', label: 'معتمد',  color: 'bg-emerald-500 text-white' },
    { value: 'rejected', label: 'مرفوض', color: 'bg-rose-500 text-white'    },
    { value: 'flagged',  label: 'تنبيه',  color: 'bg-orange-500 text-white'  },
];

const ACCOUNT_OPTS = [
    { value: 'all',     label: 'جميع الحسابات' },
    { value: 'player',  label: 'لاعبون'         },
    { value: 'coach',   label: 'مدربون'         },
    { value: 'academy', label: 'أكاديميات'      },
    { value: 'club',    label: 'أندية'           },
    { value: 'agent',   label: 'وكلاء'          },
];

const SORT_OPTS: { value: MediaSortKey; label: string }[] = [
    { value: 'date_desc', label: 'الأحدث أولاً'  },
    { value: 'date_asc',  label: 'الأقدم أولاً'  },
    { value: 'name_asc',  label: 'الاسم (أ-ي)'   },
    { value: 'status',    label: 'الحالة (معلق)' },
    { value: 'size_desc', label: 'الحجم (الأكبر)'},
    { value: 'type',      label: 'النوع'          },
];

export function MediaToolbar({
    searchTerm, onSearch,
    typeFilter, onTypeFilter,
    statusFilter, onStatusFilter,
    accountFilter, onAccountFilter,
    sortKey, onSort,
    dateFilter, onDateFilter,
    total,
}: Props) {
    const hasDateFilter = !!(dateFilter.from || dateFilter.to);
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            {/* Row 1: Search + count */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        value={searchTerm}
                        onChange={e => onSearch(e.target.value)}
                        placeholder="بحث بالاسم، الإيميل، المؤسسة، الدولة..."
                        className="pr-9 h-9 bg-slate-50 border-slate-200 text-sm"
                    />
                </div>
                <div className="text-xs text-slate-400 whitespace-nowrap font-medium">
                    <span className="text-slate-700 font-bold">{total}</span> نتيجة
                </div>
            </div>

            {/* Row 2: Filters */}
            <div className="flex flex-wrap gap-2 items-center">
                <SlidersHorizontal className="w-4 h-4 text-slate-400 flex-shrink-0" />

                {/* Type */}
                <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                    {TYPE_OPTS.map(o => (
                        <button
                            key={o.value}
                            onClick={() => onTypeFilter(o.value)}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                                typeFilter === o.value
                                    ? 'bg-white shadow text-slate-900'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {o.label}
                        </button>
                    ))}
                </div>

                <div className="w-px h-5 bg-slate-200" />

                {/* Status */}
                <div className="flex gap-1 flex-wrap">
                    {STATUS_OPTS.map(o => (
                        <button
                            key={o.value}
                            onClick={() => onStatusFilter(o.value)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                                statusFilter === o.value
                                    ? o.color + ' border-transparent shadow'
                                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                        >
                            {o.label}
                        </button>
                    ))}
                </div>

                <div className="w-px h-5 bg-slate-200" />

                {/* Account type */}
                <select
                    value={accountFilter}
                    onChange={e => onAccountFilter(e.target.value)}
                    className="h-7 text-xs border border-slate-200 rounded-lg px-2 bg-white text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                    {ACCOUNT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>

                <div className="w-px h-5 bg-slate-200" />

                {/* Sort */}
                <div className="flex items-center gap-1.5">
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <select
                        value={sortKey}
                        onChange={e => onSort(e.target.value as MediaSortKey)}
                        className="h-7 text-xs border border-slate-200 rounded-lg px-2 bg-white text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                        {SORT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
            </div>

            {/* Row 3: Date range */}
            <div className="flex flex-wrap items-center gap-2">
                <CalendarRange className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-xs text-slate-500 font-medium">من</span>
                <input
                    type="date"
                    value={dateFilter.from}
                    onChange={e => onDateFilter({ ...dateFilter, from: e.target.value })}
                    className="h-7 text-xs border border-slate-200 rounded-lg px-2 bg-white text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-500 font-medium">إلى</span>
                <input
                    type="date"
                    value={dateFilter.to}
                    onChange={e => onDateFilter({ ...dateFilter, to: e.target.value })}
                    className="h-7 text-xs border border-slate-200 rounded-lg px-2 bg-white text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {hasDateFilter && (
                    <button
                        onClick={() => onDateFilter({ from: '', to: '' })}
                        className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg transition-colors"
                    >
                        <X className="w-3 h-3" /> مسح التاريخ
                    </button>
                )}
            </div>
        </div>
    );
}
