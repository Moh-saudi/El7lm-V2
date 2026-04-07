import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const PRIORITY_COLLECTIONS = ['players', 'clubs', 'academies', 'users'];

const normalize = (raw: string): string[] => {
  const digits = (raw || '').toString().replace(/\D/g, '');
  if (!digits) return [];
  const c = new Set<string>();

  c.add(digits);
  c.add(`+${digits}`);

  if (digits.length === 10) {
    c.add(`20${digits}`);
    c.add(`+20${digits}`);
  }
  if (digits.length > 10) {
    c.add(digits.slice(-10));
    c.add(`+${digits.slice(-10)}`);
    c.add(`20${digits.slice(-10)}`);
    c.add(`+20${digits.slice(-10)}`);
  }
  if (digits.length > 11) {
    c.add(digits.slice(-11));
    c.add(`+${digits.slice(-11)}`);
  }
  if (digits.length >= 9) c.add('0' + digits.slice(-9));
  if (digits.length >= 10) c.add('0' + digits.slice(-10));
  if (digits.length >= 11) c.add('0' + digits.slice(-11));

  return Array.from(c);
};

function isAccountDeleted(data: Record<string, unknown>): boolean {
  if (data.isActive === true) {
    return data.isDeleted === true || data.isDeleted === 'true';
  }
  if (data.isDeleted === true || data.isDeleted === 'true') return true;
  if (data.isActive === false) return true;
  if (data.isDeleted === undefined && data.isActive === undefined) {
    return !!(data.deletedAt || data.deletedBy);
  }
  return false;
}

async function existsByPhone(phoneRaw: string): Promise<{ phoneExists: boolean; email?: string }> {
  const start = Date.now();
  const candidates = normalize(phoneRaw);

  if (candidates.length === 0) return { phoneExists: false };

  const db = getSupabaseAdmin();

  for (const coll of PRIORITY_COLLECTIONS) {
    try {
      // استخدام OR لكل صيغ الهاتف (Supabase يدعم .in() للقيم المتعددة)
      const batch = candidates.slice(0, 10);
      const { data } = await db
        .from(coll)
        .select('id, phone, email, isDeleted, isActive, deletedAt, deletedBy')
        .in('phone', batch);

      if (data && data.length > 0) {
        for (const row of data) {
          if (!isAccountDeleted(row as Record<string, unknown>)) {
            const email = (row as any).email || undefined;
            console.log(`[check-user-exists] ✅ Found in ${coll} (${Date.now() - start}ms)`);
            return { phoneExists: true, email };
          }
        }
      }

      // بحث إضافي بـ originalPhone
      const { data: data2 } = await db
        .from(coll)
        .select('id, originalPhone, email, isDeleted, isActive, deletedAt, deletedBy')
        .in('originalPhone', batch);

      if (data2 && data2.length > 0) {
        for (const row of data2) {
          if (!isAccountDeleted(row as Record<string, unknown>)) {
            return { phoneExists: true, email: (row as any).email || undefined };
          }
        }
      }
    } catch (error) {
      console.error(`[check-user-exists] Error in ${coll}:`, error);
    }
  }

  console.log(`[check-user-exists] ✅ Phone available (${Date.now() - start}ms)`);
  return { phoneExists: false };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const phone = (body?.phone || '').toString();
    if (!phone) return NextResponse.json({ error: 'phone is required' }, { status: 400 });
    const result = await existsByPhone(phone);
    return NextResponse.json(result);
  } catch (e: any) {
    console.error('[check-user-exists] ❌', e);
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = (searchParams.get('phone') || '').toString();
    if (!phone) return NextResponse.json({ error: 'phone is required' }, { status: 400 });
    const result = await existsByPhone(phone);
    return NextResponse.json(result);
  } catch (e: any) {
    console.error('[check-user-exists] ❌ GET', e);
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
