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

// Static demo and review accounts for instantaneous response
const STATIC_DEMO_ACCOUNTS: Record<string, PhoneAccountRecord> = {
  '01000000004': {
    found: true,
    table: 'users',
    id: 'test_player_01000000004',
    uid: '87427166-ed4f-431c-883a-1da0327429d2',
    email: '201000000004@el7lm.com',
    name: 'سفيان الجزائري',
    accountType: 'player',
  },
  '20100000004': {
    found: true,
    table: 'users',
    id: 'test_player_01000000004',
    uid: '87427166-ed4f-431c-883a-1da0327429d2',
    email: '201000000004@el7lm.com',
    name: 'سفيان الجزائري',
    accountType: 'player',
  },
  '01000000001': {
    found: true,
    table: 'clubs',
    id: 'test_club_01000000001',
    uid: 'test_club_01000000001',
    email: '201000000001@el7lm.com',
    name: 'Demo Club Account',
    accountType: 'club',
  },
  '20100000001': {
    found: true,
    table: 'clubs',
    id: 'test_club_01000000001',
    uid: 'test_club_01000000001',
    email: '201000000001@el7lm.com',
    name: 'Demo Club Account',
    accountType: 'club',
  },
  '01000000002': {
    found: true,
    table: 'academies',
    id: 'test_academy_01000000002',
    uid: 'test_academy_01000000002',
    email: '201000000002@el7lm.com',
    name: 'Demo Academy Account',
    accountType: 'academy',
  },
  '20100000002': {
    found: true,
    table: 'academies',
    id: 'test_academy_01000000002',
    uid: 'test_academy_01000000002',
    email: '201000000002@el7lm.com',
    name: 'Demo Academy Account',
    accountType: 'academy',
  },
  '01000000003': {
    found: true,
    table: 'trainers',
    id: 'test_trainer_01000000003',
    uid: 'test_trainer_01000000003',
    email: '201000000003@el7lm.com',
    name: 'Demo Trainer Account',
    accountType: 'trainer',
  },
  '20100000003': {
    found: true,
    table: 'trainers',
    id: 'test_trainer_01000000003',
    uid: 'test_trainer_01000000003',
    email: '201000000003@el7lm.com',
    name: 'Demo Trainer Account',
    accountType: 'trainer',
  },
  '01000000005': {
    found: true,
    table: 'agents',
    id: 'test_agent_01000000005',
    uid: 'test_agent_01000000005',
    email: '201000000005@el7lm.com',
    name: 'Demo Agent Account',
    accountType: 'agent',
  },
  '20100000005': {
    found: true,
    table: 'agents',
    id: 'test_agent_01000000005',
    uid: 'test_agent_01000000005',
    email: '201000000005@el7lm.com',
    name: 'Demo Agent Account',
    accountType: 'agent',
  },
  '01000000006': {
    found: true,
    table: 'marketers',
    id: 'test_marketer_01000000006',
    uid: 'test_marketer_01000000006',
    email: '201000000006@el7lm.com',
    name: 'Demo Marketer Account',
    accountType: 'marketer',
  },
  '20100000006': {
    found: true,
    table: 'marketers',
    id: 'test_marketer_01000000006',
    uid: 'test_marketer_01000000006',
    email: '201000000006@el7lm.com',
    name: 'Demo Marketer Account',
    accountType: 'marketer',
  },
  '01017799580': {
    found: true,
    table: 'players',
    id: 'google_play_review_player',
    uid: 'google_play_review_player',
    email: '201017799580@el7lm.com',
    name: 'Google Play Review Player',
    accountType: 'player',
  },
  '201017799580': {
    found: true,
    table: 'players',
    id: 'google_play_review_player',
    uid: 'google_play_review_player',
    email: '201017799580@el7lm.com',
    name: 'Google Play Review Player',
    accountType: 'player',
  },
};

export async function findAccountByPhone(
  phoneNumber: string,
): Promise<PhoneAccountLookup> {
  const cleanDigits = phoneNumber.replace(/\D/g, '');
  if (STATIC_DEMO_ACCOUNTS[cleanDigits]) {
    return STATIC_DEMO_ACCOUNTS[cleanDigits];
  }

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

  // Helper to execute table queries with a timeout
  const runTableQueries = async (tables: readonly (typeof ACCOUNT_TABLES)[number][], timeoutMs = 3500) => {
    const queries: Promise<{
      table: (typeof ACCOUNT_TABLES)[number];
      data: any[] | null;
      error: any;
    }>[] = [];

    for (const table of tables) {
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

    const timeoutPromise = new Promise<{
      table: (typeof ACCOUNT_TABLES)[number];
      data: any[] | null;
      error: any;
    }[]>((resolve) => setTimeout(() => resolve([]), timeoutMs));

    return Promise.race([Promise.all(queries), timeoutPromise]);
  };

  // Phase 1: Query primary tables ('users' and 'players') first
  const primaryResults = await runTableQueries(['users', 'players'] as const, 3500);

  for (const { table, data, error } of primaryResults) {
    if (error) continue;
    successfulLookups += 1;

    for (const rawRow of data ?? []) {
      const row = rawRow as Record<string, unknown>;
      if (isUnavailable(row)) continue;
      const id = String(row.id ?? '').trim();
      if (!id) continue;
      const foundResult: PhoneAccountRecord = {
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

  // Phase 2: Only if not found in primary tables, query other tables
  const secondaryResults = await runTableQueries(
    ['clubs', 'academies', 'agents', 'trainers', 'marketers'] as const,
    3000
  );

  for (const { table, data, error } of secondaryResults) {
    if (error) continue;
    successfulLookups += 1;

    for (const rawRow of data ?? []) {
      const row = rawRow as Record<string, unknown>;
      if (isUnavailable(row)) continue;
      const id = String(row.id ?? '').trim();
      if (!id) continue;
      const foundResult: PhoneAccountRecord = {
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
