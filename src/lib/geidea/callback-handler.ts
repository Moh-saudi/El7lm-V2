/**
 * Geidea Callback Handler - معالج مركزي لجميع callbacks من Geidea
 */

import { applyVerifiedGeideaPayment } from '@/lib/payments/geidea-canonical-service';
import { fetchVerifiedGeideaOrder } from '@/lib/payments/geidea-provider-verification';

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
  // The callback is only a notification. Never trust its amount/status as proof of payment.
  const nestedOrder =
    payload.order && typeof payload.order === 'object'
      ? payload.order as Record<string, unknown>
      : null;

  const merchantReferenceId =
    extractString(payload, ['merchantReferenceId', 'merchant_reference_id', 'reference']) ||
    (nestedOrder
      ? extractString(nestedOrder, ['merchantReferenceId', 'merchant_reference_id', 'reference'])
      : null);

  if (!merchantReferenceId) {
    throw new Error('Geidea merchantReferenceId is required');
  }

  // Authoritative server-to-server verification using Geidea Basic Auth.
  const verified = await fetchVerifiedGeideaOrder(merchantReferenceId);

  const canonicalResult = await applyVerifiedGeideaPayment({
    orderId: verified.orderId,
    merchantReferenceId: verified.merchantReferenceId,
    transactionId: verified.transactionId,
    amount: verified.amount,
    currency: verified.currency,
    status: verified.status,
    paidAt: verified.paidAt,
  });

  if (!canonicalResult.canonical) {
    throw new Error('Unknown non-canonical Geidea merchant reference');
  }

  return {
    orderId: verified.orderId,
    merchantReferenceId: verified.merchantReferenceId,
    status: verified.status,
    amount: verified.amount,
    currency: verified.currency,
    responseCode: null,
    detailedResponseCode: null,
    responseMessage: null,
    detailedResponseMessage: null,
    customerEmail: null,
    customerName: null,
    customerPhone: null,
    transactionId: verified.transactionId,
    paidAt: verified.paidAt,
    rawPayload: payload,
  };
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
