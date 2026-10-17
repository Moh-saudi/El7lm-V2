import { NextRequest, NextResponse } from 'next/server';
import { processGeideaCallback } from '@/lib/geidea/callback-handler';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔔 [Geidea Webhook] Received webhook:', body);

    const orderId = body.orderId || body.order_id || body.merchantReferenceId;
    if (!orderId) {
      console.error('❌ [Geidea Webhook] Invalid webhook data: missing orderId', body);
      return NextResponse.json({ error: 'Invalid webhook data' }, { status: 400 });
    }

    // معالجة الـ webhook وتحديث قاعدة البيانات وإرسال الإشعارات وتفعيل الاشتراك تلقائياً
    const processed = await processGeideaCallback(body);

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      orderId: processed.orderId,
      status: processed.status,
    });
  } catch (error) {
    console.error('❌ [Geidea Webhook] Error processing webhook:', error);
    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// دعم OPTIONS للـ CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Geidea-Signature',
    },
  });
}
