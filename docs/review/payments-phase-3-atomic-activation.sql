-- Payments Phase 3: atomic canonical subscription activation
-- Apply after payments/payment_targets/subscriptions_v2 foundation exists.

begin;

create or replace function public.activate_canonical_payment_subscriptions(p_payment_id text)
returns table(target_player_id text, subscription_id text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_plan record;
  v_target record;
  v_months integer;
  v_start timestamptz;
  v_end timestamptz;
  v_now timestamptz := now();
  v_subscription_id text;
begin
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then raise exception 'payment not found'; end if;
  if v_payment.status <> 'paid' then raise exception 'only paid payments can activate subscriptions'; end if;
  if v_payment.plan_id is null then raise exception 'payment has no subscription plan'; end if;

  select id, period, "isActive" into v_plan
  from public.subscription_plans where id = v_payment.plan_id;
  if not found or v_plan."isActive" is false then raise exception 'subscription plan is invalid or inactive'; end if;

  v_months := case
    when v_plan.id = 'subscription_annual' then 12
    when v_plan.id = 'subscription_6months' then 6
    when v_plan.id = 'subscription_3months' then 3
    when lower(coalesce(v_plan.period,'')) ~ '(12|year|annual|سنة|عام)' then 12
    when lower(coalesce(v_plan.period,'')) ~ '(6|ستة|ست)' then 6
    when lower(coalesce(v_plan.period,'')) ~ '(3|ثلاث)' then 3
    else null end;
  if v_months is null then raise exception 'subscription plan duration is not supported'; end if;

  v_start := coalesce(v_payment.paid_at, v_now);

  for v_target in
    select id, target_player_id, amount_allocated
    from public.payment_targets where payment_id = p_payment_id
    for update
  loop
    v_subscription_id := 'sub:' || p_payment_id || ':' || v_target.target_player_id;
    v_end := v_start + make_interval(months => v_months);

    insert into public.subscriptions_v2(
      id, player_id, plan_id, payment_id, status, starts_at, expires_at,
      activated_at, cancelled_at, auto_renew, amount, currency, metadata,
      created_at, updated_at
    ) values (
      v_subscription_id, v_target.target_player_id, v_payment.plan_id, p_payment_id,
      'active', v_start, v_end, v_now, null, false,
      coalesce(v_target.amount_allocated, v_payment.amount), v_payment.currency,
      jsonb_build_object('activation_source','canonical_payment_rpc'), v_now, v_now
    )
    on conflict (id) do update set
      status='active', starts_at=excluded.starts_at, expires_at=excluded.expires_at,
      activated_at=coalesce(public.subscriptions_v2.activated_at, excluded.activated_at),
      cancelled_at=null, amount=excluded.amount, currency=excluded.currency,
      updated_at=v_now;

    update public.payment_targets
      set status='active', updated_at=v_now where id=v_target.id;

    target_player_id := v_target.target_player_id;
    subscription_id := v_subscription_id;
    return next;
  end loop;

  if not found then raise exception 'payment has no target players'; end if;
end;
$$;

revoke all on function public.activate_canonical_payment_subscriptions(text) from public, anon, authenticated;
grant execute on function public.activate_canonical_payment_subscriptions(text) to service_role;

commit;
