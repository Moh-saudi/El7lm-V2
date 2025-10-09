import { NextRequest, NextResponse } from 'next/server';
import { BEON_V3_CONFIG, createBeOnHeaders } from '@/lib/beon/config';

export async function POST(request: NextRequest) {
  try {
    const { phone, message } = await request.json();

    console.log('🧪 [API /beon/test-real-delivery] اختبار التوصيل الحقيقي:', { phone, messageLength: message?.length });

    if (!phone || !message) {
      return NextResponse.json({
        success: false,
        error: 'رقم الهاتف والرسالة مطلوبان'
      }, { status: 400 });
    }

    // تنظيف رقم الهاتف
    const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');

    // الطلب الفعلي لـ BeOn V3
    const url = `${BEON_V3_CONFIG.BASE_URL}${BEON_V3_CONFIG.ENDPOINTS.SMS_BULK}`;
    const headers = createBeOnHeaders();
    const body = {
      phoneNumbers: [cleanPhone],
      message: message,
      sender: BEON_V3_CONFIG.DEFAULTS.SENDER_NAME,
      lang: BEON_V3_CONFIG.DEFAULTS.LANGUAGE
    };

    console.log('🧪 [test-real-delivery] الطلب الكامل:', {
      url,
      headers: { ...headers, 'beon-token': headers['beon-token'] ? '***' + headers['beon-token'].slice(-4) : 'N/A' },
      body
    });

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    let responseData;
    const responseText = await response.text();
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { rawText: responseText };
    }

    console.log('🧪 [test-real-delivery] الاستجابة:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData
    });

    return NextResponse.json({
      success: response.ok,
      message: response.ok ? 'تم إرسال الرسالة بنجاح' : `فشل الإرسال: ${response.status} ${response.statusText}`,
      data: {
        request: {
          url,
          method: 'POST',
          headers: { ...headers, 'beon-token': headers['beon-token'] ? '***' + headers['beon-token'].slice(-4) : 'N/A' },
          body
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseData
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ [test-real-delivery] خطأ:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'حدث خطأ في اختبار التوصيل',
      details: error.toString()
    }, { status: 500 });
  }
}

