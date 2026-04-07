import { supabase } from '@/lib/supabase/config';
import { PlayerWithOrganization } from '../../utils/player-organization';
import { DateOrTimestamp } from '../../types/common';

const UNIFIED_PLAYER_PASSWORD = 'Player123!@#';

export interface CreateLoginAccountResult {
  success: boolean;
  message: string;
  tempPassword?: string;
  firebaseUid?: string;
}

export interface PlayerLoginData {
  full_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  club_id?: string;
  academy_id?: string;
  trainer_id?: string;
  agent_id?: string;
  profile_image?: string;
  nationality?: string;
  primary_position?: string;
  position?: string;
  birth_date?: DateOrTimestamp;
  birthDate?: DateOrTimestamp;
  country?: string;
  city?: string;
  [key: string]: unknown;
}

export interface UserAccountData {
  uid: string;
  email: string;
  firebaseEmail: string;
  accountType: 'player';
  full_name: string;
  name: string;
  phone: string;
  club_id: string | null;
  academy_id: string | null;
  trainer_id: string | null;
  agent_id: string | null;
  profile_image: string;
  nationality: string;
  primary_position: string;
  birth_date: DateOrTimestamp | null;
  country: string;
  city: string;
  isActive: boolean;
  verified: boolean;
  profileCompleted: boolean;
  isNewUser: boolean;
  tempPassword: string;
  needsPasswordChange: boolean;
  convertedFromDependent: boolean;
  originalSource: string;
  unifiedPassword: boolean;
  createdAt: string;
  updatedAt: string;
  convertedAt: string;
}

export interface PlayerLoginAccountInfo {
  uid: string;
  email: string;
  full_name: string;
  hasLoginAccount: boolean;
  convertedFromDependent: boolean;
  unifiedPassword: boolean;
}

/**
 * إنشاء حساب تسجيل دخول للاعب التابع
 */
export async function createPlayerLoginAccount(
  playerId: string,
  playerData: PlayerLoginData,
  source: 'players' | 'player' = 'players',
  customPassword?: string
): Promise<CreateLoginAccountResult> {
  try {
    if (!playerData.email || !playerData.full_name && !playerData.name) {
      return { success: false, message: 'الإيميل والاسم الكامل مطلوبان لإنشاء حساب الدخول' };
    }

    const email = playerData.email;
    const fullName = playerData.full_name || playerData.name || '';

    // التحقق من عدم وجود الحساب مسبقاً
    const { data: existing } = await supabase.from('users').select('id').eq('email', email).limit(1);
    if (existing?.length) return { success: false, message: 'حساب بهذا الإيميل موجود مسبقاً' };

    const password = customPassword || UNIFIED_PLAYER_PASSWORD;

    // إنشاء حساب Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) throw authError;

    const authUser = authData.user;
    if (!authUser) throw new Error('فشل إنشاء الحساب');

    const now = new Date().toISOString();
    const userData: UserAccountData = {
      uid: authUser.id,
      email,
      firebaseEmail: email,
      accountType: 'player',
      full_name: fullName,
      name: fullName,
      phone: String(playerData.phone || ''),
      club_id: String(playerData.club_id || '') || null,
      academy_id: String(playerData.academy_id || '') || null,
      trainer_id: String(playerData.trainer_id || '') || null,
      agent_id: String(playerData.agent_id || '') || null,
      profile_image: String(playerData.profile_image || ''),
      nationality: String(playerData.nationality || ''),
      primary_position: String(playerData.primary_position || playerData.position || ''),
      birth_date: playerData.birth_date || playerData.birthDate || null,
      country: String(playerData.country || ''),
      city: String(playerData.city || ''),
      isActive: true,
      verified: false,
      profileCompleted: true,
      isNewUser: false,
      tempPassword: password,
      needsPasswordChange: true,
      convertedFromDependent: true,
      originalSource: source,
      unifiedPassword: true,
      createdAt: now,
      updatedAt: now,
      convertedAt: now,
    };

    await supabase.from('users').upsert({ id: authUser.id, ...userData });

    await supabase.from(source).update({
      convertedToAccount: true,
      firebaseUid: authUser.id,
      loginAccountCreated: true,
      convertedAt: now,
      hasLoginAccount: true,
    }).eq('id', playerId);

    return { success: true, message: 'تم إنشاء حساب تسجيل الدخول بنجاح', tempPassword: password, firebaseUid: authUser.id };
  } catch (error: unknown) {
    console.error('خطأ في إنشاء حساب تسجيل الدخول:', error);
    return { success: false, message: error instanceof Error ? error.message : 'حدث خطأ في إنشاء حساب تسجيل الدخول' };
  }
}

/**
 * التحقق من وجود حساب تسجيل دخول للاعب
 */
export async function checkPlayerHasLoginAccount(playerEmail: string): Promise<boolean> {
  try {
    const { data } = await supabase.from('users').select('id').eq('email', playerEmail).limit(1);
    return (data?.length ?? 0) > 0;
  } catch (error) {
    console.error('خطأ في التحقق من حساب الدخول:', error);
    return false;
  }
}

/**
 * الحصول على معلومات حساب الدخول للاعب
 */
export async function getPlayerLoginAccountInfo(playerEmail: string): Promise<PlayerLoginAccountInfo | null> {
  try {
    const { data } = await supabase.from('users').select('*').eq('email', playerEmail).limit(1);
    if (!data?.length) return null;

    const userData = data[0] as Record<string, unknown>;
    return {
      uid: String(userData.uid || userData.id),
      email: String(userData.email),
      full_name: String(userData.full_name),
      hasLoginAccount: true,
      convertedFromDependent: Boolean(userData.convertedFromDependent),
      unifiedPassword: Boolean(userData.unifiedPassword),
    };
  } catch (error) {
    console.error('خطأ في الحصول على معلومات حساب الدخول:', error);
    return null;
  }
}
