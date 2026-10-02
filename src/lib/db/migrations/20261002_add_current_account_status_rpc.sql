create or replace function public.get_current_account_status()
returns table(
  found boolean,
  is_active boolean,
  is_deleted boolean,
  suspension_reason text
)
language sql
security invoker
set search_path = public, pg_temp
as $$
  with me as (
    select auth.uid()::text as uid
  ),
  candidates as (
    select 1 priority,
           coalesce(u."isActive", true) is_active,
           coalesce(u."isDeleted", false) is_deleted,
           u."suspensionReason" suspension_reason
    from public.users u, me
    where u.id::text = me.uid or u.uid::text = me.uid

    union all
    select 2, coalesce(a."isActive", true), false, null::text
    from public.admins a, me
    where a.id::text = me.uid or a.uid::text = me.uid

    union all
    select 3, coalesce(c."isActive", true), coalesce(c."isDeleted", false), null::text
    from public.clubs c, me
    where c.id::text = me.uid or c.uid::text = me.uid

    union all
    select 4, coalesce(a."isActive", true), coalesce(a."isDeleted", false), null::text
    from public.academies a, me
    where a.id::text = me.uid or a.uid::text = me.uid

    union all
    select 5, coalesce(t."isActive", true), coalesce(t."isDeleted", false), null::text
    from public.trainers t, me
    where t.id::text = me.uid or t.uid::text = me.uid

    union all
    select 6, coalesce(a."isActive", true), coalesce(a."isDeleted", false), null::text
    from public.agents a, me
    where a.id::text = me.uid or a.uid::text = me.uid

    union all
    select 7, coalesce(p."isActive", true), coalesce(p."isDeleted", false), null::text
    from public.players p, me
    where p.id::text = me.uid or p.uid::text = me.uid

    union all
    select 8, coalesce(m."isActive", true), false, null::text
    from public.marketers m, me
    where m.id::text = me.uid or m.uid::text = me.uid
  ),
  picked as (
    select is_active, is_deleted, suspension_reason
    from candidates
    order by priority
    limit 1
  )
  select true, is_active, is_deleted, suspension_reason
  from picked
  union all
  select false, false, false, null::text
  where not exists (select 1 from picked)
  limit 1;
$$;

revoke all on function public.get_current_account_status() from public;
revoke all on function public.get_current_account_status() from anon;
grant execute on function public.get_current_account_status() to authenticated;
