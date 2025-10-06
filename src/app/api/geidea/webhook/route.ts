import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('🔔 [Geidea Webhook] Received webhook:', body);

    // التحقق من صحة البيانات
    if (!body.orderId || !body.status) {
      console.error('❌ [Geidea Webhook] Invalid webhook data:', body);
      return NextResponse.json(
        { error: 'Invalid webhook data' },
        { status: 400 }
      );
    }

    const { orderId, status, transactionId, amount, currency, timestamp } = body;

    // التحقق من التوقيع (إذا كان متوفراً)
    const signature = request.headers.get('x-geidea-signature');
    if (signature) {
      // TODO: التحقق من صحة التوقيع
      console.log('🔐 [Geidea Webhook] Signature verification:', signature);
    }

    // تحديث حالة الدفع في قاعدة البيانات
    try {
      console.log('💾 [Geidea Webhook] Updating payment status:', {
        orderId,
        status,
        transactionId,
        amount,
        currency,
        timestamp
      });

      // TODO: إضافة منطق تحديث قاعدة البيانات
      // await updatePaymentStatus(orderId, status, transactionId, {
      //   amount,
      //   currency,
      //   timestamp,
      //   source: 'webhook'
      // });

    } catch (dbError) {
      console.error('❌ [Geidea Webhook] Database update failed:', dbError);
      // لا نوقف العملية إذا فشل تحديث قاعدة البيانات
    }

    // معالجة الحالات المختلفة
    switch (status) {
      case 'success':
      case 'completed':
        console.log('✅ [Geidea Webhook] Payment successful:', orderId);
        // TODO: تفعيل الخدمة أو إرسال إشعار
        // await activateService(orderId);
        // await sendPaymentSuccessNotification(orderId);
        break;

      case 'failed':
      case 'declined':
        console.log('❌ [Geidea Webhook] Payment failed:', orderId);
        // TODO: إرسال إشعار فشل الدفع
        // await sendPaymentFailureNotification(orderId);
        break;

      case 'cancelled':
        console.log('⚠️ [Geidea Webhook] Payment cancelled:', orderId);
        // TODO: إرسال إشعار إلغاء الدفع
        // await sendPaymentCancellationNotification(orderId);
        break;

      case 'refunded':
        console.log('🔄 [Geidea Webhook] Payment refunded:', orderId);
        // TODO: إلغاء تفعيل الخدمة
        // await deactivateService(orderId);
        // await sendRefundNotification(orderId);
        break;

      default:
        console.log('ℹ️ [Geidea Webhook] Unknown status:', status, orderId);
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      orderId,
      status
    });

  } catch (error) {
    console.error('❌ [Geidea Webhook] Error processing webhook:', error);

    return NextResponse.json(
      {
        error: 'Webhook processing failed',
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Geidea-Signature',
    },
  });
}
