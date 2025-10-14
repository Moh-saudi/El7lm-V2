import { adminAuth, adminDb } from '@/lib/firebase/admin';
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
  uid: string | null;
  email: string | null;
  docId: string | null;
  collectionName: string | null;
}> {
  if (!phoneNumber) {
    return { uid: null, email: null, docId: null, collectionName: null };
  }

  if (!adminDb) {
    console.error('❌ [reset-password] Admin DB is not available');
    return { uid: null, email: null, docId: null, collectionName: null };
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

          const email = userData.email || userData.userEmail;
          const uid = userData.uid || userData.userId || userDoc.id;

          if (uid) {
            console.log(`✅ [reset-password] User found in ${collectionName} with uid: ${uid}`);
            return { uid, email, docId: userDoc.id, collectionName };
          }
        }
      } catch (error) {
        console.warn(`⚠️ [reset-password] Could not search in ${collectionName} on field ${field}:`, error);
      }
    }
  }

  console.log(`❌ [reset-password] User not found for phone number: ${phoneNumber}`);
  return { uid: null, email: null, docId: null, collectionName: null };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, newPassword } = body;

    console.log('🔐 [reset-password] Starting password reset process');
    console.log('📱 [reset-password] Phone number:', phoneNumber);

    // التحقق من البيانات
    if (!phoneNumber || !newPassword) {
      console.error('❌ [reset-password] Missing required fields');
      return NextResponse.json(
        { success: false, error: 'رقم الهاتف وكلمة المرور الجديدة مطلوبان' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      console.error('❌ [reset-password] Password too short');
      return NextResponse.json(
        { success: false, error: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل' },
        { status: 400 }
      );
    }

    // البحث عن المستخدم
    console.log('🔍 [reset-password] Searching for user...');
    const { uid, docId, collectionName } = await findUserByPhone(phoneNumber);

    if (!uid) {
      console.error('❌ [reset-password] User not found');
      return NextResponse.json(
        { success: false, error: 'المستخدم غير موجود لرقم الهاتف المقدم' },
        { status: 404 }
      );
    }

    console.log('✅ [reset-password] User found - UID:', uid, 'Collection:', collectionName);

    // التحقق من توفر Firebase Admin Auth
    if (!adminAuth) {
      console.error('❌ [reset-password] Firebase Admin Auth is not available');
      return NextResponse.json(
        { success: false, error: 'خدمة المصادقة غير متاحة' },
        { status: 500 }
      );
    }

    // تحديث كلمة المرور في Firebase Authentication
    console.log('🔄 [reset-password] Updating password in Firebase Auth...');
    await adminAuth.updateUser(uid, {
      password: newPassword,
    });

    console.log('✅ [reset-password] Password updated successfully in Firebase Auth');

    // تحديث Firestore
    if (docId && collectionName && adminDb) {
      try {
        await adminDb.collection(collectionName).doc(docId).update({
          passwordLastUpdated: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        console.log('✅ [reset-password] Firestore document updated');
      } catch (error) {
        console.warn('⚠️ [reset-password] Failed to update Firestore:', error);
        // لا نفشل العملية إذا فشل تحديث Firestore
      }
    }

    return NextResponse.json({
      success: true,
      message: 'تم تحديث كلمة المرور بنجاح'
    });

  } catch (error: any) {
    console.error('❌ [reset-password] Fatal error:', error);
    console.error('❌ [reset-password] Error details:', error.message, error.code);

    let errorMessage = 'حدث خطأ أثناء إعادة تعيين كلمة المرور';

    if (error.code === 'auth/user-not-found') {
      errorMessage = 'المستخدم غير موجود في نظام المصادقة';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// إضافة GET للاختبار
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Reset password endpoint is working',
    timestamp: new Date().toISOString()
  });
}
