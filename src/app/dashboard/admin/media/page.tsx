'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Flag, X, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { usePermissions } from '../employees-v2/_hooks/usePermissions';
import AccessDenied from '@/components/admin/AccessDenied';
import { useMediaData } from './hooks/useMediaData';
import {
    MediaItem, MediaStatus, MediaType, MediaSortKey, DateFilter,
    FootballSkills, MediaSourceFilter, detectMediaSource
} from './types';

import { MediaSlimHeader } from './components/MediaSlimHeader';
import { MediaTable } from './components/MediaTable';
import { PlayerDossierView } from './components/PlayerDossierView';
import { StudioModal } from './components/StudioModal';
import { authenticatedFetch } from '@/lib/api/authenticated-fetch';

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
    const {
        items,
        loading,
        error,
        lastFetched,
        fetchAll,
        updateItemStatus,
        approveAndSyncSkills,
        bulkUpdateStatus,
        updateItemAI,
        deleteItem,
        bulkDelete
    } = useMediaData();

    // ─── View Switcher (Table vs Dossiers) ──────────────────────
    const [viewMode, setViewMode] = useState<'table' | 'dossiers'>('table');

    // ─── Filters ──────────────────────────────────────────────
    const [sourceFilter,  setSourceFilter]  = useState<MediaSourceFilter>('all');
    const [statusFilter,  setStatusFilter]  = useState<MediaStatus | 'all'>('all');
    const [searchTerm,    setSearchTerm]    = useState('');
    const [sortKey,       setSortKey]       = useState<MediaSortKey>('date_desc');

    // ─── Bulk selection & Actions ─────────────────────────────
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkLoading, setBulkLoading] = useState(false);
    const [deleteTargets, setDeleteTargets] = useState<MediaItem[] | null>(null);
    const [deleteReason, setDeleteReason] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // ─── Modal & Deep Review ──────────────────────────────────
    const [selected, setSelected] = useState<MediaItem | null>(null);

    // ─── Load on mount ────────────────────────────────────────
    useEffect(() => { fetchAll(); }, [fetchAll]);

    // إعادة ضبط التحديد عند تغيير الفلاتر
    useEffect(() => {
        setSelectedIds(new Set());
    }, [sourceFilter, statusFilter, searchTerm]);

    // ─── Filtered + sorted list ───────────────────────────────
    const filtered = useMemo(() => {
        const q = searchTerm.toLowerCase().trim();

        const base = items.filter(m => {
            // فلتر مصدر الفيديو الدقيق
            if (sourceFilter !== 'all') {
                const detected = detectMediaSource(m);
                if (sourceFilter === 'direct' && detected !== 'direct') return false;
                if (sourceFilter === 'youtube' && detected !== 'youtube') return false;
                if (sourceFilter === 'tiktok' && detected !== 'tiktok') return false;
                if (sourceFilter === 'external' && !['youtube', 'tiktok', 'vimeo', 'external'].includes(detected)) return false;
            }

            if (statusFilter !== 'all' && m.status !== statusFilter) return false;

            if (q && !(
                m.userName.toLowerCase().includes(q) ||
                m.title.toLowerCase().includes(q) ||
                m.userEmail.toLowerCase().includes(q) ||
                m.organization?.toLowerCase().includes(q) ||
                m.country?.toLowerCase().includes(q) ||
                m.position?.toLowerCase().includes(q)
            )) return false;

            return true;
        });

        return sortItems(base, sortKey);
    }, [items, sourceFilter, statusFilter, searchTerm, sortKey]);

    // ─── Queue Navigation (السابق / التالي) ───────────────────
    const currentIndex = selected ? filtered.findIndex(i => i.id === selected.id) : -1;
    const hasNext = currentIndex >= 0 && currentIndex < filtered.length - 1;
    const hasPrev = currentIndex > 0;

    const handleNext = useCallback(() => {
        if (currentIndex >= 0 && currentIndex < filtered.length - 1) {
            setSelected(filtered[currentIndex + 1]);
        }
    }, [currentIndex, filtered]);

    const handlePrev = useCallback(() => {
        if (currentIndex > 0) {
            setSelected(filtered[currentIndex - 1]);
        }
    }, [currentIndex, filtered]);

    // ─── Stats ────────────────────────────────────────────────
    const stats = useMemo(() => {
        const videos = items.filter(m => m.type === 'video');
        const images = items.filter(m => m.type === 'image');
        const directVideos = videos.filter(m => detectMediaSource(m) === 'direct').length;
        const youtubeVideos = videos.filter(m => detectMediaSource(m) === 'youtube').length;
        const tiktokVideos = videos.filter(m => detectMediaSource(m) === 'tiktok').length;
        const externalVideos = videos.filter(m => !['direct', 'youtube', 'tiktok'].includes(detectMediaSource(m))).length;

        return {
            total:    items.length,
            pending:  items.filter(m => m.status === 'pending').length,
            approved: items.filter(m => m.status === 'approved').length,
            rejected: items.filter(m => m.status === 'rejected').length,
            flagged:  items.filter(m => m.status === 'flagged').length,
            videos:   videos.length,
            images:   images.length,
            directVideos,
            youtubeVideos,
            tiktokVideos,
            externalVideos,
        };
    }, [items]);

    // ─── إشعار تلقائي للاعب عند تغيير الحالة ─────────────────
    const sendAutoNotification = useCallback(async (item: MediaItem, status: 'approved' | 'rejected' | 'flagged') => {
        const eventMap = {
            approved: 'media_approved',
            rejected: 'media_rejected',
            flagged:  'media_flagged',
        };
        try {
            await authenticatedFetch('/api/notifications/dispatch', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventType:        eventMap[status],
                    targetUserId:     item.userId,
                    actorId:          user?.id || '',
                    actorName:        'مسؤول ومحلل أداء المنصة',
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

    // ─── اعتماد سريع بنقرة واحدة (من الجدول أو البطاقات) ───────
    const handleQuickApprove = useCallback(async (item: MediaItem) => {
        try {
            await updateItemStatus(item, 'approved', user?.id || 'admin');
            toast.success(`تم اعتماد "${item.title || item.userName}" بنجاح`);
            sendAutoNotification(item, 'approved');
        } catch (e: any) {
            toast.error('فشل الاعتماد: ' + (e.message || 'حدث خطأ'));
        }
    }, [updateItemStatus, user?.id, sendAutoNotification]);

    // ─── فتح نافذة تأكيد حذف عنصر فردي ────────────────────────
    const handleQuickDelete = useCallback((item: MediaItem) => {
        setDeleteTargets([item]);
        setDeleteReason('');
    }, []);

    // ─── اعتماد تقييم المهارات والمزامنة المباشرة ─────────────
    const handleApproveAndSync = async (
        item: MediaItem,
        skills: FootballSkills,
        overallScore: number,
        dominantFoot: string,
        analystNotes: string,
        analysisText: string
    ) => {
        try {
            await approveAndSyncSkills(item, skills, overallScore, dominantFoot, analystNotes, analysisText);
            toast.success(`🌟 تم اعتماد مهارات "${item.userName}" (${overallScore} OVR) وتحديث بروفايله بنجاح!`);
            // انتقال تلقائي للعنصر التالي
            const idx  = filtered.findIndex(i => i.id === item.id);
            const next = filtered[idx + 1] || filtered[idx - 1] || null;
            setSelected(next);
        } catch (e: any) {
            toast.error('فشل اعتماد ومزامنة المهارات: ' + e.message);
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

    const handleSelectAll = useCallback(() => {
        setSelectedIds(prev => {
            if (filtered.length > 0 && filtered.every(i => prev.has(i.id))) {
                return new Set();
            }
            return new Set(filtered.map(i => i.id));
        });
    }, [filtered]);

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
            toast.success(`تم ${labels[status]} ${targets.length} عنصر بنجاح`);
            setSelectedIds(new Set());
        } catch (e: any) {
            toast.error('فشل الإجراء الجماعي: ' + e.message);
        } finally {
            setBulkLoading(false);
        }
    };

    const handleBulkDeleteOpen = useCallback(() => {
        const targets = filtered.filter(i => selectedIds.has(i.id));
        if (targets.length === 0) return;
        setDeleteTargets(targets);
        setDeleteReason('');
    }, [filtered, selectedIds]);

    const handleConfirmDelete = async (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!deleteTargets || deleteTargets.length === 0 || isDeleting) return;
        setIsDeleting(true);
        try {
            if (deleteTargets.length === 1) {
                await deleteItem(deleteTargets[0], deleteReason);
                toast.success(`تم حذف "${deleteTargets[0].title || 'المقطع'}" وإشعار اللاعب بنجاح`);
                if (selected?.id === deleteTargets[0].id) {
                    setSelected(null);
                }
            } else {
                await bulkDelete(deleteTargets, deleteReason);
                toast.success(`تم حذف ${deleteTargets.length} مقطع بنجاح وإرسال الإشعارات للمستخدمين`);
                if (selected && deleteTargets.some(t => t.id === selected.id)) {
                    setSelected(null);
                }
            }
            setSelectedIds(prev => {
                const next = new Set(prev);
                deleteTargets.forEach(t => next.delete(t.id));
                return next;
            });
            setDeleteTargets(null);
            setDeleteReason('');
        } catch (e: any) {
            toast.error('فشل الحذف: ' + (e.message || 'حدث خطأ'));
        } finally {
            setIsDeleting(false);
        }
    };

    // ─── Guard ────────────────────────────────────────────────
    if (!can('read', 'media')) return <AccessDenied resource="مركز استوديو الكشافة" />;
    if (error) return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-900" dir="rtl">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-8 max-w-lg text-center space-y-3">
                <p className="text-rose-600 font-bold text-lg">فشل تحميل الوسائط</p>
                <p className="text-slate-500 text-sm font-mono">{error}</p>
                <button onClick={() => fetchAll(true)} className="mt-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-500 cursor-pointer">إعادة المحاولة</button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col selection:bg-emerald-500 selection:text-white" dir="rtl">

            {/* ── Main Container ── */}
            <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-4">

                {/* ── 1. Slim Executive Header & Dynamic Filter Bar ── */}
                <MediaSlimHeader
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    stats={stats}
                    activeStatus={statusFilter}
                    onStatusChange={setStatusFilter}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    sourceFilter={sourceFilter}
                    onSourceChange={setSourceFilter}
                    sortKey={sortKey}
                    onSortChange={setSortKey}
                    loading={loading}
                    onRefresh={() => fetchAll(true)}
                    lastFetched={lastFetched}
                />

                {/* ── 2. Primary Views: Table vs Dossiers ── */}
                {viewMode === 'table' ? (
                    <MediaTable
                        items={filtered}
                        selectedIds={selectedIds}
                        onToggleSelect={handleToggleSelect}
                        onSelectAll={handleSelectAll}
                        onItemClick={setSelected}
                        onQuickApprove={handleQuickApprove}
                        onQuickDelete={handleQuickDelete}
                        isDeleting={isDeleting}
                    />
                ) : (
                    <PlayerDossierView
                        items={filtered}
                        selectedIds={selectedIds}
                        onToggleSelect={handleToggleSelect}
                        onToggleGroupSelect={handleToggleGroupSelect}
                        onItemClick={setSelected}
                        onQuickApprove={handleQuickApprove}
                        onQuickDelete={handleQuickDelete}
                        isDeleting={isDeleting}
                    />
                )}

            </div>

            {/* ── 3. Deep Review Studio Modal ── */}
            <StudioModal
                item={selected}
                onClose={() => setSelected(null)}
                onUpdateStatus={handleUpdateStatus}
                onApproveAndSync={handleApproveAndSync}
                onAIResult={(id, analysis, rating) => updateItemAI(id, analysis, rating)}
                onDelete={async (item) => {
                    await deleteItem(item);
                    setSelected(null);
                }}
                userId={user?.id || ''}
                onNext={handleNext}
                onPrev={handlePrev}
                hasNext={hasNext}
                hasPrev={hasPrev}
                currentIndex={currentIndex + 1}
                totalCount={filtered.length}
            />

            {/* ── 4. Floating Bulk Action Bar ── */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2
                    bg-white text-slate-900 rounded-2xl shadow-2xl px-4 py-3 border border-slate-300 ring-1 ring-slate-900/5 animate-in fade-in slide-in-from-bottom-4 duration-200"
                    dir="rtl"
                >
                    <span className="text-sm font-black text-slate-800 pl-2 border-l border-slate-200 ml-2">
                        {selectedIds.size} محدد
                    </span>

                    <button
                        onClick={() => handleBulkUpdate('approved')}
                        disabled={bulkLoading || isDeleting}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer shadow-xs"
                    >
                        <CheckCircle className="w-4 h-4" /> اعتماد الكل
                    </button>

                    <button
                        onClick={() => handleBulkUpdate('rejected')}
                        disabled={bulkLoading || isDeleting}
                        className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer shadow-xs"
                    >
                        <XCircle className="w-4 h-4" /> رفض الكل
                    </button>

                    <button
                        onClick={() => handleBulkUpdate('flagged')}
                        disabled={bulkLoading || isDeleting}
                        className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer shadow-xs"
                    >
                        <Flag className="w-4 h-4" /> تنبيه الكل
                    </button>

                    <button
                        onClick={handleBulkDeleteOpen}
                        disabled={bulkLoading || isDeleting}
                        className="flex items-center gap-1.5 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer shadow-xs"
                    >
                        <Trash2 className="w-4 h-4" /> حذف وإشعار
                    </button>

                    <button
                        onClick={() => setSelectedIds(new Set())}
                        disabled={isDeleting}
                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        title="إلغاء التحديد"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* ── 5. نافذة تأكيد الحذف والإشعار (فردي وجماعي) ── */}
            {deleteTargets && deleteTargets.length > 0 && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" dir="rtl">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center gap-3 text-rose-600">
                            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                                <Trash2 className="w-5 h-5 text-rose-600" />
                            </div>
                            <div>
                                <h3 className="font-black text-base text-slate-900">
                                    {deleteTargets.length === 1
                                        ? `حذف مقطع: "${deleteTargets[0].title || deleteTargets[0].userName}"`
                                        : `حذف ${deleteTargets.length} مقطع محدد`}
                                </h3>
                                <p className="text-xs text-slate-500">سيتم مسح الملف نهائياً وتنبيه اللاعب في تطبيق الموبايل</p>
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <span>سيتم مسح الفيديوهات من التخزين السحابي وتنظيفها من بروفايل اللاعب، مع إرسال إشعار فوري (Push Notification) لتطبيق الموبايل.</span>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">سبب الحذف / الرفض (يصل للاعب في التطبيق):</label>
                            <textarea
                                rows={2}
                                value={deleteReason}
                                onChange={e => setDeleteReason(e.target.value)}
                                placeholder="مثال: جودة التصوير منخفضة / مخالفة لمعايير التقييم / تكرار المقطع"
                                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 resize-none"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTargets(null); setDeleteReason(''); }}
                                disabled={isDeleting}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                            >
                                إلغاء
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
                            >
                                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                تأكيد الحذف والإشعار
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
