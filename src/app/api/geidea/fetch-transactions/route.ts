import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');

    const geideaConfig = {
      merchantPublicKey: process.env.GEIDEA_MERCHANT_PUBLIC_KEY,
      apiPassword: process.env.GEIDEA_API_PASSWORD,
      baseUrl: process.env.GEIDEA_BASE_URL || 'https://api.merchant.geidea.net',
    };

    if (!geideaConfig.merchantPublicKey || !geideaConfig.apiPassword) {
      return NextResponse.json(
        {
          error: 'Geidea configuration missing',
          details: 'GEIDEA_MERCHANT_PUBLIC_KEY and GEIDEA_API_PASSWORD environment variables are required.',
        },
        { status: 500 }
      );
    }

    const possibleEndpoints = [
      `${geideaConfig.baseUrl}/payment-intent/api/v2/direct/orders/search`,
      `${geideaConfig.baseUrl}/payment-intent/api/v2/direct/orders`,
      `${geideaConfig.baseUrl}/payment-intent/api/v2/direct/transactions/search`,
      `${geideaConfig.baseUrl}/payment-intent/api/v2/direct/transactions`,
      `${geideaConfig.baseUrl}/api/v2/orders/search`,
      `${geideaConfig.baseUrl}/api/v2/orders`,
    ];

    const authString = Buffer.from(`${geideaConfig.merchantPublicKey}:${geideaConfig.apiPassword}`).toString('base64');

    const queryParams = new URLSearchParams();
    if (limit) queryParams.append('limit', limit.toString());
    if (offset) queryParams.append('offset', offset.toString());
    if (status && status !== 'all') queryParams.append('status', status);

    let geideaResponse = null;
    let lastError: unknown = null;
    let workingEndpoint = null;

    for (const endpoint of possibleEndpoints) {
      const fullUrl = `${endpoint}?${queryParams.toString()}`;
      console.log(`🔄 [Geidea Fetch] Trying endpoint: ${fullUrl}`);

      try {
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${authString}`,
            'Accept': 'application/json',
          },
        });

        if (response.ok) {
          geideaResponse = response;
          workingEndpoint = endpoint;
          console.log(`✅ [Geidea Fetch] Found working endpoint: ${endpoint}`);
          break;
        } else if (response.status !== 404) {
          const errorText = await response.text();
          lastError = { status: response.status, statusText: response.statusText, endpoint, error: errorText };
          console.warn(`⚠️ [Geidea Fetch] Endpoint ${endpoint} returned ${response.status}: ${errorText}`);
        }
      } catch (error) {
        console.warn(`⚠️ [Geidea Fetch] Error trying endpoint ${endpoint}:`, error);
        if (!lastError) lastError = { endpoint, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    if (!geideaResponse) {
      console.log('ℹ️ [Geidea Fetch] Geidea API لا يوفر endpoint مباشر - هذا متوقع حسب الوثائق الرسمية');
      return NextResponse.json(
        {
          success: false,
          error: 'Geidea API لا يوفر endpoint مباشر لجلب جميع المعاملات',
          details: 'وفقاً لوثائق Geidea الرسمية، لا توفر الشركة API مباشر لاستعراض جميع المعاملات.',
          triedEndpoints: possibleEndpoints,
          lastError,
          suggestion: 'استخدم "تحديث من Supabase" لعرض جميع المعاملات المحفوظة.',
          isExpected: true,
        },
        { status: 200 }
      );
    }

    const geideaData = await geideaResponse.json();
    const transactions = Array.isArray(geideaData?.transactions) ? geideaData.transactions : [];

    // Diagnostic endpoint only. Canonical subscription callbacks are persisted
    // through payments/payment_targets; this endpoint must never repopulate
    // the retired geidea_payments ledger.
    return NextResponse.json({
      success: true,
      source: 'geidea',
      persistence: 'disabled',
      workingEndpoint,
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    console.error('❌ [Geidea Fetch] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
