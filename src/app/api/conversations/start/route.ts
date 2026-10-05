/**
 * Canonical Server Endpoint: Start or retrieve a conversation
 * Validates authentication, participant identities, and prevents self-messaging
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeUser } from '@/lib/api/user-auth';

const ROLE_TABLES: Record<string, string> = {
  player: 'players',
  club: 'clubs',
  academy: 'academies',
  trainer: 'trainers',
  agent: 'agents',
  marketer: 'marketers',
  admin: 'admins',
};

async function resolveUserInfo(db: any, userId: string): Promise<{ name: string; type: string; avatar: string }> {
  // First check users table
  const { data: userRow } = await db
    .from('users')
    .select('full_name, name, accountType, profile_image, avatar')
    .eq('id', userId)
    .maybeSingle();

  if (userRow) {
    return {
      name: userRow.full_name || userRow.name || 'User',
      type: userRow.accountType || 'player',
      avatar: userRow.profile_image || userRow.avatar || '',
    };
  }

  // Check auth user metadata
  const { data: authData } = await db.auth.admin.getUserById(userId).catch(() => ({ data: null }));
  if (authData?.user) {
    const meta = authData.user.user_metadata || {};
    return {
      name: meta.full_name || meta.name || authData.user.email?.split('@')[0] || 'User',
      type: meta.accountType || 'player',
      avatar: meta.avatar_url || meta.picture || '',
    };
  }

  return { name: 'User', type: 'player', avatar: '' };
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authorizeUser(request);
    if (!authResult.ok) {
      return authResult.response;
    }

    const callerUser = authResult.user;
    const body = await request.json().catch(() => ({}));
    const { recipientId, initialMessage, context } = body;

    if (!recipientId || typeof recipientId !== 'string') {
      return NextResponse.json({ success: false, error: 'معرف المستلم مطلوب' }, { status: 400 });
    }

    if (recipientId === callerUser.id) {
      return NextResponse.json({ success: false, error: 'لا يمكن بدء محادثة مع نفسك' }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // 1. Check if conversation already exists between both participants
    const { data: existingConvs, error: searchError } = await db
      .from('conversations')
      .select('id, participants, updatedAt')
      .contains('participants', [callerUser.id])
      .limit(30);

    if (!searchError && existingConvs) {
      const match = existingConvs.find((c: any) =>
        Array.isArray(c.participants) && c.participants.includes(recipientId)
      );
      if (match) {
        return NextResponse.json({
          success: true,
          conversationId: match.id,
          isNew: false,
          status: 'active',
        });
      }
    }

    // 2. Resolve caller & recipient profiles
    const [senderInfo, recipientInfo] = await Promise.all([
      resolveUserInfo(db, callerUser.id),
      resolveUserInfo(db, recipientId),
    ]);

    const now = new Date().toISOString();
    const subId = callerUser.id.length > 6 ? callerUser.id.substring(0, 6) : callerUser.id;
    const conversationId = `conv_${Date.now()}_${subId}`;

    const newConversation = {
      id: conversationId,
      participants: [callerUser.id, recipientId],
      participantNames: {
        [callerUser.id]: senderInfo.name,
        [recipientId]: recipientInfo.name,
      },
      participantTypes: {
        [callerUser.id]: senderInfo.type,
        [recipientId]: recipientInfo.type,
      },
      participantAvatars: {
        [callerUser.id]: senderInfo.avatar,
        [recipientId]: recipientInfo.avatar,
      },
      lastMessage: typeof initialMessage === 'string' ? initialMessage.trim() : '',
      lastMessageTime: now,
      lastSenderId: callerUser.id,
      unreadCount: { [callerUser.id]: 0, [recipientId]: initialMessage ? 1 : 0 },
      metadata: context || null,
      updatedAt: now,
      createdAt: now,
    };

    const { error: insertConvError } = await db
      .from('conversations')
      .insert(newConversation);

    if (insertConvError) {
      console.error('❌ [conversations/start] Insert conversation error:', insertConvError);
      return NextResponse.json({ success: false, error: 'فشل إنشاء المحادثة' }, { status: 500 });
    }

    // 3. Insert initial message if provided
    if (typeof initialMessage === 'string' && initialMessage.trim().length > 0) {
      const messageDoc = {
        id: `msg_${Date.now()}_${callerUser.id.slice(0, 4)}`,
        conversationId,
        senderId: callerUser.id,
        receiverId: recipientId,
        senderName: senderInfo.name,
        receiverName: recipientInfo.name,
        senderType: senderInfo.type,
        receiverType: recipientInfo.type,
        message: initialMessage.trim(),
        messageType: 'text',
        deliveryStatus: 'sent',
        timestamp: now,
        isRead: false,
      };

      await db.from('messages').insert(messageDoc).catch((err: any) => {
        console.warn('⚠️ [conversations/start] Initial message insert failed:', err);
      });
    }

    return NextResponse.json({
      success: true,
      conversationId,
      isNew: true,
      status: 'active',
      createdAt: now,
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ [conversations/start] Unhandled error:', error);
    return NextResponse.json({ success: false, error: error.message || 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
