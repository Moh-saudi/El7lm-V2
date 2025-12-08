/**
 * Firestore OTP Manager
 * نظام إدارة OTP باستخدام Firestore بدلاً من الذاكرة
 * 
 * المميزات:
 * - تخزين دائم (لا يضيع عند إعادة التشغيل)
 * - يعمل مع عدة خوادم
 * - آمن ومشفر
 * - تنظيف تلقائي للـ OTP المنتهية
 */

import { db } from '@/lib/firebase/config';
import { 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  serverTimestamp,
  Timestamp,
  collection,
  query,
  where,
  getDocs,
  writeBatch
} from 'firebase/firestore';
const OTP_COLLECTION = 'otp_verifications';
const OTP_EXPIRY_MINUTES = 1; // 1 دقيقة (طلب المستخدم)
const MAX_ATTEMPTS = 5; // أقصى 5 محاولات للتحقق
const RATE_LIMIT_MINUTES = 0.5; // منع إرسال OTP جديد خلال 30 ثانية

interface OTPRecord {
  phoneNumber: string;
  otpHash: string; // OTP مشفر
  attempts: number;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  verified: boolean;
  purpose?: string; // 'registration' | 'login' | 'password_reset'
}

/**
 * تشفير OTP قبل التخزين
 * يستخدم Node.js crypto (API routes تعمل دائماً على server-side)
 */
function hashOTP(otp: string): string {
  // في Next.js API routes، نحن دائماً على server-side
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(otp).digest('hex');
}

/**
 * إنشاء معرف فريد لرقم الهاتف
 */
function getPhoneDocId(phoneNumber: string): string {
  // تنظيف الرقم وإزالة الأحرف الخاصة
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  return `otp_${cleanPhone}`;
}

/**
 * حفظ OTP في Firestore
 */
export async function storeOTPInFirestore(
  phoneNumber: string, 
  otp: string,
  purpose: 'registration' | 'login' | 'password_reset' = 'registration'
): Promise<{ success: boolean; error?: string }> {
  try {
    const phoneDocId = getPhoneDocId(phoneNumber);
    const otpRef = doc(db, OTP_COLLECTION, phoneDocId);
    
    // التحقق من وجود OTP سابق
    const existingDoc = await getDoc(otpRef);
    if (existingDoc.exists()) {
      const data = existingDoc.data() as OTPRecord;
      const now = Date.now();
      const expiresAt = data.expiresAt.toMillis();
      const timeUntilExpiry = expiresAt - now;
      const minutesUntilExpiry = timeUntilExpiry / (60 * 1000);
      
      // Rate Limiting: إذا كان OTP نشط (أكثر من 30 ثانية متبقية)، نمنع الإرسال
      if (!data.verified && expiresAt > now && minutesUntilExpiry > RATE_LIMIT_MINUTES) {
        const remainingSeconds = Math.ceil((expiresAt - now) / 1000);
        
        // رسالة خطأ واضحة مع الوقت المتبقي
        const timeMessage = remainingSeconds >= 60 
          ? `${Math.floor(remainingSeconds / 60)} دقيقة و ${remainingSeconds % 60} ثانية`
          : `${remainingSeconds} ثانية`;
        
        return {
          success: false,
          error: `يوجد رمز تحقق نشط بالفعل. يرجى الانتظار ${timeMessage} أو استخدام الرمز المرسل سابقاً`
        };
      }
      
      // إذا كان OTP منتهي أو قريب من الانتهاء، نحذفه ونسمح بإرسال جديد
      await deleteDoc(otpRef);
      console.log(`🗑️ [Firestore OTP] تم حذف OTP قديم لـ ${phoneNumber} قبل إنشاء جديد`);
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);

    const otpHash = hashOTP(otp);
    
    const otpRecord: Omit<OTPRecord, 'createdAt' | 'expiresAt'> & {
      createdAt: any;
      expiresAt: any;
    } = {
      phoneNumber: phoneNumber,
      otpHash: otpHash,
      attempts: 0,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAt),
      verified: false,
      purpose: purpose
    };

    await setDoc(otpRef, otpRecord, { merge: false });

    console.log(`✅ [Firestore OTP] تم حفظ OTP لـ ${phoneNumber} في Firestore`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ [Firestore OTP] خطأ في حفظ OTP:', error);
    return { 
      success: false, 
      error: error.message || 'فشل في حفظ OTP' 
    };
  }
}

/**
 * التحقق من OTP في Firestore
 */
export async function verifyOTPInFirestore(
  phoneNumber: string, 
  otp: string
): Promise<{ 
  success: boolean; 
  error?: string; 
  attemptsRemaining?: number;
}> {
  try {
    const phoneDocId = getPhoneDocId(phoneNumber);
    const otpRef = doc(db, OTP_COLLECTION, phoneDocId);
    
    const otpDoc = await getDoc(otpRef);
    
    if (!otpDoc.exists()) {
      console.error(`❌ [Firestore OTP] لا يوجد OTP لـ ${phoneNumber}`);
      return { 
        success: false, 
        error: 'رمز التحقق غير موجود أو منتهي الصلاحية. يرجى طلب رمز جديد' 
      };
    }

    const data = otpDoc.data() as OTPRecord;

    // التحقق من انتهاء الصلاحية
    if (data.expiresAt.toMillis() < Date.now()) {
      await deleteDoc(otpRef);
      return { 
        success: false, 
        error: 'رمز التحقق منتهي الصلاحية. يرجى طلب رمز جديد' 
      };
    }

    // التحقق من عدد المحاولات
    if (data.attempts >= MAX_ATTEMPTS) {
      await deleteDoc(otpRef);
      return { 
        success: false, 
        error: 'تم تجاوز الحد الأقصى لمحاولات التحقق. يرجى طلب رمز جديد',
        attemptsRemaining: 0
      };
    }

    // التحقق من أن OTP لم يتم التحقق منه مسبقاً
    if (data.verified) {
      return { 
        success: false, 
        error: 'تم استخدام رمز التحقق مسبقاً. يرجى طلب رمز جديد' 
      };
    }

    // التحقق من تطابق OTP
    const otpHash = hashOTP(otp);
    if (data.otpHash !== otpHash) {
      // زيادة عدد المحاولات
      const newAttempts = data.attempts + 1;
      await setDoc(otpRef, { 
        attempts: newAttempts 
      }, { merge: true });

      const remaining = MAX_ATTEMPTS - newAttempts;
      return { 
        success: false, 
        error: `رمز التحقق غير صحيح. المحاولات المتبقية: ${remaining}`,
        attemptsRemaining: remaining
      };
    }

    // OTP صحيح - تحديث الحالة وحذف المستند
    await setDoc(otpRef, { 
      verified: true,
      verifiedAt: serverTimestamp()
    }, { merge: true });

    // حذف OTP بعد التحقق الناجح (اختياري - يمكن الاحتفاظ به للتدقيق)
    // await deleteDoc(otpRef);

    console.log(`✅ [Firestore OTP] تم التحقق من OTP بنجاح لـ ${phoneNumber}`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ [Firestore OTP] خطأ في التحقق من OTP:', error);
    return { 
      success: false, 
      error: error.message || 'حدث خطأ أثناء التحقق من رمز التحقق' 
    };
  }
}

/**
 * حذف OTP من Firestore
 */
export async function deleteOTPFromFirestore(phoneNumber: string): Promise<void> {
  try {
    const phoneDocId = getPhoneDocId(phoneNumber);
    const otpRef = doc(db, OTP_COLLECTION, phoneDocId);
    await deleteDoc(otpRef);
    console.log(`🗑️ [Firestore OTP] تم حذف OTP لـ ${phoneNumber}`);
  } catch (error: any) {
    console.error('❌ [Firestore OTP] خطأ في حذف OTP:', error);
  }
}

/**
 * تنظيف OTP المنتهية تلقائياً
 * يمكن استدعاء هذه الدالة بشكل دوري (مثلاً كل ساعة)
 */
export async function cleanupExpiredOTPs(): Promise<number> {
  try {
    const now = Timestamp.now();
    const otpCollection = collection(db, OTP_COLLECTION);
    const expiredQuery = query(
      otpCollection,
      where('expiresAt', '<', now)
    );

    const snapshot = await getDocs(expiredQuery);
    const batch = writeBatch(db);
    let deletedCount = 0;

    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
      deletedCount++;
    });

    if (deletedCount > 0) {
      await batch.commit();
      console.log(`🧹 [Firestore OTP] تم حذف ${deletedCount} OTP منتهي الصلاحية`);
    }

    return deletedCount;
  } catch (error: any) {
    console.error('❌ [Firestore OTP] خطأ في تنظيف OTP المنتهية:', error);
    return 0;
  }
}

/**
 * التحقق من وجود OTP نشط لرقم هاتف
 * يحذف OTP المنتهية تلقائياً
 * 
 * @param phoneNumber - رقم الهاتف
 * @param allowExpiredMinutes - السماح بإرسال OTP جديد إذا كان القديم منتهي خلال X دقائق (افتراضي: 1)
 */
export async function hasActiveOTP(
  phoneNumber: string, 
  allowExpiredMinutes: number = RATE_LIMIT_MINUTES
): Promise<boolean> {
  try {
    const phoneDocId = getPhoneDocId(phoneNumber);
    const otpRef = doc(db, OTP_COLLECTION, phoneDocId);
    const otpDoc = await getDoc(otpRef);
    
    if (!otpDoc.exists()) {
      return false;
    }

    const data = otpDoc.data() as OTPRecord;
    const now = Date.now();
    const expiresAt = data.expiresAt.toMillis();
    const timeUntilExpiry = expiresAt - now;
    const minutesUntilExpiry = timeUntilExpiry / (60 * 1000);
    
    // إذا كان OTP محقق، نحذفه ونرجع false
    if (data.verified) {
      await deleteDoc(otpRef);
      return false;
    }
    
    // إذا كان OTP منتهي الصلاحية، نحذفه ونرجع false
    if (expiresAt <= now) {
      await deleteDoc(otpRef);
      return false;
    }
    
    // إذا تجاوز عدد المحاولات، نحذفه ونرجع false
    if (data.attempts >= MAX_ATTEMPTS) {
      await deleteDoc(otpRef);
      return false;
    }
    
    // إذا كان OTP سينتهي خلال X دقائق، نسمح بإرسال جديد (نحذف القديم)
    if (minutesUntilExpiry <= allowExpiredMinutes) {
      console.log(`⚠️ [Firestore OTP] OTP سينتهي خلال ${minutesUntilExpiry.toFixed(1)} دقائق - السماح بإرسال جديد`);
      await deleteDoc(otpRef);
      return false;
    }
    
    // OTP نشط وصالح (أكثر من X دقائق متبقية)
    return true;
  } catch (error: any) {
    console.error('❌ [Firestore OTP] خطأ في التحقق من وجود OTP نشط:', error);
    return false;
  }
}

/**
 * الحصول على معلومات OTP (للتشخيص فقط)
 */
export async function getOTPInfo(phoneNumber: string): Promise<{
  exists: boolean;
  verified: boolean;
  expired: boolean;
  attempts: number;
  expiresAt?: Date;
}> {
  try {
    const phoneDocId = getPhoneDocId(phoneNumber);
    const otpRef = doc(db, OTP_COLLECTION, phoneDocId);
    const otpDoc = await getDoc(otpRef);
    
    if (!otpDoc.exists()) {
      return {
        exists: false,
        verified: false,
        expired: true,
        attempts: 0
      };
    }

    const data = otpDoc.data() as OTPRecord;
    const now = Date.now();
    const expired = data.expiresAt.toMillis() < now;

    return {
      exists: true,
      verified: data.verified,
      expired: expired,
      attempts: data.attempts,
      expiresAt: data.expiresAt.toDate()
    };
  } catch (error: any) {
    console.error('❌ [Firestore OTP] خطأ في الحصول على معلومات OTP:', error);
    return {
      exists: false,
      verified: false,
      expired: true,
      attempts: 0
    };
  }
}

