'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Flag, X } from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { usePermissions } from '../employees-v2/_hooks/usePermissions';
import AccessDenied from '@/components/admin/AccessDenied';
import { useMediaData } from './hooks/useMediaData';
import { MediaItem, MediaStatus, MediaType, MediaSortKey, DateFilter } from './types';

import { MediaHeader }  from './components/MediaHeader';
import { MediaKPIBar }  from './components/MediaKPIBar';
import { MediaToolbar } from './components/MediaToolbar';
import { MediaGrid }    from './components/MediaGrid';
import { MediaDrawer }  from './components/MediaDrawer';

// ─── ترتيب العناصر ────────────────────────────────────────────
const STATUS_ORDER: Record<string, number> = {
    pending: 0, flagged: 1, approved: 2, rejected: 3,
};

function sortItems(items: MediaItem[], key: MediaSortKey): MediaItem[] {
    const arr = [...items];
    switch (key) {
        case 'date_desc': return arr.sort((a, b) => b.uploadDate.getTime() - a.uploadDate.getTime());
        case 'date_asc':  return arr.sort((a, b) => a.uploadDate.getTime() - b.uploadDate.getTime());
        case 'name_asc':  return arr.sort((a, b) => a.userName.localeCompare(b.userName, 'ar'));
        case 'status':    return arr.sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));
        case 'size_desc': return arr.sort((a, b) => (b.fileSize ?? 0) - (a.fileSize ?? 0));
        case 'type':      return arr.sort((a, b) => a.type.localeCompare(b.type));
        default:          return arr;
    }
}

export default function MediaPage() {
    const { user } = useAuth();
    const { can } = usePermissions();
    const { items, loading, lastFetched, fetchAll, updateItemStatus, bulkUpdateStatus, updateItemAI, deleteItem } = useMediaData();

    // ─── Filters ──────────────────────────────────────────────
    const [typeFilter,    setTypeFilter]    = useState<MediaType | 'all'>('all');
    const [statusFilter,  setStatusFilter]  = useState<MediaStatus | 'all'>('pending');
    const [accountFilter, setAccountFilter] = useState<string>('all');
    const [searchTerm,    setSearchTerm]    = useState('');
    const [sortKey,       setSortKey]       = useState<MediaSortKey>('date_desc');
    const [dateFilter,    setDateFilter]    = useState<DateFilter>({ from: '', to: '' });

    // ─── Bulk selection ───────────────────────────────────────
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkLoading, setBulkLoading] = useState(false);

    // ─── Drawer ───────────────────────────────────────────────
    const [selected, setSelected] = useState<MediaItem | null>(null);

    // ─── Load on mount ────────────────────────────────────────
    useEffect(() => { fetchAll(); }, [fetchAll]);

    // إعادة تحديد selectedIds عند تغيير الفلاتر
    useEffect(() => { setSelectedIds(new Set()); }, [typeFilter, statusFilter, accountFilter, searchTerm, dateFilter]);

    // ─── Filtered + sorted list ───────────────────────────────
    const filtered = useMemo(() => {
        const q = searchTerm.toLowerCase();
        const fromTs = dateFilter.from ? new Date(dateFilter.from).getTime() : 0;
        const toTs   = dateFilter.to   ? new Date(dateFilter.to + 'T23:59:59').getTime() : Infinity;

        const base = items.filter(m => {
            if (typeFilter    !== 'all' && m.type        !== typeFilter)    return false;
            if (statusFilter  !== 'all' && m.status      !== statusFilter)  return false;
            if (accountFilter !== 'all' && m.accountType !== accountFilter) return false;
            if (fromTs && m.uploadDate.getTime() < fromTs) return false;
            if (toTs   && m.uploadDate.getTime() > toTs)   return false;
            if (q && !(
                m.userName.toLowerCase().includes(q) ||
                m.title.toLowerCase().includes(q) ||
                m.userEmail.toLowerCase().includes(q) ||
                m.organization?.toLowerCase().includes(q) ||
                m.country?.toLowerCase().includes(q)
            )) return false;
            return true;
        });
        return sortItems(base, sortKey);
    }, [items, typeFilter, statusFilter, accountFilter, searchTerm, sortKey, dateFilter]);

    // ─── Stats ────────────────────────────────────────────────
    const stats = useMemo(() => ({
        total:    items.length,
        pending:  items.filter(m => m.status === 'pending').length,
        approved: items.filter(m => m.status === 'approved').length,
        rejected: items.filter(m => m.status === 'rejected').length,
        flagged:  items.filter(m => m.status === 'flagged').length,
        videos:   items.filter(m => m.type === 'video').length,
        images:   items.filter(m => m.type === 'image').length,
    }), [items]);

    // ─── إشعار تلقائي للاعب عند تغيير الحالة ─────────────────
    const sendAutoNotification = useCallback(async (item: MediaItem, status: 'approved' | 'rejected' | 'flagged') => {
        const eventMap = {
            approved: 'media_approved',
            rejected: 'media_rejected',
            flagged:  'media_flagged',
        };
        try {
            await fetch('/api/notifications/dispatch', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventType:        eventMap[status],
                    targetUserId:     item.userId,
                    actorId:          user?.id || '',
                    actorName:        'مسؤول المنصة',
                    actorAccountType: 'admin',
                    metadata:         { mediaTitle: item.title, mediaType: item.type },
                }),
            });
        } catch { /* الإشعار اختياري — لا يوقف العملية */ }
    }, [user?.id]);

    // ─── Handlers ─────────────────────────────────────────────
    const handleUpdateStatus = async (item: MediaItem, status: 'approved' | 'rejected' | 'flagged', notes?: string) => {
        try {
            await updateItemStatus(item, status, user?.id || '', notes);
            const labels = { approved: 'تم اعتماد', rejected: 'تم رفض', flagged: 'تم تنبيه' };
            toast.success(`${labels[status]} "${item.title}"`);
            sendAutoNotification(item, status);
            // انتقال تلقائي للعنصر التالي
            const idx  = filtered.findIndex(i => i.id === item.id);
            const next = filtered[idx + 1] || filtered[idx - 1] || null;
            setSelected(next);
        } catch (e: any) {
            toast.error('فشل تحديث الحالة: ' + e.message);
        }
    };

    // ─── Bulk handlers ─────────────────────────────────────────
    const handleToggleSelect = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    const handleToggleGroupSelect = useCallback((ids: string[]) => {
        setSelectedIds(prev => {
            const allIn = ids.every(id => prev.has(id));
            const next = new Set(prev);
            if (allIn) ids.forEach(id => next.delete(id));
            else       ids.forEach(id => next.add(id));
            return next;
        });
    }, []);

    const handleBulkUpdate = async (status: 'approved' | 'rejected' | 'flagged') => {
        if (!selectedIds.size || bulkLoading) return;
        setBulkLoading(true);
        const targets = filtered.filter(i => selectedIds.has(i.id));
        try {
            await bulkUpdateStatus(targets, status, user?.id || '');
            const labels = { approved: 'اعتماد', rejected: 'رفض', flagged: 'تنبيه' };
            toast.success(`تم ${labels[status]} ${targets.length} عنصر`);
            setSelectedIds(new Set());
        } catch (e: any) {
            toast.error('فشل الإجراء الجماعي: ' + e.message);
        } finally {
            setBulkLoading(false);
        }
    };

    // ─── Guard ────────────────────────────────────────────────
    if (!can('read', 'media')) return <AccessDenied resource="مركز الوسائط" />;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col" dir="rtl">

            <MediaHeader
                onRefresh={fetchAll}
                loading={loading}
                lastFetched={lastFetched}
            />

            <div className="flex-1 max-w-screen-2xl mx-auto w-full px-4 md:px-6 py-6 space-y-5">

                <MediaKPIBar
                    stats={stats}
                    activeStatus={statusFilter}
                    onStatusClick={s => setStatusFilter(prev => prev === s ? 'all' : s)}
                />

                <MediaToolbar
                    searchTerm={searchTerm}
                    onSearch={setSearchTerm}
                    typeFilter={typeFilter}
                    onTypeFilter={setTypeFilter}
                    statusFilter={statusFilter}
                    onStatusFilter={setStatusFilter}
                    accountFilter={accountFilter}
                    onAccountFilter={setAccountFilter}
                    sortKey={sortKey}
                    onSort={setSortKey}
                    dateFilter={dateFilter}
                    onDateFilter={setDateFilter}
                    total={filtered.length}
                />

                <MediaGrid
                    items={filtered}
                    loading={loading}
                    onSelect={setSelected}
                    selectedId={selected?.id}
                    selectedIds={selectedIds}
                    onToggleSelect={handleToggleSelect}
                    onToggleGroupSelect={handleToggleGroupSelect}
                />

            </div>

            <MediaDrawer
                item={selected}
                onClose={() => setSelected(null)}
                onUpdateStatus={handleUpdateStatus}
                onAIResult={(id, analysis, rating) => updateItemAI(id, analysis, rating)}
                onDelete={async (item) => { await deleteItem(item); setSelected(null); }}
                userId={user?.id || ''}
            />

            {/* ── Floating Bulk Action Bar ───────────────────── */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2
                    bg-slate-900 text-white rounded-2xl shadow-2xl px-4 py-3 border border-slate-700"
                    dir="rtl"
                >
                    <span className="text-sm font-bold text-slate-200 pl-2 border-l border-slate-700 ml-2">
                        {selectedIds.size} محدد
                    </span>

                    <button
                        onClick={() => handleBulkUpdate('approved')}
                        disabled={bulkLoading}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
                    >
                        <CheckCircle className="w-4 h-4" /> اعتماد الكل
                    </button>

                    <button
                        onClick={() => handleBulkUpdate('rejected')}
                        disabled={bulkLoading}
                        className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
                    >
                        <XCircle className="w-4 h-4" /> رفض الكل
                    </button>

                    <button
                        onClick={() => handleBulkUpdate('flagged')}
                        disabled={bulkLoading}
                        className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
                    >
                        <Flag className="w-4 h-4" /> تنبيه الكل
                    </button>

                    <button
                        onClick={() => setSelectedIds(new Set())}
                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-colors"
                        title="إلغاء التحديد"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
