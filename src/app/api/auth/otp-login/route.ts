/**
 * OTP Login via WhatsApp
 * تحقق من OTP ثم أنشئ Supabase Session (بديل Firebase Custom Token)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyOTPInFirestore } from '@/lib/otp/firestore-otp-manager';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { cleanPhoneNumber, generatePhoneVariants } from '@/lib/validation/phone-validation';
import crypto from 'crypto';

const SEARCH_COLLECTIONS = ['players', 'clubs', 'academies', 'users', 'trainers', 'agents', 'admins'];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUUID = (v: unknown): v is string => typeof v === 'string' && UUID_REGEX.test(v);

const TABLE_TO_ACCOUNT_TYPE: Record<string, string> = {
  players: 'player', clubs: 'club', academies: 'academy',
  trainers: 'trainer', agents: 'agent', marketers: 'marketer',
  admins: 'admin', users: 'player',
};

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
    const phoneVariants = generatePhoneVariants(phoneNumber);

    // 2. البحث عن المستخدم في قاعدة البيانات
    let userId: string | null = null;
    let accountType = 'player';
    let userName = '';
    let userEmail = '';
    let cachedSupabaseUid: string | null = null;

    outer:
    for (const coll of SEARCH_COLLECTIONS) {
      for (const phoneVariant of phoneVariants) {
        const { data } = await db
          .from(coll)
          .select('id, uid, full_name, name, accountType, email')
          .eq('phone', phoneVariant)
          .limit(1)
          .maybeSingle();

        if (data) {
          userId = (data as any).id;
          userName = (data as any).full_name || (data as any).name || '';
          accountType = (data as any).accountType || TABLE_TO_ACCOUNT_TYPE[coll] || 'player';
          userEmail = (data as any).email || '';
          // نتأكد أن uid هو Supabase UUID وليس Firebase UID
          const rawUid = (data as any).uid;
          cachedSupabaseUid = isUUID(rawUid) ? rawUid : null;
          break outer;
        }
      }
    }

    if (!userId) {
      console.warn(`[OTP Login] Phone not found. variants tried: ${phoneVariants.join(', ')}`);
      return NextResponse.json({ success: false, error: 'رقم الهاتف غير مسجل في النظام' }, { status: 404 });
    }

    // 3. البحث عن مستخدم في Supabase Auth
    const constructedEmail = userEmail || `${cleanedPhone}@el7lm.com`;
    let supabaseUserId: string | null = cachedSupabaseUid;
    let authEmail = constructedEmail;

    if (!supabaseUserId) {
      // نبحث في Auth عن طريق listUsers (محاطة بـ try-catch للأمان)
      try {
        const { data: usersData, error: listError } = await db.auth.admin.listUsers({ perPage: 2000 });
        if (listError) {
          console.warn('[OTP Login] listUsers error (non-fatal):', listError.message);
        } else {
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
      } catch (listErr: any) {
        console.warn('[OTP Login] listUsers threw (non-fatal):', listErr?.message);
      }
    }

    // إنشاء مستخدم جديد إذا لم يوجد في Auth
    if (!supabaseUserId) {
      const { data: newAuthUser, error: createError } = await db.auth.admin.createUser({
        email: constructedEmail,
        email_confirm: true,
        user_metadata: { accountType, phone: phoneNumber, full_name: userName, firebase_uid: userId },
      });
      if (createError) {
        // إذا كان الإيميل موجوداً بالفعل، نحاول الحصول على المستخدم عبر طريقة بديلة
        if (createError.message?.includes('already registered') || createError.message?.includes('already been registered')) {
          console.warn('[OTP Login] Email already exists, attempting to find via listUsers again...');
          try {
            const { data: usersData2 } = await db.auth.admin.listUsers({ perPage: 2000 });
            const match = (usersData2?.users ?? []).find(u => u.email === constructedEmail || (userEmail && u.email === userEmail));
            if (match) {
              supabaseUserId = match.id;
              authEmail = match.email || constructedEmail;
            }
          } catch { /* ignore */ }
        }
        if (!supabaseUserId) {
          console.error('❌ [OTP Login] createUser error:', createError.message);
          return NextResponse.json({ success: false, error: 'فشل إنشاء حساب المصادقة: ' + createError.message }, { status: 500 });
        }
      } else {
        supabaseUserId = newAuthUser?.user?.id ?? null;
        authEmail = constructedEmail;
      }
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

    // ربط Supabase Auth UUID بعمود uid وتحديث آخر تسجيل دخول
    const collectionMap: Record<string, string> = {
      player: 'players', club: 'clubs', agent: 'agents',
      academy: 'academies', trainer: 'trainers', marketer: 'marketers',
    };
    const tableName = collectionMap[accountType] || 'users';
    await db.from(tableName).update({ uid: supabaseUserId, lastLogin: new Date().toISOString() } as any).eq('id', userId);

    console.log(`✅ [OTP Login] User ${userId} (${accountType}) logged in`);

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
    console.error('❌ [OTP Login] Unhandled error:', error?.message || error);
    return NextResponse.json({ success: false, error: error.message || 'حدث خطأ أثناء تسجيل الدخول' }, { status: 500 });
  }
}
