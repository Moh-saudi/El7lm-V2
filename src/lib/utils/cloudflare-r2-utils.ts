/**
 * معالج الروابط الذكي لمنصة الحلم
 * يقوم بتصحيح الروابط المهاجرة من Supabase إلى Cloudflare R2
 * ويضمن إضافة النطاق الأساسي للروابط النسبية
 */

const CLOUDFLARE_BASE = 'https://assets.el7lm.com';

export function fixReceiptUrl(url: any): string | null {
    if (!url || typeof url !== 'string') return url || null;

    let correctedUrl = url.trim();

    // 1. إذا كان الرابط قديماً من Supabase
    if (correctedUrl.includes('supabase.co')) {
        // استخراج المسار بعد كلمة 'public/' أو 'object/'
        const parts = correctedUrl.split('/public/');
        let pathPart = parts.length > 1 ? parts[1] : null;

        if (!pathPart) {
            // محاولة البحث عن المسار بعد 'object/' وتجاوز الـ bucket name
            const objectParts = correctedUrl.split('/object/');
            if (objectParts.length > 1) {
                const pathSegments = objectParts[1].split('/');
                // السجمنت 0 هو الـ bucket (مثلاً wallet)، نبدأ من السجمنت 1
                pathPart = pathSegments.slice(2).join('/');
                if (!pathPart && pathSegments.length >= 2) {
                    // في حالة المسارات البسيطة
                    pathPart = pathSegments.slice(1).join('/');
                }
            }
        }

        if (pathPart) {
            // التأكد من عدم وجود تكرار في الـ bucket name إذا أردنا
            return `${CLOUDFLARE_BASE}/${pathPart}`;
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
