/**
 * Geidea Test Callback Route - لاختبار Callback يدوياً
 * 
 * يمكن استخدام هذا الـ endpoint لاختبار Callback من المتصفح أو من Geidea Dashboard
 * 
 * Usage:
 * POST /api/geidea/test-callback
 * Body: { orderId, merchantReferenceId, responseCode, responseMessage, ... }
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
 * POST - اختبار Callback يدوياً
 * يمكن استخدام هذا الـ endpoint لاختبار Callback من المتصفح
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    
    console.log('🧪 [Geidea Test Callback] Testing callback with payload:', JSON.stringify(payload, null, 2));

    // معالجة callback باستخدام المكتبة المركزية
    const processed = await processGeideaCallback(payload);

    console.log('✅ [Geidea Test Callback] Payment saved successfully:', {
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
        message: 'Callback processed successfully',
        orderId: processed.orderId,
        merchantReferenceId: processed.merchantReferenceId,
        status: processed.status,
        data: {
          orderId: processed.orderId,
          merchantReferenceId: processed.merchantReferenceId,
          status: processed.status,
          amount: processed.amount,
          currency: processed.currency,
          responseCode: processed.responseCode,
          responseMessage: processed.responseMessage,
        },
      },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('❌ [Geidea Test Callback] Error processing callback:', error);
    
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
 * GET - معلومات عن endpoint الاختبار
 */
export async function GET() {
  return NextResponse.json(
    {
      message: 'Geidea Test Callback Endpoint',
      description: 'استخدم POST لإرسال بيانات Callback للاختبار',
      usage: {
        method: 'POST',
        url: '/api/geidea/test-callback',
        body: {
          orderId: 'string (required)',
          merchantReferenceId: 'string (optional)',
          responseCode: 'string (optional)',
          responseMessage: 'string (optional)',
          detailedResponseCode: 'string (optional)',
          detailedResponseMessage: 'string (optional)',
          amount: 'number (optional)',
          currency: 'string (optional)',
          customerEmail: 'string (optional)',
        },
      },
      example: {
        orderId: '3ffba51b-26bd-49e9-0b73-08de1d1bfcee',
        merchantReferenceId: 'BULKGQSMFDZABAAMBQXI22ZQOSWMCA',
        responseCode: '999',
        responseMessage: 'فشلت عملية التحقق للدفع',
        detailedResponseCode: '999',
        detailedResponseMessage: 'فشلت عملية التحقق للدفع',
        status: 'failed',
      },
    },
    { headers: CORS_HEADERS }
  );
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

