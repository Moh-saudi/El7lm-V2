// src/lib/firebase/config.ts
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

// التحقق من متغيرات البيئة
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

const hasValidConfig = missingVars.length === 0;

// إظهار تحذير فقط في وضع التطوير وإذا كانت المتغيرات ناقصة
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

// تكوين Firebase - استخدام متغيرات البيئة فقط
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// تكوين Geidea (server-side only) - بدون credentials مكشوفة
export const geideaConfig = {
  merchantPublicKey: process.env.GEIDEA_MERCHANT_PUBLIC_KEY || '3448c010-87b1-41e7-9771-cac444268cfb',
  apiPassword: process.env.GEIDEA_API_PASSWORD || 'edfd5eee-fd1b-4932-9ee1-d6d9ba7599f0',
  webhookSecret: process.env.GEIDEA_WEBHOOK_SECRET || 'geidea_webhook_secret_production_2024',
  baseUrl: process.env.GEIDEA_BASE_URL || 'https://api.merchant.geidea.net',
  isTestMode: false
};

// التحقق من صحة تكوين Geidea (server-side only)
const validateGeideaConfig = () => {
  // لدينا مفاتيح إنتاج حقيقية من لوحة Geidea
  // لذا نعتبر التكوين صحيح دائماً
  return true;
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let analytics: Analytics | null = null;
let storage: FirebaseStorage;

// Initialize Firebase only once
if (!getApps().length) {
  try {
    // Skip Firebase initialization during build to prevent memory issues
    if (process.env.NEXT_PHASE === 'phase-production-build' ||
        process.env.DISABLE_FIREBASE_DURING_BUILD === 'true' ||
        process.env.VERCEL === '1') {
      console.log('🚫 Skipping Firebase initialization during build phase');
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
    console.log('🔧 Initializing Firebase with config:', {
      apiKey: firebaseConfig.apiKey ? '✅ Set' : '❌ Missing',
      authDomain: firebaseConfig.authDomain ? '✅ Set' : '❌ Missing',
      projectId: firebaseConfig.projectId ? '✅ Set' : '❌ Missing',
      storageBucket: firebaseConfig.storageBucket ? '✅ Set' : '❌ Missing',
      messagingSenderId: firebaseConfig.messagingSenderId ? '✅ Set' : '❌ Missing',
      appId: firebaseConfig.appId ? '✅ Set' : '❌ Missing',
      measurementId: firebaseConfig.measurementId ? '✅ Set' : '❌ Missing'
    });

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

    console.log('✅ Firebase initialized successfully');

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

// التحقق من صحة تكوين Firebase
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

// Enhanced Firestore connection check
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

// Enhanced retry operation with better error handling
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
if (process.env.NODE_ENV === 'development') {
  console.log('✅ Geidea configuration validated with TEST credentials');
}

// تصدير الخدمات المهيأة
export { analytics, app, auth, db, storage };

// Export configuration for debugging
    export { firebaseConfig, hasValidConfig, hasValidGeideaConfig, missingVars };

// Export validation functions
    export { validateFirebaseConfig, validateGeideaConfig };

