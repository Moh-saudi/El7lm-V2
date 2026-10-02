import { getGeideaEnvConfig, getGeideaMode } from '@/lib/geidea/config';

export type GeideaVerifiedStatus = 'success' | 'failed' | 'pending' | 'cancelled';

export interface GeideaVerifiedOrder {
  orderId: string;
  merchantReferenceId: string;
  transactionId: string | null;
  amount: number;
  currency: string;
  status: GeideaVerifiedStatus;
  paidAt: Date | null;
}

function normalizeStatus(order: Record<string, any>): GeideaVerifiedStatus {
  const status = String(order.status || '').toLowerCase();
  const detailed = String(order.detailedStatus || '').toLowerCase();

  if (status === 'success' && detailed === 'paid') return 'success';
  if (status.includes('cancel') || detailed.includes('cancel')) return 'cancelled';
  if (status === 'failed' || detailed.includes('fail')) return 'failed';
  return 'pending';
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function fetchVerifiedGeideaOrder(
  merchantReferenceId: string,
): Promise<GeideaVerifiedOrder> {
  const reference = merchantReferenceId.trim();
  if (!reference) throw new Error('Geidea merchant reference is required');

  const mode = await getGeideaMode();
  const config = getGeideaEnvConfig(mode);
  if (!config.merchantPublicKey || !config.apiPassword) {
    throw new Error('Geidea verification credentials are not configured');
  }

  const auth = Buffer.from(`${config.merchantPublicKey}:${config.apiPassword}`).toString('base64');
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const url = `${baseUrl}/pgw/api/v1/direct/order?MerchantReferenceId=${encodeURIComponent(reference)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${auth}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Geidea verification failed with HTTP ${response.status}`);
  }

  const payload = await response.json() as Record<string, any>;
  const orders = Array.isArray(payload.orders) ? payload.orders : [];
  const matching = orders.filter(
    (order: Record<string, any>) => String(order.merchantReferenceId || '') === reference,
  );

  if (matching.length === 0) {
    throw new Error('Geidea order was not found for merchant reference');
  }

  const order =
    matching.find((item: Record<string, any>) => normalizeStatus(item) === 'success') ||
    matching[0];

  const amount = Number(order.amount ?? order.totalAmount);
  const currency = String(order.currency || '').toUpperCase();
  const orderId = String(order.orderId || '');
  if (!orderId || !Number.isFinite(amount) || amount < 0 || !currency) {
    throw new Error('Geidea returned incomplete order verification data');
  }

  const transactions = Array.isArray(order.transactions) ? order.transactions : [];
  const transaction = transactions.find((item: Record<string, any>) =>
    String(item.status || '').toLowerCase() === 'success'
  ) || transactions[transactions.length - 1];

  return {
    orderId,
    merchantReferenceId: reference,
    transactionId: transaction?.transactionId || transaction?.id || null,
    amount,
    currency,
    status: normalizeStatus(order),
    paidAt: normalizeStatus(order) === 'success'
      ? parseDate(order.updatedDate || transaction?.updatedDate || transaction?.createdDate)
      : null,
  };
}
