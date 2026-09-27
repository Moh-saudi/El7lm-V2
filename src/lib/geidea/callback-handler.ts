/**
 * Geidea Callback Handler - معالج مركزي لجميع callbacks من Geidea
 */

import { applyVerifiedGeideaPayment } from '@/lib/payments/geidea-canonical-service';

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

  // Canonical subscription payments use merchantReferenceId as payments.id.
  // If this is a canonical payment, stop here: no parallel legacy payment or subscription writes are allowed.
  if (merchantReferenceId && amount !== null) {
    const canonicalResult = await applyVerifiedGeideaPayment({
      orderId,
      merchantReferenceId,
      transactionId,
      amount,
      currency,
      status,
      paidAt,
    });
    if (canonicalResult.canonical) {
      console.log('✅ [Geidea Callback Handler] Canonical payment processed:', canonicalResult);
      return processed;
    }
  }

  // All subscription Geidea sessions are canonical. Unknown merchant references
  // are rejected instead of being persisted to a parallel legacy ledger.
  throw new Error('Unknown non-canonical Geidea merchant reference');

  return processed;
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
