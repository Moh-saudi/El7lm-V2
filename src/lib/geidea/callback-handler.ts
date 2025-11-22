/**
 * Geidea Callback Handler - معالج مركزي لجميع callbacks من Geidea
 * 
 * هذا المعالج يضمن تسجيل جميع البيانات (نجاح/فشل) بشكل صحيح
 */

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface GeideaCallbackPayload {
  [key: string]: any;
}

export interface ProcessedCallback {
  orderId: string;
  merchantReferenceId: string | null;
  status: 'success' | 'failed' | 'pending' | 'cancelled';
  amount: number | null;
  currency: string;
  responseCode: string | null;
  detailedResponseCode: string | null;
  responseMessage: string | null;
  detailedResponseMessage: string | null;
  customerEmail: string | null;
  customerName: string | null;
  customerPhone: string | null;
  transactionId: string | null;
  paidAt: Date | null;
  rawPayload: GeideaCallbackPayload;
}

const SUCCESS_CODES = new Set(['000', '001']);
const PENDING_CODES = new Set(['210', '211', '212']);
const CANCELLED_CODES = new Set(['999']);

/**
 * معالجة callback من Geidea وتسجيله في Firestore
 */
export async function processGeideaCallback(
  payload: GeideaCallbackPayload
): Promise<ProcessedCallback> {
  console.log('🔄 [Geidea Callback Handler] Processing callback:', JSON.stringify(payload, null, 2));

  // استخراج orderId (الأولوية من Geidea)
  const orderId = extractOrderId(payload);
  if (!orderId) {
    throw new Error('orderId is required in callback payload');
  }

  // استخراج جميع البيانات
  const merchantReferenceId = extractString(payload, [
    'merchantReferenceId',
    'merchant_reference_id',
    'reference',
  ]);
  
  const responseCode = extractString(payload, ['responseCode', 'response_code', 'code']);
  const detailedResponseCode = extractString(payload, [
    'detailedResponseCode',
    'detailed_response_code',
  ]);
  const responseMessage = extractString(payload, ['responseMessage', 'response_message']);
  const detailedResponseMessage = extractString(payload, [
    'detailedResponseMessage',
    'detailed_response_message',
  ]);
  
  const transactionId = extractString(payload, [
    'transactionId',
    'sessionId',
    'id',
    'paymentId',
  ]);
  
  const customerEmail = extractString(payload, [
    'customerEmail',
    'customer_email',
    'email',
    'payerEmail',
  ]);
  
  const customerName = extractString(payload, ['customerName', 'customer_name', 'name']);
  
  const customerPhone = extractString(payload, [
    'customerPhone',
    'customer_phone',
    'phone',
    'phoneNumber',
    'mobile',
  ]);
  
  const amount = extractNumber(payload, [
    'amount',
    'orderAmount',
    'order_amount',
    'totalAmount',
    'total_amount',
  ]);
  
  const currency = extractString(payload, ['currency', 'currencyCode', 'orderCurrency']) || 'EGP';
  
  const timestampValue = extractString(payload, [
    'timestamp',
    'timeStamp',
    'paymentDate',
    'payment_date',
    'createdAt',
    'date',
  ]);
  const paidAt = timestampValue ? parseDate(timestampValue) : null;

  // تحديد الحالة
  const status = determineStatus(payload, responseCode, detailedResponseCode, responseMessage, detailedResponseMessage);

  const processed: ProcessedCallback = {
    orderId,
    merchantReferenceId,
    status,
    amount,
    currency,
    responseCode,
    detailedResponseCode,
    responseMessage,
    detailedResponseMessage,
    customerEmail,
    customerName,
    customerPhone,
    transactionId,
    paidAt,
    rawPayload: payload,
  };

  // تسجيل في Firestore
  try {
    await saveGeideaPayment(processed);
    
    console.log('✅ [Geidea Callback Handler] Payment processed and saved:', {
      orderId,
      merchantReferenceId,
      status,
      amount,
      currency,
      responseCode,
      detailedResponseCode,
      responseMessage: responseMessage || detailedResponseMessage,
      savedInCollection: 'geidea_payments',
    });
  } catch (saveError) {
    console.error('❌ [Geidea Callback Handler] Failed to save payment:', {
      orderId,
      error: saveError instanceof Error ? saveError.message : 'Unknown error',
      processedData: processed,
    });
    // إعادة رمي الخطأ لمعالجته في route
    throw saveError;
  }

  return processed;
}

/**
 * حفظ الدفعة في Firestore
 */
async function saveGeideaPayment(processed: ProcessedCallback): Promise<void> {
  if (!adminDb) {
    throw new Error('Firebase Admin is not initialized');
  }

  // استخدام orderId كـ document ID (الأولوية)
  const documentId = processed.orderId;
  const docRef = adminDb.collection('geidea_payments').doc(documentId);
  const existingDoc = await docRef.get();

  const docData: any = {
    orderId: processed.orderId,
    merchantReferenceId: processed.merchantReferenceId || processed.orderId,
    geideaOrderId: processed.orderId,
    ourMerchantReferenceId: processed.merchantReferenceId,
    transactionId: processed.transactionId,
    responseCode: processed.responseCode,
    detailedResponseCode: processed.detailedResponseCode,
    responseMessage: processed.responseMessage,
    detailedResponseMessage: processed.detailedResponseMessage,
    status: processed.status,
    amount: processed.amount,
    currency: processed.currency,
    customerEmail: processed.customerEmail,
    customerName: processed.customerName,
    customerPhone: processed.customerPhone,
    paidAt: processed.paidAt ? processed.paidAt.toISOString() : null,
    rawPayload: processed.rawPayload,
    callbackReceivedAt: new Date().toISOString(),
    paymentMethod: 'geidea',
    source: 'geidea_callback',
    updatedAt: FieldValue.serverTimestamp(),
  };

  // إضافة createdAt فقط إذا كان المستند جديداً
  if (!existingDoc.exists) {
    docData.createdAt = FieldValue.serverTimestamp();
  }

  await docRef.set(docData, { merge: true });

  // تسجيل خاص للحالات المختلفة
  if (processed.status === 'failed') {
    console.warn('⚠️ [Geidea Callback Handler] Failed payment saved to geidea_payments:', {
      documentId,
      orderId: processed.orderId,
      merchantReferenceId: processed.merchantReferenceId,
      status: 'failed',
      reason: processed.responseMessage || processed.detailedResponseMessage || 'Unknown error',
      responseCode: processed.responseCode,
      detailedResponseCode: processed.detailedResponseCode,
      collection: 'geidea_payments',
    });
  } else if (processed.status === 'success') {
    console.log('✅ [Geidea Callback Handler] Successful payment saved to geidea_payments:', {
      documentId,
      orderId: processed.orderId,
      merchantReferenceId: processed.merchantReferenceId,
      status: 'success',
      amount: processed.amount,
      currency: processed.currency,
      collection: 'geidea_payments',
    });
  } else {
    console.log('ℹ️ [Geidea Callback Handler] Payment saved to geidea_payments:', {
      documentId,
      orderId: processed.orderId,
      merchantReferenceId: processed.merchantReferenceId,
      status: processed.status,
      collection: 'geidea_payments',
    });
  }
}

/**
 * استخراج orderId من payload
 */
function extractOrderId(payload: GeideaCallbackPayload): string | null {
  // الأولوية: orderId من Geidea
  const orderId = extractString(payload, ['orderId', 'order_id', 'id']);
  if (orderId) {
    return orderId;
  }

  // البديل: merchantReferenceId
  const merchantRef = extractString(payload, [
    'merchantReferenceId',
    'merchant_reference_id',
    'reference',
  ]);
  if (merchantRef) {
    return merchantRef;
  }

  // البحث في جميع الحقول المحتملة
  const possibleKeys = Object.keys(payload).filter(
    (key) =>
      key.toLowerCase().includes('order') ||
      key.toLowerCase().includes('reference') ||
      key.toLowerCase().includes('id')
  );

  for (const key of possibleKeys) {
    const value = payload[key];
    if (value && typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

/**
 * استخراج قيمة نصية من payload
 */
function extractString(payload: GeideaCallbackPayload, keys: string[]): string | null {
  for (const key of keys) {
    if (payload[key] !== undefined && payload[key] !== null) {
      return String(payload[key]);
    }
  }
  return null;
}

/**
 * استخراج قيمة رقمية من payload
 */
function extractNumber(payload: GeideaCallbackPayload, keys: string[]): number | null {
  for (const key of keys) {
    const value = payload[key];
    if (value === undefined || value === null || value === '') continue;
    const numericValue =
      typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : Number(value);
    if (!Number.isNaN(numericValue)) {
      return numericValue;
    }
  }
  return null;
}

/**
 * تحديد حالة الدفعة
 */
function determineStatus(
  payload: GeideaCallbackPayload,
  responseCode: string | null,
  detailedCode: string | null,
  responseMessage: string | null,
  detailedMessage: string | null
): 'success' | 'failed' | 'pending' | 'cancelled' {
  const statusField = extractString(payload, ['status', 'paymentStatus', 'transactionStatus'])?.toLowerCase();
  const errorMessage = (responseMessage || detailedMessage || '').toLowerCase();

  // رسائل الخطأ الشائعة
  const errorKeywords = [
    'insufficient',
    'balance',
    'funds',
    'رصيد',
    'غير كافي',
    'declined',
    'rejected',
    'failed',
    'error',
    'خطأ',
    'فشل',
    'مرفوض',
    'فشلت عملية التحقق',
    'فشلت',
    'التحقق',
    'verification',
    'authentication',
    'declined',
  ];
  const hasErrorMessage = errorKeywords.some((keyword) => errorMessage.includes(keyword));

  // التحقق من status field
  if (statusField) {
    if (['success', 'completed', 'paid'].includes(statusField)) {
      return 'success';
    }
    if (['failed', 'error', 'declined', 'rejected'].includes(statusField) || hasErrorMessage) {
      return 'failed';
    }
    if (['cancelled', 'canceled', 'void'].includes(statusField)) {
      return 'cancelled';
    }
    if (['pending', 'processing', 'initiated'].includes(statusField)) {
      return 'pending';
    }
  }

  // التحقق من response codes
  if (responseCode) {
    if (SUCCESS_CODES.has(responseCode)) {
      return 'success';
    }
    if (CANCELLED_CODES.has(responseCode)) {
      return 'cancelled';
    }
    if (PENDING_CODES.has(responseCode)) {
      return 'pending';
    }
    // أي كود آخر يعتبر فشل
    return 'failed';
  }

  if (detailedCode) {
    if (SUCCESS_CODES.has(detailedCode)) {
      return 'success';
    }
    if (CANCELLED_CODES.has(detailedCode)) {
      return 'cancelled';
    }
    if (PENDING_CODES.has(detailedCode)) {
      return 'pending';
    }
    return 'failed';
  }

  // إذا كان هناك رسالة خطأ واضحة
  if (hasErrorMessage) {
    return 'failed';
  }

  // افتراضياً: pending
  return 'pending';
}

/**
 * تحويل نص إلى Date
 */
function parseDate(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * معالجة وحفظ بيانات Fetch Order API من Geidea
 * 
 * هذه الوظيفة تستخدم نفس منطق processGeideaCallback لكنها تعمل مع
 * استجابة Fetch Order API التي لها بنية مختلفة قليلاً
 */
export async function processGeideaOrderResponse(
  orderData: any
): Promise<ProcessedCallback> {
  console.log('🔄 [Geidea Order Handler] Processing order response:', JSON.stringify(orderData, null, 2));

  // استخراج order من الاستجابة
  const order = orderData?.order || orderData;
  
  if (!order) {
    throw new Error('Order data is required in response');
  }

  // استخراج orderId
  const orderId = order.orderId || order.id;
  if (!orderId) {
    throw new Error('orderId is required in order data');
  }

  // استخراج merchantReferenceId
  const merchantReferenceId = order.merchantReferenceId || null;

  // استخراج بيانات المعاملة من transactions array
  // نبحث عن آخر معاملة ناجحة أو أول معاملة
  const transactions = order.transactions || [];
  const successfulTransaction = transactions.find((t: any) => 
    t.status === 'Success' || t.codes?.responseCode === '000'
  );
  const lastTransaction = transactions[transactions.length - 1] || successfulTransaction || {};

  // استخراج response codes من المعاملة أو من order
  const responseCode = lastTransaction.codes?.responseCode || 
                      order.responseCode || 
                      orderData.responseCode || 
                      null;
  const detailedResponseCode = lastTransaction.codes?.detailedResponseCode || 
                               order.detailedResponseCode || 
                               orderData.detailedResponseCode || 
                               null;
  const responseMessage = lastTransaction.codes?.responseMessage || 
                         lastTransaction.codes?.acquirerMessage ||
                         order.responseMessage || 
                         orderData.responseMessage || 
                         null;
  const detailedResponseMessage = lastTransaction.codes?.detailedResponseMessage || 
                                 order.detailedResponseMessage || 
                                 orderData.detailedResponseMessage || 
                                 null;

  // استخراج transactionId
  const transactionId = lastTransaction.transactionId || 
                       lastTransaction.id || 
                       order.threeDSecureId || 
                       null;

  // استخراج بيانات العميل
  const customerEmail = order.customerEmail || null;
  const customerName = order.customerName || null;
  const customerPhone = order.customerPhoneNumber || 
                       (order.customerPhoneCountryCode && order.customerPhoneNumber 
                         ? `${order.customerPhoneCountryCode}${order.customerPhoneNumber}` 
                         : null) || 
                       null;

  // استخراج المبلغ
  const amount = order.totalAmount || order.amount || null;
  const currency = order.currency || order.settleCurrency || 'EGP';

  // استخراج تاريخ الدفع
  const paidAt = order.updatedDate || 
                 lastTransaction.updatedDate || 
                 lastTransaction.createdDate || 
                 order.createdDate || 
                 null;
  const paidAtDate = paidAt ? parseDate(paidAt) : null;

  // تحديد الحالة من order.status أو order.detailedStatus
  const orderStatus = order.status || order.detailedStatus || '';
  let status: 'success' | 'failed' | 'pending' | 'cancelled';
  
  if (orderStatus.toLowerCase() === 'success' || orderStatus.toLowerCase() === 'paid') {
    status = 'success';
  } else if (orderStatus.toLowerCase() === 'failed' || orderStatus.toLowerCase() === 'declined') {
    status = 'failed';
  } else if (orderStatus.toLowerCase() === 'cancelled' || orderStatus.toLowerCase() === 'canceled') {
    status = 'cancelled';
  } else {
    // استخدام determineStatus كـ fallback
    status = determineStatus(
      order,
      responseCode,
      detailedResponseCode,
      responseMessage,
      detailedResponseMessage
    );
  }

  const processed: ProcessedCallback = {
    orderId,
    merchantReferenceId,
    status,
    amount,
    currency,
    responseCode,
    detailedResponseCode,
    responseMessage,
    detailedResponseMessage,
    customerEmail,
    customerName,
    customerPhone,
    transactionId,
    paidAt: paidAtDate,
    rawPayload: orderData,
  };

  // تسجيل في Firestore
  try {
    await saveGeideaPaymentFromOrder(processed, orderData);
    
    console.log('✅ [Geidea Order Handler] Order processed and saved:', {
      orderId,
      merchantReferenceId,
      status,
      amount,
      currency,
      responseCode,
      detailedResponseCode,
      responseMessage: responseMessage || detailedResponseMessage,
      savedInCollection: 'geidea_payments',
    });
  } catch (saveError) {
    console.error('❌ [Geidea Order Handler] Failed to save order:', {
      orderId,
      error: saveError instanceof Error ? saveError.message : 'Unknown error',
      processedData: processed,
    });

    throw saveError;
  }

  return processed;
}

/**
 * حفظ بيانات Order من Fetch Order API في Firestore
 */
async function saveGeideaPaymentFromOrder(
  processed: ProcessedCallback,
  rawOrderData: any
): Promise<void> {
  if (!adminDb) {
    throw new Error('Firebase Admin is not initialized');
  }

  // استخدام orderId كـ document ID
  const documentId = processed.orderId;
  const docRef = adminDb.collection('geidea_payments').doc(documentId);
  const existingDoc = await docRef.get();

  // التحقق من وجود البيانات وتغييرها قبل الكتابة (لتقليل استخدام Firestore)
  if (existingDoc.exists) {
    const existingData = existingDoc.data();
    const existingStatus = existingData?.status;
    const existingFetchedAt = existingData?.fetchedFromGeideaAt;
    
    // إذا كانت الحالة لم تتغير، نتخطى الكتابة تماماً (حتى لو لم تكن البيانات حديثة)
    if (existingStatus === processed.status) {
      console.log(`ℹ️ [Geidea Order Handler] Skipping save - status unchanged: ${documentId} (${processed.status})`);
      return; // نتخطى الكتابة تماماً لتقليل استخدام Firestore
    }
    
    // إذا كانت البيانات تم جلبها مؤخراً (خلال آخر 10 دقائق)، نتخطى الكتابة حتى لو تغيرت الحالة
    if (existingFetchedAt) {
      const lastFetched = new Date(existingFetchedAt).getTime();
      const now = Date.now();
      const tenMinutes = 10 * 60 * 1000;
      
      if (now - lastFetched < tenMinutes) {
        console.log(`ℹ️ [Geidea Order Handler] Skipping save - recently fetched (${Math.round((now - lastFetched) / 1000 / 60)} minutes ago): ${documentId}`);
        return; // نتخطى الكتابة لتقليل استخدام Firestore
      }
    }
  }

  const docData: any = {
    orderId: processed.orderId,
    merchantReferenceId: processed.merchantReferenceId || processed.orderId,
    geideaOrderId: processed.orderId,
    ourMerchantReferenceId: processed.merchantReferenceId,
    transactionId: processed.transactionId,
    responseCode: processed.responseCode,
    detailedResponseCode: processed.detailedResponseCode,
    responseMessage: processed.responseMessage,
    detailedResponseMessage: processed.detailedResponseMessage,
    status: processed.status,
    amount: processed.amount,
    currency: processed.currency,
    customerEmail: processed.customerEmail,
    customerName: processed.customerName,
    customerPhone: processed.customerPhone,
    paidAt: processed.paidAt ? processed.paidAt.toISOString() : null,
    rawPayload: rawOrderData,
    fetchedFromGeideaAt: new Date().toISOString(),
    paymentMethod: 'geidea',
    source: 'geidea_fetch_order_api',
    updatedAt: FieldValue.serverTimestamp(),
  };

  // إضافة createdAt فقط إذا كان المستند جديداً
  if (!existingDoc.exists) {
    docData.createdAt = FieldValue.serverTimestamp();
  }

  await docRef.set(docData, { merge: true });

  // تسجيل خاص للحالات المختلفة
  if (processed.status === 'failed') {
    console.warn('⚠️ [Geidea Order Handler] Failed payment saved to geidea_payments:', {
      documentId,
      orderId: processed.orderId,
      merchantReferenceId: processed.merchantReferenceId,
      status: 'failed',
      reason: processed.responseMessage || processed.detailedResponseMessage || 'Unknown error',
      responseCode: processed.responseCode,
      detailedResponseCode: processed.detailedResponseCode,
      collection: 'geidea_payments',
    });
  } else if (processed.status === 'success') {
    console.log('✅ [Geidea Order Handler] Successful payment saved to geidea_payments:', {
      documentId,
      orderId: processed.orderId,
      merchantReferenceId: processed.merchantReferenceId,
      status: 'success',
      amount: processed.amount,
      currency: processed.currency,
      collection: 'geidea_payments',
    });
  } else {
    console.log('ℹ️ [Geidea Order Handler] Payment saved to geidea_payments:', {
      documentId,
      orderId: processed.orderId,
      merchantReferenceId: processed.merchantReferenceId,
      status: processed.status,
      collection: 'geidea_payments',
    });
  }
}

