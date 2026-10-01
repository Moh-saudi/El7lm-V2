import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/lib/api/user-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { resolveServerAccountIdentity } from '@/lib/server/account-identity';

type SendMessageBody = {
  receiverId?: unknown;
  conversationId?: unknown;
  content?: unknown;
  message?: unknown;
  type?: unknown;
  messageType?: unknown;
  priority?: unknown;
  subject?: unknown;
  imageUrl?: unknown;
  voiceUrl?: unknown;
  voiceDuration?: unknown;
  isPinned?: unknown;
  metadata?: unknown;
};

function cleanString(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeUser(request);
  if (!authorization.ok) return authorization.response;

  try {
    const body = await request.json() as SendMessageBody;
    const receiverInput = cleanString(body.receiverId, 160);
    const content = cleanString(body.content ?? body.message, 4000);
    const conversationId = cleanString(body.conversationId, 160);

    if (!receiverInput || !content) {
      return NextResponse.json({ success: false, error: 'receiverId and message are required' }, { status: 400 });
    }

    const [sender, receiver] = await Promise.all([
      resolveServerAccountIdentity(authorization.user.id),
      resolveServerAccountIdentity(receiverInput),
    ]);

    if (!sender) {
      return NextResponse.json({ success: false, error: 'Authenticated sender identity not found' }, { status: 403 });
    }
    if (!receiver) {
      return NextResponse.json({ success: false, error: 'Receiver identity not found or ambiguous' }, { status: 404 });
    }
    if (sender.authUid === receiver.authUid) {
      return NextResponse.json({ success: false, error: 'Cannot message self' }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    let resolvedConversationId = conversationId;

    if (resolvedConversationId) {
      const { data: conversation, error: conversationError } = await db
        .from('conversations')
        .select('id, participants')
        .eq('id', resolvedConversationId)
        .maybeSingle();

      if (conversationError) throw conversationError;
      const participants = Array.isArray(conversation?.participants)
        ? conversation.participants.map(String)
        : [];

      const senderIsParticipant =
        participants.includes(sender.authUid) ||
        participants.includes(sender.accountId);

      const receiverIsParticipant =
        participants.includes(receiver.authUid) ||
        participants.includes(receiver.accountId) ||
        participants.includes(receiverInput);

      if (!conversation || !senderIsParticipant || !receiverIsParticipant) {
        return NextResponse.json({ success: false, error: 'Conversation participants do not match' }, { status: 403 });
      }
    } else {
      const { data: senderConversations, error: conversationSearchError } = await db
        .from('conversations')
        .select('id, participants')
        .contains('participants', [sender.authUid])
        .order('updatedAt', { ascending: false })
        .limit(100);

      if (conversationSearchError) throw conversationSearchError;

      const existingConversation = (senderConversations ?? []).find((conversation) => {
        const participants = Array.isArray(conversation.participants)
          ? conversation.participants.map(String)
          : [];
        return participants.includes(receiver.authUid);
      });

      if (existingConversation?.id) {
        resolvedConversationId = String(existingConversation.id);
      } else {
        const now = new Date().toISOString();
        resolvedConversationId = crypto.randomUUID();
        const { error: createConversationError } = await db.from('conversations').insert({
          id: resolvedConversationId,
          participants: [sender.authUid, receiver.authUid],
          participantNames: {
            [sender.authUid]: sender.name,
            [receiver.authUid]: receiver.name,
          },
          participantTypes: {
            [sender.authUid]: sender.accountType,
            [receiver.authUid]: receiver.accountType,
          },
          unreadCount: {
            [sender.authUid]: 0,
            [receiver.authUid]: 0,
          },
          lastMessage: '',
          lastMessageTime: now,
          lastSenderId: '',
          createdAt: now,
          updatedAt: now,
          isActive: true,
        });

        if (createConversationError) throw createConversationError;
      }
    }

    const rawType = cleanString(body.type ?? body.messageType, 32) || 'text';
    const allowedTypes = new Set(['text', 'image', 'file', 'voice']);
    const type = allowedTypes.has(rawType) ? rawType : 'text';

    const rawPriority = cleanString(body.priority, 16) || 'medium';
    const allowedPriorities = new Set(['low', 'medium', 'high']);
    const priority = allowedPriorities.has(rawPriority) ? rawPriority : 'medium';

    const metadata =
      body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
        ? { ...(body.metadata as Record<string, unknown>) }
        : undefined;

    if (metadata) {
      delete metadata.senderId;
      delete metadata.senderName;
      delete metadata.senderType;
      delete metadata.receiverId;
      delete metadata.receiverName;
      delete metadata.receiverType;
      delete metadata.isWhatsApp;
      delete metadata.whatsappMessageId;
      delete metadata.deliveryStatus;
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const row: Record<string, unknown> = {
      id,
      conversationId: resolvedConversationId,
      senderId: sender.authUid,
      receiverId: receiver.authUid,
      senderName: sender.name,
      senderType: sender.accountType,
      receiverName: receiver.name,
      receiverType: receiver.accountType,
      receiverAccountType: receiver.accountType,
      content,
      message: content,
      type,
      messageType: type,
      priority,
      subject: cleanString(body.subject, 200) || null,
      imageUrl: cleanString(body.imageUrl, 2000) || null,
      voiceUrl: cleanString(body.voiceUrl, 2000) || null,
      voiceDuration: Number.isFinite(Number(body.voiceDuration)) ? Number(body.voiceDuration) : null,
      isPinned: body.isPinned === true,
      deliveryStatus: 'sent',
      metadata,
      read: false,
      isRead: false,
      createdAt: now,
      updatedAt: now,
      timestamp: now,
    };

    const { data: messageInserted, error: messageInsertError } = await db.rpc(
      'insert_message_and_update_conversation',
      {
        p_message: row,
        p_conversation_id: resolvedConversationId,
        p_sender_uid: sender.authUid,
        p_receiver_uid: receiver.authUid,
        p_sender_name: sender.name,
        p_receiver_name: receiver.name,
        p_sender_type: sender.accountType,
        p_receiver_type: receiver.accountType,
        p_content: content,
        p_sent_at: now,
      }
    );

    if (messageInsertError) throw messageInsertError;
    if (!messageInserted) {
      throw new Error('Transactional message insert rejected');
    }

    return NextResponse.json({ success: true, id, conversationId: resolvedConversationId });
  } catch (error) {
    console.error('[messages/send] Failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to send message' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
