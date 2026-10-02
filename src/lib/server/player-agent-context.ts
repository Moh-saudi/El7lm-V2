import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { resolveServerAccountIdentity } from '@/lib/server/account-identity';

export type PlayerAgentContext = {
  authUid: string;
  accountId: string;
  displayName: string;
  location: {
    country: string;
    city: string;
    nationality: string;
  };
  football: {
    primaryPosition: string;
    secondaryPosition: string;
    preferredFoot: string;
    currentClub: string;
    contractStatus: string;
    contractEndDate: string;
    marketValue: number | null;
  };
  ratings: {
    pace: number | null;
    shooting: number | null;
    passing: number | null;
    dribbling: number | null;
    defending: number | null;
    physical: number | null;
    leadership: number | null;
    teamwork: number | null;
    vision: number | null;
    composure: number | null;
    weakFoot: number | null;
    skillMoves: number | null;
    workRateAttack: string;
    workRateDefense: string;
  };
  career: {
    objectives: unknown;
    achievements: unknown[];
    clubHistory: unknown[];
  };
};

function textValue(value: unknown, max = 160): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function numberValue(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function limitedArray(value: unknown, maxItems = 8): unknown[] {
  return Array.isArray(value) ? value.slice(0, maxItems) : [];
}

function limitedJson(value: unknown, maxChars = 2500): unknown {
  if (value == null) return null;
  try {
    const serialized = JSON.stringify(value);
    if (serialized.length <= maxChars) return value;
    if (Array.isArray(value)) return value.slice(0, 8);
    return null;
  } catch {
    return null;
  }
}

export async function getPlayerAgentContext(authIdentifier: string): Promise<PlayerAgentContext | null> {
  const identity = await resolveServerAccountIdentity(authIdentifier);
  if (!identity || identity.accountType !== 'player') return null;

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('players')
    .select([
      'id','uid','full_name','name','country','city','nationality',
      'position','primary_position','secondary_position','foot','preferred_foot',
      'current_club','contract_status','contract_end_date','market_value',
      'stats_pace','stats_shooting','stats_passing','stats_dribbling',
      'stats_defending','stats_physical','mentality_leadership',
      'mentality_teamwork','mentality_vision','mentality_composure',
      'weak_foot','skill_moves','work_rate_attack','work_rate_defense',
      'objectives','achievements','club_history',
    ].join(','))
    .eq('uid', identity.authUid)
    .limit(2);

  if (error) throw error;
  if ((data?.length ?? 0) !== 1) return null;

  const row = data![0] as Record<string, unknown>;

  return {
    authUid: identity.authUid,
    accountId: identity.accountId,
    displayName: textValue(row.full_name || row.name || identity.name, 120) || 'Player',
    location: {
      country: textValue(row.country, 80),
      city: textValue(row.city, 80),
      nationality: textValue(row.nationality, 80),
    },
    football: {
      primaryPosition: textValue(row.primary_position || row.position, 80),
      secondaryPosition: textValue(row.secondary_position, 80),
      preferredFoot: textValue(row.preferred_foot || row.foot, 40),
      currentClub: textValue(row.current_club, 120),
      contractStatus: textValue(row.contract_status, 40),
      contractEndDate: textValue(row.contract_end_date, 40),
      marketValue: numberValue(row.market_value),
    },
    ratings: {
      pace: numberValue(row.stats_pace),
      shooting: numberValue(row.stats_shooting),
      passing: numberValue(row.stats_passing),
      dribbling: numberValue(row.stats_dribbling),
      defending: numberValue(row.stats_defending),
      physical: numberValue(row.stats_physical),
      leadership: numberValue(row.mentality_leadership),
      teamwork: numberValue(row.mentality_teamwork),
      vision: numberValue(row.mentality_vision),
      composure: numberValue(row.mentality_composure),
      weakFoot: numberValue(row.weak_foot),
      skillMoves: numberValue(row.skill_moves),
      workRateAttack: textValue(row.work_rate_attack, 40),
      workRateDefense: textValue(row.work_rate_defense, 40),
    },
    career: {
      objectives: limitedJson(row.objectives),
      achievements: limitedArray(row.achievements, 8),
      clubHistory: limitedArray(row.club_history, 8),
    },
  };
}
