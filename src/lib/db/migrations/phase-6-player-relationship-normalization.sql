-- Phase 6 — Player relationship normalization (non-destructive)
-- Canonical runtime columns: trainer_id, academy_id, club_id, agent_id
-- Legacy compatibility columns: "trainerId", "academyId", "clubId", "agentId"
--
-- This migration NEVER drops columns and NEVER clears orphan values.
-- It only backfills a canonical snake_case value when it is missing and
-- the legacy camelCase column has a value. Existing canonical values win.

BEGIN;

UPDATE players
SET trainer_id = "trainerId"
WHERE trainer_id IS NULL AND "trainerId" IS NOT NULL;

UPDATE players
SET academy_id = "academyId"
WHERE academy_id IS NULL AND "academyId" IS NOT NULL;

UPDATE players
SET club_id = "clubId"
WHERE club_id IS NULL AND "clubId" IS NOT NULL;

UPDATE players
SET agent_id = "agentId"
WHERE agent_id IS NULL AND "agentId" IS NOT NULL;

-- Pair consistency. All conflict counts must be zero before any future
-- removal of legacy camelCase columns.
SELECT
  count(*) FILTER (
    WHERE trainer_id IS NOT NULL AND "trainerId" IS NOT NULL
      AND trainer_id IS DISTINCT FROM "trainerId"
  ) AS trainer_conflicts,
  count(*) FILTER (
    WHERE academy_id IS NOT NULL AND "academyId" IS NOT NULL
      AND academy_id IS DISTINCT FROM "academyId"
  ) AS academy_conflicts,
  count(*) FILTER (
    WHERE club_id IS NOT NULL AND "clubId" IS NOT NULL
      AND club_id IS DISTINCT FROM "clubId"
  ) AS club_conflicts,
  count(*) FILTER (
    WHERE agent_id IS NOT NULL AND "agentId" IS NOT NULL
      AND agent_id IS DISTINCT FROM "agentId"
  ) AS agent_conflicts,
  count(*) FILTER (WHERE trainer_id IS NULL AND "trainerId" IS NOT NULL) AS trainer_legacy_only_after,
  count(*) FILTER (WHERE academy_id IS NULL AND "academyId" IS NOT NULL) AS academy_legacy_only_after,
  count(*) FILTER (WHERE club_id IS NULL AND "clubId" IS NOT NULL) AS club_legacy_only_after,
  count(*) FILTER (WHERE agent_id IS NULL AND "agentId" IS NOT NULL) AS agent_legacy_only_after
FROM players;

-- Referential-integrity audit. Do not auto-delete or null orphan links.
SELECT
  count(*) FILTER (
    WHERE p.trainer_id IS NOT NULL AND t.id IS NULL
  ) AS trainer_orphans,
  count(*) FILTER (
    WHERE p.academy_id IS NOT NULL AND a.id IS NULL
  ) AS academy_orphans,
  count(*) FILTER (
    WHERE p.club_id IS NOT NULL AND c.id IS NULL
  ) AS club_orphans,
  count(*) FILTER (
    WHERE p.agent_id IS NOT NULL AND ag.id IS NULL
  ) AS agent_orphans
FROM players p
LEFT JOIN trainers t ON t.id = p.trainer_id
LEFT JOIN academies a ON a.id = p.academy_id
LEFT JOIN clubs c ON c.id = p.club_id
LEFT JOIN agents ag ON ag.id = p.agent_id;

COMMIT;

-- Expected from the latest live audit:
-- trainer_conflicts = 0
-- academy_conflicts = 0
-- club_conflicts = 0
-- agent_conflicts = 0
-- all *_legacy_only_after = 0
-- trainer_orphans = 5
-- academy_orphans = 0
-- club_orphans = 0
-- agent_orphans = 0
