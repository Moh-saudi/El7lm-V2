-- ==============================================================================
-- Production Cleanup: Atomic DROP of Legacy Table public.academys
-- File: docs/review/drop-academys-legacy-table.sql
-- Platform: Supabase PostgreSQL (Production)
-- Mode: Strictly Atomic Transaction — Rollback on ANY assertion failure
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_academies_exists BOOLEAN;
  v_academys_exists BOOLEAN;
  v_legacy_only_count INT;
BEGIN
  -- 1. Check: public.academies exists
  SELECT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'academies'
  ) INTO v_academies_exists;

  IF NOT v_academies_exists THEN
    RAISE EXCEPTION 'Safety Guard Failed: public.academies does not exist';
  END IF;

  -- 2. Check: public.academys exists
  SELECT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'academys'
  ) INTO v_academys_exists;

  IF NOT v_academys_exists THEN
    RAISE EXCEPTION 'Safety Guard Failed: public.academys does not exist';
  END IF;

  -- 3. Check: legacy_only_ids = 0 (No orphan legacy records)
  SELECT count(*) INTO v_legacy_only_count
  FROM public.academys l
  WHERE NOT EXISTS (
    SELECT 1 FROM public.academies c WHERE c.id = l.id
  );

  IF v_legacy_only_count > 0 THEN
    RAISE EXCEPTION 'Safety Guard Failed: legacy_only_ids count is %, expected 0', v_legacy_only_count;
  END IF;

  RAISE NOTICE 'Safety guards PASSED (academies=OK, academys=OK, legacy_only_ids=0). Executing DROP TABLE public.academys...';
END $$;

-- Drop legacy table strictly without CASCADE
DROP TABLE public.academys;

COMMIT;
