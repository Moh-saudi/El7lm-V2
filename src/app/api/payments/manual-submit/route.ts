import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRole } from '@/lib/supabase/admin';
import { authorizeUser } from '@/lib/api/user-auth';
import { createCanonicalPayment, PayerType } from '@/lib/payments/canonical-payment-service';
import { assertPaymentTargetOwnership, resolveAuthenticatedPayer } from '@/lib/payments/payer-authorization';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  payerId?: string;
  payerType?: PayerType;
  planId: string;
  targetPlayerIds: string[];
  countryCode: string;
  method: string;
  receiptUrl: string;
};

function validateReceiptUrl(value: string): string {
  if (value.length > 2048) throw new Error('Receipt URL is too long');
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Invalid receipt URL');
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('Receipt URL must be a credential-free HTTPS URL');
  }
  const trustedBase = process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL
    || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL
    || 'https://assets.el7lm.com';
  const trustedHost = new URL(trustedBase).host;
  if (url.host !== trustedHost || !url.pathname.startsWith('/payment-receipts/')) {
    throw new Error('Receipt URL must come from the canonical receipt upload service');
  }
  return url.toString();
}

const MANUAL_METHODS = new Set([
  'vodafone_cash', 'etisalat_cash', 'instapay', 'fawran',
  'bank_transfer', 'stc_pay', 'wallet',
]);

export async function POST(request: NextRequest) {
  const authorization = await authorizeUser(request);
  if (!authorization.ok) return authorization.response;

  try {
    const body = (await request.json()) as Body;
    if (!body.planId || !body.targetPlayerIds?.length || !body.countryCode || !body.method || !body.receiptUrl) {
      return NextResponse.json({ success: false, error: 'Missing required manual payment fields' }, { status: 400 });
    }
    if (!MANUAL_METHODS.has(body.method)) {
      return NextResponse.json({ success: false, error: 'Unsupported manual payment method' }, { status: 400 });
    }

    const payer = await resolveAuthenticatedPayer(authorization.user.id, body.payerType);
    if (!payer) return NextResponse.json({ success: false, error: 'Authenticated payer account not found' }, { status: 403 });
    if (body.payerId && body.payerId !== payer.payerId) {
      return NextResponse.json({ success: false, error: 'Payer identity mismatch' }, { status: 403 });
    }
    const targetPlayerIds = await assertPaymentTargetOwnership(payer.payerId, payer.payerType, body.targetPlayerIds);

    const db = getSupabaseServiceRole();
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

    const receiptUrl = validateReceiptUrl(body.receiptUrl);

    const payment = await createCanonicalPayment({
      payerId: payer.payerId,
      payerType: payer.payerType,
      planId: body.planId,
      countryCode: country,
      amount: unitPrice * targetPlayerIds.length,
      currency,
      method: body.method,
      provider: 'manual',
      targetPlayerIds,
      receiptUrl,
      status: 'pending_review',
      metadata: { submitted_via: 'manual_payment_api', authenticated_user_id: authorization.user.id },
    });

    return NextResponse.json({ success: true, paymentId: payment.id, status: payment.status });
  } catch (error) {
    console.error('❌ [Manual Payment] Submission failed:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const forbidden = /not linked|only pay|payer|account not found/i.test(message);
    return NextResponse.json({ success: false, error: message }, { status: forbidden ? 403 : 500 });
  }
}
