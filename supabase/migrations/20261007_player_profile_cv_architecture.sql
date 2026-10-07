-- ==============================================================================
-- Migration: 20261007_player_profile_cv_architecture.sql
-- Description: Unifies Player Profile and CV data architecture across Mobile, Web,
--              and PostgreSQL schema. Idempotent and backward-compatible.
-- ==============================================================================

BEGIN;

-- 1. Education Attributes
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS university_name TEXT;

-- 2. Physical & Equipment Attributes
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS shoe_size NUMERIC;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS clothing_size TEXT;

-- 3. Health & Medical Attributes
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS chronic_diseases TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS last_checkup TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS resting_heart_rate NUMERIC;

-- 4. Sports, Stats & Training Attributes
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS caps BIGINT DEFAULT 0;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS goals BIGINT DEFAULT 0;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS assists BIGINT DEFAULT 0;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS hours_per_week BIGINT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS detailed_position TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS contract_start_date TEXT;

-- 5. Social & Professional Links
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS transfermarkt_url TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS instagram_handle TEXT;

-- 6. Guardian & Legal Relations
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS guardian_relation TEXT;

-- 7. Skills JSON Container (for dynamic ratings)
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '{}'::jsonb;

-- 8. Backfill / harmonize existing chronic condition text into chronic_diseases if empty
UPDATE public.players
SET chronic_diseases = COALESCE(chronic_details, chronic_conditions::text)
WHERE (chronic_diseases IS NULL OR chronic_diseases = '')
  AND (chronic_details IS NOT NULL OR chronic_conditions IS NOT NULL);

COMMIT;
