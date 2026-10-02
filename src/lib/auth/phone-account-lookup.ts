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
  'admins',
] as const;

type AccountTable = (typeof ACCOUNT_TABLES)[number];

const SUPPORTED_ACCOUNT_TYPES = new Set([
  'player',
  'club',
  'academy',
  'agent',
  'trainer',
  'marketer',
  'admin',
]);

type PhoneCandidate = {
  source_table?: unknown;
  account_type?: unknown;
  account_id?: unknown;
  auth_uid?: unknown;
  email?: unknown;
  display_name?: unknown;
};

export interface PhoneAccountRecord {
  found: true;
  table: AccountTable;
  id: string;
  uid: string | null;
  email: string;
  name: string;
  accountType: string;
}

export type PhoneAccountLookup = PhoneAccountRecord | { found: false };

function normalizeCandidate(row: PhoneCandidate): PhoneAccountRecord | null {
  const table = String(row.source_table ?? '').trim() as AccountTable;
  const id = String(row.account_id ?? '').trim();
  const uid = String(row.auth_uid ?? '').trim() || null;
  const rawType = String(row.account_type ?? '').trim().toLowerCase();

  if (!ACCOUNT_TABLES.includes(table) || !id) return null;

  return {
    found: true,
    table,
    id,
    uid,
    email: String(row.email ?? '').trim(),
    name: String(row.display_name ?? '').trim(),
    accountType: SUPPORTED_ACCOUNT_TYPES.has(rawType) ? rawType : 'player',
  };
}

export async function findAccountByPhone(
  phoneNumber: string,
): Promise<PhoneAccountLookup> {
  const variants = generatePhoneVariants(phoneNumber);
  if (variants.length === 0) return { found: false };

  const db = getSupabaseAdmin();
  const { data, error } = await db.rpc('resolve_account_by_phone_variants', {
    p_variants: variants,
  });

  if (error) {
    throw new Error('Account database lookup is unavailable.');
  }

  const candidates = ((data ?? []) as PhoneCandidate[])
    .map(normalizeCandidate)
    .filter((candidate): candidate is PhoneAccountRecord => Boolean(candidate));

  if (candidates.length === 0) return { found: false };

  // users + exactly one role row for the same UID/account is normal. Different
  // canonical keys for the same phone are ambiguous and must fail closed.
  const canonicalKeys = new Set(
    candidates.map(candidate => candidate.uid || candidate.id),
  );
  if (canonicalKeys.size !== 1) {
    throw new Error('Phone number is linked to multiple accounts.');
  }

  const roleCandidates = candidates.filter(candidate => candidate.table !== 'users');
  if (roleCandidates.length > 1) {
    const distinctRoles = new Set(roleCandidates.map(candidate => `${candidate.table}:${candidate.id}`));
    if (distinctRoles.size > 1) {
      throw new Error('Phone number is linked to multiple account roles.');
    }
  }

  if (roleCandidates.length > 0) return roleCandidates[0];

  return candidates[0];
}
