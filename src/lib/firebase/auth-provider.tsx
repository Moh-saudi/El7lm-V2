"use client";

import SimpleLoader from '@/components/shared/SimpleLoader';
import { UserData, UserRole } from '@/types';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  signInWithPopup,
  signOut,
  updatePassword,
  User
} from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  onSnapshot
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { checkAccountStatus, updateLastLogin } from './account-status-checker';
import { auth, db } from './config';

// User data interface
interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ user: User; userData: UserData }>;
  signInWithGoogle: (defaultRole?: UserRole) => Promise<{ user: User; userData: UserData; isNewUser: boolean }>;
  register: (email: string, password: string, role: UserRole, additionalData?: any) => Promise<UserData>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>; // إضافة signOut كمرادف لـ logout
  updateUserData: (updates: Partial<UserData>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  clearError: () => void;
  refreshUserData: () => Promise<void>;
  setupRecaptcha: (containerId: string) => Promise<any>;
  sendPhoneOTP: (phoneNumber: string, appVerifier: any) => Promise<any>;
  verifyPhoneOTP: (confirmationResult: any, otp: string, defaultRole?: UserRole, additionalData?: any) => Promise<{ user: User; userData: UserData; isNewUser: boolean }>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface FirebaseAuthProviderProps {
  children: ReactNode;
}

// Remove undefined values recursively to avoid Firestore 400 errors
const sanitizeForFirestore = (input: any): any => {
  if (input === undefined) return undefined;
  if (input === null) return null;
  if (Array.isArray(input)) {
    const sanitizedArray = input
      .map((item) => sanitizeForFirestore(item))
      .filter((item) => item !== undefined);
    return sanitizedArray;
  }
  if (typeof input === 'object') {
    const entries = Object.entries(input)
      .map(([key, value]) => [key, sanitizeForFirestore(value)] as [string, any])
      .filter(([_, value]) => value !== undefined);
    return Object.fromEntries(entries);
  }
  return input;
};

// Initialize Firestore with better settings
const initializeFirestoreWithSettings = async () => {
  try {
    if (typeof window !== 'undefined') {
      // Check if persistence is already enabled or if Firestore has been used
      try {
        // Use the new FirestoreSettings.cache instead of enableIndexedDbPersistence
        // This is the recommended approach for Firebase v9+
        // Firestore initialized with modern settings
      } catch (err: any) {
        if (err.code === 'failed-precondition') {
          console.warn('Multiple tabs open, persistence disabled');
        } else if (err.code === 'unimplemented') {
          console.warn('Browser does not support persistence');
        } else if (err.message?.includes('already been started')) {
          console.warn('Firestore already initialized, skipping persistence setup');
        } else {
          console.warn('Failed to enable persistence:', err);
        }
      }
    }
  } catch (error) {
    console.warn('Failed to enable persistence:', error);
  }
};

// Call initialization only if not already initialized
if (typeof window !== 'undefined') {
  // Use a small delay to ensure Firebase is fully initialized
  setTimeout(() => {
    initializeFirestoreWithSettings();
  }, 100);
}

export function FirebaseAuthProvider({ children }: FirebaseAuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Skip auth initialization during build to prevent memory issues
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.DISABLE_FIREBASE_DURING_BUILD === 'true' ||
    process.env.NODE_ENV === 'production' && typeof window === 'undefined';

  if (isBuildTime) {
    console.log('🚫 Skipping Firebase Auth initialization during build phase');
    // Return a mock context during build time to prevent useAuth errors
    const mockValue: AuthContextType = {
      user: null,
      userData: null,
      loading: false,
      error: null,
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
      setupRecaptcha: async () => { return null; },
      sendPhoneOTP: async () => { throw new Error('Auth not available during build'); },
      verifyPhoneOTP: async () => { throw new Error('Auth not available during build'); }
    };
    return (
      <AuthContext.Provider value={mockValue}>
        {children}
      </AuthContext.Provider>
    );
  }

  // Initialize Firebase only once
  useEffect(() => {
    // Initialization logs removed for cleaner console
  }, []); // Empty dependency array - run only once

  // التحقق من تكوين Firebase
  useEffect(() => {
    try {
      // Config check logs removed for cleaner console
    } catch (configError) {
      console.error('❌ FirebaseAuthProvider: Firebase config error:', configError);
      setError('Firebase configuration error');
      setLoading(false);
      setHasInitialized(true);
    }
  }, []); // Empty dependency array - run only once

  const router = useRouter();

  // Enhanced loading state management
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading && !hasInitialized) {
        if (user) {
          setLoading(false);
          setHasInitialized(true);
          setError(null); // Clear any previous errors
        } else {
          setError('Loading timeout - please refresh the page');
        }
      }
    }, 15000); // 15 second timeout

    return () => clearTimeout(timer);
  }, [loading, hasInitialized, user]);

  // Check for data loading issues
  useEffect(() => {
    if (loading && hasInitialized && user && !userData) {
      const dataTimer = setTimeout(() => {
        if (!userData) {
          setLoading(false);
          setHasInitialized(true);
          setError('System initialization error - please refresh the page');
        }
      }, 10000); // 10 second timeout for user data

      return () => clearTimeout(dataTimer);
    }
  }, [loading, hasInitialized, user, userData]);

  // If initialized and have user but no data after timeout
  useEffect(() => {
    if (hasInitialized && user && !userData && !loading) {
      const missingDataTimer = setTimeout(() => {
        if (!userData) {
          setError('Failed to load user data - please refresh the page');
        }
      }, 5000);

      return () => clearTimeout(missingDataTimer);
    }
  }, [hasInitialized, user, userData, loading]);

  // Helper function to create basic user document if it doesn't exist
  const createBasicUserDocument = async (user: User, role: UserRole = 'player', additionalData: any = {}) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        const basicUserData = {
          uid: user.uid,
          email: user.email || '',
          accountType: role, // Use accountType instead of role for consistency
          full_name: additionalData.full_name || additionalData.name || user.displayName || '',
          phone: additionalData.phone || '',
          profile_image: additionalData.profile_image || additionalData.profileImage || user.photoURL || '',
          isNewUser: false, // Since we found data in role collection, not actually new
          isActive: true,
          created_at: additionalData.created_at || additionalData.createdAt || new Date(),
          updated_at: new Date(),
          ...additionalData
        };
        await setDoc(userRef, sanitizeForFirestore(basicUserData));
        console.log(`✅ Created user document for ${role} with UID: ${user.uid}`, {
          full_name: basicUserData.full_name,
          profile_image: basicUserData.profile_image,
          accountType: basicUserData.accountType,
          country: basicUserData.country
        });
        return basicUserData;
      } else {
        console.log('User document already exists; skipping creation to avoid ID conflict');
        return userDoc.data() as UserData;  // Return existing data if it exists
      }
    } catch (error) {
      console.error('Error creating basic user document:', error);
      throw error;
    }
  };

  // Enhanced authentication state listener
  useEffect(() => {
    let isSubscribed = true;
    let userDocUnsubscribe: (() => void) | null = null;
    let isInitialized = false;

    // Check if auth is available before setting up listener
    if (!auth) {
      console.warn('⚠️ Firebase Auth not available, skipping auth state listener');
      setLoading(false);
      setHasInitialized(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // تجنب التكرار في التهيئة
      if (isInitialized) {
        console.log('🔄 AuthProvider - Skipping duplicate initialization');
        return;
      }
      isInitialized = true;
      try {
        if (user && isSubscribed) {
          setUser(user);
          setError(null);

          // إعداد المستمع الحقيقي لبيانات المستخدم
          const setupUserListener = async () => {
            // 1. البحث عن مصدر البيانات (موظف، مدير، لاعب...)
            let foundDocRef = doc(db, 'users', user.uid);
            let collectionName = 'users';

            // 🛡️ Super Admin Force - تخطي البحث عن المجموعات الأخرى لمنع تداخل الأدوار
            const isSuperAdmin = user.email === 'admin@el7lm.com' || user.email === 'admin@elhilm.com';

            if (isSuperAdmin) {
              console.log('🛡️ Super Admin Session Restore - Forcing Admin Role');
              collectionName = 'users';
              foundDocRef = doc(db, 'users', user.uid);
            } else {
              try {
                // محاولة البحث أولاً في الموظفين باستخدام AuthID
                let employeesQuery = query(collection(db, 'employees'), where('authUserId', '==', user.uid));
                let employeesSnap = await getDocs(employeesQuery);

                // إذا لم نجد باستخدام AuthID، نبحث بالبريد الإلكتروني (للموظفين الذين لم يتم ربطهم بعد)
                if (employeesSnap.empty && user.email) {
                  const emailQuery = query(collection(db, 'employees'), where('email', '==', user.email));
                  const emailSnap = await getDocs(emailQuery);
                  if (!emailSnap.empty) {
                    employeesSnap = emailSnap;
                    // نقوم بتحديث AuthID للموظف ليتم ربطه بالحساب
                    const empDoc = emailSnap.docs[0];
                    try {
                      await updateDoc(doc(db, 'employees', empDoc.id), {
                        authUserId: user.uid,
                        updatedAt: new Date()
                      });
                      console.log('🔗 Automatically linked employee account via email:', user.email);
                    } catch (e) {
                      console.error('Error linking employee account:', e);
                    }
                  }
                }

                if (!employeesSnap.empty) {
                  foundDocRef = doc(db, 'employees', employeesSnap.docs[0].id);
                  collectionName = 'employees';
                } else {
                  // البحث في المجموعات الأخرى
                  const accountTypes = ['admins', 'clubs', 'academies', 'trainers', 'agents', 'players'];
                  for (const col of accountTypes) {
                    const d = await getDoc(doc(db, col, user.uid));
                    if (d.exists()) {
                      foundDocRef = doc(db, col, user.uid);
                      collectionName = col;
                      break;
                    }
                  }
                }
              } catch (err) {
                console.error('Error searching for user collection:', err);
              }
            }

            // مستمع لصلاحيات الدور (للموظفين)
            let roleUnsubscribe: (() => void) | null = null;

            // 2. إعداد المستمع للوثيقة الرئيسية
            userDocUnsubscribe = onSnapshot(foundDocRef, async (snapshot) => {
              if (!snapshot.exists()) {
                if (collectionName !== 'users') {
                  // تحول للبحث في users كـ fallback
                  collectionName = 'users';
                  foundDocRef = doc(db, 'users', user.uid);
                  // سيعيد المستمع بناء نفسه في المحاولة التالية
                  return;
                }
                if (isSubscribed) {
                  setLoading(false);
                  setHasInitialized(true);
                }
                return;
              }

              const data = snapshot.data() || {};

              // جلب بيانات إضافية من مجموعة users لضمان عدم فقدان الحقول القديمة (مثل role)
              let legacyData = {};
              if (collectionName !== 'users') {
                try {
                  const userSnap = await getDoc(doc(db, 'users', user.uid));
                  if (userSnap.exists()) {
                    legacyData = userSnap.data();
                  }
                } catch (e) {
                  console.warn('Could not fetch legacy user data');
                }
              }

              const userAccountType: UserRole = (collectionName === 'admins' || collectionName === 'employees') ? 'admin' : (collectionName.slice(0, -1) as UserRole || 'player');

              const newUserData: UserData = {
                uid: user.uid,
                email: user.email || data.email || (legacyData as any).email || '',
                accountType: userAccountType,
                full_name: data.full_name || data.name || (legacyData as any).full_name || (legacyData as any).name || '',
                phone: data.phone || (legacyData as any).phone || '',
                profile_image: data.profile_image || data.profileImage || data.avatar || (legacyData as any).profile_image || '',
                ...legacyData, // الحقول القديمة أولاً
                ...data,       // البيانات الجديدة تغطي القديمة
                isEmployee: collectionName === 'employees',
                employeeId: collectionName === 'employees' ? snapshot.id : (data.employeeId || (legacyData as any).employeeId)
              };

              // إذا كان موظفاً، نحتاج لمراقبة صلاحيات الدور أيضاً
              if (collectionName === 'employees' && data.roleId) {
                if (roleUnsubscribe) roleUnsubscribe();

                roleUnsubscribe = onSnapshot(doc(db, 'roles', data.roleId), (roleSnap) => {
                  if (roleSnap.exists()) {
                    const roleData = roleSnap.data();
                    if (isSubscribed) {
                      setUserData({
                        ...newUserData,
                        permissions: roleData.permissions || [],
                        roleName: roleData.name
                      } as UserData);
                    }
                  } else if (isSubscribed) {
                    setUserData(newUserData);
                  }
                });
              } else if (isSubscribed) {
                setUserData(newUserData);
              }

              if (isSubscribed) {
                setLoading(false);
                setHasInitialized(true);
              }
            }, (err) => {
              console.error('Error in user data listener:', err);
              if (isSubscribed) {
                setLoading(false);
                setHasInitialized(true);
              }
            });

            // وظيفة التنظيف المدمجة
            const originalUnsub = userDocUnsubscribe;
            userDocUnsubscribe = () => {
              if (originalUnsub) originalUnsub();
              if (roleUnsubscribe) roleUnsubscribe();
            };
          };

          setupUserListener();
        } else if (isSubscribed) {
          setUser(null);
          setUserData(null);
          setLoading(false);
          setHasInitialized(true);
        }
      } catch (authError) {
        console.error('Auth state change error:', authError);
        if (isSubscribed) {
          setError('Authentication error - please refresh');
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
          setHasInitialized(true);
        }
      }
    });

    return () => {
      isSubscribed = false;
      isInitialized = false;
      if (userDocUnsubscribe) {
        userDocUnsubscribe();
      }
      try {
        unsubscribe();
      } catch (error) {
        console.warn('⚠️ AuthProvider - Error during cleanup:', error);
      }
    };
  }, []);

  // Enhanced login function
  const login = async (email: string, password: string): Promise<{ user: User; userData: UserData }> => {
    try {
      console.log('🔐 AuthProvider - Login attempt started:', {
        email: email,
        timestamp: new Date().toISOString()
      });

      setError(null);

      // تحقق أساسي من صيغة البريد الإلكتروني
      if (!email.includes('@')) {
        console.log('❌ AuthProvider - Invalid email format:', email);
        throw new Error('صيغة البريد الإلكتروني غير صحيحة');
      }

      // محاولة تسجيل الدخول
      console.log('🔑 AuthProvider - Attempting Firebase Auth login...');
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;
      console.log('✅ AuthProvider - Firebase Auth login successful:', {
        uid: user.uid,
        email: user.email
      });

      // جلب بيانات المستخدم من Firestore
      console.log('📋 AuthProvider - Fetching user data from Firestore...');

      let foundData = null;
      let foundCollection = null;
      let userAccountType: UserRole = 'player';

      // Super Admin Override
      if (email === 'admin@el7lm.com' || email === 'admin@elhilm.com') {
        console.log('🛡️ Super Admin login detected');
        userAccountType = 'admin';
        foundData = {
          uid: user.uid,
          email: user.email,
          full_name: 'Super Admin',
          accountType: 'admin',
          isAdmin: true
        };
        // We try to verify if there is real data in 'users'
        try {
          const userDocCheck = await getDoc(doc(db, 'users', user.uid));
          if (userDocCheck.exists()) {
            foundData = { ...foundData, ...userDocCheck.data() };
          }
        } catch (e) { }
      }

      // 1. البحث في مجموعة الموظفين أولاً (النظام الجديد)
      let employeesSnapshot: any = null;
      try {
        const employeesQuery = query(
          collection(db, 'employees'),
          where('authUserId', '==', user.uid)
        );
        employeesSnapshot = await getDocs(employeesQuery);

        // Fallback: Search by email
        if (employeesSnapshot.empty && user.email) {
          const emailQuery = query(collection(db, 'employees'), where('email', '==', user.email));
          const emailSnap = await getDocs(emailQuery);
          if (!emailSnap.empty) {
            employeesSnapshot = emailSnap;
            console.log('✅ Found employee by email during login lookup');
          }
        }

        if (!employeesSnapshot.empty) {
          const employeeDoc = employeesSnapshot.docs[0];
          foundData = employeeDoc.data();
          foundCollection = 'employees';
          userAccountType = 'admin';
          console.log(`✅ Found employee data in employees collection (Priority):`, foundData);
        }
      } catch (employeeError) {
        console.warn('Error searching employees collection:', employeeError);
      }

      // 2. إذا لم يكن موظفاً، ابحث في المجموعات الأخرى
      if (!foundData) {
        const accountTypes = ['admins', 'clubs', 'academies', 'trainers', 'agents', 'players'];
        const queries = accountTypes.map(collection =>
          getDoc(doc(db, collection, user.uid))
        );

        const results = await Promise.all(queries);

        for (let i = 0; i < results.length; i++) {
          if (results[i].exists()) {
            foundData = results[i].data();
            foundCollection = accountTypes[i];
            if (accountTypes[i] === 'admins') {
              userAccountType = 'admin';
            } else {
              userAccountType = accountTypes[i].slice(0, -1) as UserRole;
            }
            console.log(`✅ Found user data in ${accountTypes[i]} collection:`, foundData);
            break;
          }
        }
      }

      // إذا وجدنا بيانات في المجموعات الخاصة بالأدوار، استخدمها مباشرة
      if (foundData) {
        const userData: UserData = {
          uid: user.uid,
          email: user.email || foundData.email || '',
          accountType: userAccountType,
          full_name: foundData.full_name || foundData.name || '',
          phone: foundData.phone || '',
          profile_image: foundData.profile_image || foundData.profileImage || foundData.profile_image_url || foundData.avatar || '',
          country: foundData.country || '',
          isNewUser: false,
          isEmployee: foundCollection === 'employees',
          employeeId: foundData.id || foundData.uid || (foundCollection === 'employees' ? employeesSnapshot.docs[0].id : undefined),
          created_at: foundData.created_at || foundData.createdAt || new Date(),
          updated_at: new Date(),
          ...foundData
        };

        // إذا كان موظفاً، أنشئ document في users collection وجلب الصلاحيات
        if (foundCollection === 'employees') {
          try {
            // جلب الصلاحيات إذا وجدت
            const roleId = foundData.roleId || foundData.role;
            if (roleId) {
              const roleDoc = await getDoc(doc(db, 'roles', roleId));
              if (roleDoc.exists()) {
                const roleData = roleDoc.data();
                userData.permissions = roleData.permissions || [];
                console.log('✅ AuthProvider (Login) - Fetched role permissions:', userData.permissions);
              }
            }

            const userRef = doc(db, 'users', user.uid);
            await setDoc(userRef, {
              ...userData,
              employeeId: employeesSnapshot?.docs[0]?.id || foundData.id,
              employeeRole: foundData.roleId || foundData.role,
              role: foundData.roleId || foundData.role,
              updated_at: new Date()
            }, { merge: true });
          } catch (syncError) {
            console.warn('Error syncing employee data to users collection:', syncError);
          }
        }

        // فحص حالة الحساب
        const accountStatus = await checkAccountStatus(user.uid);

        if (!accountStatus.canLogin) {
          // إذا كان الحساب غير مفعل أو محذوف، قم بتسجيل الخروج ورمي خطأ
          await signOut(auth);
          throw new Error(accountStatus.message);
        }

        // تحديث آخر دخول
        try {
          await updateLastLogin(user.uid);
        } catch (updateError) {
          console.warn('Failed to update last login:', updateError);
        }

        console.log('✅ Login successful for user:', userData.accountType);

        setUser(user);
        setUserData(userData);

        // عرض رسالة الحالة للمستخدم
        if (accountStatus.messageType === 'warning') {
          console.warn('Account status warning:', accountStatus.message);
        }

        return { user, userData };
      }

      // إذا لم نجد بيانات في المجموعات الخاصة بالأدوار، ابحث في مجموعة users
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        // إنشاء وثيقة المستخدم إذا لم يتم العثور عليها
        const userData = await createBasicUserDocument(user, userAccountType, foundData || {});
        setUserData(userData);
        return { user, userData };
      }

      const userData = userDoc.data() as UserData;

      // فحص حالة الحساب
      const accountStatus = await checkAccountStatus(user.uid);

      if (!accountStatus.canLogin) {
        // إذا كان الحساب غير مفعل أو محذوف، قم بتسجيل الخروج ورمي خطأ
        await signOut(auth);
        throw new Error(accountStatus.message);
      }

      // تحديث آخر دخول
      try {
        await updateLastLogin(user.uid);
      } catch (updateError) {
        console.warn('Failed to update last login:', updateError);
        // لا نرمي خطأ هنا لأن تسجيل الدخول نجح
      }

      console.log('✅ Login successful for user:', userData.accountType);

      setUser(user);
      setUserData(userData);

      // عرض رسالة الحالة للمستخدم
      if (accountStatus.messageType === 'warning') {
        // يمكن إضافة toast أو notification هنا
        console.warn('Account status warning:', accountStatus.message);
      }

      return { user, userData };
    } catch (error: any) {
      if (error && error.code !== 'auth/invalid-credential' && error.code !== 'auth/wrong-password') {
        console.error('Login system error:', error.message || error);
      }

      // إعادة رمي الخطأ الأصلي مع الاحتفاظ بـ error.code
      // هذا يسمح لصفحة تسجيل الدخول بالتعرف على نوع الخطأ
      throw error;
    }
  };

  /**
   * تسجيل الدخول/التسجيل باستخدام Google
   * @param defaultRole - الدور الافتراضي للمستخدم الجديد (player)
   * @returns بيانات المستخدم ومعلومة إذا كان جديد أم لا
   */
  const signInWithGoogle = async (
    defaultRole: UserRole = 'player'
  ): Promise<{ user: User; userData: UserData; isNewUser: boolean }> => {
    try {
      console.log('🔵 Starting Google Sign-In...');
      setError(null);

      // إنشاء Google Provider
      const googleProvider = new GoogleAuthProvider();
      googleProvider.addScope('email');
      googleProvider.addScope('profile');

      // تعيين اللغة العربية
      googleProvider.setCustomParameters({
        prompt: 'select_account',
        hl: 'ar'
      });

      // تسجيل الدخول باستخدام Popup
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      console.log('✅ Google Sign-In successful:', {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      });

      let foundData: any = null;
      let userAccountType: UserRole = defaultRole;
      let isNewUser = true;

      // Special handling for Super Admin to preventing role conflict
      if (user.email === 'admin@el7lm.com' || user.email === 'admin@elhilm.com') {
        console.log('🛡️ Super Admin Detected (Google Auth)');
        userAccountType = 'admin';
        foundData = {
          uid: user.uid,
          email: user.email,
          full_name: 'Super Admin',
          accountType: 'admin',
          isAdmin: true
        };
        // Try to get real data if exists
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            foundData = { ...foundData, ...userDoc.data() };
            isNewUser = false;
          } else {
            // Check if it exists in admins
            const adminDoc = await getDoc(doc(db, 'admins', user.uid));
            if (adminDoc.exists()) {
              foundData = { ...foundData, ...adminDoc.data() };
              isNewUser = false;
            }
          }
        } catch (e) {
          console.warn('Error checking existing admin data:', e);
        }
        // 🕵️‍♀️ Duplicate Scanner for Debugging
        (async () => {
          const searchCols = ['employees', 'clubs', 'academies', 'trainers', 'agents', 'players'];
          const dupes = [];
          for (const col of searchCols) {
            try {
              const d = await getDoc(doc(db, col, user.uid));
              if (d.exists()) dupes.push(col);
            } catch (e) { }
          }
          if (dupes.length > 0) {
            console.warn(`🚨 SUPER ADMIN DUPLICATE ALERT: Found accounts in: ${dupes.join(', ')}. These are ignored by the system but exist in DB.`);
          }
        })();
      }

      // 0. التحقق أولاً من مجموعة الموظفين (مع الربط التلقائي)
      if (!foundData) {
        try {
          let employeesQuery = query(collection(db, 'employees'), where('authUserId', '==', user.uid));
          let employeesSnap = await getDocs(employeesQuery);

          // Fallback: Link by Email
          if (employeesSnap.empty && user.email) {
            const emailQuery = query(collection(db, 'employees'), where('email', '==', user.email));
            const emailSnap = await getDocs(emailQuery);
            if (!emailSnap.empty) {
              // Link the account
              const empDoc = emailSnap.docs[0];
              await updateDoc(doc(db, 'employees', empDoc.id), {
                authUserId: user.uid,
                updatedAt: new Date()
              });
              employeesSnap = emailSnap;
              console.log('🔗 [Google Auth] Linked employee account via email');
            }
          }

          if (!employeesSnap.empty) {
            foundData = employeesSnap.docs[0].data();
            userAccountType = 'admin';  // Employees are admins
            isNewUser = false;
            console.log('✅ [Google Auth] Found employee account');
            // foundData will be used below to populate userData with isEmployee: true
          }
        } catch (err) {
          console.warn('Error checking employees in Google Sign In:', err);
        }
      }

      // 1. البحث عن المستخدم في المجموعات الأخرى إذا لم يكن موظفاً
      if (!foundData) {
        const accountTypes = ['admins', 'clubs', 'academies', 'trainers', 'agents', 'players'];
        // ... rest of the loop
        const queries = accountTypes.map(collectionName =>
          getDoc(doc(db, collectionName, user.uid))
        );

        const results = await Promise.all(queries);

        for (let i = 0; i < results.length; i++) {
          if (results[i].exists()) {
            foundData = results[i].data();
            if (accountTypes[i] === 'admins') {
              userAccountType = 'admin';
            } else {
              userAccountType = accountTypes[i].slice(0, -1) as UserRole;
            }
            isNewUser = false;
            console.log(`✅ Found existing user in ${accountTypes[i]} collection`);
            break;
          }
        }
      }

      // إذا لم نجد في المجموعات الخاصة، نبحث في users
      let migrationData: any = null;

      if (!foundData) {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          foundData = userDoc.data();
          userAccountType = (foundData.accountType && foundData.accountType !== 'unknown') ? (foundData.accountType as UserRole) : defaultRole;
          isNewUser = false;
          console.log('✅ Found existing user in users collection');
        } else if (user.email) {
          // البحث عن مستخدم بنفس البريد الإلكتروني للمهاجرة
          try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', user.email));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              migrationData = querySnapshot.docs[0].data();
              console.log('🔄 Found existing account via email - starting migration', migrationData);
              // نستخدم البيانات القديمة لكن نعتبره مستخدم جديد (من حيث Auth ID) ليتم حفظ البيانات في الـ Doc الجديد
              // لكن نوع الحساب يجب أن يكون من الحساب القديم
              if (migrationData.accountType) {
                userAccountType = migrationData.accountType as UserRole;
              }
            }
          } catch (err) {
            console.warn('Error searching by email for migration:', err);
          }
        }
      }

      let userData: UserData;

      if (isNewUser) {
        // مستخدم جديد - إنشاء حساب ولكن بدون تحديد دور نهائي
        console.log(migrationData ? '🔄 Migrating user data...' : '🆕 Creating new user from Google Sign-In...');

        // If migrating, we use the known role. If purely new, we use the provided defaultRole
        // Ensure we never use 'unknown' here
        const baseRole = migrationData ? (migrationData.accountType as UserRole) : defaultRole;
        const finalRole = (baseRole && (baseRole as any) !== 'unknown') ? baseRole : 'player';

        userData = {
          ...(migrationData || {}), // ⚠️ MUST come first so dates below override
          uid: user.uid,
          email: user.email || '',
          accountType: finalRole,
          full_name: (migrationData ? (migrationData.full_name || migrationData.name) : null) || user.displayName || '',
          phone: (migrationData ? migrationData.phone : null) || user.phoneNumber || '',
          profile_image: (migrationData ? (migrationData.profile_image || migrationData.profileImage) : null) || user.photoURL || '',
          isNewUser: migrationData ? false : true,
          isGoogleUser: true,
          googleId: user.uid,
          // 🔧 FIX: استخدام serverTimestamp() لضمان الحفظ الصحيح
          created_at: serverTimestamp(),
          createdAt: serverTimestamp(),
          updated_at: serverTimestamp(),
          updatedAt: serverTimestamp(),
          country: migrationData?.country || '',
          countryCode: migrationData?.countryCode || '',
          currency: migrationData?.currency || '',
          currencySymbol: migrationData?.currencySymbol || '',
          // تعيين آخر تسجيل دخول
          lastLogin: serverTimestamp(),
          last_login: serverTimestamp(),
          lastLoginIP: 'google_auth',
        };

        // التأكد من عدم الكتابة فوق نوع الحساب بـ unknown
        if (!userData.accountType || userData.accountType === 'unknown') {
          userData.accountType = finalRole;
        }

        // التأكد من أن UID هو الجديد
        userData.uid = user.uid;
        if (migrationData) {
          userData.migratedFromUid = migrationData.uid;
        }

        // حفظ في مجموعة users
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          ...sanitizeForFirestore(userData),
          created_at: serverTimestamp(),
          createdAt: serverTimestamp(),
          updated_at: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          last_login: serverTimestamp()
        });
        console.log('✅ User saved to users collection');

        // Only create role-specific document if we actually know the role (migration case)
        if (finalRole !== 'unknown' && finalRole !== 'admin') {
          const roleRef = doc(db, finalRole + 's', user.uid);
          await setDoc(roleRef, sanitizeForFirestore({
            ...userData,
            created_at: serverTimestamp(),
            createdAt: serverTimestamp(),
            updated_at: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            last_login: serverTimestamp()
          }));
          console.log(`✅ User saved to ${finalRole}s collection`);
        }
      } else {
        // مستخدم موجود - تحديث البيانات
        console.log('👤 Existing user signed in with Google');

        userData = {
          uid: user.uid,
          email: user.email || foundData?.email || '',
          accountType: userAccountType,
          full_name: foundData?.full_name || foundData?.name || user.displayName || '',
          phone: foundData?.phone || user.phoneNumber || '',
          profile_image: foundData?.profile_image || foundData?.profileImage || user.photoURL || '',
          country: foundData?.country || '',
          isNewUser: false,
          isGoogleUser: true,
          created_at: foundData?.created_at || foundData?.createdAt || new Date(),
          updated_at: new Date(),
          ...foundData
        };

        // التأكد من عدم الكتابة فوق نوع الحساب بـ unknown
        if (!userData.accountType || userData.accountType === 'unknown') {
          userData.accountType = userAccountType;
        }

        // تحديث آخر دخول
        try {
          await updateLastLogin(user.uid);
        } catch (updateError) {
          console.warn('Failed to update last login:', updateError);
        }
      }

      // فحص حالة الحساب (غير مفعل/محذوف)
      if (!isNewUser) {
        const accountStatus = await checkAccountStatus(user.uid);
        if (!accountStatus.canLogin) {
          await signOut(auth);
          throw new Error(accountStatus.message);
        }
      }

      setUser(user);
      setUserData(userData);

      console.log('🎉 Google Sign-In completed successfully', {
        isNewUser,
        accountType: userData.accountType
      });

      return { user, userData, isNewUser };
    } catch (error: any) {
      console.error('❌ Google Sign-In error:', error);

      // معالجة أخطاء Google Sign-In
      let errorMessage = 'فشل تسجيل الدخول بواسطة Google';

      switch (error.code) {
        case 'auth/popup-closed-by-user':
          errorMessage = 'تم إغلاق نافذة تسجيل الدخول';
          break;
        case 'auth/popup-blocked':
          errorMessage = 'تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة';
          break;
        case 'auth/cancelled-popup-request':
          errorMessage = 'تم إلغاء طلب تسجيل الدخول';
          break;
        case 'auth/account-exists-with-different-credential':
          errorMessage = 'يوجد حساب مسجل مسبقاً بهذا البريد الإلكتروني بطريقة مختلفة';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'خطأ في الاتصال بالإنترنت';
          break;
        default:
          if (error.message) {
            errorMessage = error.message;
          }
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * إعداد reCAPTCHA
   */
  const setupRecaptcha = async (containerId: string) => {
    try {
      if (!auth) throw new Error('Auth not initialized');

      // تنظيف أي verifier سابق لتجنب التكرار
      if ((window as any).recaptchaVerifier) {
        try { (window as any).recaptchaVerifier.clear(); } catch (e) { }
      }

      const verifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: (response: any) => {
          console.log('✅ Recaptcha solved');
        },
        'expired-callback': () => {
          console.warn('⚠️ Recaptcha expired');
        }
      });

      (window as any).recaptchaVerifier = verifier;
      return verifier;
    } catch (error) {
      console.error('❌ Recaptcha setup error:', error);
      throw error;
    }
  };

  /**
   * إرسال رمز التحقق لهاتف
   */
  const sendPhoneOTP = async (phoneNumber: string, appVerifier: any) => {
    try {
      console.log('📱 Sending OTP to:', phoneNumber);
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      return confirmationResult;
    } catch (error) {
      console.error('❌ Send Phone OTP error:', error);
      throw error;
    }
  };

  /**
   * التحقق من رمز الهاتف وإنشاء/تحديث المستخدم
   */
  const verifyPhoneOTP = async (
    confirmationResult: any,
    otp: string,
    defaultRole: UserRole = 'player',
    additionalData: any = {}
  ): Promise<{ user: User; userData: UserData; isNewUser: boolean }> => {
    try {
      console.log('🔐 Verifying Phone OTP...');
      setError(null);

      const result = await confirmationResult.confirm(otp);
      const user = result.user;
      console.log('✅ Phone verified successfully:', user.uid);

      // البحث عن المستخدم في Firestore (التحقق إذا كان موجود مسبقاً)
      const accountTypes = ['admins', 'clubs', 'academies', 'trainers', 'agents', 'players'];
      let foundData = null;
      let userAccountType: UserRole = defaultRole;
      let isNewUser = true;

      // البحث المتوازي في جميع المجموعات
      const queries = accountTypes.map(collectionName =>
        getDoc(doc(db, collectionName, user.uid))
      );

      const results = await Promise.all(queries);

      for (let i = 0; i < results.length; i++) {
        if (results[i].exists()) {
          foundData = results[i].data();
          if (accountTypes[i] === 'admins') {
            userAccountType = 'admin';
          } else {
            userAccountType = accountTypes[i].slice(0, -1) as UserRole;
          }
          isNewUser = false;
          console.log(`✅ Found existing user in ${accountTypes[i]} collection`);
          break;
        }
      }

      // إذا لم نجد في المجموعات الخاصة، نبحث في users
      if (!foundData) {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          foundData = userDoc.data();
          userAccountType = (foundData.accountType && foundData.accountType !== 'unknown') ? (foundData.accountType as UserRole) : defaultRole;
          isNewUser = false;
          console.log('✅ Found existing user in users collection');
        }
      }

      let userData: UserData;

      if (isNewUser) {
        // مستخدم جديد - إنشاء حساب
        console.log('🆕 Creating new user from Phone Auth...');

        // Important: If no specific role is passed (e.g. from generic login), use 'unknown' to force selection
        // If additionalData has accountType (e.g. from Register page), use it.
        // Use additionalData.accountType if provided (Register page), fallback to defaultRole
        const finalRole = additionalData.accountType || defaultRole;

        userData = {
          ...additionalData, // ⚠️ MUST come first so dates below override
          uid: user.uid,
          email: user.email || additionalData.email || '',
          accountType: finalRole,
          full_name: additionalData.full_name || additionalData.name || 'User',
          phone: user.phoneNumber || '',
          profile_image: '',
          isNewUser: true,
          isPhoneAuth: true,
          // 🔧 FIX: استخدام serverTimestamp() لضمان الحفظ الصحيح
          created_at: serverTimestamp(),
          createdAt: serverTimestamp(),
          updated_at: serverTimestamp(),
          updatedAt: serverTimestamp(),
          country: additionalData.country || '',
          countryCode: additionalData.countryCode || '',
          currency: additionalData.currency || '',
          currencySymbol: additionalData.currencySymbol || '',
          // تعيين آخر تسجيل دخول
          lastLogin: serverTimestamp(),
          last_login: serverTimestamp(),
          lastLoginIP: 'phone_auth',
        };

        // التأكد من عدم الكتابة فوق نوع الحساب بـ unknown
        if (!userData.accountType || userData.accountType === 'unknown') {
          userData.accountType = finalRole;
        }

        // حفظ في مجموعة users
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          ...sanitizeForFirestore(userData),
          created_at: serverTimestamp(),
          createdAt: serverTimestamp(),
          updated_at: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          last_login: serverTimestamp()
        });

        // حفظ في المجموعة الخاصة بالدور ONLY IF role is known
        if (finalRole !== 'unknown' && finalRole !== 'admin') {
          const roleRef = doc(db, finalRole + 's', user.uid);
          await setDoc(roleRef, sanitizeForFirestore({
            ...userData,
            created_at: serverTimestamp(),
            createdAt: serverTimestamp(),
            updated_at: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            last_login: serverTimestamp()
          }));
        }
      } else {
        // مستخدم موجود - تحديث
        console.log('👤 Existing user signed in with Phone');

        userData = {
          uid: user.uid,
          email: user.email || foundData?.email || '',
          accountType: userAccountType,
          full_name: foundData?.full_name || foundData?.name || '',
          phone: user.phoneNumber || foundData?.phone || '',
          profile_image: foundData?.profile_image || foundData?.profileImage || '',
          country: foundData?.country || '',
          isNewUser: false,
          isPhoneAuth: true,
          created_at: foundData?.created_at || foundData?.createdAt || new Date(),
          updated_at: new Date(),
          ...foundData
        };

        try {
          await updateLastLogin(user.uid);
        } catch (updateError) {
          console.warn('Failed to update last login:', updateError);
        }
      }

      // فحص حالة الحساب
      if (!isNewUser) {
        const accountStatus = await checkAccountStatus(user.uid);
        if (!accountStatus.canLogin) {
          await signOut(auth);
          throw new Error(accountStatus.message);
        }
      }

      setUser(user);
      setUserData(userData);

      return { user, userData, isNewUser };
    } catch (error: any) {
      console.error('❌ Phone Verification Error:', error);
      let msg = 'رمز التحقق غير صحيح أو منتهي الصلاحية';
      if (error.code === 'auth/invalid-verification-code') {
        msg = 'رمز التحقق غير صحيح';
      } else if (error.code === 'auth/code-expired') {
        msg = 'انتهت صلاحية رمز التحقق، يرجى إعادة الإرسال';
      }
      throw new Error(msg);
    }
  };

  /**
   * إعادة تفعيل حساب محذوف
   
   */
  const reactivateDeletedAccount = async (
    email: string,
    password: string,
    role: UserRole,
    additionalData: any
  ): Promise<UserData | null> => {
    try {
      // محاولة تسجيل الدخول للحصول على UID
      const signInResult = await signInWithEmailAndPassword(auth, email, password);
      const uid = signInResult.user.uid;

      console.log('🔍 Checking account status in Firestore for UID:', uid);

      // التحقق من حالة الحساب في جميع المجموعات
      const collections = ['users', 'players', 'clubs', 'academies', 'agents', 'trainers'];
      let isDeleted = false;

      for (const coll of collections) {
        try {
          const docRef = doc(db, coll, uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();

            // التحقق من حالة الحذف
            if (data.isDeleted === true || data.isActive === false || data.deletedAt) {
              isDeleted = true;
              console.log(`✅ Found deleted account in ${coll}, will reactivate`);
              break;
            } else {
              console.log(`⚠️ Account exists and is active in ${coll}`);
              return null; // الحساب موجود ونشط
            }
          }
        } catch (err) {
          continue;
        }
      }

      if (!isDeleted) {
        console.log('⚠️ Account not found or not deleted');
        return null;
      }

      // إعادة تفعيل الحساب
      console.log('🔄 Reactivating account with new data...', {
        organizationCode: additionalData.organizationCode,
        accountType: role
      });

      // دمج البيانات الجديدة مع البيانات القديمة (إن وجدت)
      const userData: UserData = {
        uid: uid,
        email: email,
        accountType: role,
        full_name: additionalData.full_name || additionalData.name || '',
        phone: additionalData.phone || '',
        profile_image: additionalData.profile_image || additionalData.profileImage || '',
        isNewUser: false,
        isDeleted: false,
        isActive: true,
        updated_at: serverTimestamp(),
        reactivated_at: serverTimestamp(),
        country: additionalData.country || '',
        countryCode: additionalData.countryCode || '',
        currency: additionalData.currency || '',
        currencySymbol: additionalData.currencySymbol || '',
        firebaseEmail: email,
        originalPhone: additionalData.originalPhone || additionalData.phone || '',
        // البيانات الجديدة المهمة (مثل كود الانضمام)
        organizationCode: additionalData.organizationCode || '',
        clubId: additionalData.clubId || '',
        academyId: additionalData.academyId || '',
        ...additionalData
      };

      // تحديث البيانات في users collection
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, sanitizeForFirestore(userData), { merge: true });

      // تحديث البيانات في المجموعة الخاصة بالدور
      if (role !== 'admin') {
        const roleRef = doc(db, role + 's', uid);
        await setDoc(roleRef, sanitizeForFirestore(userData), { merge: true });

        // إذا كان لاعب، نحذف طلبات الانضمام القديمة المعلقة
        if (role === 'player') {
          try {
            const joinRequestsQuery = query(
              collection(db, 'player_join_requests'),
              where('playerId', '==', uid),
              where('status', '==', 'pending')
            );
            const oldRequests = await getDocs(joinRequestsQuery);

            if (!oldRequests.empty) {
              console.log(`🗑️ Deleting ${oldRequests.size} old join requests...`);
              const deletePromises = oldRequests.docs.map(doc =>
                updateDoc(doc.ref, {
                  status: 'cancelled',
                  cancelledAt: serverTimestamp(),
                  cancelReason: 'Account reactivated'
                })
              );
              await Promise.all(deletePromises);
              console.log('✅ Old join requests cancelled');
            }
          } catch (err) {
            console.warn('⚠️ Failed to cancel old join requests:', err);
          }
        }
      }

      setUser(signInResult.user);
      setUserData(userData);

      console.log('✅ Account reactivated successfully');
      return userData;

    } catch (error: any) {
      console.error('❌ Reactivation error:', error);
      return null;
    }
  };

  // Enhanced registration function
  const register = async (
    email: string,
    password: string,
    role: UserRole,
    additionalData: any = {}
  ): Promise<UserData> => {
    try {
      setLoading(true);
      setError(null);

      // طباعة البيانات المرسلة للتسجيل
      console.log('registerUser CALLED', { email, password, role, additionalData });

      // Validate inputs
      if (!email || !password || !role) {
        throw new Error('Email, password, and role are required');
      }

      const isNumbersOnly = /^\d+$/.test(password);
      // Validate password strength - 8 characters minimum
      if (password.length < 8) {
        throw new Error('يجب أن تتكون كلمة المرور من 8 أحرف على الأقل');
      }

      // Additional password validation
      if (password.length > 128) {
        throw new Error('Password is too long. Maximum 128 characters allowed');
      }

      // Check for weak number patterns
      const weakPatterns = [
        /^(\d)\1+$/, // نفس الرقم متكرر
        /^(0123456789|9876543210)/, // أرقام متسلسلة
        /^12345678$/, /^87654321$/,
        /^123456/, /^654321/,
        /^111111/, /^000000/, /^666666/, /^888888/
      ];

      if (isNumbersOnly && weakPatterns.some(pattern => pattern.test(password))) {
        throw new Error('كلمة المرور ضعيفة جداً. تجنب الأرقام المتسلسلة أو المتكررة');
      }

      // Email validation disabled temporarily
      // const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      // if (!emailRegex.test(email)) {
      //   throw new Error('Invalid email format');
      // }

      // Check email length
      if (email.length > 254) {
        throw new Error('Email is too long');
      }

      console.log('🔐 Starting user registration...', {
        email,
        role,
        hasAdditionalData: Object.keys(additionalData).length > 0
      });

      console.log('📧 Firebase registration details:', {
        email,
        passwordLength: password.length,
        role,
        additionalDataKeys: Object.keys(additionalData)
      });

      // Create user in Firebase Auth
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;

      console.log('✅ Firebase Auth user created:', user.uid);

      // Prepare user data - IMPORTANT: additionalData comes FIRST so our dates override any passed dates
      const userData: UserData = {
        ...additionalData, // ⚠️ MUST come first so our dates below override any incorrect dates
        uid: user.uid,
        email: user.email || email,
        accountType: role,
        full_name: additionalData.full_name || additionalData.name || '',
        phone: additionalData.phone || '',
        profile_image: additionalData.profile_image || additionalData.profileImage || '',
        isNewUser: true,
        isActive: true,
        // 🔧 FIX: استخدام serverTimestamp() بدلاً من new Date() لضمان الحفظ الصحيح
        created_at: serverTimestamp(),
        createdAt: serverTimestamp(),
        updated_at: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Store additional phone-related data
        country: additionalData.country || '',
        countryCode: additionalData.countryCode || '',
        currency: additionalData.currency || '',
        currencySymbol: additionalData.currencySymbol || '',
        // Store the Firebase email used for authentication
        firebaseEmail: email,
        // Store original phone if different from normalized
        originalPhone: additionalData.originalPhone || additionalData.phone || '',

        // تعيين آخر تسجيل دخول عند التسجيل
        lastLogin: serverTimestamp(),
        last_login: serverTimestamp(),
        lastLoginIP: 'registration',
      };

      console.log('📝 Saving user data to Firestore...', {
        uid: userData.uid,
        email: userData.email,
        accountType: userData.accountType
      });

      // Save to main users collection
      const userRef = doc(db, 'users', user.uid);
      // 🔧 FIX: إضافة التاريخ مباشرة في setDoc بعد sanitize لضمان عدم فقدان serverTimestamp
      await setDoc(userRef, {
        ...sanitizeForFirestore(userData),
        created_at: serverTimestamp(),
        createdAt: serverTimestamp(),
        updated_at: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        last_login: serverTimestamp()
      });

      console.log('✅ User data saved to main collection');

      // Also save to role-specific collection
      if (role !== 'admin') {
        const roleRef = doc(db, role + 's', user.uid);
        await setDoc(roleRef, sanitizeForFirestore({
          ...userData,
          created_at: serverTimestamp(),
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          last_login: serverTimestamp(),
          updated_at: serverTimestamp(),
          updatedAt: serverTimestamp()
        }));
        console.log(`✅ User data saved to ${role}s collection`);
      }

      setUser(user);
      setUserData(userData);

      console.log('🎉 Registration completed successfully');
      return userData;
    } catch (error: any) {
      console.error('❌ Registration error:', error.message || error);
      if (error && error.code) console.error('Firebase code:', error.code);

      let errorMessage = 'Registration failed';

      // Handle specific Firebase Auth errors
      switch (error.code) {
        case 'auth/email-already-in-use':
          // محاولة إعادة تفعيل الحساب إذا كان محذوفاً
          try {
            console.log('🔍 Checking if account is deleted...');
            const reactivationResult = await reactivateDeletedAccount(email, password, role, additionalData);
            if (reactivationResult) {
              console.log('✅ Account reactivated successfully');
              return reactivationResult;
            }
          } catch (reactivationError) {
            console.error('❌ Reactivation failed:', reactivationError);
          }

          errorMessage = 'هذا البريد الإلكتروني مسجل بالفعل. يرجى محاولة تسجيل الدخول بدلاً من ذلك. إذا نسيت كلمة المرور، استخدم خيار \"هل نسيت كلمة المرور؟\". إذا كنت قد سجلت مسبقاً باستخدام Google، يرجى استخدامه للدخول.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak. Please use at least 8 characters';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address format';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password accounts are not enabled. Please contact support';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later';
          break;
        default:
          if (error.message) {
            errorMessage = error.message;
          }
          break;
      }

      // If user was created in Auth but Firestore failed, we should handle cleanup
      // لا نقوم بتعيين error في الحالة العامة، بل نرمي الخطأ فقط
      // if (error.message && error.message.includes('database')) {
      //   setError('Failed to create user profile. Please contact support.');
      // } else {
      //   setError(errorMessage);
      // }

      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
      setUser(null);
      setUserData(null);
      setError(null);
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      // لا نقوم بتعيين error في الحالة العامة للـ logout
      // setError('Error during logout');
    }
  };

  // Update user data function
  const updateUserData = async (updates: Partial<UserData>): Promise<void> => {
    if (!user) return;

    try {
      console.log('📝 Updating user data:', updates);

      // تحديث البيانات في المجموعة الصحيحة بناءً على نوع الحساب
      const accountType = userData?.accountType || 'player';
      const collectionName = accountType === 'admin' ? 'users' : `${accountType}s`;

      const docRef = doc(db, collectionName, user.uid);
      const sanitized = sanitizeForFirestore({
        ...updates,
        updated_at: serverTimestamp()
      });
      // Avoid empty update payloads
      if (sanitized && Object.keys(sanitized).length > 0) {
        await updateDoc(docRef, sanitized);
      } else {
        console.warn('Skipped updateDoc: no valid fields to update after sanitization');
      }

      // تحديث البيانات المحلية
      if (userData) {
        const updatedUserData = { ...userData, ...updates };
        setUserData(updatedUserData);
      }

      console.log('✅ User data updated successfully');
    } catch (error) {
      console.error('Error updating user data:', error);
      setError('Failed to update user data');
    }
  };

  // Password reset function
  const resetPassword = async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  // Change password function
  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    if (!user || !user.email) throw new Error('User not authenticated');

    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  };

  // Refresh user data function
  const refreshUserData = async (): Promise<void> => {
    if (!user) return;

    try {
      console.log('🔄 Refreshing user data...');

      // 1. أولاً: التحقق من مجموعة users الرئيسية
      // هذه الخطوة مهمة جداً لأنها المصدر الأساسي للحقيقة الآن
      const mainUserRef = doc(db, 'users', user.uid);
      const mainUserSnap = await getDoc(mainUserRef);

      if (mainUserSnap.exists()) {
        const mainData = mainUserSnap.data();

        // إذا كان المستخدم معرفاً كـ admin في users، نعتمد هذا فوراً
        // أيضاً إذا كان البريد الإلكتروني هو البريد الرسمي للإدارة
        if (mainData.accountType === 'admin' || user.email === 'admin@el7lm.com') {
          console.log('✅ Refresh - Found ADMIN data in users collection');

          const adminData: UserData = {
            uid: user.uid,
            email: user.email || mainData.email || '',
            accountType: 'admin',
            full_name: mainData.full_name || mainData.name || 'System Administrator',
            phone: mainData.phone || '',
            profile_image: mainData.profile_image || mainData.avatar || '',
            country: mainData.country || '',
            isNewUser: false,
            created_at: mainData.created_at || mainData.createdAt || new Date(),
            updated_at: new Date(),
            ...mainData
          };

          setUserData(adminData);
          return; // 🛑 توقف هنا ولا تكمل البحث في باقي المجموعات
        }
      }

      // البحث في المجموعات الخاصة بالأدوار أولاً (للمستخدمين غير الأدمن أو البيانات القديمة)
      const accountTypes = ['admins', 'clubs', 'academies', 'trainers', 'agents', 'players'];
      let foundData = null;
      let userAccountType: UserRole = 'player';
      let foundCollection = null;

      // استخدام Promise.all للبحث المتوازي
      const queries = accountTypes.map(collection =>
        getDoc(doc(db, collection, user.uid))
      );

      const results = await Promise.all(queries);

      for (let i = 0; i < results.length; i++) {
        if (results[i].exists()) {
          foundData = results[i].data();
          foundCollection = accountTypes[i];
          // معالجة خاصة لـ admins collection
          if (accountTypes[i] === 'admins') {
            userAccountType = 'admin';
          } else {
            userAccountType = accountTypes[i].slice(0, -1) as UserRole;
          }
          console.log(`✅ Refresh - Found user data in ${accountTypes[i]} collection:`, foundData);
          break;
        }
      }

      // إذا لم نجد بيانات في المجموعات السابقة، ابحث في employees collection
      let employeesSnapshot: any = null;
      if (!foundData) {
        try {
          const employeesQuery = query(
            collection(db, 'employees'),
            where('authUserId', '==', user.uid)
          );
          employeesSnapshot = await getDocs(employeesQuery);

          if (!employeesSnapshot.empty) {
            const employeeDoc = employeesSnapshot.docs[0];
            foundData = employeeDoc.data();
            foundCollection = 'employees';
            userAccountType = 'admin'; // الموظفون يستخدمون dashboard المدير
            console.log(`✅ Refresh - Found employee data in employees collection:`, foundData);
          }
        } catch (employeeError) {
          console.warn('Error searching employees collection in refresh:', employeeError);
        }
      }

      // إذا لم نجد شيئاً في المجموعات الفرعية، نعود لاستخدام بيانات users الرئيسية إذا وجدت
      if (!foundData && mainUserSnap.exists()) {
        foundData = mainUserSnap.data();
        userAccountType = (foundData?.accountType as UserRole) || 'player';
        console.log('✅ Refresh - Fallback to users collection data:', foundData);
      }

      // إذا وجدنا بيانات، استخدمها
      if (foundData) {
        console.log('🔍 Found data details:', {
          userAccountType,
          academy_name: foundData.academy_name,
          name: foundData.name,
          full_name: foundData.full_name,
          allFields: Object.keys(foundData)
        });

        const userData: UserData = {
          uid: user.uid,
          email: user.email || foundData.email || '',
          accountType: userAccountType,
          full_name: foundData.full_name || foundData.name || '',
          phone: foundData.phone || '',
          profile_image: foundData.profile_image || foundData.profileImage || foundData.profile_image_url || foundData.avatar || '',
          country: foundData.country || '',
          isNewUser: false,
          created_at: foundData.created_at || foundData.createdAt || new Date(),
          updated_at: new Date(),
          // إضافة الحقول المختصة بكل نوع حساب
          academy_name: foundData.academy_name,
          club_name: foundData.club_name,
          agent_name: foundData.agent_name,
          trainer_name: foundData.trainer_name,
          ...foundData
        };

        // إذا كان موظفاً، أنشئ document في users collection
        if (foundCollection === 'employees' && employeesSnapshot && !employeesSnapshot.empty) {
          const userRef = doc(db, 'users', user.uid);
          try {
            await setDoc(userRef, {
              ...userData,
              employeeId: employeesSnapshot.docs[0].id,
              employeeRole: foundData.role,
              role: foundData.role,
              updated_at: new Date()
            }, { merge: true });
          } catch (syncError) {
            console.warn('Error syncing employee data to users collection in refresh:', syncError);
          }
        }

        console.log('🔍 Final userData created:', {
          accountType: userData.accountType,
          academy_name: userData.academy_name,
          full_name: userData.full_name,
          name: userData.name
        });

        setUserData(userData);
      } else {
        console.log('❌ Refresh - No user data found in any collection');
        setUserData(null);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };



  // Clear error function
  const clearError = () => setError(null);

  // Context value
  const value: AuthContextType = {
    user,
    userData,
    loading,
    error,
    login,
    signInWithGoogle,
    register,
    logout,
    signOut: logout, // Map logout to signOut for consistency
    updateUserData,
    resetPassword,
    changePassword,
    clearError,
    refreshUserData,
    setupRecaptcha,
    sendPhoneOTP,
    verifyPhoneOTP
  };

  return (
    <AuthContext.Provider value={value}>
      {loading && hasInitialized && user ? (
        <SimpleLoader
          size="medium"
          color="blue"
        />
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


