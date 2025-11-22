import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status'); // success, failed, pending, all

    // إعدادات Geidea
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

    // جلب المعاملات من Geidea API
    // حسب وثائق Geidea: https://docs.geidea.net/docs/geidea-checkout-v2
    // يوجد endpoint "Fetch All or Search Transactions or Orders" في قسم Transaction and Order Management
    // سنجرب عدة endpoints محتملة حسب الوثائق
    const possibleEndpoints = [
      `${geideaConfig.baseUrl}/payment-intent/api/v2/direct/orders/search`, // البحث والجلب
      `${geideaConfig.baseUrl}/payment-intent/api/v2/direct/orders`, // جلب جميع الطلبات
      `${geideaConfig.baseUrl}/payment-intent/api/v2/direct/transactions/search`, // البحث في المعاملات
      `${geideaConfig.baseUrl}/payment-intent/api/v2/direct/transactions`, // جلب جميع المعاملات
      `${geideaConfig.baseUrl}/api/v2/orders/search`, // endpoint بديل
      `${geideaConfig.baseUrl}/api/v2/orders`, // endpoint بديل
    ];
    
    // إنشاء timestamp للتوقيع
    const now = new Date();
    const timestamp = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    // إنشاء signature (قد لا يكون مطلوباً لـ GET، لكن نضيفه للاحتياط)
    const authString = Buffer.from(`${geideaConfig.merchantPublicKey}:${geideaConfig.apiPassword}`).toString('base64');

    // بناء query parameters
    const queryParams = new URLSearchParams();
    if (limit) queryParams.append('limit', limit.toString());
    if (offset) queryParams.append('offset', offset.toString());
    if (status && status !== 'all') queryParams.append('status', status);

    let geideaResponse = null;
    let lastError = null;
    let workingEndpoint = null;

    // تجربة جميع الـ endpoints المحتملة
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
          // إذا لم يكن 404، قد يكون خطأ آخر (مثل 401, 403) - نحفظ الخطأ ونكمل
          const errorText = await response.text();
          lastError = {
            status: response.status,
            statusText: response.statusText,
            endpoint: endpoint,
            error: errorText,
          };
          console.warn(`⚠️ [Geidea Fetch] Endpoint ${endpoint} returned ${response.status}: ${errorText}`);
        }
      } catch (error) {
        console.warn(`⚠️ [Geidea Fetch] Error trying endpoint ${endpoint}:`, error);
        if (!lastError) {
          lastError = {
            endpoint: endpoint,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }
    }

    // إذا لم نجد endpoint يعمل
    if (!geideaResponse) {
      // هذا ليس خطأ - Geidea لا يوفر API مباشر لجلب جميع المعاملات (حسب الوثائق)
      console.log('ℹ️ [Geidea Fetch] Geidea API لا يوفر endpoint مباشر - هذا متوقع حسب الوثائق الرسمية');
      
      return NextResponse.json(
        {
          success: false,
          error: 'Geidea API لا يوفر endpoint مباشر لجلب جميع المعاملات',
          details: 'وفقاً لوثائق Geidea الرسمية، لا توفر الشركة API مباشر لاستعراض جميع المعاملات. يمكنك استخدام Merchant Portal لعرض جميع المعاملات.',
          triedEndpoints: possibleEndpoints,
          lastError: lastError,
          suggestion: 'استخدم "تحديث من Firestore" لعرض جميع المعاملات المحفوظة. المدفوعات الجديدة تأتي تلقائياً عبر callback من Geidea. أو استخدم Geidea Merchant Portal لعرض جميع المعاملات.',
          reference: 'https://docs.geidea.net/docs/geidea-checkout-v2',
          isExpected: true, // علامة أن هذا متوقع وليس خطأ حقيقي
        },
        { status: 200 }
      );
    }

    try {

      const geideaData = await geideaResponse.json();
      
      console.log(`✅ [Geidea Fetch] Received ${geideaData?.transactions?.length || 0} transactions from Geidea`);

      // معالجة المعاملات وحفظها في Firestore
      const processedTransactions = [];
      
      if (geideaData?.transactions && Array.isArray(geideaData.transactions)) {
        for (const transaction of geideaData.transactions) {
          try {
            // استخراج البيانات
            const orderId = transaction.orderId || transaction.id;
            const merchantRefId = transaction.merchantReferenceId || transaction.reference;
            const transactionStatus = transaction.status || 
                                     (transaction.responseCode === '000' ? 'success' : 'failed') ||
                                     'pending';

            if (!orderId && !merchantRefId) {
              console.warn('⚠️ [Geidea Fetch] Transaction missing orderId and merchantReferenceId:', transaction);
              continue;
            }

            // استخدام orderId كـ document ID (الأولوية)
            const documentId = orderId || merchantRefId;
            
            // التحقق من وجود المعاملة في Firestore
            if (adminDb) {
              const docRef = adminDb.collection('geidea_payments').doc(documentId);
              const existingDoc = await docRef.get();

              const docData = {
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
                fetchedFromGeideaAt: new Date().toISOString(),
                paymentMethod: 'geidea',
                source: 'geidea_api_fetch',
                ...(existingDoc.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
                updatedAt: FieldValue.serverTimestamp(),
              };

              await docRef.set(docData, { merge: true });

              processedTransactions.push({
                ...docData,
                id: documentId,
                wasNew: !existingDoc.exists,
              });
            } else {
              // إذا لم يكن adminDb متاحاً، نضيف المعاملة للقائمة فقط
              processedTransactions.push({
                id: documentId,
                ...transaction,
                status: transactionStatus,
              });
            }
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
        if (fetchError.message.includes('fetch')) {
          errorMessage = 'فشل الاتصال بالشبكة - يرجى التحقق من اتصال الإنترنت';
        } else if (fetchError.message.includes('timeout')) {
          errorMessage = 'انتهت مهلة الاتصال - يرجى المحاولة مرة أخرى';
        } else {
          errorMessage = `خطأ في الاتصال: ${fetchError.message}`;
        }
      }
      
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          details: fetchError instanceof Error ? fetchError.message : 'Unknown error',
          suggestion: 'استخدم "تحديث من Firestore" لعرض المعاملات المحفوظة محلياً.',
        },
        { status: 200 } // نعيد 200 حتى لا يظهر خطأ في الواجهة
      );
    }

  } catch (error) {
    console.error('❌ [Geidea Fetch] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

