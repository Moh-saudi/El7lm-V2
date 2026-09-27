import { NextRequest, NextResponse } from 'next/server';
import { verifyAndActivateSkipCashPayment } from '@/lib/payments/skipcash-verification-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const providerPaymentId = String(body.PaymentId || body.paymentId || '').trim();
    const statusId = Number(body.StatusId ?? body.statusId);

    if (!providerPaymentId) {
      return NextResponse.json({ success: false, error: 'Missing PaymentId' }, { status: 400 });
    }

    // The webhook payload is only a notification. We never trust its amount, plan,
    // transaction status, or player identity; paid status is re-fetched from SkipCash.
    if (statusId === 2) {
      const result = await verifyAndActivateSkipCashPayment(providerPaymentId);
      return NextResponse.json({ success: true, ...result });
    }

    // Non-paid notifications are acknowledged. A later paid notification will be
    // verified against SkipCash before any subscription activation occurs.
    return NextResponse.json({
      success: true,
      paymentId: providerPaymentId,
      statusId,
      activated: false,
    });
  } catch (error) {
    console.error('❌ [SkipCash Webhook] Verification failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
