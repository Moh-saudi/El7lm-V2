import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/lib/api/user-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

type PushBody = {
  subscription?: unknown;
  enabled?: unknown;
};

function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function PUT(request: NextRequest) {
  const authorization = await authorizeUser(request);
  if (!authorization.ok) return authorization.response;

  try {
    const body = await request.json() as PushBody;
    const enabled = body.enabled !== false;
    const subscription = typeof body.subscription === 'string'
      ? body.subscription.trim()
      : '';

    if (enabled && (!subscription || subscription.length > 20000)) {
      return privateJson({ success: false, error: 'Invalid push subscription' }, 400);
    }

    const db = getSupabaseAdmin();
    const updates = enabled
      ? {
          fcmToken: subscription,
          fcmTokenUpdatedAt: new Date().toISOString(),
          notificationsEnabled: true,
        }
      : {
          fcmToken: null,
          fcmTokenUpdatedAt: new Date().toISOString(),
          notificationsEnabled: false,
        };

    const { data, error } = await db
      .from('users')
      .update(updates)
      .or(`id.eq.${authorization.user.id},uid.eq.${authorization.user.id}`)
      .select('id')
      .limit(1);

    if (error) throw error;
    if (!data?.length) {
      return privateJson({ success: false, error: 'User profile not found' }, 404);
    }

    return privateJson({ success: true });
  } catch (error) {
    console.error('[push/subscription] update failed:', error);
    return privateJson({ success: false, error: 'Failed to update push subscription' }, 500);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
