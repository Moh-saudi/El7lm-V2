'use client';

import { useState, useCallback } from 'react';
import { MediaItem, FootballSkills } from '../types';
import { authenticatedFetch } from '@/lib/api/authenticated-fetch';
import { fixReceiptUrl } from '@/lib/utils/cloudflare-r2-utils';

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

const sanitizeMediaUrl = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined;

    const trimmed = value.trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return undefined;

    // Fix legacy defunct Supabase storage URLs
    if (trimmed.includes('supabase.co')) {
        const fixed = fixReceiptUrl(trimmed);
        if (fixed && !fixed.includes('supabase.co')) {
            return fixed;
        }
        return undefined; // Dead host - prevent browser DNS resolution error
    }

    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;

    return undefined;
};

export function useMediaData() {
    const [items, setItems]             = useState<MediaItem[]>([]);
    const [loading, setLoading]         = useState(false);
    const [error, setError]             = useState<string | null>(null);
    const [lastFetched, setLastFetched] = useState<Date | null>(null);

    // ── جلب كل الميديا من R2 و Supabase ──────────────────────
    const fetchAll = useCallback(async (forceRefresh: boolean | unknown = false) => {
        setLoading(true);
        setError(null);
        try {
            const shouldForce = forceRefresh === true;
            const url = shouldForce ? '/api/media/list-r2?refresh=1' : '/api/media/list-r2';
            const res  = await authenticatedFetch(url, { cache: 'no-store' });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'فشل جلب البيانات');

            // تحويل التواريخ من string إلى Date
            const mapped: MediaItem[] = (data.items || []).map((item: any) => ({
                ...item,
                url: sanitizeMediaUrl(item.url) || '',
                thumbnailUrl: sanitizeMediaUrl(item.thumbnailUrl),
                userImage: sanitizeMediaUrl(item.userImage),
                uploadDate:   new Date(item.uploadDate),
                aiAnalyzedAt: item.aiAnalyzedAt ? new Date(item.aiAnalyzedAt) : undefined,
            })).filter((item: MediaItem) => !!item.url);

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
        const res = await authenticatedFetch('/api/media/update-status', {
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

    // ── اعتماد ومزامنة تقييم المهارات مع ملف اللاعب ──────────
    const approveAndSyncSkills = useCallback(async (
        item: MediaItem,
        skills: FootballSkills,
        overallScore: number,
        dominantFoot: string,
        analystNotes: string,
        analysisText: string
    ) => {
        const res = await authenticatedFetch('/api/admin/media/approve-skills', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                r2Key:        item.r2Key,
                userId:       item.userId,
                skills,
                overallScore,
                dominantFoot,
                analystNotes,
                analysisText,
                mediaTitle:   item.title,
            }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'فشل اعتماد ومزامنة المهارات');

        // تحديث محلي فوري
        setItems(prev => prev.map(i =>
            i.id === item.id ? {
                ...i,
                status: 'approved',
                skills,
                overallScore,
                dominantFoot,
                notes: analystNotes || i.notes,
                aiAnalysis: analysisText || i.aiAnalysis,
                aiRating: Number((overallScore / 10).toFixed(1)),
                aiAnalyzedAt: new Date(),
            } : i
        ));
        return data;
    }, []);

    // ── تحديث حالة عناصر متعددة دفعة واحدة ──────────────────
    const bulkUpdateStatus = useCallback(async (
        bulkItems: MediaItem[],
        newStatus: 'approved' | 'rejected' | 'flagged',
        reviewerId: string
    ) => {
        await Promise.all(bulkItems.map(item =>
            authenticatedFetch('/api/media/update-status', {
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
        setItems(prev => prev.map(i =>
            i.id === itemId
                ? { ...i, aiAnalysis: analysis, aiRating: rating ?? undefined, aiAnalyzedAt: new Date() }
                : i
        ));

        setItems(prev => {
            const item = prev.find(i => i.id === itemId);
            if (item?.r2Key) {
                authenticatedFetch('/api/media/update-status', {
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

    // ── حذف عنصر فردي ─────────────────────────────────────────
    const deleteItem = useCallback(async (item: MediaItem, reason?: string) => {
        const res = await authenticatedFetch('/api/media/delete', {
            method:  'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                r2Key:      item.r2Key,
                sourceType: item.sourceType,
                userId:     item.userId,
                videoUrl:   item.url,
                title:      item.title,
                reason:     reason || '',
            }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'فشل الحذف');
        setItems(prev => prev.filter(i => i.id !== item.id && i.r2Key !== item.r2Key));
        return data;
    }, []);

    // ── حذف عناصر متعددة دفعة واحدة مع إشعار المستخدمين ─────────
    const bulkDelete = useCallback(async (targets: MediaItem[], reason?: string) => {
        if (!targets.length) return;
        const payloadItems = targets.map(item => ({
            r2Key:      item.r2Key,
            sourceType: item.sourceType,
            userId:     item.userId,
            videoUrl:   item.url,
            title:      item.title,
        }));
        const res = await authenticatedFetch('/api/media/delete', {
            method:  'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                items:  payloadItems,
                reason: reason || '',
            }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'فشل الحذف الجماعي');
        const idsToRemove = new Set(targets.map(i => i.id));
        const keysToRemove = new Set(targets.map(i => i.r2Key));
        setItems(prev => prev.filter(i => !idsToRemove.has(i.id) && !keysToRemove.has(i.r2Key)));
        return data;
    }, []);

    return {
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
        bulkDelete,
    };
}
