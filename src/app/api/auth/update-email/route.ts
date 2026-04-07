import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { userId, userCollection, email } = await request.json();

    if (!userId || !userCollection || !email) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: 'Invalid email format' }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // تحديث الإيميل في الجدول المخصص
    await db.from(userCollection).update({ email }).eq('id', userId);

    // تحديث في جدول users أيضاً
    if (userCollection !== 'users') {
      await db.from('users').update({ email }).eq('id', userId);
    }

    // تحديث في Supabase Auth
    try {
      const { data: authUser } = await db.auth.admin.getUserById(userId);
      if (authUser?.user) {
        await db.auth.admin.updateUserById(userId, { email });
        console.log(`✅ [update-email] Updated Supabase Auth for user ${userId} with email ${email}`);
      }
    } catch (authError: any) {
      console.warn(`⚠️ [update-email] Could not update Supabase Auth:`, authError.message);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update email error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to update email' }, { status: 500 });
  }
}
