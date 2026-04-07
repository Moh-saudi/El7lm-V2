import { supabase } from '@/lib/supabase/config';

/**
 * Ensures a player has proper profile data in the players table
 */
export async function ensurePlayerProfileData(playerId: string): Promise<boolean> {
  try {
    const { data: existing } = await supabase.from('players').select('id').eq('id', playerId).limit(1);
    if (existing?.length) return true;

    const { data: userData } = await supabase.from('users').select('*').eq('id', playerId).limit(1);
    if (!userData?.length) {
      console.warn(`Player ${playerId} not found in users table`);
      return false;
    }

    const user = userData[0] as Record<string, unknown>;
    const now = new Date().toISOString();

    await supabase.from('players').upsert({
      id: playerId,
      full_name: user.full_name || user.name || '',
      name: user.name || user.full_name || '',
      email: user.email || '',
      phone: user.phone || '',
      accountType: user.accountType || 'player',
      nationality: user.nationality || '',
      primary_position: user.primary_position || user.position || '',
      position: user.position || user.primary_position || '',
      country: user.country || '',
      city: user.city || '',
      profile_image: user.profile_image || '',
      profile_image_url: user.profile_image_url || '',
      avatar: user.avatar || '',
      birth_date: user.birth_date || null,
      age: user.age || null,
      height: user.height || '',
      weight: user.weight || '',
      club_id: user.club_id || null,
      academy_id: user.academy_id || null,
      trainer_id: user.trainer_id || null,
      agent_id: user.agent_id || null,
      isActive: user.isActive !== false,
      verified: user.verified || false,
      profileCompleted: user.profileCompleted || false,
      createdAt: user.createdAt || now,
      updatedAt: now,
      migratedFromUsers: true,
      migrationDate: now,
    });

    console.log(`✅ Successfully migrated player ${playerId} to players table`);
    return true;
  } catch (error) {
    console.error(`❌ Error migrating player ${playerId}:`, error);
    return false;
  }
}

/**
 * Batch migration for multiple players
 */
export async function batchMigratePlayers(playerIds: string[]): Promise<{ success: string[], failed: string[] }> {
  const success: string[] = [];
  const failed: string[] = [];

  for (const playerId of playerIds) {
    const result = await ensurePlayerProfileData(playerId);
    if (result) success.push(playerId);
    else failed.push(playerId);
  }

  return { success, failed };
}

/**
 * Check if a player needs profile data migration
 */
export async function needsProfileMigration(playerId: string): Promise<boolean> {
  try {
    const { data } = await supabase.from('players').select('id').eq('id', playerId).limit(1);
    return !data?.length;
  } catch (error) {
    console.error(`Error checking migration status for player ${playerId}:`, error);
    return false;
  }
}
