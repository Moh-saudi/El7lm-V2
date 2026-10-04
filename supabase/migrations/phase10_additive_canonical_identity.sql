-- ==============================================================================
-- Migration: Phase 10 — Canonical Identity Additive Layer
-- Path: supabase/migrations/phase10_additive_canonical_identity.sql
-- Project: El7lm-V2 / Hagzz
-- Execution Mode: Strictly ADDITIVE ONLY — No Data Modification, No Constraints
-- ==============================================================================

-- 1. Add canonical authentication column (UUID)
-- Allows linking verified Supabase Auth accounts without corrupting legacy Firebase UIDs in "uid"
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS supabase_uid UUID NULL;

-- 2. Add canonical phone column (E.164 TEXT)
-- Standard international phone container (+20..., +966...). Nullable for accounts without verified phone.
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS phone_e164 TEXT NULL;

-- 3. Add canonical country calling code column (TEXT)
-- Stores standardized dial prefix (+20, +966, +974...).
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS country_code TEXT NULL;

-- ==============================================================================
-- INVENTORY OF SKIPPED EXISTING COLUMNS (Preserving Schema & Zero Duplication):
-- ==============================================================================
-- 1. account_type:
--    SKIPPED. The column "accountType" (TEXT) already exists and holds active user roles
--    ('player', 'club', 'academy', 'trainer', 'agent', 'marketer', 'admin').
--    Future mapping: public.users."accountType" -> public.users.account_type
--
-- 2. is_active:
--    SKIPPED. The column "isActive" (BOOLEAN) already exists.
--    Future mapping: public.users."isActive" -> public.users.is_active
--
-- 3. is_verified:
--    SKIPPED. The columns "isVerified" (BOOLEAN) and "phoneVerified" (BOOLEAN) already exist.
--    Future mapping: public.users."isVerified" -> public.users.is_verified
--
-- 4. updated_at:
--    SKIPPED. The column "updated_at" (TIMESTAMPTZ) ALREADY EXISTS in public.users.
--
-- 5. last_login_at:
--    SKIPPED. The columns "last_login" and "lastLogin" (TIMESTAMPTZ) already exist in public.users.
--    Future mapping: public.users."last_login" -> public.users.last_login_at
-- ==============================================================================
