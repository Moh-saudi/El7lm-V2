import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRole } from '@/lib/supabase/admin';
import { authorizeUser } from '@/lib/api/user-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authorization = await authorizeUser(request);
  if (!authorization.ok) return authorization.response;

  try {
    const db = getSupabaseServiceRole();
    const authId = authorization.user.id;

    // Canonical beneficiary identity is players.id. Most accounts already share
    // this id with auth/users; uid is only a compatibility resolver.
    const { data: playerRows, error: playerError } = await db
      .from('players')
      .select('id')
      .or(`id.eq.${authId},uid.eq.${authId}`)
      .limit(1);
    if (playerError) throw playerError;
    const playerId = playerRows?.[0]?.id ? String(playerRows[0].id) : null;

    if (!playerId) {
      return NextResponse.json(
        { success: true, playerId: null, subscription: null, payments: [] },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
    }

    const [subscriptionResult, targetsResult] = await Promise.all([
      db
        .from('subscriptions')
        .select('id,player_id,plan_id,payment_id,status,starts_at,expires_at,activated_at,cancelled_at,auto_renew,amount,currency,created_at,updated_at')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(1),
      db
        .from('payment_targets')
        .select('payment_id,status,amount_allocated,payments(id,plan_id,amount,currency,method,provider,status,review_status,rejection_reason,paid_at,created_at)')
        .eq('target_player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(25),
    ]);
    if (subscriptionResult.error) throw subscriptionResult.error;
    if (targetsResult.error) throw targetsResult.error;

    const payments = (targetsResult.data || []).map((target: any) => ({
      ...(target.payments || {}),
      target_status: target.status,
      amount_allocated: target.amount_allocated,
    }));

    return NextResponse.json(
      { success: true, playerId, subscription: subscriptionResult.data?.[0] || null, payments },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    console.error('[Subscription Status] Failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
}
