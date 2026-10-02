-- Resolve organization account IDs from the authenticated UID before
-- approving, rejecting, or releasing player organization membership.

create or replace function public.approve_organization_join(p_player_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_auth_id text := auth.uid()::text;
  v_org_id text;
  v_request public.player_join_requests%rowtype;
begin
  if v_auth_id is null or v_auth_id = '' then
    raise exception 'AUTH_REQUIRED';
  end if;

  select case when count(*) = 1 then min(id) else null end
    into v_org_id
  from (
    select id::text as id from public.clubs where id::text = v_auth_id or uid::text = v_auth_id
    union
    select id::text from public.academies where id::text = v_auth_id or uid::text = v_auth_id
    union
    select id::text from public.agents where id::text = v_auth_id or uid::text = v_auth_id
    union
    select id::text from public.trainers where id::text = v_auth_id or uid::text = v_auth_id
    union
    select id::text from public.marketers where id::text = v_auth_id or uid::text = v_auth_id
  ) resolved;

  if v_org_id is null or v_org_id = '' then
    raise exception 'ORGANIZATION_ACCOUNT_REQUIRED';
  end if;

  select *
    into v_request
  from public.player_join_requests j
  where j."playerId" = p_player_id
    and j."organizationId" = v_org_id
    and j.status = 'pending'
  order by j."requestedAt" desc
  limit 1
  for update;

  if not found then
    raise exception 'JOIN_REQUEST_NOT_FOUND';
  end if;

  update public.players
  set "organizationId" = v_request."organizationId",
      "organizationType" = v_request."organizationType",
      "organizationName" = v_request."organizationName",
      organization_name = v_request."organizationName",
      "referralCodeUsed" = v_request."referralCode",
      "joinedViaReferral" = true,
      "joinedAt" = now(),
      "joinRequestStatus" = 'approved',
      approval_status = 'approved'
  where id = v_request."playerId";

  update public.player_join_requests
  set status = 'approved',
      "processedAt" = now(),
      "processedBy" = v_auth_id
  where id = v_request.id;

  update public.organization_referrals
  set "currentUsage" = coalesce("currentUsage", 0) + 1,
      "updatedAt" = now()::text
  where "organizationId" = v_org_id
    and "referralCode" = v_request."referralCode";

  return jsonb_build_object('ok', true, 'status', 'approved');
end;
$function$;

create or replace function public.reject_organization_join(p_player_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_auth_id text := auth.uid()::text;
  v_org_id text;
begin
  if v_auth_id is null or v_auth_id = '' then
    raise exception 'AUTH_REQUIRED';
  end if;

  select case when count(*) = 1 then min(id) else null end
    into v_org_id
  from (
    select id::text as id from public.clubs where id::text = v_auth_id or uid::text = v_auth_id
    union
    select id::text from public.academies where id::text = v_auth_id or uid::text = v_auth_id
    union
    select id::text from public.agents where id::text = v_auth_id or uid::text = v_auth_id
    union
    select id::text from public.trainers where id::text = v_auth_id or uid::text = v_auth_id
    union
    select id::text from public.marketers where id::text = v_auth_id or uid::text = v_auth_id
  ) resolved;

  if v_org_id is null or v_org_id = '' then
    raise exception 'ORGANIZATION_ACCOUNT_REQUIRED';
  end if;

  update public.player_join_requests
  set status = 'rejected',
      "processedAt" = now(),
      "processedBy" = v_auth_id
  where id = (
    select j.id
    from public.player_join_requests j
    where j."playerId" = p_player_id
      and j."organizationId" = v_org_id
      and j.status = 'pending'
    order by j."requestedAt" desc
    limit 1
  );

  if not found then
    raise exception 'JOIN_REQUEST_NOT_FOUND';
  end if;

  update public.players
  set "joinRequestStatus" = 'rejected',
      approval_status = 'rejected'
  where id = p_player_id;

  return jsonb_build_object('ok', true, 'status', 'rejected');
end;
$function$;

create or replace function public.release_player_from_organization(p_player_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_auth_id text := auth.uid()::text;
  v_org_id text;
begin
  if v_auth_id is null or v_auth_id = '' then
    raise exception 'AUTH_REQUIRED';
  end if;

  select case when count(*) = 1 then min(id) else null end
    into v_org_id
  from (
    select id::text as id from public.clubs where id::text = v_auth_id or uid::text = v_auth_id
    union
    select id::text from public.academies where id::text = v_auth_id or uid::text = v_auth_id
    union
    select id::text from public.agents where id::text = v_auth_id or uid::text = v_auth_id
    union
    select id::text from public.trainers where id::text = v_auth_id or uid::text = v_auth_id
    union
    select id::text from public.marketers where id::text = v_auth_id or uid::text = v_auth_id
  ) resolved;

  if v_org_id is null or v_org_id = '' then
    raise exception 'ORGANIZATION_ACCOUNT_REQUIRED';
  end if;

  update public.players
  set "organizationId" = null,
      "organizationType" = null,
      "organizationName" = null,
      organization_name = null,
      "joinedViaReferral" = false,
      "joinedAt" = null,
      "joinRequestStatus" = 'released',
      approval_status = 'released'
  where id = p_player_id
    and "organizationId" = v_org_id;

  if not found then
    raise exception 'PLAYER_NOT_MANAGED_BY_ORGANIZATION';
  end if;

  update public.player_join_requests
  set status = 'released',
      "processedAt" = now(),
      "processedBy" = v_auth_id
  where "playerId" = p_player_id
    and "organizationId" = v_org_id
    and status = 'approved';

  return jsonb_build_object('ok', true, 'status', 'released');
end;
$function$;
