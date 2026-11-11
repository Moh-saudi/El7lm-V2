/**
 * Geidea Create Session Route - إنشاء جلسة دفع جديدة
 * 
 * هذا الـ route يستخدم المكتبة المركزية لإنشاء جلسات الدفع
 * ويعمل مع جميع الصفحات (بطولات، دفع جماعي، إلخ)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createGeideaSession, GeideaSessionRequest } from '@/lib/geidea/client';

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
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * POST - إنشاء جلسة دفع جديدة
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateSessionBody;

    // التحقق من البيانات المطلوبة
    if (!body?.amount || !body?.currency || !body?.customerEmail) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          details: 'amount, currency, and customerEmail are required',
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // استخدام المكتبة المركزية
    const sessionRequest: GeideaSessionRequest = {
      amount: body.amount,
      currency: body.currency,
      customerEmail: body.customerEmail,
      customerName: body.customerName,
      merchantReferenceId: body.merchantReferenceId,
      returnUrl: body.returnUrl,
      callbackUrl: body.callbackUrl,
      metadata: body.metadata,
    };

    const result = await createGeideaSession(sessionRequest);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to create session',
          details: result.details || 'Unknown error',
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        sessionId: result.sessionId,
        orderId: result.orderId,
        redirectUrl: result.redirectUrl,
        message: result.message,
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('❌ [Geidea Create Session] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

/**
 * OPTIONS - للـ CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}
