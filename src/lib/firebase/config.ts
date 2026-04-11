// Backward compat — الكود انتقل إلى @/lib/supabase/config و @/lib/supabase/geidea-config
export * from '@/lib/supabase/config';
export * from '@/lib/supabase/geidea-config';

// Stubs for backward compat (no-op)
export const app = null;
export const auth = null;
export const db = null;
export const storage = null;
export const analytics = null;
export const hasValidConfig = false;
export const retryOperation = async <T>(fn: () => Promise<T>) => fn();
export const checkFirestoreConnection = async () => false;
export const validateFirebaseConfig = () => false;
