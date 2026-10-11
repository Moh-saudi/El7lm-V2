-- Phase 2: remove legacy allow-all policies and dangerous API grants.

begin;

-- RLS does not protect TRUNCATE. API roles never need these privileges.
do $$
declare
  table_name text;
begin
  for table_name in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    execute format(
      'revoke truncate, trigger, references on table public.%I from anon, authenticated',
      table_name
    );
  end loop;
end;
$$;

-- This event-trigger function is internal and must not be callable by API roles.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

-- Fix mutable search paths without breaking unqualified table references.
create or replace function public.increment_video_views(video_id text)
returns void
language sql
set search_path = ''
as $$
  update public.player_videos set views = views + 1 where id = video_id;
$$;

create or replace function public.increment_video_likes(video_id text)
returns void
language sql
set search_path = ''
as $$
  update public.player_videos set likes = likes + 1 where id = video_id;
$$;

create or replace function public.decrement_video_likes(video_id text)
returns void
language sql
set search_path = ''
as $$
  update public.player_videos set likes = greatest(likes - 1, 0) where id = video_id;
$$;

create or replace function public.update_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Remove every legacy allow-all policy that exposed private data or writes.
drop policy if exists academies_all on public.academies;
drop policy if exists admin_logs_all on public."adminLogs";
drop policy if exists ads_all on public.ads;
drop policy if exists agents_all on public.agents;
drop policy if exists analytics_all on public.analytics;
drop policy if exists campaign_logs_all on public.campaign_logs;
drop policy if exists career_apps_all on public.career_applications;
drop policy if exists clubs_all on public.clubs;
drop policy if exists content_all on public.content;
drop policy if exists conversations_all on public.conversations;
drop policy if exists dream_cats_all on public.dream_academy_categories;
drop policy if exists dream_src_all on public.dream_academy_sources;
drop policy if exists employees_all on public.employees;
drop policy if exists geidea_all on public.geidea_payments;
drop policy if exists invite_codes_all on public.invite_codes;
drop policy if exists invoices_all on public.invoices;
drop policy if exists join_notifs_all on public.join_request_notifications;
drop policy if exists marketers_all on public.marketers;
drop policy if exists messages_all on public.messages;
drop policy if exists notifications_all on public.notifications;
drop policy if exists opportunities_all on public.opportunities;
drop policy if exists opp_apps_all on public.opportunity_applications;
drop policy if exists org_referrals_all on public.organization_referrals;
drop policy if exists otp_codes_all on public.otp_codes;
drop policy if exists reset_tokens_all on public.password_reset_tokens;
drop policy if exists payments_all on public.payments;
drop policy if exists join_requests_all on public.player_join_requests;
drop policy if exists player_rewards_all on public.player_rewards;
drop policy if exists players_all on public.players;
drop policy if exists point_transactions_all on public.point_transactions;
drop policy if exists referrals_all on public.referrals;
drop policy if exists settings_all on public.settings;
drop policy if exists subscriptions_all on public.subscriptions;
drop policy if exists tournament_reg_all on public.tournament_registrations;
drop policy if exists tournaments_all on public.tournaments;
drop policy if exists trainers_all on public.trainers;
drop policy if exists users_all on public.users;
drop policy if exists videos_all on public.videos;

-- Remove policies that claim to be admin-only but only check authentication.
drop policy if exists inventory_delete_admin_only on public.inventory;
drop policy if exists inventory_insert_admin_only on public.inventory;
drop policy if exists inventory_update_admin_only on public.inventory;
drop policy if exists inventory_select_authenticated on public.inventory;
drop policy if exists gallery_auth_write on public.tournament_gallery;
drop policy if exists refs_auth_write on public.tournament_referees;
drop policy if exists sponsors_auth_write on public.tournament_sponsors;
drop policy if exists venues_auth_write on public.tournament_venues;

-- Reset privileges on the tables hardened in this phase.
do $$
declare
  table_name text;
  hardened_tables text[] := array[
    'academies','adminLogs','ads','agents','analytics','campaign_logs',
    'career_applications','clubs','content','conversations',
    'dream_academy_categories','dream_academy_sources','employees',
    'geidea_payments','inventory','invite_codes','invoices',
    'join_request_notifications','marketers','messages','notifications',
    'opportunities','opportunity_applications','organization_referrals',
    'otp_codes','password_reset_tokens','payments','player_join_requests',
    'player_rewards','player_videos','players','point_transactions','referrals',
    'settings','subscriptions','tournament_gallery','tournament_referees',
    'tournament_registrations','tournament_sponsors','tournament_venues',
    'tournaments','trainers','users','videos'
  ];
begin
  foreach table_name in array hardened_tables loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all privileges on table public.%I from anon, authenticated', table_name);
  end loop;
end;
$$;

-- Admins retain full management access through the trusted private helper.
do $$
declare
  table_name text;
  admin_tables text[] := array[
    'academies','adminLogs','ads','agents','analytics','campaign_logs',
    'career_applications','clubs','content','conversations',
    'dream_academy_categories','dream_academy_sources','employees',
    'geidea_payments','inventory','invite_codes','invoices',
    'join_request_notifications','marketers','messages','notifications',
    'opportunities','opportunity_applications','organization_referrals',
    'payments','player_join_requests','player_rewards','player_videos','players',
    'point_transactions','referrals','settings','subscriptions',
    'tournament_gallery','tournament_referees','tournament_registrations',
    'tournament_sponsors','tournament_venues','tournaments','trainers','users','videos'
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

-- OTP and password-reset material is server-only.
drop policy if exists otp_deny_client on public.otp_codes;
drop policy if exists pwd_reset_deny_client on public.password_reset_tokens;

-- Public read-only platform content.
drop policy if exists public_active_read on public.ads;
create policy public_active_read on public.ads for select to anon, authenticated
using (coalesce("isActive", false));

drop policy if exists public_read on public.content;
create policy public_read on public.content for select to anon, authenticated using (true);

drop policy if exists public_active_read on public.dream_academy_categories;
create policy public_active_read on public.dream_academy_categories for select to anon, authenticated
using (coalesce("isActive", false));

drop policy if exists public_active_read on public.dream_academy_sources;
create policy public_active_read on public.dream_academy_sources for select to anon, authenticated
using (coalesce("isActive", false));

drop policy if exists public_read on public.inventory;
create policy public_read on public.inventory for select to anon, authenticated using (true);

drop policy if exists public_read on public.settings;
create policy public_read on public.settings for select to anon, authenticated using (true);

drop policy if exists public_active_read on public.opportunities;
create policy public_active_read on public.opportunities for select to anon, authenticated
using (coalesce("isActive", false));

drop policy if exists public_read on public.tournaments;
create policy public_read on public.tournaments for select to anon, authenticated using (true);

drop policy if exists gallery_public_read on public.tournament_gallery;
create policy gallery_public_read on public.tournament_gallery for select to anon, authenticated using (true);
drop policy if exists sponsors_public_read on public.tournament_sponsors;
create policy sponsors_public_read on public.tournament_sponsors for select to anon, authenticated using (true);
drop policy if exists venues_public_read on public.tournament_venues;
create policy venues_public_read on public.tournament_venues for select to anon, authenticated using (true);

grant select on public.ads, public.content, public.dream_academy_categories,
  public.dream_academy_sources, public.inventory, public.settings,
  public.opportunities, public.tournaments, public.tournament_gallery,
  public.tournament_sponsors, public.tournament_venues
to anon, authenticated;

-- Referees include phone numbers and are admin-only.
drop policy if exists refs_public_read on public.tournament_referees;

-- Directory entities can be read by signed-in users; only the owner can create/update.
do $$
declare
  table_name text;
  entity_tables text[] := array['academies','agents','clubs','marketers','players','trainers'];
begin
  foreach table_name in array entity_tables loop
    execute format('drop policy if exists directory_authenticated_read on public.%I', table_name);
    execute format(
      'create policy directory_authenticated_read on public.%I for select to authenticated using (true)',
      table_name
    );
    execute format('drop policy if exists entity_owner_insert on public.%I', table_name);
    execute format(
      'create policy entity_owner_insert on public.%I for insert to authenticated with check (id = (select auth.uid())::text or uid = (select auth.uid())::text)',
      table_name
    );
    execute format('drop policy if exists entity_owner_update on public.%I', table_name);
    execute format(
      'create policy entity_owner_update on public.%I for update to authenticated using (id = (select auth.uid())::text or uid = (select auth.uid())::text) with check (id = (select auth.uid())::text or uid = (select auth.uid())::text)',
      table_name
    );
    execute format('grant select, insert, update on table public.%I to authenticated', table_name);
  end loop;
end;
$$;

-- The catch-all users table contains private fields and is owner-only.
drop policy if exists users_select_auth on public.users;
drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users for select to authenticated
using (id = (select auth.uid())::text or uid = (select auth.uid())::text);
drop policy if exists users_insert_own on public.users;
create policy users_insert_own on public.users for insert to authenticated
with check (id = (select auth.uid())::text or uid = (select auth.uid())::text);
drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users for update to authenticated
using (id = (select auth.uid())::text or uid = (select auth.uid())::text)
with check (id = (select auth.uid())::text or uid = (select auth.uid())::text);
grant select, insert, update on public.users to authenticated;

-- Employee can see their own record; admin manages all employees.
drop policy if exists employee_self_read on public.employees;
create policy employee_self_read on public.employees for select to authenticated
using (
  id = (select auth.uid())::text
  or uid = (select auth.uid())::text
  or "authUserId" = (select auth.uid())::text
);
grant select on public.employees to authenticated;

-- Analytics and job applications accept submissions but cannot be listed publicly.
drop policy if exists analytics_insert on public.analytics;
create policy analytics_insert on public.analytics for insert to anon, authenticated with check (true);
grant insert on public.analytics to anon, authenticated;

drop policy if exists career_application_insert on public.career_applications;
create policy career_application_insert on public.career_applications for insert to anon, authenticated
with check (coalesce(status, 'pending') in ('pending', 'new'));
grant insert on public.career_applications to anon, authenticated;

-- Direct messages are visible only to sender/receiver.
drop policy if exists messages_select_participant on public.messages;
create policy messages_select_participant on public.messages for select to authenticated
using ("senderId" = (select auth.uid())::text or "receiverId" = (select auth.uid())::text);
drop policy if exists messages_insert_sender on public.messages;
create policy messages_insert_sender on public.messages for insert to authenticated
with check ("senderId" = (select auth.uid())::text);
drop policy if exists messages_update_participant on public.messages;
create policy messages_update_participant on public.messages for update to authenticated
using ("senderId" = (select auth.uid())::text or "receiverId" = (select auth.uid())::text)
with check ("senderId" = (select auth.uid())::text or "receiverId" = (select auth.uid())::text);
drop policy if exists messages_delete_sender on public.messages;
create policy messages_delete_sender on public.messages for delete to authenticated
using ("senderId" = (select auth.uid())::text);
grant select, insert, update, delete on public.messages to authenticated;

-- Conversation list is isolated to JSONB participants.
drop policy if exists conversation_participant_select on public.conversations;
create policy conversation_participant_select on public.conversations for select to authenticated
using (participants ? (select auth.uid())::text);
drop policy if exists conversation_participant_insert on public.conversations;
create policy conversation_participant_insert on public.conversations for insert to authenticated
with check (participants ? (select auth.uid())::text);
drop policy if exists conversation_participant_update on public.conversations;
create policy conversation_participant_update on public.conversations for update to authenticated
using (participants ? (select auth.uid())::text)
with check (participants ? (select auth.uid())::text);
grant select, insert, update on public.conversations to authenticated;

-- Notifications are isolated to their recipient; sender may create one.
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications for select to authenticated
using ("userId" = (select auth.uid())::text);
drop policy if exists notifications_insert_sender on public.notifications;
create policy notifications_insert_sender on public.notifications for insert to authenticated
with check (
  "senderId" = (select auth.uid())::text
  or "userId" = (select auth.uid())::text
);
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update to authenticated
using ("userId" = (select auth.uid())::text)
with check ("userId" = (select auth.uid())::text);
drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own on public.notifications for delete to authenticated
using ("userId" = (select auth.uid())::text);
grant select, insert, update, delete on public.notifications to authenticated;

-- Financial rows are visible to their owner; creation only, status changes stay server/admin-side.
drop policy if exists invoice_owner_select on public.invoices;
create policy invoice_owner_select on public.invoices for select to authenticated
using (coalesce("userId", user_id) = (select auth.uid())::text);
drop policy if exists invoice_owner_insert on public.invoices;
create policy invoice_owner_insert on public.invoices for insert to authenticated
with check (coalesce("userId", user_id) = (select auth.uid())::text);
drop policy if exists invoice_owner_update on public.invoices;
create policy invoice_owner_update on public.invoices for update to authenticated
using (coalesce("userId", user_id) = (select auth.uid())::text)
with check (coalesce("userId", user_id) = (select auth.uid())::text);
grant select, insert, update on public.invoices to authenticated;

drop policy if exists payment_owner_select on public.payments;
create policy payment_owner_select on public.payments for select to authenticated
using ("userId" = (select auth.uid())::text or "playerId" = (select auth.uid())::text);
drop policy if exists payment_owner_insert on public.payments;
create policy payment_owner_insert on public.payments for insert to authenticated
with check ("userId" = (select auth.uid())::text or "playerId" = (select auth.uid())::text);
grant select, insert on public.payments to authenticated;

drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions for select to authenticated
using (coalesce("userId", user_id) = (select auth.uid())::text);
grant select on public.subscriptions to authenticated;

-- Opportunities: organizer manages listings; applicants own applications.
drop policy if exists opportunity_organizer_insert on public.opportunities;
create policy opportunity_organizer_insert on public.opportunities for insert to authenticated
with check ("organizerId" = (select auth.uid())::text);
drop policy if exists opportunity_organizer_update on public.opportunities;
create policy opportunity_organizer_update on public.opportunities for update to authenticated
using ("organizerId" = (select auth.uid())::text)
with check ("organizerId" = (select auth.uid())::text);
drop policy if exists opportunity_organizer_delete on public.opportunities;
create policy opportunity_organizer_delete on public.opportunities for delete to authenticated
using ("organizerId" = (select auth.uid())::text);
grant insert, update, delete on public.opportunities to authenticated;

drop policy if exists application_participant_select on public.opportunity_applications;
create policy application_participant_select on public.opportunity_applications for select to authenticated
using (
  "playerId" = (select auth.uid())::text
  or exists (
    select 1 from public.opportunities o
    where o.id = "opportunityId" and o."organizerId" = (select auth.uid())::text
  )
);
drop policy if exists application_player_insert on public.opportunity_applications;
create policy application_player_insert on public.opportunity_applications for insert to authenticated
with check ("playerId" = (select auth.uid())::text);
drop policy if exists application_organizer_update on public.opportunity_applications;
create policy application_organizer_update on public.opportunity_applications for update to authenticated
using (exists (
  select 1 from public.opportunities o
  where o.id = "opportunityId" and o."organizerId" = (select auth.uid())::text
));
drop policy if exists application_player_delete on public.opportunity_applications;
create policy application_player_delete on public.opportunity_applications for delete to authenticated
using ("playerId" = (select auth.uid())::text);
grant select, insert, update, delete on public.opportunity_applications to authenticated;

-- Organization referral records are controlled by their organization account.
drop policy if exists org_referral_owner_select on public.organization_referrals;
create policy org_referral_owner_select on public.organization_referrals for select to authenticated
using ("organizationId" = (select auth.uid())::text);
drop policy if exists org_referral_owner_insert on public.organization_referrals;
create policy org_referral_owner_insert on public.organization_referrals for insert to authenticated
with check ("organizationId" = (select auth.uid())::text);
drop policy if exists org_referral_owner_update on public.organization_referrals;
create policy org_referral_owner_update on public.organization_referrals for update to authenticated
using ("organizationId" = (select auth.uid())::text)
with check ("organizationId" = (select auth.uid())::text);
grant select, insert, update on public.organization_referrals to authenticated;

-- Join requests/notifications are visible to the player and target organization.
drop policy if exists join_request_participant_select on public.player_join_requests;
create policy join_request_participant_select on public.player_join_requests for select to authenticated
using (
  "playerId" = (select auth.uid())::text
  or "organizationId" = (select auth.uid())::text
);
drop policy if exists join_request_player_insert on public.player_join_requests;
create policy join_request_player_insert on public.player_join_requests for insert to authenticated
with check ("playerId" = (select auth.uid())::text);
drop policy if exists join_request_org_update on public.player_join_requests;
create policy join_request_org_update on public.player_join_requests for update to authenticated
using ("organizationId" = (select auth.uid())::text)
with check ("organizationId" = (select auth.uid())::text);
grant select, insert, update on public.player_join_requests to authenticated;

drop policy if exists join_notification_participant_select on public.join_request_notifications;
create policy join_notification_participant_select on public.join_request_notifications for select to authenticated
using (
  "playerId" = (select auth.uid())::text
  or "organizationId" = (select auth.uid())::text
);
drop policy if exists join_notification_participant_update on public.join_request_notifications;
create policy join_notification_participant_update on public.join_request_notifications for update to authenticated
using (
  "playerId" = (select auth.uid())::text
  or "organizationId" = (select auth.uid())::text
);
grant select, update on public.join_request_notifications to authenticated;

-- Rewards, point transactions, and referrals are owner-scoped.
drop policy if exists reward_owner_select on public.player_rewards;
create policy reward_owner_select on public.player_rewards for select to authenticated
using ("playerId" = (select auth.uid())::text);
grant select on public.player_rewards to authenticated;

drop policy if exists points_owner_select on public.point_transactions;
create policy points_owner_select on public.point_transactions for select to authenticated
using ("playerId" = (select auth.uid())::text);
grant select on public.point_transactions to authenticated;

drop policy if exists referral_participant_select on public.referrals;
create policy referral_participant_select on public.referrals for select to authenticated
using (
  "referrerId" = (select auth.uid())::text
  or "referredId" = (select auth.uid())::text
);
drop policy if exists referral_owner_insert on public.referrals;
create policy referral_owner_insert on public.referrals for insert to authenticated
with check ("referrerId" = (select auth.uid())::text);
grant select, insert on public.referrals to authenticated;

-- Player media: approved/public rows are readable; only owner manages their rows.
drop policy if exists "Players can view own videos" on public.player_videos;
drop policy if exists "Players can insert own videos" on public.player_videos;
drop policy if exists "Players can update own pending videos" on public.player_videos;
drop policy if exists player_video_read on public.player_videos;
create policy player_video_read on public.player_videos for select to anon, authenticated
using (status = 'approved' or "playerId" = (select auth.uid())::text);
drop policy if exists player_video_owner_insert on public.player_videos;
create policy player_video_owner_insert on public.player_videos for insert to authenticated
with check ("playerId" = (select auth.uid())::text);
drop policy if exists player_video_owner_update on public.player_videos;
create policy player_video_owner_update on public.player_videos for update to authenticated
using ("playerId" = (select auth.uid())::text)
with check ("playerId" = (select auth.uid())::text);
grant select on public.player_videos to anon, authenticated;
grant insert, update on public.player_videos to authenticated;

drop policy if exists video_public_read on public.videos;
create policy video_public_read on public.videos for select to anon, authenticated
using (coalesce("isPublic", false) or "playerId" = (select auth.uid())::text);
drop policy if exists video_owner_insert on public.videos;
create policy video_owner_insert on public.videos for insert to authenticated
with check ("playerId" = (select auth.uid())::text);
drop policy if exists video_owner_update on public.videos;
create policy video_owner_update on public.videos for update to authenticated
using ("playerId" = (select auth.uid())::text)
with check ("playerId" = (select auth.uid())::text);
drop policy if exists video_owner_delete on public.videos;
create policy video_owner_delete on public.videos for delete to authenticated
using ("playerId" = (select auth.uid())::text);
grant select on public.videos to anon, authenticated;
grant insert, update, delete on public.videos to authenticated;

-- Legacy tournament registrations are owner-readable/creatable; status updates stay admin-side.
drop policy if exists tournament_registration_owner_select on public.tournament_registrations;
create policy tournament_registration_owner_select on public.tournament_registrations for select to authenticated
using (
  "userId" = (select auth.uid())::text
  or "playerId" = (select auth.uid())::text
  or "accountEmail" = (select auth.jwt() ->> 'email')
);
drop policy if exists tournament_registration_owner_insert on public.tournament_registrations;
create policy tournament_registration_owner_insert on public.tournament_registrations for insert to authenticated
with check (
  "userId" = (select auth.uid())::text
  or "playerId" = (select auth.uid())::text
);
grant select, insert on public.tournament_registrations to authenticated;

commit;
