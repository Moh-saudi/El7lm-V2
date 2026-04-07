import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ success: false, error: 'Email required' }, { status: 400 });

    const logs: string[] = [];
    console.log(`🔥 Starting PURGE for email: ${email}`);

    const db = getSupabaseAdmin();

    // 1. Delete from Supabase Auth
    let uid: string | null = null;
    try {
      const { data: authData } = await db.auth.admin.listUsers();
      const authUser = ((authData?.users ?? []) as any[]).find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (authUser) {
        uid = authUser.id;
        await db.auth.admin.deleteUser(uid);
        logs.push(`✅ Deleted from Supabase Auth (UID: ${uid})`);
      } else {
        logs.push('ℹ️ User not found in Supabase Auth (Already Clean)');
      }
    } catch (error: unknown) {
      logs.push(`❌ Error deleting from Auth: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // 2. Delete from all DB tables
    const tables = ['users', 'players', 'clubs', 'academies', 'agents', 'trainers', 'employees', 'marketers'];

    for (const table of tables) {
      try {
        const { data } = await db.from(table).select('id').eq('email', email);
        if (data?.length) {
          await db.from(table).delete().eq('email', email);
          data.forEach((r: Record<string, unknown>) => logs.push(`🔥 Deleted from ${table}/${r.id}`));
        }

        if (uid) {
          const { data: byId } = await db.from(table).select('id').eq('id', uid);
          if (byId?.length) {
            await db.from(table).delete().eq('id', uid);
            logs.push(`🔥 Deleted orphan doc by ID from ${table}/${uid}`);
          }
        }
      } catch (err: unknown) {
        console.error(`Error scanning ${table}:`, err);
      }
    }

    return NextResponse.json({ success: true, logs });
  } catch (error: unknown) {
    console.error('Purge error:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown' }, { status: 500 });
  }
}
