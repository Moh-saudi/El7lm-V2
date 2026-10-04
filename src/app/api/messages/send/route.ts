import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeUser } from '@/lib/api/user-auth';

function sanitizeMessage(text: string): string {
  if (!text) return '';
  return text
    .replace(/\0/g, '') // remove null bytes
    .slice(0, 4000); // enforce maximum length
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authorizeUser(request);
    if (!authResult.ok) {
      return authResult.response;
    }

    const currentUserId = authResult.user.id;
    const body = await request.json().catch(() => ({}));

    const conversationId = body.conversationId;
    const rawContent = body.content || body.message || '';
    const mediaUrl = body.mediaUrl || body.imageUrl || body.voiceUrl || null;
    const mediaType = body.mediaType || body.messageType || (body.voiceUrl ? 'voice' : body.imageUrl ? 'image' : 'text');
    const voiceDuration = typeof body.voiceDuration === 'number' ? body.voiceDuration : 0;

    if (!conversationId || typeof conversationId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'conversationId is required' },
        { status: 400 }
      );
    }

    const messageContent = sanitizeMessage(typeof rawContent === 'string' ? rawContent.trim() : '');

    if (!messageContent && !mediaUrl) {
      return NextResponse.json(
        { success: false, error: 'Message content or mediaUrl is required' },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();

    // 1. Fetch conversation and verify current user is a participant
    const { data: conv, error: convError } = await admin
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError || !conv) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const participants: string[] = Array.isArray(conv.participants) ? conv.participants : [];
    if (!participants.includes(currentUserId)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You are not a participant in this conversation' },
        { status: 403 }
      );
    }

    // Determine recipient
    const recipientId = body.receiverId || participants.find((p) => p !== currentUserId) || '';

    const participantNames = (conv.participantNames as Record<string, string>) || {};
    const participantTypes = (conv.participantTypes as Record<string, string>) || {};

    const senderName =
      participantNames[currentUserId] ||
      authResult.user.user_metadata?.full_name ||
      authResult.user.user_metadata?.name ||
      'User';

    const receiverName =
      (recipientId ? participantNames[recipientId] : '') ||
      body.receiverName ||
      'Recipient';

    const senderType =
      participantTypes[currentUserId] ||
      authResult.user.user_metadata?.accountType ||
      'user';

    const receiverType =
      (recipientId ? participantTypes[recipientId] : '') ||
      body.receiverType ||
      'user';

    const now = new Date().toISOString();
    const messageId = crypto.randomUUID();

    // 2. Insert message into messages table
    const messageRecord: Record<string, unknown> = {
      id: messageId,
      conversationId,
      senderId: currentUserId,
      receiverId: recipientId,
      senderName,
      receiverName,
      senderType,
      receiverType,
      message: messageContent,
      messageType: mediaType,
      imageUrl: mediaType === 'image' ? mediaUrl : (body.imageUrl || null),
      voiceUrl: mediaType === 'voice' ? mediaUrl : (body.voiceUrl || null),
      voiceDuration,
      timestamp: now,
      isRead: false,
      deliveryStatus: 'sent',
      createdAt: now,
      updatedAt: now,
    };

    if (mediaUrl) {
      messageRecord.mediaUrl = mediaUrl;
    }

    const { error: msgInsertError } = await admin
      .from('messages')
      .insert(messageRecord);

    if (msgInsertError) {
      console.error('Failed to insert message:', msgInsertError);
      return NextResponse.json(
        { success: false, error: 'Failed to save message' },
        { status: 500 }
      );
    }

    // 3. Update conversation lastMessage & unread count
    const unreadCount = (conv.unreadCount as Record<string, number>) || {};
    const currentReceiverUnread = Number(unreadCount[recipientId] || 0);

    const updatedUnread = {
      ...unreadCount,
      [currentUserId]: 0,
      [recipientId]: currentReceiverUnread + 1,
    };

    const displaySummary = messageContent || (mediaType === 'voice' ? 'تسجيل صوتي' : mediaType === 'image' ? 'صورة' : 'مرفق');

    try {
      await admin
        .from('conversations')
        .update({
          lastMessage: displaySummary,
          lastMessageTime: now,
          lastSenderId: currentUserId,
          unreadCount: updatedUnread,
          updatedAt: now,
        })
        .eq('id', conversationId);
    } catch (updateErr) {
      console.warn('Failed to update conversation summary:', updateErr);
    }

    return NextResponse.json({
      success: true,
      messageId,
      sentAt: now,
      deliveryStatus: 'sent',
    });
  } catch (error: any) {
    console.error('Error in /api/messages/send:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
