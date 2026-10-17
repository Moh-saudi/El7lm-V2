import { getSupabaseAdmin } from '@/lib/supabase/admin';

export type GeideaMode = 'live' | 'test';

const SETTINGS_TABLE = 'geidea_settings';
const SETTINGS_ROW_ID = 'config';
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

  const defaultLivePublicKey = '3448c010-87b1-41e7-9771-cac444268cfb';
  const defaultLivePassword = 'ecba1701-4889-4357-ba09-4d8d864f6d64';
  const defaultTestPublicKey = 'e510dca3-d113-47bf-b4b0-9b92bac661f6';
  const defaultTestPassword = '9b794cd5-9b42-4048-8e97-2c162f35710f';

  const defaultPublicKey = mode === 'live' ? defaultLivePublicKey : defaultTestPublicKey;
  const defaultPassword = mode === 'live' ? defaultLivePassword : defaultTestPassword;

  const merchantPublicKey =
    getEnv(`${prefix}_MERCHANT_PUBLIC_KEY`) ||
    getEnv(`${fallbackPrefix}_MERCHANT_PUBLIC_KEY`) ||
    getEnv('GEIDEA_MERCHANT_PUBLIC_KEY') ||
    defaultPublicKey;

  const apiPassword =
    getEnv(`${prefix}_API_PASSWORD`) ||
    getEnv(`${fallbackPrefix}_API_PASSWORD`) ||
    getEnv('GEIDEA_API_PASSWORD') ||
    defaultPassword;

  const baseUrl =
    getEnv(`${prefix}_BASE_URL`) ||
    getEnv(`${fallbackPrefix}_BASE_URL`) ||
    getEnv('GEIDEA_BASE_URL') ||
    DEFAULT_BASE_URL;

  const defaultCallbackUrl = 'https://www.el7lm.com/api/geidea/callback';

  const callbackUrl =
    getEnv(`${prefix}_CALLBACK_URL`) ||
    getEnv(`${fallbackPrefix}_CALLBACK_URL`) ||
    getEnv('GEIDEA_CALLBACK_URL') ||
    defaultCallbackUrl;

  return {
    merchantPublicKey: merchantPublicKey || defaultPublicKey,
    apiPassword: apiPassword || defaultPassword,
    baseUrl,
    callbackUrl,
  };
};

export const getGeideaMode = async (): Promise<GeideaMode> => {
  try {
    const db = getSupabaseAdmin();
    const { data } = await db.from(SETTINGS_TABLE).select('mode').eq('id', SETTINGS_ROW_ID).limit(1);
    const mode = data?.[0]?.mode;
    if (mode === 'test' || mode === 'live') {
      console.log('✅ [Geidea Config] Mode read from Supabase:', mode);
      return mode;
    }
    return DEFAULT_MODE;
  } catch (error) {
    console.error('❌ [Geidea Config] Failed to read mode:', error);
    return DEFAULT_MODE;
  }
};

export const setGeideaMode = async (mode: GeideaMode, retries = 3): Promise<void> => {
  const db = getSupabaseAdmin();

  console.log('🔄 [Geidea Config] Setting mode to:', mode);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await db.from(SETTINGS_TABLE).upsert({ id: SETTINGS_ROW_ID, mode, updatedAt: new Date().toISOString() });

      const { data } = await db.from(SETTINGS_TABLE).select('mode').eq('id', SETTINGS_ROW_ID).limit(1);
      const savedMode = data?.[0]?.mode;
      console.log('✅ [Geidea Config] Mode saved:', savedMode, 'Expected:', mode);

      if (savedMode === mode) return;

      if (attempt < retries) {
        console.warn(`⚠️ [Geidea Config] Mode mismatch, retrying... (attempt ${attempt}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }

      throw new Error(`Failed to save mode: expected ${mode}, got ${savedMode}`);
    } catch (error: unknown) {
      if (attempt === retries) {
        console.error('❌ [Geidea Config] Failed to save mode after all retries:', error);
        throw new Error(`Failed to save mode: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
};

export const getGeideaEnvConfig = (mode: GeideaMode) => resolveEnvConfig(mode);
