import { getSupabaseAdmin } from '@/lib/supabase/admin';

export type ServerAccountIdentity = {
  authUid: string;
  accountId: string;
  accountType: string;
  name: string;
};

type IdentityCandidateRow = {
  source_table?: unknown;
  account_type?: unknown;
  account_id?: unknown;
  auth_uid?: unknown;
  display_name?: unknown;
};

function toIdentity(row: IdentityCandidateRow): ServerAccountIdentity | null {
  const accountId = String(row.account_id ?? '').trim();
  const authUid = String(row.auth_uid ?? '').trim();
  const accountType = String(row.account_type ?? '').trim();
  if (!accountId || !authUid || !accountType) return null;

  return {
    authUid,
    accountId,
    accountType,
    name: String(row.display_name ?? '').trim() || 'مستخدم',
  };
}

export async function resolveServerAccountIdentity(identifier: string): Promise<ServerAccountIdentity | null> {
  const value = String(identifier || '').trim();
  if (!value) return null;

  const db = getSupabaseAdmin();

  const { data: fastData, error: fastError } = await db.rpc(
    'resolve_account_identity_fast_candidates',
    { p_identifier: value },
  );
  if (fastError) throw fastError;

  let rows = (fastData ?? []) as IdentityCandidateRow[];

  // Legacy or inconsistent accounts keep the exhaustive ambiguity-safe path.
  if (rows.length === 0) {
    const { data, error } = await db.rpc('resolve_account_identity_candidates', {
      p_identifier: value,
    });
    if (error) throw error;
    rows = (data ?? []) as IdentityCandidateRow[];
  }
  const identities = rows
    .map(toIdentity)
    .filter((identity): identity is ServerAccountIdentity => Boolean(identity));

  if (identities.length === 0) return null;

  // Defense in depth: the SQL resolver already fails closed when the supplied
  // identifier maps to more than one Auth UID, but keep the server contract
  // explicit in case the database implementation changes later.
  const authUids = new Set(identities.map(identity => identity.authUid));
  if (authUids.size !== 1) return null;

  // A canonical Auth UID may normally exist in both users + exactly one role
  // table. Multiple non-user role rows remain ambiguous and must fail closed.
  const roleMatches = identities.filter(identity => identity.accountType !== 'user');
  if (roleMatches.length > 1) return null;
  if (roleMatches.length === 1) return roleMatches[0];

  const userMatches = identities.filter(identity => identity.accountType === 'user');
  return userMatches.length === 1 ? userMatches[0] : null;
}
