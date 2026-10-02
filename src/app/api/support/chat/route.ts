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
  locale?: unknown;
  messageIds?: unknown;
};

const CATEGORIES = new Set(['technical', 'billing', 'general', 'bug_report', 'feature_request']);
const PRIORITIES = new Set(['low', 'medium', 'high', 'urgent']);
const WELCOME_MESSAGES: Record<string, string> = {
  ar: 'مرحبًا بك في الدعم الفني. كيف يمكننا مساعدتك؟',
  en: 'Welcome to support. How can we help you?',
  es: 'Bienvenido al soporte. ¿Cómo podemos ayudarte?',
  pt: 'Bem-vindo ao suporte. Como podemos ajudar?',
};

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

      const { data: activeConversations, error: activeError } = await db
        .from('support_conversations')
        .select('id')
        .eq('userId', identity.authUid)
        .in('status', ['open', 'in_progress'])
        .order('updatedAt', { ascending: false })
        .limit(1);
      if (activeError) throw activeError;
      if (activeConversations?.[0]?.id) {
        return NextResponse.json({
          success: true,
          id: String(activeConversations[0].id),
          created: false,
        });
      }

      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const locale = cleanString(body.locale, 8).toLowerCase();
      const welcomeMessage = WELCOME_MESSAGES[locale] || WELCOME_MESSAGES.en;

      const { data: created, error: createError } = await db.rpc(
        'create_support_conversation_with_welcome',
        {
          p_conversation_id: id,
          p_user_id: identity.authUid,
          p_user_name: identity.name,
          p_user_type: identity.accountType,
          p_status: 'open',
          p_priority: priority,
          p_category: category,
          p_welcome_message_id: crypto.randomUUID(),
          p_welcome_message: welcomeMessage,
          p_created_at: now,
        }
      );

      if (createError) throw createError;
      if (!created) throw new Error('Support conversation creation rejected');

      return NextResponse.json({ success: true, id, created: true });
    }

    if (action === 'send_message') {
      const conversationId = cleanString(body.conversationId, 160);
      const message = cleanString(body.message, 4000);
      if (!conversationId || !message) {
        return NextResponse.json({ success: false, error: 'conversationId and message are required' }, { status: 400 });
      }

      const now = new Date().toISOString();
      const messageId = crypto.randomUUID();
      const notificationId = crypto.randomUUID();

      const { data: inserted, error: insertError } = await db.rpc(
        'insert_support_user_message',
        {
          p_message_id: messageId,
          p_notification_id: notificationId,
          p_conversation_id: conversationId,
          p_sender_uid: identity.authUid,
          p_sender_name: identity.name,
          p_sender_type: identity.accountType,
          p_message: message,
          p_sent_at: now,
        }
      );

      if (insertError) throw insertError;
      if (!inserted) {
        return NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 });
      }

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
