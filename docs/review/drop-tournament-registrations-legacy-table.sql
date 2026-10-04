-- ==============================================================================
-- Production Cleanup: Atomic DROP of Legacy Table public."tournamentRegistrations"
-- File: docs/review/drop-tournament-registrations-legacy-table.sql
-- Platform: Supabase PostgreSQL (Production)
-- Mode: Strictly Atomic Transaction — Rollback on ANY assertion failure
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_canonical_exists BOOLEAN;
  v_legacy_exists BOOLEAN;
  v_canonical_count INT;
  v_legacy_only_count INT;
  v_missing_shared_count INT;
BEGIN
  -- 1. Check: public.tournament_registrations exists
  SELECT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tournament_registrations'
  ) INTO v_canonical_exists;

  IF NOT v_canonical_exists THEN
    RAISE EXCEPTION 'Safety Guard Failed: public.tournament_registrations does not exist';
  END IF;

  -- 2. Check: public."tournamentRegistrations" exists
  SELECT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tournamentRegistrations'
  ) INTO v_legacy_exists;

  IF NOT v_legacy_exists THEN
    RAISE EXCEPTION 'Safety Guard Failed: public."tournamentRegistrations" does not exist';
  END IF;

  -- 3. Check: Canonical row count must equal exactly 14 before DROP
  SELECT count(*) INTO v_canonical_count FROM public.tournament_registrations;
  IF v_canonical_count != 14 THEN
    RAISE EXCEPTION 'Safety Guard Failed: canonical row count is %, expected 14', v_canonical_count;
  END IF;

  -- 4. Check: legacy_only_ids = 0 (All legacy records exist in canonical)
  SELECT count(*) INTO v_legacy_only_count
  FROM public."tournamentRegistrations" l
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tournament_registrations c WHERE c.id = l.id
  );

  IF v_legacy_only_count > 0 THEN
    RAISE EXCEPTION 'Safety Guard Failed: legacy_only_ids count is %, expected 0', v_legacy_only_count;
  END IF;

  -- 5. Check: All IDs in legacy are present in canonical
  SELECT count(*) INTO v_missing_shared_count
  FROM public."tournamentRegistrations" l
  LEFT JOIN public.tournament_registrations c ON c.id = l.id
  WHERE c.id IS NULL;

  IF v_missing_shared_count > 0 THEN
    RAISE EXCEPTION 'Safety Guard Failed: % legacy IDs are missing from canonical', v_missing_shared_count;
  END IF;

  RAISE NOTICE 'Safety guards PASSED (canonical=14, legacy=OK, legacy_only_ids=0). Executing DROP TABLE public."tournamentRegistrations"...';
END $$;

-- Drop legacy table strictly without CASCADE
DROP TABLE public."tournamentRegistrations";

COMMIT;
