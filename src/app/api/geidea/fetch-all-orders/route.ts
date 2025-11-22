import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getGeideaMode, getGeideaEnvConfig } from '@/lib/geidea/config';
import { processGeideaOrderResponse } from '@/lib/geidea/callback-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/geidea/fetch-all-orders
 * 
 * جلب المعاملات من Geidea باستخدام merchantReferenceId
 * 
 * Body: { 
 *   merchantReferenceIds?: string[], // قائمة merchantReferenceId للجلب (اختياري)
 *   limit?: number, // عدد المعاملات (افتراضي: 10)
 *   save?: boolean // حفظ في Firestore (افتراضي: false لتجنب Quota)
 * }
 * 
 * ملاحظة: إذا لم يتم إرسال merchantReferenceIds، سيتم جلبها من Firestore (يستهلك Quota)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const merchantReferenceIds = body.merchantReferenceIds || []; // قائمة merchantReferenceId
    const limit = body.limit || 10;
    const shouldSave = body.save === true; // افتراضياً: false لتجنب Quota

    // الحصول على إعدادات Geidea
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

    // إذا لم يتم إرسال merchantReferenceIds، نجلبها من Firestore
    if (merchantReferenceIds.length === 0) {
      if (!adminDb) {
        return NextResponse.json(
          {
            success: false,
            error: 'Database is not available and no merchantReferenceIds provided',
          },
          { status: 503 }
        );
      }

      // جلب من Firestore (يستهلك Quota)
      const geideaPaymentsRef = adminDb.collection('geidea_payments');
      let snapshot;
      
      try {
        snapshot = await geideaPaymentsRef
          .orderBy('createdAt', 'desc')
          .limit(limit)
          .get();
      } catch (error) {
        snapshot = await geideaPaymentsRef.limit(limit).get();
      }

      const seenIds = new Set<string>();
      snapshot.forEach((doc) => {
        const data = doc.data();
        const merchantRefId = data.merchantReferenceId || data.ourMerchantReferenceId;
        if (merchantRefId && merchantRefId.startsWith('EL7LM') && !seenIds.has(merchantRefId)) {
          finalMerchantReferenceIds.push(merchantRefId);
          seenIds.add(merchantRefId);
        }
      });
    } else {
      // استخدام القائمة المرسلة مباشرة
      finalMerchantReferenceIds = merchantReferenceIds.slice(0, limit);
    }

    console.log(`🔄 [Fetch All Orders] Fetching ${finalMerchantReferenceIds.length} orders from Geidea (save=${shouldSave})`);

    if (finalMerchantReferenceIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'لا توجد معاملات للجلب',
        results: {
          total: 0,
          success: 0,
          failed: 0,
          notFound: 0,
          errors: [],
        },
      });
    }

    const results = {
      success: 0,
      failed: 0,
      notFound: 0,
      errors: [] as string[],
      fetched: [] as any[], // البيانات المسترجعة (بدون حفظ)
    };

    // جلب كل معاملة من Geidea
    const maxFetch = Math.min(finalMerchantReferenceIds.length, limit);
    
    for (let i = 0; i < maxFetch; i++) {
      const merchantRefId = finalMerchantReferenceIds[i];
      
      try {
        // استخدام Fetch Order API
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
            // إضافة البيانات المسترجعة
            results.fetched.push({
              merchantReferenceId: merchantRefId,
              orderId: data.order.orderId,
              status: data.order.status || data.order.detailedStatus,
              amount: data.order.totalAmount || data.order.amount,
              currency: data.order.currency,
              orderData: data.order, // البيانات الكاملة
            });

            // حفظ في Firestore فقط إذا كان shouldSave = true
            if (shouldSave) {
              try {
                await processGeideaOrderResponse(data);
                results.success++;
                console.log(`✅ [Fetch All Orders] Fetched and saved: ${merchantRefId}`);
              } catch (saveError: any) {
                const errorMessage = saveError?.message || String(saveError);
                const isQuotaError = errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('Quota exceeded');
                
                if (isQuotaError) {
                  console.warn(`⚠️ [Fetch All Orders] Quota exceeded, stopping save operations`);
                  results.errors.push('تم تجاوز الحصة المسموحة في Firestore. تم إيقاف الحفظ.');
                  // نتوقف عن الحفظ لكن نكمل الجلب
                  shouldSave = false;
                } else {
                  console.error(`❌ [Fetch All Orders] Failed to save ${merchantRefId}:`, saveError);
                  results.failed++;
                  results.errors.push(`${merchantRefId}: Failed to save`);
                }
              }
            } else {
              // فقط جلب بدون حفظ
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
          const errorText = await response.text().catch(() => 'Unknown error');
          results.errors.push(`${merchantRefId}: ${response.status}`);
        }

        // تأخير بسيط لتجنب rate limiting
        if (i < maxFetch - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`❌ [Fetch All Orders] Error fetching ${merchantRefId}:`, error);
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`${merchantRefId}: ${errorMessage}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: shouldSave 
        ? `تم جلب ${results.success} معاملة وحفظها في Firestore`
        : `تم جلب ${results.success} معاملة من Geidea (بدون حفظ)`,
      results: {
        total: finalMerchantReferenceIds.length,
        success: results.success,
        failed: results.failed,
        notFound: results.notFound,
        errors: results.errors.slice(0, 5),
        fetched: results.fetched, // البيانات المسترجعة
      },
      environment: mode,
      saved: shouldSave,
      quotaWarning: results.errors.some(e => e.includes('Quota exceeded') || e.includes('الحصة')),
    });
  } catch (error) {
    console.error('❌ [Fetch All Orders] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      },
      { status: 500 }
    );
  }
}

