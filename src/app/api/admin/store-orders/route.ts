import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

async function assertAdminAccess(request: NextRequest) {
  const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
  if (!idToken) {
    throw new Error('UNAUTHORIZED');
  }

  const admin = getSupabaseAdmin();
  const {
    data: { user },
    error,
  } = await admin.auth.getUser(idToken);

  if (error || !user) {
    throw new Error('UNAUTHORIZED');
  }

  const email = String(user.email || '').toLowerCase();
  if (email === 'admin@el7lm.com' || email === 'admin@elhilm.com') {
    return user;
  }

  const userChecks = await Promise.all([
    admin.from('users').select('accountType').eq('id', user.id).maybeSingle(),
    admin.from('admins').select('id').eq('id', user.id).maybeSingle(),
    admin.from('employees').select('role').eq('id', user.id).maybeSingle(),
  ]);

  const isAdmin =
    userChecks[0].data?.accountType === 'admin' ||
    Boolean(userChecks[1].data?.id) ||
    ['admin', 'supervisor'].includes(String(userChecks[2].data?.role || ''));

  if (!isAdmin) {
    throw new Error('FORBIDDEN');
  }

  return user;
}

export async function GET(request: NextRequest) {
  try {
    await assertAdminAccess(request);

    const status = request.nextUrl.searchParams.get('status');
    const admin = getSupabaseAdmin();
    let query = admin.from('store_orders').select('*').order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'FORBIDDEN' ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await assertAdminAccess(request);

    const body = await request.json();
    const orderId = String(body.orderId || '').trim();
    const status = String(body.status || '').trim();
    const adminNotes = body.adminNotes ? String(body.adminNotes) : null;

    if (!orderId || !status) {
      return NextResponse.json({ success: false, error: 'Missing orderId or status' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('store_orders')
      .update({
        status,
        admin_notes: adminNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'FORBIDDEN' ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
