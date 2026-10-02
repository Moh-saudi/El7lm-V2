create index if not exists idx_clubs_uid on public.clubs (uid);
create index if not exists idx_academies_uid on public.academies (uid);
create index if not exists idx_agents_uid on public.agents (uid);
create index if not exists idx_trainers_uid on public.trainers (uid);
create index if not exists idx_marketers_uid on public.marketers (uid);
create index if not exists idx_employees_auth_user_id on public.employees ("authUserId");
