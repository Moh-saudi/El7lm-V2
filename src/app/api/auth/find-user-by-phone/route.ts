/**
 * Find user by phone - returns email for login flow
 * تم تحويله من Firebase إلى Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const COLLECTIONS = ['employees', 'players', 'clubs', 'academies', 'agents', 'trainers', 'users'];

function normalizePhone(raw: string) {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return [];
  const c = new Set<string>([digits, `+${digits}`]);
  if (digits.length > 10) {
    c.add(digits.slice(-10)); c.add(`+${digits.slice(-10)}`);
  }
  if (digits.length > 11) {
    c.add(digits.slice(-11)); c.add(`+${digits.slice(-11)}`);
  }
  if (digits.length >= 10) c.add('0' + digits.slice(-10));
  if (digits.length >= 9) c.add('0' + digits.slice(-9));
  return Array.from(c);
}

async function findByPhone(phoneRaw: string) {
  const db = getSupabaseAdmin();
  const candidates = normalizePhone(phoneRaw);
  if (!candidates.length) return { found: false };

  for (const coll of COLLECTIONS) {
    const { data } = await db
      .from(coll)
      .select('id, email, accountType')
      .in('phone', candidates.slice(0, 10))
      .limit(1)
      .single();

    if (data && (data as any).email) {
      return {
        found: true,
        email: (data as any).email,
        id: (data as any).id,
        accountType: (data as any).accountType || coll.replace(/s$/, ''),
      };
    }
  }
  return { found: false };
}

export async function GET(req: NextRequest) {
  try {
    const phone = new URL(req.url).searchParams.get('phone') || '';
    if (!phone) return NextResponse.json({ error: 'phone is required' }, { status: 400 });
    const result = await findByPhone(phone);
    if (!result.found) return NextResponse.json({ found: false }, { status: 404 });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const phone = (body?.phone || '').toString();
    if (!phone) return NextResponse.json({ error: 'phone is required' }, { status: 400 });
    const result = await findByPhone(phone);
    if (!result.found) return NextResponse.json({ found: false }, { status: 404 });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
