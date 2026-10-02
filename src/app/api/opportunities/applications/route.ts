import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeUser } from '@/lib/api/user-auth';
import { normalizeNotificationPayload } from '@/lib/notifications/sender-utils';
import { resolveServerAccountIdentity } from '@/lib/server/account-identity';

export async function GET(request: NextRequest) {
  const authorization = await authorizeUser(request);
  if (!authorization.ok) return authorization.response;
  const { searchParams } = new URL(request.url);
  const opportunityId = searchParams.get('opportunityId');
  const playerId = searchParams.get('playerId');
  const status = searchParams.get('status');

  try {
    const db = getSupabaseAdmin();
    let query = db.from('opportunity_applications').select('*');

    if (opportunityId) {
      const { data: opportunity } = await db
        .from('opportunities')
        .select('organizerId')
        .eq('id', opportunityId)
        .maybeSingle();
      if (opportunity?.organizerId !== authorization.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      query = query.eq('opportunityId', opportunityId) as typeof query;
    } else if (playerId) {
      if (playerId !== authorization.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      query = query.eq('playerId', playerId) as typeof query;
    } else {
      return NextResponse.json({ error: 'opportunityId or playerId required' }, { status: 400 });
    }

    if (status) query = query.eq('status', status) as typeof query;

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authorization = await authorizeUser(request);
  if (!authorization.ok) return authorization.response;

  try {
    const body = await request.json();
    const id = String(body?.id || '').trim();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const db = getSupabaseAdmin();
    const { data: application, error: applicationError } = await db
      .from('opportunity_applications')
      .select('opportunityId, playerId, status')
      .eq('id', id)
      .maybeSingle();

    if (applicationError) {
      return NextResponse.json({ error: applicationError.message }, { status: 500 });
    }
    if (!application?.opportunityId) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const { data: opportunity, error: opportunityError } = await db
      .from('opportunities')
      .select('organizerId, organizerName, title')
      .eq('id', application.opportunityId)
      .maybeSingle();

    if (opportunityError) {
      return NextResponse.json({ error: opportunityError.message }, { status: 500 });
    }
    if (opportunity?.organizerId !== authorization.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};
    const allowedStatuses = new Set(['pending', 'reviewed', 'accepted', 'rejected', 'waitlisted']);

    if (body.status !== undefined) {
      const status = String(body.status);
      if (!allowedStatuses.has(status)) {
        return NextResponse.json({ error: 'Unsupported application status' }, { status: 400 });
      }
      updates.status = status;
      updates.reviewedBy = authorization.user.id;
    }

    if (body.reviewNote !== undefined) {
      updates.reviewNote = String(body.reviewNote || '').slice(0, 2000);
    }

    if (body.rating !== undefined) {
      const rating = Number(body.rating);
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
      }
      updates.rating = rating;
      updates.ratedAt = new Date().toISOString();
    }

    if (body.ratingComment !== undefined) {
      updates.ratingComment = String(body.ratingComment || '').slice(0, 2000);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No supported updates provided' }, { status: 400 });
    }

    updates.updatedAt = new Date().toISOString();

    const { error } = await db
      .from('opportunity_applications')
      .update(updates)
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const nextStatus = typeof updates.status === 'string' ? updates.status : null;
    if (
      nextStatus &&
      nextStatus !== application.status &&
      (nextStatus === 'accepted' || nextStatus === 'rejected')
    ) {
      try {
        const [player, organizer] = await Promise.all([
          resolveServerAccountIdentity(String(application.playerId || '')),
          resolveServerAccountIdentity(authorization.user.id),
        ]);

        if (player && organizer) {
          const now = new Date().toISOString();
          const accepted = nextStatus === 'accepted';
          const payload = normalizeNotificationPayload({
            id: crypto.randomUUID(),
            userId: player.authUid,
            senderId: organizer.authUid,
            senderName: organizer.name,
            senderAccountType: organizer.accountType,
            type: 'interactive',
            title: accepted ? 'تم قبول طلبك!' : 'تحديث على طلبك',
            message: accepted
              ? `قبلت ${String(opportunity.organizerName || organizer.name)} طلبك للانضمام إلى: ${String(opportunity.title || 'الفرصة')}`
              : `${String(opportunity.organizerName || organizer.name)} اتخذ قراراً بشأن طلبك لـ: ${String(opportunity.title || 'الفرصة')}`,
            priority: accepted ? 'high' : 'medium',
            actionUrl: '/dashboard/opportunities',
            read: false,
            isRead: false,
            createdAt: now,
            updatedAt: now,
            metadata: {
              senderId: organizer.authUid,
              senderName: organizer.name,
              senderAccountType: organizer.accountType,
              opportunityId: application.opportunityId,
              applicationId: id,
              applicationStatus: nextStatus,
            },
          });
          const { error: notificationError } = await db.from('notifications').insert(payload);
          if (notificationError) throw notificationError;
        }
      } catch (notificationError) {
        console.error('[opportunities/applications] Notification failed:', notificationError);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
