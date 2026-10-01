import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/lib/api/user-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { resolveServerAccountIdentity } from '@/lib/server/account-identity';

type Body = {
  action?: unknown;
  conversationId?: unknown;
  category?: unknown;
  priority?: unknown;
  message?: unknown;
  welcomeMessage?: unknown;
  messageIds?: unknown;
};

const CATEGORIES = new Set(['technical', 'billing', 'general', 'bug_report', 'feature_request']);
const PRIORITIES = new Set(['low', 'medium', 'high', 'urgent']);

function cleanString(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeUser(request);
  if (!authorization.ok) return authorization.response;

  try {
    const body = await request.json() as Body;
    const action = cleanString(body.action, 40);
    const identity = await resolveServerAccountIdentity(authorization.user.id);
    if (!identity) {
      return NextResponse.json({ success: false, error: 'Authenticated account identity not found' }, { status: 403 });
    }

    const db = getSupabaseAdmin();

    if (action === 'create_conversation') {
      const category = cleanString(body.category, 40) || 'general';
      const priority = cleanString(body.priority, 20) || 'medium';
      if (!CATEGORIES.has(category) || !PRIORITIES.has(priority)) {
        return NextResponse.json({ success: false, error: 'Invalid category or priority' }, { status: 400 });
      }

      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const { error } = await db.from('support_conversations').insert({
        id,
        userId: identity.authUid,
        userName: identity.name,
        userType: identity.accountType,
        status: 'open',
        priority,
        category,
        lastMessage: '',
        lastMessageTime: now,
        unreadCount: 0,
        createdAt: now,
        updatedAt: now,
      });
      if (error) throw error;

      const welcomeMessage = cleanString(body.welcomeMessage, 500);
      if (welcomeMessage) {
        const { error: welcomeError } = await db.from('support_messages').insert({
          id: crypto.randomUUID(),
          conversationId: id,
          senderId: 'system',
          senderName: 'Support',
          senderType: 'system',
          message: welcomeMessage,
          timestamp: now,
          isRead: true,
        });
        if (welcomeError) throw welcomeError;
      }

      return NextResponse.json({ success: true, id });
    }

    if (action === 'send_message') {
      const conversationId = cleanString(body.conversationId, 160);
      const message = cleanString(body.message, 4000);
      if (!conversationId || !message) {
        return NextResponse.json({ success: false, error: 'conversationId and message are required' }, { status: 400 });
      }

      const { data: conversation, error: conversationError } = await db
        .from('support_conversations')
        .select('id, userId, status, priority, category')
        .eq('id', conversationId)
        .maybeSingle();
      if (conversationError) throw conversationError;
      if (!conversation || String(conversation.userId) !== identity.authUid) {
        return NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 });
      }

      const now = new Date().toISOString();
      const messageId = crypto.randomUUID();
      const { error: messageError } = await db.from('support_messages').insert({
        id: messageId,
        conversationId,
        senderId: identity.authUid,
        senderName: identity.name,
        senderType: identity.accountType,
        message,
        timestamp: now,
        isRead: false,
      });
      if (messageError) throw messageError;

      const { error: updateError } = await db
        .from('support_conversations')
        .update({
          lastMessage: message,
          lastMessageTime: now,
          updatedAt: now,
          status: conversation.status === 'resolved' ? 'open' : conversation.status,
        })
        .eq('id', conversationId);
      if (updateError) throw updateError;

      const preview = message.length > 50 ? `${message.slice(0, 50)}...` : message;
      const { error: notificationError } = await db.from('notifications').insert({
        id: crypto.randomUUID(),
        userId: 'system',
        title: 'New support message',
        body: `${identity.name}: ${preview}`,
        message: `${identity.name}: ${preview}`,
        type: 'support',
        senderName: identity.name,
        senderId: identity.authUid,
        senderType: identity.accountType,
        conversationId,
        link: `/dashboard/admin/support?conversation=${conversationId}`,
        isRead: false,
        createdAt: now,
        updatedAt: now,
        priority: conversation.priority || 'medium',
        category: conversation.category || 'general',
      });
      if (notificationError) throw notificationError;

      return NextResponse.json({ success: true, id: messageId });
    }

    return NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('[support/chat] POST failed:', error);
    return NextResponse.json({ success: false, error: 'Support operation failed' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authorization = await authorizeUser(request);
  if (!authorization.ok) return authorization.response;

  try {
    const body = await request.json() as Body;
    const conversationId = cleanString(body.conversationId, 160);
    const messageIds = Array.isArray(body.messageIds)
      ? body.messageIds.map(id => cleanString(id, 160)).filter(Boolean).slice(0, 50)
      : [];

    if (!conversationId || messageIds.length === 0) {
      return NextResponse.json({ success: false, error: 'conversationId and messageIds are required' }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const { data: conversation, error: conversationError } = await db
      .from('support_conversations')
      .select('id, userId')
      .eq('id', conversationId)
      .maybeSingle();
    if (conversationError) throw conversationError;
    if (!conversation || String(conversation.userId) !== authorization.user.id) {
      return NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 });
    }

    const { error } = await db
      .from('support_messages')
      .update({ isRead: true })
      .eq('conversationId', conversationId)
      .in('id', messageIds)
      .neq('senderId', authorization.user.id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[support/chat] PATCH failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to mark support messages read' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
