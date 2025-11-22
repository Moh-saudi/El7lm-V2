/**
 * Geidea Callback Route - نقطة استقبال callbacks من Geidea
 * 
 * هذا الـ route يستخدم المكتبة المركزية لمعالجة جميع callbacks
 * ويضمن تسجيل جميع البيانات (نجاح/فشل) بشكل صحيح
 */

import { NextRequest, NextResponse } from 'next/server';
import { processGeideaCallback } from '@/lib/geidea/callback-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * POST - استقبال callback من Geidea
 */
export async function POST(request: NextRequest) {
  try {
    // Log headers للتحقق من مصدر الطلب
    const headers = Object.fromEntries(request.headers.entries());
    console.log('🔄 [Geidea Callback] Received POST request:', {
      url: request.url,
      method: request.method,
      contentType: request.headers.get('content-type'),
      userAgent: request.headers.get('user-agent'),
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
    });

    // تحليل body
    const payload = await parseRequestBody(request);
    
    console.log('🔄 [Geidea Callback] Parsed payload:', JSON.stringify(payload, null, 2));
    console.log('🔄 [Geidea Callback] Payload keys:', Object.keys(payload));

    // معالجة callback باستخدام المكتبة المركزية
    const processed = await processGeideaCallback(payload);

    console.log('✅ [Geidea Callback] Payment saved successfully:', {
      orderId: processed.orderId,
      merchantReferenceId: processed.merchantReferenceId,
      status: processed.status,
      amount: processed.amount,
      currency: processed.currency,
      collection: 'geidea_payments',
      documentId: processed.orderId,
    });

    return NextResponse.json(
      {
        success: true,
        orderId: processed.orderId,
        status: processed.status,
        merchantReferenceId: processed.merchantReferenceId,
        message: `Payment ${processed.status === 'success' ? 'saved successfully' : processed.status === 'failed' ? 'marked as failed' : 'saved'} in geidea_payments collection`,
      },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('❌ [Geidea Callback] Error processing callback:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Callback processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

/**
 * GET - التحقق من حالة دفعة معينة من Firestore
 */
export async function GET(request: NextRequest) {
  try {
    const { adminDb } = await import('@/lib/firebase/admin');
    
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const merchantReferenceId = searchParams.get('merchantReferenceId');

    if (!orderId && !merchantReferenceId) {
      return NextResponse.json(
        { error: 'Order ID or Merchant Reference ID is required' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!adminDb) {
      return NextResponse.json(
        { error: 'Database is not available' },
        { status: 503, headers: CORS_HEADERS }
      );
    }

    // البحث باستخدام orderId أولاً
    if (orderId) {
      const docSnap = await adminDb.collection('geidea_payments').doc(orderId).get();
      if (docSnap.exists) {
        return NextResponse.json(
          {
            success: true,
            orderId,
            status: docSnap.get('status') || 'pending',
            data: docSnap.data(),
          },
          { headers: CORS_HEADERS }
        );
      }
    }

    // البحث باستخدام merchantReferenceId
    if (merchantReferenceId) {
      // البحث في حقل merchantReferenceId
      const querySnapshot = await adminDb
        .collection('geidea_payments')
        .where('merchantReferenceId', '==', merchantReferenceId)
        .limit(1)
        .get();

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return NextResponse.json(
          {
            success: true,
            orderId: doc.id,
            merchantReferenceId,
            status: doc.get('status') || 'pending',
            data: doc.data(),
          },
          { headers: CORS_HEADERS }
        );
      }

      // البحث أيضاً في حقل ourMerchantReferenceId
      const querySnapshot2 = await adminDb
        .collection('geidea_payments')
        .where('ourMerchantReferenceId', '==', merchantReferenceId)
        .limit(1)
        .get();

      if (!querySnapshot2.empty) {
        const doc = querySnapshot2.docs[0];
        return NextResponse.json(
          {
            success: true,
            orderId: doc.id,
            merchantReferenceId,
            status: doc.get('status') || 'pending',
            data: doc.data(),
          },
          { headers: CORS_HEADERS }
        );
      }
    }

    // إذا لم نجد في أي مكان
    return NextResponse.json(
      {
        success: false,
        orderId: orderId || null,
        merchantReferenceId: merchantReferenceId || null,
        status: 'not_found',
        message: 'Payment not found in database. Callback may not have been received yet.',
      },
      { status: 404, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('❌ [Geidea Callback] Error checking payment status:', error);
    return NextResponse.json(
      {
        error: 'Failed to check payment status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

/**
 * OPTIONS - للـ CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}

/**
 * تحليل request body بطرق مختلفة
 */
async function parseRequestBody(request: NextRequest): Promise<Record<string, any>> {
  const contentType = request.headers.get('content-type')?.toLowerCase() || '';

  try {
    // JSON
    if (contentType.includes('application/json')) {
      return await request.json();
    }

    // Form URL Encoded
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const textBody = await request.text();
      const params = new URLSearchParams(textBody);
      const result: Record<string, any> = {};
      params.forEach((value, key) => {
        result[key] = value;
      });
      return result;
    }

    // Multipart Form Data
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const result: Record<string, any> = {};
      for (const [key, value] of formData.entries()) {
        result[key] = typeof value === 'string' ? value : value.name;
      }
      return result;
    }

    // Fallback: محاولة JSON
    const fallbackText = await request.text();
    if (!fallbackText) {
      return {};
    }

    try {
      return JSON.parse(fallbackText);
    } catch {
      return { rawBody: fallbackText };
    }
  } catch (error) {
    console.error('❌ [Geidea Callback] Failed to parse request body:', error);
    return {};
  }
}
