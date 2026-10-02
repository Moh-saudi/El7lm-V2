import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeUser } from '@/lib/api/user-auth';
import { normalizeNotificationPayload } from '@/lib/notifications/sender-utils';
import { resolveServerAccountIdentity } from '@/lib/server/account-identity';

export async function POST(request: NextRequest) {
  const authorization = await authorizeUser(request);
  if (!authorization.ok) return authorization.response;
  try {
    const { opportunityId, playerId: _ignoredPlayerId, ...data } = await request.json();
    const playerId = authorization.user.id;
    if (!opportunityId) {
      return NextResponse.json({ error: 'opportunityId required' }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // Check duplicate
    const { data: dupData } = await db
      .from('opportunity_applications')
      .select('id')
      .eq('opportunityId', opportunityId)
      .eq('playerId', playerId)
      .limit(1)
      .maybeSingle();

    if (dupData) {
      return NextResponse.json({ error: 'لقد تقدمت لهذه الفرصة مسبقاً' }, { status: 409 });
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const { error: insertError } = await db.from('opportunity_applications').insert({
      id, opportunityId, playerId, ...data, status: 'pending', appliedAt: now, updatedAt: now,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Increment currentApplicants
    const { data: oppData } = await db
      .from('opportunities')
      .select('currentApplicants, organizerId, title')
      .eq('id', opportunityId)
      .limit(1)
      .maybeSingle();
    const current = Number((oppData as any)?.currentApplicants || 0);
    await db.from('opportunities').update({ currentApplicants: current + 1 }).eq('id', opportunityId);

    // Best-effort server-side notification. Application success must not be rolled back
    // or reported as failed merely because the notification side effect fails.
    try {
      const [organizer, player] = await Promise.all([
        resolveServerAccountIdentity(String((oppData as any)?.organizerId || '')),
        resolveServerAccountIdentity(playerId),
      ]);

      if (organizer && player) {
        const notificationNow = new Date().toISOString();
        const payload = normalizeNotificationPayload({
          id: crypto.randomUUID(),
          userId: organizer.authUid,
          senderId: player.authUid,
          senderName: player.name,
          senderAccountType: player.accountType,
          type: 'interactive',
          title: 'طلب تقديم جديد',
          message: `${player.name} تقدم لفرصتك: ${String((oppData as any)?.title || 'فرصة')}`,
          priority: 'high',
          actionUrl: `/dashboard/opportunities/${opportunityId}/applications`,
          read: false,
          isRead: false,
          createdAt: notificationNow,
          updatedAt: notificationNow,
          metadata: {
            senderId: player.authUid,
            senderName: player.name,
            senderAccountType: player.accountType,
            opportunityId,
          },
        });
        const { error: notificationError } = await db.from('notifications').insert(payload);
        if (notificationError) throw notificationError;
      }
    } catch (notificationError) {
      console.error('[opportunities/apply] Notification failed:', notificationError);
    }

    return NextResponse.json({ id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
