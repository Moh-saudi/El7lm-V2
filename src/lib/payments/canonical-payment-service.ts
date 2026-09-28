import { getSupabaseServiceRole } from '@/lib/supabase/admin';

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
  const db = getSupabaseServiceRole();
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
  const status = input.status ?? 'pending';

  const { error: createError } = await db.rpc('create_canonical_payment', {
    p_payment_id: paymentId,
    p_payer_id: input.payerId,
    p_payer_type: input.payerType,
    p_plan_id: input.planId ?? null,
    p_country_code: input.countryCode ?? null,
    p_amount: input.amount,
    p_currency: input.currency.toUpperCase(),
    p_method: input.method,
    p_provider: input.provider ?? null,
    p_target_player_ids: targetPlayerIds,
    p_receipt_url: input.receiptUrl ?? null,
    p_status: status,
    p_metadata: input.metadata ?? {},
  });
  if (createError) throw createError;

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
  const db = getSupabaseServiceRole();
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
