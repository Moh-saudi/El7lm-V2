import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let isInitialized = false;
let isDisabled = false;

export function initializeFirebaseAdmin() {
  if (isInitialized || getApps().length > 0) {
    return;
  }

  // تعطيل Firebase أثناء البناء إذا لم تكن المتغيرات موجودة
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (!projectId || !privateKey || !clientEmail) {
      console.log('⚠️ Firebase Admin disabled during build - missing environment variables');
      isDisabled = true;
      return;
    }
  }

  try {
    console.log('🔧 Initializing Firebase Admin SDK...');

    // التحقق من المتغيرات البيئية المطلوبة
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    console.log('📋 Environment variables check:');
    console.log('Project ID:', projectId ? '✅ Set' : '❌ Missing');
    console.log('Private Key:', privateKey ? '✅ Set' : '❌ Missing');
    console.log('Client Email:', clientEmail ? '✅ Set' : '❌ Missing');

    if (!projectId) {
      throw new Error('FIREBASE_PROJECT_ID is required');
    }

    if (privateKey && clientEmail) {
      // استخدام service account credentials
      console.log('🔐 Using service account credentials');

      // تنظيف private key (إزالة الاقتباسات إذا وجدت)
      let cleanPrivateKey = privateKey;

      // إذا كان المفتاح يحتوي على \n، استبدله بسطور جديدة
      if (privateKey.includes('\\n')) {
        cleanPrivateKey = privateKey.replace(/\\n/g, '\n');
      }

      // إذا كان المفتاح بدون \n، أضف سطور جديدة
      if (!cleanPrivateKey.includes('\n')) {
        cleanPrivateKey = cleanPrivateKey.replace(
          /(-----BEGIN PRIVATE KEY-----)(.*?)(-----END PRIVATE KEY-----)/s,
          '$1\n$2\n$3'
        );
      }

      initializeApp({
        credential: cert({
          projectId: projectId,
          privateKey: cleanPrivateKey,
          clientEmail: clientEmail,
        }),
        projectId: projectId,
      });

      console.log('✅ Firebase Admin initialized with service account');
    } else {
      // استخدام default credentials (في production أو development)
      console.log('🔐 Using default credentials');

      initializeApp({
        projectId: projectId,
      });

      console.log('✅ Firebase Admin initialized with default credentials');
    }

    isInitialized = true;

  } catch (error: unknown) {
    console.error('❌ Failed to initialize Firebase Admin:');
    console.error('Error code:', error instanceof Error ? (error as any).code : 'unknown');
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'N/A');

    console.log('💡 Troubleshooting tips:');
    console.log('1. Check FIREBASE_PROJECT_ID environment variable');
    console.log('2. Verify FIREBASE_PRIVATE_KEY format (should include \\n)');
    console.log('3. Ensure FIREBASE_CLIENT_EMAIL is correct');
    console.log('4. Download service account key from Firebase Console');
    console.log('5. Make sure .env.local file exists and is loaded');

    // لا نرمي الخطأ، فقط نتركه للتعامل معه لاحقاً
  }
}

export function getAdminDb() {
  if (isDisabled) {
    throw new Error('Firebase Admin is disabled - missing environment variables');
  }
  initializeFirebaseAdmin();
  return getFirestore();
}

// تهيئة تلقائية للتوافق مع الكود القديم
if (typeof window === 'undefined') {
  initializeFirebaseAdmin();
}

// تصدير آمن للـ adminDb
export const adminDb = (() => {
  try {
    return getFirestore();
  } catch (error: unknown) {
    console.warn('⚠️ Firebase Admin not available:', error instanceof Error ? error.message : String(error));
    return null;
  }
})();

export const adminAuth = (() => {
  try {
    initializeFirebaseAdmin();
    return getAuth();
  } catch (error: unknown) {
    console.warn('⚠️ Firebase Admin Auth not available:', error instanceof Error ? error.message : String(error));
    return null;
  }
})();
