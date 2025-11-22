import crypto from 'crypto';

export const formatAmount = (amount: number) => amount.toFixed(2);

export const formatTimestamp = (date = new Date()) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}:${pad(date.getSeconds())}`;
};

/**
 * Generate Geidea API signature according to official documentation
 * 
 * Steps:
 * 1. Concatenate: {MerchantPublicKey, OrderAmount (2 decimals), OrderCurrency, MerchantReferenceId, timeStamp}
 * 2. Hash (SHA-256) the concatenated string using API Password
 * 3. Convert hashed value to Base64
 * 
 * @param merchantPublicKey - Merchant public key
 * @param amount - Order amount (will be formatted to 2 decimals)
 * @param currency - Order currency (3-letter ISO code)
 * @param merchantReferenceId - Merchant reference ID (can be empty string if not provided)
 * @param apiPassword - API password (secret key)
 * @param timestamp - Timestamp in format "Y/m/d H:i:s"
 * @returns Base64 encoded HMAC-SHA256 signature
 */
export const generateGeideaSignature = (
  merchantPublicKey: string,
  amount: number,
  currency: string,
  merchantReferenceId: string,
  apiPassword: string,
  timestamp: string
) => {
  // Format amount to 2 decimals as per documentation
  const amountStr = formatAmount(amount);
  
  // Concatenate: MerchantPublicKey + Amount + Currency + MerchantReferenceId + Timestamp
  // Note: If merchantReferenceId is not provided, use empty string (as per documentation)
  const payload = `${merchantPublicKey}${amountStr}${currency}${merchantReferenceId || ''}${timestamp}`;
  
  // Hash with SHA-256 using API Password as secret key
  const hash = crypto.createHmac('sha256', apiPassword).update(payload).digest('base64');
  
  return hash;
};

