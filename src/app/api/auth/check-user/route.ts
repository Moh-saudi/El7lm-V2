/**
 * Check if user exists by phone or email
 * تم تحويله من Firebase إلى Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { cleanPhoneNumber } from '@/lib/validation/phone-validation';

const COLLECTIONS = ['players', 'clubs', 'academies', 'agents', 'trainers', 'marketers', 'admins', 'employees', 'users'];

function generatePhoneVariants(phone: string): string[] {
  const cleaned = cleanPhoneNumber(phone);
  const variants = new Set<string>([phone, cleaned, `+${cleaned}`]);
  if (cleaned.startsWith('20')) {
    variants.add(cleaned.substring(2));
    variants.add(`0${cleaned.substring(2)}`);
  }
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    variants.add(`20${cleaned.substring(1)}`);
    variants.add(cleaned.substring(1));
  }
  if (cleaned.startsWith('966')) {
    variants.add(cleaned.substring(3));
    variants.add(`0${cleaned.substring(3)}`);
  }
  return [...variants].filter(v => v.length >= 8);
}

async function findByEmail(email: string) {
  const db = getSupabaseAdmin();
  for (const coll of COLLECTIONS) {
    const { data } = await db
      .from(coll)
      .select('id, full_name, name, accountType, email')
      .eq('email', email)
      .limit(1)
      .single();
    if (data) {
      return {
        exists: true,
        userName: (data as any).full_name || (data as any).name || 'مستخدم',
        accountType: (data as any).accountType || coll.replace(/s$/, ''),
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
  const db = getSupabaseAdmin();
  const variants = generatePhoneVariants(phone);
  for (const coll of COLLECTIONS) {
    const { data } = await db
      .from(coll)
      .select('id, full_name, name, accountType, email')
      .in('phone', variants.slice(0, 10))
      .limit(1)
      .single();
    if (data) {
      return {
        exists: true,
        userName: (data as any).full_name || (data as any).name || 'مستخدم',
        accountType: (data as any).accountType || coll.replace(/s$/, ''),
        email: (data as any).email || '',
      };
    }
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
