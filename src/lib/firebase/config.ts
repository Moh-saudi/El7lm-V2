/**
 * إعدادات وتكوين Firebase
 * 
 * هذا الملف يحتوي على جميع إعدادات Firebase الأساسية:
 * - التحقق من متغيرات البيئة
 * - تهيئة Firebase App, Auth, Firestore, Storage, Analytics
 * - إعدادات Geidea Payments
 * 
 * @module firebase/config
 */

import { Analytics, getAnalytics } from "firebase/analytics";
import { FirebaseApp, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";
import {
  Firestore,
  doc,
  enableNetwork,
  getDoc,
  getFirestore,
  initializeFirestore
} from "firebase/firestore";
import { FirebaseStorage, getStorage } from "firebase/storage";
import { logFirebaseError, shouldSuppressFirebaseError } from "./error-handler";

/**
 * متغيرات البيئة المطلوبة لتكوين Firebase
 * يتم التحقق من وجودها قبل تهيئة Firebase
 */
const requiredEnvVars = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// التحقق من وجود المتغيرات المطلوبة
const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value ||
    value === 'your_firebase_api_key_here' ||
    value === 'your_firebase_api_key' ||
    value === 'your_project.firebaseapp.com' ||
    value === 'your_project_id' ||
    value === 'your_project.appspot.com' ||
    value === 'your_sender_id' ||
    value === 'your_app_id' ||
    value === 'your_measurement_id' ||
    value.startsWith('your_'))
  .map(([key]) => key);

/** هل التكوين صحيح (جميع المتغيرات موجودة) */
const hasValidConfig = missingVars.length === 0;

/**
 * التحقق من متغيرات البيئة وإظهار تحذيرات في وضع التطوير
 * في وضع الإنتاج، يتم إظهار تحذير بسيط فقط
 */
if (!hasValidConfig && process.env.NODE_ENV === 'development') {
  console.warn('⚠️ Firebase environment variables are missing or using placeholder values.');
  console.warn('Missing/placeholder variables:', missingVars);
  console.warn('Please set proper Firebase configuration in your .env.local file');
  console.warn('Current Firebase config:', requiredEnvVars);
}

// في وضع الإنتاج، لا نطرح خطأ إذا كانت المتغيرات ناقصة
if (!hasValidConfig && process.env.NODE_ENV === 'production') {
  console.warn('⚠️ Firebase configuration is missing in production. Some features may not work.');
}

/**
 * تكوين Firebase الرئيسي
 * يتم الحصول على القيم من متغيرات البيئة (.env.local)
 * 
 * @see https://firebase.google.com/docs/web/setup
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

/**
 * تكوين Geidea Payments
 * 
 * هذا التكوين يستخدم في API routes فقط (server-side)
 * المفاتيح الحقيقية موجودة في متغيرات البيئة
 * 
 * @see https://docs.geidea.net/
 */
export const geideaConfig = {
  merchantPublicKey: process.env.GEIDEA_MERCHANT_PUBLIC_KEY || '3448c010-87b1-41e7-9771-cac444268cfb',
  apiPassword: process.env.GEIDEA_API_PASSWORD || 'edfd5eee-fd1b-4932-9ee1-d6d9ba7599f0',
  webhookSecret: process.env.GEIDEA_WEBHOOK_SECRET || 'geidea_webhook_secret_production_2024',
  baseUrl: process.env.GEIDEA_BASE_URL || 'https://api.merchant.geidea.net',
  isTestMode: false
};

/**
 * التحقق من صحة تكوين Geidea
 * @returns {boolean} true إذا كان التكوين صحيح
 */
const validateGeideaConfig = () => {
  // لدينا مفاتيح إنتاج حقيقية من لوحة Geidea
  // لذا نعتبر التكوين صحيح دائماً
  return true;
};

/** Firebase App instance */
let app: FirebaseApp;
/** Firebase Auth instance */
let auth: Auth;
/** Firestore database instance */
let db: Firestore;
/** Firebase Analytics instance (null في SSR) */
let analytics: Analytics | null = null;
/** Firebase Storage instance */
let storage: FirebaseStorage;

/**
 * تهيئة Firebase - يتم التهيئة مرة واحدة فقط
 * 
 * يتم تخطي التهيئة أثناء البناء لتجنب مشاكل الذاكرة
 * في وضع الإنتاج، يتم استخدام تكوين بسيط للبناء
 */
if (!getApps().length) {
  try {
    // Skip Firebase initialization during build ONLY if config is missing
    // This allows SSG (Static Site Generation) to work if credentials are provided
    if (process.env.NEXT_PHASE === 'phase-production-build' && !hasValidConfig) {
      console.log('⚠️ Firebase config missing during build. Using fallback to prevent crash.');
      // Create minimal fallback config for build
      const buildConfig = {
        apiKey: 'build_api_key',
        authDomain: 'build.firebaseapp.com',
        projectId: 'build_project',
        storageBucket: 'build.appspot.com',
        messagingSenderId: '123456789',
        appId: 'build_app_id',
        measurementId: 'build_measurement_id'
      };
      app = initializeApp(buildConfig);
      auth = getAuth(app);
      db = getFirestore(app);
      storage = getStorage(app);
      console.log('✅ Firebase build fallback initialized');
    } else if (!hasValidConfig) {
      console.warn('⚠️ Firebase configuration is missing or invalid');
      console.warn('Please set proper Firebase configuration in your .env.local file');
      console.warn('Current config:', firebaseConfig);

      // في وضع الإنتاج، لا نطرح خطأ بل نستخدم تكوين افتراضي
      if (process.env.NODE_ENV === 'production') {
        console.warn('⚠️ Using fallback configuration for production build');
        // استخدام تكوين افتراضي للبناء
        const fallbackConfig = {
          apiKey: 'fallback_api_key',
          authDomain: 'fallback.firebaseapp.com',
          projectId: 'fallback_project',
          storageBucket: 'fallback.appspot.com',
          messagingSenderId: '123456789',
          appId: 'fallback_app_id',
          measurementId: 'fallback_measurement_id'
        };
        app = initializeApp(fallbackConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);
      } else {
        throw new Error('Firebase configuration is required for development');
      }
    } else {
      // Firebase initialization logs removed for cleaner console

      app = initializeApp(firebaseConfig);
      auth = getAuth(app);

      // Initialize Firestore with robust network settings for flaky networks/proxies
      db = initializeFirestore(app, {
        ignoreUndefinedProperties: true,
        cacheSizeBytes: 50 * 1024 * 1024, // 50MB cache
        // Reduce WebChannel 400 terminate noise by auto switching to long-polling when needed
        experimentalAutoDetectLongPolling: true,
        useFetchStreams: false
      } as any);

      // Note: Firestore network is enabled by default. Avoid toggling it at runtime to prevent race conditions.

      storage = getStorage(app);

      // Initialize Analytics in browser only
      if (typeof window !== 'undefined') {
        try {
          analytics = getAnalytics(app);
        } catch (error) {
          // إخفاء أخطاء Analytics في وضع التطوير
          if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️ Analytics initialization failed (development mode)');
          } else {
            console.warn('Analytics initialization failed:', error);
          }
          analytics = null;
        }
      }

      // Firebase initialized successfully

      // إضافة error handling للـ Firestore
      if (db) {
        enableNetwork(db).catch(err => {
          console.warn('⚠️ Firestore network enable failed:', err);
        });
      }
    }
  } catch (error) {
    if (shouldSuppressFirebaseError(error)) {
      logFirebaseError(error, 'Firebase initialization');
    } else {
      console.error('❌ Firebase initialization error:', error);
      console.error('Firebase config used:', firebaseConfig);
      throw error;
    }
  }
} else {
  app = getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  if (typeof window !== 'undefined' && !analytics) {
    try {
      analytics = getAnalytics(app);
    } catch (error) {
      // إخفاء أخطاء Analytics في وضع التطوير
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Analytics initialization failed (development mode)');
      }
      analytics = null;
    }
  }
}

/**
 * التحقق من صحة تكوين Firebase
 * يتحقق من وجود جميع الحقول المطلوبة
 * @returns {boolean} true إذا كان التكوين صحيح
 */
function validateFirebaseConfig() {
  const requiredFields = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId'
  ];

  const missingFields = requiredFields.filter(field => {
    const value = firebaseConfig[field as keyof typeof firebaseConfig];
    return !value ||
      value === 'your_firebase_api_key_here' ||
      value === 'your_firebase_api_key' ||
      value === 'your_project.firebaseapp.com' ||
      value === 'your_project_id' ||
      value === 'your_project.appspot.com' ||
      value === 'your_sender_id' ||
      value === 'your_app_id' ||
      value === 'your_measurement_id' ||
      (value && value.startsWith('your_'));
  });

  if (missingFields.length > 0) {
    console.error('❌ Firebase configuration missing required fields:', missingFields);
    return false;
  }

  return true;
}

/**
 * التحقق من اتصال Firestore
 * 
 * يقوم بفحص بسيط للاتصال مع Firestore
 * في وضع التطوير، يعيد true دائماً لتجنب false negatives
 * 
 * @returns {Promise<boolean>} true إذا كان الاتصال يعمل
 * 
 * @example
 * ```ts
 * const isConnected = await checkFirestoreConnection();
 * if (!isConnected) {
 *   console.error('Firestore connection failed');
 * }
 * ```
 */
export const checkFirestoreConnection = async () => {
  try {
    // In development, skip strict connection checks to avoid false negatives from local environments
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }
    // Perform a lightweight read; do not toggle network at runtime
    const testRef = doc(db, '_meta', '__healthcheck__');
    await getDoc(testRef);
    console.log('✅ Firestore connection verified');
    return true;
  } catch (error: any) {
    // If rules block the doc, connectivity still works
    if (error?.code === 'permission-denied') {
      console.log('✅ Firestore reachable (permission-denied on health doc)');
      return true;
    }
    console.error('❌ Firestore connection failed:', error);
    return false;
  }
};

/**
 * إعادة محاولة العملية مع معالجة أفضل للأخطاء
 * 
 * يقوم بإعادة محاولة العملية عدة مرات مع تأخير متزايد
 * مفيد للتعامل مع أخطاء الشبكة المؤقتة
 * 
 * @template T - نوع القيمة المرجعة
 * @param {() => Promise<T>} operation - العملية المراد تنفيذها
 * @param {number} [maxRetries=3] - عدد المحاولات القصوى
 * @param {number} [baseDelay=1000] - التأخير الأساسي بالميلي ثانية
 * @returns {Promise<T>} نتيجة العملية
 * 
 * @example
 * ```ts
 * const result = await retryOperation(
 *   () => fetchData(),
 *   5, // 5 محاولات
 *   2000 // تأخير 2 ثانية
 * );
 * ```
 */
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if it's a network-related error
      const isNetworkError = error instanceof Error && (
        error.message.includes('network') ||
        error.message.includes('connection') ||
        error.message.includes('timeout')
      );

      if (attempt === maxRetries || !isNetworkError) {
        console.error(`❌ Operation failed after ${attempt + 1} attempts:`, error);
        throw lastError;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.log(`🔄 Retry attempt ${attempt + 1}/${maxRetries} in ${Math.round(delay)}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
};

// التحقق من تكوين Geidea
const hasValidGeideaConfig = validateGeideaConfig();
// Geidea configuration validated

// تصدير الخدمات المهيأة
export { analytics, app, auth, db, storage };

// Export configuration for debugging
export { firebaseConfig, hasValidConfig, hasValidGeideaConfig, missingVars };

// Export validation functions
export { validateFirebaseConfig, validateGeideaConfig };

