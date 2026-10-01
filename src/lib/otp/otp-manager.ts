/**
 * OTP Manager - Supabase Edition
 * تم استبدال Firebase Admin بـ Supabase Admin
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import crypto from 'crypto';

const OTP_TABLE = 'otp_verifications';
const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_SECONDS = 30;

function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

function getDocId(phoneNumber: string): string {
  return `otp_${phoneNumber.replace(/[^0-9]/g, '')}`;
}

export async function storeOTPInFirestore(
  phoneNumber: string,
  otp: string,
  purpose: string = 'registration'
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getSupabaseAdmin();
    const id = getDocId(phoneNumber);

    // التحقق من وجود OTP سابق
    const { data: existing } = await db
      .from(OTP_TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (existing) {
      const now = Date.now();
      const expiresAt = new Date(existing.expiresAt).getTime();
      const createdAt = new Date(existing.createdAt).getTime();
      const secondsSinceCreation = (now - createdAt) / 1000;

      if (!existing.verified && expiresAt > now && secondsSinceCreation < RATE_LIMIT_SECONDS) {
        const waitSeconds = Math.ceil(RATE_LIMIT_SECONDS - secondsSinceCreation);
        return { success: false, error: `يرجى الانتظار ${waitSeconds} ثانية قبل طلب رمز جديد` };
      }

      await db.from(OTP_TABLE).delete().eq('id', id);
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);

    const { error } = await db.from(OTP_TABLE).insert({
      id,
      phoneNumber,
      otpHash: hashOTP(otp),
      attempts: 0,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      verified: false,
      purpose,
    });

    if (error) throw error;

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
    const db = getSupabaseAdmin();
    const id = getDocId(phoneNumber);
    const { data, error } = await db.rpc('verify_otp_atomic', {
      p_id: id,
      p_otp_hash: hashOTP(otp),
      p_max_attempts: MAX_ATTEMPTS,
    });

    if (error) throw error;

    const result =
      data && typeof data === 'object'
        ? data as { success?: boolean; code?: string; attemptsRemaining?: number }
        : {};

    if (result.success) {
      console.log(`✅ [OTP] Verified for ${phoneNumber}`);
      return { success: true };
    }

    switch (result.code) {
      case 'expired':
        return { success: false, error: 'رمز التحقق منتهي الصلاحية. يرجى طلب رمز جديد' };
      case 'already_used':
        return { success: false, error: 'تم استخدام رمز التحقق مسبقاً' };
      case 'max_attempts':
        return {
          success: false,
          error: 'تم تجاوز الحد الأقصى للمحاولات. يرجى طلب رمز جديد',
          attemptsRemaining: 0,
        };
      case 'incorrect': {
        const remaining = Number(result.attemptsRemaining ?? 0);
        return {
          success: false,
          error: `رمز التحقق غير صحيح. المحاولات المتبقية: ${remaining}`,
          attemptsRemaining: remaining,
        };
      }
      case 'not_found':
      default:
        return { success: false, error: 'رمز التحقق غير موجود أو منتهي الصلاحية' };
    }
  } catch (error: any) {
    console.error('❌ [OTP] Verify error:', error);
    return { success: false, error: error.message || 'حدث خطأ أثناء التحقق' };
  }
}

export async function deleteOTPFromFirestore(phoneNumber: string): Promise<void> {
  try {
    const db = getSupabaseAdmin();
    await db.from(OTP_TABLE).delete().eq('id', getDocId(phoneNumber));
  } catch (error: any) {
    console.error('❌ [OTP] Delete error:', error);
  }
}

export async function hasActiveOTP(phoneNumber: string): Promise<boolean> {
  try {
    const db = getSupabaseAdmin();
    const { data } = await db
      .from(OTP_TABLE)
      .select('*')
      .eq('id', getDocId(phoneNumber))
      .single();

    if (!data) return false;

    const now = Date.now();
    const expiresAt = new Date(data.expiresAt).getTime();

    if (data.verified || expiresAt < now || data.attempts >= MAX_ATTEMPTS) {
      await db.from(OTP_TABLE).delete().eq('id', getDocId(phoneNumber));
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function cleanupExpiredOTPs(): Promise<number> {
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from(OTP_TABLE)
      .delete()
      .lt('expiresAt', new Date().toISOString())
      .select('id');

    if (error) throw error;

    const count = data?.length ?? 0;
    if (count > 0) console.log(`🧹 [OTP] Cleaned ${count} expired records`);
    return count;
  } catch (error: any) {
    console.error('❌ [OTP] Cleanup error:', error);
    return 0;
  }
}
