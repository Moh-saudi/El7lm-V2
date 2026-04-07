'use client';

import { useState, useCallback } from 'react';
import { MediaItem } from '../types';

// ── مساعدات YouTube ────────────────────────────────────────────
export const getYouTubeId = (url: string): string | null => {
    const patterns = [
        /youtu\.be\/([^?&\s]+)/,
        /youtube\.com\/watch\?v=([^&\s]+)/,
        /youtube\.com\/shorts\/([^?&\s]+)/,
        /youtube\.com\/embed\/([^?&\s]+)/,
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
};

export const getYouTubeThumbnail = (url: string): string | null => {
    const id = getYouTubeId(url);
    return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
};

export function useMediaData() {
    const [items, setItems]           = useState<MediaItem[]>([]);
    const [loading, setLoading]       = useState(false);
    const [error, setError]           = useState<string | null>(null);
    const [lastFetched, setLastFetched] = useState<Date | null>(null);

    // ── جلب كل الميديا من R2 ──────────────────────────────────
    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res  = await fetch('/api/media/list-r2');
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'فشل جلب البيانات');

            // تحويل التواريخ من string إلى Date
            const mapped: MediaItem[] = (data.items || []).map((item: any) => ({
                ...item,
                uploadDate:   new Date(item.uploadDate),
                aiAnalyzedAt: item.aiAnalyzedAt ? new Date(item.aiAnalyzedAt) : undefined,
            }));

            setItems(mapped);
            setLastFetched(new Date());
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // ── تحديث حالة عنصر ──────────────────────────────────────
    const updateItemStatus = useCallback(async (
        item: MediaItem,
        newStatus: 'approved' | 'rejected' | 'flagged',
        reviewerId: string,
        notes?: string
    ) => {
        const res = await fetch('/api/media/update-status', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                r2Key:      item.r2Key,
                status:     newStatus,
                reviewedBy: reviewerId,
                notes:      notes ?? null,
            }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'فشل تحديث الحالة');

        setItems(prev => prev.map(i =>
            i.id === item.id ? { ...i, status: newStatus, notes: notes || i.notes } : i
        ));
    }, []);

    // ── تحديث حالة عناصر متعددة دفعة واحدة ──────────────────
    const bulkUpdateStatus = useCallback(async (
        bulkItems: MediaItem[],
        newStatus: 'approved' | 'rejected' | 'flagged',
        reviewerId: string
    ) => {
        await Promise.all(bulkItems.map(item =>
            fetch('/api/media/update-status', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    r2Key:      item.r2Key,
                    status:     newStatus,
                    reviewedBy: reviewerId,
                }),
            })
        ));
        const ids = new Set(bulkItems.map(i => i.id));
        setItems(prev => prev.map(i =>
            ids.has(i.id) ? { ...i, status: newStatus } : i
        ));
    }, []);

    // ── تحديث نتيجة AI ───────────────────────────────────────
    const updateItemAI = useCallback(async (
        itemId: string,
        analysis: string,
        rating: number | null
    ) => {
        // 1. تحديث محلي فوري
        setItems(prev => prev.map(i =>
            i.id === itemId
                ? { ...i, aiAnalysis: analysis, aiRating: rating ?? undefined, aiAnalyzedAt: new Date() }
                : i
        ));

        // 2. حفظ في Supabase عبر update-status API
        setItems(prev => {
            const item = prev.find(i => i.id === itemId);
            if (item?.r2Key) {
                fetch('/api/media/update-status', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({
                        r2Key:       item.r2Key,
                        aiAnalysis:  analysis,
                        aiRating:    rating,
                        aiAnalyzedAt: new Date().toISOString(),
                    }),
                }).catch(e => console.warn('[media] AI persist failed:', e));
            }
            return prev;
        });
    }, []);

    // ── حذف عنصر ─────────────────────────────────────────────
    const deleteItem = useCallback(async (item: MediaItem) => {
        const res = await fetch('/api/media/delete', {
            method:  'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ r2Key: item.r2Key, sourceType: item.sourceType }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'فشل الحذف');
        setItems(prev => prev.filter(i => i.id !== item.id));
    }, []);

    return { items, loading, error, lastFetched, fetchAll, updateItemStatus, bulkUpdateStatus, updateItemAI, deleteItem };
}
