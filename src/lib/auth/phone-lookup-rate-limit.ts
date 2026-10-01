import { createHash } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const WINDOW_SECONDS = 15 * 60;
const MAX_PER_IP = 30;
const MAX_PER_IP_PHONE = 6;

function normalizePhoneForRateLimit(value: string): string {
  return value.replace(/\D/g, '').slice(-20);
}

function requestIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get('x-real-ip')?.trim();
  return realIp || 'unknown';
}

function hashKey(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

async function consume(keyHash: string, maxAttempts: number): Promise<boolean> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.rpc('consume_phone_lookup_rate_limit', {
    p_key_hash: keyHash,
    p_window_seconds: WINDOW_SECONDS,
    p_max_attempts: maxAttempts,
  });

  if (error) throw error;
  return data === true;
}

export async function consumePhoneLookupRateLimit(
  request: NextRequest,
  phoneNumber: string,
): Promise<boolean> {
  const ip = requestIp(request);
  const phone = normalizePhoneForRateLimit(phoneNumber);

  const [ipAllowed, pairAllowed] = await Promise.all([
    consume(hashKey(`phone-lookup:ip:${ip}`), MAX_PER_IP),
    consume(hashKey(`phone-lookup:pair:${ip}:${phone}`), MAX_PER_IP_PHONE),
  ]);

  return ipAllowed && pairAllowed;
}
