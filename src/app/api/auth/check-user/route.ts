/**
 * Check if user exists by phone or email
 * تم تحويله من Firebase إلى Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { cleanPhoneNumber, generatePhoneVariants } from '@/lib/validation/phone-validation';

import { findAccountByPhone } from '@/lib/auth/phone-account-lookup';

const COLLECTIONS = ['players', 'clubs', 'academies', 'agents', 'trainers', 'marketers', 'admins', 'employees', 'users'];

const TABLE_TO_ACCOUNT_TYPE: Record<string, string> = {
  players: 'player', clubs: 'club', academies: 'academy',
  trainers: 'trainer', agents: 'agent', marketers: 'marketer',
  admins: 'admin', employees: 'admin', users: 'player',
};

async function findByEmail(email: string) {
  const db = getSupabaseAdmin();
  for (const coll of COLLECTIONS) {
    const { data } = await db
      .from(coll)
      .select('id, full_name, name, email')
      .eq('email', email)
      .limit(1)
      .maybeSingle();
    if (data) {
      return {
        exists: true,
        userName: (data as any).full_name || (data as any).name || 'مستخدم',
        accountType: TABLE_TO_ACCOUNT_TYPE[coll] || 'player',
        uid: (data as any).id,
      };
    }
  }
  // البحث في Supabase Auth
  try {
    const { data: usersData } = await db.auth.admin.listUsers({ perPage: 1000 });
    const authUser = ((usersData?.users ?? []) as any[]).find(u => u.email === email);
    if (authUser) {
      return { exists: true, userName: authUser.user_metadata?.full_name || 'مستخدم', uid: authUser.id };
    }
  } catch { }
  return { exists: false };
}

async function findByPhone(phone: string) {
  try {
    const account = await findAccountByPhone(phone);
    if (account.found) {
      return {
        exists: true,
        userName: account.name || 'مستخدم',
        accountType: account.accountType || 'player',
        email: account.email || '',
        uid: account.uid || account.id,
      };
    }
  } catch (error) {
    console.error('[check-user] findByPhone error:', error);
  }
  return { exists: false };
}

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, email } = await request.json();
    if (!phoneNumber && !email) {
      return NextResponse.json({ success: false, error: 'رقم الهاتف أو البريد الإلكتروني مطلوب', exists: false }, { status: 400 });
    }
    const result = email ? await findByEmail(email) : await findByPhone(phoneNumber);
    return NextResponse.json({ success: true, ...result, message: result.exists ? 'المستخدم موجود في النظام' : 'المستخدم غير موجود في النظام' });
  } catch (error: any) {
    console.error('❌ [check-user]', error);
    return NextResponse.json({ success: false, exists: false, error: 'حدث خطأ أثناء التحقق' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ success: true, message: 'Check user endpoint is working', timestamp: new Date().toISOString() });
}
