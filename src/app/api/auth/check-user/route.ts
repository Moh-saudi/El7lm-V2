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

  for (const collectionName of COLLECTIONS_TO_SEARCH) {
    for (const field of PHONE_FIELDS) {
      try {
        const snapshot = await adminDb
          .collection(collectionName)
          .where(field, '==', phoneNumber)
          .limit(1)
          .get();

        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          const userData = userDoc.data();

          const userName = userData.full_name || userData.name || userData.displayName || 'مستخدم';
          const accountType = userData.accountType || collectionName.slice(0, -1); // Remove 's' from collection name

          console.log(`✅ [check-user] User found in ${collectionName}: ${userName}`);
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

  console.log(`❌ [check-user] User not found for phone number: ${phoneNumber}`);
  return { exists: false };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber } = body;

    console.log('🔍 [check-user] Checking user existence for phone:', phoneNumber);

    // التحقق من البيانات
    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'رقم الهاتف مطلوب', exists: false },
        { status: 400 }
      );
    }

    // البحث عن المستخدم
    const result = await findUserByPhone(phoneNumber);

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



