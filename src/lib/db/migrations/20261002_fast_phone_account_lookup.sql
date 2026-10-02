create or replace function public.resolve_account_by_phone_variants(p_variants text[])
returns table (
  source_table text,
  account_type text,
  account_id text,
  auth_uid text,
  email text,
  display_name text,
  is_deleted boolean,
  is_active boolean
)
language sql
security invoker
set search_path = public, pg_temp
as $$
  select * from (
    select
      'players'::text source_table,
      coalesce(nullif(lower(btrim(p."accountType")), ''), 'player')::text account_type,
      p.id::text account_id,
      nullif(btrim(p.uid::text), '') auth_uid,
      coalesce(p.email, '')::text email,
      coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(p.name), ''), '')::text display_name,
      coalesce(p."isDeleted", false)::boolean is_deleted,
      coalesce(p."isActive", true)::boolean is_active
    from public.players p
    where coalesce(p.phone, '') = any(p_variants)
       or coalesce(p."originalPhone", '') = any(p_variants)
       or coalesce(p."phoneNumber", '') = any(p_variants)
       or coalesce(p."phoneNormalized", '') = any(p_variants)
       or coalesce(p.whatsapp, '') = any(p_variants)

    union all
    select
      'clubs', coalesce(nullif(lower(btrim(p."accountType")), ''), 'club'),
      p.id::text, nullif(btrim(p.uid::text), ''), coalesce(p.email, ''),
      coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(p.name), ''), ''),
      coalesce(p."isDeleted", false), coalesce(p."isActive", true)
    from public.clubs p
    where coalesce(p.phone, '') = any(p_variants)
       or coalesce(p."originalPhone", '') = any(p_variants)
       or coalesce(p."phoneNormalized", '') = any(p_variants)
       or coalesce(p.whatsapp, '') = any(p_variants)

    union all
    select
      'academies', coalesce(nullif(lower(btrim(p."accountType")), ''), 'academy'),
      p.id::text, nullif(btrim(p.uid::text), ''), coalesce(p.email, ''),
      coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(p.name), ''), ''),
      coalesce(p."isDeleted", false), coalesce(p."isActive", true)
    from public.academies p
    where coalesce(p.phone, '') = any(p_variants)
       or coalesce(p.whatsapp, '') = any(p_variants)

    union all
    select
      'agents', coalesce(nullif(lower(btrim(p."accountType")), ''), 'agent'),
      p.id::text, nullif(btrim(p.uid::text), ''), coalesce(p.email, ''),
      coalesce(nullif(btrim(p.full_name), ''), ''),
      coalesce(p."isDeleted", false), coalesce(p."isActive", true)
    from public.agents p
    where coalesce(p.phone, '') = any(p_variants)
       or coalesce(p."originalPhone", '') = any(p_variants)
       or coalesce(p."phoneNormalized", '') = any(p_variants)
       or coalesce(p.whatsapp, '') = any(p_variants)

    union all
    select
      'trainers', coalesce(nullif(lower(btrim(p."accountType")), ''), 'trainer'),
      p.id::text, nullif(btrim(p.uid::text), ''), coalesce(p.email, ''),
      coalesce(nullif(btrim(p.full_name), ''), ''),
      coalesce(p."isDeleted", false), coalesce(p."isActive", true)
    from public.trainers p
    where coalesce(p.phone, '') = any(p_variants)
       or coalesce(p."originalPhone", '') = any(p_variants)
       or coalesce(p."phoneNormalized", '') = any(p_variants)
       or coalesce(p.whatsapp, '') = any(p_variants)

    union all
    select
      'marketers', coalesce(nullif(lower(btrim(p."accountType")), ''), 'marketer'),
      p.id::text, nullif(btrim(p.uid::text), ''), coalesce(p.email, ''),
      coalesce(nullif(btrim(p.full_name), ''), ''),
      false, coalesce(p."isActive", true)
    from public.marketers p
    where coalesce(p.phone, '') = any(p_variants)
       or coalesce(p."originalPhone", '') = any(p_variants)
       or coalesce(p."phoneNormalized", '') = any(p_variants)

    union all
    select
      'users', coalesce(nullif(lower(btrim(p."accountType")), ''), 'player'),
      p.id::text, nullif(btrim(p.uid::text), ''), coalesce(p.email, ''),
      coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(p.name), ''), nullif(btrim(p."displayName"), ''), ''),
      coalesce(p."isDeleted", false), coalesce(p."isActive", true)
    from public.users p
    where coalesce(p.phone, '') = any(p_variants)
       or coalesce(p."originalPhone", '') = any(p_variants)
       or coalesce(p."phoneNumber", '') = any(p_variants)
       or coalesce(p."phoneNormalized", '') = any(p_variants)
       or coalesce(p.whatsapp, '') = any(p_variants)

    union all
    select
      'admins', 'admin',
      p.id::text, nullif(btrim(p.uid::text), ''), coalesce(p.email, ''),
      coalesce(nullif(btrim(p.name), ''), ''),
      false, coalesce(p."isActive", true)
    from public.admins p
    where coalesce(p.phone, '') = any(p_variants)
  ) candidates
  where not is_deleted and is_active;
$$;

revoke all on function public.resolve_account_by_phone_variants(text[]) from public;
revoke all on function public.resolve_account_by_phone_variants(text[]) from anon;
revoke all on function public.resolve_account_by_phone_variants(text[]) from authenticated;
grant execute on function public.resolve_account_by_phone_variants(text[]) to service_role;
