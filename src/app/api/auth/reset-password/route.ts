/**
 * Reset Password via OTP verification
 * تم تحويله من Firebase Admin إلى Supabase Admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { cleanPhoneNumber } from '@/lib/validation/phone-validation';

const COLLECTIONS_TO_SEARCH = ['players', 'clubs', 'academies', 'agents', 'employees', 'trainers', 'users'];

function generatePhoneVariants(phoneNumber: string): string[] {
  const variants: string[] = [];
  const cleaned = phoneNumber.replace(/\D/g, '');

  variants.push(phoneNumber, cleaned, `+${cleaned}`);

  if (cleaned.startsWith('20')) {
    variants.push(cleaned.substring(2), `0${cleaned.substring(2)}`);
    if (cleaned.startsWith('200') && cleaned.length > 11) {
      variants.push(cleaned.substring(3), `20${cleaned.substring(3)}`, `0${cleaned.substring(3)}`);
    }
  }
  if (cleaned.startsWith('0') && !cleaned.startsWith('00') && cleaned.length === 11) {
    variants.push(`20${cleaned.substring(1)}`, cleaned.substring(1));
  }
  if (cleaned.startsWith('966')) {
    variants.push(`0${cleaned.substring(3)}`, cleaned.substring(3));
  }
  if (cleaned.startsWith('974') && cleaned.length === 11) {
    variants.push(cleaned.substring(3));
  }

  return [...new Set(variants)].filter(v => v.length >= 8);
}

async function findUserByPhone(phoneNumber: string) {
  if (!phoneNumber) return { uid: null, email: null, docId: null, collectionName: null };

  const db = getSupabaseAdmin();
  const phoneVariants = generatePhoneVariants(phoneNumber);

  for (const collectionName of COLLECTIONS_TO_SEARCH) {
    for (const variant of phoneVariants) {
      const { data } = await db
        .from(collectionName)
        .select('id, uid, email, userEmail, firebaseEmail, full_name, name')
        .or(`phone.eq.${variant},originalPhone.eq.${variant}`)
        .limit(1)
        .single();

      if (data) {
        const uid = (data as any).uid || (data as any).id;
        return {
          uid,
          email: (data as any).email || (data as any).userEmail || (data as any).firebaseEmail,
          docId: (data as any).id,
          collectionName,
          userData: data,
        };
      }
    }
  }

  return { uid: null, email: null, docId: null, collectionName: null, userData: null };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, newPassword } = body;

    if (!phoneNumber || !newPassword) {
      return NextResponse.json({ success: false, error: 'رقم الهاتف وكلمة المرور الجديدة مطلوبان' }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const cleanDigits = cleanPhoneNumber(phoneNumber);

    // التحقق من OTP
    const { data: otpData } = await db
      .from('otp_verifications')
      .select('*')
      .eq('id', `otp_${cleanDigits}`)
      .single();

    if (!otpData || !otpData.verified) {
      return NextResponse.json({ success: false, error: 'يجب التحقق من رقم الهاتف عبر WhatsApp أولاً' }, { status: 403 });
    }

    if (otpData.verifiedAt) {
      const ms = new Date(otpData.verifiedAt).getTime();
      if (Date.now() - ms > 15 * 60 * 1000) {
        return NextResponse.json({ success: false, error: 'انتهت صلاحية التحقق، يرجى إعادة إرسال رمز واتساب' }, { status: 403 });
      }
    }

    // حذف OTP بعد الاستخدام
    await db.from('otp_verifications').delete().eq('id', `otp_${cleanDigits}`);

    // التحقق من قوة كلمة المرور
    if (newPassword.length < 8) {
      return NextResponse.json({ success: false, error: 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل' }, { status: 400 });
    }

    const weakPatterns = [/^(\d)\1+$/, /^(0123456789|9876543210)/, /^12345678$/, /^123456/, /^111111/, /^000000/];
    if (/^\d+$/.test(newPassword) && weakPatterns.some(p => p.test(newPassword))) {
      return NextResponse.json({ success: false, error: 'كلمة المرور ضعيفة جداً. تجنب الأرقام المتسلسلة أو المتكررة' }, { status: 400 });
    }

    // البحث عن المستخدم
    const { uid, email, docId, collectionName } = await findUserByPhone(phoneNumber);

    if (!uid) {
      return NextResponse.json({ success: false, error: 'المستخدم غير موجود. يرجى التسجيل أولاً' }, { status: 404 });
    }

    const constructedEmail = email || `${cleanDigits}@el7lm.com`;

    // البحث أو إنشاء مستخدم في Supabase Auth
    let supabaseUserId: string | null = null;

    try {
      const { data: usersData } = await db.auth.admin.listUsers({ perPage: 2000 });
      const authUser = ((usersData?.users ?? []) as any[]).find(u => u.email === constructedEmail);
      supabaseUserId = authUser?.id ?? null;
    } catch {
      // غير موجود
    }

    if (!supabaseUserId) {
      // إنشاء المستخدم في Auth
      const { data: newUser } = await db.auth.admin.createUser({
        id: uid,
        email: constructedEmail,
        password: newPassword,
        email_confirm: true,
      }).catch(async () => db.auth.admin.createUser({
        email: constructedEmail,
        password: newPassword,
        email_confirm: true,
        user_metadata: { originalDbId: uid },
      }));

      supabaseUserId = newUser?.user?.id ?? null;
    } else {
      // تحديث كلمة المرور
      await db.auth.admin.updateUserById(supabaseUserId, { password: newPassword });
    }

    // تحديث قاعدة البيانات
    if (docId && collectionName) {
      await db.from(collectionName).update({
        passwordLastUpdated: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).eq('id', docId);
    }

    return NextResponse.json({
      success: true,
      message: 'تم تحديث كلمة المرور بنجاح',
      email: constructedEmail,
      uid: supabaseUserId || uid,
    });

  } catch (error: any) {
    console.error('❌ [reset-password]', error);
    return NextResponse.json({ success: false, error: error.message || 'حدث خطأ أثناء إعادة تعيين كلمة المرور' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ success: true, message: 'Reset password endpoint is working', timestamp: new Date().toISOString() });
}
