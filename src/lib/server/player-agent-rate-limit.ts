import { createHash } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

function hashKey(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function requestIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip')?.trim()
    || request.headers.get('cf-connecting-ip')?.trim()
    || 'unknown';
}

async function consume(key: string, maxAttempts: number): Promise<boolean> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.rpc('consume_phone_lookup_rate_limit', {
    p_key_hash: hashKey(key),
    p_window_seconds: 600,
    p_max_attempts: maxAttempts,
  });
  if (error) throw error;
  return data === true;
}

export async function consumePlayerAgentRateLimit(
  request: NextRequest,
  authUid: string,
): Promise<boolean> {
  const ip = requestIp(request);
  const [userAllowed, ipAllowed] = await Promise.all([
    consume(`player-agent:user:${authUid}`, 20),
    consume(`player-agent:ip:${ip}`, 60),
  ]);
  return userAllowed && ipAllowed;
}
