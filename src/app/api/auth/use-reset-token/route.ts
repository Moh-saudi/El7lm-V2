import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json({ success: false, error: 'Token and password are required' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل' },
        { status: 400 }
      );
    }

    const db = getSupabaseAdmin();

    // Get and verify token
    const { data: tokenRows } = await db
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .limit(1);

    if (!tokenRows || tokenRows.length === 0) {
      return NextResponse.json({ success: false, error: 'الرابط غير صالح' }, { status: 404 });
    }

    const tokenData = tokenRows[0] as Record<string, unknown>;

    if (new Date(String(tokenData.expiresAt)).getTime() < Date.now()) {
      return NextResponse.json({ success: false, error: 'انتهت صلاحية الرابط' }, { status: 410 });
    }

    if (tokenData.used) {
      return NextResponse.json({ success: false, error: 'تم استخدام هذا الرابط من قبل' }, { status: 410 });
    }

    // Update password in Supabase Auth
    await db.auth.admin.updateUserById(String(tokenData.userId), { password: newPassword });

    // Mark token as used
    await db.from('password_reset_tokens').update({ used: true, usedAt: new Date().toISOString() }).eq('token', token);

    // Update lastPasswordChange in user tables
    try {
      const tables = ['users', 'players', 'clubs', 'academies', 'agents', 'trainers'];
      for (const table of tables) {
        const { data } = await db.from(table).select('id').eq('email', tokenData.email).limit(1);
        if (data && data.length > 0) {
          await db.from(table).update({ lastPasswordChange: new Date().toISOString() }).eq('id', data[0].id);
          break;
        }
      }
    } catch (err) {
      console.log('Could not update last password change:', err);
    }

    return NextResponse.json({ success: true, message: 'تم تحديث كلمة المرور بنجاح' });
  } catch (error: unknown) {
    console.error('Use reset token error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to reset password' },
      { status: 500 }
    );
  }
}
