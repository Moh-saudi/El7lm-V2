// ==================== Promotional Offers Service ====================
// دالات مساعدة للتحقق من العروض الترويجية وتطبيقها

import { PromotionalOffer } from '@/types/pricing';

/**
 * التحقق من إمكانية تطبيق العرض على المستخدم والطلب
 */
export function isOfferApplicable(
    offer: PromotionalOffer,
    context: {
        userAccountType?: string;
        userId?: string;
        userCountry?: string;
        selectedPlanId?: string;
        selectedPlayersCount?: number;
        totalAmount?: number;
    }
): { applicable: boolean; reason?: string } {

    // 1. التحقق من حالة العرض
    if (!offer.isActive) {
        return { applicable: false, reason: 'العرض غير نشط' };
    }

    // 2. التحقق من التواريخ
    const now = new Date();
    const startDate = new Date(offer.startDate);
    const endDate = new Date(offer.endDate);

    if (now < startDate) {
        return { applicable: false, reason: 'العرض لم يبدأ بعد' };
    }

    if (now > endDate) {
        return { applicable: false, reason: 'انتهى العرض' };
    }

    // 3. التحقق من النطاق (Scope)
    if (offer.scope === 'accountTypes') {
        if (!context.userAccountType || !offer.targetAccountTypes?.includes(context.userAccountType as any)) {
            return { applicable: false, reason: 'العرض غير متاح لنوع حسابك' };
        }
    } else if (offer.scope === 'specificAccounts') {
        if (!context.userId || !offer.targetAccountIds?.includes(context.userId)) {
            return { applicable: false, reason: 'العرض غير متاح لحسابك' };
        }
    } else if (offer.scope === 'countries') {
        if (!context.userCountry || !offer.targetCountries?.includes(context.userCountry)) {
            return { applicable: false, reason: 'العرض غير متاح في دولتك' };
        }
    }
    // scope === 'all' - متاح للجميع

    // 4. التحقق من الباقات المطبقة
    if (offer.applicablePlans && offer.applicablePlans.length > 0) {
        if (!context.selectedPlanId || !offer.applicablePlans.includes(context.selectedPlanId)) {
            return { applicable: false, reason: 'العرض غير متاح لهذه الباقة' };
        }
    }

    // 5. التحقق من حد أدنى للاعبين
    if (offer.minPlayers && offer.minPlayers > 0) {
        if (!context.selectedPlayersCount || context.selectedPlayersCount < offer.minPlayers) {
            return {
                applicable: false,
                reason: `العرض يتطلب ${offer.minPlayers} لاعب على الأقل`
            };
        }
    }

    // 6. التحقق من حد أدنى للمبلغ
    if (offer.minAmount && offer.minAmount > 0) {
        if (!context.totalAmount || context.totalAmount < offer.minAmount) {
            return {
                applicable: false,
                reason: `العرض يتطلب مبلغ $${offer.minAmount} على الأقل`
            };
        }
    }

    // 7. التحقق من حدود الاستخدام
    if (offer.usageLimitType === 'total') {
        if (offer.usageCount && offer.totalUsageLimit && offer.usageCount >= offer.totalUsageLimit) {
            return { applicable: false, reason: 'تم استنفاذ العرض' };
        }
    }
    // TODO: التحقق من perUser limit يتطلب استعلام Firebase

    // ✅ العرض قابل للتطبيق
    return { applicable: true };
}

/**
 * تطبيق الخصم على المبلغ
 */
export function applyDiscount(
    originalAmount: number,
    offer: PromotionalOffer
): { finalAmount: number; discountAmount: number } {

    let discountAmount = 0;

    if (offer.discountType === 'percentage') {
        // نسبة مئوية
        discountAmount = (originalAmount * offer.discountValue) / 100;
    } else {
        // قيمة ثابتة
        discountAmount = offer.discountValue;
    }

    // التأكد من أن الخصم لا يتجاوز المبلغ الأصلي
    discountAmount = Math.min(discountAmount, originalAmount);

    const finalAmount = originalAmount - discountAmount;

    return {
        finalAmount: Math.max(0, finalAmount), // التأكد من عدم النزول تحت الصفر
        discountAmount
    };
}

/**
 * الحصول على أفضل عرض متاح
 * (العرض الذي يعطي أكبر خصم)
 */
export function getBestOffer(
    offers: PromotionalOffer[],
    originalAmount: number,
    context: {
        userAccountType?: string;
        userId?: string;
        userCountry?: string;
        selectedPlanId?: string;
        selectedPlayersCount?: number;
        totalAmount?: number;
    }
): { offer: PromotionalOffer | null; finalAmount: number; discountAmount: number } {

    let bestOffer: PromotionalOffer | null = null;
    let maxDiscount = 0;

    for (const offer of offers) {
        const { applicable } = isOfferApplicable(offer, context);

        if (applicable) {
            const { discountAmount } = applyDiscount(originalAmount, offer);

            if (discountAmount > maxDiscount) {
                maxDiscount = discountAmount;
                bestOffer = offer;
            }
        }
    }

    if (bestOffer) {
        const { finalAmount, discountAmount } = applyDiscount(originalAmount, bestOffer);
        return { offer: bestOffer, finalAmount, discountAmount };
    }

    return { offer: null, finalAmount: originalAmount, discountAmount: 0 };
}

/**
 * عرض رسالة الخصم
 */
export function getDiscountMessage(offer: PromotionalOffer): string {
    if (offer.discountType === 'percentage') {
        return `خصم ${offer.discountValue}%`;
    } else {
        return `خصم $${offer.discountValue}`;
    }
}
