// src/types/pricing.ts
// أنواع البيانات لنظام التسعير

export interface PromotionalOffer {
    id: string;
    title: string;
    name?: string; // Opt
    description: string;
    code?: string;
    offerType?: 'flash_sale' | 'seasonal' | 'partnership' | 'early_bird';

    // الخصم
    discountType: 'percentage' | 'fixed';
    discountValue: number;

    // التواريخ
    startDate: string | Date;
    endDate: string | Date;

    // الحالة
    isActive: boolean;
    status?: 'draft' | 'scheduled' | 'active' | 'expired' | 'paused';

    // نطاق العرض (Scope)
    scope: 'all' | 'accountTypes' | 'specificAccounts' | 'countries';
    targetAccountTypes?: ('club' | 'academy' | 'trainer' | 'agent' | 'player')[];
    targetAccountIds?: string[];
    targetCountries?: string[];

    // الباقات المطبقة
    applicablePlans: string[];

    // حدود الاستخدام
    usageLimitType: 'unlimited' | 'total' | 'perUser';
    totalUsageLimit?: number;
    perUserLimit?: number;
    usageCount?: number;

    // شروط إضافية
    minPlayers?: number;
    minAmount?: number;

    // عرض
    displayBadge?: string;
    displayColor?: string;
}

// --- Subscription Plans Interfaces ---

export interface CountryOverride {
    currency: string;
    original_price: number;
    price: number;
    active: boolean;
}

export interface AccountTypeOverride {
    price?: number;
    original_price?: number;
    discount_percentage?: number;
    active: boolean;
}

export interface SubscriptionPlan {
    id: string;
    title: string;
    subtitle?: string;
    period: string; // e.g. '3 شهور' or 'yearly'

    // Base Pricing (Usually USD)
    base_currency: string;
    base_original_price: number;
    base_price: number;

    // Content
    features: string[];
    bonusFeatures?: string[];

    // Visuals
    popular?: boolean;
    icon?: string;
    color?: string;

    // Dynamic Pricing Overrides
    overrides?: Record<string, CountryOverride>; // Key is Country Code (e.g. 'EG', 'SA')
    accountTypeOverrides?: Record<string, AccountTypeOverride>; // Key is Account Type

    // System
    isActive: boolean;
    order?: number;
}

export interface PriceResult {
    currency: string;
    originalPrice: number;
    price: number;
    isOverride: boolean;
    accountTypeDiscount: number;
}
