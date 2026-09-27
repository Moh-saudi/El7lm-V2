import { getSupabaseServiceRole } from '@/lib/supabase/admin';

type PlanDuration = { months: number };

function getPlanDuration(planId: string, period?: string | null): PlanDuration {
  if (planId === 'subscription_annual') return { months: 12 };
  if (planId === 'subscription_6months') return { months: 6 };
  if (planId === 'subscription_3months') return { months: 3 };

  const value = String(period ?? '').toLowerCase();
  if (/12|year|annual|سنة|عام/.test(value)) return { months: 12 };
  if (/6|ستة|ست/.test(value)) return { months: 6 };
  if (/3|ثلاث/.test(value)) return { months: 3 };
  throw new Error('subscription plan duration is not supported');
}

function addCalendarMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const originalDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(originalDay, lastDay));
  return result;
}

export async function activatePaymentSubscriptions(paymentId: string) {
  const db = getSupabaseServiceRole();

  const { data: paymentRows, error: paymentError } = await db
    .from('payments')
    .select('id, plan_id, amount, currency, status, paid_at')
    .eq('id', paymentId)
    .limit(1);
  if (paymentError) throw paymentError;
  const payment = paymentRows?.[0];
  if (!payment) throw new Error('payment not found');
  if (payment.status !== 'paid') throw new Error('only paid payments can activate subscriptions');
  if (!payment.plan_id) throw new Error('payment has no subscription plan');

  const { data: planRows, error: planError } = await db
    .from('subscription_plans')
    .select('id, period, isActive')
    .eq('id', payment.plan_id)
    .limit(1);
  if (planError) throw planError;
  const plan = planRows?.[0];
  if (!plan || plan.isActive === false) throw new Error('subscription plan is invalid or inactive');

  const { months } = getPlanDuration(String(plan.id), plan.period ? String(plan.period) : null);

  const { data: targets, error: targetError } = await db
    .from('payment_targets')
    .select('id, target_player_id, amount_allocated, status')
    .eq('payment_id', paymentId);
  if (targetError) throw targetError;
  if (!targets?.length) throw new Error('payment has no target players');

  const activated: string[] = [];
  for (const target of targets) {
    // Idempotency is anchored to payment + player. Replayed callbacks reuse this row.
    const subscriptionId = `sub:${paymentId}:${target.target_player_id}`;
    const { data: existing, error: existingError } = await db
      .from('subscriptions_v2')
      .select('id, status')
      .eq('id', subscriptionId)
      .limit(1);
    if (existingError) throw existingError;

    if (existing?.length && existing[0].status === 'active') {
      activated.push(String(target.target_player_id));
      continue;
    }

    const startsAt = new Date(payment.paid_at || Date.now());
    const expiresAt = addCalendarMonths(startsAt, months);
    const now = new Date().toISOString();

    const { error: subscriptionError } = await db.from('subscriptions_v2').upsert({
      id: subscriptionId,
      player_id: target.target_player_id,
      plan_id: payment.plan_id,
      payment_id: paymentId,
      status: 'active',
      starts_at: startsAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      activated_at: now,
      cancelled_at: null,
      auto_renew: false,
      amount: target.amount_allocated ?? payment.amount,
      currency: payment.currency,
      metadata: { activation_source: 'canonical_payment' },
      created_at: now,
      updated_at: now,
    });
    if (subscriptionError) throw subscriptionError;

    const { error: targetUpdateError } = await db
      .from('payment_targets')
      .update({ status: 'active', updated_at: now })
      .eq('id', target.id);
    if (targetUpdateError) throw targetUpdateError;

    activated.push(String(target.target_player_id));
  }

  return { paymentId, activatedPlayerIds: activated };
}
