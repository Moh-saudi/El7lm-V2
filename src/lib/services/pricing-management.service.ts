import { getSupabaseAdmin } from '@/lib/supabase/admin';

// ==================== INTERFACES ====================

export interface SubscriptionPlan {
    id: string;
    name: string;
    key: 'monthly' | 'quarterly' | 'yearly';
    basePrice: number;
    currency: 'USD';
    duration: number;
    features: PlanFeature[];
    bonusFeatures: PlanFeature[];
    isActive: boolean;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface PlanFeature {
    id: string;
    name: string;
    description?: string;
    included: boolean;
}

export interface PricingOverride {
    id: string;
    planKey: 'monthly' | 'quarterly' | 'yearly';
    countryCode?: string;
    customPrice?: number;
    customCurrency?: string;
    organizationType?: 'club' | 'academy' | 'school';
    organizationId?: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    isActive: boolean;
    notes?: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface PromotionalOffer {
    id: string;
    name: string;
    description: string;
    code?: string;
    offerType: 'flash_sale' | 'seasonal' | 'partnership' | 'early_bird';
    applicablePlans: string[];
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    maxDiscount?: number;
    startDate: Date;
    endDate: Date;
    timezone: string;
    conditions: {
        minPlayers?: number;
        maxPlayers?: number;
        userTypes?: ('admin' | 'club' | 'academy')[];
        countries?: string[];
        newUsersOnly?: boolean;
    };
    status: 'draft' | 'scheduled' | 'active' | 'expired' | 'paused';
    usageLimit?: number;
    usageCount: number;
    displayBadge?: string;
    displayColor?: string;
    priority: number;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface PartnerPricing {
    id: string;
    partnerName: string;
    partnerCode: string;
    partnerType: 'federation' | 'league' | 'government' | 'corporate';
    customPricing: {
        monthly?: number;
        quarterly?: number;
        yearly?: number;
    };
    fixedDiscount?: {
        type: 'percentage' | 'fixed';
        value: number;
    };
    isPublic: boolean;
    requiresApproval: boolean;
    validFrom: Date;
    validUntil?: Date;
    activeSubscriptions: number;
    totalRevenue: number;
    contactPerson?: string;
    contactEmail?: string;
    contactPhone?: string;
    status: 'active' | 'inactive' | 'pending';
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

// ==================== PRICING SERVICE ====================

class PricingManagementService {
    // ========== SUBSCRIPTION PLANS ==========

    /**
     * Get all subscription plans
     */
    async getAllPlans(): Promise<SubscriptionPlan[]> {
        try {
            const db = getSupabaseAdmin();
            const { data, error } = await db
                .from('subscription_plans')
                .select('*')
                .order('displayOrder', { ascending: true });

            if (error) throw error;

            return (data || []).map(row => ({
                ...row,
                createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
                updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
            })) as SubscriptionPlan[];
        } catch (error) {
            console.error('Error getting plans:', error);
            throw error;
        }
    }

    /**
     * Get a single plan by key
     */
    async getPlanByKey(key: 'monthly' | 'quarterly' | 'yearly'): Promise<SubscriptionPlan | null> {
        try {
            const db = getSupabaseAdmin();
            const { data, error } = await db
                .from('subscription_plans')
                .select('*')
                .eq('key', key)
                .limit(1);

            if (error) throw error;
            if (!data || data.length === 0) return null;

            const row = data[0];
            return {
                ...row,
                createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
                updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
            } as SubscriptionPlan;
        } catch (error) {
            console.error('Error getting plan:', error);
            throw error;
        }
    }

    /**
     * Update plan pricing
     */
    async updatePlanPrice(planId: string, newPrice: number): Promise<void> {
        try {
            const db = getSupabaseAdmin();
            const { error } = await db
                .from('subscription_plans')
                .update({
                    basePrice: newPrice,
                    updatedAt: new Date().toISOString(),
                })
                .eq('id', planId);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating plan price:', error);
            throw error;
        }
    }

    /**
     * Update plan features
     */
    async updatePlanFeatures(
        planId: string,
        features: PlanFeature[],
        bonusFeatures: PlanFeature[]
    ): Promise<void> {
        try {
            const db = getSupabaseAdmin();
            const { error } = await db
                .from('subscription_plans')
                .update({
                    features,
                    bonusFeatures,
                    updatedAt: new Date().toISOString(),
                })
                .eq('id', planId);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating plan features:', error);
            throw error;
        }
    }

    /**
     * Toggle plan active status
     */
    async togglePlanStatus(planId: string, isActive: boolean): Promise<void> {
        try {
            const db = getSupabaseAdmin();
            const { error } = await db
                .from('subscription_plans')
                .update({
                    isActive,
                    updatedAt: new Date().toISOString(),
                })
                .eq('id', planId);

            if (error) throw error;
        } catch (error) {
            console.error('Error toggling plan status:', error);
            throw error;
        }
    }

    // ========== PRICING OVERRIDES ==========

    /**
     * Get pricing overrides for a country
     */
    async getPricingOverridesForCountry(countryCode: string): Promise<PricingOverride[]> {
        try {
            const db = getSupabaseAdmin();
            const { data, error } = await db
                .from('pricing_overrides')
                .select('*')
                .eq('countryCode', countryCode)
                .eq('isActive', true);

            if (error) throw error;

            return (data || []).map(row => ({
                ...row,
                createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
                updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
            })) as PricingOverride[];
        } catch (error) {
            console.error('Error getting pricing overrides:', error);
            throw error;
        }
    }

    /**
     * Get pricing override for organization
     */
    async getPricingOverrideForOrganization(organizationId: string): Promise<PricingOverride | null> {
        try {
            const db = getSupabaseAdmin();
            const { data, error } = await db
                .from('pricing_overrides')
                .select('*')
                .eq('organizationId', organizationId)
                .eq('isActive', true)
                .limit(1);

            if (error) throw error;
            if (!data || data.length === 0) return null;

            const row = data[0];
            return {
                ...row,
                createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
                updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
            } as PricingOverride;
        } catch (error) {
            console.error('Error getting organization pricing:', error);
            throw error;
        }
    }

    /**
     * Create pricing override
     */
    async createPricingOverride(
        override: Omit<PricingOverride, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<string> {
        try {
            const db = getSupabaseAdmin();
            const id = crypto.randomUUID();
            const now = new Date().toISOString();

            const { error } = await db
                .from('pricing_overrides')
                .insert({
                    id,
                    ...override,
                    createdAt: now,
                    updatedAt: now,
                });

            if (error) throw error;

            return id;
        } catch (error) {
            console.error('Error creating pricing override:', error);
            throw error;
        }
    }

    /**
     * Update pricing override
     */
    async updatePricingOverride(
        overrideId: string,
        updates: Partial<PricingOverride>
    ): Promise<void> {
        try {
            const db = getSupabaseAdmin();
            const { error } = await db
                .from('pricing_overrides')
                .update({
                    ...updates,
                    updatedAt: new Date().toISOString(),
                })
                .eq('id', overrideId);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating pricing override:', error);
            throw error;
        }
    }

    /**
     * Delete pricing override
     */
    async deletePricingOverride(overrideId: string): Promise<void> {
        try {
            const db = getSupabaseAdmin();
            const { error } = await db
                .from('pricing_overrides')
                .delete()
                .eq('id', overrideId);

            if (error) throw error;
        } catch (error) {
            console.error('Error deleting pricing override:', error);
            throw error;
        }
    }

    // ========== PROMOTIONAL OFFERS ==========

    /**
     * Get all active offers
     */
    async getActiveOffers(): Promise<PromotionalOffer[]> {
        try {
            const db = getSupabaseAdmin();
            const now = new Date().toISOString();

            const { data, error } = await db
                .from('promotional_offers')
                .select('*')
                .eq('status', 'active')
                .lte('startDate', now)
                .gte('endDate', now)
                .order('priority', { ascending: false });

            if (error) throw error;

            return (data || []).map(row => ({
                ...row,
                startDate: row.startDate ? new Date(row.startDate) : new Date(),
                endDate: row.endDate ? new Date(row.endDate) : new Date(),
                createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
                updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
            })) as PromotionalOffer[];
        } catch (error) {
            console.error('Error getting active offers:', error);
            throw error;
        }
    }

    /**
     * Get offer by code
     */
    async getOfferByCode(code: string): Promise<PromotionalOffer | null> {
        try {
            const db = getSupabaseAdmin();
            const { data, error } = await db
                .from('promotional_offers')
                .select('*')
                .eq('code', code)
                .limit(1);

            if (error) throw error;
            if (!data || data.length === 0) return null;

            const row = data[0];
            return {
                ...row,
                startDate: row.startDate ? new Date(row.startDate) : new Date(),
                endDate: row.endDate ? new Date(row.endDate) : new Date(),
                createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
                updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
            } as PromotionalOffer;
        } catch (error) {
            console.error('Error getting offer by code:', error);
            throw error;
        }
    }

    /**
     * Create promotional offer
     */
    async createOffer(
        offer: Omit<PromotionalOffer, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>
    ): Promise<string> {
        try {
            const db = getSupabaseAdmin();
            const id = crypto.randomUUID();
            const now = new Date().toISOString();

            const { error } = await db
                .from('promotional_offers')
                .insert({
                    id,
                    ...offer,
                    usageCount: 0,
                    startDate: offer.startDate.toISOString(),
                    endDate: offer.endDate.toISOString(),
                    createdAt: now,
                    updatedAt: now,
                });

            if (error) throw error;

            return id;
        } catch (error) {
            console.error('Error creating offer:', error);
            throw error;
        }
    }

    /**
     * Increment offer usage count
     */
    async incrementOfferUsage(offerId: string): Promise<void> {
        try {
            const db = getSupabaseAdmin();
            const { data, error: fetchError } = await db
                .from('promotional_offers')
                .select('*')
                .eq('id', offerId)
                .limit(1);

            if (fetchError) throw fetchError;
            if (!data || data.length === 0) {
                throw new Error('Offer not found');
            }

            const offerData = data[0];
            const currentCount = offerData.usageCount || 0;
            const usageLimit = offerData.usageLimit;

            if (usageLimit && currentCount >= usageLimit) {
                throw new Error('Usage limit reached');
            }

            const { error: updateError } = await db
                .from('promotional_offers')
                .update({
                    usageCount: currentCount + 1,
                    updatedAt: new Date().toISOString(),
                })
                .eq('id', offerId);

            if (updateError) throw updateError;
        } catch (error) {
            console.error('Error incrementing offer usage:', error);
            throw error;
        }
    }

    /**
     * Update offer status
     */
    async updateOfferStatus(
        offerId: string,
        status: PromotionalOffer['status']
    ): Promise<void> {
        try {
            const db = getSupabaseAdmin();
            const { error } = await db
                .from('promotional_offers')
                .update({
                    status,
                    updatedAt: new Date().toISOString(),
                })
                .eq('id', offerId);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating offer status:', error);
            throw error;
        }
    }

    // ========== PARTNER PRICING ==========

    /**
     * Get all partners
     */
    async getAllPartners(): Promise<PartnerPricing[]> {
        try {
            const db = getSupabaseAdmin();
            const { data, error } = await db
                .from('partner_pricing')
                .select('*');

            if (error) throw error;

            return (data || []).map(row => ({
                ...row,
                validFrom: row.validFrom ? new Date(row.validFrom) : new Date(),
                validUntil: row.validUntil ? new Date(row.validUntil) : undefined,
                createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
                updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
            })) as PartnerPricing[];
        } catch (error) {
            console.error('Error getting partners:', error);
            throw error;
        }
    }

    /**
     * Get partner by code
     */
    async getPartnerByCode(code: string): Promise<PartnerPricing | null> {
        try {
            const db = getSupabaseAdmin();
            const { data, error } = await db
                .from('partner_pricing')
                .select('*')
                .eq('partnerCode', code)
                .eq('status', 'active')
                .limit(1);

            if (error) throw error;
            if (!data || data.length === 0) return null;

            const row = data[0];
            return {
                ...row,
                validFrom: row.validFrom ? new Date(row.validFrom) : new Date(),
                validUntil: row.validUntil ? new Date(row.validUntil) : undefined,
                createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
                updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
            } as PartnerPricing;
        } catch (error) {
            console.error('Error getting partner by code:', error);
            throw error;
        }
    }

    /**
     * Create partner
     */
    async createPartner(
        partner: Omit<PartnerPricing, 'id' | 'activeSubscriptions' | 'totalRevenue' | 'createdAt' | 'updatedAt'>
    ): Promise<string> {
        try {
            const db = getSupabaseAdmin();
            const id = crypto.randomUUID();
            const now = new Date().toISOString();

            const { error } = await db
                .from('partner_pricing')
                .insert({
                    id,
                    ...partner,
                    activeSubscriptions: 0,
                    totalRevenue: 0,
                    validFrom: partner.validFrom.toISOString(),
                    validUntil: partner.validUntil ? partner.validUntil.toISOString() : null,
                    createdAt: now,
                    updatedAt: now,
                });

            if (error) throw error;

            return id;
        } catch (error) {
            console.error('Error creating partner:', error);
            throw error;
        }
    }

    // ========== PRICE CALCULATION ==========

    /**
     * Calculate final price with all discounts and overrides
     */
    async calculateFinalPrice(params: {
        planKey: 'monthly' | 'quarterly' | 'yearly';
        countryCode?: string;
        organizationId?: string;
        partnerCode?: string;
        offerCode?: string;
        playerCount?: number;
        userType?: 'admin' | 'club' | 'academy';
    }): Promise<{
        originalPrice: number;
        finalPrice: number;
        discounts: Array<{
            type: string;
            amount: number;
            description: string;
        }>;
        currency: string;
    }> {
        try {
            // Get base plan
            const plan = await this.getPlanByKey(params.planKey);
            if (!plan) throw new Error('Plan not found');

            let finalPrice = plan.basePrice;
            let currency = 'USD';
            const discounts: Array<{ type: string; amount: number; description: string }> = [];

            // Check for country override
            if (params.countryCode) {
                const overrides = await this.getPricingOverridesForCountry(params.countryCode);
                const planOverride = overrides.find(o => o.planKey === params.planKey);

                if (planOverride && planOverride.customPrice) {
                    finalPrice = planOverride.customPrice;
                    currency = planOverride.customCurrency || 'USD';
                }
            }

            // Check for partner pricing
            if (params.partnerCode) {
                const partner = await this.getPartnerByCode(params.partnerCode);
                if (partner && partner.status === 'active') {
                    if (partner.customPricing[params.planKey]) {
                        const partnerPrice = partner.customPricing[params.planKey]!;
                        const discount = finalPrice - partnerPrice;
                        if (discount > 0) {
                            discounts.push({
                                type: 'partner',
                                amount: discount,
                                description: `خصم شريك: ${partner.partnerName}`,
                            });
                            finalPrice = partnerPrice;
                        }
                    }
                }
            }

            // Check for promotional offer
            if (params.offerCode) {
                const offer = await this.getOfferByCode(params.offerCode);
                if (offer && offer.status === 'active') {
                    // Check conditions
                    let isEligible = true;

                    if (offer.conditions.minPlayers && params.playerCount) {
                        isEligible = isEligible && params.playerCount >= offer.conditions.minPlayers;
                    }

                    if (offer.conditions.userTypes && params.userType) {
                        isEligible = isEligible && offer.conditions.userTypes.includes(params.userType);
                    }

                    if (isEligible) {
                        let discountAmount = 0;
                        if (offer.discountType === 'percentage') {
                            discountAmount = (finalPrice * offer.discountValue) / 100;
                            if (offer.maxDiscount) {
                                discountAmount = Math.min(discountAmount, offer.maxDiscount);
                            }
                        } else {
                            discountAmount = offer.discountValue;
                        }

                        discounts.push({
                            type: 'promotional',
                            amount: discountAmount,
                            description: offer.name,
                        });
                        finalPrice = Math.max(0, finalPrice - discountAmount);
                    }
                }
            }

            return {
                originalPrice: plan.basePrice,
                finalPrice,
                discounts,
                currency,
            };
        } catch (error) {
            console.error('Error calculating final price:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const pricingService = new PricingManagementService();
export default pricingService;
