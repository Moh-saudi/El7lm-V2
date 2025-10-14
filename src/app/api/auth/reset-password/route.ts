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

// دالة موحدة للبحث عن المستخدم عبر مجموعات متعددة
async function findUserByPhone(phoneNumber: string): Promise<{
  uid: string | null;
  email: string | null;
  docId: string | null;
  collectionName: string | null;
}> {
  if (!phoneNumber) return { uid: null, email: null, docId: null, collectionName: null };

  if (!adminDb) {
    console.error('❌ Admin DB is not available');
    return { uid: null, email: null, docId: null, collectionName: null };
  }

  for (const collectionName of COLLECTIONS_TO_SEARCH) {
    for (const field of PHONE_FIELDS) {
      try {
        const snapshot = await adminDb.collection(collectionName).where(field, '==', phoneNumber).get();

        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          const userData = userDoc.data();

          // العثور على البريد الإلكتروني أو UID
          const email = userData.email || userData.userEmail;
          const uid = userData.uid || userData.userId || userDoc.id;

          if (uid) {
            console.log(`✅ User found in ${collectionName} with uid: ${uid}`);
            return { uid, email, docId: userDoc.id, collectionName };
          }
        }
      } catch (error) {
        console.warn(`⚠️ Could not search in ${collectionName} on field ${field}:`, error);
      }
    }
  }

  console.log(`❌ User not found for phone number: ${phoneNumber}`);
  return { uid: null, email: null, docId: null, collectionName: null };
}


export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, newPassword } = await request.json();

    console.log('🔐 [reset-password] Starting password reset process for:', phoneNumber);

    if (!phoneNumber || !newPassword) {
      console.error('❌ [reset-password] Missing phoneNumber or newPassword');
      return NextResponse.json({ success: false, error: 'رقم الهاتف وكلمة المرور الجديدة مطلوبان' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      console.error('❌ [reset-password] Password too short');
      return NextResponse.json({ success: false, error: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل' }, { status: 400 });
    }

    // 1. البحث عن المستخدم باستخدام رقم الهاتف
    console.log('🔍 [reset-password] Searching for user with phone:', phoneNumber);
    const { uid, docId, collectionName } = await findUserByPhone(phoneNumber);

    if (!uid) {
      console.error('❌ [reset-password] User not found');
      return NextResponse.json({ success: false, error: 'المستخدم غير موجود لرقم الهاتف المقدم' }, { status: 404 });
    }

    console.log('✅ [reset-password] User found. UID:', uid, 'Collection:', collectionName);

    if (!adminAuth) {
      console.error('❌ [reset-password] Firebase Admin Auth is not available');
      throw new Error('Firebase Admin Auth is not available.');
    }

    // 2. تحديث كلمة المرور في Firebase Authentication
    console.log('🔄 [reset-password] Updating password in Firebase Auth for UID:', uid);
    await adminAuth.updateUser(uid, {
      password: newPassword,
    });

    console.log(`✅ [reset-password] Password updated successfully for UID: ${uid}`);

    // 3. (اختياري) تحديث حقل في Firestore للإشارة إلى تغيير كلمة المرور
    if (docId && collectionName && adminDb) {
      await adminDb.collection(collectionName).doc(docId).update({
        passwordLastUpdated: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.log(`✅ Firestore document updated for user: ${docId} in ${collectionName}`);
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully' });

  } catch (error: any) {
    console.error('❌ Error resetting password:', error);

    let errorMessage = 'An internal server error occurred.';
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'User not found in Firebase Authentication.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
