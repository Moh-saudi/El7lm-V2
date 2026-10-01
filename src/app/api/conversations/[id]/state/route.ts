import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/lib/api/user-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { resolveServerAccountIdentity } from '@/lib/server/account-identity';

type ConversationActionBody =
  | { action?: 'mark_read' }
  | { action?: 'set_preference'; field?: 'isMuted' | 'isArchived' | 'isPinned'; value?: boolean };

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authorization = await authorizeUser(request);
  if (!authorization.ok) return authorization.response;

  try {
    const { id } = await context.params;
    const conversationId = String(id || '').trim();
    if (!conversationId) {
      return NextResponse.json({ success: false, error: 'Conversation id is required' }, { status: 400 });
    }

    const actor = await resolveServerAccountIdentity(authorization.user.id);
    if (!actor) {
      return NextResponse.json({ success: false, error: 'Authenticated account identity not found' }, { status: 403 });
    }

    const body = await request.json() as ConversationActionBody;
    const db = getSupabaseAdmin();
    const { data: conversation, error } = await db
      .from('conversations')
      .select('participants, unreadCount, isMuted, isArchived, isPinned')
      .eq('id', conversationId)
      .maybeSingle();

    if (error) throw error;
    if (!conversation) {
      return NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 });
    }

    const participants = Array.isArray(conversation.participants)
      ? conversation.participants.map(String)
      : [];

    if (!participants.includes(actor.authUid) && !participants.includes(actor.accountId)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    if (body.action === 'mark_read') {
      const unreadCount =
        conversation.unreadCount && typeof conversation.unreadCount === 'object'
          ? { ...(conversation.unreadCount as Record<string, number>) }
          : {};

      unreadCount[actor.authUid] = 0;
      if (actor.accountId !== actor.authUid && actor.accountId in unreadCount) {
        unreadCount[actor.accountId] = 0;
      }
      updates.unreadCount = unreadCount;
    } else if (body.action === 'set_preference') {
      const allowedFields = new Set(['isMuted', 'isArchived', 'isPinned']);
      const field = String(body.field || '');
      if (!allowedFields.has(field) || typeof body.value !== 'boolean') {
        return NextResponse.json({ success: false, error: 'Invalid preference update' }, { status: 400 });
      }

      const current = conversation[field as 'isMuted' | 'isArchived' | 'isPinned'];
      const preferences =
        current && typeof current === 'object'
          ? { ...(current as Record<string, boolean>) }
          : {};

      preferences[actor.authUid] = body.value;
      updates[field] = preferences;
    } else {
      return NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 });
    }

    const { error: updateError } = await db
      .from('conversations')
      .update(updates)
      .eq('id', conversationId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[conversations/state] Failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update conversation' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
