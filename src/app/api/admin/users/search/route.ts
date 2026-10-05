import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeAdmin } from '@/lib/api/admin-auth';

export async function GET(req: NextRequest) {
  const auth = await authorizeAdmin(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ success: true, users: [] });
  }

  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('users')
      .select('id, name, full_name, displayName, email, phone, phoneNumber, accountType')
      .or(`name.ilike.%${q}%,full_name.ilike.%${q}%,displayName.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,phoneNumber.ilike.%${q}%`)
      .limit(15);

    if (error) throw error;

    const users = (data || []).map(r => ({
      id: r.id,
      displayName: r.displayName || r.full_name || r.name || 'مستخدم',
      email: r.email || '',
      phone: r.phone || r.phoneNumber || '',
      accountType: r.accountType || 'player',
    }));

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    console.error('User search error:', error);
    return NextResponse.json({ success: false, error: 'فشل في البحث عن المستخدمين' }, { status: 500 });
  }
}
