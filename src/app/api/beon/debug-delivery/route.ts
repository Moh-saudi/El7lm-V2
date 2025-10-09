import { BEON_V3_CONFIG, createBeOnHeaders } from '@/lib/beon/config';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { phone, message } = await request.json();

    console.log('🔧 [API /beon/debug-delivery] التشخيص العميق:', { phone, message });

    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      config: {
        baseUrl: BEON_V3_CONFIG.BASE_URL,
        tokenSet: !!BEON_V3_CONFIG.TOKEN,
        tokenLength: BEON_V3_CONFIG.TOKEN?.length || 0,
        tokenPreview: BEON_V3_CONFIG.TOKEN ? '***' + BEON_V3_CONFIG.TOKEN.slice(-4) : 'N/A',
        endpoints: BEON_V3_CONFIG.ENDPOINTS,
        defaults: BEON_V3_CONFIG.DEFAULTS
      },
      environment: {
        BEON_V3_BASE_URL: process.env.BEON_V3_BASE_URL || 'not set',
        BEON_V3_TOKEN: process.env.BEON_V3_TOKEN ? '***' + process.env.BEON_V3_TOKEN.slice(-4) : 'not set',
        BEON_OTP_TOKEN: process.env.BEON_OTP_TOKEN ? '***' + process.env.BEON_OTP_TOKEN.slice(-4) : 'not set',
        BEON_OTP_BASE_URL: process.env.BEON_OTP_BASE_URL || 'not set'
      },
      tests: []
    };

    // اختبار 1: فحص الاتصال بالـ Base URL
    try {
      console.log('🔧 Test 1: فحص الاتصال بالـ Base URL');
      const pingResponse = await fetch(BEON_V3_CONFIG.BASE_URL, {
        method: 'GET'
      });
      diagnostics.tests.push({
        name: 'Base URL Ping',
        success: pingResponse.ok,
        status: pingResponse.status,
        statusText: pingResponse.statusText
      });
    } catch (error: any) {
      diagnostics.tests.push({
        name: 'Base URL Ping',
        success: false,
        error: error.message
      });
    }

    // اختبار 2: فحص الحساب
    try {
      console.log('🔧 Test 2: فحص الحساب');
      const accountUrl = `${BEON_V3_CONFIG.BASE_URL}${BEON_V3_CONFIG.ENDPOINTS.ACCOUNT_DETAILS}`;
      const accountResponse = await fetch(accountUrl, {
        method: 'GET',
        headers: createBeOnHeaders()
      });
      const accountData = await accountResponse.json();
      diagnostics.tests.push({
        name: 'Account Check',
        success: accountResponse.ok,
        status: accountResponse.status,
        data: accountData
      });
    } catch (error: any) {
      diagnostics.tests.push({
        name: 'Account Check',
        success: false,
        error: error.message
      });
    }

    // اختبار 3: محاولة إرسال فعلية
    if (phone && message) {
      try {
        console.log('🔧 Test 3: محاولة إرسال فعلية');
        const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');
        const smsUrl = `${BEON_V3_CONFIG.BASE_URL}${BEON_V3_CONFIG.ENDPOINTS.SMS_BULK}`;
        const smsBody = {
          phoneNumbers: [cleanPhone],
          message: message,
          sender: BEON_V3_CONFIG.DEFAULTS.SENDER_NAME,
          lang: BEON_V3_CONFIG.DEFAULTS.LANGUAGE
        };

        const smsResponse = await fetch(smsUrl, {
          method: 'POST',
          headers: createBeOnHeaders(),
          body: JSON.stringify(smsBody)
        });

        let smsData;
        const smsText = await smsResponse.text();
        try {
          smsData = JSON.parse(smsText);
        } catch {
          smsData = { rawText: smsText };
        }

        diagnostics.tests.push({
          name: 'SMS Send Attempt',
          success: smsResponse.ok,
          status: smsResponse.status,
          statusText: smsResponse.statusText,
          request: {
            url: smsUrl,
            body: smsBody
          },
          response: {
            headers: Object.fromEntries(smsResponse.headers.entries()),
            data: smsData
          }
        });
      } catch (error: any) {
        diagnostics.tests.push({
          name: 'SMS Send Attempt',
          success: false,
          error: error.message
        });
      }
    }

    // الخلاصة
    const successfulTests = diagnostics.tests.filter((t: any) => t.success).length;
    const totalTests = diagnostics.tests.length;

    diagnostics.summary = {
      total: totalTests,
      successful: successfulTests,
      failed: totalTests - successfulTests,
      overallSuccess: successfulTests === totalTests
    };

    console.log('🔧 [debug-delivery] نتائج التشخيص:', diagnostics.summary);

    return NextResponse.json({
      success: true,
      message: `اكتمل التشخيص: ${successfulTests}/${totalTests} اختبار نجح`,
      data: diagnostics
    });

  } catch (error: any) {
    console.error('❌ [debug-delivery] خطأ:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'حدث خطأ في التشخيص',
      details: error.toString()
    }, { status: 500 });
  }
}

