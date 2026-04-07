/**
 * Database abstraction layer
 * يحل محل Firebase Firestore بالكامل
 * يستخدم Supabase (service_role) للعمليات الخادمية
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';

// الجداول المتاحة
export type TableName =
  | 'users' | 'players' | 'clubs' | 'academies' | 'agents' | 'trainers' | 'marketers'
  | 'admins' | 'employees'
  | 'conversations' | 'messages' | 'support_conversations' | 'support_messages'
  | 'notifications' | 'admin_notifications' | 'smart_notifications'
  | 'interaction_notifications' | 'player_notifications' | 'join_request_notifications' | 'support_notifications'
  | 'payments' | 'bulkPayments' | 'geidea_payments' | 'invoices' | 'subscriptions'
  | 'subscription_plans' | 'payment_action_logs' | 'payment_results' | 'payment_settings'
  | 'tournaments' | 'tournament_registrations' | 'tournamentRegistrations'
  | 'player_join_requests' | 'organization_referrals' | 'player_rewards' | 'player_stats' | 'player_action_logs'
  | 'dream_academy_categories' | 'dream_academy_sources' | 'dream_academy_stats' | 'private_sessions_requests'
  | 'ads' | 'content' | 'settings' | 'geidea_settings' | 'system_configs'
  | 'otp_codes' | 'otp_verifications' | 'backup_otps' | 'passwordResetTokens' | 'otps'
  | 'analytics' | 'analytics_visits' | 'adminLogs' | 'employee_activities' | 'security_logs' | 'email_logs'
  | 'countries' | 'cities' | 'customers' | 'partners' | 'roles' | 'referrals' | 'receipts'
  | 'careerApplications' | 'careers_applications' | 'real-time-stats' | 'real-time-updates'

// نوع بيانات المستخدم متعدد الأدوار
export type UserCollection = 'players' | 'clubs' | 'academies' | 'agents' | 'trainers' | 'marketers' | 'users';

export const USER_COLLECTIONS: UserCollection[] = ['players', 'clubs', 'academies', 'agents', 'trainers', 'marketers', 'users'];
export const PRIORITY_COLLECTIONS: UserCollection[] = ['players', 'clubs', 'academies', 'users'];

// ==========================================
// CRUD Operations - يحاكي واجهة Firestore
// ==========================================

/** جلب وثيقة واحدة بالـ ID */
export async function getDoc(table: TableName, id: string) {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from(table).select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

/** جلب مجموعة وثائق مع فلاتر */
export async function getDocs(
  table: TableName,
  filters?: Record<string, unknown>,
  options?: { orderBy?: string; orderDir?: 'asc' | 'desc'; limit?: number; offset?: number }
) {
  const db = getSupabaseAdmin();
  let query = db.from(table).select('*');

  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value) as typeof query;
      }
    }
  }

  if (options?.orderBy) {
    query = query.order(options.orderBy, { ascending: options.orderDir !== 'desc' }) as typeof query;
  }
  if (options?.limit) {
    query = query.limit(options.limit) as typeof query;
  }
  if (options?.offset) {
    query = query.range(options.offset, (options.offset + (options.limit || 50)) - 1) as typeof query;
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/** إضافة وثيقة جديدة */
export async function addDoc(table: TableName, data: Record<string, unknown>) {
  const db = getSupabaseAdmin();
  const { data: result, error } = await db.from(table).insert(data).select().single();
  if (error) throw error;
  return result;
}

/** تعيين/تحديث وثيقة بالـ ID (upsert) */
export async function setDoc(table: TableName, id: string, data: Record<string, unknown>, merge = true) {
  const db = getSupabaseAdmin();
  if (merge) {
    const { data: result, error } = await db
      .from(table)
      .upsert({ id, ...data })
      .select()
      .single();
    if (error) throw error;
    return result;
  } else {
    const { data: result, error } = await db
      .from(table)
      .insert({ id, ...data })
      .select()
      .single();
    if (error) throw error;
    return result;
  }
}

/** تحديث حقول في وثيقة */
export async function updateDoc(table: TableName, id: string, data: Record<string, unknown>) {
  const db = getSupabaseAdmin();
  const { data: result, error } = await db
    .from(table)
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return result;
}

/** حذف وثيقة */
export async function deleteDoc(table: TableName, id: string) {
  const db = getSupabaseAdmin();
  const { error } = await db.from(table).delete().eq('id', id);
  if (error) throw error;
  return true;
}

/** بحث نصي في حقل */
export async function searchDocs(
  table: TableName,
  column: string,
  searchTerm: string,
  limit = 20
) {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from(table)
    .select('*')
    .ilike(column, `%${searchTerm}%`)
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/** بحث مستخدم بالهاتف عبر أنواع الحسابات */
export async function findUserByPhone(phone: string): Promise<{ data: Record<string, unknown> | null; collection: UserCollection | null }> {
  const db = getSupabaseAdmin();

  // تنظيف الهاتف
  const cleanPhone = phone.replace(/\s+/g, '').replace(/^00/, '+');

  // صيغ مختلفة للهاتف
  const phoneVariants = [
    cleanPhone,
    cleanPhone.replace('+', ''),
    cleanPhone.startsWith('+2') ? cleanPhone.slice(2) : `+2${cleanPhone}`,
    cleanPhone.startsWith('0') ? cleanPhone : `0${cleanPhone.slice(-10)}`,
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  for (const collection of PRIORITY_COLLECTIONS) {
    for (const variant of phoneVariants) {
      const { data } = await db
        .from(collection)
        .select('*')
        .or(`phone.eq.${variant},originalPhone.eq.${variant},phoneNormalized.eq.${variant}`)
        .eq('isDeleted', false)
        .limit(1)
        .single();

      if (data) return { data, collection };
    }
  }

  return { data: null, collection: null };
}

/** بحث مستخدم بالإيميل عبر أنواع الحسابات */
export async function findUserByEmail(email: string): Promise<{ data: Record<string, unknown> | null; collection: UserCollection | null }> {
  const db = getSupabaseAdmin();
  const lowerEmail = email.toLowerCase().trim();

  for (const collection of PRIORITY_COLLECTIONS) {
    const { data } = await db
      .from(collection)
      .select('*')
      .or(`email.eq.${lowerEmail},originalEmail.eq.${lowerEmail},firebaseEmail.eq.${lowerEmail}`)
      .limit(1)
      .single();

    if (data) return { data, collection };
  }

  return { data: null, collection: null };
}

/** جلب عدد الوثائق */
export async function countDocs(table: TableName, filters?: Record<string, unknown>) {
  const db = getSupabaseAdmin();
  let query = db.from(table).select('*', { count: 'exact', head: true });

  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value) as typeof query;
      }
    }
  }

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/** تحديث/إضافة متعدد (batch) */
export async function batchUpsert(table: TableName, records: Record<string, unknown>[]) {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from(table).upsert(records).select();
  if (error) throw error;
  return data ?? [];
}

/** حذف متعدد */
export async function batchDelete(table: TableName, ids: string[]) {
  const db = getSupabaseAdmin();
  const { error } = await db.from(table).delete().in('id', ids);
  if (error) throw error;
  return true;
}

/** قراءة أحدث الوثائق */
export async function getLatestDocs(table: TableName, limit = 10, dateField = 'createdAt') {
  return getDocs(table, undefined, { orderBy: dateField, orderDir: 'desc', limit });
}
