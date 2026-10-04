import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUUID = (v: unknown): v is string => typeof v === 'string' && UUID_REGEX.test(v);

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
      let authUserId = userId;
      if (!isUUID(authUserId)) {
        const { data: row } = await db.from(userCollection).select('uid').eq('id', userId).maybeSingle();
        if (row?.uid && isUUID(row.uid)) {
          authUserId = row.uid;
        }
      }
      if (isUUID(authUserId)) {
        const { data: authUser } = await db.auth.admin.getUserById(authUserId);
        if (authUser?.user) {
          await db.auth.admin.updateUserById(authUserId, { email });
          console.log(`✅ [update-email] Updated Supabase Auth for user ${authUserId} with email ${email}`);
        }
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
