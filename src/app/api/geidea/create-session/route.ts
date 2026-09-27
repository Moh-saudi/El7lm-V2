/**
 * Geidea Create Session Route - إنشاء جلسة دفع جديدة
 * 
 * هذا الـ route يستخدم المكتبة المركزية لإنشاء جلسات الدفع
 * ويعمل مع جميع الصفحات (بطولات، دفع جماعي، إلخ)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createGeideaSession, GeideaSessionRequest } from '@/lib/geidea/client';
import { createCanonicalPayment, PayerType } from '@/lib/payments/canonical-payment-service';
import { getSupabaseServiceRole } from '@/lib/supabase/admin';
import { authorizeUser } from '@/lib/api/user-auth';
import { resolveAuthenticatedPayer, assertPaymentTargetOwnership } from '@/lib/payments/payer-authorization';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type CreateSessionBody = {
  amount: number;
  currency: string;
  customerEmail: string;
  customerName?: string;
  merchantReferenceId?: string;
  returnUrl?: string;
  callbackUrl?: string;
  metadata?: Record<string, any>;
  payerId?: string;
  payerType?: PayerType;
  planId?: string;
  targetPlayerIds?: string[];
  countryCode?: string;
};

/**
 * POST - إنشاء جلسة دفع جديدة
 */
export async function POST(request: NextRequest) {
  const authorization = await authorizeUser(request);
  if (!authorization.ok) return authorization.response;

  try {
    const body = (await request.json()) as CreateSessionBody;

    // التحقق من البيانات المطلوبة
    if (!body?.customerEmail) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          details: 'customerEmail is required',
        },
        { status: 400 }
      );
    }

    let canonicalPaymentId: string | null = null;
    let sessionAmount = body.amount;
    let sessionCurrency = body.currency;
    let merchantReferenceId = body.merchantReferenceId;

    // Subscription checkout uses the canonical ledger. Other Geidea callers
    // remain compatible until their own domain flows are migrated.
    if (body.payerId && body.payerType && body.planId && body.targetPlayerIds?.length) {
      const payer = await resolveAuthenticatedPayer(authorization.user.id, body.payerType);
      if (!payer || (body.payerId && body.payerId !== payer.payerId)) {
        return NextResponse.json({ success: false, error: 'Payer identity mismatch' }, { status: 403 });
      }
      const targetPlayerIds = await assertPaymentTargetOwnership(payer.payerId, payer.payerType, body.targetPlayerIds);
      const db = getSupabaseServiceRole();
      const { data: plans, error: planError } = await db
        .from('subscription_plans')
        .select('id, base_price, base_currency, overrides, isActive')
        .eq('id', body.planId)
        .limit(1);
      if (planError) throw planError;
      const plan = plans?.[0] as Record<string, any> | undefined;
      if (!plan || plan.isActive === false) {
        return NextResponse.json({ success: false, error: 'Invalid or inactive plan' }, { status: 400 });
      }

      const country = (body.countryCode || 'EG').toUpperCase();
      const override = plan.overrides?.[country];
      const unitPrice = Number(override?.price ?? plan.base_price);
      const currency = String(override?.currency ?? plan.base_currency ?? body.currency).toUpperCase();
      if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error('Invalid plan price');

      sessionAmount = unitPrice * targetPlayerIds.length;
      sessionCurrency = currency;
      const canonical = await createCanonicalPayment({
        payerId: payer.payerId,
        payerType: payer.payerType,
        planId: body.planId,
        countryCode: country,
        amount: sessionAmount,
        currency: sessionCurrency,
        method: 'card',
        provider: 'geidea',
        targetPlayerIds,
        metadata: { checkout_source: 'geidea_create_session' },
      });
      canonicalPaymentId = canonical.id;
      merchantReferenceId = canonical.id;
    }

    // استخدام المكتبة المركزية
    const sessionRequest: GeideaSessionRequest = {
      amount: sessionAmount,
      currency: sessionCurrency,
      customerEmail: body.customerEmail,
      customerName: body.customerName,
      merchantReferenceId,
      returnUrl: body.returnUrl,
      callbackUrl: body.callbackUrl,
      metadata: body.metadata,
    };

    const result = await createGeideaSession(sessionRequest);

    if (!result.success) {
      if (canonicalPaymentId) {
        const db = getSupabaseServiceRole();
        await db.from('payments').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', canonicalPaymentId);
      }
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to create session',
          details: result.details || 'Unknown error',
        },
        { status: 400 }
      );
    }

    if (canonicalPaymentId) {
      const db = getSupabaseServiceRole();
      await db.from('payments').update({
        status: 'processing',
        provider_reference_id: result.orderId || result.sessionId || null,
        updated_at: new Date().toISOString(),
      }).eq('id', canonicalPaymentId);
    }

    return NextResponse.json({
      success: true,
      canonicalPaymentId,
      sessionId: result.sessionId,
      orderId: result.orderId,
      redirectUrl: result.redirectUrl,
      message: result.message,
    });
  } catch (error) {
    console.error('❌ [Geidea Create Session] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS - للـ CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
