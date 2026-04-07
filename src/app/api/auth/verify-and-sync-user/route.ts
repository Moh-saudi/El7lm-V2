import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

const TABLES = ['players', 'clubs', 'academies', 'agents', 'trainers', 'marketers', 'admins', 'employees', 'users'];

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    console.log('🔍 [verify-and-sync] Checking user existence...');

    const db = getSupabaseAdmin();

    // Search in DB tables by email
    let dbUser: Record<string, unknown> | null = null;
    let dbUid: string | null = null;

    if (email) {
      const emailFields = ['email', 'userEmail', 'googleEmail', 'personalEmail'];
      outer:
      for (const table of TABLES) {
        for (const field of emailFields) {
          try {
            const { data } = await db.from(table).select('*').eq(field, email).limit(1);
            if (data && data.length > 0) {
              dbUser = data[0];
              dbUid = String(dbUser.uid ?? dbUser.id ?? '');
              break outer;
            }
          } catch (e) {
            console.warn(`Could not search in ${table} by ${field}:`, e);
          }
        }
      }

      // If not found in DB, try Supabase Auth directly
      if (!dbUid) {
        const { data: authData } = await db.auth.admin.listUsers();
        const authUser = ((authData?.users ?? []) as any[]).find(u => u.email?.toLowerCase() === email.toLowerCase());
        if (authUser) {
          return NextResponse.json({
            success: true,
            existsInAuth: true,
            existsInFirestore: false,
            needsSync: false,
            uid: authUser.id,
            providers: authUser.app_metadata?.providers ?? [],
            hasPassword: true,
            hasGoogle: (authUser.app_metadata?.providers ?? []).includes('google'),
            message: 'المستخدم موجود في Auth فقط',
          });
        }
      }
    }

    if (!dbUid) {
      return NextResponse.json({
        success: false, error: 'المستخدم غير موجود في قاعدة البيانات',
        needsSync: false, existsInAuth: false, existsInFirestore: false,
      }, { status: 200 });
    }

    // Check Supabase Auth
    const { data: userData, error: userError } = await db.auth.admin.getUserById(dbUid);
    if (userError || !userData?.user) {
      return NextResponse.json({
        success: false, existsInAuth: false, existsInFirestore: true,
        needsSync: true, firestoreUid: dbUid, error: 'الحساب يحتاج لتفعيل',
      }, { status: 200 });
    }

    const authUser = userData.user;
    const providers = authUser.app_metadata?.providers ?? [];
    return NextResponse.json({
      success: true, existsInAuth: true, existsInFirestore: true, needsSync: false,
      uid: authUser.id, providers,
      hasPassword: providers.includes('email'),
      hasGoogle: providers.includes('google'),
      firebaseEmail: authUser.email,
      message: 'المستخدم موجود',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'خطأ', needsSync: false },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ success: true, message: 'Verify endpoint working' });
}
