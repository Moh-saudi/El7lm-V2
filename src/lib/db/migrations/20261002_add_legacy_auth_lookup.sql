create or replace function public.resolve_legacy_auth_user(
  p_profile_email text,
  p_constructed_email text,
  p_legacy_id text
)
returns table(auth_user_id uuid, auth_email text)
language sql
security definer
set search_path = auth, pg_temp
as $$
  with candidates as (
    select u.id, u.email, 1 as priority
    from auth.users u
    where nullif(btrim(p_profile_email), '') is not null
      and lower(u.email) = lower(btrim(p_profile_email))

    union all

    select u.id, u.email, 2
    from auth.users u
    where nullif(btrim(p_constructed_email), '') is not null
      and lower(u.email) = lower(btrim(p_constructed_email))

    union all

    select u.id, u.email, 3
    from auth.users u
    where nullif(btrim(p_legacy_id), '') is not null
      and u.raw_user_meta_data ->> 'firebase_uid' = p_legacy_id
  ),
  deduped as (
    select distinct on (id) id, email, priority
    from candidates
    order by id, priority
  )
  select id, email
  from deduped
  order by priority
  limit 2;
$$;

revoke all on function public.resolve_legacy_auth_user(text, text, text) from public;
revoke all on function public.resolve_legacy_auth_user(text, text, text) from anon;
revoke all on function public.resolve_legacy_auth_user(text, text, text) from authenticated;
grant execute on function public.resolve_legacy_auth_user(text, text, text) to service_role;
