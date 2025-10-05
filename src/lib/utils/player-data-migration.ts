import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

/**
 * Ensures a player has proper profile data in the players collection
 * This function migrates data from users collection to players collection if needed
 */
export async function ensurePlayerProfileData(playerId: string): Promise<boolean> {
  try {
    // Check if player exists in players collection
    const playerDocRef = doc(db, 'players', playerId);
    const playerDoc = await getDoc(playerDocRef);
    
    if (playerDoc.exists()) {
      // Player already has profile data
      return true;
    }
    
    // Get user data from users collection
    const userDocRef = doc(db, 'users', playerId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      console.warn(`Player ${playerId} not found in users collection`);
      return false;
    }
    
    const userData = userDoc.data();
    
    // Create basic profile data in players collection
    const basicPlayerData = {
      id: playerId,
      full_name: userData.full_name || userData.name || '',
      name: userData.name || userData.full_name || '',
      email: userData.email || '',
      phone: userData.phone || '',
      accountType: userData.accountType || 'player',
      nationality: userData.nationality || '',
      primary_position: userData.primary_position || userData.position || '',
      position: userData.position || userData.primary_position || '',
      country: userData.country || '',
      city: userData.city || '',
      profile_image: userData.profile_image || '',
      profile_image_url: userData.profile_image_url || '',
      avatar: userData.avatar || '',
      birth_date: userData.birth_date || null,
      age: userData.age || null,
      height: userData.height || '',
      weight: userData.weight || '',
      club_id: userData.club_id || null,
      academy_id: userData.academy_id || null,
      trainer_id: userData.trainer_id || null,
      agent_id: userData.agent_id || null,
      isActive: userData.isActive !== false,
      verified: userData.verified || false,
      profileCompleted: userData.profileCompleted || false,
      createdAt: userData.createdAt || new Date(),
      updatedAt: new Date(),
      // Mark as migrated from users collection
      migratedFromUsers: true,
      migrationDate: new Date()
    };
    
    // Create the document in players collection
    await setDoc(playerDocRef, basicPlayerData, { merge: true });
    
    console.log(`✅ Successfully migrated player ${playerId} to players collection`);
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
    if (result) {
      success.push(playerId);
    } else {
      failed.push(playerId);
    }
  }
  
  return { success, failed };
}

/**
 * Check if a player needs profile data migration
 */
export async function needsProfileMigration(playerId: string): Promise<boolean> {
  try {
    const playerDocRef = doc(db, 'players', playerId);
    const playerDoc = await getDoc(playerDocRef);
    return !playerDoc.exists();
  } catch (error) {
    console.error(`Error checking migration status for player ${playerId}:`, error);
    return false;
  }
}


