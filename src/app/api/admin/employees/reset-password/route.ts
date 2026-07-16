import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeAdmin } from '@/lib/api/admin-auth';

export async function POST(req: NextRequest) {
  const authorization = await authorizeAdmin(req);
  if (!authorization.ok) return authorization.response;
  try {
    const { uid, newPassword } = await req.json();
    if (!uid || !newPassword) {
      return NextResponse.json({ error: 'Missing uid or newPassword' }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    await db.auth.admin.updateUserById(uid, { password: newPassword });

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (error: unknown) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
