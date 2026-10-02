import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin, withPrivateResponseHeaders } from '@/lib/api/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

type MutationBody = {
  action?: unknown;
  notificationId?: unknown;
  scope?: unknown;
  notification?: unknown;
};

function cleanString(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function actorName(user: { user_metadata?: Record<string, unknown>; email?: string | null }): string {
  return (
    cleanString(user.user_metadata?.full_name, 120) ||
    cleanString(user.user_metadata?.name, 120) ||
    cleanString(user.email?.split('@')[0], 120) ||
    'الإدارة'
  );
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdmin(request, 'manage:communications');
  if (!authorization.ok) return authorization.response;

  try {
    const body = await request.json() as MutationBody;
    const input =
      body.notification && typeof body.notification === 'object' && !Array.isArray(body.notification)
        ? { ...(body.notification as Record<string, unknown>) }
        : {};

    const type = cleanString(input.type, 40);
    const priority = cleanString(input.priority, 20) || 'medium';
    const title = cleanString(input.title, 240);
    const message = cleanString(input.message, 2000);

    if (!type || !title || !message) {
      return withPrivateResponseHeaders(
        NextResponse.json({ success: false, error: 'type, title and message are required' }, { status: 400 })
      );
    }

    const allowedPriorities = new Set(['low', 'medium', 'high', 'critical']);
    if (!allowedPriorities.has(priority)) {
      return withPrivateResponseHeaders(
        NextResponse.json({ success: false, error: 'Unsupported priority' }, { status: 400 })
      );
    }

    const metadata =
      input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
        ? { ...(input.metadata as Record<string, unknown>) }
        : undefined;
    const action =
      input.action && typeof input.action === 'object' && !Array.isArray(input.action)
        ? { ...(input.action as Record<string, unknown>) }
        : undefined;

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const row: Record<string, unknown> = {
      id,
      type,
      priority,
      title,
      message,
      isRead: false,
      createdAt: now,
      metadata,
      action,
      adminId: cleanString(input.adminId, 160) || null,
      employeeId: authorization.user.id,
      employeeName: actorName(authorization.user),
      employeeEmail: cleanString(authorization.user.email, 320) || null,
      actionType: cleanString(input.actionType, 80) || null,
      targetType: cleanString(input.targetType, 80) || null,
      targetId: cleanString(input.targetId, 160) || null,
      targetName: cleanString(input.targetName, 240) || null,
    };

    const db = getSupabaseAdmin();
    const { error } = await db.from('admin_notifications').insert(row);
    if (error) throw error;

    return withPrivateResponseHeaders(NextResponse.json({ success: true, id }));
  } catch (error) {
    console.error('[admin/notifications] create failed:', error);
    return withPrivateResponseHeaders(
      NextResponse.json({ success: false, error: 'Failed to create admin notification' }, { status: 500 })
    );
  }
}

export async function PATCH(request: NextRequest) {
  const authorization = await authorizeAdmin(request, 'manage:communications');
  if (!authorization.ok) return authorization.response;

  try {
    const body = await request.json() as MutationBody;
    const action = cleanString(body.action, 40);
    const db = getSupabaseAdmin();
    const now = new Date().toISOString();

    if (action === 'mark_read') {
      const notificationId = cleanString(body.notificationId, 160);
      if (!notificationId) {
        return withPrivateResponseHeaders(
          NextResponse.json({ success: false, error: 'notificationId is required' }, { status: 400 })
        );
      }

      const { error } = await db
        .from('admin_notifications')
        .update({ isRead: true, readAt: now, readBy: authorization.user.id })
        .eq('id', notificationId);
      if (error) throw error;
      return withPrivateResponseHeaders(NextResponse.json({ success: true }));
    }

    if (action === 'mark_all_read') {
      let query = db
        .from('admin_notifications')
        .update({ isRead: true, readAt: now, readBy: authorization.user.id })
        .eq('isRead', false);

      if (cleanString(body.scope, 40) === 'current_admin') {
        query = query.eq('adminId', authorization.user.id);
      }

      const { error } = await query;
      if (error) throw error;
      return withPrivateResponseHeaders(NextResponse.json({ success: true }));
    }

    return withPrivateResponseHeaders(
      NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 })
    );
  } catch (error) {
    console.error('[admin/notifications] update failed:', error);
    return withPrivateResponseHeaders(
      NextResponse.json({ success: false, error: 'Failed to update admin notifications' }, { status: 500 })
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authorization = await authorizeAdmin(request, 'manage:communications');
  if (!authorization.ok) return authorization.response;

  try {
    const body = await request.json() as MutationBody;
    const notificationId = cleanString(body.notificationId, 160);
    if (!notificationId) {
      return withPrivateResponseHeaders(
        NextResponse.json({ success: false, error: 'notificationId is required' }, { status: 400 })
      );
    }

    const db = getSupabaseAdmin();
    const { error } = await db.from('admin_notifications').delete().eq('id', notificationId);
    if (error) throw error;

    return withPrivateResponseHeaders(NextResponse.json({ success: true }));
  } catch (error) {
    console.error('[admin/notifications] delete failed:', error);
    return withPrivateResponseHeaders(
      NextResponse.json({ success: false, error: 'Failed to delete admin notification' }, { status: 500 })
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
