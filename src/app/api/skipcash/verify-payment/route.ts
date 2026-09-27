import { NextRequest, NextResponse } from 'next/server';
import { verifyAndActivateSkipCashPayment } from '@/lib/payments/skipcash-verification-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const providerPaymentId = String(body.paymentId || body.PaymentId || '').trim();

    if (!providerPaymentId) {
      return NextResponse.json({ success: false, message: 'Missing paymentId' }, { status: 400 });
    }

    const result = await verifyAndActivateSkipCashPayment(providerPaymentId);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('❌ [SkipCash Verify] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = /not found|mismatch|not paid|invalid/i.test(message) ? 400 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}
