import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { generatePhoneVariants } from '@/lib/validation/phone-validation';

const ACCOUNT_TABLES = [
  'players',
  'clubs',
  'academies',
  'agents',
  'trainers',
  'marketers',
  'users',
] as const;

const TABLE_ACCOUNT_TYPE: Record<(typeof ACCOUNT_TABLES)[number], string> = {
  players: 'player',
  clubs: 'club',
  academies: 'academy',
  agents: 'agent',
  trainers: 'trainer',
  marketers: 'marketer',
  users: 'player',
};

const SUPPORTED_ACCOUNT_TYPES = new Set([
  'player',
  'club',
  'academy',
  'agent',
  'trainer',
  'marketer',
]);

const TABLE_PHONE_FIELDS: Record<(typeof ACCOUNT_TABLES)[number], string[]> = {
  players: ['phone', 'originalPhone', 'phoneNumber', 'phoneNormalized', 'whatsapp'],
  clubs: ['phone', 'originalPhone', 'phoneNormalized', 'whatsapp'],
  academies: ['phone', 'whatsapp'],
  agents: ['phone', 'originalPhone', 'phoneNormalized', 'whatsapp'],
  trainers: ['phone', 'originalPhone', 'phoneNormalized', 'whatsapp'],
  marketers: ['phone', 'originalPhone', 'phoneNormalized'],
  users: ['phone', 'originalPhone', 'phoneNumber', 'phoneNormalized', 'whatsapp'],
};

export interface PhoneAccountRecord {
  found: true;
  table: (typeof ACCOUNT_TABLES)[number];
  id: string;
  uid: string | null;
  email: string;
  name: string;
  accountType: string;
}

export type PhoneAccountLookup = PhoneAccountRecord | { found: false };

function isUnavailable(row: Record<string, unknown>): boolean {
  return (
    row.isDeleted === true ||
    row.isDeleted === 'true' ||
    row.isActive === false ||
    Boolean(row.deletedAt || row.deletedBy)
  );
}

function normalizedAccountType(
  row: Record<string, unknown>,
  table: (typeof ACCOUNT_TABLES)[number],
): string {
  const stored = String(row.accountType ?? '').trim().toLowerCase();
  return SUPPORTED_ACCOUNT_TYPES.has(stored)
    ? stored
    : TABLE_ACCOUNT_TYPE[table];
}

// In-memory cache for instant lookups without repetitive queries
interface CacheEntry {
  result: PhoneAccountLookup;
  expiresAt: number;
}
const phoneLookupCache = new Map<string, CacheEntry>();
const CACHE_TTL_FOUND_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_TTL_NOT_FOUND_MS = 60 * 1000; // 1 minute

export function invalidatePhoneAccountCache(phoneNumber?: string) {
  if (!phoneNumber) {
    phoneLookupCache.clear();
    return;
  }
  const variants = generatePhoneVariants(phoneNumber);
  for (const v of variants) {
    phoneLookupCache.delete(v);
  }
}

export async function findAccountByPhone(
  phoneNumber: string,
): Promise<PhoneAccountLookup> {
  const variants = generatePhoneVariants(phoneNumber);
  if (variants.length === 0) return { found: false };

  // 1. Instant cache check across any phone variant
  const now = Date.now();
  for (const v of variants) {
    const cached = phoneLookupCache.get(v);
    if (cached) {
      if (cached.expiresAt > now) {
        return cached.result;
      }
      phoneLookupCache.delete(v);
    }
  }

  const db = getSupabaseAdmin();
  let successfulLookups = 0;

  // Helper to store in cache for all variants
  const setInCache = (res: PhoneAccountLookup) => {
    const ttl = res.found ? CACHE_TTL_FOUND_MS : CACHE_TTL_NOT_FOUND_MS;
    const expiresAt = Date.now() + ttl;
    for (const v of variants) {
      phoneLookupCache.set(v, { result: res, expiresAt });
    }
    // Limit cache size to prevent memory leaks
    if (phoneLookupCache.size > 2000) {
      const oldestKeys = Array.from(phoneLookupCache.keys()).slice(0, 500);
      for (const k of oldestKeys) phoneLookupCache.delete(k);
    }
  };

  // Query all valid phone columns across all tables in parallel
  const queries: Promise<{
    table: (typeof ACCOUNT_TABLES)[number];
    data: any[] | null;
    error: any;
  }>[] = [];

  for (const table of ACCOUNT_TABLES) {
    const fields = TABLE_PHONE_FIELDS[table] ?? ['phone'];
    for (const field of fields) {
      queries.push(
        (async () => {
          const { data, error } = await db
            .from(table)
            .select('id, uid, email, name, full_name, displayName, accountType, isDeleted, isActive, deletedAt, deletedBy')
            .in(field, variants)
            .limit(3);
          return { table, data, error };
        })()
      );
    }
  }

  const results = await Promise.all(queries);

  for (const { table, data, error } of results) {
    if (error) {
      continue;
    }
    successfulLookups += 1;

    for (const rawRow of data ?? []) {
      const row = rawRow as Record<string, unknown>;
      if (isUnavailable(row)) continue;
      const id = String(row.id ?? '').trim();
      if (!id) continue;
      const foundResult: PhoneAccountLookup = {
        found: true,
        table,
        id,
        uid: String(row.uid ?? '').trim() || null,
        email: String(row.email ?? '').trim(),
        name: String(
          row.full_name ?? row.displayName ?? row.name ?? '',
        ).trim(),
        accountType: normalizedAccountType(row, table),
      };
      setInCache(foundResult);
      return foundResult;
    }
  }

  // Some legacy accounts exist in Supabase Auth before their public profile
  // row was migrated. Keep this server-side: admin credentials are never sent
  // to the mobile client.
  try {
    const wanted = new Set(variants);
    const { data, error } = await db.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (!error && data?.users) {
      successfulLookups += 1;
      const users = data.users as any[];
      const match = users.find((user: any) => {
        const metadataPhone = String(
          user.app_metadata?.phone ?? user.user_metadata?.phone ?? '',
        );
        return [user.phone ?? '', metadataPhone].some((candidate) =>
          generatePhoneVariants(candidate).some((value) => wanted.has(value)),
        );
      });
      if (match) {
        const rawType = String(
          match.app_metadata?.accountType ??
            match.user_metadata?.accountType ??
            'player',
        )
          .trim()
          .toLowerCase();
        const authFoundResult: PhoneAccountLookup = {
          found: true,
          table: 'users',
          id: match.id,
          uid: match.id,
          email: match.email ?? '',
          name: String(
            match.user_metadata?.full_name ??
              match.user_metadata?.name ??
              '',
          ).trim(),
          accountType: SUPPORTED_ACCOUNT_TYPES.has(rawType)
            ? rawType
            : 'player',
        };
        setInCache(authFoundResult);
        return authFoundResult;
      }
    }
  } catch (error) {
    console.warn('[phone-account-lookup] auth fallback failed', error);
  }

  if (successfulLookups === 0) {
    throw new Error('Account database lookup is unavailable.');
  }

  const notFoundResult: PhoneAccountLookup = { found: false };
  setInCache(notFoundResult);
  return notFoundResult;
}
