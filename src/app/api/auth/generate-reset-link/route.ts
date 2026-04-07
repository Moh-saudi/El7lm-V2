import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import crypto from 'crypto';

function generateShortToken(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

export async function POST(request: NextRequest) {
  try {
    let { email } = await request.json();

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    email = email.toLowerCase().trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: 'Invalid email format' }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // Check if user exists in Supabase Auth
    const { data: authData, error: authError } = await db.auth.admin.listUsers();
    const authUser = ((authData?.users ?? []) as any[]).find(u => u.email?.toLowerCase() === email);

    if (!authUser) {
      console.log('⚠️ [generate-reset-link] User not found in Supabase Auth:', email);
      return NextResponse.json(
        { success: false, error: 'لا توجد حساب مسجل بهذا البريد الإلكتروني' },
        { status: 404 }
      );
    }

    // Check user exists in DB tables
    const collections = ['users', 'players', 'clubs', 'academies', 'agents', 'trainers', 'employees'];
    let foundInDb = false;
    let userCollection = '';
    let userDoc: Record<string, unknown> | null = null;

    for (const coll of collections) {
      try {
        const { data } = await db.from(coll).select('*').eq('email', email).limit(1);
        if (data && data.length > 0) {
          foundInDb = true;
          userCollection = coll;
          userDoc = data[0];
          console.log(`✅ [generate-reset-link] User found in table: ${coll}`);
          break;
        }
      } catch (err) {
        console.warn(`⚠️ [generate-reset-link] Could not search in ${coll}:`, err);
      }
    }

    if (!foundInDb) {
      return NextResponse.json({
        success: false,
        error: 'الحساب غير مكتمل في نظامنا. يرجى التواصل مع خدمة العملاء\n\n💬 قطر (واتساب): +974 7054 2458\n💬 مصر: +20 101 779 9580\n✉️ info@el7lm.com',
        needsSupport: true
      }, { status: 404 });
    }

    const token = generateShortToken();
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour

    await db.from('password_reset_tokens').upsert({
      token,
      email,
      userId: authUser.id,
      collection: userCollection,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
      used: false,
    });

    console.log('✅ [generate-reset-link] Token created:', token);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://el7lm.com';
    const resetLink = `${baseUrl}/auth/reset-password?token=${token}`;

    let emailSent = false;
    let resendError = null;

    try {
      const { sendEmail } = await import('@/lib/email/sender');
      const { generatePasswordResetEmail, generatePasswordResetPlainText } = await import('@/lib/email/templates/password-reset');

      const userName = String(userDoc?.full_name ?? userDoc?.name ?? 'المستخدم');
      const emailHtml = generatePasswordResetEmail({ userName, resetLink, token, expiresIn: '60 دقيقة' });
      const emailText = generatePasswordResetPlainText({ userName, resetLink, token, expiresIn: '60 دقيقة' });

      const result = await sendEmail({
        to: email,
        subject: '🔐 إعادة تعيين كلمة المرور - منصة الحلم',
        html: emailHtml,
        text: emailText,
        type: 'password-reset',
        userId: authUser.id,
        userName,
        metadata: { token, collection: userCollection },
      });

      if (!result.success) {
        resendError = result.error;
      } else {
        emailSent = true;
      }
    } catch (err: unknown) {
      resendError = { message: err instanceof Error ? err.message : 'Unknown error' };
    }

    return NextResponse.json({
      success: true, emailSent, resendError, resetLink, token, expiresAt,
      message: emailSent ? 'تم إرسال رابط إعادة التعيين بنجاح' : 'تم إنشاء الرابط ولكن فشل الإرسال التلقائي',
    });
  } catch (error: unknown) {
    console.error('Generate reset link error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate reset link' },
      { status: 500 }
    );
  }
}
