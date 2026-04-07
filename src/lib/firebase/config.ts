/**
 * firebase/config.ts — STUB (Firebase removed, using Supabase)
 * هذا الملف أصبح stub فارغ بعد الهجرة الكاملة لـ Supabase
 */

// Geidea config (لا علاقة له بـ Firebase)
export const geideaConfig = {
  merchantPublicKey: process.env.GEIDEA_MERCHANT_PUBLIC_KEY || '3448c010-87b1-41e7-9771-cac444268cfb',
  apiPassword: process.env.GEIDEA_API_PASSWORD || 'edfd5eee-fd1b-4932-9ee1-d6d9ba7599f0',
  webhookSecret: process.env.GEIDEA_WEBHOOK_SECRET || 'geidea_webhook_secret_production_2024',
  baseUrl: process.env.GEIDEA_BASE_URL || 'https://api.merchant.geidea.net',
  isTestMode: false,
};

// Stubs for backward compat (no-op)
export const app = null;
export const auth = null;
export const db = null;
export const storage = null;
export const analytics = null;
export const hasValidConfig = false;
export const retryOperation = async <T>(fn: () => Promise<T>) => fn();
export const checkFirestoreConnection = async () => false;
export const validateFirebaseConfig = () => false;
export const validateGeideaConfig = () => true;
