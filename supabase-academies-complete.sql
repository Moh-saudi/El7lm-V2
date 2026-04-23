-- ================================================================
-- Migration: academies table — complete columns for profile page
-- Run in Supabase SQL Editor
-- ================================================================

-- Basic info
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "academy_name"          TEXT;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "description"           TEXT;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "logo"                  TEXT;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "coverImage"            TEXT;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "founding_year"         TEXT;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "academy_type"          TEXT;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "is_federation_approved" BOOLEAN DEFAULT false;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "license_number"        TEXT;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "registration_date"     TEXT;

-- Contact
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "country"    TEXT;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "city"       TEXT;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "address"    TEXT;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "phone"      TEXT;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "whatsapp"   TEXT;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "email"      TEXT;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "website"    TEXT;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "social_media" JSONB DEFAULT '{}'::jsonb;

-- Programs
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "age_groups"        JSONB DEFAULT '[]'::jsonb;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "sports_facilities"  JSONB DEFAULT '[]'::jsonb;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "number_of_coaches"  INTEGER;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "training_programs"  TEXT;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "academy_goals"      TEXT;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "achievements"       TEXT;

-- Staff
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "director"           JSONB DEFAULT '{}'::jsonb;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "technical_director" JSONB DEFAULT '{}'::jsonb;

-- Branches & media
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "branches"        JSONB DEFAULT '[]'::jsonb;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "success_stories" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "partnerships"    JSONB DEFAULT '[]'::jsonb;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "facility_photos" JSONB DEFAULT '[]'::jsonb;

-- Stats
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "stats" JSONB DEFAULT '{"students":0,"programs":0,"coaches":0,"graduates":0}'::jsonb;

-- System
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "name"        TEXT;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "accountType" TEXT DEFAULT 'academy';
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "createdAt"   TIMESTAMPTZ DEFAULT now();
ALTER TABLE academies ADD COLUMN IF NOT EXISTS "updatedAt"   TIMESTAMPTZ;

-- تحويل number_of_coaches من BIGINT إلى INTEGER إذا كان BIGINT
-- (يتجنب مشكلة إرسال "" — يُعالج أيضاً بالكود)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'academies'
      AND column_name = 'number_of_coaches'
      AND data_type = 'bigint'
  ) THEN
    ALTER TABLE academies ALTER COLUMN "number_of_coaches" TYPE INTEGER USING "number_of_coaches"::INTEGER;
  END IF;
END $$;
