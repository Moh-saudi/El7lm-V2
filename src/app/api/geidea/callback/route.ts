import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('🔄 [Geidea Callback] Received payment callback:', body);

    // التحقق من صحة البيانات
    if (!body.orderId || !body.status) {
      console.error('❌ [Geidea Callback] Invalid callback data:', body);
      return NextResponse.json(
        { error: 'Invalid callback data' },
        { status: 400 }
      );
    }

    const { orderId, status, transactionId, amount, currency } = body;

    // تحديث حالة الدفع في قاعدة البيانات
    try {
      // هنا يمكنك إضافة منطق لتحديث حالة الدفع في Firebase
      console.log('💾 [Geidea Callback] Updating payment status:', {
        orderId,
        status,
        transactionId,
        amount,
        currency
      });

      // TODO: إضافة منطق تحديث قاعدة البيانات
      // await updatePaymentStatus(orderId, status, transactionId);

    } catch (dbError) {
      console.error('❌ [Geidea Callback] Database update failed:', dbError);
      // لا نوقف العملية إذا فشل تحديث قاعدة البيانات
    }

    // إرسال إشعار للمستخدم إذا كان الدفع ناجحاً
    if (status === 'success' || status === 'completed') {
      console.log('✅ [Geidea Callback] Payment successful:', orderId);

      // TODO: إرسال إشعار للمستخدم
      // await sendPaymentSuccessNotification(orderId);
    } else if (status === 'failed' || status === 'cancelled') {
      console.log('❌ [Geidea Callback] Payment failed:', orderId);

      // TODO: إرسال إشعار فشل الدفع
      // await sendPaymentFailureNotification(orderId);
    }

    return NextResponse.json({
      success: true,
      message: 'Callback processed successfully',
      orderId,
      status
    });

  } catch (error) {
    console.error('❌ [Geidea Callback] Error processing callback:', error);

    return NextResponse.json(
      {
        error: 'Callback processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// دعم GET للتحقق من حالة الدفع
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    console.log('🔍 [Geidea Callback] Checking payment status for order:', orderId);

    // TODO: جلب حالة الدفع من قاعدة البيانات
    // const paymentStatus = await getPaymentStatus(orderId);

    return NextResponse.json({
      success: true,
      orderId,
      status: 'pending', // TODO: إرجاع الحالة الفعلية
      message: 'Payment status retrieved'
    });

  } catch (error) {
    console.error('❌ [Geidea Callback] Error checking payment status:', error);

    return NextResponse.json(
      {
        error: 'Failed to check payment status',
        details: error instanceof Error ? error.message : 'Unknown error'
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
