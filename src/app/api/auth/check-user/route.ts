import { adminDb } from '@/lib/firebase/admin';
import { NextRequest, NextResponse } from 'next/server';

const COLLECTIONS_TO_SEARCH = [
  'users',
  'players',
  'clubs',
  'academies',
  'agents',
  'employees',
  'trainers'
];

const PHONE_FIELDS = [
  'phone',
  'phoneNumber',
  'phone_number',
  'mobile',
  'mobileNumber',
  'mobile_number'
];

// دالة لتوليد جميع الصيغ الممكنة لرقم الهاتف
function generatePhoneVariants(phoneNumber: string): string[] {
  const variants: string[] = [];
  const cleaned = phoneNumber.replace(/\D/g, ''); // إزالة أي رموز

  variants.push(phoneNumber); // الرقم الأصلي
  variants.push(cleaned); // الرقم المنظف
  variants.push(`+${cleaned}`); // مع +

  // إذا كان مصري (يبدأ بـ 20 أو 2)
  if (cleaned.startsWith('20')) {
    variants.push(cleaned.substring(2)); // إزالة 20
    variants.push(`0${cleaned.substring(2)}`); // إضافة 0 بعد إزالة 20

    // حالة خاصة: إذا كان يبدأ بـ 200 (خطأ شائع)
    if (cleaned.startsWith('200') && cleaned.length > 11) {
      variants.push(cleaned.substring(3)); // إزالة 200
      variants.push(`20${cleaned.substring(3)}`); // تصحيح إلى 20
      variants.push(`0${cleaned.substring(3)}`); // إضافة 0
    }
  }

  // إذا كان يبدأ بـ 0 (رقم محلي)
  if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
    // محاولة إضافة كود مصر
    if (cleaned.length === 11) {
      variants.push(`20${cleaned.substring(1)}`); // إزالة 0 وإضافة 20
      variants.push(cleaned.substring(1)); // إزالة 0 فقط
    }
  }

  // إذا كان سعودي (يبدأ بـ 966)
  if (cleaned.startsWith('966')) {
    variants.push(`0${cleaned.substring(3)}`); // إضافة 0
    variants.push(cleaned.substring(3)); // إزالة 966
  }

  // إذا كان قطري (يبدأ بـ 974)
  if (cleaned.startsWith('974') && cleaned.length === 11) {
    variants.push(cleaned.substring(3)); // إزالة 974
  }

  // إزالة المكررات
  return [...new Set(variants)].filter(v => v.length >= 8); // الحد الأدنى 8 أرقام
}

// دالة البحث عن المستخدم بواسطة البريد الإلكتروني
async function findUserByEmail(email: string): Promise<{
  exists: boolean;
  userName?: string;
  accountType?: string;
  uid?: string;
}> {
  if (!email || !adminDb) return { exists: false };

  for (const collectionName of COLLECTIONS_TO_SEARCH) {
    try {
      const q = adminDb.collection(collectionName).where('email', '==', email).limit(1);
      const snapshot = await q.get();

      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data();
        return {
          exists: true,
          userName: userData.full_name || userData.name || userData.displayName || 'مستخدم',
          accountType: userData.accountType || collectionName.slice(0, -1),
          uid: snapshot.docs[0].id
        };
      }
    } catch (e) { }
  }

  // التحقق من Firebase Auth مباشرة
  try {
    const { adminAuth } = await import('@/lib/firebase/admin');
    if (adminAuth) {
      const userRecord = await adminAuth.getUserByEmail(email);
      if (userRecord) {
        return {
          exists: true,
          userName: userRecord.displayName || 'مستخدم مسجل',
          uid: userRecord.uid
        };
      }
    }
  } catch (e) { }

  return { exists: false };
}

// دالة البحث عن المستخدم بواسطة رقم الهاتف
async function findUserByPhone(phoneNumber: string): Promise<{
  exists: boolean;
  userName?: string;
  accountType?: string;
}> {
  if (!phoneNumber) {
    return { exists: false };
  }

  if (!adminDb) {
    console.error('❌ [check-user] Admin DB is not available');
    return { exists: false };
  }

  // توليد جميع الصيغ الممكنة للرقم
  const phoneVariants = generatePhoneVariants(phoneNumber);
  console.log(`🔍 [check-user] Searching for phone variants:`, phoneVariants);

  for (const collectionName of COLLECTIONS_TO_SEARCH) {
    for (const field of PHONE_FIELDS) {
      // البحث عن كل صيغة ممكنة
      for (const variant of phoneVariants) {
        try {
          const snapshot = await adminDb
            .collection(collectionName)
            .where(field, '==', variant)
            .limit(1)
            .get();

          if (!snapshot.empty) {
            const userDoc = snapshot.docs[0];
            const userData = userDoc.data();

            const userName = userData.full_name || userData.name || userData.displayName || 'مستخدم';
            const accountType = userData.accountType || collectionName.slice(0, -1); // Remove 's' from collection name

            console.log(`✅ [check-user] User found in ${collectionName} with variant "${variant}": ${userName}`);
            return {
              exists: true,
              userName,
              accountType
            };
          }
        } catch (error) {
          console.warn(`⚠️ [check-user] Could not search in ${collectionName} on field ${field}:`, error);
        }
      }
    }
  }

  console.log(`❌ [check-user] User not found for any phone variant`);
  return { exists: false };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, email } = body;

    console.log('🔍 [check-user] Checking user existence:', { phoneNumber, email });

    // التحقق من البيانات
    if (!phoneNumber && !email) {
      return NextResponse.json(
        { success: false, error: 'رقم الهاتف أو البريد الإلكتروني مطلوب', exists: false },
        { status: 400 }
      );
    }

    // البحث عن المستخدم
    let result = { exists: false } as any;

    if (email) {
      result = await findUserByEmail(email);
    } else if (phoneNumber) {
      result = await findUserByPhone(phoneNumber);
    }

    if (result.exists) {
      return NextResponse.json({
        success: true,
        exists: true,
        userName: result.userName,
        accountType: result.accountType,
        message: 'المستخدم موجود في النظام'
      });
    } else {
      return NextResponse.json({
        success: false,
        exists: false,
        message: 'المستخدم غير موجود في النظام'
      }, { status: 404 });
    }

  } catch (error: any) {
    console.error('❌ [check-user] Error:', error);
    return NextResponse.json(
      {
        success: false,
        exists: false,
        error: 'حدث خطأ أثناء التحقق من المستخدم'
      },
      { status: 500 }
    );
  }
}

// إضافة GET للاختبار
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Check user endpoint is working',
    timestamp: new Date().toISOString()
  });
}



