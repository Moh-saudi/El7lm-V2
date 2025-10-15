import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, uid, displayName } = body;

    if (!email || !password || !uid) {
      return NextResponse.json(
        { success: false, error: 'البيانات المطلوبة ناقصة' },
        { status: 400 }
      );
    }

    if (!adminAuth || !adminDb) {
      return NextResponse.json(
        { success: false, error: 'الخدمة غير متاحة' },
        { status: 500 }
      );
    }

    try {
      const existingUser = await adminAuth.getUser(uid);
      return NextResponse.json({
        success: true,
        message: 'المستخدم موجود',
        uid: existingUser.uid,
        alreadyExists: true
      });
    } catch (error: any) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    const userRecord = await adminAuth.createUser({
      uid: uid,
      email: email,
      password: password,
      displayName: displayName || undefined,
      emailVerified: false,
      disabled: false
    });

    try {
      const userDoc = await adminDb.collection('users').doc(uid).get();
      if (userDoc.exists) {
        await adminDb.collection('users').doc(uid).update({
          syncedToAuth: true,
          authSyncDate: new Date().toISOString()
        });
      }
    } catch (firestoreError) {
      console.warn('Failed to update Firestore:', firestoreError);
    }

    return NextResponse.json({
      success: true,
      message: 'تم إنشاء الحساب',
      uid: userRecord.uid,
      alreadyExists: false
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'خطأ' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ success: true, message: 'Sync endpoint working' });
}
