import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ valid: false, error: 'Token is required' }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const { data: tokenRows } = await db
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .limit(1);

    if (!tokenRows || tokenRows.length === 0) {
      return NextResponse.json({ valid: false, error: 'الرابط غير صالح' });
    }

    const tokenData = tokenRows[0] as Record<string, unknown>;

    if (new Date(String(tokenData.expiresAt)).getTime() < Date.now()) {
      return NextResponse.json({ valid: false, error: 'انتهت صلاحية الرابط. يرجى طلب رابط جديد' });
    }

    if (tokenData.used) {
      return NextResponse.json({ valid: false, error: 'تم استخدام هذا الرابط من قبل' });
    }

    return NextResponse.json({ valid: true, email: tokenData.email, userId: tokenData.userId });
  } catch (error: unknown) {
    console.error('Verify reset token error:', error);
    return NextResponse.json(
      { valid: false, error: error instanceof Error ? error.message : 'Failed to verify token' },
      { status: 500 }
    );
  }
}
