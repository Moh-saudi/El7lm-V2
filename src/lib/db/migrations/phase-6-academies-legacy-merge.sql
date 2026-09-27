-- Phase 6 — Academies legacy merge
-- Canonical: academies
-- Legacy typo table: academys
--
-- Live audit before migration (2026-09-27):
--   academies = 37
--   academys = 37
--   shared ids = 18
--   canonical-only ids = 19
--   legacy-only ids = 19
--
-- Strategy:
-- 1) Preserve every existing non-null canonical value.
-- 2) Fill only missing canonical identity/account fields from academys.
-- 3) Insert legacy-only accounts into academies using shared columns only.
-- 4) Do not copy legacy-only migration metadata columns.
-- 5) Do not delete or modify academys.
--
-- Expected after first successful execution:
--   academies = 56
--   academys = 37
--   shared ids = 37
--   legacy-only ids = 0
--
-- Safe to re-run.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.academies') IS NULL THEN
    RAISE EXCEPTION 'Missing canonical table: academies';
  END IF;
  IF to_regclass('public.academys') IS NULL THEN
    RAISE EXCEPTION 'Missing legacy table: academys';
  END IF;
END
$$;

INSERT INTO academies (
  id,
  uid,
  email,
  "accountType",
  full_name,
  profile_image,
  country,
  phone,
  "firebaseEmail",
  "isActive",
  "organizationCode",
  "isDeleted",
  "deletedAt",
  "deletedBy",
  "updatedAt",
  updated_at,
  created_at
)
SELECT
  id,
  uid,
  email,
  "accountType",
  full_name,
  profile_image,
  country,
  phone,
  "firebaseEmail",
  "isActive",
  "organizationCode",
  "isDeleted",
  "deletedAt",
  "deletedBy",
  "updatedAt",
  NULL,
  created_at
FROM academys
ON CONFLICT (id) DO UPDATE SET
  uid = COALESCE(NULLIF(BTRIM(academies.uid), ''), EXCLUDED.uid),
  email = COALESCE(NULLIF(BTRIM(academies.email), ''), EXCLUDED.email),
  "accountType" = COALESCE(NULLIF(BTRIM(academies."accountType"), ''), EXCLUDED."accountType"),
  full_name = COALESCE(NULLIF(BTRIM(academies.full_name), ''), EXCLUDED.full_name),
  profile_image = COALESCE(NULLIF(BTRIM(academies.profile_image), ''), EXCLUDED.profile_image),
  country = COALESCE(NULLIF(BTRIM(academies.country), ''), EXCLUDED.country),
  phone = COALESCE(NULLIF(BTRIM(academies.phone), ''), EXCLUDED.phone),
  "firebaseEmail" = COALESCE(NULLIF(BTRIM(academies."firebaseEmail"), ''), EXCLUDED."firebaseEmail"),
  "isActive" = COALESCE(academies."isActive", EXCLUDED."isActive"),
  "organizationCode" = COALESCE(NULLIF(BTRIM(academies."organizationCode"), ''), EXCLUDED."organizationCode"),
  "isDeleted" = COALESCE(academies."isDeleted", EXCLUDED."isDeleted"),
  "deletedAt" = COALESCE(academies."deletedAt", EXCLUDED."deletedAt"),
  "deletedBy" = COALESCE(academies."deletedBy", EXCLUDED."deletedBy"),
  "updatedAt" = COALESCE(academies."updatedAt", EXCLUDED."updatedAt"),
  created_at = COALESCE(academies.created_at, EXCLUDED.created_at);

-- Verification: no legacy ID may remain absent from canonical.
SELECT
  (SELECT count(*) FROM academies) AS canonical_rows_after,
  (SELECT count(*) FROM academys) AS legacy_rows_preserved,
  (
    SELECT count(*)
    FROM academies c
    JOIN academys l ON l.id = c.id
  ) AS shared_ids_after,
  (
    SELECT count(*)
    FROM academys l
    LEFT JOIN academies c ON c.id = l.id
    WHERE c.id IS NULL
  ) AS legacy_ids_not_migrated,
  (
    SELECT count(*)
    FROM academies c
    JOIN academys l ON l.id = c.id
    WHERE
      (NULLIF(BTRIM(c.uid), '') IS NULL AND NULLIF(BTRIM(l.uid), '') IS NOT NULL) OR
      (NULLIF(BTRIM(c.email), '') IS NULL AND NULLIF(BTRIM(l.email), '') IS NOT NULL) OR
      (NULLIF(BTRIM(c.full_name), '') IS NULL AND NULLIF(BTRIM(l.full_name), '') IS NOT NULL) OR
      (NULLIF(BTRIM(c.phone), '') IS NULL AND NULLIF(BTRIM(l.phone), '') IS NOT NULL) OR
      (NULLIF(BTRIM(c.profile_image), '') IS NULL AND NULLIF(BTRIM(l.profile_image), '') IS NOT NULL) OR
      (NULLIF(BTRIM(c."organizationCode"), '') IS NULL AND NULLIF(BTRIM(l."organizationCode"), '') IS NOT NULL)
  ) AS missed_fillable_identity_values;

COMMIT;

-- Expected:
-- canonical_rows_after = 56
-- legacy_rows_preserved = 37
-- shared_ids_after = 37
-- legacy_ids_not_migrated = 0
-- missed_fillable_identity_values = 0
