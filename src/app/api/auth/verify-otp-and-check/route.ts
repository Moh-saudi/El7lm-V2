/**
 * Verify OTP and route: existing user → session, new user → isNew: true
 * تم تحويله من Firebase إلى Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyOTPInFirestore } from '@/lib/otp/firestore-otp-manager';
import { verifyPlayReviewOTP } from '@/lib/otp/play-review-otp';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { cleanPhoneNumber, generatePhoneVariants } from '@/lib/validation/phone-validation';
import { findAccountByPhone } from '@/lib/auth/phone-account-lookup';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, otp } = await request.json();

    if (!phoneNumber || !otp) {
      return NextResponse.json({ success: false, error: 'البيانات مطلوبة' }, { status: 400 });
    }

    // 1. التحقق من OTP
    const reviewResult = await verifyPlayReviewOTP(phoneNumber, otp);
    const otpResult = reviewResult.isReviewAccount
      ? reviewResult
      : await verifyOTPInFirestore(phoneNumber, otp);
    if (!otpResult.success) {
      return NextResponse.json({
        success: false,
        error: otpResult.error || 'رمز التحقق غير صحيح',
        attemptsRemaining: otpResult.attemptsRemaining,
      }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const phoneVariants = generatePhoneVariants(phoneNumber);

    // 2. البحث عن المستخدم في قاعدة البيانات عبر الفهرس الموحد
    let userId: string | null = null;
    let accountType = '';
    let userName = '';
    let userEmail = '';
    let cachedSupabaseUid: string | null = null;

    const resolvedAccount = await findAccountByPhone(phoneNumber);
    if (resolvedAccount.found) {
      userId = resolvedAccount.id;
      userName = resolvedAccount.name;
      accountType = resolvedAccount.accountType;
      userEmail = resolvedAccount.email;
      cachedSupabaseUid = resolvedAccount.uid;
    } else {
      // التحقق من حسابات الإدارة التي لا يشملها البحث العام
      const { data: admin } = await db
        .from('admins')
        .select('id, uid, name, email')
        .in('phone', phoneVariants)
        .limit(1)
        .maybeSingle();

      if (admin) {
        userId = admin.id;
        accountType = 'admin';
        userName = admin.name || '';
        userEmail = admin.email || '';
        cachedSupabaseUid = admin.uid || null;
      }
    }

    if (!userId) {
      // مستخدم جديد - OTP محقق وجاهز لإنشاء حساب
      return NextResponse.json({ success: true, isNew: true });
    }

    // 3. مستخدم موجود - إنشاء Supabase Auth session عبر temp password
    const cleaned = cleanPhoneNumber(phoneNumber);
    const constructedEmail = userEmail || `${cleaned}@el7lm.com`;
    let supabaseUserId: string | null = cachedSupabaseUid;
    let authEmail = constructedEmail;

    // إذا كان لدينا معرف auth محفوظ، نتحقق منه مباشرة دون فحص قائمة المستخدمين
    if (supabaseUserId) {
      const { data: cachedAuthData, error: cachedAuthError } =
        await db.auth.admin.getUserById(supabaseUserId);
      if (cachedAuthError || !cachedAuthData.user) {
        supabaseUserId = null;
      } else if (cachedAuthData.user.email) {
        authEmail = cachedAuthData.user.email;
      }
    }

    if (!supabaseUserId) {
      // البحث في Auth إذا لم نجد المعرف المخزن
      try {
        const { data: usersData } = await db.auth.admin.listUsers({ perPage: 2000 });
        const allUsers = usersData?.users ?? [];
        const foundUser = allUsers.find(u =>
          (userEmail && u.email === userEmail) ||
          (u.user_metadata?.firebase_uid === userId) ||
          (u.user_metadata?.db_id === userId) ||
          u.email === constructedEmail
        );
        if (foundUser) {
          supabaseUserId = foundUser.id;
          authEmail = foundUser.email || constructedEmail;
        }
      } catch (err) {
        console.warn('[verify-otp-and-check] listUsers error:', err);
      }
    }

    if (!supabaseUserId) {
      const { data: newUser, error: createError } = await db.auth.admin.createUser({
        email: constructedEmail,
        email_confirm: true,
        user_metadata: { accountType, phone: phoneNumber, firebase_uid: userId, db_id: userId },
      });
      if (createError) {
        console.error('❌ [verify-otp-and-check] createUser error:', createError.message);
      } else {
        supabaseUserId = newUser?.user?.id ?? null;
      }
    }

    if (!supabaseUserId) {
      return NextResponse.json({ success: false, error: 'تعذر تحديد حساب المصادقة' }, { status: 500 });
    }

    // تعيين temp password لإنشاء session من الـ frontend
    const crypto = (await import('crypto')).default;
    const tempPassword = crypto.randomBytes(32).toString('hex');
    await db.auth.admin.updateUserById(supabaseUserId, {
      password: tempPassword,
      email_confirm: true,
      user_metadata: { db_id: userId, accountType, phone: phoneNumber, full_name: userName },
    });

    // ربط uid
    const collectionMap: Record<string, string> = {
      player: 'players', club: 'clubs', agent: 'agents',
      academy: 'academies', trainer: 'trainers', marketer: 'marketers',
    };
    const tableName = collectionMap[accountType] || 'users';
    await db.from(tableName).update({ uid: supabaseUserId, lastLogin: new Date().toISOString() } as any).eq('id', userId);

    return NextResponse.json({
      success: true,
      isNew: false,
      uid: userId,
      accountType,
      userName,
      authEmail,
      authPassword: tempPassword,
    });

  } catch (error: any) {
    console.error('❌ [verify-otp-and-check]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
