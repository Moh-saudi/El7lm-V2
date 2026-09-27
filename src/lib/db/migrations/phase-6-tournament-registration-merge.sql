-- Phase 6 — Tournament registration legacy merge
-- Purpose: copy legacy "tournamentRegistrations" rows into the canonical
-- tournament_registrations table without deleting or modifying legacy rows.
-- Expected live counts before execution (2026-09-27 audit):
--   tournament_registrations: 9
--   "tournamentRegistrations": 5
--   shared ids: 0
-- Expected canonical count after execution: 14
--
-- Safe to re-run: ON CONFLICT (id) DO NOTHING.
-- IMPORTANT: verify the preflight result before COMMIT.

BEGIN;

-- Abort rather than silently doing the wrong thing if either relation is absent.
DO $$
BEGIN
  IF to_regclass('public.tournament_registrations') IS NULL THEN
    RAISE EXCEPTION 'Missing canonical table: tournament_registrations';
  END IF;

  IF to_regclass('public."tournamentRegistrations"') IS NULL THEN
    RAISE EXCEPTION 'Missing legacy table: "tournamentRegistrations"';
  END IF;
END
$$;

INSERT INTO tournament_registrations (
  id,
  "tournamentId",
  players,
  "accountType",
  "accountEmail",
  "accountPhone",
  "organizationType",
  "paymentMethod",
  "mobileWalletProvider",
  "mobileWalletNumber",
  "receiptUrl",
  "receiptNumber",
  "paymentAmount",
  "paymentStatus",
  notes,
  "registrationType",
  "registrationDate",
  status,
  "accountName",
  "organizationName",
  "createdAt",
  "updatedAt"
)
SELECT
  id,
  "tournamentId",
  COALESCE(players, "selectedPlayers"),
  "accountType",
  "accountEmail",
  "accountPhone",
  "organizationType",
  "paymentMethod",
  "mobileWalletProvider",
  "mobileWalletNumber",
  "receiptUrl",
  "receiptNumber",
  "paymentAmount",
  "paymentStatus",
  notes,
  "registrationType",
  "registrationDate",
  status,
  "accountName",
  "organizationName",
  COALESCE("registrationDate", now()),
  now()
FROM "tournamentRegistrations"
ON CONFLICT (id) DO NOTHING;

-- Verification result must be reviewed before the legacy table is ever removed.
SELECT
  (SELECT count(*) FROM tournament_registrations) AS canonical_rows_after,
  (SELECT count(*) FROM "tournamentRegistrations") AS legacy_rows_preserved,
  (
    SELECT count(*)
    FROM tournament_registrations c
    JOIN "tournamentRegistrations" l ON l.id = c.id
  ) AS migrated_shared_ids,
  (
    SELECT count(*)
    FROM "tournamentRegistrations" l
    LEFT JOIN tournament_registrations c ON c.id = l.id
    WHERE c.id IS NULL
  ) AS legacy_rows_not_migrated;

COMMIT;

-- Expected verification for the audited live database:
-- canonical_rows_after = 14
-- legacy_rows_preserved = 5
-- migrated_shared_ids = 5
-- legacy_rows_not_migrated = 0
