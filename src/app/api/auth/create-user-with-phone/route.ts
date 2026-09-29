/**
 * Create a new user account using a verified phone number (WhatsApp OTP flow)
 * تم تحويله من Firebase Admin إلى Supabase Admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { cleanPhoneNumber } from '@/lib/validation/phone-validation';
import { findAccountByPhone } from '@/lib/auth/phone-account-lookup';
import { verifyOTPInFirestore } from '@/lib/otp/firestore-otp-manager';
import { verifyPlayReviewOTP } from '@/lib/otp/play-review-otp';

const COLLECTION_MAP = {
  player: 'players',
  club: 'clubs',
  agent: 'agents',
  academy: 'academies',
  trainer: 'trainers',
  marketer: 'marketers',
} as const;

type PublicAccountType = keyof typeof COLLECTION_MAP;

function isPublicAccountType(value: unknown): value is PublicAccountType {
  return typeof value === 'string' && Object.hasOwn(COLLECTION_MAP, value);
}

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, accountType, name = '', otp } = await request.json();

    if (!phoneNumber || !accountType || !otp) {
      return NextResponse.json({ success: false, error: 'البيانات مطلوبة' }, { status: 400 });
    }

    if (!isPublicAccountType(accountType)) {
      return NextResponse.json({ success: false, error: 'نوع الحساب غير مسموح' }, { status: 400 });
    }

    const reviewResult = await verifyPlayReviewOTP(phoneNumber, otp);
    const otpResult = reviewResult.isReviewAccount
      ? reviewResult
      : await verifyOTPInFirestore(phoneNumber, otp);
    if (!otpResult.success) {
      return NextResponse.json(
        { success: false, error: otpResult.error || 'رمز التحقق غير صحيح أو منتهي الصلاحية' },
        { status: 400 },
      );
    }

    const db = getSupabaseAdmin();
    const cleanDigits = cleanPhoneNumber(phoneNumber);
    const otpDocId = `otp_${cleanDigits}`;

    const e164Phone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    const constructedEmail = `${cleanDigits}@el7lm.com`;
    const password = `${cleanDigits}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const existingAccount = await findAccountByPhone(phoneNumber);
    if (existingAccount.found) {
      return NextResponse.json({
        success: false,
        code: 'ACCOUNT_ALREADY_EXISTS',
        accountType: existingAccount.accountType,
        error: 'This phone number is already registered. Sign in instead.',
      }, { status: 409 });
    }

    // التحقق من عدم وجود الهاتف مسبقاً
    const tableName = COLLECTION_MAP[accountType];
    const { data: existingUser } = await db
      .from(tableName)
      .select('id')
      .eq('phone', e164Phone)
      .single();

    if (existingUser) {
      return NextResponse.json({ success: false, error: 'رقم الهاتف مسجل بالفعل، يرجى تسجيل الدخول' }, { status: 409 });
    }

    // Consume the verified OTP atomically. A verified phone can create only one account,
    // even when concurrent requests arrive within the verification window.
    const { data: consumedOtp, error: consumeError } = await db
      .from('otp_verifications')
      .delete()
      .eq('id', otpDocId)
      .eq('verified', true)
      .select('id')
      .maybeSingle();

    if (consumeError || !consumedOtp) {
      return NextResponse.json(
        { success: false, error: 'تم استخدام التحقق أو انتهت صلاحيته، يرجى التحقق مرة أخرى' },
        { status: 409 },
      );
    }

    // إنشاء مستخدم في Supabase Auth
    const { data: authData, error: authError } = await db.auth.admin.createUser({
      email: constructedEmail,
      password,
      email_confirm: true,
      phone: e164Phone,
      phone_confirm: true,
      user_metadata: { accountType, phone: e164Phone, full_name: name },
    });

    if (authError) {
      if (authError.message?.includes('already')) {
        return NextResponse.json({ success: false, error: 'رقم الهاتف مسجل بالفعل، يرجى تسجيل الدخول' }, { status: 409 });
      }
      throw authError;
    }

    const uid = authData.user.id;
    const now = new Date().toISOString();

    const userDoc = {
      id: uid,
      uid,
      full_name: name,
      phone: e164Phone,
      email: constructedEmail,
      accountType,
      createdAt: now,
      isVerifiedLocal: true,
      isActive: true,
      isDeleted: false,
    };

    // كتابة في الجدول المخصص للنوع
    await db.from(tableName).insert(userDoc);

    // كتابة في جدول users أيضاً (للتوافق)
    try { await db.from('users').insert(userDoc); } catch { }

    const { data: linkData, error: linkError } = await db.auth.admin.generateLink({
      type: 'magiclink',
      email: constructedEmail,
    });
    const tokenHash = linkData?.properties?.hashed_token;
    if (linkError || !tokenHash) {
      console.error('❌ [create-user] generateLink error:', linkError);
      return NextResponse.json({ success: false, error: 'تم إنشاء الحساب وتعذر إنشاء الجلسة، يرجى تسجيل الدخول' }, { status: 500 });
    }

    console.log(`✅ [create-user] Created ${uid} as ${accountType}`);

    return NextResponse.json({
      success: true,
      uid,
      accountType,
      userName: name,
      tokenHash,
    });

  } catch (error: any) {
    console.error('❌ [create-user-with-phone]', error);
    return NextResponse.json({ success: false, error: error.message || 'فشل إنشاء الحساب' }, { status: 500 });
  }
}
