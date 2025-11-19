import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type BodyData = Record<string, any>;

const USER_LOOKUP_COLLECTIONS = [
  'users',
  'players',
  'clubs',
  'academies',
  'agents',
  'marketers',
];

const SUCCESS_CODES = new Set(['000', '001']);
const PENDING_CODES = new Set(['210', '211', '212']);
const CANCELLED_CODES = new Set(['999']);

interface ProfileInfo {
  id: string;
  collection: string;
  displayName?: string | null;
  phone?: string | null;
  email?: string | null;
}

export async function POST(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const payload = await parseRequestBody(request);
    console.log('🔄 [Geidea Callback] Received payment callback:', JSON.stringify(payload, null, 2));

    const orderId = deriveOrderId(payload);
    if (!orderId) {
      console.error('❌ [Geidea Callback] Missing orderId in payload:', JSON.stringify(payload, null, 2));
      return NextResponse.json({ error: 'orderId is required' }, { status: 400, headers: corsHeaders });
    }

    console.log(`📋 [Geidea Callback] Processing orderId: ${orderId}`);

    const responseCode = extractString(payload, ['responseCode', 'response_code', 'code']);
    const detailedResponseCode = extractString(payload, ['detailedResponseCode', 'detailed_response_code']);
    const responseMessage = extractString(payload, ['responseMessage', 'response_message']);
    const detailedResponseMessage = extractString(payload, ['detailedResponseMessage', 'detailed_response_message']);
    const reference = extractString(payload, ['reference', 'merchantReferenceId', 'merchant_reference_id']);
    const transactionId = extractString(payload, ['transactionId', 'sessionId', 'id', 'paymentId']);
    const customerEmail = extractString(payload, ['customerEmail', 'customer_email', 'email', 'payerEmail']);
    const customerName = extractString(payload, ['customerName', 'customer_name', 'name']);
    const customerPhone = extractString(payload, [
      'customerPhone',
      'customer_phone',
      'phone',
      'phoneNumber',
      'mobile',
      'mobileNumber',
      'contactNumber',
    ]);
    const settlementStatus = extractString(payload, ['settlementStatus', 'settlement_status']);
    const timestampValue = extractString(payload, ['timestamp', 'timeStamp', 'paymentDate', 'payment_date', 'createdAt', 'date']);
    const paidAt = timestampValue ? parseDate(timestampValue) : null;

    const amount = extractNumber(payload, ['amount', 'orderAmount', 'order_amount', 'totalAmount', 'total_amount']);
    const currency = extractString(payload, ['currency', 'currencyCode', 'orderCurrency']) || 'EGP';
    const derivedStatus = determineStatus(payload, responseCode, detailedResponseCode);

    // تسجيل تفصيلي للحالة والرسائل
    console.log(`📊 [Geidea Callback] Payment details:`, {
      orderId,
      reference,
      responseCode,
      detailedResponseCode,
      responseMessage,
      detailedResponseMessage,
      derivedStatus: derivedStatus.status,
      statusSource: derivedStatus.source,
      amount,
      currency,
      customerEmail,
      customerName,
    });

    // تسجيل خاص للمدفوعات الفاشلة (مثل Insufficient funds)
    if (derivedStatus.status === 'failed') {
      console.warn(`⚠️ [Geidea Callback] Failed payment detected:`, {
        orderId,
        merchantReferenceId: reference,
        responseCode,
        detailedResponseCode,
        responseMessage,
        detailedResponseMessage,
        reason: 'Payment failed - will be saved with failed status',
        willBeSavedAs: 'failed',
      });
    }

    // تسجيل خاص لـ Insufficient funds
    const errorMessage = responseMessage || detailedResponseMessage || '';
    if (errorMessage.toLowerCase().includes('insufficient') || errorMessage.toLowerCase().includes('funds') || errorMessage.toLowerCase().includes('رصيد')) {
      console.error(`💳 [Geidea Callback] Insufficient funds detected:`, {
        orderId,
        merchantReferenceId: reference,
        errorMessage,
        willBeSaved: true,
      });
    }

    const guessedUserId = guessUserIdFromOrder(orderId);

    if (!adminDb) {
      console.error('❌ [Geidea Callback] Firebase Admin is not initialized');
      return NextResponse.json({ error: 'Database is not available' }, { status: 503, headers: corsHeaders });
    }

    const profile = await findRelatedProfile(customerEmail, guessedUserId);

    // استخدام orderId من جيديا كـ document ID (الأولوية)
    // إذا لم يكن موجوداً، نستخدم merchantReferenceId
    const documentId = orderId || reference || 'unknown';
    
    console.log(`💾 [Geidea Callback] Saving payment with documentId: ${documentId}, orderId: ${orderId}, merchantReferenceId: ${reference}`);

    const geideaDocRef = adminDb.collection('geidea_payments').doc(documentId);
    const existingDoc = await geideaDocRef.get();

    const docData = cleanUndefined({
      orderId: orderId || reference, // orderId من جيديا (الأولوية)
      merchantReferenceId: reference || orderId, // merchantReferenceId الذي أرسلناه
      geideaOrderId: orderId, // orderId من جيديا (للتوضيح)
      ourMerchantReferenceId: reference, // merchantReferenceId الذي أرسلناه (للتوضيح)
      transactionId: transactionId || null,
      responseCode: responseCode || null,
      detailedResponseCode: detailedResponseCode || null,
      responseMessage: responseMessage || null,
      detailedResponseMessage: detailedResponseMessage || null,
      status: derivedStatus.status,
      statusSource: derivedStatus.source,
      amount: amount ?? null,
      currency,
      customerEmail: customerEmail || profile?.email || null,
      customerName: customerName || profile?.displayName || null,
      customerPhone: customerPhone || profile?.phone || null,
      userId: profile?.id || guessedUserId || null,
      accountType: profile?.collection || null,
      settlementStatus: settlementStatus || null,
      paidAt: paidAt ? paidAt.toISOString() : null,
      rawPayload: sanitizePayload(payload),
      callbackReceivedAt: new Date().toISOString(),
      paymentMethod: 'geidea',
      source: 'geidea_callback',
    });

    await geideaDocRef.set(
      {
        ...(existingDoc.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
        ...docData,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log('💾 [Geidea Callback] Payment stored in geidea_payments:', {
      orderId,
      status: derivedStatus.status,
      statusSource: derivedStatus.source,
      amount,
      currency,
      responseCode,
      detailedResponseCode,
      responseMessage: responseMessage || detailedResponseMessage,
      savedAt: new Date().toISOString(),
    });

    // تسجيل خاص للمدفوعات الفاشلة
    if (derivedStatus.status === 'failed') {
      console.warn(`⚠️ [Geidea Callback] Failed payment saved successfully:`, {
        orderId,
        status: 'failed',
        reason: responseMessage || detailedResponseMessage || 'Unknown error',
        willAppearInDashboard: true,
      });
    }

    return NextResponse.json(
      {
        success: true,
        orderId,
        status: derivedStatus.status,
        reference: reference || orderId,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ [Geidea Callback] Error processing callback:', error);
    return NextResponse.json(
      {
        error: 'Callback processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function GET(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const merchantReferenceId = searchParams.get('merchantReferenceId');

    if (!orderId && !merchantReferenceId) {
      return NextResponse.json(
        { error: 'Order ID or Merchant Reference ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!adminDb) {
      console.error('❌ [Geidea Callback] Firebase Admin is not initialized');
      return NextResponse.json({ error: 'Database is not available' }, { status: 503, headers: corsHeaders });
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
          { headers: corsHeaders }
        );
      }
    }

    // إذا لم نجد باستخدام orderId، نبحث باستخدام merchantReferenceId
    if (merchantReferenceId) {
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
          { headers: corsHeaders }
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
          { headers: corsHeaders }
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
      { status: 404, headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ [Geidea Callback] Error checking payment status:', error);
    return NextResponse.json(
      {
        error: 'Failed to check payment status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

async function parseRequestBody(request: NextRequest): Promise<BodyData> {
  const contentType = request.headers.get('content-type')?.toLowerCase() || '';

  try {
    if (contentType.includes('application/json')) {
      return await request.json();
    }

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const textBody = await request.text();
      const params = new URLSearchParams(textBody);
      const result: BodyData = {};
      params.forEach((value, key) => {
        result[key] = value;
      });
      return result;
    }

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const result: BodyData = {};
      for (const [key, value] of formData.entries()) {
        result[key] = typeof value === 'string' ? value : value.name;
      }
      return result;
    }

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

function extractString(data: BodyData, keys: string[]): string | null {
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null) {
      return String(data[key]);
    }
  }
  return null;
}

function extractNumber(data: BodyData, keys: string[]): number | null {
  for (const key of keys) {
    const value = data[key];
    if (value === undefined || value === null || value === '') continue;
    const numericValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : Number(value);
    if (!Number.isNaN(numericValue)) {
      return numericValue;
    }
  }
  return null;
}

function deriveOrderId(data: BodyData): string | null {
  // البحث عن orderId من جيديا (الأولوية)
  const orderId = extractString(data, ['orderId', 'order_id', 'id']);
  if (orderId) {
    console.log(`✅ [Geidea Callback] Found orderId: ${orderId}`);
    return orderId;
  }

  // إذا لم نجد orderId، نبحث عن merchantReferenceId
  const merchantRef = extractString(data, ['merchantReferenceId', 'merchant_reference_id', 'reference', 'merchantRef']);
  if (merchantRef) {
    console.log(`⚠️ [Geidea Callback] No orderId found, using merchantReferenceId: ${merchantRef}`);
    return merchantRef;
  }

  // البحث في جميع الحقول المحتملة
  const possibleKeys = Object.keys(data).filter(key => 
    key.toLowerCase().includes('order') || 
    key.toLowerCase().includes('reference') ||
    key.toLowerCase().includes('id')
  );

  for (const key of possibleKeys) {
    const value = data[key];
    if (value && typeof value === 'string' && value.trim()) {
      console.log(`⚠️ [Geidea Callback] Found potential orderId in field '${key}': ${value}`);
      return value.trim();
    }
  }

  console.error('❌ [Geidea Callback] Could not find orderId in payload:', Object.keys(data));
  return null;
}

function guessUserIdFromOrder(orderId: string): string | null {
  const bulkMatch = orderId.match(/^BULK([^_]+)/i);
  if (bulkMatch?.[1]) {
    return bulkMatch[1];
  }
  return null;
}

function determineStatus(data: BodyData, responseCode?: string | null, detailedCode?: string | null) {
  const statusField = extractString(data, ['status', 'paymentStatus', 'transactionStatus'])?.toLowerCase();
  const responseMessage = extractString(data, ['responseMessage', 'response_message', 'detailedResponseMessage', 'detailed_response_message'])?.toLowerCase() || '';

  // التحقق من رسائل الخطأ الشائعة (مثل رصيد غير كافي)
  const errorMessages = [
    'insufficient', 'balance', 'funds', 'رصيد', 'غير كافي', 'insufficient balance',
    'declined', 'rejected', 'failed', 'error', 'خطأ', 'فشل', 'مرفوض'
  ];
  const hasErrorMessage = errorMessages.some(msg => responseMessage.includes(msg));

  if (statusField) {
    if (['success', 'completed', 'paid'].includes(statusField)) {
      return { status: 'success', source: 'status_field' };
    }
    if (['failed', 'error', 'declined', 'rejected'].includes(statusField) || hasErrorMessage) {
      return { status: 'failed', source: 'status_field' };
    }
    if (['cancelled', 'canceled', 'void'].includes(statusField)) {
      return { status: 'cancelled', source: 'status_field' };
    }
    if (['pending', 'processing', 'initiated'].includes(statusField)) {
      return { status: 'pending', source: 'status_field' };
    }
  }

  // إذا كان هناك رسالة خطأ واضحة، نعتبرها فاشلة
  if (hasErrorMessage && !statusField) {
    return { status: 'failed', source: 'error_message' };
  }

  if (responseCode) {
    if (SUCCESS_CODES.has(responseCode)) {
      return { status: 'success', source: 'response_code' };
    }
    if (CANCELLED_CODES.has(responseCode)) {
      return { status: 'cancelled', source: 'response_code' };
    }
    if (PENDING_CODES.has(responseCode)) {
      return { status: 'pending', source: 'response_code' };
    }
    return { status: 'failed', source: 'response_code' };
  }

  if (detailedCode) {
    if (SUCCESS_CODES.has(detailedCode)) {
      return { status: 'success', source: 'detailed_response_code' };
    }
    if (CANCELLED_CODES.has(detailedCode)) {
      return { status: 'cancelled', source: 'detailed_response_code' };
    }
    if (PENDING_CODES.has(detailedCode)) {
      return { status: 'pending', source: 'detailed_response_code' };
    }
    return { status: 'failed', source: 'detailed_response_code' };
  }

  return { status: 'pending', source: 'default' };
}

function parseDate(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function sanitizePayload(payload: BodyData) {
  try {
    return JSON.parse(JSON.stringify(payload));
  } catch {
    return payload;
  }
}

function cleanUndefined<T extends Record<string, any>>(obj: T): T {
  const cleanedEntries = Object.entries(obj).filter(([, value]) => value !== undefined);
  return Object.fromEntries(cleanedEntries) as T;
}

async function findRelatedProfile(email?: string | null, guessedUserId?: string | null): Promise<ProfileInfo | null> {
  if (!adminDb) return null;

  if (guessedUserId) {
    for (const collectionName of USER_LOOKUP_COLLECTIONS) {
      try {
        const doc = await adminDb.collection(collectionName).doc(guessedUserId).get();
        if (doc.exists) {
          const data = doc.data() || {};
          return {
            id: doc.id,
            collection: collectionName,
            displayName: data.name || data.displayName || data.full_name || data.playerName || data.customerName || null,
            phone:
              data.phone ||
              data.phoneNumber ||
              data.mobile ||
              data.whatsapp ||
              data.contactNumber ||
              data.userPhone ||
              null,
            email: data.email || data.userEmail || null,
          };
        }
      } catch (error) {
        console.warn(`⚠️ [Geidea Callback] Failed to lookup userId ${guessedUserId} in ${collectionName}:`, error);
      }
    }
  }

  if (email) {
    for (const collectionName of USER_LOOKUP_COLLECTIONS) {
      try {
        const snapshot = await adminDb
          .collection(collectionName)
          .where('email', '==', email)
          .limit(1)
          .get();

        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          const data = doc.data() || {};
          return {
            id: doc.id,
            collection: collectionName,
            displayName: data.name || data.displayName || data.full_name || data.playerName || data.customerName || null,
            phone:
              data.phone ||
              data.phoneNumber ||
              data.mobile ||
              data.whatsapp ||
              data.contactNumber ||
              data.userPhone ||
              null,
            email: data.email || email,
          };
        }
      } catch (error) {
        console.warn(`⚠️ [Geidea Callback] Failed to lookup email ${email} in ${collectionName}:`, error);
      }
    }
  }

  return null;
}
