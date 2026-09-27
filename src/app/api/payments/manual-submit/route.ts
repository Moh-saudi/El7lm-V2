import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createCanonicalPayment, PayerType } from '@/lib/payments/canonical-payment-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  payerId: string;
  payerType: PayerType;
  planId: string;
  targetPlayerIds: string[];
  countryCode: string;
  method: string;
  receiptUrl: string;
};

const MANUAL_METHODS = new Set([
  'vodafone_cash', 'etisalat_cash', 'instapay', 'fawran',
  'bank_transfer', 'stc_pay', 'wallet',
]);

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;
    if (!body.payerId || !body.payerType || !body.planId || !body.targetPlayerIds?.length ||
        !body.countryCode || !body.method || !body.receiptUrl) {
      return NextResponse.json({ success: false, error: 'Missing required manual payment fields' }, { status: 400 });
    }
    if (!MANUAL_METHODS.has(body.method)) {
      return NextResponse.json({ success: false, error: 'Unsupported manual payment method' }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const { data: plans, error: planError } = await db
      .from('subscription_plans')
      .select('id, base_price, base_currency, overrides, isActive')
      .eq('id', body.planId)
      .limit(1);
    if (planError) throw planError;
    const plan = plans?.[0] as Record<string, any> | undefined;
    if (!plan || plan.isActive === false) {
      return NextResponse.json({ success: false, error: 'Invalid or inactive plan' }, { status: 400 });
    }

    const country = body.countryCode.toUpperCase();
    const override = plan.overrides?.[country];
    const unitPrice = Number(override?.price ?? plan.base_price);
    const currency = String(override?.currency ?? plan.base_currency).toUpperCase();
    if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error('Invalid plan price');

    const payment = await createCanonicalPayment({
      payerId: body.payerId,
      payerType: body.payerType,
      planId: body.planId,
      countryCode: country,
      amount: unitPrice * body.targetPlayerIds.length,
      currency,
      method: body.method,
      provider: 'manual',
      targetPlayerIds: body.targetPlayerIds,
      receiptUrl: body.receiptUrl,
      status: 'pending_review',
      metadata: { submitted_via: 'manual_payment_api' },
    });

    return NextResponse.json({ success: true, paymentId: payment.id, status: payment.status });
  } catch (error) {
    console.error('❌ [Manual Payment] Submission failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
