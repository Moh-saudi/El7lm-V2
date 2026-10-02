'use client';

import { authenticatedFetch } from '@/lib/api/authenticated-fetch';

async function patchConversationState(
  conversationId: string,
  body: Record<string, unknown>,
): Promise<void> {
  const response = await authenticatedFetch(
    `/api/conversations/${encodeURIComponent(conversationId)}/state`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(result?.error || `Failed to update conversation (${response.status})`);
  }
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await patchConversationState(conversationId, { action: 'mark_read' });
}

export async function setConversationPreference(
  conversationId: string,
  field: 'isMuted' | 'isArchived' | 'isPinned',
  value: boolean,
): Promise<void> {
  await patchConversationState(conversationId, {
    action: 'set_preference',
    field,
    value,
  });
}
