import { NextRequest, NextResponse } from 'next/server';
import { GeideaMode, getGeideaEnvConfig, getGeideaMode } from '@/lib/geidea/config';
import { processGeideaOrderResponse } from '@/lib/geidea/callback-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/geidea/search-orders
 * 
 * البحث عن المعاملات في Geidea API
 * 
 * Body: {
 *   fromDate?: string, // ISO date
 *   toDate?: string, // ISO date
 *   status?: string, // Success, Failed, etc.
 *   page?: number, // 1-based index
 *   limit?: number, // items per page (default 10)
 *   save?: boolean // save results to Firestore (default false)
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { fromDate, toDate, status, page = 1, limit = 10, save = false } = body;

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

        // بناء رابط API
        // https://docs.geidea.net/reference/fetch-or-search-all-transactions
        const baseUrl = config.baseUrl.replace(/\/$/, '');
        const endpoint = `${baseUrl}/pgw/api/v1/direct/order`;

        const params = new URLSearchParams();

        // إضافة معاملات البحث
        if (fromDate) params.append('FromDate', fromDate);
        if (toDate) params.append('ToDate', toDate);
        if (status && status !== 'all') params.append('Status', status);

        // Pagination
        // API uses Skip and Take
        const skip = (page - 1) * limit;
        params.append('Skip', skip.toString());

        // Ensure Take is within reasonable limits (e.g. 50 or 100 max per page usually)
        // User requested 1000, but API might reject it. Let's try 100.
        const safeLimit = Math.min(limit, 100);
        params.append('Take', safeLimit.toString());

        // Sorting: Removing SortBy/SortOrder as it might cause 400 if invalid
        // params.append('SortBy', 'CreatedDate'); 
        // params.append('SortOrder', 'DESC');

        const fullUrl = `${endpoint}?${params.toString()}`;
        console.log(`🔍 [Geidea Search] Searching: ${fullUrl}`);

        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${Buffer.from(
                    `${config.merchantPublicKey}:${config.apiPassword}`
                ).toString('base64')}`,
                Accept: 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ [Geidea Search] API Error: ${response.status} - ${response.statusText}`);
            console.error(`❌ [Geidea Search] Error Details:`, errorText);

            return NextResponse.json(
                {
                    success: false,
                    error: `Geidea API Error: ${response.status}`,
                    details: errorText
                },
                { status: response.status }
            );
        }

        const data = await response.json();

        // معالجة النتائج
        const orders = data.orders || [];
        const totalCount = data.totalCount || orders.length; // Some APIs return totalCount

        const results = {
            success: 0,
            failed: 0,
            saved: 0,
            orders: [] as any[],
        };

        // معالجة كل طلب
        for (const order of orders) {
            const orderData = {
                merchantReferenceId: order.merchantReferenceId,
                orderId: order.orderId,
                status: order.status || order.detailedStatus,
                amount: order.totalAmount || order.amount,
                currency: order.currency,
                date: order.createdDate || order.date,
                orderData: order,
            };

            results.orders.push(orderData);

            // حفظ في Firestore إذا طلب ذلك
            if (save) {
                try {
                    await processGeideaOrderResponse({ order }); // Wrap in object as expected by handler
                    results.saved++;
                } catch (error) {
                    console.error(`⚠️ [Geidea Search] Failed to save order ${order.orderId}:`, error);
                    results.failed++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `تم العثور على ${orders.length} معاملة`,
            data: {
                orders: results.orders,
                total: totalCount,
                page,
                limit,
                savedCount: results.saved
            }
        });

    } catch (error) {
        console.error('❌ [Geidea Search] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
            },
            { status: 500 }
        );
    }
}
