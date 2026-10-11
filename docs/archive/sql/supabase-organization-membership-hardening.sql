-- El7lm: secure organization invitations and player affiliation workflow.
-- Run once in the Supabase SQL Editor for project mjuaefipdzxfqazzbyke.
-- A player submits a request; only the target organization's authenticated
-- primary account can approve, reject, or release that player.

ALTER TABLE IF EXISTS public.players
  ADD COLUMN IF NOT EXISTS "organizationId" TEXT,
  ADD COLUMN IF NOT EXISTS "organizationType" TEXT,
  ADD COLUMN IF NOT EXISTS "organizationName" TEXT,
  ADD COLUMN IF NOT EXISTS organization_name TEXT,
  ADD COLUMN IF NOT EXISTS "referralCodeUsed" TEXT,
  ADD COLUMN IF NOT EXISTS "joinedViaReferral" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "joinedAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "joinRequestStatus" TEXT,
  ADD COLUMN IF NOT EXISTS approval_status TEXT;

ALTER TABLE IF EXISTS public.organization_referrals
  ADD COLUMN IF NOT EXISTS "expiresAt" TEXT,
  ADD COLUMN IF NOT EXISTS "maxUsage" INTEGER,
  ADD COLUMN IF NOT EXISTS "currentUsage" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_join_requests_player_status
  ON public.player_join_requests ("playerId", status);

CREATE INDEX IF NOT EXISTS idx_organization_referrals_active_code
  ON public.organization_referrals ("referralCode", "isActive");

-- Invitation codes belong to a primary organization account, never a player.
CREATE OR REPLACE FUNCTION public.validate_organization_referral_owner()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."organizationType" NOT IN ('club', 'academy', 'agent', 'trainer', 'marketer') THEN
    RAISE EXCEPTION 'INVITATION_OWNER_NOT_ALLOWED';
  END IF;
  IF NEW."organizationId" IS NULL
      OR NEW."organizationId" <> auth.uid()::text THEN
    RAISE EXCEPTION 'INVITATION_OWNER_MISMATCH';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_organization_referral_owner
  ON public.organization_referrals;
CREATE TRIGGER enforce_organization_referral_owner
BEFORE INSERT OR UPDATE OF "organizationId", "organizationType"
ON public.organization_referrals
FOR EACH ROW EXECUTE FUNCTION public.validate_organization_referral_owner();

CREATE OR REPLACE FUNCTION public.request_organization_join(p_referral_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_id TEXT := auth.uid()::text;
  v_code TEXT := upper(regexp_replace(trim(coalesce(p_referral_code, '')), '\s+', '', 'g'));
  v_ref public.organization_referrals%ROWTYPE;
  v_player public.players%ROWTYPE;
  v_player_json JSONB;
  v_player_id TEXT;
  v_existing_org TEXT;
  v_request_id TEXT;
BEGIN
  IF v_auth_id IS NULL OR v_auth_id = '' THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  IF v_code = '' THEN
    RAISE EXCEPTION 'INVALID_INVITATION_CODE';
  END IF;

  SELECT * INTO v_player
  FROM public.players p
  WHERE p.id = v_auth_id
     OR coalesce(to_jsonb(p)->>'uid', '') = v_auth_id
     OR coalesce(to_jsonb(p)->>'firebaseUid', '') = v_auth_id
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PLAYER_ACCOUNT_REQUIRED';
  END IF;

  v_player_json := to_jsonb(v_player);
  v_player_id := coalesce(v_player_json->>'id', v_auth_id);
  v_existing_org := coalesce(
    nullif(v_player_json->>'organizationId', ''),
    nullif(v_player_json->>'club_id', ''),
    nullif(v_player_json->>'academy_id', ''),
    nullif(v_player_json->>'trainer_id', ''),
    nullif(v_player_json->>'agent_id', '')
  );
  IF v_existing_org IS NOT NULL THEN
    RAISE EXCEPTION 'ALREADY_AFFILIATED';
  END IF;

  SELECT * INTO v_ref
  FROM public.organization_referrals r
  WHERE upper(coalesce(r."referralCode", '')) = v_code
    AND coalesce(r."isActive", true) = true
    AND (r."expiresAt" IS NULL OR trim(r."expiresAt"::text) = ''
      OR (r."expiresAt"::text)::timestamptz > now())
    AND (r."maxUsage" IS NULL
      OR coalesce(r."currentUsage", 0) < r."maxUsage")
  ORDER BY r."createdAt" DESC
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_INVITATION_CODE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.player_join_requests j
    WHERE j."playerId" = v_player_id
      AND j.status IN ('pending', 'approved')
  ) THEN
    RAISE EXCEPTION 'JOIN_REQUEST_ALREADY_PENDING';
  END IF;

  v_request_id := 'join_' || md5(clock_timestamp()::text || random()::text || v_player_id);
  INSERT INTO public.player_join_requests (
    id, "playerId", "playerName", "playerEmail", "playerPhone",
    "organizationId", "organizationType", "organizationName",
    "referralCode", "requestedAt", status, "playerData"
  ) VALUES (
    v_request_id,
    v_player_id,
    coalesce(v_player_json->>'full_name', v_player_json->>'name', 'New player'),
    coalesce(v_player_json->>'email', auth.jwt()->>'email', ''),
    coalesce(v_player_json->>'phone', auth.jwt()->>'phone', ''),
    v_ref."organizationId", v_ref."organizationType", v_ref."organizationName",
    v_ref."referralCode", now(), 'pending',
    jsonb_build_object('submitted_from', 'mobile')
  );

  UPDATE public.players
  SET "joinRequestStatus" = 'pending', approval_status = 'pending'
  WHERE id = v_player_id;

  RETURN jsonb_build_object(
    'ok', true,
    'requestId', v_request_id,
    'status', 'pending',
    'organizationName', v_ref."organizationName"
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_organization_join(p_player_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id TEXT := auth.uid()::text;
  v_request public.player_join_requests%ROWTYPE;
BEGIN
  IF v_org_id IS NULL OR v_org_id = '' THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  SELECT * INTO v_request
  FROM public.player_join_requests j
  WHERE j."playerId" = p_player_id
    AND j."organizationId" = v_org_id
    AND j.status = 'pending'
  ORDER BY j."requestedAt" DESC
  LIMIT 1
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'JOIN_REQUEST_NOT_FOUND'; END IF;

  UPDATE public.players
  SET "organizationId" = v_request."organizationId",
      "organizationType" = v_request."organizationType",
      "organizationName" = v_request."organizationName",
      organization_name = v_request."organizationName",
      "referralCodeUsed" = v_request."referralCode",
      "joinedViaReferral" = true,
      "joinedAt" = now(),
      "joinRequestStatus" = 'approved',
      approval_status = 'approved'
  WHERE id = v_request."playerId";

  UPDATE public.player_join_requests
  SET status = 'approved', "processedAt" = now(), "processedBy" = v_org_id
  WHERE id = v_request.id;

  UPDATE public.organization_referrals
  SET "currentUsage" = coalesce("currentUsage", 0) + 1,
      "updatedAt" = now()::text
  WHERE "organizationId" = v_org_id
    AND "referralCode" = v_request."referralCode";

  RETURN jsonb_build_object('ok', true, 'status', 'approved');
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_organization_join(p_player_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id TEXT := auth.uid()::text;
BEGIN
  IF v_org_id IS NULL OR v_org_id = '' THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  UPDATE public.player_join_requests
  SET status = 'rejected', "processedAt" = now(), "processedBy" = v_org_id
  WHERE id = (
    SELECT j.id FROM public.player_join_requests j
    WHERE j."playerId" = p_player_id
      AND j."organizationId" = v_org_id
      AND j.status = 'pending'
    ORDER BY j."requestedAt" DESC
    LIMIT 1
  );
  IF NOT FOUND THEN RAISE EXCEPTION 'JOIN_REQUEST_NOT_FOUND'; END IF;
  UPDATE public.players
  SET "joinRequestStatus" = 'rejected', approval_status = 'rejected'
  WHERE id = p_player_id;
  RETURN jsonb_build_object('ok', true, 'status', 'rejected');
END;
$$;

-- There is deliberately no player-side release function.
CREATE OR REPLACE FUNCTION public.release_player_from_organization(p_player_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id TEXT := auth.uid()::text;
BEGIN
  IF v_org_id IS NULL OR v_org_id = '' THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  UPDATE public.players
  SET "organizationId" = NULL, "organizationType" = NULL,
      "organizationName" = NULL, organization_name = NULL,
      "joinedViaReferral" = false, "joinedAt" = NULL,
      "joinRequestStatus" = 'released', approval_status = 'released'
  WHERE id = p_player_id AND "organizationId" = v_org_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'PLAYER_NOT_MANAGED_BY_ORGANIZATION'; END IF;
  UPDATE public.player_join_requests
  SET status = 'released', "processedAt" = now(), "processedBy" = v_org_id
  WHERE "playerId" = p_player_id
    AND "organizationId" = v_org_id
    AND status = 'approved';
  RETURN jsonb_build_object('ok', true, 'status', 'released');
END;
$$;

REVOKE ALL ON FUNCTION public.request_organization_join(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_organization_join(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_organization_join(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_player_from_organization(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_organization_join(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_organization_join(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_organization_join(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_player_from_organization(TEXT) TO authenticated;
