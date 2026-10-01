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

    // Automatic conversation reuse is canonical-only. Historical conversations
    // that still contain legacy account IDs are preserved, but they are not
    // selected for new chat starts because participant RLS is keyed by Auth UID.
    const { data: existingConversations, error: searchError } = await db
      .from('conversations')
      .select('id, participants')
      .contains('participants', [sender.authUid, receiver.authUid])
      .order('updatedAt', { ascending: false })
      .limit(1);

    if (searchError) throw searchError;

    const existingConversation = existingConversations?.[0];
    if (existingConversation?.id) {
      return NextResponse.json({
        success: true,
        id: String(existingConversation.id),
        created: false,
      });
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
