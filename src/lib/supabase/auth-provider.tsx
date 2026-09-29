"use client";

import SimpleLoader from '@/components/shared/SimpleLoader';
import { UserData, UserRole } from '@/types';
import { supabase } from '@/lib/supabase/config';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { checkAccountStatus } from './account-status-checker';

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

interface SupabaseAuthProviderProps {
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

const ROLE_TABLES: Record<string, string> = {
  player: 'players',
  club: 'clubs',
  academy: 'academies',
  trainer: 'trainers',
  agent: 'agents',
  marketer: 'marketers',
  admin: 'admins',
};

// Fetch user data from Supabase tables
async function fetchUserData(userId: string, _email: string): Promise<{ data: Record<string, unknown>; collection: string; accountType: UserRole } | null> {
  // Fast path for the migrated Supabase model: resolve the account from users/employee
  // first, then touch only the single role table that is actually needed.
  // The broader legacy fallback below remains for accounts that have not been normalized yet.
  const [userByIdResult, employeeByAuthResult] = await Promise.all([
    supabase
      .from('users')
      .select('id,uid,email,accountType,full_name,name,phone,profile_image,isDeleted,isActive,employeeId,role,roleId')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('employees')
      .select('*')
      .eq('authUserId', userId)
      .maybeSingle(),
  ]);

  if (employeeByAuthResult.data) {
    return {
      data: employeeByAuthResult.data as Record<string, unknown>,
      collection: 'employees',
      accountType: 'admin',
    };
  }

  const userById = userByIdResult.data as Record<string, unknown> | null;
  if (userById) {
    const accountType = String(userById.accountType || '').toLowerCase();
    const accountTable = ROLE_TABLES[accountType];

    if (accountTable) {
      const roleById = await supabase
        .from(accountTable)
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (roleById.data) {
        return {
          data: roleById.data as Record<string, unknown>,
          collection: accountTable,
          accountType: accountType as UserRole,
        };
      }

      const roleByUid = await supabase
        .from(accountTable)
        .select('*')
        .eq('uid', userId)
        .maybeSingle();

      if (roleByUid.data) {
        return {
          data: roleByUid.data as Record<string, unknown>,
          collection: accountTable,
          accountType: accountType as UserRole,
        };
      }
    }

    return {
      data: userById,
      collection: 'users',
      accountType: (accountType as UserRole) || 'player',
    };
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


  return null;
}

export function SupabaseAuthProvider({ children }: SupabaseAuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' ||
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


  // Auth state listener
  useEffect(() => {
    let isSubscribed = true;
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
    let listenerRun = 0;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isSubscribed) return;

      if (session?.user) {
        const authUser = session.user;
        setUser(authUser);
        setError(null);

        // Set up realtime listener for user data
        const setupUserListener = async () => {
          const runId = ++listenerRun;
          try {
            const result = await fetchUserData(authUser.id, authUser.email || '');
            if (!isSubscribed || runId !== listenerRun) return;
            if (!result) {
              if (isSubscribed) { setLoading(false); setHasInitialized(true); }
              return;
            }

            const { data: rowData, collection: collectionName, accountType: userAccountType } = result;

            // Merge users table data if from a different collection
            let legacyData: Record<string, unknown> = {};
            if (collectionName !== 'users') {
              const { data: usersData } = await supabase.from('users').select('*').eq('id', authUser.id).limit(1);
              if (!isSubscribed || runId !== listenerRun) return;
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
            if (!isSubscribed || runId !== listenerRun) return;
            if (realtimeChannel) {
              await supabase.removeChannel(realtimeChannel);
              if (!isSubscribed || runId !== listenerRun) return;
              realtimeChannel = null;
            }
            const tableName = collectionName === 'employees' ? 'employees' : (collectionName === 'admins' ? 'users' : collectionName);
            const nextChannel = supabase.channel(`user-data-${authUser.id}`);
            nextChannel.on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: tableName,
                filter: `id=eq.${collectionName === 'employees' ? String(rowData.id) : authUser.id}`,
              }, async () => {
                if (!isSubscribed || runId !== listenerRun) return;
                // Refresh on change
                const refreshResult = await fetchUserData(authUser.id, authUser.email || '');
                if (refreshResult && isSubscribed && runId === listenerRun) {
                  setUserData(prev => ({ ...(prev || {}), ...refreshResult.data } as UserData));
                }
              });
            realtimeChannel = nextChannel;
            await nextChannel.subscribe();

          } catch (err) {
            console.error('Error in user data listener:', err);
            if (isSubscribed) { setLoading(false); setHasInitialized(true); }
          }
        };

        setupUserListener();
      } else {
        listenerRun += 1;
        if (realtimeChannel) {
          void supabase.removeChannel(realtimeChannel);
          realtimeChannel = null;
        }
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
      listenerRun += 1;
      subscription.unsubscribe();
      if (realtimeChannel) void supabase.removeChannel(realtimeChannel);
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

      const result = await fetchUserData(authUser.id, email);
      let foundData = result?.data || null;
      let userAccountType: UserRole = result?.accountType || 'player';
      const foundCollection = result?.collection || 'users';

      if (!foundData) {
        await supabase.auth.signOut();
        throw new Error('تعذر ربط الحساب بهوية موثوقة. يرجى إكمال ربط الحساب أو اختيار نوع الحساب.');
      }

      const isEmployee = foundCollection === 'employees';
      let permissions: string[] = [];
      if (isEmployee && foundData.roleId) {
        const { data: roleRows } = await supabase.from('roles').select('*').eq('id', String(foundData.roleId)).limit(1);
        if (roleRows?.length) permissions = (roleRows[0] as Record<string, unknown>).permissions as string[] || [];
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

      // Ensure we're using the correct site URL for redirect
      const siteUrl = typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL || '';

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${siteUrl}/auth/callback`,
          queryParams: {
            prompt: 'select_account',
            hl: 'ar'
          },
        },
      });

      if (error) throw error;

      // Redirect happens automatically, but we stop execution here
      return new Promise(() => {});
    } catch (error: unknown) {
      const err = error as Error;
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
    _confirmationResult: unknown,
    otp: string,
    _defaultRole: UserRole = 'player',
    _additionalData: Record<string, unknown> = {}
  ): Promise<{ user: User; userData: UserData; isNewUser: boolean }> => {
    // This is a legacy function for backward compatibility.
    // Modern OTP verification is handled via dedicated API routes and handleVerifyOTP in components.
    console.warn('⚠️ verifyPhoneOTP called: This is a legacy path. Use /api/auth/verify-otp-and-check instead.');
    throw new Error('يرجى استخدام نظام التحقق الجديد');
  };

  // Legacy password registration is intentionally disabled. Public registration
  // must use the OTP-backed server flow so account identity and role assignment
  // are created atomically on trusted server/database paths.
  const register: AuthContextType['register'] = async () => {
    throw new Error('استخدم مسار التسجيل الآمن المعتمد على رمز التحقق.');
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
      // Client profile edits must never mutate identity, role, permissions, or account state.
      const allowedProfileFields = new Set([
        'full_name', 'name', 'phone', 'country', 'city', 'address',
        'profile_image', 'profileImage', 'profile_image_url', 'avatar',
        'bio', 'date_of_birth', 'birth_date', 'gender',
      ]);
      const safeUpdates = Object.fromEntries(
        Object.entries(updates).filter(([key]) => allowedProfileFields.has(key)),
      );
      const sanitized = sanitizeForDB({
        ...safeUpdates,
        updated_at: new Date().toISOString(),
      }) as Record<string, unknown>;

      if (Object.keys(safeUpdates).length === 0) return;

      const accountType = userData?.accountType || 'player';
      const tableName = accountType === 'admin' ? 'users' : ROLE_TABLES[accountType] || 'users';
      const profileQuery = supabase.from(tableName).update(sanitized);
      const { error: profileError } = tableName === 'users'
        ? await profileQuery.eq('id', user.id)
        : await profileQuery.or(`id.eq.${user.id},uid.eq.${user.id}`);
      if (profileError) throw profileError;
      if (tableName !== 'users') {
        const { error: usersError } = await supabase.from('users').update(sanitized).eq('id', user.id);
        if (usersError) throw usersError;
      }
      if (userData) setUserData({ ...userData, ...safeUpdates });
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
      const result = await fetchUserData(user.id, user.email || '');
      if (!result) { setUserData(null); return; }

      const { data: foundData, collection: foundCollection, accountType: userAccountType } = result;

      let legacyData: Record<string, unknown> = {};
      if (foundCollection !== 'users') {
        const { data: usersRows } = await supabase.from('users').select('*').eq('id', user.id).limit(1);
        if (usersRows?.length) legacyData = usersRows[0] as Record<string, unknown>;
      }

      let permissions: string[] = [];
      if (foundCollection === 'employees' && foundData.roleId) {
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
