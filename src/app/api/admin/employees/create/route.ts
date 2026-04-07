import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

async function verifyAdminToken(req: NextRequest) {
  const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
  if (!idToken) return null;
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db.auth.getUser(idToken);
    if (error || !data?.user) return null;
    return data.user;
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await verifyAdminToken(req);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { email, password, name, roleId, allowedCountries } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // Create user in Supabase Auth
    const { data: userData, error: createError } = await db.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: name, accountType: 'employee', role: roleId || 'employee' },
    });

    if (createError) {
      if (createError.message?.includes('already registered') || createError.message?.includes('already exists')) {
        return NextResponse.json(
          { error: 'البريد الإلكتروني مستخدم بالفعل. يرجى استخدام بريد آخر أو تعديل المستخدم الموجود.' },
          { status: 409 }
        );
      }
      throw createError;
    }

    const uid = userData.user.id;
    const now = new Date().toISOString();

    // Save to employees table
    await db.from('employees').upsert({
      id: uid, uid, name, email,
      roleId, department: body.department || '',
      phone: body.phone || '', jobTitle: body.jobTitle || '',
      allowedCountries: allowedCountries || [],
      isActive: true, createdAt: now, updatedAt: now,
    });

    return NextResponse.json({ success: true, uid, message: 'User created successfully' });
  } catch (error: unknown) {
    console.error('Error creating employee:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
