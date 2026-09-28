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
