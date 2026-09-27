import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { activatePaymentSubscriptions } from '@/lib/payments/subscription-activation-service';

export interface VerifiedGeideaPayment {
  orderId: string;
  merchantReferenceId: string;
  transactionId?: string | null;
  amount: number;
  currency: string;
  status: 'success' | 'failed' | 'pending' | 'cancelled';
  paidAt?: Date | null;
}

function sameMoney(a: unknown, b: unknown): boolean {
  const left = Number(a);
  const right = Number(b);
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) < 0.01;
}

export async function applyVerifiedGeideaPayment(payment: VerifiedGeideaPayment) {
  const db = getSupabaseAdmin();
  const canonicalId = payment.merchantReferenceId;

  const { data: rows, error: lookupError } = await db
    .from('payments')
    .select('id, amount, currency, status, provider, provider_reference_id')
    .eq('id', canonicalId)
    .eq('provider', 'geidea')
    .limit(1);
  if (lookupError) throw lookupError;
  const canonical = rows?.[0];
  if (!canonical) return { canonical: false as const };

  if (!sameMoney(canonical.amount, payment.amount)) throw new Error('Geidea amount mismatch');
  if (String(canonical.currency).toUpperCase() !== String(payment.currency).toUpperCase()) {
    throw new Error('Geidea currency mismatch');
  }

  if (payment.status !== 'success') {
    const mapped = payment.status === 'cancelled' ? 'cancelled' : payment.status === 'failed' ? 'failed' : 'processing';
    const { error } = await db.from('payments').update({
      status: mapped,
      provider_reference_id: payment.orderId,
      provider_transaction_id: payment.transactionId ?? null,
      updated_at: new Date().toISOString(),
    }).eq('id', canonical.id).neq('status', 'paid');
    if (error) throw error;
    return { canonical: true as const, paymentId: canonical.id, status: mapped };
  }

  if (canonical.status !== 'paid') {
    const paidAt = (payment.paidAt ?? new Date()).toISOString();
    const { error } = await db.from('payments').update({
      status: 'paid',
      provider_reference_id: payment.orderId,
      provider_transaction_id: payment.transactionId ?? null,
      paid_at: paidAt,
      metadata: { verified_by: 'geidea_callback' },
      updated_at: new Date().toISOString(),
    }).eq('id', canonical.id).neq('status', 'paid');
    if (error) throw error;
  }

  const activation = await activatePaymentSubscriptions(String(canonical.id));
  return { canonical: true as const, paymentId: canonical.id, status: 'paid', activation };
}
