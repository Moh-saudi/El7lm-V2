/**
 * Create a new user account using a verified phone number (WhatsApp OTP flow)
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cleanPhoneNumber } from '@/lib/validation/phone-validation';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, accountType, name = '' } = await request.json();

    if (!phoneNumber || !accountType) {
      return NextResponse.json({ success: false, error: 'البيانات مطلوبة' }, { status: 400 });
    }

    if (!adminAuth || !adminDb) {
      return NextResponse.json({ success: false, error: 'الخدمة غير متاحة' }, { status: 503 });
    }

    // Security: ensure OTP was recently verified for this phone
    const cleanDigits = cleanPhoneNumber(phoneNumber);
    const docId = `otp_${cleanDigits}`;
    const otpDoc = await (adminDb as any).collection('otp_verifications').doc(docId).get();

    if (!otpDoc.exists || !otpDoc.data()?.verified) {
      return NextResponse.json({ success: false, error: 'يجب التحقق من رقم الهاتف أولاً' }, { status: 403 });
    }

    // Check verification is recent (within 15 minutes)
    const verifiedAt = otpDoc.data()?.verifiedAt;
    if (verifiedAt) {
      const verifiedMs = verifiedAt.toMillis
        ? verifiedAt.toMillis()
        : verifiedAt instanceof Date
        ? verifiedAt.getTime()
        : 0;
      if (Date.now() - verifiedMs > 15 * 60 * 1000) {
        return NextResponse.json({ success: false, error: 'انتهت صلاحية التحقق، يرجى إعادة إرسال الرمز' }, { status: 403 });
      }
    }

    // Build Firebase Auth email from phone digits
    const email = `${cleanDigits}@el7lm.com`;
    // const password = `${cleanDigits}_${Math.random().toString(36).slice(2, 10)}`; // Security: better random password
    const password = `${cleanDigits}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // Normalize phone to E.164
    const e164Phone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

    // Create Firebase Auth user
    let userRecord;
    try {
      userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: name,
        phoneNumber: e164Phone,
      });
    } catch (err: any) {
      if (err.code === 'auth/email-already-exists' || err.code === 'auth/phone-number-already-exists') {
        return NextResponse.json({ success: false, error: 'رقم الهاتف مسجل بالفعل، يرجى تسجيل الدخول' }, { status: 409 });
      }
      throw err;
    }

    const uid = userRecord.uid;
    const now = new Date();

    const collectionMap: Record<string, string> = {
      player: 'players',
      club: 'clubs',
      agent: 'agents',
      academy: 'academies',
      trainer: 'trainers',
      marketer: 'marketers',
    };
    const collectionName = collectionMap[accountType] || 'users';

    const userDoc = {
      uid,
      full_name: name,
      phone: e164Phone,
      email,
      accountType,
      createdAt: now,
      isVerifiedLocal: true,
      status: 'active',
    };

    // Write to role collection + users collection
    await (adminDb as any).collection(collectionName).doc(uid).set(userDoc);
    if (collectionName !== 'users') {
      await (adminDb as any).collection('users').doc(uid).set(userDoc);
    }

    // Clean up OTP record
    await (adminDb as any).collection('otp_verifications').doc(docId).delete();

    // Return custom token
    const customToken = await adminAuth.createCustomToken(uid, { accountType, phone: e164Phone });

    console.log(`✅ [create-user-with-phone] Created user ${uid} as ${accountType}`);

    return NextResponse.json({ success: true, customToken, uid, accountType, userName: name });

  } catch (error: any) {
    console.error('❌ [create-user-with-phone]', error);
    return NextResponse.json({ success: false, error: error.message || 'فشل إنشاء الحساب' }, { status: 500 });
  }
}
