/**
 * Firebase Admin - REPLACED BY SUPABASE
 * هذا الملف أصبح wrapper يعيد توجيه كل شيء لـ Supabase Admin
 * للتوافق مع الكود الموجود (backward compatibility)
 */

import { getSupabaseAdmin, adminAuth as supabaseAdminAuth } from '@/lib/supabase/admin';

// تحذير: هذا الملف deprecated - استخدم @/lib/supabase/admin مباشرةً
const isDeprecated = process.env.NODE_ENV === 'development';
if (isDeprecated && typeof window === 'undefined') {
  console.warn('⚠️ firebase/admin.ts is deprecated. Use @/lib/supabase/admin instead.');
}

// adminDb - يحاكي واجهة Firebase Firestore Admin لكنه يستخدم Supabase
export const adminDb = {
  collection: (collectionName: string) => ({
    doc: (id: string) => ({
      get: async () => {
        const db = getSupabaseAdmin();
        const { data, error } = await db.from(collectionName).select('*').eq('id', id).single();
        if (error) return { exists: false, data: () => null, id };
        return { exists: !!data, data: () => data, id: data?.id ?? id };
      },
      set: async (docData: Record<string, unknown>, opts?: { merge?: boolean }) => {
        const db = getSupabaseAdmin();
        if (opts?.merge) {
          await db.from(collectionName).upsert({ id, ...docData });
        } else {
          await db.from(collectionName).upsert({ id, ...docData });
        }
      },
      update: async (docData: Record<string, unknown>) => {
        const db = getSupabaseAdmin();
        await db.from(collectionName).update(docData).eq('id', id);
      },
      delete: async () => {
        const db = getSupabaseAdmin();
        await db.from(collectionName).delete().eq('id', id);
      },
    }),
    add: async (docData: Record<string, unknown>) => {
      const db = getSupabaseAdmin();
      const id = crypto.randomUUID();
      const { data } = await db.from(collectionName).insert({ id, ...docData }).select().single();
      return { id: data?.id ?? id };
    },
    where: (field: string, op: string, value: unknown) => ({
      get: async () => {
        const db = getSupabaseAdmin();
        let query = db.from(collectionName).select('*');
        if (op === '==') query = query.eq(field, value) as typeof query;
        else if (op === '!=') query = query.neq(field, value) as typeof query;
        else if (op === '>') query = query.gt(field, value) as typeof query;
        else if (op === '<') query = query.lt(field, value) as typeof query;
        const { data } = await query;
        return {
          empty: !data || data.length === 0,
          docs: (data ?? []).map((d) => ({ id: d.id, data: () => d, exists: true })),
          forEach: (cb: (doc: unknown) => void) => {
            (data ?? []).forEach((d) => cb({ id: d.id, data: () => d, exists: true }));
          },
        };
      },
    }),
    get: async () => {
      const db = getSupabaseAdmin();
      const { data } = await db.from(collectionName).select('*');
      return {
        empty: !data || data.length === 0,
        docs: (data ?? []).map((d) => ({ id: d.id, data: () => d, exists: true })),
        forEach: (cb: (doc: unknown) => void) => {
          (data ?? []).forEach((d) => cb({ id: d.id, data: () => d, exists: true }));
        },
      };
    },
  }),
};

// adminAuth - يحاكي واجهة Firebase Auth Admin
export const adminAuth = {
  createUser: supabaseAdminAuth.createUser,
  deleteUser: supabaseAdminAuth.deleteUser,
  updateUser: supabaseAdminAuth.updateUser,
  getUser: supabaseAdminAuth.getUser,
  getUserByEmail: supabaseAdminAuth.getUserByEmail,
  verifyIdToken: supabaseAdminAuth.verifyIdToken,
  generatePasswordResetLink: async (email: string) => {
    const db = getSupabaseAdmin();
    return db.auth.admin.generateLink({ type: 'recovery', email });
  },
  generateEmailVerificationLink: async (email: string) => {
    const db = getSupabaseAdmin();
    return db.auth.admin.generateLink({ type: 'signup', email, password: 'TmpPassword123!' });
  },
};

export function initializeFirebaseAdmin() {
  // لا شيء - Supabase لا يحتاج تهيئة يدوية
  console.log('ℹ️ Firebase Admin replaced by Supabase Admin');
}

export function getAdminDb() {
  return adminDb;
}

export default adminDb;
