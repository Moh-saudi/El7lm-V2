import { getSupabaseServiceRole } from '@/lib/supabase/admin';

export async function getCardProviderForCountry(countryCode: string): Promise<string> {
  const db = getSupabaseServiceRole();
  const country = countryCode.trim().toUpperCase();
  const { data, error } = await db
    .from('payment_settings')
    .select('*')
    .eq('country_code', country)
    .limit(1);
  if (error) throw error;
  const row = data?.[0] as Record<string, any> | undefined;
  if (!row) throw new Error(`Payment settings are not configured for ${country}`);

  const provider = String(
    row.card_provider ?? row.provider ?? row.payment_provider ?? row.default_provider ?? ''
  ).trim().toLowerCase();
  if (!provider) throw new Error(`Card provider is not configured for ${country}`);
  return provider;
}

export async function assertCountryCardProvider(countryCode: string, expectedProvider: string) {
  const configured = await getCardProviderForCountry(countryCode);
  if (configured !== expectedProvider.toLowerCase()) {
    throw new Error(`Card provider mismatch: ${countryCode} is configured for ${configured}`);
  }
  return configured;
}
