import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeUser } from '@/lib/api/user-auth';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authorizeUser(request);
    if (!authResult.ok) {
      return authResult.response;
    }

    const currentUserId = authResult.user.id;
    const body = await request.json().catch(() => ({}));
    const { recipientId, initialMessage, context } = body;

    if (!recipientId || typeof recipientId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'recipientId is required' },
        { status: 400 }
      );
    }

    if (recipientId === currentUserId) {
      return NextResponse.json(
        { success: false, error: 'Cannot start conversation with yourself' },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();

    // 1. Check if conversation already exists between current user and recipient
    const { data: existingConvs, error: searchError } = await admin
      .from('conversations')
      .select('id, createdAt, updatedAt, participants')
      .filter('participants', 'cs', JSON.stringify([currentUserId]))
      .limit(30);

    if (!searchError && existingConvs && existingConvs.length > 0) {
      const matched = existingConvs.find((c: any) => {
        const parts = Array.isArray(c.participants) ? c.participants : [];
        return parts.includes(recipientId);
      });

      if (matched) {
        return NextResponse.json({
          success: true,
          conversationId: matched.id,
          status: 'existing',
          createdAt: matched.createdAt,
        });
      }
    }

    // 2. Fetch profiles for current user and recipient to store display metadata
    const { data: usersData } = await admin
      .from('users')
      .select('id, full_name, name, role, account_type, accountType, avatar_url, profile_image')
      .in('id', [currentUserId, recipientId]);

    const senderProfile: any = (usersData || []).find((u: any) => u.id === currentUserId) || {};
    const recipientProfile: any = (usersData || []).find((u: any) => u.id === recipientId) || {};

    const senderName: string =
      senderProfile.full_name ||
      senderProfile.name ||
      authResult.user.user_metadata?.full_name ||
      authResult.user.user_metadata?.name ||
      'User';

    const recipientName: string =
      recipientProfile.full_name ||
      recipientProfile.name ||
      body.recipientName ||
      'Recipient';

    const senderType: string =
      senderProfile.account_type ||
      senderProfile.accountType ||
      senderProfile.role ||
      authResult.user.user_metadata?.accountType ||
      'user';

    const recipientType: string =
      recipientProfile.account_type ||
      recipientProfile.accountType ||
      recipientProfile.role ||
      body.recipientType ||
      'user';

    const senderAvatar: string =
      senderProfile.avatar_url ||
      senderProfile.profile_image ||
      authResult.user.user_metadata?.avatar_url ||
      '';

    const recipientAvatar: string =
      recipientProfile.avatar_url ||
      recipientProfile.profile_image ||
      body.recipientAvatar ||
      '';

    const now = new Date().toISOString();
    const shortUid = currentUserId.length > 6 ? currentUserId.substring(0, 6) : currentUserId;
    const conversationId = `conv_${Date.now()}_${shortUid}`;

    const trimmedInitial = typeof initialMessage === 'string' ? initialMessage.trim() : '';

    const newConversation = {
      id: conversationId,
      participants: [currentUserId, recipientId],
      participantNames: {
        [currentUserId]: senderName,
        [recipientId]: recipientName,
      },
      participantTypes: {
        [currentUserId]: senderType,
        [recipientId]: recipientType,
      },
      participantAvatars: {
        [currentUserId]: senderAvatar,
        [recipientId]: recipientAvatar,
      },
      lastMessage: trimmedInitial,
      lastMessageTime: now,
      lastSenderId: currentUserId,
      unreadCount: {
        [currentUserId]: 0,
        [recipientId]: trimmedInitial ? 1 : 0,
      },
      context: context && typeof context === 'object' ? context : null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const { error: insertError } = await admin
      .from('conversations')
      .insert(newConversation);

    if (insertError) {
      console.error('Error creating conversation:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to create conversation in database' },
        { status: 500 }
      );
    }

    // If an initial message was supplied, insert it
    if (trimmedInitial) {
      const messageId = crypto.randomUUID();
      const messageRecord = {
        id: messageId,
        conversationId,
        senderId: currentUserId,
        receiverId: recipientId,
        senderName,
        receiverName: recipientName,
        senderType,
        receiverType: recipientType,
        message: trimmedInitial,
        messageType: 'text',
        timestamp: now,
        isRead: false,
        deliveryStatus: 'sent',
        createdAt: now,
        updatedAt: now,
      };

      try {
        await admin.from('messages').insert(messageRecord);
      } catch (msgErr) {
        console.warn('Initial message insert warning:', msgErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        conversationId,
        status: 'active',
        createdAt: now,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error in /api/conversations/start:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
