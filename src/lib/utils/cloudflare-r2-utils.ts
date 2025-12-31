/**
 * معالج الروابط الذكي لمنصة الحلم
 * يقوم بتصحيح الروابط المهاجرة من Supabase إلى Cloudflare R2
 * ويضمن إضافة النطاق الأساسي للروابط النسبية
 */

const CLOUDFLARE_BASE = 'https://assets.el7lm.com';

export function fixReceiptUrl(url: any): string | null {
    if (!url) return null;

    // Handle case where url might be an object { url: '...' } or { uri: '...' }
    if (typeof url === 'object') {
        url = url.url || url.uri || url.path || url.src || null;
    }

    if (!url || typeof url !== 'string') return null;

    let correctedUrl = url.trim();

    // 1. إذا كان الرابط قديماً من Supabase
    if (correctedUrl.includes('supabase.co')) {
        // البحث عن المسار الفعلي بعد object/
        const objectMarker = '/object/';
        const markerIndex = correctedUrl.indexOf(objectMarker);

        if (markerIndex !== -1) {
            // المسار بعد /object/ هو شيء مثل public/avatars/file.png أو avatars/file.png
            let pathPart = correctedUrl.substring(markerIndex + objectMarker.length);

            // إزالة 'public/' أو 'authenticated/' من البداية إذا وجدت
            if (pathPart.startsWith('public/')) {
                pathPart = pathPart.substring(7);
            } else if (pathPart.startsWith('authenticated/')) {
                pathPart = pathPart.substring(14);
            }

            if (pathPart) {
                return `${CLOUDFLARE_BASE}/${pathPart}`;
            }
        }
    }

    // 2. إذا كان مجرد مسار نسبي (مثلاً wallet/image.jpg)
    if (!correctedUrl.startsWith('http')) {
        const cleanPath = correctedUrl.startsWith('/') ? correctedUrl.substring(1) : correctedUrl;
        return `${CLOUDFLARE_BASE}/${cleanPath}`;
    }

    // 3. تصحيح أخطاء محتملة في الروابط التي تحتوي على تكرار للمسار
    if (correctedUrl.includes('assets.el7lm.com/assets/')) {
        return correctedUrl.replace('/assets/', '/');
    }

    return correctedUrl;
}
