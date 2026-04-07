/**
 * Verify OTP and route: existing user → session, new user → isNew: true
 * تم تحويله من Firebase إلى Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyOTPInFirestore } from '@/lib/otp/firestore-otp-manager';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { cleanPhoneNumber } from '@/lib/validation/phone-validation';

const SEARCH_COLLECTIONS = ['players', 'clubs', 'academies', 'trainers', 'agents', 'marketers', 'admins', 'users'];

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, otp } = await request.json();

    if (!phoneNumber || !otp) {
      return NextResponse.json({ success: false, error: 'البيانات مطلوبة' }, { status: 400 });
    }

    // 1. التحقق من OTP
    const otpResult = await verifyOTPInFirestore(phoneNumber, otp);
    if (!otpResult.success) {
      return NextResponse.json({
        success: false,
        error: otpResult.error || 'رمز التحقق غير صحيح',
        attemptsRemaining: otpResult.attemptsRemaining,
      }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const cleaned = cleanPhoneNumber(phoneNumber);
    const phoneVariants = [phoneNumber, cleaned, `+${cleaned}`].filter((v, i, a) => a.indexOf(v) === i);

    // 2. البحث عن المستخدم في قاعدة البيانات
    let userId: string | null = null;
    let accountType = '';
    let userName = '';
    let userEmail = '';
    let cachedSupabaseUid: string | null = null;

    for (const col of SEARCH_COLLECTIONS) {
      for (const variant of phoneVariants) {
        const { data } = await db
          .from(col)
          .select('id, uid, full_name, name, accountType, email')
          .eq('phone', variant)
          .limit(1)
          .single();

        if (data) {
          userId = (data as any).id;
          userName = (data as any).full_name || (data as any).name || '';
          accountType = col === 'admins' ? 'admin' : ((data as any).accountType || (col !== 'users' ? col.replace(/s$/, '') : 'player'));
          userEmail = (data as any).email || '';
          cachedSupabaseUid = (data as any).uid || null;
          break;
        }
      }
      if (userId) break;
    }

    if (!userId) {
      // مستخدم جديد - OTP محقق وجاهز لإنشاء حساب
      return NextResponse.json({ success: true, isNew: true });
    }

    // 3. مستخدم موجود - إنشاء Supabase Auth session عبر temp password
    const constructedEmail = userEmail || `${cleaned}@el7lm.com`;
    let supabaseUserId: string | null = cachedSupabaseUid; // uid محفوظ → لا حاجة لـ listUsers

    if (!supabaseUserId) {
      // uid غير محفوظ — نبحث في Auth مرة واحدة فقط
      const { data: usersData } = await db.auth.admin.listUsers({ perPage: 2000 });
      const allUsers = usersData?.users ?? [];
      const foundUser = allUsers.find(u =>
        (userEmail && u.email === userEmail) ||
        (u.user_metadata?.firebase_uid === userId) ||
        (u.user_metadata?.db_id === userId) ||
        u.email === constructedEmail
      );
      if (foundUser) supabaseUserId = foundUser.id;
    }

    if (!supabaseUserId) {
      const { data: newUser } = await db.auth.admin.createUser({
        email: constructedEmail,
        email_confirm: true,
        user_metadata: { accountType, phone: phoneNumber, firebase_uid: userId, db_id: userId },
      }).catch(() => ({ data: null }));
      supabaseUserId = newUser?.user?.id ?? null;
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
      authEmail: constructedEmail,
      authPassword: tempPassword,
    });

  } catch (error: any) {
    console.error('❌ [verify-otp-and-check]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
