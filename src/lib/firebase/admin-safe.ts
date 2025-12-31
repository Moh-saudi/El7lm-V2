import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;
let firestoreInstance: Firestore | null = null;
let isInitialized = false;
let initializationError: Error | null = null;

// دالة لتنظيف private key
function cleanPrivateKey(privateKey: string): string {
  let cleaned = privateKey;

  // إزالة الاقتباسات الخارجية إذا وجدت
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  }

  // استبدال \\n بـ \n
  if (cleaned.includes('\\n')) {
    cleaned = cleaned.replace(/\\n/g, '\n');
  }

  // التأكد من وجود سطور جديدة في البداية والنهاية
  if (!cleaned.includes('\n')) {
    cleaned = cleaned.replace(
      /(-----BEGIN PRIVATE KEY-----)(.*?)(-----END PRIVATE KEY-----)/s,
      '$1\n$2\n$3'
    );
  }

  return cleaned;
}

// دالة للتحقق من المتغيرات البيئية
function validateEnvironmentVariables(): {
  projectId: string;
  privateKey: string;
  clientEmail: string;
} | null {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId) {
    console.error('❌ FIREBASE_PROJECT_ID is missing');
    return null;
  }

  if (!privateKey) {
    console.error('❌ FIREBASE_PRIVATE_KEY is missing');
    return null;
  }

  if (!clientEmail) {
    console.error('❌ FIREBASE_CLIENT_EMAIL is missing');
    return null;
  }

  return {
    projectId,
    privateKey,
    clientEmail
  };
}

export function initializeFirebaseAdmin(): boolean {
  // تجنب إعادة التهيئة
  if (isInitialized && adminApp) {
    return true;
  }

  // إذا كان هناك خطأ سابق، لا نحاول مرة أخرى
  if (initializationError) {
    console.warn('⚠️ Firebase Admin already failed to initialize:', initializationError.message);
    return false;
  }

  try {
    console.log('🔧 Initializing Firebase Admin SDK...');

    // التحقق من المتغيرات البيئية
    const envVars = validateEnvironmentVariables();
    if (!envVars) {
      throw new Error('Missing required Firebase environment variables');
    }

    const { projectId, privateKey, clientEmail } = envVars;

    console.log('📋 Environment variables check:');
    console.log('Project ID:', projectId ? '✅ Set' : '❌ Missing');
    console.log('Private Key:', privateKey ? '✅ Set' : '❌ Missing');
    console.log('Client Email:', clientEmail ? '✅ Set' : '❌ Missing');

    // تنظيف private key
    const cleanedKey = cleanPrivateKey(privateKey);

    // التحقق من أن التطبيق لم يتم تهيئته بالفعل
    if (getApps().length > 0) {
      adminApp = getApps()[0];
      console.log('✅ Using existing Firebase Admin app');
    } else {
      // إنشاء تطبيق جديد
      adminApp = initializeApp({
        credential: cert({
          projectId: projectId,
          privateKey: cleanedKey,
          clientEmail: clientEmail,
        }),
        projectId: projectId,
      });
      console.log('✅ Firebase Admin initialized successfully');
    }

    isInitialized = true;
    return true;

  } catch (error: any) {
    console.error('❌ Failed to initialize Firebase Admin:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);

    initializationError = error;
    isInitialized = false;
    return false;
  }
}

export function getAdminDb(): Firestore {
  if (!isInitialized) {
    const success = initializeFirebaseAdmin();
    if (!success) {
      throw new Error('Firebase Admin initialization failed');
    }
  }

  if (!firestoreInstance && adminApp) {
    firestoreInstance = getFirestore(adminApp);
  }

  if (!firestoreInstance) {
    throw new Error('Firestore instance not available');
  }

  return firestoreInstance;
}

// دالة للتحقق من حالة Firebase Admin
export function isFirebaseAdminAvailable(): boolean {
  return isInitialized && adminApp !== null && firestoreInstance !== null;
}

// دالة للحصول على معلومات التشخيص
export function getFirebaseAdminStatus() {
  return {
    isInitialized,
    hasApp: adminApp !== null,
    hasFirestore: firestoreInstance !== null,
    error: initializationError?.message || null,
    environmentVariables: {
      projectId: !!(process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
      privateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      clientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    }
  };
}

// تصدير آمن للـ adminDb - تأخير التهيئة
export const adminDb = (() => {
  try {
    return getAdminDb();
  } catch (error: any) {
    console.warn('⚠️ Firebase Admin not available:', error.message);
    return null;
  }
})();
