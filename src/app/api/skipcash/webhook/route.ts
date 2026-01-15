
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { skipCashConfig } from '@/lib/skipcash/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const signature = request.headers.get('Authorization'); // Or specific header

        // SkipCash typically uses a custom header or Authorization for webhook signature
        // Since docs are not provided for exact webhook signature, we assume standard HMAC
        // We will log for debugging first

        const bodyText = await request.text();
        console.log('🔔 [SkipCash Webhook] Received:', bodyText);
        console.log('🔔 [SkipCash Webhook] Headers:', Object.fromEntries(request.headers));

        // Validation (Placeholder - requires exact SkipCash logic)
        // const isValid = verifySignature(bodyText, signature, skipCashConfig.webhookKey);
        // if (!isValid) { 
        //    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 }); 
        // }

        const body = JSON.parse(bodyText);

        // Handle Payment Status Update
        if (body.PaymentId && body.StatusId) {
            console.log(`✅ [SkipCash Webhook] Payment ${body.PaymentId} status: ${body.StatusId}`);
            // Update database here
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('❌ [SkipCash Webhook] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
