import { NextRequest, NextResponse } from 'next/server';

import { processGeideaOrderResponse } from '@/lib/geidea/callback-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/geidea/save-order
 * 
 * حفظ بيانات Order من Fetch Order API في Firestore
 * 
 * Body: { orderData: {...} } - البيانات المسترجعة من Fetch Order API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderData } = body;

    if (!orderData) {
      return NextResponse.json(
        {
          success: false,
          error: 'orderData is required in request body',
        },
        { status: 400 }
      );
    }

    console.log('🔄 [Geidea Save Order] Received order data to save:', {
      orderId: orderData?.order?.orderId || orderData?.orderId,
      merchantReferenceId: orderData?.order?.merchantReferenceId || orderData?.merchantReferenceId,
    });

    const processed = await processGeideaOrderResponse(orderData);

    return NextResponse.json({
      success: true,
      message: 'Order saved successfully to Firestore',
      orderId: processed.orderId,
      merchantReferenceId: processed.merchantReferenceId,
      status: processed.status,
      amount: processed.amount,
      currency: processed.currency,
      savedData: processed,
    });
  } catch (error) {
    console.error('❌ [Geidea Save Order] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'حدث خطأ غير معروف أثناء حفظ بيانات المعاملة',
      },
      { status: 500 }
    );
  }
}

