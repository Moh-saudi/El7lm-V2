/**
 * Verify OTP and route: existing user → custom token, new user → isNew: true
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyOTPInFirestore } from '@/lib/otp/firestore-otp-manager';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cleanPhoneNumber } from '@/lib/validation/phone-validation';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, otp } = await request.json();

    if (!phoneNumber || !otp) {
      return NextResponse.json({ success: false, error: 'البيانات مطلوبة' }, { status: 400 });
    }

    // 1. Verify OTP
    const otpResult = await verifyOTPInFirestore(phoneNumber, otp);
    if (!otpResult.success) {
      return NextResponse.json({
        success: false,
        error: otpResult.error || 'رمز التحقق غير صحيح',
        attemptsRemaining: otpResult.attemptsRemaining,
      }, { status: 400 });
    }

    if (!adminAuth || !adminDb) {
      return NextResponse.json({ success: false, error: 'خدمة المصادقة غير متاحة' }, { status: 503 });
    }

    // 2. Check if user already exists in any collection
    // 'users' is last (fallback) so role-specific collections take priority
    const collections = ['players', 'clubs', 'academies', 'trainers', 'agents', 'marketers', 'admins', 'users'];
    const cleaned = cleanPhoneNumber(phoneNumber);
    const phoneVariants = [
      phoneNumber,
      cleaned,
      `+${cleaned}`,
    ];

    let uid: string | null = null;
    let accountType = '';
    let userName = '';

    for (const col of collections) {
      for (const variant of phoneVariants) {
        const snap = await (adminDb as any)
          .collection(col)
          .where('phone', '==', variant)
          .limit(1)
          .get();
        if (!snap.empty) {
          const doc = snap.docs[0];
          uid = doc.id;
          const data = doc.data();
          userName = data.full_name || data.name || '';
          accountType = col === 'admins' ? 'admin' : (data.accountType || (col !== 'users' ? col.replace(/s$/, '') : 'player'));
          break;
        }
      }
      if (uid) break;
    }

    if (uid) {
      // Existing user - generate custom token and log them in
      const customToken = await adminAuth.createCustomToken(uid, { accountType, phone: phoneNumber });
      return NextResponse.json({ success: true, isNew: false, customToken, uid, accountType, userName });
    }

    // New user - OTP is verified and stored as verified:true, let them pick account type
    return NextResponse.json({ success: true, isNew: true });

  } catch (error: any) {
    console.error('❌ [verify-otp-and-check]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
