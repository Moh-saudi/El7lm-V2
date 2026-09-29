import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeAdmin } from '@/lib/api/admin-auth';

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdmin(request, 'read:financials');
  if (!authorization.ok) return authorization.response;
  try {

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
  const authorization = await authorizeAdmin(request, 'manage:financials');
  if (!authorization.ok) return authorization.response;
  try {

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
