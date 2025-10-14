import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

type LookupResult = {
  found: boolean;
  email?: string;
  id?: string;
  accountType?: string;
};

const COLLECTIONS_TO_SEARCH = ['employees', 'users', 'players', 'clubs', 'academies', 'agents', 'trainers'];
const PHONE_FIELDS = [
  'phone',
  'phoneNumber',
  'phone_number',
  'mobile',
  'mobileNumber',
  'mobile_number',
  // حقول متداخلة شائعة
  'contact.phone',
  'profile.phone'
];

const normalizePhone = (raw: string): { candidates: string[] } => {
  const digits = (raw || '').toString().replace(/\D/g, '');
  if (!digits) return { candidates: [] };
  const candidates = new Set<string>();
  // as-is digits
  candidates.add(digits);
  // with + prefix for common case
  candidates.add(`+${digits}`);
  // last 10/11/12 digits (some datasets store local vs intl)
  if (digits.length > 10) {
    candidates.add(digits.slice(-10));
    candidates.add(`+${digits.slice(-10)}`);
  }
  if (digits.length > 11) {
    candidates.add(digits.slice(-11));
    candidates.add(`+${digits.slice(-11)}`);
  }
  if (digits.length > 12) {
    candidates.add(digits.slice(-12));
    candidates.add(`+${digits.slice(-12)}`);
  }
  // صيغ محلية تبدأ بصفر (مثل 0XXXXXXXXXX)
  if (digits.length >= 9) candidates.add('0' + digits.slice(-9));
  if (digits.length >= 10) candidates.add('0' + digits.slice(-10));
  if (digits.length >= 11) candidates.add('0' + digits.slice(-11));
  return { candidates: Array.from(candidates) };
};

async function findByPhone(phoneRaw: string): Promise<LookupResult> {
  const { candidates } = normalizePhone(phoneRaw);
  if (candidates.length === 0) return { found: false };

  for (const coll of COLLECTIONS_TO_SEARCH) {
    try {
      // Search exact matches first
      // Try 'in' for each known phone field
      for (const pf of PHONE_FIELDS) {
        try {
          const qIn = query(collection(db, coll), where(pf as any, 'in', candidates.slice(0, 10)));
          const snapIn = await getDocs(qIn);
          if (!snapIn.empty) {
            const doc = snapIn.docs[0];
            const data: any = doc.data();
            const email = data.email || data.userEmail || '';
            if (email) return { found: true, email, id: doc.id, accountType: coll.replace(/s$/, '') };
          }
        } catch {
          // ignore and fallback to equality loops below
        }
      }
    } catch {
      // Some backends may not support 'in' on phone if index missing → fallback to equality loops
      // no-op, continue to equality below
    }

    // Equality fallback across all known phone fields and candidates (index-free)
    for (const pf of PHONE_FIELDS) {
      for (const cand of candidates) {
        try {
          const qEq = query(collection(db, coll), where(pf as any, '==', cand));
          const snapEq = await getDocs(qEq);
          if (!snapEq.empty) {
            const doc = snapEq.docs[0];
            const data: any = doc.data();
            const email = data.email || data.userEmail || '';
            if (email) return { found: true, email, id: doc.id, accountType: coll.replace(/s$/, '') };
          }
        } catch {
          // ignore and continue
        }
      }
    }
  }

  return { found: false };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone') || '';
    if (!phone) return NextResponse.json({ error: 'phone is required' }, { status: 400 });
    const result = await findByPhone(phone);
    if (!result.found) return NextResponse.json({ found: false }, { status: 404 });
    return NextResponse.json({ found: true, email: result.email, id: result.id, accountType: result.accountType });
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
    return NextResponse.json({ found: true, email: result.email, id: result.id, accountType: result.accountType });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}


