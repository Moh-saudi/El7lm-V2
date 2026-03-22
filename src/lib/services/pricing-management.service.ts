import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp,
    writeBatch,
} from 'firebase/firestore';
// @ts-ignore
import { db } from './config';

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
            const plansRef = collection(db, 'subscription_plans');
            const q = query(plansRef, orderBy('displayOrder', 'asc'));
            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate(),
                updatedAt: doc.data().updatedAt?.toDate(),
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
            const plansRef = collection(db, 'subscription_plans');
            const q = query(plansRef, where('key', '==', key));
            const snapshot = await getDocs(q);

            if (snapshot.empty) return null;

            const doc = snapshot.docs[0];
            return {
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate(),
                updatedAt: doc.data().updatedAt?.toDate(),
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
            const planRef = doc(db, 'subscription_plans', planId);
            await updateDoc(planRef, {
                basePrice: newPrice,
                updatedAt: Timestamp.now(),
            });
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
            const planRef = doc(db, 'subscription_plans', planId);
            await updateDoc(planRef, {
                features,
                bonusFeatures,
                updatedAt: Timestamp.now(),
            });
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
            const planRef = doc(db, 'subscription_plans', planId);
            await updateDoc(planRef, {
                isActive,
                updatedAt: Timestamp.now(),
            });
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
            const overridesRef = collection(db, 'pricing_overrides');
            const q = query(
                overridesRef,
                where('countryCode', '==', countryCode),
                where('isActive', '==', true)
            );
            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate(),
                updatedAt: doc.data().updatedAt?.toDate(),
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
            const overridesRef = collection(db, 'pricing_overrides');
            const q = query(
                overridesRef,
                where('organizationId', '==', organizationId),
                where('isActive', '==', true)
            );
            const snapshot = await getDocs(q);

            if (snapshot.empty) return null;

            const doc = snapshot.docs[0];
            return {
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate(),
                updatedAt: doc.data().updatedAt?.toDate(),
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
            const overridesRef = collection(db, 'pricing_overrides');
            const newOverrideRef = doc(overridesRef);

            await setDoc(newOverrideRef, {
                ...override,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });

            return newOverrideRef.id;
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
            const overrideRef = doc(db, 'pricing_overrides', overrideId);
            await updateDoc(overrideRef, {
                ...updates,
                updatedAt: Timestamp.now(),
            });
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
            const overrideRef = doc(db, 'pricing_overrides', overrideId);
            await deleteDoc(overrideRef);
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
            const offersRef = collection(db, 'promotional_offers');
            const now = Timestamp.now();

            const q = query(
                offersRef,
                where('status', '==', 'active'),
                where('startDate', '<=', now),
                where('endDate', '>=', now),
                orderBy('priority', 'desc')
            );

            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                startDate: doc.data().startDate?.toDate(),
                endDate: doc.data().endDate?.toDate(),
                createdAt: doc.data().createdAt?.toDate(),
                updatedAt: doc.data().updatedAt?.toDate(),
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
            const offersRef = collection(db, 'promotional_offers');
            const q = query(offersRef, where('code', '==', code));
            const snapshot = await getDocs(q);

            if (snapshot.empty) return null;

            const doc = snapshot.docs[0];
            return {
                id: doc.id,
                ...doc.data(),
                startDate: doc.data().startDate?.toDate(),
                endDate: doc.data().endDate?.toDate(),
                createdAt: doc.data().createdAt?.toDate(),
                updatedAt: doc.data().updatedAt?.toDate(),
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
            const offersRef = collection(db, 'promotional_offers');
            const newOfferRef = doc(offersRef);

            await setDoc(newOfferRef, {
                ...offer,
                usageCount: 0,
                startDate: Timestamp.fromDate(offer.startDate),
                endDate: Timestamp.fromDate(offer.endDate),
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });

            return newOfferRef.id;
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
            const offerRef = doc(db, 'promotional_offers', offerId);
            const offerDoc = await getDoc(offerRef);

            if (!offerDoc.exists()) {
                throw new Error('Offer not found');
            }

            const currentCount = offerDoc.data().usageCount || 0;
            const usageLimit = offerDoc.data().usageLimit;

            if (usageLimit && currentCount >= usageLimit) {
                throw new Error('Usage limit reached');
            }

            await updateDoc(offerRef, {
                usageCount: currentCount + 1,
                updatedAt: Timestamp.now(),
            });
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
            const offerRef = doc(db, 'promotional_offers', offerId);
            await updateDoc(offerRef, {
                status,
                updatedAt: Timestamp.now(),
            });
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
            const partnersRef = collection(db, 'partner_pricing');
            const snapshot = await getDocs(partnersRef);

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                validFrom: doc.data().validFrom?.toDate(),
                validUntil: doc.data().validUntil?.toDate(),
                createdAt: doc.data().createdAt?.toDate(),
                updatedAt: doc.data().updatedAt?.toDate(),
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
            const partnersRef = collection(db, 'partner_pricing');
            const q = query(
                partnersRef,
                where('partnerCode', '==', code),
                where('status', '==', 'active')
            );
            const snapshot = await getDocs(q);

            if (snapshot.empty) return null;

            const doc = snapshot.docs[0];
            return {
                id: doc.id,
                ...doc.data(),
                validFrom: doc.data().validFrom?.toDate(),
                validUntil: doc.data().validUntil?.toDate(),
                createdAt: doc.data().createdAt?.toDate(),
                updatedAt: doc.data().updatedAt?.toDate(),
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
            const partnersRef = collection(db, 'partner_pricing');
            const newPartnerRef = doc(partnersRef);

            await setDoc(newPartnerRef, {
                ...partner,
                activeSubscriptions: 0,
                totalRevenue: 0,
                validFrom: Timestamp.fromDate(partner.validFrom),
                validUntil: partner.validUntil ? Timestamp.fromDate(partner.validUntil) : null,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });

            return newPartnerRef.id;
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
