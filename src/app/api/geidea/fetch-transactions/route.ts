import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

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

    try {
      const geideaData = await geideaResponse.json();
      console.log(`✅ [Geidea Fetch] Received ${geideaData?.transactions?.length || 0} transactions from Geidea`);

      const db = getSupabaseAdmin();
      const processedTransactions = [];

      if (geideaData?.transactions && Array.isArray(geideaData.transactions)) {
        for (const transaction of geideaData.transactions) {
          try {
            const orderId = transaction.orderId || transaction.id;
            const merchantRefId = transaction.merchantReferenceId || transaction.reference;
            const transactionStatus = transaction.status ||
                                     (transaction.responseCode === '000' ? 'success' : 'failed') ||
                                     'pending';

            if (!orderId && !merchantRefId) {
              console.warn('⚠️ [Geidea Fetch] Transaction missing orderId and merchantReferenceId:', transaction);
              continue;
            }

            const documentId = orderId || merchantRefId;
            const now = new Date().toISOString();

            // Check if exists
            const { data: existing } = await db.from('geidea_payments').select('id').eq('id', documentId).limit(1);

            const docData = {
              id: documentId,
              orderId: orderId || null,
              merchantReferenceId: merchantRefId || null,
              geideaOrderId: orderId || null,
              ourMerchantReferenceId: merchantRefId || null,
              transactionId: transaction.transactionId || transaction.id || null,
              status: transactionStatus,
              amount: transaction.amount || null,
              currency: transaction.currency || 'EGP',
              responseCode: transaction.responseCode || null,
              detailedResponseCode: transaction.detailedResponseCode || null,
              responseMessage: transaction.responseMessage || null,
              detailedResponseMessage: transaction.detailedResponseMessage || null,
              customerEmail: transaction.customerEmail || transaction.customer?.email || null,
              customerName: transaction.customerName || transaction.customer?.name || null,
              customerPhone: transaction.customerPhone || transaction.customer?.phone || null,
              paidAt: transaction.paidAt || transaction.timestamp || null,
              rawTransactionData: transaction,
              fetchedFromGeideaAt: now,
              paymentMethod: 'geidea',
              source: 'geidea_api_fetch',
              updatedAt: now,
              ...(!existing?.length ? { createdAt: now } : {}),
            };

            await db.from('geidea_payments').upsert(docData);

            processedTransactions.push({
              ...docData,
              wasNew: !existing?.length,
            });
          } catch (error) {
            console.error('❌ [Geidea Fetch] Error processing transaction:', error, transaction);
          }
        }
      }

      return NextResponse.json({
        success: true,
        total: geideaData?.total || processedTransactions.length,
        transactions: processedTransactions,
        fetchedAt: new Date().toISOString(),
        geideaResponse: geideaData,
      });

    } catch (fetchError) {
      console.error('❌ [Geidea Fetch] Fetch error:', fetchError);
      let errorMessage = 'فشل الاتصال بـ Geidea API';
      if (fetchError instanceof Error) {
        if (fetchError.message.includes('fetch')) errorMessage = 'فشل الاتصال بالشبكة';
        else if (fetchError.message.includes('timeout')) errorMessage = 'انتهت مهلة الاتصال';
        else errorMessage = `خطأ في الاتصال: ${fetchError.message}`;
      }
      return NextResponse.json(
        { success: false, error: errorMessage, details: fetchError instanceof Error ? fetchError.message : 'Unknown error' },
        { status: 200 }
      );
    }

  } catch (error) {
    console.error('❌ [Geidea Fetch] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
