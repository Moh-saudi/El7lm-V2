import { NextRequest, NextResponse } from 'next/server';
import { BEON_V3_CONFIG, createBeOnHeaders } from '@/lib/beon/config';

export async function GET(request: NextRequest) {
  try {
    console.log('💰 [API /beon/check-balance] فحص الرصيد');

    // محاولة استدعاء endpoint الحساب
    const url = `${BEON_V3_CONFIG.BASE_URL}${BEON_V3_CONFIG.ENDPOINTS.ACCOUNT_DETAILS}`;
    const headers = createBeOnHeaders();

    console.log('💰 [API /beon/check-balance] الطلب:', {
      url,
      headers: { ...headers, 'beon-token': headers['beon-token'] ? '***' + headers['beon-token'].slice(-4) : 'N/A' }
    });

    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    const responseData = await response.json();
    console.log('💰 [API /beon/check-balance] الاستجابة:', { status: response.status, data: responseData });

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: 'تم فحص الرصيد بنجاح',
        data: {
          balance: responseData.balance || 0,
          currency: responseData.currency || 'USD',
          status: responseData.status || 'active',
          raw: responseData
        },
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        success: false,
        error: `فشل في فحص الرصيد: ${response.status}`,
        message: 'قد لا يدعم BeOn V3 API هذا الـ endpoint',
        data: responseData
      }, { status: response.status });
    }

  } catch (error: any) {
    console.error('❌ [API /beon/check-balance] خطأ:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'حدث خطأ في فحص الرصيد',
      details: error.toString()
    }, { status: 500 });
  }
}

