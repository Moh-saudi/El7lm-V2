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
      const accountId = String(row.id ?? '').trim();
      const authUid = String(row.uid ?? '').trim();
      if (!accountId || !authUid) continue;

      const name = String(row.full_name ?? row.displayName ?? row.name ?? '').trim() || 'مستخدم';
      const identity: ServerAccountIdentity = {
        authUid,
        accountId,
        accountType: candidate.accountType,
        name,
      };

      const matches = byAuthUid.get(authUid) ?? new Map<string, ServerAccountIdentity>();
      matches.set(`${candidate.table}:${accountId}`, identity);
      byAuthUid.set(authUid, matches);
    }
  }

  if (byAuthUid.size !== 1) return null;
  const [, matches] = [...byAuthUid.entries()][0];
  const roleMatches = [...matches.values()].filter(match => match.accountType !== 'user');
  if (roleMatches.length > 1) return null;
  if (roleMatches.length === 1) return roleMatches[0];

  const userMatches = [...matches.values()].filter(match => match.accountType === 'user');
  return userMatches.length === 1 ? userMatches[0] : null;
}
