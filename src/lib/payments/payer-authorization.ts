import { getSupabaseServiceRole } from '@/lib/supabase/admin';
import type { PayerType } from '@/lib/payments/canonical-payment-service';

const ACCOUNT_TABLES: Record<PayerType, string> = {
  player: 'players', club: 'clubs', academy: 'academies', trainer: 'trainers', agent: 'agents',
};
const PLAYER_LINKS: Partial<Record<PayerType, string>> = {
  club: 'club_id', academy: 'academy_id', trainer: 'trainer_id', agent: 'agent_id',
};

export async function resolveAuthenticatedPayer(authId: string, requestedType?: PayerType) {
  const db = getSupabaseServiceRole();
  const types: PayerType[] = requestedType ? [requestedType] : ['player', 'club', 'academy', 'trainer', 'agent'];
  for (const payerType of types) {
    const { data, error } = await db
      .from(ACCOUNT_TABLES[payerType])
      .select('id,uid,countryCode,country')
      .or(`id.eq.${authId},uid.eq.${authId}`)
      .limit(1);
    if (error) throw error;
    if (data?.[0]?.id) return {
      payerId: String(data[0].id),
      payerType,
      countryCode: data[0].countryCode ? String(data[0].countryCode).toUpperCase() : null,
    };
  }
  return null;
}

export async function assertPaymentTargetOwnership(payerId: string, payerType: PayerType, targetIds: string[]) {
  const db = getSupabaseServiceRole();
  const targets = [...new Set(targetIds.map(String).map((id) => id.trim()).filter(Boolean))];
  if (!targets.length) throw new Error('At least one target player is required');
  if (payerType === 'player') {
    if (targets.length !== 1 || targets[0] !== payerId) throw new Error('Player may only pay for their own subscription');
    return targets;
  }
  const linkColumn = PLAYER_LINKS[payerType];
  if (!linkColumn) throw new Error('Unsupported payer type');
  const { data, error } = await db.from('players').select('id').in('id', targets).eq(linkColumn, payerId);
  if (error) throw error;
  if ((data?.length || 0) !== targets.length) throw new Error('One or more target players are not linked to this payer');
  return targets;
}
