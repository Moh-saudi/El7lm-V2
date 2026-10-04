-- ==============================================================================
-- Rollback Migration: Phase 10 — Revert Canonical Identity Additive Layer
-- Path: supabase/migrations/phase10_rollback_additive_canonical_identity.sql
-- Project: El7lm-V2 / Hagzz
-- ==============================================================================

-- Revert the additive columns added in Phase 10
ALTER TABLE public.users 
  DROP COLUMN IF EXISTS supabase_uid,
  DROP COLUMN IF EXISTS phone_e164,
  DROP COLUMN IF EXISTS country_code;
