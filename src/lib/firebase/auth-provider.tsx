"use client";

import SimpleLoader from '@/components/shared/SimpleLoader';
import { UserData, UserRole } from '@/types';
import { supabase } from '@/lib/supabase/config';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { checkAccountStatus, updateLastLogin } from './account-status-checker';

// User data interface
interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ user: User; userData: UserData }>;
  signInWithGoogle: (defaultRole?: UserRole) => Promise<{ user: User; userData: UserData; isNewUser: boolean }>;
  register: (email: string, password: string, role: UserRole, additionalData?: Record<string, unknown>) => Promise<UserData>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUserData: (updates: Partial<UserData>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  clearError: () => void;
  refreshUserData: () => Promise<void>;
  setupRecaptcha: (containerId: string) => Promise<unknown>;
  sendPhoneOTP: (phoneNumber: string, appVerifier: unknown) => Promise<unknown>;
  verifyPhoneOTP: (confirmationResult: unknown, otp: string, defaultRole?: UserRole, additionalData?: Record<string, unknown>) => Promise<{ user: User; userData: UserData; isNewUser: boolean }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface FirebaseAuthProviderProps {
  children: ReactNode;
}

// Remove undefined values recursively
const sanitizeForDB = (input: unknown): unknown => {
  if (input === undefined) return undefined;
  if (input === null) return null;
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeForDB(item)).filter((item) => item !== undefined);
  }
  if (typeof input === 'object') {
    const entries = Object.entries(input as Record<string, unknown>)
      .map(([key, value]) => [key, sanitizeForDB(value)] as [string, unknown])
      .filter(([, value]) => value !== undefined);
    return Object.fromEntries(entries);
  }
  return input;
};

// Helper to get user display data from Supabase user metadata
function getDisplayName(user: User): string {
  return String(user.user_metadata?.full_name || user.user_metadata?.name || '');
}

function getPhotoURL(user: User): string {
  return String(user.user_metadata?.avatar_url || user.user_metadata?.picture || '');
}

// Fetch user data from Supabase tables
async function fetchUserData(userId: string, email: string, firebaseUid?: string): Promise<{ data: Record<string, unknown>; collection: string; accountType: UserRole } | null> {
  const isSuperAdmin = email === 'admin@el7lm.com' || email === 'admin@elhilm.com';

  if (isSuperAdmin) {
    const { data } = await supabase.from('users').select('*').eq('id', userId).limit(1);
    return {
      data: data?.[0] as Record<string, unknown> || { id: userId, email, full_name: 'Super Admin', accountType: 'admin', isAdmin: true },
      collection: 'users',
      accountType: 'admin',
    };
  }

  // Check employees first
  try {
    let { data: employees } = await supabase.from('employees').select('*').eq('authUserId', userId).limit(1);
    if (!employees?.length && email) {
      const res = await supabase.from('employees').select('*').eq('email', email).limit(1);
      employees = res.data;
      if (employees?.length) {
        // Auto-link employee account
        await supabase.from('employees').update({ authUserId: userId, updatedAt: new Date().toISOString() })
          .eq('id', String((employees[0] as Record<string, unknown>).id));
        console.log('🔗 Automatically linked employee account via email:', email);
      }
    }
    if (employees?.length) {
      return { data: employees[0] as Record<string, unknown>, collection: 'employees', accountType: 'admin' };
    }
  } catch (err) {
    console.warn('Error searching employees:', err);
  }

  // Check role-specific tables — try by uid (Supabase Auth UUID) first, then by id
  const accountTypes = ['admins', 'clubs', 'academies', 'trainers', 'agents', 'players', 'marketers'];

  // البحث بالـ uid (Supabase UUID) - الأكثر موثوقية بعد الهجرة
  const uidResults = await Promise.allSettled(
    accountTypes.map(t => supabase.from(t).select('*').eq('uid', userId).limit(1))
  );
  for (let i = 0; i < uidResults.length; i++) {
    const r = uidResults[i];
    if (r.status === 'fulfilled' && r.value.data?.length) {
      const accountType: UserRole = accountTypes[i] === 'admins' ? 'admin' : (accountTypes[i].slice(0, -1) as UserRole);
      return { data: r.value.data[0] as Record<string, unknown>, collection: accountTypes[i], accountType };
    }
  }

  // البحث بالـ id (Firebase UID القديم) كبديل
  const results = await Promise.allSettled(
    accountTypes.map(t => supabase.from(t).select('*').eq('id', userId).limit(1))
  );
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === 'fulfilled' && r.value.data?.length) {
      const accountType: UserRole = accountTypes[i] === 'admins' ? 'admin' : (accountTypes[i].slice(0, -1) as UserRole);
      return { data: r.value.data[0] as Record<string, unknown>, collection: accountTypes[i], accountType };
    }
  }

  // Fallback to users table
  const { data: usersData } = await supabase.from('users').select('*').eq('id', userId).limit(1);
  if (usersData?.length) {
    const d = usersData[0] as Record<string, unknown>;
    const accountType = (d.accountType as UserRole) || 'player';
    return { data: d, collection: 'users', accountType };
  }

  // إذا لم نجد شيئاً بالـ Supabase UUID، نحاول بالـ Firebase UID (للمستخدمين المهاجرين)
  if (firebaseUid && firebaseUid !== userId) {
    const fbResults = await Promise.allSettled(
      accountTypes.map(t => supabase.from(t).select('*').eq('id', firebaseUid).limit(1))
    );
    for (let i = 0; i < fbResults.length; i++) {
      const r = fbResults[i];
      if (r.status === 'fulfilled' && r.value.data?.length) {
        const accountType: UserRole = accountTypes[i] === 'admins' ? 'admin' : (accountTypes[i].slice(0, -1) as UserRole);
        return { data: { ...r.value.data[0] as Record<string, unknown>, _dbId: firebaseUid }, collection: accountTypes[i], accountType };
      }
    }
    const { data: fbUsers } = await supabase.from('users').select('*').eq('id', firebaseUid).limit(1);
    if (fbUsers?.length) {
      const d = fbUsers[0] as Record<string, unknown>;
      return { data: { ...d, _dbId: firebaseUid }, collection: 'users', accountType: (d.accountType as UserRole) || 'player' };
    }
  }

  return null;
}

export function FirebaseAuthProvider({ children }: FirebaseAuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.DISABLE_FIREBASE_DURING_BUILD === 'true' ||
    (process.env.NODE_ENV === 'production' && typeof window === 'undefined');

  if (isBuildTime) {
    const mockValue: AuthContextType = {
      user: null, userData: null, loading: false, error: null,
      login: async () => { throw new Error('Auth not available during build'); },
      signInWithGoogle: async () => { throw new Error('Auth not available during build'); },
      register: async () => { throw new Error('Auth not available during build'); },
      logout: async () => { },
      signOut: async () => { },
      updateUserData: async () => { },
      resetPassword: async () => { },
      changePassword: async () => { },
      clearError: () => { },
      refreshUserData: async () => { },
      setupRecaptcha: async () => null,
      sendPhoneOTP: async () => { throw new Error('Auth not available during build'); },
      verifyPhoneOTP: async () => { throw new Error('Auth not available during build'); },
    };
    return <AuthContext.Provider value={mockValue}>{children}</AuthContext.Provider>;
  }

  const router = useRouter();

  // Timeout guards
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading && !hasInitialized) {
        if (user) { setLoading(false); setHasInitialized(true); }
        else { setError('Loading timeout - please refresh the page'); }
      }
    }, 15000);
    return () => clearTimeout(timer);
  }, [loading, hasInitialized, user]);

  useEffect(() => {
    if (loading && hasInitialized && user && !userData) {
      const t = setTimeout(() => {
        if (!userData) { setLoading(false); setHasInitialized(true); }
      }, 10000);
      return () => clearTimeout(t);
    }
  }, [loading, hasInitialized, user, userData]);

  // Helper: save basic user doc
  const createBasicUserDocument = async (userId: string, email: string, role: UserRole = 'player', additionalData: Record<string, unknown> = {}): Promise<UserData> => {
    const { data: existing } = await supabase.from('users').select('*').eq('id', userId).limit(1);
    if (existing?.length) return existing[0] as UserData;

    const now = new Date().toISOString();
    const basicUserData: Record<string, unknown> = {
      id: userId,
      uid: userId,
      email,
      accountType: role,
      full_name: additionalData.full_name || additionalData.name || '',
      phone: additionalData.phone || '',
      profile_image: additionalData.profile_image || additionalData.profileImage || '',
      isNewUser: false,
      isActive: true,
      created_at: additionalData.created_at || now,
      updated_at: now,
      createdAt: additionalData.createdAt || now,
      updatedAt: now,
      ...additionalData,
    };
    await supabase.from('users').upsert(basicUserData);
    return basicUserData as unknown as UserData;
  };

  // Auth state listener
  useEffect(() => {
    let isSubscribed = true;
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isSubscribed) return;

      if (session?.user) {
        const authUser = session.user;
        setUser(authUser);
        setError(null);

        // Set up realtime listener for user data
        const setupUserListener = async () => {
          try {
            // Firebase UID: check metadata first, then sessionStorage (set by OTP login page)
            const storedFirebaseUid = typeof window !== 'undefined' ? sessionStorage.getItem('otp_firebase_uid') : null;
            const firebaseUidForFetch = (authUser.user_metadata?.db_id || authUser.user_metadata?.firebase_uid || storedFirebaseUid) as string | undefined;
            const result = await fetchUserData(authUser.id, authUser.email || '', firebaseUidForFetch);
            if (!result) {
              if (isSubscribed) { setLoading(false); setHasInitialized(true); }
              return;
            }

            const { data: rowData, collection: collectionName, accountType: userAccountType } = result;

            // Merge users table data if from a different collection
            let legacyData: Record<string, unknown> = {};
            if (collectionName !== 'users') {
              const { data: usersData } = await supabase.from('users').select('*').eq('id', authUser.id).limit(1);
              if (usersData?.length) legacyData = usersData[0] as Record<string, unknown>;
            }

            // isDeleted: only block if it's literally true (not string "false" from migration)
            // For re-registration flow: if saved role exists, show new user form
            const isDeleted = rowData.isDeleted === true || rowData.isDeleted === 1;
            if (isDeleted) {
              const savedRole = typeof window !== 'undefined' ? sessionStorage.getItem('reregister_accountType') : null;
              if (savedRole && isSubscribed) {
                setUserData({
                  uid: authUser.id,
                  email: authUser.email || '',
                  accountType: savedRole as UserRole,
                  full_name: getDisplayName(authUser),
                  phone: '',
                  profile_image: '',
                  isNewUser: true,
                } as UserData);
                if (isSubscribed) { setLoading(false); setHasInitialized(true); }
                return;
              }
              // No reregister flow - load data anyway so dashboard can show account status
              // fall through to normal data loading below
            }

            // If employee, fetch role permissions
            let permissions: string[] = [];
            let roleName = '';
            if (collectionName === 'employees' && rowData.roleId) {
              const { data: roleData } = await supabase.from('roles').select('*').eq('id', String(rowData.roleId)).limit(1);
              if (roleData?.length) {
                permissions = (roleData[0] as Record<string, unknown>).permissions as string[] || [];
                roleName = String((roleData[0] as Record<string, unknown>).name || '');
              }
            }

            const newUserData: UserData = {
              uid: authUser.id,
              email: authUser.email || String(rowData.email || legacyData.email || ''),
              accountType: userAccountType,
              full_name: String(rowData.full_name || rowData.name || rowData.academy_name || rowData.club_name || legacyData.full_name || legacyData.name || ''),
              phone: String(rowData.phone || legacyData.phone || ''),
              profile_image: String(rowData.profile_image || rowData.profileImage || rowData.avatar || legacyData.profile_image || ''),
              ...legacyData,
              ...rowData,
              isEmployee: collectionName === 'employees',
              employeeId: collectionName === 'employees' ? String(rowData.id || '') : String(rowData.employeeId || legacyData.employeeId || ''),
              permissions: permissions.length ? permissions : ((rowData.permissions || legacyData.permissions) as string[] || []),
              roleName: roleName || String(rowData.roleName || ''),
            };

            if (isSubscribed) {
              setUserData(newUserData);
              setLoading(false);
              setHasInitialized(true);
              // Clear OTP sessionStorage after successful load
              if (typeof window !== 'undefined') {
                sessionStorage.removeItem('otp_firebase_uid');
                sessionStorage.removeItem('otp_account_type');
              }
            }

            // Set up realtime subscription for user data changes
            if (realtimeChannel) supabase.removeChannel(realtimeChannel);
            const tableName = collectionName === 'employees' ? 'employees' : (collectionName === 'admins' ? 'users' : collectionName);
            realtimeChannel = supabase.channel(`user-data-${authUser.id}`)
              .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: tableName,
                filter: `id=eq.${collectionName === 'employees' ? String(rowData.id) : authUser.id}`,
              }, async () => {
                // Refresh on change
                const refreshResult = await fetchUserData(authUser.id, authUser.email || '', (authUser.user_metadata?.db_id || authUser.user_metadata?.firebase_uid) as string | undefined);
                if (refreshResult && isSubscribed) {
                  setUserData(prev => ({ ...(prev || {}), ...refreshResult.data } as UserData));
                }
              })
              .subscribe();

          } catch (err) {
            console.error('Error in user data listener:', err);
            if (isSubscribed) { setLoading(false); setHasInitialized(true); }
          }
        };

        setupUserListener();
      } else {
        if (isSubscribed) {
          setUser(null);
          setUserData(null);
          setLoading(false);
          setHasInitialized(true);
        }
      }
    });

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
      if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    };
  }, []);

  // Login
  const login = async (email: string, password: string): Promise<{ user: User; userData: UserData }> => {
    try {
      setError(null);
      if (!email.includes('@')) throw new Error('صيغة البريد الإلكتروني غير صحيحة');

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      const authUser = authData.user;
      if (!authUser) throw new Error('فشل تسجيل الدخول');

      const result = await fetchUserData(authUser.id, email, (authUser.user_metadata?.db_id || authUser.user_metadata?.firebase_uid) as string | undefined);
      let foundData = result?.data || null;
      let userAccountType: UserRole = result?.accountType || 'player';
      const foundCollection = result?.collection || 'users';

      if (!foundData) {
        foundData = await createBasicUserDocument(authUser.id, email, userAccountType);
      }

      const isEmployee = foundCollection === 'employees';
      let permissions: string[] = [];
      if (isEmployee && foundData.roleId) {
        const { data: roleRows } = await supabase.from('roles').select('*').eq('id', String(foundData.roleId)).limit(1);
        if (roleRows?.length) permissions = (roleRows[0] as Record<string, unknown>).permissions as string[] || [];
        // Sync employee to users table
        try {
          await supabase.from('users').upsert({
            id: authUser.id,
            ...foundData,
            employeeId: String(foundData.id || ''),
            employeeRole: foundData.roleId || foundData.role,
            role: foundData.roleId || foundData.role,
            updated_at: new Date().toISOString(),
          });
        } catch (e) { console.warn('Error syncing employee data:', e); }
      }

      const userData: UserData = {
        uid: authUser.id,
        email: authUser.email || String(foundData.email || ''),
        accountType: userAccountType,
        full_name: String(foundData.full_name || foundData.name || ''),
        phone: String(foundData.phone || ''),
        profile_image: String(foundData.profile_image || foundData.profileImage || foundData.profile_image_url || foundData.avatar || ''),
        country: String(foundData.country || ''),
        isNewUser: false,
        isEmployee,
        employeeId: isEmployee ? String(foundData.id || '') : undefined,
        created_at: foundData.created_at || foundData.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        permissions,
        ...foundData,
      };

      const accountStatus = await checkAccountStatus(authUser.id);
      if (!accountStatus.canLogin) {
        await supabase.auth.signOut();
        throw new Error(accountStatus.message);
      }

      try { await updateLastLogin(authUser.id); } catch (e) { console.warn('Failed to update last login:', e); }

      setUser(authUser);
      setUserData(userData);
      return { user: authUser, userData };
    } catch (error: unknown) {
      const err = error as Error & { code?: string };
      if (err?.code !== 'auth/invalid-credential' && err?.code !== 'auth/wrong-password') {
        console.error('Login system error:', err.message || err);
      }
      throw error;
    }
  };

  // Google Sign-In
  const signInWithGoogle = async (defaultRole: UserRole = 'player'): Promise<{ user: User; userData: UserData; isNewUser: boolean }> => {
    try {
      setError(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
          queryParams: { prompt: 'select_account', hl: 'ar', defaultRole },
        },
      });
      if (error) throw error;
      // OAuth redirects — return placeholder; real user data arrives via onAuthStateChange after redirect
      throw new Error('REDIRECT_IN_PROGRESS');
    } catch (error: unknown) {
      const err = error as Error;
      if (err.message === 'REDIRECT_IN_PROGRESS') throw err;
      const errorMessage = err.message || 'فشل تسجيل الدخول بواسطة Google';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Phone OTP (kept for API compatibility — uses our ChatAman/OTP service)
  const setupRecaptcha = async (_containerId: string): Promise<unknown> => {
    console.log('ℹ️ setupRecaptcha: using custom OTP service instead of reCAPTCHA');
    return null;
  };

  const sendPhoneOTP = async (phoneNumber: string, _appVerifier: unknown): Promise<{ phoneNumber: string }> => {
    console.log('📱 sendPhoneOTP: using custom OTP service for', phoneNumber);
    return { phoneNumber };
  };

  const verifyPhoneOTP = async (
    confirmationResult: unknown,
    otp: string,
    defaultRole: UserRole = 'player',
    additionalData: Record<string, unknown> = {}
  ): Promise<{ user: User; userData: UserData; isNewUser: boolean }> => {
    // Custom phone OTP is verified via unified-otp-service, not Firebase phone auth
    // After OTP is verified, sign in with email/password using a derived account
    const phoneNumber = (confirmationResult as { phoneNumber: string })?.phoneNumber || '';

    // Check if user with this phone exists
    const { data: usersData } = await supabase.from('users').select('*').eq('phone', phoneNumber).limit(1);
    if (usersData?.length) {
      const existingUser = usersData[0] as Record<string, unknown>;
      const finalRole = (existingUser.accountType as UserRole) || defaultRole;
      const email = String(existingUser.email || '');

      if (email) {
        const { data: authData } = await supabase.auth.signInWithPassword({ email, password: 'PhoneAuth_' + otp });
        if (authData?.user) {
          const userData: UserData = { ...existingUser, uid: authData.user.id, accountType: finalRole } as UserData;
          setUser(authData.user);
          setUserData(userData);
          return { user: authData.user, userData, isNewUser: false };
        }
      }
    }

    // New user registration via phone
    const finalRole = (additionalData.accountType as UserRole) || defaultRole;
    const now = new Date().toISOString();
    const tempEmail = `phone_${phoneNumber.replace(/\D/g, '')}@el7lm.local`;
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: tempEmail,
      password: 'PhoneAuth_' + otp,
    });
    if (signUpError) throw signUpError;
    const authUser = signUpData.user!;

    const userData: UserData = {
      ...additionalData,
      uid: authUser.id,
      email: String(additionalData.email || tempEmail),
      accountType: finalRole,
      full_name: String(additionalData.full_name || additionalData.name || ''),
      phone: phoneNumber,
      profile_image: '',
      isNewUser: true,
      isPhoneAuth: true,
      created_at: now,
      createdAt: now,
      updated_at: now,
      updatedAt: now,
      lastLogin: now,
    } as UserData;

    await supabase.from('users').upsert({ id: authUser.id, ...(sanitizeForDB(userData) as any) });
    if (finalRole !== 'admin') {
      await supabase.from(finalRole + 's').upsert({ id: authUser.id, ...(sanitizeForDB(userData) as any) });
    }

    setUser(authUser);
    setUserData(userData);
    return { user: authUser, userData, isNewUser: true };
  };

  // Register
  const register = async (
    email: string,
    password: string,
    role: UserRole,
    additionalData: Record<string, unknown> = {}
  ): Promise<UserData> => {
    try {
      setLoading(true);
      setError(null);

      if (!email || !password || !role) throw new Error('Email, password, and role are required');
      if (password.length < 8) throw new Error('يجب أن تتكون كلمة المرور من 8 أحرف على الأقل');
      if (password.length > 128) throw new Error('Password is too long. Maximum 128 characters allowed');

      const isNumbersOnly = /^\d+$/.test(password);
      const weakPatterns = [/^(\d)\1+$/, /^(0123456789|9876543210)/, /^12345678$/, /^87654321$/, /^123456/, /^654321/, /^111111/, /^000000/, /^666666/, /^888888/];
      if (isNumbersOnly && weakPatterns.some(p => p.test(password))) {
        throw new Error('كلمة المرور ضعيفة جداً. تجنب الأرقام المتسلسلة أو المتكررة');
      }
      if (email.length > 254) throw new Error('Email is too long');

      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) {
        if (authError.message?.includes('already registered') || authError.message?.includes('email_exists')) {
          // Try to reactivate deleted account
          const { data: existing } = await supabase.from('users').select('*').eq('email', email).limit(1);
          if (existing?.length) {
            const ex = existing[0] as Record<string, unknown>;
            if (ex.isDeleted === true || ex.isActive === false) {
              const now = new Date().toISOString();
              const reactivatedData = { ...ex, ...additionalData, isDeleted: false, isActive: true, accountType: role, updated_at: now, updatedAt: now };
              await supabase.from('users').update(reactivatedData).eq('id', String(ex.id));
              if (role !== 'admin') await supabase.from(role + 's').upsert({ id: ex.id, ...(sanitizeForDB(reactivatedData) as any) });
              const ud = reactivatedData as unknown as UserData;
              setUserData(ud);
              return ud;
            }
          }
          throw new Error('هذا البريد الإلكتروني مسجل بالفعل. يرجى محاولة تسجيل الدخول بدلاً من ذلك.');
        }
        throw authError;
      }

      const authUser = authData.user!;
      const now = new Date().toISOString();

      const userData: UserData = {
        ...additionalData,
        uid: authUser.id,
        email: authUser.email || email,
        accountType: role,
        full_name: String(additionalData.full_name || additionalData.name || ''),
        phone: String(additionalData.phone || ''),
        profile_image: String(additionalData.profile_image || additionalData.profileImage || ''),
        isNewUser: true,
        isActive: true,
        created_at: now,
        createdAt: now,
        updated_at: now,
        updatedAt: now,
        firebaseEmail: email,
        originalPhone: String(additionalData.originalPhone || additionalData.phone || ''),
        lastLogin: now,
        last_login: now,
        lastLoginIP: 'registration',
      } as UserData;

      await supabase.from('users').upsert({ id: authUser.id, ...(sanitizeForDB(userData) as any) });
      if (role !== 'admin') {
        await supabase.from(role + 's').upsert({ id: authUser.id, ...(sanitizeForDB(userData) as any) });
      }

      setUser(authUser);
      setUserData(userData);
      return userData;
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Registration error:', err.message || err);
      throw new Error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUserData(null);
      setError(null);
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Update user data
  const updateUserData = async (updates: Partial<UserData>): Promise<void> => {
    if (!user) return;
    try {
      const accountType = userData?.accountType || 'player';
      const tableName = accountType === 'admin' ? 'users' : `${accountType}s`;
      const sanitized = sanitizeForDB({ ...updates, updated_at: new Date().toISOString() }) as Record<string, unknown>;
      if (sanitized && Object.keys(sanitized).length > 0) {
        await supabase.from(tableName).update(sanitized).eq('id', user.id);
        // Also update users table
        if (tableName !== 'users') {
          await supabase.from('users').update(sanitized).eq('id', user.id);
        }
      }
      if (userData) setUserData({ ...userData, ...updates });
    } catch (error) {
      console.error('Error updating user data:', error);
      setError('Failed to update user data');
    }
  };

  // Reset password
  const resetPassword = async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/reset-password`,
    });
    if (error) throw error;
  };

  // Change password
  const changePassword = async (_currentPassword: string, newPassword: string): Promise<void> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  // Refresh user data
  const refreshUserData = async (): Promise<void> => {
    if (!user) return;
    try {
      const result = await fetchUserData(user.id, user.email || '', (user.user_metadata?.db_id || user.user_metadata?.firebase_uid) as string | undefined);
      if (!result) { setUserData(null); return; }

      const { data: foundData, collection: foundCollection, accountType: userAccountType } = result;

      let legacyData: Record<string, unknown> = {};
      if (foundCollection !== 'users') {
        const { data: usersRows } = await supabase.from('users').select('*').eq('id', user.id).limit(1);
        if (usersRows?.length) legacyData = usersRows[0] as Record<string, unknown>;
      }

      let permissions: string[] = [];
      if (foundCollection === 'employees' && foundData.roleId) {
        // Sync employee to users
        try {
          await supabase.from('users').upsert({ id: user.id, ...foundData, employeeId: foundData.id, employeeRole: foundData.roleId, updated_at: new Date().toISOString() });
        } catch (e) { /* ignore */ }
        const { data: roleRows } = await supabase.from('roles').select('*').eq('id', String(foundData.roleId)).limit(1);
        if (roleRows?.length) permissions = (roleRows[0] as Record<string, unknown>).permissions as string[] || [];
      }

      const newUserData: UserData = {
        uid: user.id,
        email: user.email || String(foundData.email || legacyData.email || ''),
        accountType: userAccountType,
        full_name: String(foundData.full_name || foundData.name || legacyData.full_name || ''),
        phone: String(foundData.phone || legacyData.phone || ''),
        profile_image: String(foundData.profile_image || foundData.profileImage || foundData.profile_image_url || foundData.avatar || legacyData.profile_image || ''),
        country: String(foundData.country || legacyData.country || ''),
        isNewUser: false,
        created_at: foundData.created_at || foundData.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...legacyData,
        ...foundData,
        permissions,
        isEmployee: foundCollection === 'employees',
      };

      setUserData(newUserData);
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  const clearError = () => setError(null);

  const value: AuthContextType = {
    user, userData, loading, error,
    login, signInWithGoogle, register,
    logout, signOut: logout,
    updateUserData, resetPassword, changePassword,
    clearError, refreshUserData,
    setupRecaptcha, sendPhoneOTP, verifyPhoneOTP,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading && hasInitialized && user ? (
        <SimpleLoader size="medium" color="blue" />
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
