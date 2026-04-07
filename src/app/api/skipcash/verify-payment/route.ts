
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { config } from '@/lib/skipcash/config';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { paymentId, amount, status, transactionId, custom1 } = body;

        console.log('🔍 [SkipCash Verify] Verifying Payment:', { paymentId, amount, status });

        if (!paymentId) {
            return NextResponse.json({ success: false, message: 'Missing paymentId' }, { status: 400 });
        }

        const db = getSupabaseAdmin();

        // 1. Fetch Payment Details from SkipCash API
        const url = `${config.baseUrl}/api/v1/payments/${paymentId}`;
        const skipcashResponse = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': config.secretKey,
                'Content-Type': 'application/json'
            }
        });

        let details: Record<string, unknown> = {};

        if (skipcashResponse.ok) {
            const data = await skipcashResponse.json();
            details = data.resultObj;
            console.log('✅ [SkipCash Verify] Fetched details from API:', details);
        } else {
            const errorText = await skipcashResponse.text();
            console.warn('⚠️ [SkipCash Verify] API verification failed:', errorText);

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
        const customData = String(details.custom1 || custom1 || (body.userId ? `${body.userId}:direct` : ''));
        let userId = 'unknown';
        let metadata = '';

        if (customData) {
            const parts = customData.split(':');
            userId = parts[0] || 'unknown';
            metadata = parts[1] || '';
        }

        if (userId === 'unknown' && body.userId) userId = body.userId;

        if (userId === 'unknown' && details.email) {
            console.log('🔍 [SkipCash Verify] UID unknown, searching by email:', details.email);
            const { data: users } = await db.from('users').select('id').eq('email', details.email).limit(1);
            if (users?.length) {
                userId = String(users[0].id);
                console.log('✅ [SkipCash Verify] Found user by email:', userId);
            }
        }

        console.log('👤 [SkipCash Verify] User Context:', { userId, metadata });

        // 3. Determine Package info dynamically from Plans
        const { data: plansRows } = await db.from('subscription_plans').select('*');
        const allPlans = (plansRows ?? []) as Record<string, unknown>[];

        let subscriptionMonths = 3;
        const amountVal = Number(details.amount);
        if (amountVal >= 180) subscriptionMonths = 12;
        else if (amountVal >= 110) subscriptionMonths = 6;

        let packageName = subscriptionMonths === 12 ? 'اشتراك سنوي' : (subscriptionMonths === 6 ? 'اشتراك 6 شهور' : 'اشتراك 3 شهور');
        let packageType = subscriptionMonths === 12 ? 'subscription_annual' : (subscriptionMonths === 6 ? 'subscription_6months' : 'subscription_3months');

        const matchedPlanByMetadata = allPlans.find(p => p.id === metadata);
        const matchedPlanByAmount = allPlans.find(p => {
            const overrides = p.overrides as Record<string, Record<string, unknown>> | undefined;
            const priceQA = overrides?.QA?.price || (Number(p.base_price) * 3.65);
            return Math.abs(Number(priceQA) - Number(details.amount)) < 2;
        });

        const activePlan = matchedPlanByMetadata || matchedPlanByAmount;

        if (activePlan) {
            packageName = String(activePlan.title || activePlan.name || activePlan.package_name || packageName);
            packageType = String(activePlan.id);
            const periodStr = String(activePlan.period || '').toLowerCase();
            if (periodStr.includes('12') || periodStr.includes('year') || packageType.includes('annual')) subscriptionMonths = 12;
            else if (periodStr.includes('6')) subscriptionMonths = 6;
            else if (periodStr.includes('3')) subscriptionMonths = 3;
        } else {
            if (metadata.includes('annual') || metadata.includes('12months')) {
                packageName = 'اشتراك سنوي'; packageType = 'subscription_annual'; subscriptionMonths = 12;
            } else if (metadata.includes('6months')) {
                packageName = 'اشتراك 6 شهور'; packageType = 'subscription_6months'; subscriptionMonths = 6;
            }
        }

        // 4. Update or Create Invoice
        const now = new Date().toISOString();
        const potentialInvoiceId = String(details.transactionId || transactionId || '');

        let invoiceId: string;
        let invoiceNumber: string;

        if (potentialInvoiceId && potentialInvoiceId.length > 5) {
            const { data: existing } = await db.from('invoices').select('id, invoice_number').eq('id', potentialInvoiceId).limit(1);
            if (existing?.length) {
                // Update existing invoice
                await db.from('invoices').update({
                    paymentId,
                    transactionId: String(details.transactionId || transactionId || ''),
                    status: 'paid',
                    provider: 'skipcash',
                    originalStatus: String(details.status || 'Success'),
                    userId,
                    package_name: packageName,
                    packageName,
                    plan_name: packageName,
                    packageType,
                    updatedAt: now,
                    paidAt: now,
                    amount: details.amount,
                }).eq('id', potentialInvoiceId);
                invoiceId = potentialInvoiceId;
                invoiceNumber = String((existing[0] as Record<string, unknown>).invoice_number || `INV-${potentialInvoiceId.slice(-6)}`);
                console.log('✅ [SkipCash Verify] Pre-created invoice updated:', potentialInvoiceId);
            } else {
                // Create new invoice with specific ID
                invoiceNumber = String(details.invoiceId || `INV-${Date.now().toString().slice(-6)}`);
                await db.from('invoices').insert({
                    id: potentialInvoiceId,
                    paymentId,
                    transactionId: String(details.transactionId || transactionId || ''),
                    status: 'paid',
                    provider: 'skipcash',
                    originalStatus: String(details.status || 'Success'),
                    userId,
                    package_name: packageName,
                    packageName,
                    plan_name: packageName,
                    packageType,
                    createdAt: now,
                    created_at: now,
                    updatedAt: now,
                    paidAt: now,
                    amount: details.amount,
                    currency: 'QAR',
                    invoice_number: invoiceNumber,
                    customerName: details.firstName ? `${details.firstName} ${details.lastName}` : String(details.customerName || 'SkipCash Customer'),
                    customerEmail: String(details.email || ''),
                    country: 'QA',
                    method: 'skipcash',
                });
                invoiceId = potentialInvoiceId;
                console.log('📝 [SkipCash Verify] New invoice created:', invoiceId);
            }
        } else {
            // Create new invoice with generated ID
            invoiceId = crypto.randomUUID();
            invoiceNumber = String(details.invoiceId || `INV-${Date.now().toString().slice(-6)}`);
            await db.from('invoices').insert({
                id: invoiceId,
                paymentId,
                transactionId: String(details.transactionId || transactionId || ''),
                status: 'paid',
                provider: 'skipcash',
                originalStatus: String(details.status || 'Success'),
                userId,
                package_name: packageName,
                packageName,
                plan_name: packageName,
                packageType,
                createdAt: now,
                created_at: now,
                updatedAt: now,
                paidAt: now,
                amount: details.amount,
                currency: 'QAR',
                invoice_number: invoiceNumber,
                customerName: details.firstName ? `${details.firstName} ${details.lastName}` : String(details.customerName || 'SkipCash Customer'),
                customerEmail: String(details.email || ''),
                country: 'QA',
                method: 'skipcash',
            });
            console.log('📝 [SkipCash Verify] New invoice created (Fallback):', invoiceId);
        }

        // 5. Activate Subscription
        if (userId && userId !== 'unknown') {
            const expiresAt = new Date(Date.now() + subscriptionMonths * 30 * 24 * 60 * 60 * 1000).toISOString();

            await db.from('subscriptions').upsert({
                id: userId,
                userId,
                plan_name: packageName,
                package_name: packageName,
                packageType,
                start_date: now,
                end_date: expiresAt,
                expires_at: expiresAt,
                status: 'active',
                amount: details.amount,
                currency: 'QAR',
                payment_method: 'skipcash',
                payment_id: paymentId,
                activated_at: now,
                updated_at: now,
                invoice_number: invoiceNumber,
                is_auto_renew: false,
            });

            await db.from('users').update({
                subscriptionStatus: 'active',
                subscriptionExpiresAt: expiresAt,
                subscriptionEndDate: expiresAt,
                lastPaymentDate: now,
                lastPaymentMethod: 'skipcash',
                lastPaymentAmount: details.amount,
                packageType,
                selectedPackage: packageName,
                updatedAt: now,
            }).eq('id', userId);

            console.log('✅ [SkipCash Verify] Subscription activated for:', userId);
        }

        return NextResponse.json({ success: true, invoiceId });

    } catch (error: unknown) {
        console.error('❌ [SkipCash Verify] Error:', error);
        return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Unknown' }, { status: 500 });
    }
}
