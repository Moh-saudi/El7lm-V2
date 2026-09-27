import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeAdmin, withPrivateResponseHeaders } from '@/lib/api/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdmin(request);
  if (!authorization.ok) return authorization.response;

  try {
    const page = Math.max(1, Number(request.nextUrl.searchParams.get('page') || 1));
    const pageSize = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('pageSize') || 20)));
    const status = request.nextUrl.searchParams.get('status');
    const method = request.nextUrl.searchParams.get('method');
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const db = getSupabaseAdmin();
    let query = db
      .from('payments')
      .select('id,payer_id,payer_type,plan_id,country_code,amount,currency,method,provider,status,provider_transaction_id,provider_reference_id,receipt_url,review_status,reviewed_by,reviewed_at,rejection_reason,paid_at,metadata,created_at,updated_at,payment_targets(id,target_player_id,amount_allocated,status)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status && status !== 'all') query = query.eq('status', status);
    if (method && method !== 'all') query = query.eq('method', method);

    const { data, error, count } = await query;
    if (error) throw error;

    const response = NextResponse.json({
      success: true,
      data: data || [],
      pagination: { page, pageSize, total: count || 0, totalPages: Math.ceil((count || 0) / pageSize) },
    });
    return withPrivateResponseHeaders(response);
  } catch (error) {
    console.error('[Admin Payments] Read failed:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
