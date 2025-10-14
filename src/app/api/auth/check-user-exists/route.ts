import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

const COLLECTIONS = ['employees', 'users', 'players', 'clubs', 'academies', 'agents', 'trainers'];
const PHONE_FIELDS = [
  'phone',
  'phoneNumber',
  'phone_number',
  'mobile',
  'mobileNumber',
  'mobile_number',
  'contact.phone',
  'profile.phone'
];

const normalize = (raw: string): string[] => {
  const digits = (raw || '').toString().replace(/\D/g, '');
  if (!digits) return [];
  const c = new Set<string>();
  c.add(digits);
  c.add(`+${digits}`);
  if (digits.length > 10) { c.add(digits.slice(-10)); c.add(`+${digits.slice(-10)}`); }
  if (digits.length > 11) { c.add(digits.slice(-11)); c.add(`+${digits.slice(-11)}`); }
  if (digits.length > 12) { c.add(digits.slice(-12)); c.add(`+${digits.slice(-12)}`); }
  // صيغ محلية تبدأ بصفر (مثل 0XXXXXXXXXX)
  if (digits.length >= 9) c.add('0' + digits.slice(-9));
  if (digits.length >= 10) c.add('0' + digits.slice(-10));
  if (digits.length >= 11) c.add('0' + digits.slice(-11));
  return Array.from(c);
};

async function existsByPhone(phoneRaw: string): Promise<{ phoneExists: boolean; email?: string }> {
  const candidates = normalize(phoneRaw);
  if (candidates.length === 0) return { phoneExists: false };

  for (const coll of COLLECTIONS) {
    // Try 'in' on possible phone fields
    for (const pf of PHONE_FIELDS) {
      try {
        const qIn = query(collection(db, coll), where(pf as any, 'in', candidates.slice(0, 10)));
        const snapIn = await getDocs(qIn);
        if (!snapIn.empty) {
          const data: any = snapIn.docs[0].data();
          const email = data.email || data.userEmail || undefined;
          return { phoneExists: true, email };
        }
      } catch {
        // ignore
      }
    }

    // Equality fallback
    for (const pf of PHONE_FIELDS) {
      for (const cand of candidates) {
        try {
          const qEq = query(collection(db, coll), where(pf as any, '==', cand));
          const snapEq = await getDocs(qEq);
          if (!snapEq.empty) {
            const data: any = snapEq.docs[0].data();
            const email = data.email || data.userEmail || undefined;
            return { phoneExists: true, email };
          }
        } catch {
          // ignore
        }
      }
    }
  }

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
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
