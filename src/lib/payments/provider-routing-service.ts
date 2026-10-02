import { getSupabaseServiceRole } from '@/lib/supabase/admin';

function providerFromMethods(methods: unknown): string | null {
  if (!methods) return null;
  if (typeof methods === 'string') return methods.trim().toLowerCase() || null;
  if (Array.isArray(methods)) {
    const enabledCards = methods.filter((item: any) =>
      typeof item === 'object' &&
      item !== null &&
      item.enabled !== false &&
      (item.type === 'card' || item.method === 'card')
    );
    const card = enabledCards.find((item: any) => item.isDefault === true) ?? enabledCards[0];
    const value = card?.provider || card?.gateway || card?.id;
    return value ? String(value).trim().toLowerCase() : null;
  }
  if (typeof methods === 'object') {
    const value = (methods as any).card?.provider ??
      (methods as any).card?.gateway ??
      (methods as any).cardProvider ??
      (methods as any).provider ??
      (methods as any).gateway;
    return value ? String(value).toLowerCase() : null;
  }
  return null;
}

export async function getCardProviderForCountry(countryCode: string): Promise<string> {
  const db = getSupabaseServiceRole();
  const country = countryCode.trim().toUpperCase();
  const { data, error } = await db
    .from('payment_settings')
    .select('countryCode,methods')
    .eq('countryCode', country)
    .limit(1);
  if (error) throw error;
  const provider = providerFromMethods(data?.[0]?.methods);
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
