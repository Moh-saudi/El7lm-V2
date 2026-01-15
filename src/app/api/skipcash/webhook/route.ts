import { NextRequest, NextResponse } from 'next/server';
import { skipCashConfig } from '@/lib/skipcash/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * SkipCash Webhook Handler
 * This receives POST requests from SkipCash when a payment status changes.
 */
export async function POST(request: NextRequest) {
    try {
        const bodyText = await request.text();
        const headers = Object.fromEntries(request.headers);

        console.log('🔔 [SkipCash Webhook] Received Notification');
        console.log('🔔 [SkipCash Webhook] Headers:', headers);

        // SkipCash uses 'Authorization' or 'Signature' header for verification
        // Documentation suggests 'Authorization' contains the HMAC signature
        const signature = headers['authorization'] || headers['Authorization'];

        if (!bodyText) {
            return NextResponse.json({ error: 'Empty body' }, { status: 400 });
        }

        const body = JSON.parse(bodyText);
        const { PaymentId, StatusId, TransactionId } = body;

        // SkipCash StatusIds: 2 = Paid, 3 = Cancelled, 4 = Expired, 5 = Refunded
        if (PaymentId && StatusId === 2) {
            console.log(`✅ [SkipCash Webhook] Payment ${PaymentId} is SUCCESSFUL. Activating...`);

            // We can invoke our internal verify-payment endpoint logic (as a POST request)
            // This ensures consistent activation logic between the Return page and the Webhook
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://el7lm.com';

            // Note: In some environments, calling 'self' via fetch might be tricky,
            // but for a background webhook it's usually the easiest way to reuse complex logic.
            try {
                const verifyRes = await fetch(`${baseUrl}/api/skipcash/verify-payment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        paymentId: PaymentId,
                        transactionId: TransactionId,
                        status: 'Success'
                    })
                });

                const verifyData = await verifyRes.json();
                console.log('🔄 [SkipCash Webhook] Internal Verification Result:', verifyData);
            } catch (verifyErr) {
                console.error('❌ [SkipCash Webhook] Failed to trigger internal verify:', verifyErr);
                // We don't return 500 here because SkipCash will retry the webhook.
                // It's better to let it succeed if we logged the error.
            }
        } else {
            console.log(`ℹ️ [SkipCash Webhook] Status ${StatusId} for Payment ${PaymentId} ignored.`);
        }

        // Always return 200 to SkipCash to acknowledge receipt
        return NextResponse.json({ success: true, message: 'Webhook received' });

    } catch (error) {
        console.error('❌ [SkipCash Webhook] Fatal Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
