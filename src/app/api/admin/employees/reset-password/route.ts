import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify the token
    try {
      const db = getSupabaseAdmin();
      const { error } = await db.auth.getUser(idToken);
      if (error) throw error;
    } catch {
      return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });
    }

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
