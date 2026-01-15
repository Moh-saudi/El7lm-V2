import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

// OPTIMIZED: Essential collections for phone check (including users for legacy accounts)
const PRIORITY_COLLECTIONS = ['players', 'clubs', 'academies', 'users'];
const PRIMARY_PHONE_FIELD = 'phone';

const normalize = (raw: string): string[] => {
  const digits = (raw || '').toString().replace(/\D/g, '');
  if (!digits) return [];
  const c = new Set<string>();

  // Add base formats
  c.add(digits);
  c.add(`+${digits}`);

  // Add with country code 20 (Egypt) - covers cases like +201017799580
  if (digits.length === 10) {
    c.add(`20${digits}`);
    c.add(`+20${digits}`);
  }

  // Add different length variations
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
  if (digits.length > 12) {
    c.add(digits.slice(-12));
    c.add(`+${digits.slice(-12)}`);
  }

  // Add with leading zero
  if (digits.length >= 9) c.add('0' + digits.slice(-9));
  if (digits.length >= 10) c.add('0' + digits.slice(-10));
  if (digits.length >= 11) c.add('0' + digits.slice(-11));

  const result = Array.from(c);
  console.log(`[normalize] Generated ${result.length} candidates from ${raw}:`, result.slice(0, 10));
  return result;
};

function isAccountDeleted(data: any): boolean {
  const isDeletedValue = data.isDeleted;
  const isActiveValue = data.isActive;

  if (isActiveValue === true) {
    if (isDeletedValue === true || isDeletedValue === 'true' || isDeletedValue === 1 || isDeletedValue === '1') {
      return true;
    }
    return false;
  }

  if (isDeletedValue === true || isDeletedValue === 'true' || isDeletedValue === 1 || isDeletedValue === '1' ||
    (isDeletedValue && String(isDeletedValue).toLowerCase() === 'true')) {
    return true;
  }

  if (isActiveValue === false) {
    return true;
  }

  if (isDeletedValue === undefined && isActiveValue === undefined) {
    if (data.deletedAt || data.deletedBy) {
      return true;
    }
    return true;
  }

  return true;
}

async function existsByPhone(phoneRaw: string, countryCode?: string): Promise<{ phoneExists: boolean; email?: string }> {
  const overallStart = Date.now();
  console.log(`[check-user-exists] 🚀 FAST phone check for: ${phoneRaw}, countryCode: ${countryCode}`);

  const candidates = normalize(phoneRaw);
  console.log(`[check-user-exists] 🔍 Searching ${PRIORITY_COLLECTIONS.length} collections, ${candidates.length} variants`);

  if (candidates.length === 0) {
    console.log(`[check-user-exists] ✅ No valid candidates (Total: ${Date.now() - overallStart}ms)`);
    return { phoneExists: false };
  }

  for (const coll of PRIORITY_COLLECTIONS) {
    const collStart = Date.now();

    try {
      console.log(`[check-user-exists] 🔍 Searching in ${coll} with candidates:`, candidates.slice(0, 5));
      const qIn = query(collection(db, coll), where(PRIMARY_PHONE_FIELD as any, 'in', candidates.slice(0, 10)));
      const snapIn = await getDocs(qIn);

      console.log(`[check-user-exists] 📊 Found ${snapIn.size} documents in ${coll}`);

      if (!snapIn.empty) {
        for (const docSnap of snapIn.docs) {
          const data: any = docSnap.data();
          console.log(`[check-user-exists] 📄 Document in ${coll}:`, { id: docSnap.id, phone: data.phone, isDeleted: data.isDeleted, isActive: data.isActive });

          const deleted = isAccountDeleted(data);

          if (deleted) {
            console.log(`[check-user-exists] ✅ SKIP deleted in ${coll}: ${docSnap.id}`);
            continue;
          }

          // Check all possible email fields
          const email = data.email || data.userEmail || data.user_email || data.mail || undefined;
          console.log(`[check-user-exists] 📧 Email fields check:`, {
            email: data.email,
            userEmail: data.userEmail,
            user_email: data.user_email,
            mail: data.mail,
            finalEmail: email
          });
          console.log(`[check-user-exists] ⚠️ FOUND ACTIVE in ${coll} (${Date.now() - collStart}ms): ${docSnap.id} (Total: ${Date.now() - overallStart}ms)`);
          return { phoneExists: true, email };
        }
      }
    } catch (error) {
      console.error(`[check-user-exists] Error in ${coll}:`, error);
    }

    console.log(`[check-user-exists] ⏱️ ${coll} done in ${Date.now() - collStart}ms`);
  }

  console.log(`[check-user-exists] ✅ Phone available (Total: ${Date.now() - overallStart}ms)`);
  return { phoneExists: false };
}

export async function POST(req: NextRequest) {
  const requestStart = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const phone = (body?.phone || '').toString();
    const countryCode = body?.countryCode?.toString();
    console.log(`[check-user-exists] 📥 POST for: ${phone}, country: ${countryCode}`);
    if (!phone) return NextResponse.json({ error: 'phone is required' }, { status: 400 });
    const result = await existsByPhone(phone, countryCode);
    console.log(`[check-user-exists] 📤 Response:`, result, `(Total: ${Date.now() - requestStart}ms)`);
    return NextResponse.json(result);
  } catch (e: any) {
    console.error(`[check-user-exists] ❌ Error (${Date.now() - requestStart}ms):`, e);
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const requestStart = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const phone = (searchParams.get('phone') || '').toString();
    if (!phone) return NextResponse.json({ error: 'phone is required' }, { status: 400 });
    const result = await existsByPhone(phone);
    console.log(`[check-user-exists] 📤 GET response (${Date.now() - requestStart}ms):`, result);
    return NextResponse.json(result);
  } catch (e: any) {
    console.error(`[check-user-exists] ❌ GET error (${Date.now() - requestStart}ms):`, e);
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
