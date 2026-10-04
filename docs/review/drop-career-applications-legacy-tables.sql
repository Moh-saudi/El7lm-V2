-- ==============================================================================
-- Production Cleanup: Atomic DROP of Legacy Tables
--   - public."careerApplications"
--   - public.careers_applications
-- File: docs/review/drop-career-applications-legacy-tables.sql
-- Platform: Supabase PostgreSQL (Production)
-- Mode: Strictly Atomic Transaction — Rollback on ANY assertion failure
-- Decision: Intentional discard of 52 legacy archived application rows
-- Canonical: public.career_applications (Preserved intact)
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_canonical_exists BOOLEAN;
  v_legacy1_exists BOOLEAN;
  v_legacy2_exists BOOLEAN;
  v_canonical_count INT;
  v_legacy1_count INT;
  v_legacy2_count INT;
BEGIN
  -- 1. Check: public.career_applications exists
  SELECT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'career_applications'
  ) INTO v_canonical_exists;

  IF NOT v_canonical_exists THEN
    RAISE EXCEPTION 'Safety Guard Failed: public.career_applications does not exist';
  END IF;

  -- 2. Check: public."careerApplications" exists
  SELECT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'careerApplications'
  ) INTO v_legacy1_exists;

  IF NOT v_legacy1_exists THEN
    RAISE EXCEPTION 'Safety Guard Failed: public."careerApplications" does not exist';
  END IF;

  -- 3. Check: public.careers_applications exists
  SELECT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'careers_applications'
  ) INTO v_legacy2_exists;

  IF NOT v_legacy2_exists THEN
    RAISE EXCEPTION 'Safety Guard Failed: public.careers_applications does not exist';
  END IF;

  -- 4. Check: Canonical row count must equal exactly 0
  SELECT count(*) INTO v_canonical_count FROM public.career_applications;
  IF v_canonical_count != 0 THEN
    RAISE EXCEPTION 'Safety Guard Failed: canonical career_applications count is %, expected 0', v_canonical_count;
  END IF;

  -- 5. Check: public."careerApplications" row count must equal exactly 1
  SELECT count(*) INTO v_legacy1_count FROM public."careerApplications";
  IF v_legacy1_count != 1 THEN
    RAISE EXCEPTION 'Safety Guard Failed: public."careerApplications" count is %, expected 1', v_legacy1_count;
  END IF;

  -- 6. Check: public.careers_applications row count must equal exactly 51
  SELECT count(*) INTO v_legacy2_count FROM public.careers_applications;
  IF v_legacy2_count != 51 THEN
    RAISE EXCEPTION 'Safety Guard Failed: public.careers_applications count is %, expected 51', v_legacy2_count;
  END IF;

  RAISE NOTICE 'Safety guards PASSED (canonical=0, legacy1=1, legacy2=51). Executing DROP TABLE on both legacy tables...';
END $$;

-- Drop both legacy tables strictly without CASCADE
DROP TABLE public."careerApplications";
DROP TABLE public.careers_applications;

COMMIT;
