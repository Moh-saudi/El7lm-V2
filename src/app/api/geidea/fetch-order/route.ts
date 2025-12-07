import { NextRequest, NextResponse } from 'next/server';

import { GeideaMode, getGeideaEnvConfig, getGeideaMode } from '@/lib/geidea/config';
import { processGeideaOrderResponse } from '@/lib/geidea/callback-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const buildEndpoint = (baseUrl: string, orderId?: string, merchantReferenceId?: string) => {
  const baseEndpoint = `${baseUrl.replace(/\/$/, '')}/pgw/api/v1/direct/order`;

  // التحقق من أن orderId هو GUID صالح (x-x-x-x-x)
  const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (orderId && guidRegex.test(orderId)) {
    // استخدام path parameter لـ orderId فقط إذا كان GUID صالح
    return `${baseEndpoint}/${orderId}`;
  }

  if (merchantReferenceId) {
    // استخدام query parameter لـ merchantReferenceId
    return `${baseEndpoint}?MerchantReferenceId=${encodeURIComponent(merchantReferenceId)}`;
  }

  throw new Error('Either a valid orderId (GUID) or merchantReferenceId is required');
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const envParam = searchParams.get('env') as GeideaMode | null;
    const env: GeideaMode = envParam === 'test' || envParam === 'live' ? envParam : await getGeideaMode();
    const orderId = searchParams.get('orderId') || undefined;
    const merchantReferenceId = searchParams.get('merchantReferenceId') || undefined;

    if (!orderId && !merchantReferenceId) {
      return NextResponse.json(
        { success: false, error: 'يجب إدخال orderId أو merchantReferenceId' },
        { status: 400 }
      );
    }

    const credentials = getGeideaEnvConfig(env);

    if (!credentials.merchantPublicKey || !credentials.apiPassword) {
      return NextResponse.json(
        {
          success: false,
          error: `مفاتيح ${env === 'live' ? 'البيئة الحية' : 'بيئة الاختبار'} غير مكتملة. يرجى ضبط المتغيرات البيئية.`,
        },
        { status: 500 }
      );
    }

    const endpoint = buildEndpoint(credentials.baseUrl, orderId, merchantReferenceId);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(
          `${credentials.merchantPublicKey}:${credentials.apiPassword}`
        ).toString('base64')}`,
        Accept: 'application/json',
      },
    });

    const text = await response.text();
    let data: any = text;
    try {
      data = JSON.parse(text);
    } catch {
      // keep as text
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'تعذر جلب بيانات المعاملة من Geidea',
          status: response.status,
          statusText: response.statusText,
          response: data,
          environment: env,
        },
        { status: 200 }
      );
    }

    // التحقق من وجود save parameter
    const shouldSave = searchParams.get('save') === 'true';

    let savedData = null;
    if (shouldSave && data?.order) {
      try {
        savedData = await processGeideaOrderResponse(data);
        console.log('✅ [Geidea Fetch Order] Order saved to Firestore:', {
          orderId: savedData.orderId,
          status: savedData.status,
        });
      } catch (saveError) {
        console.error('❌ [Geidea Fetch Order] Failed to save order:', saveError);
        // لا نرمي الخطأ، فقط نعيد البيانات المسترجعة
      }
    }

    return NextResponse.json({
      success: true,
      environment: env,
      endpoint,
      orderId,
      merchantReferenceId,
      data,
      saved: shouldSave ? (savedData !== null) : undefined,
      savedData: savedData || undefined,
    });
  } catch (error) {
    console.error('❌ [Geidea Fetch Order] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'حدث خطأ غير معروف أثناء جلب بيانات المعاملة',
      },
      { status: 500 }
    );
  }
}

