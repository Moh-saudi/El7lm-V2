import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { resolveServerAccountIdentity } from '@/lib/server/account-identity';

type IncomingMessage = {
  phone: string;
  text: string;
  type: string;
  messageId: string;
  timestamp: unknown;
};

type StatusUpdate = {
  messageId: string;
  status: string;
  timestamp: unknown;
};

async function resolveIdentityByPhone(phoneValue: string) {
  const db = getSupabaseAdmin();
  const digits = phoneValue.replace(/\D/g, '');
  if (!digits) return null;

  const candidates = new Set<string>([digits, `+${digits}`]);
  if (digits.startsWith('20') && digits.length === 12) {
    candidates.add(`0${digits.slice(2)}`);
  }
  if (digits.startsWith('966') && digits.length === 12) {
    candidates.add(`0${digits.slice(3)}`);
  }

  const identifiers = new Set<string>();
  const tables = ['users', 'players', 'clubs', 'academies', 'agents', 'trainers', 'marketers', 'admins'] as const;

  for (const table of tables) {
    const columns = table === 'users' || table === 'players' ? ['phone', 'phoneNumber'] : ['phone'];
    for (const column of columns) {
      for (const candidate of candidates) {
        const { data, error } = await db.from(table).select('id, uid').eq(column, candidate).limit(2);
        if (error) throw error;
        if ((data?.length ?? 0) > 1) return null;
        for (const row of data ?? []) {
          const uid = String(row.uid ?? '').trim();
          const id = String(row.id ?? '').trim();
          if (uid) identifiers.add(uid);
          else if (id) identifiers.add(id);
        }
      }
    }
  }

  const resolved = [];
  for (const identifier of identifiers) {
    const identity = await resolveServerAccountIdentity(identifier);
    if (identity) resolved.push(identity);
  }

  const byUid = new Map(resolved.map(identity => [identity.authUid, identity]));
  return byUid.size === 1 ? [...byUid.values()][0] : null;
}

async function processIncomingMessage(msgData: IncomingMessage) {
  const identity = await resolveIdentityByPhone(msgData.phone);
  if (!identity) {
    console.warn('[chataman/webhook] Incoming sender identity not uniquely resolvable');
    return;
  }

  const db = getSupabaseAdmin();
  const { data: conversations, error: conversationError } = await db
    .from('conversations')
    .select('id, participants, participantNames, participantTypes, unreadCount')
    .filter('participants', 'cs', `["${identity.authUid}"]`)
    .order('lastMessageTime', { ascending: false })
    .limit(2);

  if (conversationError) throw conversationError;
  if ((conversations?.length ?? 0) !== 1) {
    console.warn('[chataman/webhook] No unique active conversation for incoming sender');
    return;
  }

  const conversation = conversations![0] as Record<string, any>;
  const participants = Array.isArray(conversation.participants) ? conversation.participants.map(String) : [];
  const receiverId = participants.find((participantId: string) => participantId !== identity.authUid);
  if (!receiverId) {
    console.warn('[chataman/webhook] Conversation has no unique receiver');
    return;
  }

  const now = new Date().toISOString();
  const content = String(msgData.text || '').trim();
  if (!content) return;

  const messageId = crypto.randomUUID();
  const { error: messageError } = await db.from('messages').insert({
    id: messageId,
    conversationId: String(conversation.id),
    senderId: identity.authUid,
    receiverId,
    senderName: identity.name,
    senderType: identity.accountType,
    receiverName: conversation.participantNames?.[receiverId] || 'مستخدم',
    receiverType: conversation.participantTypes?.[receiverId] || 'user',
    content,
    message: content,
    type: msgData.type || 'text',
    messageType: msgData.type || 'text',
    timestamp: now,
    createdAt: now,
    updatedAt: now,
    read: false,
    isRead: false,
    metadata: { isWhatsApp: true, whatsappMessageId: msgData.messageId },
  });
  if (messageError) throw messageError;

  const currentUnread = Number(conversation.unreadCount?.[receiverId] || 0);
  const { error: updateError } = await db.from('conversations').update({
    lastMessage: content,
    lastMessageTime: now,
    lastSenderId: identity.authUid,
    unreadCount: {
      ...(conversation.unreadCount || {}),
      [receiverId]: currentUnread + 1,
    },
    updatedAt: now,
  }).eq('id', conversation.id);
  if (updateError) throw updateError;
}

async function handleStatusUpdate(statusData: StatusUpdate) {
  const db = getSupabaseAdmin();
  const { data: messages, error } = await db
    .from('messages')
    .select('id, metadata')
    .eq('metadata->>whatsappMessageId', statusData.messageId)
    .limit(2);

  if (error) throw error;
  if ((messages?.length ?? 0) !== 1) {
    console.warn('[chataman/webhook] Status update message not uniquely resolvable');
    return;
  }

  const message = messages![0] as Record<string, any>;
  const metadata = message.metadata && typeof message.metadata === 'object' ? message.metadata : {};
  const updates: Record<string, unknown> = {
    metadata: {
      ...metadata,
      lastStatus: statusData.status,
      lastStatusTime: statusData.timestamp || new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };

  if (statusData.status === 'read') {
    updates.isDelivered = true;
    updates.isSeen = true;
  } else if (statusData.status === 'delivered') {
    updates.isDelivered = true;
  }

  const { error: updateError } = await db.from('messages').update(updates).eq('id', message.id);
  if (updateError) throw updateError;
}

export async function handleChatAmanWebhook(payload: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
  try {
    if (payload.object === 'whatsapp_business_account' && Array.isArray(payload.entry)) {
      for (const entry of payload.entry as Record<string, unknown>[]) {
        if (!Array.isArray(entry.changes)) continue;
        for (const change of entry.changes as Record<string, unknown>[]) {
          const value = change.value as Record<string, unknown> | undefined;
          if (!value || !Array.isArray(value.messages)) continue;
          for (const message of value.messages as Record<string, unknown>[]) {
            await processIncomingMessage({
              phone: String(message.from || ''),
              text: String((message.text as Record<string, unknown> | undefined)?.body || ''),
              type: String(message.type || 'text'),
              messageId: String(message.id || ''),
              timestamp: message.timestamp,
            });
          }
        }
      }
      return { success: true };
    }

    if (payload.event === 'message.received' || payload.event === 'message') {
      const data = (payload.data || payload) as Record<string, unknown>;
      await processIncomingMessage({
        phone: String(data.phone || data.from || ''),
        text: String(data.message || data.body || data.text || ''),
        type: String(data.type || 'text'),
        messageId: String(data.id || ''),
        timestamp: data.timestamp,
      });
      return { success: true };
    }

    if (payload.event === 'message.status.update' || payload.event === 'message.ack') {
      const data = (payload.data || payload) as Record<string, unknown>;
      await handleStatusUpdate({
        messageId: String(data.id || data.messageId || ''),
        status: String(data.status || ''),
        timestamp: data.timestamp,
      });
      return { success: true };
    }

    console.warn('[chataman/webhook] Unknown payload format');
    return { success: true };
  } catch (error) {
    console.error('[chataman/webhook] Processing failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
  }
}
