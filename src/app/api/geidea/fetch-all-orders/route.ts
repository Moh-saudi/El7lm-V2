import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getGeideaMode, getGeideaEnvConfig } from '@/lib/geidea/config';
import { processGeideaOrderResponse } from '@/lib/geidea/callback-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/geidea/fetch-all-orders
 *
 * جلب المعاملات من Geidea باستخدام merchantReferenceId
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const merchantReferenceIds = body.merchantReferenceIds || [];
    const limit = body.limit || 10;
    let shouldSave = body.save === true;

    const mode = await getGeideaMode();
    const config = getGeideaEnvConfig(mode);

    if (!config.merchantPublicKey || !config.apiPassword) {
      return NextResponse.json(
        {
          success: false,
          error: `مفاتيح ${mode === 'live' ? 'البيئة الحية' : 'بيئة الاختبار'} غير مكتملة`,
        },
        { status: 500 }
      );
    }

    let finalMerchantReferenceIds: string[] = [];

    if (merchantReferenceIds.length === 0) {
      const db = getSupabaseAdmin();
      const { data: payments } = await db
        .from('geidea_payments')
        .select('merchantReferenceId, ourMerchantReferenceId')
        .order('createdAt', { ascending: false })
        .limit(limit);

      const seenIds = new Set<string>();
      (payments ?? []).forEach((row: Record<string, unknown>) => {
        const merchantRefId = String(row.merchantReferenceId || row.ourMerchantReferenceId || '');
        if (merchantRefId && merchantRefId.startsWith('EL7LM') && !seenIds.has(merchantRefId)) {
          finalMerchantReferenceIds.push(merchantRefId);
          seenIds.add(merchantRefId);
        }
      });
    } else {
      finalMerchantReferenceIds = merchantReferenceIds.slice(0, limit);
    }

    console.log(`🔄 [Fetch All Orders] Fetching ${finalMerchantReferenceIds.length} orders from Geidea (save=${shouldSave})`);

    if (finalMerchantReferenceIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'لا توجد معاملات للجلب',
        results: { total: 0, success: 0, failed: 0, notFound: 0, errors: [] },
      });
    }

    const results = {
      success: 0,
      failed: 0,
      notFound: 0,
      errors: [] as string[],
      fetched: [] as Record<string, unknown>[],
    };

    const maxFetch = Math.min(finalMerchantReferenceIds.length, limit);

    for (let i = 0; i < maxFetch; i++) {
      const merchantRefId = finalMerchantReferenceIds[i];

      try {
        const endpoint = `${config.baseUrl.replace(/\/$/, '')}/pgw/api/v1/direct/order?MerchantReferenceId=${encodeURIComponent(merchantRefId)}`;

        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${Buffer.from(
              `${config.merchantPublicKey}:${config.apiPassword}`
            ).toString('base64')}`,
            Accept: 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();

          if (data.order) {
            results.fetched.push({
              merchantReferenceId: merchantRefId,
              orderId: data.order.orderId,
              status: data.order.status || data.order.detailedStatus,
              amount: data.order.totalAmount || data.order.amount,
              currency: data.order.currency,
              orderData: data.order,
            });

            if (shouldSave) {
              try {
                await processGeideaOrderResponse(data);
                results.success++;
                console.log(`✅ [Fetch All Orders] Fetched and saved: ${merchantRefId}`);
              } catch (saveError: unknown) {
                const errorMessage = saveError instanceof Error ? saveError.message : String(saveError);
                const isQuotaError = errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('Quota exceeded');

                if (isQuotaError) {
                  console.warn(`⚠️ [Fetch All Orders] Quota exceeded, stopping save operations`);
                  results.errors.push('تم تجاوز الحصة المسموحة. تم إيقاف الحفظ.');
                  shouldSave = false;
                } else {
                  console.error(`❌ [Fetch All Orders] Failed to save ${merchantRefId}:`, saveError);
                  results.failed++;
                  results.errors.push(`${merchantRefId}: Failed to save`);
                }
              }
            } else {
              results.success++;
              console.log(`✅ [Fetch All Orders] Fetched (no save): ${merchantRefId}`);
            }
          } else {
            results.notFound++;
          }
        } else if (response.status === 404) {
          results.notFound++;
        } else {
          results.failed++;
          results.errors.push(`${merchantRefId}: ${response.status}`);
        }

        if (i < maxFetch - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`❌ [Fetch All Orders] Error fetching ${merchantRefId}:`, error);
        results.failed++;
        results.errors.push(`${merchantRefId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: shouldSave
        ? `تم جلب ${results.success} معاملة وحفظها في Supabase`
        : `تم جلب ${results.success} معاملة من Geidea (بدون حفظ)`,
      results: {
        total: finalMerchantReferenceIds.length,
        success: results.success,
        failed: results.failed,
        notFound: results.notFound,
        errors: results.errors.slice(0, 5),
        fetched: results.fetched,
      },
      environment: mode,
      saved: shouldSave,
    });
  } catch (error) {
    console.error('❌ [Fetch All Orders] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'حدث خطأ غير معروف' },
      { status: 500 }
    );
  }
}
