// Geidea payment gateway configuration
export const geideaConfig = {
  merchantPublicKey: process.env.GEIDEA_MERCHANT_PUBLIC_KEY || '3448c010-87b1-41e7-9771-cac444268cfb',
  apiPassword: process.env.GEIDEA_API_PASSWORD || 'edfd5eee-fd1b-4932-9ee1-d6d9ba7599f0',
  webhookSecret: process.env.GEIDEA_WEBHOOK_SECRET || 'geidea_webhook_secret_production_2024',
  baseUrl: process.env.GEIDEA_BASE_URL || 'https://api.merchant.geidea.net',
  isTestMode: false,
};

export function validateGeideaConfig() {
  return !!(geideaConfig.merchantPublicKey && geideaConfig.apiPassword);
}
