import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin, withPrivateResponseHeaders } from '@/lib/api/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { normalizeNotificationPayload } from '@/lib/notifications/sender-utils';

const MAX_BATCH_SIZE = 500;
const ALLOWED_TYPES = new Set(['info', 'success', 'warning', 'error', 'system']);
const ALLOWED_PRIORITIES = new Set(['low', 'medium', 'high', 'critical']);

type TargetRow = {
  userId?: unknown;
  userEmail?: unknown;
  userPhone?: unknown;
  title?: unknown;
  message?: unknown;
};

type BulkNotificationPayload = {
  type?: unknown;
  priority?: unknown;
  metadata?: unknown;
  targets?: unknown;
};

function cleanString(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdmin(request, 'manage:communications');
  if (!authorization.ok) return authorization.response;

  try {
    const body = await request.json() as BulkNotificationPayload;
    const type = cleanString(body.type, 32);
    const priority = cleanString(body.priority, 32);
    const targets = Array.isArray(body.targets) ? body.targets as TargetRow[] : [];

    if (!ALLOWED_TYPES.has(type)) {
      return withPrivateResponseHeaders(
        NextResponse.json({ success: false, error: 'Unsupported notification type' }, { status: 400 })
      );
    }
    if (!ALLOWED_PRIORITIES.has(priority)) {
      return withPrivateResponseHeaders(
        NextResponse.json({ success: false, error: 'Unsupported notification priority' }, { status: 400 })
      );
    }
    if (targets.length === 0 || targets.length > MAX_BATCH_SIZE) {
      return withPrivateResponseHeaders(
        NextResponse.json(
          { success: false, error: `Target count must be between 1 and ${MAX_BATCH_SIZE}` },
          { status: 400 }
        )
      );
    }

    const senderName =
      cleanString(authorization.user.user_metadata?.full_name, 120) ||
      cleanString(authorization.user.user_metadata?.name, 120) ||
      cleanString(authorization.user.email?.split('@')[0], 120) ||
      'الإدارة';

    const metadata =
      body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
        ? { ...(body.metadata as Record<string, unknown>) }
        : {};

    delete metadata.senderId;
    delete metadata.senderName;
    delete metadata.senderAccountType;
    delete metadata.senderAvatar;
    delete metadata.senderBucket;

    const now = new Date().toISOString();
    const rows = targets.map((target) => {
      const userId = cleanString(target.userId, 160);
      const title = cleanString(target.title, 200);
      const message = cleanString(target.message, 1000);

      if (!userId || !title || !message) {
        throw new Error('Each target requires userId, title and message');
      }

      return normalizeNotificationPayload({
        id: crypto.randomUUID(),
        userId,
        user_id: userId,
        userEmail: cleanString(target.userEmail, 320) || null,
        user_email: cleanString(target.userEmail, 320) || null,
        userPhone: cleanString(target.userPhone, 40) || null,
        user_phone: cleanString(target.userPhone, 40) || null,
        title,
        message,
        type,
        priority,
        scope: 'system',
        read: false,
        isRead: false,
        is_read: false,
        senderId: authorization.user.id,
        senderName,
        senderAccountType: 'admin',
        metadata: {
          ...metadata,
          senderId: authorization.user.id,
          senderName,
          senderAccountType: 'admin',
        },
        createdAt: now,
        updatedAt: now,
        created_at: now,
        updated_at: now,
      });
    });

    const db = getSupabaseAdmin();
    const { error } = await db.from('notifications').insert(rows);
    if (error) throw error;

    return withPrivateResponseHeaders(
      NextResponse.json({ success: true, inserted: rows.length })
    );
  } catch (error) {
    console.error('[admin/notifications/bulk] Failed:', error);
    return withPrivateResponseHeaders(
      NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Failed to send notifications' },
        { status: 500 }
      )
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
