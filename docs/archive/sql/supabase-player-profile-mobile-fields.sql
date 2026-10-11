-- Player profile fields used by the mobile app.
-- Run once in the Supabase SQL Editor for the production project.
-- Every statement is idempotent and preserves existing records.

BEGIN;

ALTER TABLE public.players ADD COLUMN IF NOT EXISTS university_name TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS caps BIGINT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS goals BIGINT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS assists BIGINT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS shoe_size NUMERIC;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS clothing_size TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS chronic_diseases TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS family_history JSONB;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS last_checkup TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS hours_per_week BIGINT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS transfermarkt_url TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS instagram_handle TEXT;

COMMIT;
