import { NextRequest, NextResponse } from 'next/server';
import { createSkipCashPayment } from '@/lib/skipcash/client';
import { SkipCashPaymentRequest } from '@/lib/skipcash/types';
import { getSupabaseServiceRole } from '@/lib/supabase/admin';
import { authorizeUser } from '@/lib/api/user-auth';
import { resolveAuthenticatedPayer, assertPaymentTargetOwnership } from '@/lib/payments/payer-authorization';
import { createCanonicalPayment, PayerType } from '@/lib/payments/canonical-payment-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type CreateSessionBody = {
  payerId: string;
  payerType: PayerType;
  planId: string;
  targetPlayerIds: string[];
  customerEmail: string;
  customerPhone: string;
  customerName?: string;
  returnUrl?: string;
};

function getQatarPlanPrice(plan: Record<string, unknown>): number {
  const overrides = plan.overrides as Record<string, Record<string, unknown>> | null;
  const qa = overrides?.QA;
  const price = Number(qa?.price ?? plan.base_price);
  if (!Number.isFinite(price) || price < 0) throw new Error('invalid Qatar plan price');
  return price;
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeUser(request);
  if (!authorization.ok) return authorization.response;

  try {
    const body = (await request.json()) as CreateSessionBody;
    if (!body.payerId || !body.payerType || !body.planId || !body.targetPlayerIds?.length ||
        !body.customerEmail || !body.customerPhone) {
      return NextResponse.json({ success: false, error: 'Missing required checkout fields' }, { status: 400 });
    }

    const payer = await resolveAuthenticatedPayer(authorization.user.id, body.payerType);
    if (!payer || (body.payerId && body.payerId !== payer.payerId)) {
      return NextResponse.json({ success: false, error: 'Payer identity mismatch' }, { status: 403 });
    }
    const targetPlayerIds = await assertPaymentTargetOwnership(payer.payerId, payer.payerType, body.targetPlayerIds);

    const db = getSupabaseServiceRole();
    const { data: planRows, error: planError } = await db
      .from('subscription_plans')
      .select('id, base_price, base_currency, overrides, isActive')
      .eq('id', body.planId)
      .limit(1);
    if (planError) throw planError;
    const plan = planRows?.[0] as Record<string, unknown> | undefined;
    if (!plan || plan.isActive === false) {
      return NextResponse.json({ success: false, error: 'Invalid or inactive plan' }, { status: 400 });
    }

    const unitPrice = getQatarPlanPrice(plan);
    const amount = unitPrice * targetPlayerIds.length;

    const canonical = await createCanonicalPayment({
      payerId: payer.payerId,
      payerType: payer.payerType,
      planId: body.planId,
      countryCode: 'QA',
      amount,
      currency: 'QAR',
      method: 'card',
      provider: 'skipcash',
      targetPlayerIds,
      metadata: { checkout_source: 'skipcash_create_session' },
    });

    const paymentRequest: SkipCashPaymentRequest = {
      amount,
      currency: 'QAR',
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      customerName: body.customerName,
      transactionId: canonical.id,
      custom1: canonical.id,
      returnUrl: body.returnUrl ||
        `${request.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payment/success`,
    };

    const result = await createSkipCashPayment(paymentRequest);
    if (result.returnCode !== 200 || !result.resultObj?.paymentId) {
      await db.from('payments').update({
        status: 'failed',
        updated_at: new Date().toISOString(),
      }).eq('id', canonical.id);
      return NextResponse.json({
        success: false,
        error: result.returnMessage || 'Failed to create payment session',
      }, { status: 400 });
    }

    await db.from('payments').update({
      provider_reference_id: result.resultObj.paymentId,
      status: 'processing',
      updated_at: new Date().toISOString(),
    }).eq('id', canonical.id);

    return NextResponse.json({
      success: true,
      payUrl: result.resultObj.payUrl,
      paymentId: result.resultObj.paymentId,
      canonicalPaymentId: canonical.id,
    });
  } catch (error) {
    console.error('❌ [SkipCash API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
