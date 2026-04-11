import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

/**
 * Supabase Admin Client - يحل محل Firebase Admin SDK
 * يستخدم service_role key للعمليات الإدارية على الخادم
 * لا تستخدم هذا في المتصفح أبداً
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let adminInstance: ReturnType<typeof createClient<any>> | null = null;

export function getSupabaseAdmin() {
  if (typeof window !== 'undefined') {
    throw new Error('getSupabaseAdmin() must only be called server-side');
  }

  if (!adminInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('[supabase-admin] URL:', url ? url.substring(0, 40) : 'MISSING');
    console.log('[supabase-admin] SERVICE_KEY:', serviceKey ? serviceKey.substring(0, 20) + '...' : 'MISSING');

    if (!url || !serviceKey) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    adminInstance = createClient<any>(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminInstance;
}

// تصدير مباشر للتوافق مع الكود القديم (يحل محل adminDb)
export const adminDb = {
  from: (table: string) => getSupabaseAdmin().from(table),
};

// Auth admin (يحل محل adminAuth من Firebase)
export const adminAuth = {
  // إنشاء مستخدم جديد
  createUser: async (params: {
    email?: string;
    phone?: string;
    password?: string;
    email_confirm?: boolean;
    phone_confirm?: boolean;
    user_metadata?: Record<string, unknown>;
  }) => {
    const admin = getSupabaseAdmin();
    return admin.auth.admin.createUser({
      email: params.email,
      phone: params.phone,
      password: params.password,
      email_confirm: params.email_confirm ?? true,
      phone_confirm: params.phone_confirm ?? true,
      user_metadata: params.user_metadata,
    });
  },

  // حذف مستخدم
  deleteUser: async (uid: string) => {
    const admin = getSupabaseAdmin();
    return admin.auth.admin.deleteUser(uid);
  },

  // تحديث مستخدم
  updateUser: async (uid: string, params: {
    email?: string;
    phone?: string;
    password?: string;
    user_metadata?: Record<string, unknown>;
  }) => {
    const admin = getSupabaseAdmin();
    return admin.auth.admin.updateUserById(uid, params);
  },

  // جلب مستخدم بالـ UID
  getUser: async (uid: string) => {
    const admin = getSupabaseAdmin();
    return admin.auth.admin.getUserById(uid);
  },

  // جلب مستخدم بالـ email
  getUserByEmail: async (email: string) => {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 2000 });
    const user = ((data?.users ?? []) as any[]).find(u => u.email === email) ?? null;
    return { data: user ? { user } : null, error };
  },

  // جلب مستخدم بالهاتف
  getUserByPhone: async (phone: string) => {
    const admin = getSupabaseAdmin();
    // Supabase لا يدعم getBuPhone مباشرة - نبحث في قاعدة البيانات
    const { data, error } = await admin
      .from('users')
      .select('*')
      .or(`phone.eq.${phone},originalPhone.eq.${phone}`)
      .limit(1)
      .maybeSingle();
    return { data, error };
  },

  // التحقق من صحة التوكن
  verifyIdToken: async (token: string) => {
    const admin = getSupabaseAdmin();
    return admin.auth.getUser(token);
  },

  // إنشاء custom token (رابط تسجيل دخول)
  generateSignInWithEmailLink: async (email: string) => {
    const admin = getSupabaseAdmin();
    return admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });
  },
};

export default getSupabaseAdmin;
