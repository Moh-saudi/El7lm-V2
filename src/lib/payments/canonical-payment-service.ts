import { getSupabaseAdmin } from '@/lib/supabase/admin';

export type PayerType = 'player' | 'club' | 'academy' | 'trainer' | 'agent';
export type PaymentStatus =
  | 'pending'
  | 'pending_review'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'rejected'
  | 'cancelled'
  | 'refunded';

export interface CreateCanonicalPaymentInput {
  payerId: string;
  payerType: PayerType;
  planId?: string | null;
  countryCode?: string | null;
  amount: number;
  currency: string;
  method: string;
  provider?: string | null;
  targetPlayerIds: string[];
  receiptUrl?: string | null;
  status?: PaymentStatus;
  metadata?: Record<string, unknown>;
}

function uniquePlayerIds(ids: string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

export async function createCanonicalPayment(input: CreateCanonicalPaymentInput) {
  const db = getSupabaseAdmin();
  const targetPlayerIds = uniquePlayerIds(input.targetPlayerIds);

  if (!input.payerId || !input.payerType) throw new Error('payer identity is required');
  if (!Number.isFinite(input.amount) || input.amount < 0) throw new Error('invalid payment amount');
  if (!input.currency || !input.method) throw new Error('currency and method are required');
  if (targetPlayerIds.length === 0) throw new Error('at least one target player is required');

  const { data: players, error: playerError } = await db
    .from('players')
    .select('id')
    .in('id', targetPlayerIds);

  if (playerError) throw playerError;
  if ((players?.length ?? 0) !== targetPlayerIds.length) {
    throw new Error('one or more target players do not exist');
  }

  if (input.planId) {
    const { data: plans, error: planError } = await db
      .from('subscription_plans')
      .select('id, isActive')
      .eq('id', input.planId)
      .limit(1);
    if (planError) throw planError;
    if (!plans?.length || plans[0].isActive === false) throw new Error('invalid or inactive subscription plan');
  }

  const paymentId = crypto.randomUUID();
  const now = new Date().toISOString();
  const status = input.status ?? 'pending';

  const { error: paymentError } = await db.from('payments').insert({
    id: paymentId,
    payer_id: input.payerId,
    payer_type: input.payerType,
    plan_id: input.planId ?? null,
    country_code: input.countryCode ?? null,
    amount: input.amount,
    currency: input.currency.toUpperCase(),
    method: input.method,
    provider: input.provider ?? null,
    status,
    receipt_url: input.receiptUrl ?? null,
    review_status: status === 'pending_review' ? 'pending' : null,
    metadata: input.metadata ?? {},
    created_at: now,
    updated_at: now,
  });
  if (paymentError) throw paymentError;

  const allocation = targetPlayerIds.length > 0 ? input.amount / targetPlayerIds.length : null;
  const targets = targetPlayerIds.map((playerId) => ({
    id: crypto.randomUUID(),
    payment_id: paymentId,
    target_player_id: playerId,
    amount_allocated: allocation,
    status: 'pending',
    metadata: {},
    created_at: now,
    updated_at: now,
  }));

  const { error: targetError } = await db.from('payment_targets').insert(targets);
  if (targetError) {
    // Compensate because PostgREST calls are not a cross-request SQL transaction.
    await db.from('payments').delete().eq('id', paymentId);
    throw targetError;
  }

  return { id: paymentId, status, targetPlayerIds };
}

export async function markCanonicalPayment(
  paymentId: string,
  patch: {
    status: PaymentStatus;
    providerTransactionId?: string | null;
    providerReferenceId?: string | null;
    paidAt?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('payments').update({
    status: patch.status,
    provider_transaction_id: patch.providerTransactionId ?? undefined,
    provider_reference_id: patch.providerReferenceId ?? undefined,
    paid_at: patch.paidAt ?? undefined,
    metadata: patch.metadata ?? undefined,
    updated_at: new Date().toISOString(),
  }).eq('id', paymentId);
  if (error) throw error;
}
