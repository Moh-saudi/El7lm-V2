import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, currency, orderId, customerEmail, customerName } = body;

    console.log('🚀 [Geidea API] Creating payment session:', {
      amount,
      currency,
      orderId,
      customerEmail,
      customerName
    });

    // التحقق من البيانات المطلوبة
    if (!amount || !currency || !orderId || !customerEmail) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: 'amount, currency, orderId, and customerEmail are required'
        },
        { status: 400 }
      );
    }

    // إعدادات Geidea حسب الوثائق الرسمية
    const geideaConfig = {
      merchantPublicKey: process.env.GEIDEA_MERCHANT_PUBLIC_KEY,
      apiPassword: process.env.GEIDEA_API_PASSWORD,
      baseUrl: process.env.GEIDEA_BASE_URL || 'https://api.merchant.geidea.net',
      environment: process.env.GEIDEA_ENVIRONMENT || 'production'
    };

    // التحقق من وجود الإعدادات المطلوبة
    if (!geideaConfig.merchantPublicKey || !geideaConfig.apiPassword) {
      console.error('❌ [Geidea API] Missing required configuration:', {
        hasMerchantPublicKey: !!geideaConfig.merchantPublicKey,
        hasApiPassword: !!geideaConfig.apiPassword
      });

      return NextResponse.json(
        {
          error: 'Geidea configuration missing',
          details: 'GEIDEA_MERCHANT_PUBLIC_KEY and GEIDEA_API_PASSWORD environment variables are required.',
          instructions: [
            '1. Set GEIDEA_MERCHANT_PUBLIC_KEY environment variable (your merchant public key)',
            '2. Set GEIDEA_API_PASSWORD environment variable (your API password)',
            '3. Optionally set GEIDEA_BASE_URL and GEIDEA_ENVIRONMENT'
          ]
        },
        { status: 500 }
      );
    }

    console.log('🔧 [Geidea API] Configuration loaded:', {
      hasMerchantPublicKey: !!geideaConfig.merchantPublicKey,
      hasApiPassword: !!geideaConfig.apiPassword,
      environment: geideaConfig.environment,
      baseUrl: geideaConfig.baseUrl
    });

    // إنشاء timestamp للتوقيع حسب الوثيقة الرسمية (Y/m/d H:i:s)
    const now = new Date();
    const timestamp = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    // إنشاء معرف طلب آمن ومتوافق مع متطلبات Geidea (أحرف وأرقام فقط، يبدأ بحروف)
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    const finalOrderId = `EL7LM${Date.now()}${rand}`.slice(0, 30); // أقصى 30 حرفًا

    // إنشاء signature حسب وثائق Geidea
    const signature = generateSignature(
      geideaConfig.merchantPublicKey,
      amount,
      currency,
      finalOrderId,
      geideaConfig.apiPassword,
      timestamp
    );

    // إنشاء payload للدفع حسب وثائق Geidea HPP Checkout v2
    const paymentPayload = {
      amount: amount,
      currency: currency,
      merchantReferenceId: finalOrderId,
      timestamp: timestamp,
      signature: signature,
      callbackUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://el7lm-backup.vercel.app'}/api/geidea/callback`,
      language: 'ar',
      returnUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://el7lm-backup.vercel.app'}/dashboard/shared/bulk-payment?status=success`,
      customer: {
        email: customerEmail,
        firstName: customerName.split(' ')[0] || 'Customer',
        lastName: customerName.split(' ').slice(1).join(' ') || 'Name'
      }
    };

    // تحديد API endpoint الصحيح حسب وثائق Geidea
    const apiEndpoint = `${geideaConfig.baseUrl}/payment-intent/api/v2/direct/session`;

    console.log('📤 [Geidea API] Sending request to Geidea:', {
      url: apiEndpoint,
      merchantPublicKey: geideaConfig.merchantPublicKey,
      originalOrderId: orderId,
      finalOrderId: finalOrderId,
      amount: amount,
      currency: currency,
      environment: geideaConfig.environment,
      payload: paymentPayload
    });

    try {
      // إرسال الطلب إلى Geidea مع Basic Authentication حسب الوثائق
      const authString = Buffer.from(`${geideaConfig.merchantPublicKey}:${geideaConfig.apiPassword}`).toString('base64');

      const geideaResponse = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(paymentPayload)
      });

      console.log('📥 [Geidea API] Response status:', geideaResponse.status);

      if (!geideaResponse.ok) {
        const errorText = await geideaResponse.text();
        console.error('❌ [Geidea API] Error response:', {
          status: geideaResponse.status,
          statusText: geideaResponse.statusText,
          body: errorText
        });

        return NextResponse.json(
          {
            error: 'Geidea API error',
            details: errorText,
            status: geideaResponse.status
          },
          { status: geideaResponse.status }
        );
      }

      const geideaData = await geideaResponse.json();

      console.log('✅ [Geidea API] Payment session created successfully:', {
        orderId: orderId,
        sessionId: geideaData.session?.id,
        responseCode: geideaData.responseCode,
        responseMessage: geideaData.responseMessage
      });

      // التحقق من نجاح الاستجابة
      if (geideaData.responseCode !== "000" || geideaData.detailedResponseCode !== "000") {
        console.error('❌ [Geidea API] Error in response:', {
          responseCode: geideaData.responseCode,
          detailedResponseCode: geideaData.detailedResponseCode,
          responseMessage: geideaData.responseMessage,
          detailedResponseMessage: geideaData.detailedResponseMessage,
          fullResponse: geideaData
        });

        return NextResponse.json(
          {
            error: 'Geidea API error',
            details: geideaData.detailedResponseMessage || geideaData.responseMessage,
            responseCode: geideaData.responseCode,
            detailedResponseCode: geideaData.detailedResponseCode,
            troubleshooting: getTroubleshootingTips(geideaData.responseCode, geideaData.detailedResponseCode)
          },
          { status: 400 }
        );
      }

      // إرجاع البيانات المطلوبة للعميل
      return NextResponse.json({
        success: true,
        sessionId: geideaData.session?.id,
        orderId: orderId,
        amount: amount,
        currency: currency,
        status: 'created',
        responseCode: geideaData.responseCode,
        responseMessage: geideaData.responseMessage
      });

    } catch (fetchError) {
      console.error('❌ [Geidea API] Fetch error:', fetchError);

      return NextResponse.json(
        {
          error: 'Geidea API connection failed',
          details: fetchError instanceof Error ? fetchError.message : 'Unknown fetch error',
          troubleshooting: [
            '1. Check your internet connection',
            '2. Verify Geidea API endpoint is accessible',
            '3. Contact Geidea support if the issue persists'
          ]
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ [Geidea API] Unexpected error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// دالة إنشاء التوقيع حسب وثائق Geidea
function generateSignature(
  merchantPublicKey: string,
  amount: number,
  currency: string,
  merchantReferenceId: string,
  apiPassword: string,
  timestamp: string
): string {
  // تنسيق المبلغ بمنزلتين عشريتين
  const amountStr = amount.toFixed(2);

  // إنشاء البيانات للتوقيع
  const data = `${merchantPublicKey}${amountStr}${currency}${merchantReferenceId}${timestamp}`;

  // إنشاء التوقيع باستخدام HMAC-SHA256
  const hash = crypto.createHmac('sha256', apiPassword).update(data).digest('base64');

  return hash;
}

// دالة نصائح الاستكشاف للأخطاء
function getTroubleshootingTips(responseCode: string, detailedResponseCode: string): string[] {
  const tips: string[] = [];

  if (responseCode === "110") {
    tips.push("خطأ في معاملات الطلب");

    if (detailedResponseCode === "031") {
      tips.push("merchantReferenceId غير صحيح - يجب أن يحتوي على أحرف وأرقام وشرطات فقط");
      tips.push("تأكد من أن merchantReferenceId لا يحتوي على مسافات أو رموز خاصة");
      tips.push("يجب أن يكون طول merchantReferenceId أقل من 50 حرف");
    }
  }

  if (responseCode === "100") {
    tips.push("خطأ في المصادقة");
    tips.push("تحقق من صحة GEIDEA_MERCHANT_PUBLIC_KEY");
    tips.push("تحقق من صحة GEIDEA_API_PASSWORD");
  }

  if (responseCode === "200") {
    tips.push("خطأ في التوقيع");
    tips.push("تحقق من صحة التوقيع (signature)");
    tips.push("تأكد من استخدام نفس البيانات في إنشاء التوقيع");
  }

  if (tips.length === 0) {
    tips.push("راجع وثائق Geidea للحصول على تفاصيل أكثر");
    tips.push("تواصل مع دعم Geidea إذا استمر الخطأ");
  }

  return tips;
}

// دعم OPTIONS للـ CORS
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
