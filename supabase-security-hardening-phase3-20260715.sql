-- Phase 3: scope signed-in directory policies to the authenticated role.
-- This removes reliance on auth.role() and avoids evaluating the policy for anon.

drop policy if exists academies_select_auth on public.academies;
create policy academies_select_auth on public.academies
  for select to authenticated using (true);

drop policy if exists agents_select_auth on public.agents;
create policy agents_select_auth on public.agents
  for select to authenticated using (true);

drop policy if exists clubs_select_auth on public.clubs;
create policy clubs_select_auth on public.clubs
  for select to authenticated using (true);

drop policy if exists marketers_select_auth on public.marketers;
create policy marketers_select_auth on public.marketers
  for select to authenticated using (true);

drop policy if exists trainers_select_auth on public.trainers;
create policy trainers_select_auth on public.trainers
  for select to authenticated using (true);
