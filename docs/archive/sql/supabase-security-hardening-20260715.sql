-- Emergency Supabase security hardening for project mjuaefipdzxfqazzbyke.
-- Enables RLS on every exposed table reported by the security advisor,
-- replaces broad grants with least-privilege grants, and fixes unsafe views.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins a
    where a.id = (select auth.uid())::text
      and coalesce(a."isActive", true)
  );
$$;

revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

-- Enable RLS and remove the blanket privileges that were granted to the API roles.
do $$
declare
  table_name text;
  exposed_tables text[] := array[
    'academys','admin_notifications','admins','analytics_visits','backup_otps',
    'broadcasts','bulkPayments','bulk_payments','careerApplications',
    'careers_applications','cities','countries','customers','dream_academy_stats',
    'email_logs','employee_activities','geidea_settings','instapay',
    'interaction_notifications','otp_verifications','otps','partners',
    'passwordResetTokens','payment_action_logs','payment_results','payment_settings',
    'player_action_logs','player_notifications','player_stats',
    'private_sessions_requests','promotional_offers','proofs','real-time-stats',
    'real-time-updates','receipts','roles','security_logs','smart_notifications',
    'subscription_plans','support_conversations','support_messages',
    'support_notifications','system_configs','test','tournamentRegistrations',
    'tournament_payments','video_action_logs','vodafone_cash','wallet',
    'whatsappMessages','whatsappNumbers'
  ];
begin
  foreach table_name in array exposed_tables loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all privileges on table public.%I from anon, authenticated', table_name);
  end loop;
end;
$$;

-- Admin access is checked against the authenticated user's own row in public.admins.
do $$
declare
  table_name text;
  admin_tables text[] := array[
    'academys','admin_notifications','admins','analytics_visits','broadcasts',
    'bulkPayments','bulk_payments','careerApplications','careers_applications',
    'cities','countries','customers','dream_academy_stats','email_logs',
    'employee_activities','geidea_settings','instapay','interaction_notifications',
    'partners','payment_action_logs','payment_results','payment_settings',
    'player_action_logs','player_notifications','player_stats',
    'private_sessions_requests','promotional_offers','proofs','real-time-stats',
    'real-time-updates','receipts','roles','security_logs','smart_notifications',
    'subscription_plans','support_conversations','support_messages',
    'support_notifications','system_configs','tournamentRegistrations',
    'tournament_payments','video_action_logs','vodafone_cash','wallet',
    'whatsappMessages','whatsappNumbers'
  ];
begin
  foreach table_name in array admin_tables loop
    execute format('drop policy if exists admin_full_access on public.%I', table_name);
    execute format(
      'create policy admin_full_access on public.%I for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))',
      table_name
    );
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
  end loop;
end;
$$;

-- Server-only security material: service_role keeps access and bypasses RLS.
-- No anon/authenticated policies or grants are intentionally created.
drop policy if exists client_access_denied on public.backup_otps;
drop policy if exists client_access_denied on public.otp_verifications;
drop policy if exists client_access_denied on public.otps;
drop policy if exists client_access_denied on public."passwordResetTokens";
drop policy if exists client_access_denied on public.test;

-- Public reference data is read-only.
drop policy if exists public_read on public.cities;
create policy public_read on public.cities for select to anon, authenticated
using (coalesce("isActive", true));

drop policy if exists public_read on public.countries;
create policy public_read on public.countries for select to anon, authenticated
using (coalesce("isActive", true));

drop policy if exists public_read on public.dream_academy_stats;
create policy public_read on public.dream_academy_stats for select to anon, authenticated using (true);

drop policy if exists public_read on public.player_stats;
create policy public_read on public.player_stats for select to anon, authenticated using (true);

drop policy if exists public_read on public.payment_settings;
create policy public_read on public.payment_settings for select to anon, authenticated using (true);

drop policy if exists public_read on public."real-time-stats";
create policy public_read on public."real-time-stats" for select to anon, authenticated using (true);

drop policy if exists public_read on public.subscription_plans;
create policy public_read on public.subscription_plans for select to anon, authenticated
using (coalesce("isActive", true));

drop policy if exists public_read on public.partners;
create policy public_read on public.partners for select to anon, authenticated
using (coalesce("isPublic", false));

drop policy if exists public_read on public.promotional_offers;
create policy public_read on public.promotional_offers for select to anon, authenticated
using (coalesce("isActive", false));

grant select on public.cities, public.countries, public.dream_academy_stats,
  public.player_stats, public.payment_settings, public."real-time-stats",
  public.subscription_plans, public.partners, public.promotional_offers
to anon, authenticated;

-- Anonymous intake tables: callers can submit but can never list submissions.
drop policy if exists public_insert on public.analytics_visits;
create policy public_insert on public.analytics_visits for insert to anon, authenticated
with check (true);

drop policy if exists public_insert on public."careerApplications";
create policy public_insert on public."careerApplications" for insert to anon, authenticated
with check (coalesce(status, 'pending') in ('pending', 'new'));

drop policy if exists public_insert on public.careers_applications;
create policy public_insert on public.careers_applications for insert to anon, authenticated
with check (true);

drop policy if exists public_insert on public.private_sessions_requests;
create policy public_insert on public.private_sessions_requests for insert to anon, authenticated
with check (coalesce("paymentStatus", 'pending') in ('pending', 'unpaid'));

drop policy if exists public_insert on public.security_logs;
create policy public_insert on public.security_logs for insert to anon, authenticated
with check (true);

drop policy if exists public_insert on public.video_action_logs;
create policy public_insert on public.video_action_logs for insert to anon, authenticated
with check (true);

grant insert on public.analytics_visits, public."careerApplications",
  public.careers_applications, public.private_sessions_requests,
  public.security_logs, public.video_action_logs
to anon, authenticated;

-- Authenticated broadcast feed.
drop policy if exists authenticated_read on public.broadcasts;
create policy authenticated_read on public.broadcasts for select to authenticated using (true);
grant select on public.broadcasts to authenticated;

-- Admin users can only discover their own admin row before is_admin() grants wider access.
drop policy if exists admins_select_auth on public.admins;
drop policy if exists admins_select_self on public.admins;
create policy admins_select_self on public.admins for select to authenticated
using (id = (select auth.uid())::text);

-- Legacy academy account table: owner-only, never publicly enumerable.
drop policy if exists academy_owner_select on public.academys;
create policy academy_owner_select on public.academys for select to authenticated
using (id = (select auth.uid())::text or uid = (select auth.uid())::text);
drop policy if exists academy_owner_insert on public.academys;
create policy academy_owner_insert on public.academys for insert to authenticated
with check (id = (select auth.uid())::text or uid = (select auth.uid())::text);
drop policy if exists academy_owner_update on public.academys;
create policy academy_owner_update on public.academys for update to authenticated
using (id = (select auth.uid())::text or uid = (select auth.uid())::text)
with check (id = (select auth.uid())::text or uid = (select auth.uid())::text);

-- User-owned payment and receipt rows.
do $$
declare
  table_name text;
  owner_tables text[] := array[
    'bulkPayments','bulk_payments','instapay','proofs','receipts',
    'tournament_payments','vodafone_cash','wallet'
  ];
begin
  foreach table_name in array owner_tables loop
    execute format('drop policy if exists owner_select on public.%I', table_name);
    execute format(
      'create policy owner_select on public.%I for select to authenticated using ("userId" = (select auth.uid())::text)',
      table_name
    );
    execute format('drop policy if exists owner_insert on public.%I', table_name);
    execute format(
      'create policy owner_insert on public.%I for insert to authenticated with check ("userId" = (select auth.uid())::text)',
      table_name
    );
    execute format('grant select, insert on table public.%I to authenticated', table_name);
  end loop;
end;
$$;

-- Player notifications are visible and markable only by their owner.
drop policy if exists player_notification_owner_select on public.player_notifications;
create policy player_notification_owner_select on public.player_notifications for select to authenticated
using ("playerId" = (select auth.uid())::text);
drop policy if exists player_notification_owner_update on public.player_notifications;
create policy player_notification_owner_update on public.player_notifications for update to authenticated
using ("playerId" = (select auth.uid())::text)
with check ("playerId" = (select auth.uid())::text);
grant select, update on public.player_notifications to authenticated;

-- Action logs can be submitted by the acting user but are never readable by clients.
drop policy if exists actor_insert on public.player_action_logs;
create policy actor_insert on public.player_action_logs for insert to authenticated
with check ("actionBy" = (select auth.uid())::text);
grant insert on public.player_action_logs to authenticated;

-- Interaction notifications: recipient reads/updates; actor may create the event.
drop policy if exists interaction_notif_select_own on public.interaction_notifications;
drop policy if exists interaction_owner_select on public.interaction_notifications;
create policy interaction_owner_select on public.interaction_notifications for select to authenticated
using ("profileOwnerId" = (select auth.uid())::text or "userId" = (select auth.uid())::text);
drop policy if exists interaction_owner_update on public.interaction_notifications;
create policy interaction_owner_update on public.interaction_notifications for update to authenticated
using ("profileOwnerId" = (select auth.uid())::text or "userId" = (select auth.uid())::text)
with check ("profileOwnerId" = (select auth.uid())::text or "userId" = (select auth.uid())::text);
drop policy if exists interaction_actor_insert on public.interaction_notifications;
create policy interaction_actor_insert on public.interaction_notifications for insert to authenticated
with check ("viewerId" = (select auth.uid())::text);
grant select, insert, update on public.interaction_notifications to authenticated;

-- Smart notifications: only the recipient can access or alter a row.
drop policy if exists smart_notif_select_own on public.smart_notifications;
drop policy if exists smart_owner_select on public.smart_notifications;
create policy smart_owner_select on public.smart_notifications for select to authenticated
using ("userId" = (select auth.uid())::text);
drop policy if exists smart_owner_insert on public.smart_notifications;
create policy smart_owner_insert on public.smart_notifications for insert to authenticated
with check ("userId" = (select auth.uid())::text);
drop policy if exists smart_owner_update on public.smart_notifications;
create policy smart_owner_update on public.smart_notifications for update to authenticated
using ("userId" = (select auth.uid())::text)
with check ("userId" = (select auth.uid())::text);
drop policy if exists smart_owner_delete on public.smart_notifications;
create policy smart_owner_delete on public.smart_notifications for delete to authenticated
using ("userId" = (select auth.uid())::text);
grant select, insert, update, delete on public.smart_notifications to authenticated;

-- Support conversations and their messages are isolated by conversation ownership.
drop policy if exists support_owner_select on public.support_conversations;
create policy support_owner_select on public.support_conversations for select to authenticated
using ("userId" = (select auth.uid())::text);
drop policy if exists support_owner_insert on public.support_conversations;
create policy support_owner_insert on public.support_conversations for insert to authenticated
with check ("userId" = (select auth.uid())::text);
drop policy if exists support_owner_update on public.support_conversations;
create policy support_owner_update on public.support_conversations for update to authenticated
using ("userId" = (select auth.uid())::text)
with check ("userId" = (select auth.uid())::text);
grant select, insert, update on public.support_conversations to authenticated;

drop policy if exists support_message_owner_select on public.support_messages;
create policy support_message_owner_select on public.support_messages for select to authenticated
using (exists (
  select 1 from public.support_conversations c
  where c.id = "conversationId" and c."userId" = (select auth.uid())::text
));
drop policy if exists support_message_owner_insert on public.support_messages;
create policy support_message_owner_insert on public.support_messages for insert to authenticated
with check (
  "senderId" in ((select auth.uid())::text, 'system')
  and exists (
    select 1 from public.support_conversations c
    where c.id = "conversationId" and c."userId" = (select auth.uid())::text
  )
);
drop policy if exists support_message_owner_update on public.support_messages;
create policy support_message_owner_update on public.support_messages for update to authenticated
using (exists (
  select 1 from public.support_conversations c
  where c.id = "conversationId" and c."userId" = (select auth.uid())::text
))
with check (exists (
  select 1 from public.support_conversations c
  where c.id = "conversationId" and c."userId" = (select auth.uid())::text
));
grant select, insert, update on public.support_messages to authenticated;

-- Tournament registrations: owner by creator UID or verified Auth email.
drop policy if exists tournament_registration_owner_select on public."tournamentRegistrations";
create policy tournament_registration_owner_select on public."tournamentRegistrations" for select to authenticated
using (
  "createdBy" = (select auth.uid())::text
  or "accountEmail" = (select auth.jwt() ->> 'email')
);
drop policy if exists tournament_registration_owner_insert on public."tournamentRegistrations";
create policy tournament_registration_owner_insert on public."tournamentRegistrations" for insert to authenticated
with check ("createdBy" = (select auth.uid())::text);
grant select, insert on public."tournamentRegistrations" to authenticated;

-- Search views are server-only and must obey the invoker's permissions.
alter view public.v_players_search set (security_invoker = true);
alter view public.v_clubs_search set (security_invoker = true);
alter view public.v_academies_search set (security_invoker = true);
alter view public.v_trainers_search set (security_invoker = true);
revoke all privileges on table public.v_players_search, public.v_clubs_search,
  public.v_academies_search, public.v_trainers_search
from anon, authenticated;

commit;
