-- Phase 6 — Duplicate/Legacy Table Audit (READ ONLY)
-- Run this before any DROP/RENAME migration.
-- It reports overlap without modifying data.

SELECT 'academies vs academys' AS pair,
       (SELECT count(*) FROM academies) AS canonical_rows,
       (SELECT count(*) FROM academys) AS legacy_rows,
       (SELECT count(*) FROM academies a JOIN academys x ON x.id = a.id) AS shared_ids;

SELECT 'career_applications vs careerApplications' AS pair,
       (SELECT count(*) FROM career_applications) AS canonical_rows,
       (SELECT count(*) FROM careerApplications) AS legacy_rows,
       (SELECT count(*) FROM career_applications a JOIN careerApplications x ON x.id = a.id) AS shared_ids;

SELECT 'career_applications vs careers_applications' AS pair,
       (SELECT count(*) FROM career_applications) AS canonical_rows,
       (SELECT count(*) FROM careers_applications) AS legacy_rows,
       (SELECT count(*) FROM career_applications a JOIN careers_applications x ON x.id = a.id) AS shared_ids;

SELECT 'tournament_registrations vs tournamentRegistrations' AS pair,
       (SELECT count(*) FROM tournament_registrations) AS canonical_rows,
       (SELECT count(*) FROM "tournamentRegistrations") AS legacy_rows,
       (SELECT count(*) FROM tournament_registrations a JOIN "tournamentRegistrations" x ON x.id = a.id) AS shared_ids;

SELECT 'bulkPayments vs bulk_payments' AS pair,
       (SELECT count(*) FROM "bulkPayments") AS canonical_rows,
       (SELECT count(*) FROM bulk_payments) AS legacy_rows,
       (SELECT count(*) FROM "bulkPayments" a JOIN bulk_payments x ON x.id = a.id) AS shared_ids;

-- Player relationship duplicates discovered during the performance audit.
SELECT
  count(*) FILTER (WHERE trainer_id IS NOT NULL OR "trainerId" IS NOT NULL) AS linked_rows,
  count(*) FILTER (
    WHERE trainer_id IS NOT NULL
      AND "trainerId" IS NOT NULL
      AND trainer_id = "trainerId"
  ) AS matching_trainer_ids,
  count(*) FILTER (
    WHERE trainer_id IS DISTINCT FROM "trainerId"
  ) AS conflicting_trainer_ids
FROM players;

SELECT
  count(*) FILTER (WHERE academy_id IS NOT NULL OR "academyId" IS NOT NULL) AS linked_rows,
  count(*) FILTER (
    WHERE academy_id IS NOT NULL
      AND "academyId" IS NOT NULL
      AND academy_id = "academyId"
  ) AS matching_academy_ids,
  count(*) FILTER (
    WHERE academy_id IS DISTINCT FROM "academyId"
  ) AS conflicting_academy_ids
FROM players;

SELECT
  count(*) FILTER (WHERE club_id IS NOT NULL OR "clubId" IS NOT NULL) AS linked_rows,
  count(*) FILTER (
    WHERE club_id IS NOT NULL
      AND "clubId" IS NOT NULL
      AND club_id = "clubId"
  ) AS matching_club_ids,
  count(*) FILTER (
    WHERE club_id IS DISTINCT FROM "clubId"
  ) AS conflicting_club_ids
FROM players;

SELECT
  count(*) FILTER (WHERE agent_id IS NOT NULL OR "agentId" IS NOT NULL) AS linked_rows,
  count(*) FILTER (
    WHERE agent_id IS NOT NULL
      AND "agentId" IS NOT NULL
      AND agent_id = "agentId"
  ) AS matching_agent_ids,
  count(*) FILTER (
    WHERE agent_id IS DISTINCT FROM "agentId"
  ) AS conflicting_agent_ids
FROM players;
