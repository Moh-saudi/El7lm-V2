/**
 * In-memory cache for media listing and moderation
 * Allows sharing and invalidation across routes without exporting from route.ts
 */

export interface MediaCacheEntry {
    items: any[];
    total: number;
    timestamp: number;
}

let cachedMedia: MediaCacheEntry | null = null;
let inFlightFetch: Promise<{ items: any[]; total: number }> | null = null;

export function getCachedMedia(ttlMs: number = 3 * 60 * 1000): MediaCacheEntry | null {
    if (!cachedMedia) return null;
    if (Date.now() - cachedMedia.timestamp > ttlMs) {
        return null;
    }
    return cachedMedia;
}

export function getStaleCachedMedia(): MediaCacheEntry | null {
    return cachedMedia;
}

export function setCachedMedia(items: any[], total: number) {
    cachedMedia = {
        items,
        total,
        timestamp: Date.now(),
    };
}

export function invalidateMediaCache() {
    cachedMedia = null;
}

export function getInFlightFetch() {
    return inFlightFetch;
}

export function setInFlightFetch(promise: Promise<{ items: any[]; total: number }> | null) {
    inFlightFetch = promise;
}
