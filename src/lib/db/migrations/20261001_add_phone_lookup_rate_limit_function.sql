-- Atomic server-side rate limiting for public phone lookup endpoints.

create or replace function public.consume_phone_lookup_rate_limit(
  p_key_hash text,
  p_window_seconds integer,
  p_max_attempts integer
)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_attempt_count integer;
  v_window_start timestamptz;
  v_now timestamptz := now();
begin
  if p_key_hash is null or trim(p_key_hash) = '' then
    return false;
  end if;
  if p_window_seconds < 1 or p_max_attempts < 1 then
    return false;
  end if;

  insert into public.phone_lookup_rate_limits as r
    (key_hash, window_start, attempt_count, updated_at)
  values
    (p_key_hash, v_now, 1, v_now)
  on conflict (key_hash) do update
  set
    attempt_count = case
      when r.window_start <= v_now - make_interval(secs => p_window_seconds) then 1
      else r.attempt_count + 1
    end,
    window_start = case
      when r.window_start <= v_now - make_interval(secs => p_window_seconds) then v_now
      else r.window_start
    end,
    updated_at = v_now
  returning attempt_count, window_start
    into v_attempt_count, v_window_start;

  return v_attempt_count <= p_max_attempts;
end;
$$;

revoke all on function public.consume_phone_lookup_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_phone_lookup_rate_limit(text, integer, integer) to service_role;
