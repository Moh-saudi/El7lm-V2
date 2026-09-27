import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { config } from '@/lib/skipcash/config';
import { activatePaymentSubscriptions } from '@/lib/payments/subscription-activation-service';

function asNumber(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error('invalid provider amount');
  return parsed;
}

function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.01;
}

export async function verifyAndActivateSkipCashPayment(providerPaymentId: string) {
  const db = getSupabaseAdmin();

  const { data: paymentRows, error: lookupError } = await db
    .from('payments')
    .select('id, amount, currency, status, provider, provider_reference_id')
    .eq('provider', 'skipcash')
    .eq('provider_reference_id', providerPaymentId)
    .limit(1);
  if (lookupError) throw lookupError;

  const payment = paymentRows?.[0];
  if (!payment) throw new Error('canonical payment not found');

  if (payment.status === 'paid') {
    const activation = await activatePaymentSubscriptions(String(payment.id));
    return { canonicalPaymentId: payment.id, alreadyPaid: true, activation };
  }

  const response = await fetch(`${config.baseUrl}/api/v1/payments/${encodeURIComponent(providerPaymentId)}`, {
    method: 'GET',
    headers: {
      Authorization: config.secretKey,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`SkipCash verification failed (${response.status})`);
  }

  const payload = await response.json();
  const details = payload?.resultObj ?? payload;
  const statusId = Number(details?.statusId ?? details?.StatusId);
  if (statusId !== 2) throw new Error('SkipCash payment is not paid');

  const providerAmount = asNumber(details?.amount);
  const expectedAmount = asNumber(payment.amount);
  if (!nearlyEqual(providerAmount, expectedAmount)) {
    throw new Error('SkipCash amount mismatch');
  }

  const providerCurrency = String(details?.currency || details?.Currency || 'QAR').toUpperCase();
  const expectedCurrency = String(payment.currency || '').toUpperCase();
  if (providerCurrency !== expectedCurrency) {
    throw new Error('SkipCash currency mismatch');
  }

  const now = new Date().toISOString();
  const providerTransactionId = String(details?.transactionId || details?.TransactionId || '') || null;

  // Conditional transition prevents two concurrent callbacks from independently changing
  // a non-paid payment. Activation itself is also idempotent per payment + player.
  const { data: updated, error: updateError } = await db
    .from('payments')
    .update({
      status: 'paid',
      provider_transaction_id: providerTransactionId,
      paid_at: now,
      updated_at: now,
      metadata: { verified_by: 'skipcash_api' },
    })
    .eq('id', payment.id)
    .neq('status', 'paid')
    .select('id');
  if (updateError) throw updateError;

  const activation = await activatePaymentSubscriptions(String(payment.id));

  return {
    canonicalPaymentId: payment.id,
    alreadyPaid: !updated?.length,
    providerTransactionId,
    activation,
  };
}
