import { adminAuth } from '@/lib/firebase/admin-config';
import { db } from '@/lib/firebase/config';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
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

  for (const collectionName of COLLECTIONS_TO_SEARCH) {
    for (const field of PHONE_FIELDS) {
      try {
        const q = query(collection(db, collectionName), where(field, '==', phoneNumber));
        const snapshot = await getDocs(q);

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

    if (!phoneNumber || !newPassword) {
      return NextResponse.json({ success: false, error: 'Phone number and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    // 1. البحث عن المستخدم باستخدام رقم الهاتف
    const { uid, docId, collectionName } = await findUserByPhone(phoneNumber);

    if (!uid) {
      return NextResponse.json({ success: false, error: 'User not found for the provided phone number' }, { status: 404 });
    }

    // 2. تحديث كلمة المرور في Firebase Authentication
    await adminAuth.updateUser(uid, {
      password: newPassword,
    });

    console.log(`✅ Password updated for UID: ${uid}`);

    // 3. (اختياري) تحديث حقل في Firestore للإشارة إلى تغيير كلمة المرور
    if (docId && collectionName) {
      const userDocRef = doc(db, collectionName, docId);
      await updateDoc(userDocRef, {
        passwordLastUpdated: new Date().toISOString(),
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
