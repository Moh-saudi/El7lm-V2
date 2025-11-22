import { adminDb } from '@/lib/firebase/admin';

export type GeideaMode = 'live' | 'test';

const SETTINGS_COLLECTION = 'geidea_settings';
const SETTINGS_DOC_ID = 'config';
const DEFAULT_MODE: GeideaMode = 'live';

const DEFAULT_BASE_URL = 'https://api.merchant.geidea.net';

type RawEnvConfig = {
  merchantPublicKey?: string;
  apiPassword?: string;
  baseUrl?: string;
  callbackUrl?: string;
};

export type GeideaEnvConfig = Required<RawEnvConfig>;

const getEnv = (key: string) => process.env[key];

const resolveEnvConfig = (mode: GeideaMode): GeideaEnvConfig => {
  const prefix = mode === 'live' ? 'GEIDEA_LIVE' : 'GEIDEA_TEST';
  const fallbackPrefix = mode === 'live' ? 'GEIDEA' : 'GEIDEA_SANDBOX';

  const merchantPublicKey =
    getEnv(`${prefix}_MERCHANT_PUBLIC_KEY`) ||
    getEnv(`${fallbackPrefix}_MERCHANT_PUBLIC_KEY`) ||
    getEnv('GEIDEA_MERCHANT_PUBLIC_KEY');

  const apiPassword =
    getEnv(`${prefix}_API_PASSWORD`) ||
    getEnv(`${fallbackPrefix}_API_PASSWORD`) ||
    getEnv('GEIDEA_API_PASSWORD');

  const baseUrl =
    getEnv(`${prefix}_BASE_URL`) ||
    getEnv(`${fallbackPrefix}_BASE_URL`) ||
    getEnv('GEIDEA_BASE_URL') ||
    DEFAULT_BASE_URL;

  // Callback URL الافتراضي للإنتاج
  const defaultCallbackUrl = 'https://www.el7lm.com/api/geidea/callback';
  
  const callbackUrl =
    getEnv(`${prefix}_CALLBACK_URL`) ||
    getEnv(`${fallbackPrefix}_CALLBACK_URL`) ||
    getEnv('GEIDEA_CALLBACK_URL') ||
    defaultCallbackUrl;

  return {
    merchantPublicKey: merchantPublicKey || '',
    apiPassword: apiPassword || '',
    baseUrl,
    callbackUrl,
  };
};

export const getGeideaMode = async (): Promise<GeideaMode> => {
  try {
    if (!adminDb) {
      console.warn('⚠️ [Geidea Config] adminDb not available, using default mode:', DEFAULT_MODE);
      return DEFAULT_MODE;
    }

    try {
      const doc = await adminDb.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC_ID).get();
      const mode = doc.exists ? doc.data()?.mode : null;

      if (mode === 'test' || mode === 'live') {
        console.log('✅ [Geidea Config] Mode read from Firestore:', mode);
        return mode;
      }
    } catch (firestoreError: any) {
      const errorMessage = firestoreError?.message || String(firestoreError);
      const isQuotaError = errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('Quota exceeded');
      
      if (isQuotaError) {
        console.warn('⚠️ [Geidea Config] Firestore quota exceeded, using default mode:', DEFAULT_MODE);
      } else {
        console.error('❌ [Geidea Config] Failed to read mode from Firestore:', firestoreError);
      }
    }

    return DEFAULT_MODE;
  } catch (error) {
    console.error('❌ [Geidea Config] Failed to read mode:', error);
    return DEFAULT_MODE;
  }
};

export const setGeideaMode = async (mode: GeideaMode, retries = 3): Promise<void> => {
  if (!adminDb) {
    throw new Error('Firebase admin is not initialized');
  }

  console.log('🔄 [Geidea Config] Setting mode to:', mode, `(retry ${4 - retries}/3)`);
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await adminDb.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC_ID).set(
        {
          mode,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      
      // التحقق من أن الوضع تم حفظه بشكل صحيح
      const doc = await adminDb.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC_ID).get();
      const savedMode = doc.exists ? doc.data()?.mode : null;
      console.log('✅ [Geidea Config] Mode saved:', savedMode, 'Expected:', mode);
      
      if (savedMode === mode) {
        return; // نجح الحفظ
      }
      
      // إذا لم يطابق، حاول مرة أخرى
      if (attempt < retries) {
        console.warn(`⚠️ [Geidea Config] Mode mismatch, retrying... (attempt ${attempt}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // exponential backoff
        continue;
      }
      
      throw new Error(`Failed to save mode: expected ${mode}, got ${savedMode}`);
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      const isQuotaError = errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('Quota exceeded');
      
      if (isQuotaError && attempt < retries) {
        console.warn(`⚠️ [Geidea Config] Quota exceeded, retrying... (attempt ${attempt}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // exponential backoff
        continue;
      }
      
      if (attempt === retries) {
        console.error('❌ [Geidea Config] Failed to save mode after all retries:', error);
        throw new Error(
          isQuotaError 
            ? 'تم تجاوز الحصة المسموحة في Firestore. يرجى المحاولة مرة أخرى بعد قليل أو التحقق من إعدادات Firestore.'
            : `Failed to save mode: ${errorMessage}`
        );
      }
    }
  }
};

export const getGeideaEnvConfig = (mode: GeideaMode) => resolveEnvConfig(mode);

