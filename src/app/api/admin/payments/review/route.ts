import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { activatePaymentSubscriptions } from '@/lib/payments/subscription-activation-service';
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

    const db = getSupabaseAdmin();
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

    if (payment.status !== 'paid') {
      if (payment.status !== 'pending_review' || payment.review_status !== 'pending') {
        return NextResponse.json({ success: false, error: 'Payment is not pending review' }, { status: 409 });
      }
      const now = new Date().toISOString();
      const { error } = await db.from('payments').update({
        status: 'paid',
        review_status: 'approved',
        reviewed_by: authorization.user.id,
        reviewed_at: now,
        paid_at: now,
        updated_at: now,
      }).eq('id', body.paymentId).eq('status', 'pending_review').eq('review_status', 'pending');
      if (error) throw error;
    }

    const activation = await activatePaymentSubscriptions(body.paymentId);
    return NextResponse.json({ success: true, paymentId: body.paymentId, status: 'paid', activation });
  } catch (error) {
    console.error('❌ [Manual Payment Review] Failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
