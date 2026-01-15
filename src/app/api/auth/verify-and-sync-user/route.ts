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

/**
 * التحقق من وجود المستخدم في Firebase Auth ومزامنته إذا لزم الأمر
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, email } = body;

    console.log('🔍 [verify-and-sync] Checking user existence...');

    if (!adminAuth || !adminDb) {
      return NextResponse.json(
        { success: false, error: 'خدمة المصادقة غير متاحة', needsSync: false },
        { status: 500 }
      );
    }

    // البحث عن المستخدم في Firestore
    let firestoreUser: any = null;
    let firestoreUid: string | null = null;

    if (email) {
      for (const coll of COLLECTIONS_TO_SEARCH) {
        try {
          const snapshot = await adminDb
            .collection(coll)
            .where('email', '==', email)
            .limit(1)
            .get();

          if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            firestoreUser = doc.data();
            firestoreUid = firestoreUser.uid || doc.id;
            break;
          }
        } catch (error) {
          console.warn(`Could not search in ${coll}:`, error);
        }
      }
    }

    if (!firestoreUid) {
      // ⬅️ المستخدم غير موجود في Firestore - هذا يعني أن الحساب غير موجود أو البريد/الهاتف غير صحيح
      return NextResponse.json(
        {
          success: false,
          error: 'المستخدم غير موجود في قاعدة البيانات',
          needsSync: false,
          existsInAuth: false,
          existsInFirestore: false
        },
        { status: 200 } // ⬅️ نعيد 200 لأن هذا ليس خطأ في الـ API، بل المستخدم غير موجود
      );
    }

    // التحقق من Firebase Auth
    try {
      const authUser = await adminAuth.getUser(firestoreUid);
      const providers = authUser.providerData.map(p => p.providerId);
      const hasPassword = providers.includes('password');
      const hasGoogle = providers.includes('google.com');

      return NextResponse.json({
        success: true,
        existsInAuth: true,
        existsInFirestore: true,
        needsSync: false,
        uid: authUser.uid,
        providers,
        hasPassword,
        hasGoogle,
        message: 'المستخدم موجود'
      });
    } catch (authError: any) {
      if (authError.code === 'auth/user-not-found') {
        return NextResponse.json({
          success: false,
          existsInAuth: false,
          existsInFirestore: true,
          needsSync: true,
          firestoreUid,
          error: 'الحساب يحتاج لتفعيل'
        }, { status: 200 }); // ⬅️ نعيد 200 بدلاً من 404 لأن المستخدم موجود في Firestore
      }
      throw authError;
    }
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'خطأ', needsSync: false },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ success: true, message: 'Verify endpoint working' });
}
