
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { config } from '@/lib/skipcash/config';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { paymentId, amount, status, transactionId, custom1 } = body;

        console.log('🔍 [SkipCash Verify] Verifying Payment (Admin SDK):', { paymentId, amount, status });

        if (!paymentId) {
            return NextResponse.json({ success: false, message: 'Missing paymentId' }, { status: 400 });
        }

        // Initialize Admin SDK if needed (it does auto-init but safe to check)
        if (!adminDb) {
            console.error('❌ [SkipCash Verify] Admin SDK not initialized');
            // Fail gracefully or try fallback? No, correct permissions are critical here.
            return NextResponse.json({ success: false, message: 'Server configuration error' }, { status: 500 });
        }

        // 1. Fetch Payment Details from SkipCash API directly
        // Correct endpoint is usually plural /api/v1/payments/
        const url = `${config.baseUrl}/api/v1/payments/${paymentId}`;
        const skipcashResponse = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': config.authorization,
                'Content-Type': 'application/json'
            }
        });

        let details: any = {};

        if (skipcashResponse.ok) {
            const data = await skipcashResponse.json();
            details = data.resultObj;
            console.log('✅ [SkipCash Verify] Fetched details from API:', details);
        } else {
            const errorText = await skipcashResponse.text();
            console.warn('⚠️ [SkipCash Verify] API verification failed:', errorText);

            // If API fails, we try to reconstruct from body but ONLY in test mode
            if (process.env.SKIPCASH_MODE === 'live') {
                return NextResponse.json({ success: false, message: 'Payment verification failed' }, { status: 400 });
            }

            details = {
                statusId: 2,
                amount: amount || '0.00',
                transactionId: transactionId || `TEST-${Date.now()}`,
                custom1: custom1 || (body.userId ? `${body.userId}:recovery` : '')
            };
        }

        // 2. Parse Metadata
        const customData = details.custom1 || custom1 || (body.userId ? `${body.userId}:direct` : '');
        let userId = 'unknown';
        let metadata = '';

        if (customData) {
            const parts = customData.split(':');
            userId = parts[0] || 'unknown';
            metadata = parts[1] || '';
        }

        // Final fallback for userId from body if still unknown
        if (userId === 'unknown' && body.userId) {
            userId = body.userId;
        }

        // Search for user by email if userId is unknown
        if (userId === 'unknown' && details.email) {
            console.log('🔍 [SkipCash Verify] UID unknown, searching by email:', details.email);
            const userSearch = await adminDb.collection('users').where('email', '==', details.email).get();
            if (!userSearch.empty) {
                userId = userSearch.docs[0].id;
                console.log('✅ [SkipCash Verify] Found user by email:', userId);
            }
        }

        console.log('👤 [SkipCash Verify] User Context:', { userId, metadata });

        // 3. Determine Package info dynamically from Plans
        const plansSnap = await adminDb.collection('subscription_plans').get();
        const allPlans = plansSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

        // Default values
        // Smart Defaulting based on amount if matching fails
        let subscriptionMonths = 3;
        let amountVal = Number(details.amount);
        if (amountVal >= 180) subscriptionMonths = 12;
        else if (amountVal >= 110) subscriptionMonths = 6;

        let packageName = subscriptionMonths === 12 ? 'اشتراك سنوي' : (subscriptionMonths === 6 ? 'اشتراك 6 شهور' : 'اشتراك 3 شهور');
        let packageType = subscriptionMonths === 12 ? 'subscription_annual' : (subscriptionMonths === 6 ? 'subscription_6months' : 'subscription_3months');

        // Smart Discovery:
        // A. Match by Metadata (if it contains a valid plan ID)
        const matchedPlanByMetadata = allPlans.find(p => p.id === metadata);

        // B. Match by Amount (lookup in all plans including overrides for Qatar/QA)
        const matchedPlanByAmount = allPlans.find(p => {
            const priceQA = p.overrides?.QA?.price || (p.base_price * 3.65); // Approx QAR conversion if no override
            const amountDiff = Math.abs(Number(priceQA) - Number(details.amount));
            return amountDiff < 2; // Allow small rounding diffs
        });

        const activePlan = matchedPlanByMetadata || matchedPlanByAmount;

        if (activePlan) {
            packageName = activePlan.title || activePlan.name || activePlan.package_name || packageName;
            packageType = activePlan.id;
            const periodStr = (activePlan.period || '').toLowerCase();
            if (periodStr.includes('12') || periodStr.includes('year') || packageType.includes('annual')) subscriptionMonths = 12;
            else if (periodStr.includes('6')) subscriptionMonths = 6;
            else if (periodStr.includes('3')) subscriptionMonths = 3;
        } else {
            // Safety fallback if no plan found (Heuristic based on keywords in metadata)
            if (metadata.includes('annual') || metadata.includes('12months')) {
                packageName = 'اشتراك سنوي';
                packageType = 'subscription_annual';
                subscriptionMonths = 12;
            } else if (metadata.includes('6months')) {
                packageName = 'اشتراك 6 شهور';
                packageType = 'subscription_6months';
                subscriptionMonths = 6;
            }
        }

        // 4. Update or Create Invoice (using Admin SDK)
        const now = new Date();
        const timestampNow = Timestamp.fromDate(now);

        // Let's check if transactionId is an existing invoice ID (Pre-created system)
        let invoiceRef;
        const potentialInvoiceId = details.transactionId || transactionId;

        if (potentialInvoiceId && potentialInvoiceId.length > 5) { // Simple check for ID
            const existingDoc = await adminDb.collection('invoices').doc(potentialInvoiceId).get();
            if (existingDoc.exists) {
                invoiceRef = adminDb.collection('invoices').doc(potentialInvoiceId);
                console.log('📦 [SkipCash Verify] Found pre-created invoice:', potentialInvoiceId);
            }
        }

        const invoiceData: any = {
            paymentId: paymentId,
            transactionId: details.transactionId || transactionId,
            status: 'paid',
            provider: 'skipcash',
            originalStatus: details.status || 'Success',
            userId: userId,
            package_name: packageName,
            packageName: packageName,
            plan_name: packageName,
            packageType: packageType,
            updatedAt: timestampNow,
            paidAt: timestampNow,
            amount: details.amount, // Record actual paid amount
        };

        // Add required fields if it's a NEW invoice
        if (!invoiceRef) {
            invoiceData.createdAt = timestampNow;
            invoiceData.created_at = timestampNow;
            invoiceData.currency = 'QAR';
            invoiceData.invoice_number = details?.invoiceId || `INV-${Date.now().toString().slice(-6)}`;
            invoiceData.customerName = details.firstName ? `${details.firstName} ${details.lastName}` : (details.customerName || 'SkipCash Customer');
            invoiceData.customerEmail = details.email || '';
            invoiceData.country = 'QA';
            invoiceData.method = 'skipcash';

            const newDoc = await adminDb.collection('invoices').add(invoiceData);
            invoiceRef = newDoc;
            console.log('📝 [SkipCash Verify] New invoice created (Fallback):', newDoc.id);
        } else {
            await invoiceRef.update(invoiceData);
            console.log('✅ [SkipCash Verify] Pre-created invoice updated:', potentialInvoiceId);
        }

        // 5. Activate Subscription (Server logic using Admin SDK)
        if (userId && userId !== 'unknown') {
            const expiresAt = new Date(now.getTime() + subscriptionMonths * 30 * 24 * 60 * 60 * 1000);

            // Subscription Document
            const subscriptionData = {
                userId: userId,
                plan_name: packageName,
                package_name: packageName,
                packageType: packageType,
                start_date: timestampNow,
                end_date: Timestamp.fromDate(expiresAt),
                expires_at: Timestamp.fromDate(expiresAt),
                status: 'active',
                amount: details.amount,
                currency: 'QAR',
                payment_method: 'skipcash',
                payment_id: paymentId,
                activated_at: timestampNow,
                updated_at: timestampNow,
                invoice_number: (await invoiceRef.get()).data()?.invoice_number || `INV-${Date.now().toString().slice(-6)}`,
                is_auto_renew: false
            };

            // Set/Merge subscription
            await adminDb.collection('subscriptions').doc(userId).set(subscriptionData, { merge: true });

            // Update User Profile
            await adminDb.collection('users').doc(userId).update({
                subscriptionStatus: 'active',
                subscriptionExpiresAt: Timestamp.fromDate(expiresAt),
                subscriptionEndDate: Timestamp.fromDate(expiresAt), // Legacy field support
                lastPaymentDate: timestampNow,
                lastPaymentMethod: 'skipcash',
                lastPaymentAmount: details.amount,
                packageType: packageType,
                selectedPackage: packageName,
                updatedAt: timestampNow
            });

            console.log('✅ [SkipCash Verify] Subscription activated for:', userId);
        }

        return NextResponse.json({
            success: true,
            invoiceId: invoiceRef.id,
            data: invoiceData
        });

    } catch (error: any) {
        console.error('❌ [SkipCash Verify] Error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
