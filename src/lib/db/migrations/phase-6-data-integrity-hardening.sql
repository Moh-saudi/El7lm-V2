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

-- Legacy financial/subscription snapshots remain for historical compatibility,
-- but authenticated clients must not be able to rewrite them.
REVOKE UPDATE (
  "subscriptionStatus",
  "selectedPackage",
  "packageType",
  "subscriptionExpiresAt",
  "subscriptionEndDate",
  "lastPaymentId",
  "lastPaymentDate",
  "lastPaymentAmount",
  "lastPaymentMethod",
  subscription
) ON public.users FROM authenticated;

-- Authentication is owned by Supabase Auth. Legacy credential material must
-- never remain in public profile rows or be client-writable.
UPDATE public.users
SET
  "password" = NULL,
  "confirmPassword" = NULL,
  "tempPassword" = NULL
WHERE nullif("password",'') IS NOT NULL
   OR nullif("confirmPassword",'') IS NOT NULL
   OR nullif("tempPassword",'') IS NOT NULL;

REVOKE UPDATE ("password","confirmPassword","tempPassword")
  ON public.users FROM authenticated;

-- Preserve legacy admin primary keys for audit history while linking authority to Supabase Auth UUIDs.
UPDATE public.admins a
SET uid = au.id::text,
    "updatedAt" = now()
FROM auth.users au
WHERE NULLIF(a.uid,'') IS NULL
  AND a."isActive" IS DISTINCT FROM false
  AND au.email IS NOT NULL
  AND a.email IS NOT NULL
  AND LOWER(a.email) = LOWER(au.email)
  AND NOT EXISTS (
    SELECT 1
    FROM public.admins other
    WHERE other.id <> a.id
      AND other.uid = au.id::text
  );

-- Keep database RLS authority aligned with trusted admin id/uid identity resolution.
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $
  SELECT EXISTS (
    SELECT 1
    FROM public.admins a
    WHERE (a.id = (SELECT auth.uid())::text OR a.uid = (SELECT auth.uid())::text)
      AND COALESCE(a."isActive", true)
  );
$;

-- User creation is server-owned; authenticated clients must not create arbitrary compatibility rows.
DROP POLICY IF EXISTS users_insert_own ON public.users;
REVOKE INSERT ON TABLE public.users FROM authenticated;

-- Preserve historical email-based tournament reads, but never create new cross-account email aliases.
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
  AND (
    NULLIF("accountEmail",'') IS NULL
    OR LOWER("accountEmail") = LOWER((SELECT auth.jwt() ->> 'email'))
  )
  AND COALESCE("paymentStatus",'pending') IN ('pending','review')
  AND COALESCE(status,'pending') IN ('pending','pending_review')
  AND NULLIF("geideaOrderId",'') IS NULL
  AND NULLIF("geideaTransactionId",'') IS NULL
  AND "geideaPaymentData" IS NULL
);

-- Referral organization types are polymorphic but limited to supported account domains.
ALTER TABLE public.organization_referrals
  ADD CONSTRAINT organization_referrals_type_valid
  CHECK ("organizationType" IS NULL OR "organizationType" IN ('academy','agent','club','marketer','trainer'));

-- Subscription plan monetary values must remain nonnegative.
ALTER TABLE public.subscription_plans
  ADD CONSTRAINT subscription_plans_base_price_nonnegative
  CHECK (base_price IS NULL OR base_price >= 0),
  ADD CONSTRAINT subscription_plans_base_original_price_nonnegative
  CHECK (base_original_price IS NULL OR base_original_price >= 0);

-- Verification, moderation and staff authority state is server-owned.
REVOKE UPDATE ("isVerified") ON public.academies FROM authenticated;
REVOKE UPDATE ("isVerified") ON public.agents FROM authenticated;
REVOKE UPDATE ("isVerified") ON public.clubs FROM authenticated;
REVOKE UPDATE ("isVerified","verificationStatus") ON public.trainers FROM authenticated;
REVOKE UPDATE (status,"verificationStatus") ON public.players FROM authenticated;

REVOKE UPDATE ("emergencyAccess","lastEmergencyAccess",status)
  ON public.users FROM authenticated;
REVOKE UPDATE (
  "statusChangedBy","statusChangedAt",
  "suspensionReason","suspendedAt","suspensionEndDate",
  verified,"verificationStatus","verifiedAt","verifiedBy",
  "deletedBy","deletedAt"
) ON public.users FROM authenticated;
REVOKE UPDATE ("roleName",department,"allowedCountries")
  ON public.users FROM authenticated;

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


-- Tournament organizer identity and activation state are server-owned.
-- Clients may edit profile fields through RLS, but cannot relink or self-activate.
REVOKE UPDATE (supabase_auth_id, is_active, created_at)
  ON public.tournament_clients FROM authenticated;
REVOKE UPDATE (supabase_auth_id, is_active, created_at)
  ON public.tournament_clients FROM anon;

COMMIT;


-- Restrict interaction notification owners to read-state changes only.
-- Direct UPDATE is intentionally removed; the RPC verifies auth.uid() ownership.
DROP POLICY IF EXISTS interaction_owner_update ON public.interaction_notifications;
REVOKE UPDATE ON TABLE public.interaction_notifications FROM authenticated;

CREATE OR REPLACE FUNCTION public.mark_interaction_notification_read(p_notification_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.interaction_notifications
  SET "isRead" = true,
      "updatedAt" = now()
  WHERE id = p_notification_id
    AND (
      "profileOwnerId" = auth.uid()::text
      OR "userId" = auth.uid()::text
    );

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_interaction_notification_read(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_interaction_notification_read(text) TO authenticated;


-- Messages RLS: remove legacy permissive policies that bypass participant ownership.
DROP POLICY IF EXISTS "users_all_insert_messages" ON public.messages;
DROP POLICY IF EXISTS "users_all_select_messages" ON public.messages;


-- Notifications RLS: owners may mark their own notification read, not rewrite notification content.
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
REVOKE UPDATE ON public.notifications FROM authenticated;

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  affected integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  UPDATE public.notifications
     SET "read" = true,
         "isRead" = true,
         "updatedAt" = now()
   WHERE id = p_notification_id
     AND "userId" = auth.uid()::text;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_notification_read(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_notification_read(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(text) TO authenticated;


-- Messages RLS: receiver may mark a message read, not rewrite message content or participants.
DROP POLICY IF EXISTS "messages_update_participant" ON public.messages;
REVOKE UPDATE ON public.messages FROM authenticated;

CREATE OR REPLACE FUNCTION public.mark_message_read(p_message_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  affected integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  UPDATE public.messages
     SET "read" = true,
         "isRead" = true,
         "readAt" = COALESCE("readAt", now()),
         "updatedAt" = now()
   WHERE id = p_message_id
     AND "receiverId" = auth.uid()::text;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_message_read(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_message_read(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_message_read(text) TO authenticated;
