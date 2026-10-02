import { createHash } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';


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

async function consume(keyHash: string, windowSeconds: number, maxAttempts: number): Promise<boolean> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.rpc('consume_phone_lookup_rate_limit', {
    p_key_hash: keyHash,
    p_window_seconds: windowSeconds,
    p_max_attempts: maxAttempts,
  });

  if (error) throw error;
  return data === true;
}

export async function consumePhoneActionRateLimit(
  request: NextRequest,
  phoneNumber: string,
  options: {
    namespace: string;
    windowSeconds?: number;
    maxPerIp?: number;
    maxPerIpPhone?: number;
  },
): Promise<boolean> {
  const ip = requestIp(request);
  const phone = normalizePhoneForRateLimit(phoneNumber);
  const namespace = options.namespace.replace(/[^a-z0-9_-]/gi, '').slice(0, 64) || 'phone-action';
  const windowSeconds = options.windowSeconds ?? 15 * 60;
  const maxPerIp = options.maxPerIp ?? 30;
  const maxPerIpPhone = options.maxPerIpPhone ?? 6;

  const [ipAllowed, pairAllowed] = await Promise.all([
    consume(hashKey(`${namespace}:ip:${ip}`), windowSeconds, maxPerIp),
    consume(hashKey(`${namespace}:pair:${ip}:${phone}`), windowSeconds, maxPerIpPhone),
  ]);

  return ipAllowed && pairAllowed;
}

export async function consumePhoneLookupRateLimit(
  request: NextRequest,
  phoneNumber: string,
): Promise<boolean> {
  return consumePhoneActionRateLimit(request, phoneNumber, {
    namespace: 'phone-lookup',
    maxPerIp: 30,
    maxPerIpPhone: 6,
  });
}
