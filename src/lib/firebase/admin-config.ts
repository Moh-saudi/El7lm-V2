import * as admin from 'firebase-admin';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : undefined;

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('🔥 Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    console.error('❌ Firebase Admin SDK initialization error:', error.stack);
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
