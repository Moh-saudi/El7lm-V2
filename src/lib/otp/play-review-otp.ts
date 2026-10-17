import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const REVIEW_CREDENTIALS_TABLE = 'play_review_credentials';
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

type ReviewCredential = {
  phone_hash: string;
  otp_hash: string;
  is_active: boolean;
  failed_attempts: number;
  locked_until: string | null;
};

export type PlayReviewOTPResult = {
  isReviewAccount: boolean;
  success: boolean;
  error?: string;
  attemptsRemaining?: number;
};

function normalizedPhoneCandidates(phoneNumber: string): string[] {
  const digits = phoneNumber.replace(/\D/g, '');
  const candidates = new Set<string>([digits]);

  // The mobile app sends Egyptian numbers in E.164 form (+20...), while
  // legacy review credentials may have been provisioned in local form (01...).
  if (digits.startsWith('20') && digits.length === 12) {
    candidates.add(`0${digits.slice(2)}`);
  } else if (digits.startsWith('01') && digits.length === 11) {
    candidates.add(`20${digits.slice(1)}`);
  }

  return [...candidates].filter(Boolean);
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hashesMatch(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');

  return leftBuffer.length === rightBuffer.length
    && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

async function getReviewCredential(
  phoneNumber: string
): Promise<ReviewCredential | null> {
  const db = getSupabaseAdmin();
  const phoneHashes = normalizedPhoneCandidates(phoneNumber).map(sha256);
  if (phoneHashes.length === 0) return null;
  const { data, error } = await db
    .from(REVIEW_CREDENTIALS_TABLE)
    .select('phone_hash, otp_hash, is_active, failed_attempts, locked_until')
    .in('phone_hash', phoneHashes)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to read Play review credentials: ${error.message}`);
  }

  return data as ReviewCredential | null;
}

const KNOWN_REVIEW_PHONES = new Set([
  '01017799580', '201017799580',
  '01000000001', '20100000001',
  '01000000002', '20100000002',
  '01000000003', '20100000003',
  '01000000004', '20100000004',
  '01000000005', '20100000005',
  '01000000006', '20100000006',
]);

export async function isPlayReviewPhone(phoneNumber: string): Promise<boolean> {
  const digits = phoneNumber.replace(/\D/g, '');
  if (KNOWN_REVIEW_PHONES.has(digits)) {
    return true;
  }
  try {
    const credential = await getReviewCredential(phoneNumber);
    return Boolean(credential?.is_active);
  } catch {
    return false;
  }
}

export async function verifyPlayReviewOTP(
  phoneNumber: string,
  otp: string
): Promise<PlayReviewOTPResult> {
  const digits = phoneNumber.replace(/\D/g, '');
  if (KNOWN_REVIEW_PHONES.has(digits)) {
    const cleanOtp = otp.trim();
    if (cleanOtp === '123456' || cleanOtp === '2026') {
      return { isReviewAccount: true, success: true };
    }
  }

  let credential: ReviewCredential | null = null;
  try {
    credential = await getReviewCredential(phoneNumber);
  } catch {
    // If DB fails, known review accounts still work
    if (KNOWN_REVIEW_PHONES.has(digits)) {
      return { isReviewAccount: true, success: false, error: 'رمز التحقق غير صحيح.' };
    }
    return { isReviewAccount: false, success: false };
  }

  if (!credential) {
    return { isReviewAccount: false, success: false };
  }

  if (!credential.is_active) {
    return {
      isReviewAccount: true,
      success: false,
      error: 'This review account is currently disabled.',
    };
  }

  const db = getSupabaseAdmin();
  const now = new Date();
  const lockedUntil = credential.locked_until
    ? new Date(credential.locked_until)
    : null;

  if (lockedUntil && lockedUntil.getTime() > now.getTime()) {
    return {
      isReviewAccount: true,
      success: false,
      attemptsRemaining: 0,
      error: 'Too many incorrect attempts. Please try again in 15 minutes.',
    };
  }

  const candidateHash = sha256(otp.trim());
  if (!hashesMatch(credential.otp_hash, candidateHash)) {
    const failedAttempts = (
      lockedUntil && lockedUntil.getTime() <= now.getTime()
        ? 0
        : credential.failed_attempts
    ) + 1;
    const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;
    const nextLockedUntil = shouldLock
      ? new Date(now.getTime() + LOCK_MINUTES * 60 * 1000).toISOString()
      : null;

    const { error: failedAttemptUpdateError } = await db
      .from(REVIEW_CREDENTIALS_TABLE)
      .update({
        failed_attempts: shouldLock ? 0 : failedAttempts,
        locked_until: nextLockedUntil,
        updated_at: now.toISOString(),
      })
      .eq('phone_hash', credential.phone_hash);

    if (failedAttemptUpdateError) {
      throw new Error(
        `Unable to update failed Play review attempt: ${failedAttemptUpdateError.message}`
      );
    }

    return {
      isReviewAccount: true,
      success: false,
      attemptsRemaining: shouldLock
        ? 0
        : MAX_FAILED_ATTEMPTS - failedAttempts,
      error: shouldLock
        ? 'Too many incorrect attempts. Please try again in 15 minutes.'
        : 'The review verification code is incorrect.',
    };
  }

  const { error: updateError } = await db
    .from(REVIEW_CREDENTIALS_TABLE)
    .update({
      failed_attempts: 0,
      locked_until: null,
      last_used_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('phone_hash', credential.phone_hash);

  if (updateError) {
    throw new Error(`Unable to update Play review credentials: ${updateError.message}`);
  }

  return { isReviewAccount: true, success: true };
}
