'use client';

import { authenticatedFetch } from '@/lib/api/authenticated-fetch';

export async function startConversation(
  targetUserId: string,
  subject?: string,
): Promise<{ id: string; created: boolean }> {
  const response = await authenticatedFetch('/api/conversations/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetUserId, subject }),
  });

  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.success || !result?.id) {
    throw new Error(result?.error || `Failed to start conversation (${response.status})`);
  }

  return { id: String(result.id), created: Boolean(result.created) };
}
