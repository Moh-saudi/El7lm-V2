/**
 * Phase 6: Phone Identity Layer - Types & Models
 * Platform: El7lm-V2 / Hagzz
 */

export type PhoneIdentityStatus = 'active' | 'conflict' | 'blocked' | 'archived';
export type PhoneVerificationStatus = 'unverified' | 'verified';

export type PrimaryAccountType =
  | 'users'
  | 'players'
  | 'clubs'
  | 'academies'
  | 'trainers'
  | 'agents'
  | 'marketers'
  | 'admins';

export interface LinkedAccountRecord {
  id: string;
  table: PrimaryAccountType;
  accountType: string;
  name: string;
  email?: string;
  createdAt?: string | null;
  lastLogin?: string | null;
  activityCount?: number;
}

export interface PhoneAccountIndexRow {
  id: string;
  phone_e164: string;
  country_code: string;
  phone_normalized: string;
  primary_account_id: string;
  primary_account_type: PrimaryAccountType;
  status: PhoneIdentityStatus;
  verification_status: PhoneVerificationStatus;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  linked_accounts: LinkedAccountRecord[];
  review_notes?: string | null;
}

export type PhoneIdentityLookupResult =
  | {
      found: true;
      status: 'active';
      primaryAccountId: string;
      primaryAccountType: PrimaryAccountType;
      verificationStatus: PhoneVerificationStatus;
      phoneE164: string;
      name: string;
      email: string;
      linkedAccounts: LinkedAccountRecord[];
    }
  | {
      found: true;
      status: 'conflict';
      primaryAccountId: string;
      primaryAccountType: PrimaryAccountType;
      phoneE164: string;
      conflictMessage: string;
      linkedAccounts: LinkedAccountRecord[];
    }
  | {
      found: false;
      status: 'blocked' | 'archived' | 'not_found';
      reason?: string;
    };
