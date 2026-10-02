create or replace function public.resolve_account_identity_fast_candidates(p_identifier text)
returns table(
  source_table text,
  account_type text,
  account_id text,
  auth_uid text,
  display_name text
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_count integer;
  v_role_count integer;
  v_auth_uid text;
  v_account_type text;
  v_table text;
begin
  select count(*), min(u.uid::text), min(lower(coalesce(u."accountType", '')))
    into v_user_count, v_auth_uid, v_account_type
  from public.users u
  where u.uid is not null
    and (u.id::text = p_identifier or u.uid::text = p_identifier);

  if v_user_count <> 1 or nullif(v_auth_uid, '') is null then
    return;
  end if;

  v_table := case v_account_type
    when 'player' then 'players'
    when 'club' then 'clubs'
    when 'academy' then 'academies'
    when 'agent' then 'agents'
    when 'trainer' then 'trainers'
    when 'marketer' then 'marketers'
    when 'admin' then 'admins'
    else null
  end;

  if v_table is null then return; end if;

  execute format('select count(*) from public.%I where uid::text = $1', v_table)
    into v_role_count using v_auth_uid;

  if v_role_count <> 1 then return; end if;

  return query execute format(
    'select %L::text, %L::text, r.id::text, r.uid::text,
            coalesce(nullif(btrim(to_jsonb(r)->>''full_name''), ''''),
                     nullif(btrim(to_jsonb(r)->>''name''), ''''),
                     ''مستخدم'')::text
       from public.%I r where r.uid::text = $1
     union all
     select ''users''::text, ''user''::text, u.id::text, u.uid::text,
            coalesce(nullif(btrim(u.full_name), ''''),
                     nullif(btrim(u.name), ''''),
                     nullif(btrim(u."displayName"), ''''),
                     ''مستخدم'')::text
       from public.users u
      where u.uid::text = $1
        and (u.id::text = $2 or u.uid::text = $2)',
    v_table, v_account_type, v_table
  ) using v_auth_uid, p_identifier;
end;
$$;

revoke all on function public.resolve_account_identity_fast_candidates(text) from public;
revoke all on function public.resolve_account_identity_fast_candidates(text) from anon;
revoke all on function public.resolve_account_identity_fast_candidates(text) from authenticated;
grant execute on function public.resolve_account_identity_fast_candidates(text) to service_role;
