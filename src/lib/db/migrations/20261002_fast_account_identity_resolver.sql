create or replace function public.resolve_account_identity_candidates(p_identifier text)
returns table (
  source_table text,
  account_type text,
  account_id text,
  auth_uid text,
  display_name text
)
language sql
security invoker
set search_path = public, pg_temp
as $$
  with initial as (
    select 'players'::text source_table, 'player'::text account_type,
           id::text account_id, uid::text auth_uid,
           coalesce(nullif(btrim(full_name), ''), nullif(btrim(name), ''), 'مستخدم')::text display_name
    from public.players
    where uid is not null and (id::text = p_identifier or uid::text = p_identifier)

    union all
    select 'clubs', 'club', id::text, uid::text,
           coalesce(nullif(btrim(full_name), ''), nullif(btrim(name), ''), 'مستخدم')
    from public.clubs
    where uid is not null and (id::text = p_identifier or uid::text = p_identifier)

    union all
    select 'academies', 'academy', id::text, uid::text,
           coalesce(nullif(btrim(full_name), ''), nullif(btrim(name), ''), 'مستخدم')
    from public.academies
    where uid is not null and (id::text = p_identifier or uid::text = p_identifier)

    union all
    select 'agents', 'agent', id::text, uid::text,
           coalesce(nullif(btrim(full_name), ''), 'مستخدم')
    from public.agents
    where uid is not null and (id::text = p_identifier or uid::text = p_identifier)

    union all
    select 'trainers', 'trainer', id::text, uid::text,
           coalesce(nullif(btrim(full_name), ''), 'مستخدم')
    from public.trainers
    where uid is not null and (id::text = p_identifier or uid::text = p_identifier)

    union all
    select 'marketers', 'marketer', id::text, uid::text,
           coalesce(nullif(btrim(full_name), ''), 'مستخدم')
    from public.marketers
    where uid is not null and (id::text = p_identifier or uid::text = p_identifier)

    union all
    select 'admins', 'admin', id::text, uid::text,
           coalesce(nullif(btrim(name), ''), 'مستخدم')
    from public.admins
    where uid is not null and (id::text = p_identifier or uid::text = p_identifier)

    union all
    select 'users', 'user', id::text, uid::text,
           coalesce(
             nullif(btrim(full_name), ''),
             nullif(btrim(name), ''),
             nullif(btrim("displayName"), ''),
             'مستخدم'
           )
    from public.users
    where uid is not null and (id::text = p_identifier or uid::text = p_identifier)
  ),
  canonical as (
    select min(auth_uid) auth_uid
    from initial
    having count(distinct auth_uid) = 1
  ),
  hydrated as (
    select 'players'::text source_table, 'player'::text account_type,
           p.id::text account_id, p.uid::text auth_uid,
           coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(p.name), ''), 'مستخدم')::text display_name
    from public.players p join canonical c on p.uid::text = c.auth_uid

    union all
    select 'clubs', 'club', p.id::text, p.uid::text,
           coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(p.name), ''), 'مستخدم')
    from public.clubs p join canonical c on p.uid::text = c.auth_uid

    union all
    select 'academies', 'academy', p.id::text, p.uid::text,
           coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(p.name), ''), 'مستخدم')
    from public.academies p join canonical c on p.uid::text = c.auth_uid

    union all
    select 'agents', 'agent', p.id::text, p.uid::text,
           coalesce(nullif(btrim(p.full_name), ''), 'مستخدم')
    from public.agents p join canonical c on p.uid::text = c.auth_uid

    union all
    select 'trainers', 'trainer', p.id::text, p.uid::text,
           coalesce(nullif(btrim(p.full_name), ''), 'مستخدم')
    from public.trainers p join canonical c on p.uid::text = c.auth_uid

    union all
    select 'marketers', 'marketer', p.id::text, p.uid::text,
           coalesce(nullif(btrim(p.full_name), ''), 'مستخدم')
    from public.marketers p join canonical c on p.uid::text = c.auth_uid

    union all
    select 'admins', 'admin', p.id::text, p.uid::text,
           coalesce(nullif(btrim(p.name), ''), 'مستخدم')
    from public.admins p join canonical c on p.uid::text = c.auth_uid

    union all
    select 'users', 'user', p.id::text, p.uid::text,
           coalesce(
             nullif(btrim(p.full_name), ''),
             nullif(btrim(p.name), ''),
             nullif(btrim(p."displayName"), ''),
             'مستخدم'
           )
    from public.users p join canonical c on p.uid::text = c.auth_uid
  )
  select distinct source_table, account_type, account_id, auth_uid, display_name
  from hydrated;
$$;

revoke all on function public.resolve_account_identity_candidates(text) from public;
revoke all on function public.resolve_account_identity_candidates(text) from anon;
revoke all on function public.resolve_account_identity_candidates(text) from authenticated;
grant execute on function public.resolve_account_identity_candidates(text) to service_role;
