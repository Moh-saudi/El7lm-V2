import { supabase } from '@/lib/supabase/config';

export interface LocationCountry {
  iso2: string;
  iso3: string | null;
  name: string;
  name_ar: string | null;
  phone_code: string | null;
  currency_code: string | null;
  flag_emoji: string | null;
}

export interface LocationRegion {
  geoname_id: number;
  country_iso2: string;
  admin1_code: string;
  name: string;
  name_ar: string | null;
}

export interface LocationCity {
  geoname_id: number;
  country_iso2: string;
  region_geoname_id: number | null;
  name: string;
  name_ar: string | null;
  ascii_name: string | null;
  population: number;
}

let countriesCache: Promise<LocationCountry[]> | null = null;

export function getLocationCountries(): Promise<LocationCountry[]> {
  countriesCache ??= supabase
    .from('location_countries')
    .select('iso2,iso3,name,name_ar,phone_code,currency_code,flag_emoji')
    .eq('is_active', true)
    .order('name')
    .then(({ data, error }) => {
      if (error) throw error;
      return (data ?? []) as LocationCountry[];
    });
  return countriesCache;
}

export async function getLocationRegions(
  countryIso2: string,
): Promise<LocationRegion[]> {
  const { data, error } = await supabase
    .from('location_regions')
    .select('geoname_id,country_iso2,admin1_code,name,name_ar')
    .eq('country_iso2', countryIso2.toUpperCase())
    .order('name');
  if (error) throw error;
  return (data ?? []) as LocationRegion[];
}

export async function searchLocationCities({
  countryIso2,
  regionGeonameId,
  query = '',
  limit = 50,
  offset = 0,
}: {
  countryIso2: string;
  regionGeonameId?: number | null;
  query?: string;
  limit?: number;
  offset?: number;
}): Promise<LocationCity[]> {
  const { data, error } = await supabase.rpc('search_location_cities', {
    p_country_iso2: countryIso2.toUpperCase(),
    p_query: query.trim(),
    p_region_geoname_id: regionGeonameId ?? null,
    p_limit: Math.min(Math.max(limit, 1), 100),
    p_offset: Math.max(offset, 0),
  });
  if (error) throw error;
  return (data ?? []) as LocationCity[];
}

export function clearLocationCountriesCache(): void {
  countriesCache = null;
}
