create or replace function public.resolve_auth_user_for_login(
  p_account_id text,
  p_emails text[],
  p_phone_variants text[]
)
returns table (
  auth_uid uuid,
  email text,
  phone text,
  account_type text,
  display_name text
)
language sql
security definer
set search_path = auth, public, pg_temp
as $$
  select
    u.id,
    coalesce(u.email, '')::text,
    coalesce(u.phone, '')::text,
    coalesce(
      nullif(lower(btrim(u.app_metadata ->> 'accountType')), ''),
      nullif(lower(btrim(u.raw_user_meta_data ->> 'accountType')), ''),
      'player'
    )::text,
    coalesce(
      nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
      ''
    )::text
  from auth.users u
  where
    (p_account_id <> '' and (
      u.id::text = p_account_id
      or coalesce(u.raw_user_meta_data ->> 'firebase_uid', '') = p_account_id
      or coalesce(u.raw_user_meta_data ->> 'db_id', '') = p_account_id
    ))
    or (
      coalesce(array_length(p_emails, 1), 0) > 0
      and lower(coalesce(u.email, '')) = any(
        select lower(x) from unnest(p_emails) x where btrim(x) <> ''
      )
    )
    or (
      coalesce(array_length(p_phone_variants, 1), 0) > 0
      and (
        coalesce(u.phone, '') = any(p_phone_variants)
        or coalesce(u.raw_user_meta_data ->> 'phone', '') = any(p_phone_variants)
        or coalesce(u.app_metadata ->> 'phone', '') = any(p_phone_variants)
      )
    )
  order by
    case when u.id::text = p_account_id then 0 else 1 end,
    u.created_at asc
  limit 3;
$$;

revoke all on function public.resolve_auth_user_for_login(text, text[], text[]) from public;
revoke all on function public.resolve_auth_user_for_login(text, text[], text[]) from anon;
revoke all on function public.resolve_auth_user_for_login(text, text[], text[]) from authenticated;
grant execute on function public.resolve_auth_user_for_login(text, text[], text[]) to service_role;
