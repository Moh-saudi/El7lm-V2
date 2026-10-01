import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/lib/api/user-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { resolveServerAccountIdentity } from '@/lib/server/account-identity';

type StartConversationBody = {
  targetUserId?: unknown;
  subject?: unknown;
};

function cleanString(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeUser(request);
  if (!authorization.ok) return authorization.response;

  try {
    const body = await request.json() as StartConversationBody;
    const targetInput = cleanString(body.targetUserId, 160);
    if (!targetInput) {
      return NextResponse.json({ success: false, error: 'targetUserId is required' }, { status: 400 });
    }

    const [sender, receiver] = await Promise.all([
      resolveServerAccountIdentity(authorization.user.id),
      resolveServerAccountIdentity(targetInput),
    ]);

    if (!sender) {
      return NextResponse.json({ success: false, error: 'Authenticated sender identity not found' }, { status: 403 });
    }
    if (!receiver) {
      return NextResponse.json({ success: false, error: 'Target identity not found or ambiguous' }, { status: 404 });
    }
    if (sender.authUid === receiver.authUid) {
      return NextResponse.json({ success: false, error: 'Cannot start conversation with self' }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const senderRefs = [...new Set([sender.authUid, sender.accountId].filter(Boolean))];

    const searches = await Promise.all(
      senderRefs.map(ref =>
        db
          .from('conversations')
          .select('id, participants')
          .contains('participants', [ref])
          .order('updatedAt', { ascending: false })
          .limit(100)
      )
    );

    for (const result of searches) {
      if (result.error) throw result.error;
    }

    const seen = new Set<string>();
    const receiverRefs = new Set([receiver.authUid, receiver.accountId, targetInput]);

    for (const result of searches) {
      for (const conversation of result.data ?? []) {
        const id = String(conversation.id || '');
        if (!id || seen.has(id)) continue;
        seen.add(id);

        const participants = Array.isArray(conversation.participants)
          ? conversation.participants.map(String)
          : [];

        if (participants.some(ref => receiverRefs.has(ref))) {
          return NextResponse.json({ success: true, id, created: false });
        }
      }
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const subject = cleanString(body.subject, 200);

    const { error } = await db.from('conversations').insert({
      id,
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
      subject: subject || null,
      lastMessage: '',
      lastMessageTime: now,
      lastSenderId: '',
      createdAt: now,
      updatedAt: now,
      isActive: true,
    });

    if (error) throw error;

    return NextResponse.json({ success: true, id, created: true });
  } catch (error) {
    console.error('[conversations/start] Failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to start conversation' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
