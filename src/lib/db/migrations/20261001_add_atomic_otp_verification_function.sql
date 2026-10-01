-- Atomic OTP verification to prevent concurrent brute-force attempts.

create or replace function public.verify_otp_atomic(
  p_id text,
  p_otp_hash text,
  p_max_attempts integer default 5
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_row public.otp_verifications%rowtype;
  v_attempts integer;
begin
  if p_id is null or trim(p_id) = '' or p_otp_hash is null or trim(p_otp_hash) = '' then
    return jsonb_build_object('success', false, 'code', 'invalid_input');
  end if;

  select *
    into v_row
  from public.otp_verifications
  where id = p_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'code', 'not_found');
  end if;

  if v_row."expiresAt" is null or v_row."expiresAt" < now() then
    delete from public.otp_verifications where id = p_id;
    return jsonb_build_object('success', false, 'code', 'expired');
  end if;

  if coalesce(v_row.verified, false) then
    return jsonb_build_object('success', false, 'code', 'already_used');
  end if;

  v_attempts := coalesce(v_row.attempts, 0)::integer;

  if v_attempts >= p_max_attempts then
    delete from public.otp_verifications where id = p_id;
    return jsonb_build_object(
      'success', false,
      'code', 'max_attempts',
      'attemptsRemaining', 0
    );
  end if;

  if v_row."otpHash" is distinct from p_otp_hash then
    v_attempts := v_attempts + 1;

    if v_attempts >= p_max_attempts then
      delete from public.otp_verifications where id = p_id;
    else
      update public.otp_verifications
      set attempts = v_attempts
      where id = p_id;
    end if;

    return jsonb_build_object(
      'success', false,
      'code', case when v_attempts >= p_max_attempts then 'max_attempts' else 'incorrect' end,
      'attemptsRemaining', greatest(p_max_attempts - v_attempts, 0)
    );
  end if;

  update public.otp_verifications
  set verified = true,
      "verifiedAt" = now()::text
  where id = p_id;

  return jsonb_build_object('success', true, 'code', 'verified');
end;
$$;

revoke all on function public.verify_otp_atomic(text, text, integer) from public, anon, authenticated;
grant execute on function public.verify_otp_atomic(text, text, integer) to service_role;
