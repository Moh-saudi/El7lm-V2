/**
 * Geidea Callback Handler - معالج مركزي لجميع callbacks من Geidea
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';

export interface GeideaCallbackPayload {
  [key: string]: unknown;
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
 * معالجة callback من Geidea وتسجيله في Supabase
 */
export async function processGeideaCallback(
  payload: GeideaCallbackPayload
): Promise<ProcessedCallback> {
  console.log('🔄 [Geidea Callback Handler] Processing callback:', JSON.stringify(payload, null, 2));

  const orderId = extractOrderId(payload);
  if (!orderId) throw new Error('orderId is required in callback payload');

  const merchantReferenceId = extractString(payload, ['merchantReferenceId', 'merchant_reference_id', 'reference']);
  const responseCode = extractString(payload, ['responseCode', 'response_code', 'code']);
  const detailedResponseCode = extractString(payload, ['detailedResponseCode', 'detailed_response_code']);
  const responseMessage = extractString(payload, ['responseMessage', 'response_message']);
  const detailedResponseMessage = extractString(payload, ['detailedResponseMessage', 'detailed_response_message']);
  const transactionId = extractString(payload, ['transactionId', 'sessionId', 'id', 'paymentId']);
  const customerEmail = extractString(payload, ['customerEmail', 'customer_email', 'email', 'payerEmail']);
  const customerName = extractString(payload, ['customerName', 'customer_name', 'name']);
  const customerPhone = extractString(payload, ['customerPhone', 'customer_phone', 'phone', 'phoneNumber', 'mobile']);
  const amount = extractNumber(payload, ['amount', 'orderAmount', 'order_amount', 'totalAmount', 'total_amount']);
  const currency = extractString(payload, ['currency', 'currencyCode', 'orderCurrency']) || 'EGP';

  const timestampValue = extractString(payload, ['timestamp', 'timeStamp', 'paymentDate', 'payment_date', 'createdAt', 'date']);
  const paidAt = timestampValue ? parseDate(timestampValue) : null;

  const status = determineStatus(payload, responseCode, detailedResponseCode, responseMessage, detailedResponseMessage);

  const processed: ProcessedCallback = {
    orderId, merchantReferenceId, status, amount, currency, responseCode, detailedResponseCode,
    responseMessage, detailedResponseMessage, customerEmail, customerName, customerPhone,
    transactionId, paidAt, rawPayload: payload,
  };

  try {
    await saveGeideaPayment(processed);
    console.log('✅ [Geidea Callback Handler] Payment processed and saved:', { orderId, merchantReferenceId, status, amount, currency });
  } catch (saveError) {
    console.error('❌ [Geidea Callback Handler] Failed to save payment:', { orderId, error: saveError instanceof Error ? saveError.message : 'Unknown error' });
    throw saveError;
  }

  // تفعيل الاشتراك تلقائياً عند نجاح الدفع
  if (status === 'success') {
    try {
      await activateGeideaSubscription(processed);
    } catch (activateError) {
      // لا نوقف العملية إذا فشل التفعيل — يمكن للأدمن التفعيل يدوياً
      console.error('⚠️ [Geidea Callback Handler] Auto-activation failed (admin can activate manually):', activateError instanceof Error ? activateError.message : activateError);
    }
  }

  return processed;
}

/**
 * إثراء بيانات الدفع بمعلومات الباقة من بيانات المستخدم
 */
async function enrichWithPackageInfo(
  merchantReferenceId: string | null,
  customerEmail: string | null
): Promise<{
  plan_name?: string | null;
  packageType?: string | null;
  package_type?: string | null;
  selectedPackage?: string | null;
  userId?: string | null;
} | null> {
  const db = getSupabaseAdmin();

  try {
    let userId: string | null = null;

    if (merchantReferenceId) {
      const parts = merchantReferenceId.split('-');
      if (parts.length >= 2) {
        userId = parts[1];
        console.log('🔍 [Package Info] Extracted UID from merchantReferenceId:', userId);
      }
    }

    if (!userId && customerEmail) {
      console.log('🔍 [Package Info] Searching for user by email:', customerEmail);
      const { data: users } = await db.from('users').select('id').eq('email', customerEmail).limit(1);
      if (users?.length) {
        userId = String(users[0].id);
        console.log('✅ [Package Info] Found user by email, UID:', userId);
      }
    }

    if (!userId) {
      console.warn('⚠️ [Package Info] Could not find user ID from merchantReferenceId or email');
      return null;
    }

    const { data: userData } = await db.from('users').select('selectedPackage, packageType, package_type, plan_name').eq('id', userId).limit(1);
    if (!userData?.length) {
      console.warn('⚠️ [Package Info] User document not found:', userId);
      return { userId };
    }

    const row = userData[0] as Record<string, unknown>;
    const packageType = String(row.selectedPackage || row.packageType || row.package_type || '') || null;
    const plan_name = String(row.plan_name || packageType || '') || null;

    console.log('📦 [Package Info] Retrieved package info:', { userId, packageType, plan_name });

    return { userId, plan_name, packageType, package_type: packageType, selectedPackage: packageType };
  } catch (error) {
    console.error('❌ [Package Info] Error enriching with package info:', error);
    return null;
  }
}

/**
 * حفظ الدفعة في Supabase
 */
async function saveGeideaPayment(processed: ProcessedCallback): Promise<void> {
  const db = getSupabaseAdmin();
  const documentId = processed.orderId;
  const now = new Date().toISOString();

  const { data: existing } = await db.from('geidea_payments').select('id').eq('id', documentId).limit(1);

  const packageInfo = await enrichWithPackageInfo(processed.merchantReferenceId, processed.customerEmail);

  const docData = {
    id: documentId,
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
    callbackReceivedAt: now,
    paymentMethod: 'geidea',
    source: 'geidea_callback',
    userId: packageInfo?.userId || null,
    plan_name: packageInfo?.plan_name || null,
    packageType: packageInfo?.packageType || null,
    package_type: packageInfo?.package_type || null,
    selectedPackage: packageInfo?.selectedPackage || null,
    updatedAt: now,
    ...(!existing?.length ? { createdAt: now } : {}),
  };

  await db.from('geidea_payments').upsert(docData);

  if (processed.status === 'failed') {
    console.warn('⚠️ [Geidea Callback Handler] Failed payment saved:', { documentId, status: 'failed' });
  } else if (processed.status === 'success') {
    console.log('✅ [Geidea Callback Handler] Successful payment saved:', { documentId, amount: processed.amount });
  } else {
    console.log('ℹ️ [Geidea Callback Handler] Payment saved:', { documentId, status: processed.status });
  }
}

/**
 * تفعيل الاشتراك تلقائياً عند نجاح دفعة Geidea
 */
async function activateGeideaSubscription(processed: ProcessedCallback): Promise<void> {
  const db = getSupabaseAdmin();

  // استخراج userId من merchantReferenceId (صيغة: prefix-userId-suffix)
  let userId: string | null = null;
  if (processed.merchantReferenceId) {
    const parts = processed.merchantReferenceId.split('-');
    if (parts.length >= 2) userId = parts[1];
  }
  if (!userId && processed.customerEmail) {
    const { data } = await db.from('users').select('id').eq('email', processed.customerEmail).limit(1);
    if (data?.length) userId = String(data[0].id);
  }
  if (!userId) {
    console.warn('⚠️ [Geidea Auto-Activate] Cannot find userId — skipping');
    return;
  }

  // تحديد مدة الاشتراك من الباقة
  const { data: paymentRow } = await db.from('geidea_payments').select('plan_name, packageType').eq('id', processed.orderId).limit(1);
  const row = paymentRow?.[0] as Record<string, unknown> | undefined;
  const packageName = String(row?.plan_name || processed.transactionId || 'اشتراك');
  const packageType = String(row?.packageType || 'subscription_3months');

  let months = 3;
  if (packageType.includes('annual') || packageType.includes('12')) months = 12;
  else if (packageType.includes('6')) months = 6;

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString();

  await db.from('subscriptions').upsert({
    id: userId,
    userId,
    plan_name: packageName,
    package_name: packageName,
    packageType,
    status: 'active',
    start_date: now,
    end_date: expiresAt,
    expires_at: expiresAt,
    amount: processed.amount,
    currency: processed.currency,
    payment_method: 'geidea',
    payment_id: processed.orderId,
    activated_at: now,
    updated_at: now,
    invoice_number: `GEIDEA-${processed.orderId.slice(-8)}`,
  });

  await db.from('users').update({
    subscriptionStatus: 'active',
    subscriptionExpiresAt: expiresAt,
    subscriptionEndDate: expiresAt,
    lastPaymentId: processed.orderId,
    packageType,
    selectedPackage: packageName,
    updatedAt: now,
  }).eq('id', userId);

  console.log(`✅ [Geidea Auto-Activate] Subscription activated for user ${userId} — expires ${expiresAt}`);
}

function extractOrderId(payload: GeideaCallbackPayload): string | null {
  const orderId = extractString(payload, ['orderId', 'order_id', 'id']);
  if (orderId) return orderId;

  const merchantRef = extractString(payload, ['merchantReferenceId', 'merchant_reference_id', 'reference']);
  if (merchantRef) return merchantRef;

  const possibleKeys = Object.keys(payload).filter(
    key => key.toLowerCase().includes('order') || key.toLowerCase().includes('reference') || key.toLowerCase().includes('id')
  );

  for (const key of possibleKeys) {
    const value = payload[key];
    if (value && typeof value === 'string' && value.trim()) return value.trim();
  }

  return null;
}

function extractString(payload: GeideaCallbackPayload, keys: string[]): string | null {
  for (const key of keys) {
    if (payload[key] !== undefined && payload[key] !== null) return String(payload[key]);
  }
  return null;
}

function extractNumber(payload: GeideaCallbackPayload, keys: string[]): number | null {
  for (const key of keys) {
    const value = payload[key];
    if (value === undefined || value === null || value === '') continue;
    const numericValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : Number(value);
    if (!Number.isNaN(numericValue)) return numericValue;
  }
  return null;
}

function determineStatus(
  payload: GeideaCallbackPayload,
  responseCode: string | null,
  detailedCode: string | null,
  responseMessage: string | null,
  detailedMessage: string | null
): 'success' | 'failed' | 'pending' | 'cancelled' {
  const statusField = extractString(payload, ['status', 'paymentStatus', 'transactionStatus'])?.toLowerCase();
  const errorMessage = (responseMessage || detailedMessage || '').toLowerCase();

  const errorKeywords = ['insufficient', 'balance', 'funds', 'رصيد', 'غير كافي', 'declined', 'rejected', 'failed', 'error', 'خطأ', 'فشل', 'مرفوض', 'فشلت عملية التحقق', 'فشلت', 'التحقق', 'verification', 'authentication'];
  const hasErrorMessage = errorKeywords.some(keyword => errorMessage.includes(keyword));

  if (statusField) {
    if (['success', 'completed', 'paid'].includes(statusField)) return 'success';
    if (['failed', 'error', 'declined', 'rejected'].includes(statusField) || hasErrorMessage) return 'failed';
    if (['cancelled', 'canceled', 'void'].includes(statusField)) return 'cancelled';
    if (['pending', 'processing', 'initiated'].includes(statusField)) return 'pending';
  }

  if (responseCode) {
    if (SUCCESS_CODES.has(responseCode)) return 'success';
    if (CANCELLED_CODES.has(responseCode)) return 'cancelled';
    if (PENDING_CODES.has(responseCode)) return 'pending';
    return 'failed';
  }

  if (detailedCode) {
    if (SUCCESS_CODES.has(detailedCode)) return 'success';
    if (CANCELLED_CODES.has(detailedCode)) return 'cancelled';
    if (PENDING_CODES.has(detailedCode)) return 'pending';
    return 'failed';
  }

  if (hasErrorMessage) return 'failed';
  return 'pending';
}

function parseDate(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * معالجة وحفظ بيانات Fetch Order API من Geidea
 */
export async function processGeideaOrderResponse(
  orderData: Record<string, unknown>
): Promise<ProcessedCallback> {
  console.log('🔄 [Geidea Order Handler] Processing order response:', JSON.stringify(orderData, null, 2));

  const order = (orderData?.order || orderData) as Record<string, unknown>;
  if (!order) throw new Error('Order data is required in response');

  const orderId = String(order.orderId || order.id || '');
  if (!orderId) throw new Error('orderId is required in order data');

  const merchantReferenceId = order.merchantReferenceId ? String(order.merchantReferenceId) : null;

  const transactions = (order.transactions as Record<string, unknown>[]) || [];
  const successfulTransaction = transactions.find(t => t.status === 'Success' || (t.codes as Record<string, unknown>)?.responseCode === '000');
  const lastTransaction = (transactions[transactions.length - 1] || successfulTransaction || {}) as Record<string, unknown>;
  const lastCodes = (lastTransaction.codes || {}) as Record<string, unknown>;

  const responseCode = String(lastCodes.responseCode || order.responseCode || orderData.responseCode || '') || null;
  const detailedResponseCode = String(lastCodes.detailedResponseCode || order.detailedResponseCode || orderData.detailedResponseCode || '') || null;
  const responseMessage = String(lastCodes.responseMessage || lastCodes.acquirerMessage || order.responseMessage || orderData.responseMessage || '') || null;
  const detailedResponseMessage = String(lastCodes.detailedResponseMessage || order.detailedResponseMessage || orderData.detailedResponseMessage || '') || null;

  const transactionId = String(lastTransaction.transactionId || lastTransaction.id || order.threeDSecureId || '') || null;
  const customerEmail = order.customerEmail ? String(order.customerEmail) : null;
  const customerName = order.customerName ? String(order.customerName) : null;
  const customerPhone = order.customerPhoneNumber
    ? String(order.customerPhoneCountryCode || '') + String(order.customerPhoneNumber)
    : null;
  const amount = order.totalAmount || order.amount ? Number(order.totalAmount || order.amount) : null;
  const currency = String(order.currency || order.settleCurrency || 'EGP');

  const paidAtStr = String(order.updatedDate || lastTransaction.updatedDate || lastTransaction.createdDate || order.createdDate || '');
  const paidAtDate = paidAtStr ? parseDate(paidAtStr) : null;

  const orderStatus = String(order.status || order.detailedStatus || '').toLowerCase();
  let status: 'success' | 'failed' | 'pending' | 'cancelled';

  if (['success', 'paid'].includes(orderStatus)) status = 'success';
  else if (['failed', 'declined'].includes(orderStatus)) status = 'failed';
  else if (['cancelled', 'canceled'].includes(orderStatus)) status = 'cancelled';
  else status = determineStatus(order as GeideaCallbackPayload, responseCode, detailedResponseCode, responseMessage, detailedResponseMessage);

  const processed: ProcessedCallback = {
    orderId, merchantReferenceId, status, amount, currency, responseCode, detailedResponseCode,
    responseMessage, detailedResponseMessage, customerEmail, customerName, customerPhone,
    transactionId, paidAt: paidAtDate, rawPayload: orderData,
  };

  try {
    await saveGeideaPaymentFromOrder(processed, orderData);
    console.log('✅ [Geidea Order Handler] Order processed and saved:', { orderId, merchantReferenceId, status, amount, currency });
  } catch (saveError) {
    console.error('❌ [Geidea Order Handler] Failed to save order:', { orderId, error: saveError instanceof Error ? saveError.message : 'Unknown error' });
    throw saveError;
  }

  return processed;
}

/**
 * حفظ بيانات Order من Fetch Order API في Supabase
 */
async function saveGeideaPaymentFromOrder(
  processed: ProcessedCallback,
  rawOrderData: Record<string, unknown>
): Promise<void> {
  const db = getSupabaseAdmin();
  const documentId = processed.orderId;
  const now = new Date().toISOString();

  const { data: existing } = await db.from('geidea_payments').select('id, status, fetchedFromGeideaAt').eq('id', documentId).limit(1);

  if (existing?.length) {
    const existingRow = existing[0] as Record<string, unknown>;
    if (existingRow.status === processed.status) {
      console.log(`ℹ️ [Geidea Order Handler] Skipping save - status unchanged: ${documentId} (${processed.status})`);
      return;
    }

    if (existingRow.fetchedFromGeideaAt) {
      const lastFetched = new Date(String(existingRow.fetchedFromGeideaAt)).getTime();
      if (Date.now() - lastFetched < 10 * 60 * 1000) {
        console.log(`ℹ️ [Geidea Order Handler] Skipping save - recently fetched: ${documentId}`);
        return;
      }
    }
  }

  const packageInfo = await enrichWithPackageInfo(processed.merchantReferenceId, processed.customerEmail);

  const docData = {
    id: documentId,
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
    fetchedFromGeideaAt: now,
    paymentMethod: 'geidea',
    source: 'geidea_fetch_order_api',
    userId: packageInfo?.userId || null,
    plan_name: packageInfo?.plan_name || null,
    packageType: packageInfo?.packageType || null,
    package_type: packageInfo?.package_type || null,
    selectedPackage: packageInfo?.selectedPackage || null,
    updatedAt: now,
    ...(!existing?.length ? { createdAt: now } : {}),
  };

  await db.from('geidea_payments').upsert(docData);

  if (processed.status === 'failed') {
    console.warn('⚠️ [Geidea Order Handler] Failed payment saved:', { documentId });
  } else if (processed.status === 'success') {
    console.log('✅ [Geidea Order Handler] Successful payment saved:', { documentId, amount: processed.amount });
  } else {
    console.log('ℹ️ [Geidea Order Handler] Payment saved:', { documentId, status: processed.status });
  }
}
