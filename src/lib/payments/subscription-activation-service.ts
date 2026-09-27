import { getSupabaseServiceRole } from '@/lib/supabase/admin';

export async function activatePaymentSubscriptions(paymentId: string) {
  const db = getSupabaseServiceRole();
  const { data, error } = await db.rpc('activate_canonical_payment_subscriptions', {
    p_payment_id: paymentId,
  });
  if (error) {
    throw new Error(`Atomic subscription activation failed: ${error.message}`);
  }

  const rows = Array.isArray(data) ? data : [];
  return {
    paymentId,
    activatedPlayerIds: rows.map((row: any) => String(row.target_player_id)),
  };
}
