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
  receiverName?: unknown;
  receiverAvatar?: unknown;
  receiverAccountType?: unknown;
  receiverType?: unknown;
  subject?: unknown;
  imageUrl?: unknown;
  voiceUrl?: unknown;
  voiceDuration?: unknown;
  isPinned?: unknown;
  deliveryStatus?: unknown;
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

    if (conversationId) {
      const { data: conversation, error: conversationError } = await db
        .from('conversations')
        .select('id, participants')
        .eq('id', conversationId)
        .maybeSingle();

      if (conversationError) throw conversationError;
      const participants = Array.isArray(conversation?.participants)
        ? conversation.participants.map(String)
        : [];

      if (
        !conversation ||
        !participants.includes(sender.authUid) ||
        !participants.includes(receiver.authUid)
      ) {
        return NextResponse.json({ success: false, error: 'Conversation participants do not match' }, { status: 403 });
      }
    }

    const rawType = cleanString(body.type ?? body.messageType, 32) || 'text';
    const allowedTypes = new Set(['text', 'image', 'file', 'voice', 'system']);
    const type = allowedTypes.has(rawType) ? rawType : 'text';

    const rawPriority = cleanString(body.priority, 16) || 'medium';
    const allowedPriorities = new Set(['low', 'medium', 'high']);
    const priority = allowedPriorities.has(rawPriority) ? rawPriority : 'medium';

    const metadata =
      body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
        ? body.metadata as Record<string, unknown>
        : undefined;

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const row: Record<string, unknown> = {
      id,
      conversationId: conversationId || null,
      senderId: sender.authUid,
      receiverId: receiver.authUid,
      senderName: sender.name,
      senderType: sender.accountType,
      receiverName: cleanString(body.receiverName, 160) || receiver.name,
      receiverType: cleanString(body.receiverType ?? body.receiverAccountType, 64) || receiver.accountType,
      receiverAccountType: cleanString(body.receiverAccountType ?? body.receiverType, 64) || receiver.accountType,
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
      deliveryStatus: cleanString(body.deliveryStatus, 64) || null,
      metadata,
      read: false,
      isRead: false,
      createdAt: now,
      updatedAt: now,
      timestamp: now,
    };

    const { error } = await db.from('messages').insert(row);
    if (error) throw error;

    return NextResponse.json({ success: true, id });
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
