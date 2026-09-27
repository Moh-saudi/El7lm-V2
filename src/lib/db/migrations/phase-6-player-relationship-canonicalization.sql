-- Phase 6: canonicalize player relationship columns.
-- Preconditions: application runtime uses snake_case fields only.
-- Safety: abort if any legacy-only or conflicting values exist.

BEGIN;

DO $$
DECLARE
  legacy_only_count bigint;
  conflict_count bigint;
BEGIN
  SELECT count(*) INTO legacy_only_count
  FROM public.players
  WHERE ("trainerId" IS NOT NULL AND trainer_id IS NULL)
     OR ("academyId" IS NOT NULL AND academy_id IS NULL)
     OR ("clubId" IS NOT NULL AND club_id IS NULL)
     OR ("agentId" IS NOT NULL AND agent_id IS NULL);

  SELECT count(*) INTO conflict_count
  FROM public.players
  WHERE ("trainerId" IS NOT NULL AND trainer_id IS NOT NULL AND "trainerId" IS DISTINCT FROM trainer_id)
     OR ("academyId" IS NOT NULL AND academy_id IS NOT NULL AND "academyId" IS DISTINCT FROM academy_id)
     OR ("clubId" IS NOT NULL AND club_id IS NOT NULL AND "clubId" IS DISTINCT FROM club_id)
     OR ("agentId" IS NOT NULL AND agent_id IS NOT NULL AND "agentId" IS DISTINCT FROM agent_id);

  IF legacy_only_count <> 0 OR conflict_count <> 0 THEN
    RAISE EXCEPTION 'Player relationship cleanup aborted: legacy_only=%, conflicts=%',
      legacy_only_count, conflict_count;
  END IF;
END $$;

-- Replace legacy-column indexes with canonical snake_case indexes.
DROP INDEX IF EXISTS public.idx_players_trainer_id;
DROP INDEX IF EXISTS public.idx_players_academy_id;
DROP INDEX IF EXISTS public.idx_players_club_id;
DROP INDEX IF EXISTS public.idx_players_agent_id;

CREATE INDEX IF NOT EXISTS idx_players_trainer_id
  ON public.players (trainer_id) WHERE trainer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_players_academy_id
  ON public.players (academy_id) WHERE academy_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_players_club_id
  ON public.players (club_id) WHERE club_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_players_agent_id
  ON public.players (agent_id) WHERE agent_id IS NOT NULL;

ALTER TABLE public.players
  DROP COLUMN IF EXISTS "trainerId",
  DROP COLUMN IF EXISTS "academyId",
  DROP COLUMN IF EXISTS "clubId",
  DROP COLUMN IF EXISTS "agentId";

COMMIT;

-- Verification (read-only result set).
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'players'
  AND indexname IN (
    'idx_players_trainer_id',
    'idx_players_academy_id',
    'idx_players_club_id',
    'idx_players_agent_id'
  )
ORDER BY indexname;

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'players'
  AND column_name IN ('trainerId','academyId','clubId','agentId')
ORDER BY column_name;
