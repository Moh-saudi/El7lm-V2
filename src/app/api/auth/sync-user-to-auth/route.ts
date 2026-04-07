import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { email, password, uid, displayName } = await request.json();

    if (!email || !password || !uid) {
      return NextResponse.json({ success: false, error: 'البيانات المطلوبة ناقصة' }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // التحقق من وجود المستخدم في Supabase Auth
    try {
      const { data } = await db.auth.admin.getUserById(uid);
      if (data?.user) {
        return NextResponse.json({ success: true, message: 'المستخدم موجود', uid, alreadyExists: true });
      }
    } catch { }

    // إنشاء المستخدم في Supabase Auth
    let createResult = await db.auth.admin.createUser({
      id: uid,
      email,
      password,
      email_confirm: true,
      user_metadata: { displayName },
    });
    // إذا كان الـ uid مستخدماً، إنشاء بدونه
    if (createResult.error) {
      createResult = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { displayName } });
    }
    const { data: newUser, error } = createResult;

    if (error) throw error;

    // تحديث قاعدة البيانات
    await db.from('users').update({ syncedToAuth: true, authSyncDate: new Date().toISOString() }).eq('id', uid);

    return NextResponse.json({ success: true, message: 'تم إنشاء الحساب', uid: newUser?.user?.id ?? uid, alreadyExists: false });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'خطأ' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ success: true, message: 'Sync endpoint working' });
}
