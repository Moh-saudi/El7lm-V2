import { NextRequest, NextResponse } from 'next/server';
import { BEON_V3_CONFIG, createBeOnHeaders } from '@/lib/beon/config';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [API /beon/account] فحص معلومات الحساب');

    const url = `${BEON_V3_CONFIG.BASE_URL}${BEON_V3_CONFIG.ENDPOINTS.ACCOUNT_DETAILS}`;
    const headers = createBeOnHeaders();

    console.log('🔍 [API /beon/account] الطلب:', {
      url,
      headers: { ...headers, 'beon-token': headers['beon-token'] ? '***' + headers['beon-token'].slice(-4) : 'N/A' }
    });

    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    const responseData = await response.json();
    console.log('🔍 [API /beon/account] الاستجابة:', { status: response.status, data: responseData });

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: 'تم جلب معلومات الحساب بنجاح',
        data: {
          status: responseData.status || 'active',
          balance: responseData.balance || 0,
          currency: responseData.currency || 'USD',
          plan: responseData.plan || 'unknown',
          lastActivity: responseData.lastActivity || new Date().toISOString(),
          limits: responseData.limits || {
            daily: 1000,
            monthly: 10000,
            perMinute: 10
          },
          raw: responseData
        },
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        success: false,
        error: `فشل في جلب معلومات الحساب: ${response.status}`,
        data: responseData
      }, { status: response.status });
    }

  } catch (error: any) {
    console.error('❌ [API /beon/account] خطأ:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'حدث خطأ في جلب معلومات الحساب',
      details: error.toString()
    }, { status: 500 });
  }
}

