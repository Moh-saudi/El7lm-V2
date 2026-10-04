import { createClient } from '@supabase/supabase-js';

export interface NisrPlayerContext {
  name: string;
  position: string;
  secondaryPosition: string;
  preferredFoot: string;
  age?: number;
  heightCm: string;
  weightKg: string;
  country: string;
  city: string;
  contractStatus: string;
  organization: string;
  profileCompletion: number;
  skills: Record<string, string>;
  recentOpportunities: Array<{
    title: string;
    country: string;
    city: string;
    positions: string;
  }>;
}

export class NisrContextError extends Error {
  constructor(public readonly code: 'NISR_NOT_CONFIGURED' | 'NISR_PROFILE_UNAVAILABLE' | 'NISR_PARENTAL_CONSENT_REQUIRED') {
    super(code);
  }
}

type Row = Record<string, unknown>;

function value(row: Row, ...keys: string[]): string {
  for (const key of keys) {
    const found = row[key];
    if (typeof found === 'string' || typeof found === 'number') {
      const text = String(found).trim().slice(0, 180);
      if (text && text !== 'null') return text;
    }
  }
  return '';
}

function firstName(name: string): string {
  return name.split(/\s+/)[0]?.slice(0, 60) || '';
}

function ageFromBirthDate(raw: string): number | undefined {
  const birth = new Date(raw);
  if (!raw || Number.isNaN(birth.getTime())) return undefined;
  const today = new Date();
  let years = today.getUTCFullYear() - birth.getUTCFullYear();
  const birthdayThisYear = Date.UTC(today.getUTCFullYear(), birth.getUTCMonth(), birth.getUTCDate());
  if (today.getTime() < birthdayThisYear) years--;
  return years >= 0 && years <= 100 ? years : undefined;
}

function hasGuardianConsent(row: Row): boolean {
  if (row.guardian_approved === true || row.guardian_approval === true || row.guardian_consent === true) return true;
  let consent = row.parental_consent;
  if (typeof consent === 'string') {
    try { consent = JSON.parse(consent); } catch { return false; }
  }
  return Boolean(consent && typeof consent === 'object' && !Array.isArray(consent) && (consent as Row).signed === true);
}

function completion(row: Row): number {
  const fields = [
    ['name', 'full_name', 'displayName'],
    ['birth_date', 'birthDate'],
    ['nationality'],
    ['country'],
    ['city'],
    ['position', 'primaryPosition'],
    ['foot', 'preferredFoot'],
    ['height', 'heightCm'],
    ['weight', 'weightKg'],
    ['contract_status', 'contractStatus'],
    ['profileImage', 'avatar_url', 'avatarUrl'],
    ['bio', 'biography'],
  ];
  const filled = fields.filter((aliases) => {
    const fieldValue = value(row, ...aliases);
    return fieldValue !== '' && fieldValue !== '0' && fieldValue !== 'false';
  }).length;
  return Math.round((filled / fields.length) * 100);
}

function opportunityTitle(row: Row, locale: string): string {
  const metadata = row.metadata;
  if (locale !== 'ar' && metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    const translations = (metadata as Row).translations;
    if (translations && typeof translations === 'object' && !Array.isArray(translations)) {
      const translated = (translations as Row)[locale] ?? (translations as Row).en;
      if (translated && typeof translated === 'object' && !Array.isArray(translated)) {
        const title = value(translated as Row, 'title');
        if (title) return title;
      }
    }
  }
  return value(row, 'title');
}

/** Loads only database-owned data linked to this verified Supabase Auth ID. */
export async function loadNisrPlayerContext(authUserId: string, locale: string): Promise<NisrPlayerContext> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey || serviceKey.includes('your_supabase_service_role_key')) {
    throw new NisrContextError('NISR_NOT_CONFIGURED');
  }

  const db = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const byId = await db.from('players').select('*').eq('id', authUserId).limit(2);
  if (byId.error || (byId.data?.length ?? 0) > 1) {
    throw new NisrContextError('NISR_PROFILE_UNAVAILABLE');
  }
  let player = byId.data?.[0] as Row | undefined;
  if (!player) {
    const byUid = await db.from('players').select('*').eq('uid', authUserId).limit(2);
    if (byUid.error || (byUid.data?.length ?? 0) > 1) {
      throw new NisrContextError('NISR_PROFILE_UNAVAILABLE');
    }
    player = byUid.data?.[0] as Row | undefined;
  }

  if (!player) {
    // The canonical phone index can contain the verified Auth-to-player link
    // while older player records still lack the uid column value.
    const index = await db
      .from('phone_accounts_index')
      .select('account_id')
      .eq('supabase_uid', authUserId)
      .eq('account_type', 'player')
      .eq('source_table', 'players')
      .limit(2);
    if (index.error || index.data?.length !== 1) {
      throw new NisrContextError('NISR_PROFILE_UNAVAILABLE');
    }
    const accountId = String(index.data[0].account_id || '');
    if (!accountId) throw new NisrContextError('NISR_PROFILE_UNAVAILABLE');
    const byAccountId = await db.from('players').select('*').eq('id', accountId).limit(2);
    if (byAccountId.error || byAccountId.data?.length !== 1) {
      throw new NisrContextError('NISR_PROFILE_UNAVAILABLE');
    }
    player = byAccountId.data[0] as Row;
  }

  const age = ageFromBirthDate(value(player, 'birth_date', 'birthDate'));
  if (age !== undefined && age < 18 && !hasGuardianConsent(player)) {
    throw new NisrContextError('NISR_PARENTAL_CONSENT_REQUIRED');
  }

  const opportunityResult = await db
    .from('opportunities')
    .select('title,country,city,positions,metadata')
    .eq('status', 'active')
    .eq('isActive', true)
    .order('createdAt', { ascending: false })
    .limit(8);
  const opportunities: Row[] = opportunityResult.error ? [] : (opportunityResult.data as Row[] ?? []);
  const position = value(player, 'position', 'primaryPosition');
  opportunities.sort((a, b) => {
    const isMatch = (row: Row) => {
      if (!position || !Array.isArray(row.positions)) return false;
      return row.positions.some((item) => String(item).toLowerCase() === position.toLowerCase());
    };
    return Number(isMatch(b)) - Number(isMatch(a));
  });

  const organizationId = value(player, 'organizationId', 'club_id', 'clubId', 'academy_id', 'academyId', 'trainer_id', 'trainerId', 'agent_id', 'agentId');
  const organizationType = value(player, 'organizationType') ||
    (value(player, 'club_id', 'clubId') ? 'club' :
      value(player, 'academy_id', 'academyId') ? 'academy' :
        value(player, 'trainer_id', 'trainerId') ? 'trainer' :
          value(player, 'agent_id', 'agentId') ? 'agent' : '');
  let organization = value(player, 'organizationName', 'organization_name', 'club_name', 'clubName', 'academy_name', 'academyName', 'trainer_name', 'trainerName', 'agent_name', 'agentName', 'current_club');
  const organizationTable: Record<string, string> = { club: 'clubs', academy: 'academies', trainer: 'trainers', agent: 'agents' };
  if (!organization && organizationId && organizationTable[organizationType]) {
    const organizationRow = await db.from(organizationTable[organizationType]).select('*').eq('id', organizationId).maybeSingle();
    if (!organizationRow.error && organizationRow.data) {
      organization = value(organizationRow.data as Row, 'name', 'full_name', 'displayName');
    }
  }

  return {
    name: firstName(value(player, 'name', 'full_name', 'displayName')),
    position,
    secondaryPosition: value(player, 'secondary_position', 'secondaryPosition'),
    preferredFoot: value(player, 'foot', 'preferredFoot'),
    age,
    heightCm: value(player, 'height', 'heightCm'),
    weightKg: value(player, 'weight', 'weightKg'),
    country: value(player, 'country', 'nationality'),
    city: value(player, 'city'),
    contractStatus: value(player, 'contract_status', 'contractStatus'),
    organization,
    profileCompletion: completion(player),
    skills: {
      pace: value(player, 'stats_pace', 'pace'),
      shooting: value(player, 'stats_shooting', 'shooting'),
      passing: value(player, 'stats_passing', 'passing'),
      dribbling: value(player, 'stats_dribbling', 'dribbling'),
      defending: value(player, 'stats_defending', 'defending'),
      physical: value(player, 'stats_physical', 'physical'),
    },
    recentOpportunities: opportunities.slice(0, 5).map((row) => ({
      title: opportunityTitle(row, locale),
      country: value(row, 'country'),
      city: value(row, 'city'),
      positions: Array.isArray(row.positions)
        ? row.positions.slice(0, 4).map((item) => String(item).slice(0, 30)).join(', ')
        : '',
    })),
  };
}
