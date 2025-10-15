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

    // التحقق من أن كلمة المرور أرقام فقط
    const isNumbersOnly = /^\d+$/.test(newPassword);
    if (!isNumbersOnly) {
      console.error('❌ [reset-password] Password must be numbers only');
      return NextResponse.json(
        { success: false, error: 'يجب أن تحتوي كلمة المرور على أرقام فقط' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      console.error('❌ [reset-password] Password too short');
      return NextResponse.json(
        { success: false, error: 'يجب أن تتكون كلمة المرور من 8 أرقام على الأقل' },
        { status: 400 }
      );
    }

    // منع الأرقام المتسلسلة والمتكررة
    const weakPatterns = [
      /^(\d)\1+$/,
      /^(0123456789|9876543210)/,
      /^12345678$/, /^87654321$/,
      /^123456/, /^654321/,
      /^111111/, /^000000/, /^666666/, /^888888/
    ];

    if (weakPatterns.some(pattern => pattern.test(newPassword))) {
      console.error('❌ [reset-password] Weak password pattern detected');
      return NextResponse.json(
        { success: false, error: 'كلمة المرور ضعيفة جداً. تجنب الأرقام المتسلسلة أو المتكررة' },
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

    // التحقق من وجود المستخدم في Firebase Auth
    let userExistsInAuth = false;
    try {
      await adminAuth.getUser(uid);
      userExistsInAuth = true;
      console.log('✅ [reset-password] User exists in Firebase Auth');
    } catch (authError: any) {
      if (authError.code === 'auth/user-not-found') {
        console.log('⚠️ [reset-password] User not found in Firebase Auth, will create...');
        userExistsInAuth = false;
      } else {
        throw authError;
      }
    }

    if (!userExistsInAuth) {
      // إنشاء المستخدم في Firebase Auth
      console.log('🔧 [reset-password] Creating user in Firebase Auth...');
      
      // الحصول على بيانات المستخدم من Firestore
      let userData: any = {};
      if (docId && collectionName && adminDb) {
        const userDoc = await adminDb.collection(collectionName).doc(docId).get();
        userData = userDoc.data() || {};
      }

      try {
        await adminAuth.createUser({
          uid: uid,
          email: userData.email || userData.userEmail,
          password: newPassword,
          displayName: userData.full_name || userData.name,
          emailVerified: false,
          disabled: false
        });
        console.log('✅ [reset-password] User created successfully in Firebase Auth');
      } catch (createError: any) {
        console.error('❌ [reset-password] Error creating user in Auth:', createError);
        return NextResponse.json(
          { success: false, error: 'فشل إنشاء الحساب في نظام المصادقة' },
          { status: 500 }
        );
      }
    } else {
      // تحديث كلمة المرور في Firebase Authentication
      console.log('🔄 [reset-password] Updating password in Firebase Auth...');
      await adminAuth.updateUser(uid, {
        password: newPassword,
      });
      console.log('✅ [reset-password] Password updated successfully in Firebase Auth');
    }

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
