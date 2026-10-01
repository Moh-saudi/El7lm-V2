import { getSupabaseAdmin } from '@/lib/supabase/admin';

export type ServerAccountIdentity = {
  authUid: string;
  accountId: string;
  accountType: string;
  name: string;
};

const CANDIDATES = [
  { table: 'players', accountType: 'player' },
  { table: 'clubs', accountType: 'club' },
  { table: 'academies', accountType: 'academy' },
  { table: 'agents', accountType: 'agent' },
  { table: 'trainers', accountType: 'trainer' },
  { table: 'marketers', accountType: 'marketer' },
  { table: 'admins', accountType: 'admin' },
  { table: 'users', accountType: 'user' },
] as const;

type Candidate = (typeof CANDIDATES)[number];

function toIdentity(candidate: Candidate, row: Record<string, unknown>): ServerAccountIdentity | null {
  const accountId = String(row.id ?? '').trim();
  const authUid = String(row.uid ?? '').trim();
  if (!accountId || !authUid) return null;

  return {
    authUid,
    accountId,
    accountType: candidate.accountType,
    name: String(row.full_name ?? row.displayName ?? row.name ?? '').trim() || 'مستخدم',
  };
}

function pickPreferredIdentity(matches: Map<string, ServerAccountIdentity>): ServerAccountIdentity | null {
  const roleMatches = [...matches.values()].filter(match => match.accountType !== 'user');
  if (roleMatches.length > 1) return null;
  if (roleMatches.length === 1) return roleMatches[0];

  const userMatches = [...matches.values()].filter(match => match.accountType === 'user');
  return userMatches.length === 1 ? userMatches[0] : null;
}

async function selectCandidateByUid(
  db: ReturnType<typeof getSupabaseAdmin>,
  candidate: Candidate,
  authUid: string,
) {
  switch (candidate.table) {
    case 'players':
    case 'clubs':
    case 'academies':
      return db.from(candidate.table).select('id, uid, full_name, name').eq('uid', authUid).limit(2);
    case 'agents':
    case 'trainers':
    case 'marketers':
      return db.from(candidate.table).select('id, uid, full_name').eq('uid', authUid).limit(2);
    case 'admins':
      return db.from(candidate.table).select('id, uid, name').eq('uid', authUid).limit(2);
    case 'users':
      return db.from(candidate.table).select('id, uid, full_name, name, displayName').eq('uid', authUid).limit(2);
  }
}

export async function resolveServerAccountIdentity(identifier: string): Promise<ServerAccountIdentity | null> {
  const value = String(identifier || '').trim();
  if (!value) return null;

  const db = getSupabaseAdmin();
  const byAuthUid = new Map<string, Map<string, ServerAccountIdentity>>();

  for (const candidate of CANDIDATES) {
    const query = db.from(candidate.table);
    let byId;
    let byUid;

    switch (candidate.table) {
      case 'players':
      case 'clubs':
      case 'academies':
        [byId, byUid] = await Promise.all([
          query.select('id, uid, full_name, name').eq('id', value).limit(2),
          db.from(candidate.table).select('id, uid, full_name, name').eq('uid', value).limit(2),
        ]);
        break;
      case 'agents':
      case 'trainers':
      case 'marketers':
        [byId, byUid] = await Promise.all([
          query.select('id, uid, full_name').eq('id', value).limit(2),
          db.from(candidate.table).select('id, uid, full_name').eq('uid', value).limit(2),
        ]);
        break;
      case 'admins':
        [byId, byUid] = await Promise.all([
          query.select('id, uid, name').eq('id', value).limit(2),
          db.from(candidate.table).select('id, uid, name').eq('uid', value).limit(2),
        ]);
        break;
      case 'users':
        [byId, byUid] = await Promise.all([
          query.select('id, uid, full_name, name, displayName').eq('id', value).limit(2),
          db.from(candidate.table).select('id, uid, full_name, name, displayName').eq('uid', value).limit(2),
        ]);
        break;
    }

    if (byId.error) throw byId.error;
    if (byUid.error) throw byUid.error;
    if ((byUid.data?.length ?? 0) > 1) return null;

    const rows = new Map<string, Record<string, unknown>>();
    for (const row of [...(byId.data ?? []), ...(byUid.data ?? [])]) {
      const record = row as unknown as Record<string, unknown>;
      const accountId = String(record.id ?? '').trim();
      if (accountId) rows.set(accountId, record);
    }

    for (const row of rows.values()) {
      const identity = toIdentity(candidate, row);
      if (!identity) continue;

      const matches = byAuthUid.get(identity.authUid) ?? new Map<string, ServerAccountIdentity>();
      matches.set(`${candidate.table}:${identity.accountId}`, identity);
      byAuthUid.set(identity.authUid, matches);
    }
  }

  if (byAuthUid.size !== 1) return null;
  const [canonicalAuthUid, initialMatches] = [...byAuthUid.entries()][0];

  // If the caller already supplied the canonical Auth UID, the first pass has
  // already collected every table row for that UID.
  if (canonicalAuthUid === value) {
    return pickPreferredIdentity(initialMatches);
  }

  // Account IDs are not globally interchangeable with Auth UIDs. Once an
  // account ID resolves to exactly one UID, hydrate every row for that UID so
  // users.id and role-table id values converge on the same canonical role.
  const canonicalMatches = new Map<string, ServerAccountIdentity>();

  for (const candidate of CANDIDATES) {
    const result = await selectCandidateByUid(db, candidate, canonicalAuthUid);
    if (result.error) throw result.error;
    if ((result.data?.length ?? 0) > 1) return null;

    for (const row of result.data ?? []) {
      const identity = toIdentity(candidate, row as unknown as Record<string, unknown>);
      if (!identity) continue;
      canonicalMatches.set(`${candidate.table}:${identity.accountId}`, identity);
    }
  }

  return pickPreferredIdentity(canonicalMatches);
}
