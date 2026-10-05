/**
 * Canonical Server Endpoint: Send a message within an existing conversation
 * Validates caller authorization and conversation membership
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeUser } from '@/lib/api/user-auth';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authorizeUser(request);
    if (!authResult.ok) {
      return authResult.response;
    }

    const callerUser = authResult.user;
    const body = await request.json().catch(() => ({}));
    const {
      conversationId,
      message = '',
      messageType = 'text',
      imageUrl = null,
      voiceUrl = null,
      voiceDuration = 0,
    } = body;

    if (!conversationId || typeof conversationId !== 'string') {
      return NextResponse.json({ success: false, error: 'معرف المحادثة مطلوب' }, { status: 400 });
    }

    const trimmedText = typeof message === 'string' ? message.trim() : '';
    if (!trimmedText && !imageUrl && !voiceUrl) {
      return NextResponse.json({ success: false, error: 'محتوى الرسالة فارغ' }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // 1. Fetch conversation to verify membership & get receiver
    const { data: conv, error: convError } = await db
      .from('conversations')
      .select('id, participants, participantNames, participantTypes, unreadCount')
      .eq('id', conversationId)
      .maybeSingle();

    if (convError || !conv) {
      return NextResponse.json({ success: false, error: 'المحادثة غير موجودة' }, { status: 404 });
    }

    const participants: string[] = Array.isArray(conv.participants) ? conv.participants : [];
    if (!participants.includes(callerUser.id)) {
      return NextResponse.json({ success: false, error: 'غير مصرح لك بالإرسال في هذه المحادثة' }, { status: 403 });
    }

    const receiverId = participants.find((p) => p !== callerUser.id) || callerUser.id;
    const pNames = (conv.participantNames as Record<string, string>) || {};
    const pTypes = (conv.participantTypes as Record<string, string>) || {};

    const senderName = pNames[callerUser.id] || callerUser.user_metadata?.full_name || 'User';
    const receiverName = pNames[receiverId] || 'User';
    const senderType = pTypes[callerUser.id] || callerUser.user_metadata?.accountType || 'player';
    const receiverType = pTypes[receiverId] || 'player';

    const now = new Date().toISOString();
    const subId = callerUser.id.length > 4 ? callerUser.id.substring(0, 4) : callerUser.id;
    const messageId = `msg_${Date.now()}_${subId}`;

    const messageDoc = {
      id: messageId,
      conversationId,
      senderId: callerUser.id,
      receiverId,
      senderName,
      receiverName,
      senderType,
      receiverType,
      message: trimmedText || (messageType === 'voice' ? 'تسجيل صوتي' : 'صورة'),
      messageType,
      imageUrl: imageUrl || null,
      voiceUrl: voiceUrl || null,
      voiceDuration: Number(voiceDuration) || 0,
      deliveryStatus: 'sent',
      timestamp: now,
      isRead: false,
    };

    // 2. Insert message into messages table
    const { error: insertError } = await db
      .from('messages')
      .insert(messageDoc);

    if (insertError) {
      console.error('❌ [messages/send] Insert message error:', insertError);
      return NextResponse.json({ success: false, error: 'فشل إرسال الرسالة' }, { status: 500 });
    }

    // 3. Update conversation last message & unread counter
    const currentUnread = (conv.unreadCount as Record<string, number>) || {};
    const updatedUnread = {
      ...currentUnread,
      [callerUser.id]: 0,
      [receiverId]: (currentUnread[receiverId] || 0) + 1,
    };

    await db
      .from('conversations')
      .update({
        lastMessage: messageDoc.message,
        lastMessageTime: now,
        lastSenderId: callerUser.id,
        unreadCount: updatedUnread,
        updatedAt: now,
      })
      .eq('id', conversationId)
      .catch((updateErr: any) => {
        console.warn('⚠️ [messages/send] Failed to update conversation summary:', updateErr);
      });

    return NextResponse.json({
      success: true,
      messageId,
      timestamp: now,
    });

  } catch (error: any) {
    console.error('❌ [messages/send] Unhandled error:', error);
    return NextResponse.json({ success: false, error: error.message || 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
