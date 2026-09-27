import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRole } from '@/lib/supabase/admin';
import { authorizeUser } from '@/lib/api/user-auth';
import { createCanonicalPayment, PayerType } from '@/lib/payments/canonical-payment-service';

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

const MANUAL_METHODS = new Set([
  'vodafone_cash', 'etisalat_cash', 'instapay', 'fawran',
  'bank_transfer', 'stc_pay', 'wallet',
]);
const ACCOUNT_TABLES: Record<PayerType, string> = {
  player: 'players', club: 'clubs', academy: 'academies', trainer: 'trainers', agent: 'agents',
};
const PLAYER_LINKS: Partial<Record<PayerType, string>> = {
  club: 'club_id', academy: 'academy_id', trainer: 'trainer_id', agent: 'agent_id',
};

async function resolvePayer(authId: string, requestedType?: PayerType) {
  const db = getSupabaseServiceRole();
  const types: PayerType[] = requestedType ? [requestedType] : ['player', 'club', 'academy', 'trainer', 'agent'];
  for (const type of types) {
    const table = ACCOUNT_TABLES[type];
    const { data, error } = await db.from(table).select('id,uid').or(`id.eq.${authId},uid.eq.${authId}`).limit(1);
    if (error) throw error;
    if (data?.[0]?.id) return { payerId: String(data[0].id), payerType: type };
  }
  return null;
}

async function assertTargetOwnership(payerId: string, payerType: PayerType, targetIds: string[]) {
  const db = getSupabaseServiceRole();
  const uniqueTargets = [...new Set(targetIds.map(String).map((id) => id.trim()).filter(Boolean))];
  if (!uniqueTargets.length) throw new Error('At least one target player is required');

  if (payerType === 'player') {
    if (uniqueTargets.length !== 1 || uniqueTargets[0] !== payerId) throw new Error('Player may only pay for their own subscription');
    return uniqueTargets;
  }

  const linkColumn = PLAYER_LINKS[payerType];
  if (!linkColumn) throw new Error('Unsupported payer type');
  const { data, error } = await db.from('players').select('id').in('id', uniqueTargets).eq(linkColumn, payerId);
  if (error) throw error;
  if ((data?.length || 0) !== uniqueTargets.length) throw new Error('One or more target players are not linked to this payer');
  return uniqueTargets;
}

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

    const payer = await resolvePayer(authorization.user.id, body.payerType);
    if (!payer) return NextResponse.json({ success: false, error: 'Authenticated payer account not found' }, { status: 403 });
    if (body.payerId && body.payerId !== payer.payerId) {
      return NextResponse.json({ success: false, error: 'Payer identity mismatch' }, { status: 403 });
    }
    const targetPlayerIds = await assertTargetOwnership(payer.payerId, payer.payerType, body.targetPlayerIds);

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
      receiptUrl: body.receiptUrl,
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
