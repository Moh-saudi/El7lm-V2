import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin, withPrivateResponseHeaders } from '@/lib/api/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

type Body = {
  action?: unknown;
  conversationId?: unknown;
  message?: unknown;
  status?: unknown;
};

function cleanString(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdmin(request, 'manage:support');
  if (!authorization.ok) return authorization.response;

  try {
    const body = await request.json() as Body;
    const action = cleanString(body.action, 40);
    if (action !== 'send_message') {
      return withPrivateResponseHeaders(
        NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 })
      );
    }

    const conversationId = cleanString(body.conversationId, 160);
    const message = cleanString(body.message, 4000);
    if (!conversationId || !message) {
      return withPrivateResponseHeaders(
        NextResponse.json({ success: false, error: 'conversationId and message are required' }, { status: 400 })
      );
    }

    const db = getSupabaseAdmin();

    const senderName =
      cleanString(authorization.user.user_metadata?.full_name, 120) ||
      cleanString(authorization.user.user_metadata?.name, 120) ||
      cleanString(authorization.user.email?.split('@')[0], 120) ||
      'الدعم الفني';

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const { data: inserted, error: insertError } = await db.rpc(
      'insert_support_admin_message',
      {
        p_message_id: id,
        p_conversation_id: conversationId,
        p_sender_uid: authorization.user.id,
        p_sender_name: senderName,
        p_message: message,
        p_sent_at: now,
      }
    );

    if (insertError) throw insertError;
    if (!inserted) {
      return withPrivateResponseHeaders(
        NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 })
      );
    }

    return withPrivateResponseHeaders(NextResponse.json({ success: true, id }));
  } catch (error) {
    console.error('[admin/support] send failed:', error);
    return withPrivateResponseHeaders(
      NextResponse.json({ success: false, error: 'Failed to send support message' }, { status: 500 })
    );
  }
}

export async function PATCH(request: NextRequest) {
  const authorization = await authorizeAdmin(request, 'manage:support');
  if (!authorization.ok) return authorization.response;

  try {
    const body = await request.json() as Body;
    const action = cleanString(body.action, 40);
    const conversationId = cleanString(body.conversationId, 160);
    if (!conversationId) {
      return withPrivateResponseHeaders(
        NextResponse.json({ success: false, error: 'conversationId is required' }, { status: 400 })
      );
    }

    const db = getSupabaseAdmin();

    if (action === 'mark_read') {
      const { error } = await db
        .from('support_conversations')
        .update({ unreadCount: 0, updatedAt: new Date().toISOString() })
        .eq('id', conversationId);
      if (error) throw error;
      return withPrivateResponseHeaders(NextResponse.json({ success: true }));
    }

    if (action === 'update_status') {
      const status = cleanString(body.status, 40);
      if (!new Set(['open', 'in_progress', 'resolved', 'closed']).has(status)) {
        return withPrivateResponseHeaders(
          NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 })
        );
      }

      const { error } = await db
        .from('support_conversations')
        .update({ status, updatedAt: new Date().toISOString() })
        .eq('id', conversationId);
      if (error) throw error;
      return withPrivateResponseHeaders(NextResponse.json({ success: true }));
    }

    return withPrivateResponseHeaders(
      NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 })
    );
  } catch (error) {
    console.error('[admin/support] update failed:', error);
    return withPrivateResponseHeaders(
      NextResponse.json({ success: false, error: 'Failed to update support conversation' }, { status: 500 })
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
