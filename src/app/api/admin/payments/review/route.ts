import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRole } from '@/lib/supabase/admin';
import { authorizeAdmin } from '@/lib/api/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ReviewBody = {
  paymentId: string;
  action: 'approve' | 'reject';
  reviewedBy?: string;
  rejectionReason?: string;
};

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdmin(request);
  if (!authorization.ok) return authorization.response;

  try {
    const body = (await request.json()) as ReviewBody;
    if (!body.paymentId || !['approve', 'reject'].includes(body.action)) {
      return NextResponse.json({ success: false, error: 'Invalid review request' }, { status: 400 });
    }

    const db = getSupabaseServiceRole();
    const { data: rows, error: lookupError } = await db
      .from('payments')
      .select('id, status, review_status, provider')
      .eq('id', body.paymentId)
      .limit(1);
    if (lookupError) throw lookupError;
    const payment = rows?.[0];
    if (!payment) return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
    if (payment.provider !== 'manual') {
      return NextResponse.json({ success: false, error: 'Only manual payments require admin review' }, { status: 400 });
    }

    if (body.action === 'reject') {
      if (payment.status === 'paid') {
        return NextResponse.json({ success: false, error: 'Paid payment cannot be rejected' }, { status: 409 });
      }
      const now = new Date().toISOString();
      const { error } = await db.from('payments').update({
        status: 'rejected',
        review_status: 'rejected',
        reviewed_by: authorization.user.id,
        reviewed_at: now,
        rejection_reason: body.rejectionReason || null,
        updated_at: now,
      }).eq('id', body.paymentId).neq('status', 'paid');
      if (error) throw error;
      return NextResponse.json({ success: true, paymentId: body.paymentId, status: 'rejected' });
    }

    const { data: activatedRows, error: approveError } = await db.rpc('approve_manual_payment', {
      p_payment_id: body.paymentId,
      p_reviewed_by: authorization.user.id,
    });
    if (approveError) throw approveError;
    const activation = {
      paymentId: body.paymentId,
      activatedPlayerIds: (activatedRows || []).map((row: any) => String(row.target_player_id)),
    };

    return NextResponse.json({ success: true, paymentId: body.paymentId, status: 'paid', activation });
  } catch (error) {
    console.error('❌ [Manual Payment Review] Failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
