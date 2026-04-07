/**
 * Create a new user account using a verified phone number (WhatsApp OTP flow)
 * تم تحويله من Firebase Admin إلى Supabase Admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { cleanPhoneNumber } from '@/lib/validation/phone-validation';

const COLLECTION_MAP: Record<string, string> = {
  player: 'players',
  club: 'clubs',
  agent: 'agents',
  academy: 'academies',
  trainer: 'trainers',
  marketer: 'marketers',
};

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, accountType, name = '' } = await request.json();

    if (!phoneNumber || !accountType) {
      return NextResponse.json({ success: false, error: 'البيانات مطلوبة' }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const cleanDigits = cleanPhoneNumber(phoneNumber);
    const otpDocId = `otp_${cleanDigits}`;

    // التحقق من أن OTP تم التحقق منه مسبقاً
    const { data: otpData } = await db
      .from('otp_verifications')
      .select('*')
      .eq('id', otpDocId)
      .single();

    if (!otpData || !otpData.verified) {
      return NextResponse.json({ success: false, error: 'يجب التحقق من رقم الهاتف أولاً' }, { status: 403 });
    }

    // التحقق من حداثة التحقق (خلال 15 دقيقة)
    if (otpData.verifiedAt) {
      const verifiedMs = new Date(otpData.verifiedAt).getTime();
      if (Date.now() - verifiedMs > 15 * 60 * 1000) {
        return NextResponse.json({ success: false, error: 'انتهت صلاحية التحقق، يرجى إعادة إرسال الرمز' }, { status: 403 });
      }
    }

    const e164Phone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    const constructedEmail = `${cleanDigits}@el7lm.com`;
    const password = `${cleanDigits}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // التحقق من عدم وجود الهاتف مسبقاً
    const tableName = COLLECTION_MAP[accountType] || 'users';
    const { data: existingUser } = await db
      .from(tableName)
      .select('id')
      .eq('phone', e164Phone)
      .single();

    if (existingUser) {
      return NextResponse.json({ success: false, error: 'رقم الهاتف مسجل بالفعل، يرجى تسجيل الدخول' }, { status: 409 });
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
    if (tableName !== 'users') {
      try { await db.from('users').insert(userDoc); } catch { }
    }

    // حذف OTP بعد الاستخدام
    await db.from('otp_verifications').delete().eq('id', otpDocId);

    console.log(`✅ [create-user] Created ${uid} as ${accountType}`);

    return NextResponse.json({
      success: true,
      uid,
      accountType,
      userName: name,
      authEmail: constructedEmail,
      authPassword: password,
    });

  } catch (error: any) {
    console.error('❌ [create-user-with-phone]', error);
    return NextResponse.json({ success: false, error: error.message || 'فشل إنشاء الحساب' }, { status: 500 });
  }
}
