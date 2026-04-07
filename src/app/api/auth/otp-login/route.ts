/**
 * OTP Login via WhatsApp
 * تحقق من OTP ثم أنشئ Supabase Session (بديل Firebase Custom Token)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyOTPInFirestore } from '@/lib/otp/firestore-otp-manager';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { cleanPhoneNumber } from '@/lib/validation/phone-validation';
import crypto from 'crypto';

const SEARCH_COLLECTIONS = ['players', 'clubs', 'academies', 'users', 'trainers', 'agents', 'admins'];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, otp } = body;

    if (!phoneNumber || !otp) {
      return NextResponse.json({ success: false, error: 'رقم الهاتف ورمز التحقق مطلوبان' }, { status: 400 });
    }

    // 1. التحقق من OTP
    const otpResult = await verifyOTPInFirestore(phoneNumber, otp);
    if (!otpResult.success) {
      return NextResponse.json({ success: false, error: otpResult.error || 'رمز التحقق غير صحيح أو منتهي الصلاحية' }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const cleanedPhone = cleanPhoneNumber(phoneNumber);
    const phoneVariants = [
      cleanedPhone,
      `+${cleanedPhone}`,
      phoneNumber,
    ].filter((v, i, a) => a.indexOf(v) === i);

    // 2. البحث عن المستخدم في قاعدة البيانات
    let userId: string | null = null;
    let accountType = 'player';
    let userName = '';
    let userEmail = '';
    let cachedSupabaseUid: string | null = null; // uid محفوظ من الجلسات السابقة

    for (const coll of SEARCH_COLLECTIONS) {
      for (const phoneVariant of phoneVariants) {
        const { data } = await db
          .from(coll)
          .select('id, uid, full_name, name, accountType, email')
          .eq('phone', phoneVariant)
          .limit(1)
          .single();

        if (data) {
          userId = (data as any).id;
          userName = (data as any).full_name || (data as any).name || '';
          accountType = coll === 'admins' ? 'admin' : ((data as any).accountType || coll.replace(/s$/, ''));
          userEmail = (data as any).email || '';
          cachedSupabaseUid = (data as any).uid || null;
          break;
        }
      }
      if (userId) break;
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'رقم الهاتف غير مسجل في النظام' }, { status: 404 });
    }

    // 3. البحث عن مستخدم في Supabase Auth
    const constructedEmail = userEmail || `${cleanedPhone}@el7lm.com`;
    let supabaseUserId: string | null = cachedSupabaseUid; // استخدام الـ uid المحفوظ مباشرة
    let authEmail = constructedEmail;

    if (!supabaseUserId) {
      // uid غير محفوظ بعد — نبحث في Auth مرة واحدة فقط
      const { data: usersData } = await db.auth.admin.listUsers({ perPage: 2000 });
      const allUsers = usersData?.users ?? [];
      const foundUser = allUsers.find(u =>
        (userEmail && u.email === userEmail) ||
        (u.user_metadata?.firebase_uid === userId) ||
        (u.email === constructedEmail)
      );
      if (foundUser) {
        supabaseUserId = foundUser.id;
        authEmail = foundUser.email || constructedEmail;
      }
    }

    // إنشاء مستخدم جديد إذا لم يوجد في Auth نهائياً
    if (!supabaseUserId) {
      const { data: newAuthUser, error: createError } = await db.auth.admin.createUser({
        email: constructedEmail,
        email_confirm: true,
        user_metadata: { accountType, phone: phoneNumber, full_name: userName, firebase_uid: userId },
      });
      if (createError) {
        console.error('❌ [OTP Login] createUser error:', createError.message);
        return NextResponse.json({ success: false, error: 'فشل إنشاء حساب المصادقة: ' + createError.message }, { status: 500 });
      }
      supabaseUserId = newAuthUser?.user?.id ?? null;
      authEmail = constructedEmail;
    }

    if (!supabaseUserId) {
      return NextResponse.json({ success: false, error: 'تعذر تحديد حساب المصادقة' }, { status: 500 });
    }

    // 4. إنشاء كلمة مرور مؤقتة وتحديث المستخدم بها لإنشاء جلسة
    const tempPassword = crypto.randomBytes(32).toString('hex');
    const { error: updateError } = await db.auth.admin.updateUserById(supabaseUserId, {
      password: tempPassword,
      email_confirm: true,
      user_metadata: { db_id: userId, accountType, phone: phoneNumber, full_name: userName },
    });

    if (updateError) {
      console.error('❌ [OTP Login] updateUserById error:', updateError);
      return NextResponse.json({ success: false, error: 'فشل إنشاء جلسة المصادقة: ' + updateError.message }, { status: 500 });
    }

    // تحديث آخر تسجيل دخول
    const collectionMap: Record<string, string> = {
      player: 'players', club: 'clubs', agent: 'agents',
      academy: 'academies', trainer: 'trainers', marketer: 'marketers',
    };
    const tableName = collectionMap[accountType] || 'users';
    // ربط Supabase Auth UUID بعمود uid - ضروري لعمل سياسات RLS
    await db.from(tableName).update({ uid: supabaseUserId, lastLogin: new Date().toISOString() } as any).eq('id', userId);

    console.log(`✅ [OTP Login] User ${userId} logged in as ${accountType}`);

    return NextResponse.json({
      success: true,
      uid: userId,
      accountType,
      userName,
      authEmail,
      authPassword: tempPassword,
      message: 'تم التحقق بنجاح',
    });

  } catch (error: any) {
    console.error('❌ [OTP Login] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'حدث خطأ أثناء تسجيل الدخول' }, { status: 500 });
  }
}
