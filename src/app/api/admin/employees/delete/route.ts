import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeAdmin } from '@/lib/api/admin-auth';

export async function POST(req: NextRequest) {
  const authorization = await authorizeAdmin(req);
  if (!authorization.ok) return authorization.response;
  try {
    const { uid } = await req.json();
    if (!uid) return NextResponse.json({ error: 'Missing Employee UID' }, { status: 400 });

    console.log(`🚨 Disabling employee account: ${uid}`);

    const db = getSupabaseAdmin();

    // Disable user in Supabase Auth
    await db.auth.admin.updateUserById(uid, { ban_duration: 'none' });

    // Soft delete in DB
    await db.from('employees').update({ isActive: false, updatedAt: new Date().toISOString() }).eq('id', uid);

    return NextResponse.json({ success: true, message: 'Employee account disabled' });
  } catch (error: unknown) {
    console.error('Error disabling employee:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
