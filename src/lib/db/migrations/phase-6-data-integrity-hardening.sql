-- Phase 6 — Data integrity and legacy-schema hardening
-- Mirrors production hardening applied during the Phase 6 audit.
-- Safety: preserves historical notification/reward records and fails closed
-- when active join-request duplicates must be reviewed manually.

BEGIN;

-- Retired legacy auth/session artifacts and the superseded video table.
DROP TABLE IF EXISTS public.backup_otps;
DROP TABLE IF EXISTS public."passwordResetTokens";
DROP TABLE IF EXISTS public.password_reset_tokens;
DROP TABLE IF EXISTS public.videos;

-- Prevent duplicate applications for the same player/opportunity.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.opportunity_applications'::regclass
      AND conname = 'opportunity_applications_opportunity_player_unique'
  ) THEN
    ALTER TABLE public.opportunity_applications
      ADD CONSTRAINT opportunity_applications_opportunity_player_unique
      UNIQUE ("opportunityId", "playerId");
  END IF;
END $$;

-- Support messages must reference an existing support conversation.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.support_messages'::regclass
      AND conname = 'support_messages_conversation_fkey'
  ) THEN
    ALTER TABLE public.support_messages
      ADD CONSTRAINT support_messages_conversation_fkey
      FOREIGN KEY ("conversationId")
      REFERENCES public.support_conversations(id);
  END IF;
END $$;

-- Active/approved join requests are unique per player + organization.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.player_join_requests
    WHERE status IN ('pending','approved')
      AND "playerId" IS NOT NULL
      AND "organizationId" IS NOT NULL
    GROUP BY "playerId","organizationId"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Active player join-request duplicates require manual review';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS player_join_requests_active_org_unique
  ON public.player_join_requests ("playerId","organizationId")
  WHERE status IN ('pending','approved')
    AND "playerId" IS NOT NULL
    AND "organizationId" IS NOT NULL;

-- Referral codes are case-insensitively unique.
CREATE UNIQUE INDEX IF NOT EXISTS referrals_referral_code_ci_unique
  ON public.referrals (lower("referralCode"))
  WHERE "referralCode" IS NOT NULL AND "referralCode" <> '';

CREATE UNIQUE INDEX IF NOT EXISTS organization_referrals_code_ci_unique
  ON public.organization_referrals (lower("referralCode"))
  WHERE "referralCode" IS NOT NULL AND "referralCode" <> '';

-- Player reward history is intentionally preserved; index ownership lookup.
CREATE INDEX IF NOT EXISTS idx_player_rewards_player_id
  ON public.player_rewards ("playerId");

-- Store order arithmetic integrity. Product pricing remains server-flow work;
-- these checks prevent internally inconsistent or negative order totals.
DO $
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.store_orders'::regclass AND conname='store_orders_quantity_positive') THEN
    ALTER TABLE public.store_orders
      ADD CONSTRAINT store_orders_quantity_positive CHECK (quantity > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.store_orders'::regclass AND conname='store_orders_prices_nonnegative') THEN
    ALTER TABLE public.store_orders
      ADD CONSTRAINT store_orders_prices_nonnegative CHECK (unit_price >= 0 AND total_price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.store_orders'::regclass AND conname='store_orders_total_matches_quantity') THEN
    ALTER TABLE public.store_orders
      ADD CONSTRAINT store_orders_total_matches_quantity CHECK (total_price = unit_price * quantity);
  END IF;
END $;

-- Legacy tournament registrations remain on the original tournaments system.
-- Client-created registrations must begin in a non-authoritative payment state.
DROP POLICY IF EXISTS tournament_registration_owner_insert ON public.tournament_registrations;

CREATE POLICY tournament_registration_owner_insert
ON public.tournament_registrations
FOR INSERT
TO authenticated
WITH CHECK (
  (
    "userId" = (SELECT auth.uid())::text
    OR "playerId" = (SELECT auth.uid())::text
  )
  AND coalesce("paymentStatus", 'pending') IN ('pending','review')
  AND coalesce(status, 'pending') IN ('pending','pending_review')
  AND nullif("geideaOrderId",'') IS NULL
  AND nullif("geideaTransactionId",'') IS NULL
  AND "geideaPaymentData" IS NULL
);

DO $
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.tournament_registrations'::regclass AND conname='tournament_registrations_payment_amount_nonnegative') THEN
    ALTER TABLE public.tournament_registrations
      ADD CONSTRAINT tournament_registrations_payment_amount_nonnegative
      CHECK ("paymentAmount" IS NULL OR "paymentAmount" >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.tournament_registrations'::regclass AND conname='tournament_registrations_total_amount_nonnegative') THEN
    ALTER TABLE public.tournament_registrations
      ADD CONSTRAINT tournament_registrations_total_amount_nonnegative
      CHECK ("totalAmount" IS NULL OR "totalAmount" >= 0);
  END IF;
END $;

-- Public private-session requests may be submitted without authentication,
-- but their numeric inputs must remain structurally valid.
DO $
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.private_sessions_requests'::regclass AND conname='private_sessions_requests_amount_nonnegative') THEN
    ALTER TABLE public.private_sessions_requests
      ADD CONSTRAINT private_sessions_requests_amount_nonnegative
      CHECK (amount IS NULL OR amount >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.private_sessions_requests'::regclass AND conname='private_sessions_requests_duration_positive') THEN
    ALTER TABLE public.private_sessions_requests
      ADD CONSTRAINT private_sessions_requests_duration_positive
      CHECK ("durationMinutes" IS NULL OR "durationMinutes" > 0);
  END IF;
END $;

-- Catalog and tournament monetary fields must never be negative.
DO $
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.inventory'::regclass AND conname='inventory_price_nonnegative') THEN
    ALTER TABLE public.inventory ADD CONSTRAINT inventory_price_nonnegative CHECK (price IS NULL OR price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.inventory'::regclass AND conname='inventory_original_price_nonnegative') THEN
    ALTER TABLE public.inventory ADD CONSTRAINT inventory_original_price_nonnegative CHECK (original_price IS NULL OR original_price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.dream_academy_categories'::regclass AND conname='dream_academy_categories_base_price_nonnegative') THEN
    ALTER TABLE public.dream_academy_categories ADD CONSTRAINT dream_academy_categories_base_price_nonnegative CHECK ("basePriceUSD" IS NULL OR "basePriceUSD" >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.tournament_team_regs'::regclass AND conname='tournament_team_regs_payment_amount_nonnegative') THEN
    ALTER TABLE public.tournament_team_regs ADD CONSTRAINT tournament_team_regs_payment_amount_nonnegative CHECK (payment_amount IS NULL OR payment_amount >= 0);
  END IF;
END $;

-- Tournament player lookups are team-centric; this table showed repeated
-- sequential scans and previously had only its primary-key index.
CREATE INDEX IF NOT EXISTS idx_tournament_players_team_id
  ON public.tournament_players (team_id);

-- Canonical player video policies.
DROP POLICY IF EXISTS "Players can insert own videos" ON public.player_videos;
DROP POLICY IF EXISTS "Players can update own pending videos" ON public.player_videos;
DROP POLICY IF EXISTS "Players can view own videos" ON public.player_videos;
DROP POLICY IF EXISTS "Public can view approved videos" ON public.player_videos;
DROP POLICY IF EXISTS player_video_owner_update ON public.player_videos;

CREATE POLICY player_video_owner_update
ON public.player_videos
FOR UPDATE
TO authenticated
USING (
  "playerId" = (SELECT auth.uid())::text
  AND status = 'pending'
)
WITH CHECK (
  "playerId" = (SELECT auth.uid())::text
  AND status = 'pending'
);

COMMIT;
