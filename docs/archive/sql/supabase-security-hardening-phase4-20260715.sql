-- Phase 4: remove unrestricted API inserts while preserving required app flows.

-- Analytics is written by the server-side service-role API route.
drop policy if exists analytics_insert on public.analytics;
revoke insert on public.analytics from anon, authenticated;

-- No application code writes directly to this legacy analytics table.
drop policy if exists public_insert on public.analytics_visits;
revoke insert on public.analytics_visits from anon, authenticated;

-- Careers submissions use the protected server-side API and career_applications.
drop policy if exists public_insert on public.careers_applications;
revoke insert on public.careers_applications from anon, authenticated;

-- The login page records pre-authentication security events. Validate the payload
-- shape and bound attacker-controlled strings instead of accepting arbitrary rows.
drop policy if exists public_insert on public.security_logs;
create policy security_logs_insert_validated on public.security_logs
  for insert to anon, authenticated
  with check (
    id is not null
    and event is not null
    and length(event) between 1 and 120
    and (details is null or jsonb_typeof(details) = 'object')
    and (environment is null or length(environment) <= 32)
    and (timestamp is null or timestamp between now() - interval '1 day' and now() + interval '10 minutes')
  );

-- Video interactions are user-owned. Administrators retain full access through
-- the separate admin_full_access policy.
drop policy if exists public_insert on public.video_action_logs;
revoke all privileges on public.video_action_logs from anon, authenticated;
grant select, insert, delete on public.video_action_logs to authenticated;

create policy video_action_logs_select_own on public.video_action_logs
  for select to authenticated
  using ("playerId" = (select auth.uid())::text);

create policy video_action_logs_insert_own on public.video_action_logs
  for insert to authenticated
  with check (
    "playerId" = (select auth.uid())::text
    and action is not null
    and length(action) between 1 and 64
  );

create policy video_action_logs_delete_own on public.video_action_logs
  for delete to authenticated
  using ("playerId" = (select auth.uid())::text);
