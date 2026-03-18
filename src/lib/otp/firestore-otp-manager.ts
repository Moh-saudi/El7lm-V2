/**
 * Firestore OTP Manager (Admin SDK)
 * يستخدم Firebase Admin SDK لتجاوز قواعد الأمان من server-side
 */

import { adminDb } from '@/lib/firebase/admin';

const OTP_COLLECTION = 'otp_verifications';
const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_SECONDS = 30;

function hashOTP(otp: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(otp).digest('hex');
}

function getPhoneDocId(phoneNumber: string): string {
  return `otp_${phoneNumber.replace(/[^0-9]/g, '')}`;
}

function getDb(): FirebaseFirestore.Firestore {
  if (!adminDb) throw new Error('Firebase Admin not initialized');
  return adminDb as unknown as FirebaseFirestore.Firestore;
}

export async function storeOTPInFirestore(
  phoneNumber: string,
  otp: string,
  purpose: string = 'registration'
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getDb();
    const docId = getPhoneDocId(phoneNumber);
    const otpRef = db.collection(OTP_COLLECTION).doc(docId);

    const existing = await otpRef.get();
    if (existing.exists) {
      const data = existing.data()!;
      const now = Date.now();
      const expiresAt = data.expiresAt?.toMillis ? data.expiresAt.toMillis() : (data.expiresAt?.seconds * 1000 || 0);
      const createdAt = data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt?.seconds * 1000 || 0);
      const secondsSinceCreation = (now - createdAt) / 1000;

      if (!data.verified && expiresAt > now && secondsSinceCreation < RATE_LIMIT_SECONDS) {
        const waitSeconds = Math.ceil(RATE_LIMIT_SECONDS - secondsSinceCreation);
        return {
          success: false,
          error: `يرجى الانتظار ${waitSeconds} ثانية قبل طلب رمز جديد`,
        };
      }

      await otpRef.delete();
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await otpRef.set({
      phoneNumber,
      otpHash: hashOTP(otp),
      attempts: 0,
      createdAt: now,
      expiresAt,
      verified: false,
      purpose,
    });

    console.log(`✅ [OTP] Stored for ${phoneNumber}`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ [OTP] Store error:', error);
    return { success: false, error: error.message || 'فشل في حفظ رمز التحقق' };
  }
}

export async function verifyOTPInFirestore(
  phoneNumber: string,
  otp: string
): Promise<{ success: boolean; error?: string; attemptsRemaining?: number }> {
  try {
    const db = getDb();
    const docId = getPhoneDocId(phoneNumber);
    const otpRef = db.collection(OTP_COLLECTION).doc(docId);

    const otpDoc = await otpRef.get();
    if (!otpDoc.exists) {
      return { success: false, error: 'رمز التحقق غير موجود أو منتهي الصلاحية' };
    }

    const data = otpDoc.data()!;
    const now = Date.now();
    const expiresAt = data.expiresAt?.toMillis ? data.expiresAt.toMillis() : (data.expiresAt instanceof Date ? data.expiresAt.getTime() : 0);

    if (expiresAt < now) {
      await otpRef.delete();
      return { success: false, error: 'رمز التحقق منتهي الصلاحية. يرجى طلب رمز جديد' };
    }

    if (data.attempts >= MAX_ATTEMPTS) {
      await otpRef.delete();
      return { success: false, error: 'تم تجاوز الحد الأقصى للمحاولات. يرجى طلب رمز جديد', attemptsRemaining: 0 };
    }

    if (data.verified) {
      return { success: false, error: 'تم استخدام رمز التحقق مسبقاً' };
    }

    if (data.otpHash !== hashOTP(otp)) {
      const newAttempts = data.attempts + 1;
      await otpRef.update({ attempts: newAttempts });
      const remaining = MAX_ATTEMPTS - newAttempts;
      return {
        success: false,
        error: `رمز التحقق غير صحيح. المحاولات المتبقية: ${remaining}`,
        attemptsRemaining: remaining,
      };
    }

    await otpRef.update({ verified: true, verifiedAt: new Date() });

    console.log(`✅ [OTP] Verified for ${phoneNumber}`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ [OTP] Verify error:', error);
    return { success: false, error: error.message || 'حدث خطأ أثناء التحقق' };
  }
}

export async function deleteOTPFromFirestore(phoneNumber: string): Promise<void> {
  try {
    const db = getDb();
    await db.collection(OTP_COLLECTION).doc(getPhoneDocId(phoneNumber)).delete();
  } catch (error: any) {
    console.error('❌ [OTP] Delete error:', error);
  }
}

export async function hasActiveOTP(phoneNumber: string): Promise<boolean> {
  try {
    const db = getDb();
    const snap = await db.collection(OTP_COLLECTION).doc(getPhoneDocId(phoneNumber)).get();
    if (!snap.exists) return false;

    const data = snap.data()!;
    const now = Date.now();
    const expiresAt = data.expiresAt?.toMillis ? data.expiresAt.toMillis() : (data.expiresAt instanceof Date ? data.expiresAt.getTime() : 0);

    if (data.verified || expiresAt < now || data.attempts >= MAX_ATTEMPTS) {
      await snap.ref.delete();
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function cleanupExpiredOTPs(): Promise<number> {
  try {
    const db = getDb();
    const now = new Date();
    const snapshot = await db
      .collection(OTP_COLLECTION)
      .where('expiresAt', '<', now)
      .get();

    if (snapshot.empty) return 0;

    const batch = db.batch();
    snapshot.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    console.log(`🧹 [OTP] Cleaned ${snapshot.size} expired records`);
    return snapshot.size;
  } catch (error: any) {
    console.error('❌ [OTP] Cleanup error:', error);
    return 0;
  }
}
