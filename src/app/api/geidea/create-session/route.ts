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

    // إعدادات Geidea الحقيقية
    const geideaConfig = {
      merchantId: process.env.GEIDEA_MERCHANT_ID,
      apiKey: process.env.GEIDEA_API_KEY,
      baseUrl: process.env.GEIDEA_BASE_URL || 'https://api.geidea.net',
      environment: process.env.GEIDEA_ENVIRONMENT || 'sandbox'
    };

    // التحقق من وجود الإعدادات المطلوبة
    if (!geideaConfig.merchantId || !geideaConfig.apiKey) {
      console.error('❌ [Geidea API] Missing required configuration:', {
        hasMerchantId: !!geideaConfig.merchantId,
        hasApiKey: !!geideaConfig.apiKey
      });
      
      return NextResponse.json(
        { 
          error: 'Geidea configuration missing',
          details: 'GEIDEA_MERCHANT_ID and GEIDEA_API_KEY environment variables are required. Please contact Geidea support to get your credentials.',
          instructions: [
            '1. Contact Geidea support to get your merchant credentials',
            '2. Set GEIDEA_MERCHANT_ID environment variable',
            '3. Set GEIDEA_API_KEY environment variable',
            '4. Optionally set GEIDEA_BASE_URL and GEIDEA_ENVIRONMENT'
          ]
        },
        { status: 500 }
      );
    }

    console.log('🔧 [Geidea API] Configuration loaded:', {
      hasMerchantId: !!geideaConfig.merchantId,
      hasApiKey: !!geideaConfig.apiKey,
      environment: geideaConfig.environment,
      baseUrl: geideaConfig.baseUrl
    });

    // إنشاء payload للدفع حسب وثائق Geidea
    const paymentPayload = {
      merchantId: geideaConfig.merchantId,
      amount: amount,
      currency: currency,
      orderId: orderId,
      customerEmail: customerEmail,
      customerName: customerName || 'Customer',
      callbackUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://el7lm-backup.vercel.app'}/api/geidea/callback`,
      returnUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://el7lm-backup.vercel.app'}/dashboard/player/payment-success`,
      cancelUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://el7lm-backup.vercel.app'}/dashboard/player/payment-cancelled`,
      merchantReference: orderId,
      language: 'ar',
      country: 'SA',
      // إعدادات إضافية لـ Geidea
      paymentMethod: 'ALL',
      showCustomerInfo: true,
      showBillingInfo: true,
      showShippingInfo: false
    };

    // تحديد API endpoint الصحيح حسب بيئة Geidea
    const apiEndpoint = geideaConfig.environment === 'production' 
      ? `${geideaConfig.baseUrl}/api/payment/init`
      : `${geideaConfig.baseUrl}/api/payment/init`; // نفس endpoint للاختبار والإنتاج

    console.log('📤 [Geidea API] Sending request to Geidea:', {
      url: apiEndpoint,
      merchantId: geideaConfig.merchantId,
      orderId: orderId,
      amount: amount,
      currency: currency,
      environment: geideaConfig.environment
    });

    try {
      // إرسال الطلب إلى Geidea مع headers صحيحة
      const geideaResponse = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${geideaConfig.apiKey}`,
          'Accept': 'application/json',
          'User-Agent': 'El7lm-Payment-Integration/1.0',
          'X-Merchant-ID': geideaConfig.merchantId
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
        sessionId: geideaData.sessionId || geideaData.id,
        status: geideaData.status
      });

      // إرجاع البيانات المطلوبة للعميل
      return NextResponse.json({
        success: true,
        sessionId: geideaData.sessionId || geideaData.id,
        paymentUrl: geideaData.paymentUrl || geideaData.url,
        orderId: orderId,
        amount: amount,
        currency: currency,
        status: geideaData.status || 'created',
        geideaData: geideaData
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
