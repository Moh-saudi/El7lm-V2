import { NextRequest, NextResponse } from 'next/server';
import { verifyAndActivateSkipCashPayment } from '@/lib/payments/skipcash-verification-service';
import { authorizeUser } from '@/lib/api/user-auth';
import { getSupabaseServiceRole } from '@/lib/supabase/admin';
import { resolveAuthenticatedPayer } from '@/lib/payments/payer-authorization';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authorization = await authorizeUser(request);
  if (!authorization.ok) return authorization.response;

  try {
    const body = await request.json();
    const providerPaymentId = String(body.paymentId || body.PaymentId || '').trim();

    if (!providerPaymentId) {
      return NextResponse.json({ success: false, message: 'Missing paymentId' }, { status: 400 });
    }

    const db = getSupabaseServiceRole();
    const { data: rows, error: lookupError } = await db
      .from('payments')
      .select('payer_id,payer_type')
      .eq('provider', 'skipcash')
      .eq('provider_reference_id', providerPaymentId)
      .limit(1);
    if (lookupError) throw lookupError;
    const payment = rows?.[0];
    if (!payment) return NextResponse.json({ success: false, message: 'Payment not found' }, { status: 404 });

    const payer = await resolveAuthenticatedPayer(authorization.user.id, payment.payer_type);
    if (!payer || payer.payerId !== String(payment.payer_id)) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
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
