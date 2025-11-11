import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where, getDoc, doc } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { generateTypedFirebaseEmail } from '@/lib/utils/firebase-email-generator';

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
const ACCOUNT_TYPES = ['player', 'club', 'academy', 'agent', 'trainer', 'marketer'];
const COUNTRY_CODES = ['974', '966', '971', '965', '973', '968', '20', '212', '213', '216', '218', '249', '967'];

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

// Helper function to check if account is deleted
function isAccountDeleted(data: any): boolean {
  const isDeletedValue = data.isDeleted;
  const isActiveValue = data.isActive;
  
  // STRICT RULE: Account is considered ACTIVE only if:
  // - isActive === true (explicitly true)
  // - AND isDeleted !== true (not explicitly deleted)
  
  // If isActive is explicitly true, account is active (unless explicitly deleted)
  if (isActiveValue === true) {
    // But check if it's explicitly deleted
    if (isDeletedValue === true || 
        isDeletedValue === 'true' || 
        isDeletedValue === 1 || 
        isDeletedValue === '1') {
      return true; // Deleted despite being active (shouldn't happen, but handle it)
    }
    return false; // Active account
  }
  
  // If isDeleted is explicitly true, account is deleted
  if (isDeletedValue === true || 
      isDeletedValue === 'true' || 
      isDeletedValue === 1 || 
      isDeletedValue === '1' ||
      (isDeletedValue && String(isDeletedValue).toLowerCase() === 'true')) {
    return true;
  }
  
  // If isActive is explicitly false, account is inactive/deleted
  if (isActiveValue === false) {
    return true;
  }
  
  // CRITICAL: If both are undefined, check for deletion metadata
  // If account has deletedAt or deletedBy, it's deleted
  if (isDeletedValue === undefined && isActiveValue === undefined) {
    if (data.deletedAt || data.deletedBy) {
      return true; // Has deletion metadata
    }
    // Old accounts without flags: Consider them inactive/deleted
    // Only truly active accounts will have isActive === true
    return true; // Default to deleted if no active flag
  }
  
  // Default: if we can't determine, consider it deleted for safety
  return true;
}

/**
 * التحقق من حالة الحساب في Firestore (هل هو محذوف أم لا)
 */
async function checkFirestoreAccountStatus(uid: string): Promise<{ isDeleted: boolean; collection?: string }> {
  if (!adminDb) {
    console.log('[check-user-exists] Admin DB not available, cannot check Firestore status');
    return { isDeleted: false };
  }

  // التحقق من جميع المجموعات الممكنة
  for (const coll of COLLECTIONS) {
    try {
      const docRef = adminDb.collection(coll).doc(uid);
      const docSnap = await docRef.get();
      
      if (docSnap.exists) {
        const data = docSnap.data();
        const deleted = isAccountDeleted(data || {});
        
        console.log(`[check-user-exists] Found account in ${coll}:`, {
          uid,
          isDeleted: deleted,
          isActive: data?.isActive,
          hasDeletedAt: !!data?.deletedAt
        });
        
        return { isDeleted: deleted, collection: coll };
      }
    } catch (error) {
      // استمر في البحث في المجموعات الأخرى
      continue;
    }
  }

  // إذا لم نجد الحساب في أي مجموعة، نعتبره غير موجود (يمكن التسجيل)
  console.log(`[check-user-exists] Account ${uid} not found in Firestore - allowing registration`);
  return { isDeleted: true }; // نعتبره محذوفاً للسماح بالتسجيل
}

/**
 * استخراج countryCode من الرقم إذا لم يكن موجوداً
 */
function extractCountryCode(phone: string): string | null {
  for (const code of COUNTRY_CODES) {
    if (phone.startsWith(code)) {
      return code;
    }
  }
  return null;
}

/**
 * توليد جميع الإيميلات الممكنة للرقم
 * يدعم صيغتين: الرقم الكامل والرقم بدون countryCode
 */
function generatePossibleEmails(phone: string, countryCode: string): string[] {
  const phoneVariants = new Set<string>();
  
  // الصيغة 1: الرقم كما هو
  phoneVariants.add(phone);
  
  // الصيغة 2: الرقم بدون countryCode (إذا كان موجوداً في البداية)
  if (phone.startsWith(countryCode) && phone.length > countryCode.length) {
    phoneVariants.add(phone.substring(countryCode.length));
  }
  
  // توليد الإيميلات لكل نوع حساب ولكل صيغة رقم
  const emails: string[] = [];
  phoneVariants.forEach(phoneVariant => {
    ACCOUNT_TYPES.forEach(type => {
      emails.push(generateTypedFirebaseEmail(phoneVariant, countryCode, type));
    });
  });
  
  return [...new Set(emails)]; // إزالة التكرارات
}

/**
 * التحقق من وجود الحساب في Firebase Authentication
 * نتحقق من جميع أنواع الحسابات الممكنة (player, club, academy, etc.)
 * وإذا وجد الحساب في Auth، نتحقق من حالته في Firestore
 */
async function checkAuthByPhone(phoneRaw: string, countryCode?: string): Promise<{ exists: boolean; email?: string; uid?: string }> {
  if (!adminAuth) {
    console.log('[check-user-exists] ⚠️ Admin Auth not available, skipping Auth check');
    return { exists: false };
  }
  
  console.log(`[check-user-exists] 🔍 Starting Auth check for phone: ${phoneRaw}, countryCode: ${countryCode}`);

  // تنظيف البيانات
  const cleanPhone = phoneRaw.replace(/[^0-9]/g, '');
  let cleanCountryCode = countryCode?.replace(/[^0-9]/g, '') || '';

  // استخراج countryCode إذا لم يكن موجوداً
  if (!cleanCountryCode) {
    cleanCountryCode = extractCountryCode(cleanPhone) || '';
  }

  if (!cleanCountryCode) {
    console.log('[check-user-exists] Cannot check Auth - missing country code');
    return { exists: false };
  }

  // توليد جميع الإيميلات الممكنة
  const possibleEmails = generatePossibleEmails(cleanPhone, cleanCountryCode);

  console.log(`[check-user-exists] Checking Auth for ${possibleEmails.length} possible emails:`, {
    cleanPhone,
    cleanCountryCode,
    possibleEmails
  });

  // التحقق من كل إيميل في Firebase Authentication
  for (const email of possibleEmails) {
    try {
      const userRecord = await adminAuth.getUserByEmail(email);
      console.log(`[check-user-exists] ⚠️ FOUND in Firebase Auth: ${email} (UID: ${userRecord.uid})`);
      
      // التحقق من حالة الحساب في Firestore
      const firestoreStatus = await checkFirestoreAccountStatus(userRecord.uid);
      
      if (firestoreStatus.isDeleted) {
        console.log(`[check-user-exists] ✅ Account ${userRecord.uid} is deleted in Firestore - allowing re-registration`);
        return { exists: false };
      } else {
        console.log(`[check-user-exists] ⚠️ Account ${userRecord.uid} is active in Firestore - preventing registration`);
        return { exists: true, email, uid: userRecord.uid };
      }
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        continue; // جرب الإيميل التالي
      } else {
        console.warn(`[check-user-exists] Error checking Auth for ${email}:`, error.message);
      }
    }
  }

  return { exists: false };
}

async function existsByPhone(phoneRaw: string, countryCode?: string): Promise<{ phoneExists: boolean; email?: string }> {
  // أولاً: التحقق من Firebase Authentication وحالة الحساب في Firestore
  const authCheck = await checkAuthByPhone(phoneRaw, countryCode);
  if (authCheck.exists) {
    console.log(`[check-user-exists] ⚠️ Phone exists in Firebase Auth and is active: ${phoneRaw}`);
    return { phoneExists: true, email: authCheck.email };
  }
  
  // إذا كان الحساب موجوداً في Auth لكن محذوف من Firestore، authCheck.exists سيكون false
  // وهذا يعني أنه يمكن التسجيل من جديد

  // ثانياً: التحقق من Firestore (للحسابات النشطة)
  const candidates = normalize(phoneRaw);
  console.log(`[check-user-exists] Checking phone: ${phoneRaw}, candidates:`, candidates);
  if (candidates.length === 0) return { phoneExists: false };

  for (const coll of COLLECTIONS) {
    // Try 'in' on possible phone fields
    for (const pf of PHONE_FIELDS) {
      try {
        const qIn = query(collection(db, coll), where(pf as any, 'in', candidates.slice(0, 10)));
        const snapIn = await getDocs(qIn);
        if (!snapIn.empty) {
          // Check all documents to find one that is not deleted
          for (const docSnap of snapIn.docs) {
            const data: any = docSnap.data();
            
            // Check if account is deleted
            const deleted = isAccountDeleted(data);
            
            // Log detailed information
            console.log(`[check-user-exists] Document in ${coll}:`, {
              userId: docSnap.id,
              email: data.email,
              isDeleted_raw: data.isDeleted,
              isDeleted_type: typeof data.isDeleted,
              isActive_raw: data.isActive,
              isActive_type: typeof data.isActive,
              has_deletedAt: !!data.deletedAt,
              has_deletedBy: !!data.deletedBy,
              computed_isDeleted: deleted,
              will_skip: deleted
            });
            
            if (deleted) {
              console.log(`[check-user-exists] ✅ SKIPPING deleted account in ${coll}: ${docSnap.id}`);
              continue; // Skip deleted accounts - allow re-registration
            }
            
            // Found an active, non-deleted account
            const email = data.email || data.userEmail || undefined;
            console.log(`[check-user-exists] ⚠️ FOUND ACTIVE ACCOUNT in ${coll}:`, {
              userId: docSnap.id,
              email,
              returning: 'phoneExists: true'
            });
            return { phoneExists: true, email };
          }
          // If all accounts found are deleted, continue searching in other collections
        }
      } catch (error) {
        // Log error for debugging but don't fail
        console.error(`[check-user-exists] Error checking ${coll}.${pf}:`, error);
      }
    }

    // Equality fallback
    for (const pf of PHONE_FIELDS) {
      for (const cand of candidates) {
        try {
          const qEq = query(collection(db, coll), where(pf as any, '==', cand));
          const snapEq = await getDocs(qEq);
          if (!snapEq.empty) {
            // Check all documents to find one that is not deleted
            for (const docSnap of snapEq.docs) {
              const data: any = docSnap.data();
              
              // Check if account is deleted
              const deleted = isAccountDeleted(data);
              
              console.log(`[check-user-exists] Found document in ${coll} (equality):`, {
                userId: docSnap.id,
                phone: cand,
                email: data.email,
                isDeleted: data.isDeleted,
                isActive: data.isActive,
                computed_deleted: deleted
              });
              
              if (deleted) {
                console.log(`[check-user-exists] ✅ Skipping deleted account in ${coll}: ${docSnap.id}`);
                continue; // Skip deleted accounts - allow re-registration
              }
              
              // Found an active, non-deleted account
              const email = data.email || data.userEmail || undefined;
              console.log(`[check-user-exists] ⚠️ Found ACTIVE account in ${coll}:`, {
                userId: docSnap.id,
                email,
                returning: true
              });
              return { phoneExists: true, email };
            }
            // If all accounts found are deleted, continue searching
          }
        } catch (error) {
          // Log error for debugging but don't fail
          console.error(`[check-user-exists] Error checking ${coll}.${pf} with ${cand}:`, error);
        }
      }
    }
  }

  console.log(`[check-user-exists] No active account found for phone: ${phoneRaw}`);
  return { phoneExists: false };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const phone = (body?.phone || '').toString();
    const countryCode = body?.countryCode?.toString();
    console.log(`[check-user-exists] POST request received for phone: ${phone}, countryCode: ${countryCode}`);
    if (!phone) return NextResponse.json({ error: 'phone is required' }, { status: 400 });
    const result = await existsByPhone(phone, countryCode);
    console.log(`[check-user-exists] Result for ${phone}:`, result);
    return NextResponse.json(result);
  } catch (e: any) {
    console.error(`[check-user-exists] Error in POST:`, e);
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
