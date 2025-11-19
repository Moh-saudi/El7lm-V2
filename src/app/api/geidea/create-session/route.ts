import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

// Ensure this route is always dynamic and runs on Node.js runtime to avoid stale deployments
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, currency, orderId, customerEmail, customerName, returnUrl: requestReturnUrl, callbackUrl: requestCallbackUrl } = body;

    // التحقق من البيانات المطلوبة (لا نلزم orderId القادم من العميل؛ سنُولِّده داخليًا)
    if (!amount || !currency || !customerEmail) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: 'amount, currency, and customerEmail are required'
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


    // تطبيع العملة وإنشاء timestamp للتوقيع حسب الوثيقة الرسمية (Y/m/d H:i:s)
    const now = new Date();
    const currencyCode = String(currency || 'EGP').toUpperCase();
    const timestamp = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    // إنشاء معرف طلب آمن ومتوافق مع متطلبات Geidea (أحرف وأرقام فقط، يبدأ بحروف)
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    const finalOrderId = `EL7LM${Date.now()}${rand}`.slice(0, 30); // أقصى 30 حرفًا

    // إنشاء signature حسب وثائق Geidea
    const signature = generateSignature(
      geideaConfig.merchantPublicKey,
      amount,
      currencyCode,
      finalOrderId,
      geideaConfig.apiPassword,
      timestamp
    );

    // استخدام returnUrl و callbackUrl من الطلب إذا كانا متوفرين، وإلا استخدم القيم الافتراضية
    // التأكد من استخدام URL مطلق وصحيح
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    
    // إذا لم يكن baseUrl محدداً في البيئة، استخدم origin من الطلب
    if (!baseUrl) {
      const requestOrigin = request.headers.get('origin') || request.headers.get('referer')?.split('/').slice(0, 3).join('/');
      baseUrl = requestOrigin || 'https://el7lm-backup.vercel.app';
    }
    
    // التأكد من أن baseUrl يبدأ بـ http:// أو https://
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
    
    // إزالة أي مسافات أو أحرف غير صالحة
    baseUrl = baseUrl.trim();
    
    // التأكد من عدم وجود مسار في baseUrl
    try {
      const url = new URL(baseUrl);
      baseUrl = `${url.protocol}//${url.host}`;
      
      // إذا كان localhost، استخدم URL الإنتاج الافتراضي بدلاً منه
      // لأن Geidea لا يقبل localhost URLs
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname.includes('localhost')) {
        baseUrl = 'https://www.el7lm.com';
      }
    } catch (e) {
      // إذا فشل parsing، استخدم القيمة الافتراضية
      baseUrl = 'https://www.el7lm.com';
    }
    
    const defaultCallbackUrl = `${baseUrl}/api/geidea/callback`;
    
    // تحديد returnUrl افتراضي بناءً على orderId
    let defaultReturnUrl = `${baseUrl}/dashboard/shared/bulk-payment?status=success`;
    if (orderId && orderId.includes('TOURNAMENT')) {
      // إذا كان orderId يحتوي على "TOURNAMENT"، استخدم returnUrl للتسجيل في البطولة
      defaultReturnUrl = `${baseUrl}/tournaments/unified-registration?payment=success`;
    }
    
    // معالجة requestReturnUrl وتحويله إلى URL مطلق إذا لزم الأمر
    let finalReturnUrl = defaultReturnUrl;
    if (requestReturnUrl) {
      if (requestReturnUrl.startsWith('/')) {
        // إذا كان نسبي (يبدأ بـ /)، أضفه إلى baseUrl
        finalReturnUrl = `${baseUrl}${requestReturnUrl}`;
      } else if (requestReturnUrl.startsWith('http://') || requestReturnUrl.startsWith('https://')) {
        // إذا كان مطلق، استخدمه مباشرة
        finalReturnUrl = requestReturnUrl;
      } else {
        // إذا كان بدون /، أضفه
        finalReturnUrl = `${baseUrl}/${requestReturnUrl}`;
      }
    }
    
    // معالجة requestCallbackUrl
    let finalCallbackUrl = requestCallbackUrl || defaultCallbackUrl;
    if (requestCallbackUrl && requestCallbackUrl.startsWith('/') && !requestCallbackUrl.startsWith('http')) {
      finalCallbackUrl = `${baseUrl}${requestCallbackUrl}`;
    }
    
    // إنشاء payload للدفع حسب وثائق Geidea HPP Checkout v2
    const paymentPayload = {
      amount: amount,
      currency: currencyCode,
      merchantReferenceId: finalOrderId,
      timestamp: timestamp,
      signature: signature,
      callbackUrl: defaultCallbackUrl, // سيتم تحديثه لاحقاً بعد التحقق النهائي
      language: 'ar',
      returnUrl: defaultReturnUrl, // سيتم تحديثه لاحقاً بعد التحقق النهائي
      customer: {
        email: customerEmail,
        firstName: customerName.split(' ')[0] || 'Customer',
        lastName: customerName.split(' ').slice(1).join(' ') || 'Name'
      }
    };

    // تحديد API endpoint الصحيح حسب وثائق Geidea
    const apiEndpoint = `${geideaConfig.baseUrl}/payment-intent/api/v2/direct/session`;
    
    // التأكد من أن URLs مطلقة وصحيحة ولا تحتوي على localhost
    if (!finalCallbackUrl.startsWith('http://') && !finalCallbackUrl.startsWith('https://')) {
      throw new Error(`Invalid callbackUrl: ${finalCallbackUrl} - must be absolute URL`);
    }
    if (!finalReturnUrl.startsWith('http://') && !finalReturnUrl.startsWith('https://')) {
      throw new Error(`Invalid returnUrl: ${finalReturnUrl} - must be absolute URL`);
    }
    
    // التأكد من عدم وجود localhost في URLs (Geidea لا يقبل localhost)
    if (finalCallbackUrl.includes('localhost') || finalCallbackUrl.includes('127.0.0.1')) {
      finalCallbackUrl = defaultCallbackUrl;
    }
    if (finalReturnUrl.includes('localhost') || finalReturnUrl.includes('127.0.0.1')) {
      finalReturnUrl = defaultReturnUrl;
    }
    
    // تحديث payload بالـ URLs النهائية
    paymentPayload.callbackUrl = finalCallbackUrl;
    paymentPayload.returnUrl = finalReturnUrl;

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

      if (!geideaResponse.ok) {
        const errorText = await geideaResponse.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }

        return NextResponse.json(
          {
            error: 'Geidea API error',
            details: errorData.detailedResponseMessage || errorData.responseMessage || errorText,
            responseCode: errorData.responseCode,
            detailedResponseCode: errorData.detailedResponseCode,
            status: geideaResponse.status,
            troubleshooting: getTroubleshootingTips(errorData.responseCode, errorData.detailedResponseCode)
          },
          { status: geideaResponse.status }
        );
      }

      const geideaData = await geideaResponse.json();

      // التحقق من نجاح الاستجابة
      if (geideaData.responseCode !== "000" || geideaData.detailedResponseCode !== "000") {

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
        orderId: finalOrderId,
        merchantReferenceId: finalOrderId,
        amount: amount,
        currency: currencyCode,
        status: 'created',
        responseCode: geideaData.responseCode,
        responseMessage: geideaData.responseMessage,
        redirectUrl: geideaData.session?.redirectUrl,
        fullResponse: geideaData
      });

    } catch (fetchError) {
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

    if (detailedResponseCode === "009") {
      tips.push("callbackUrl غير صحيح - يجب أن يكون URL مطلق (يبدأ بـ http:// أو https://)");
      tips.push("تأكد من أن callbackUrl مسجل في لوحة تحكم Geidea");
      tips.push("تأكد من أن callbackUrl لا يحتوي على localhost في بيئة الإنتاج");
      tips.push("callbackUrl يجب أن يكون: https://yourdomain.com/api/geidea/callback");
    }

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
