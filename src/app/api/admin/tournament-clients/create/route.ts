import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeAdmin, withPrivateResponseHeaders } from '@/lib/api/admin-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authorization = await authorizeAdmin(req, 'manage:tournaments');
  if (!authorization.ok) return authorization.response;

  try {
    const { name, organization_name, email, phone, country, password } = await req.json();
    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (!cleanName || !cleanEmail || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Valid name, email and password are required' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: { name: cleanName, organization_name: organization_name?.trim() || null },
    });
    if (authError || !authData.user) {
      return withPrivateResponseHeaders(
        NextResponse.json({ error: 'Failed to create organizer identity' }, { status: 409 }),
      );
    }

    const { data: client, error: clientError } = await admin
      .from('tournament_clients')
      .insert({
        supabase_auth_id: authData.user.id,
        name: cleanName,
        organization_name: organization_name?.trim() || null,
        email: cleanEmail,
        phone: phone?.trim() || null,
        country: country?.trim() || null,
        is_active: true,
      })
      .select('id,supabase_auth_id,name,organization_name,email,phone,country,is_active,created_at')
      .single();

    if (clientError || !client) {
      await admin.auth.admin.deleteUser(authData.user.id).catch(() => undefined);
      return withPrivateResponseHeaders(
        NextResponse.json({ error: 'Failed to create organizer profile' }, { status: 500 }),
      );
    }

    return withPrivateResponseHeaders(NextResponse.json({ client, success: true }, { status: 201 }));
  } catch (error) {
    console.error('[tournament-clients/create] failed:', error);
    return withPrivateResponseHeaders(
      NextResponse.json({ error: 'Internal Server Error' }, { status: 500 }),
    );
  }
}
