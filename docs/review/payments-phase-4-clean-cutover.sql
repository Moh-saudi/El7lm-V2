-- Payments Phase 4: guarded clean cutover
-- Run in a maintenance window only after Phase 3 + smoke test succeed.
-- Legacy payment/subscription history is intentionally retired per approved clean-start decision.

begin;

do $$
begin
  if to_regclass('public.payments') is null
     or to_regclass('public.payment_targets') is null
     or to_regclass('public.subscriptions_v2') is null then
    raise exception 'Canonical payment foundation is incomplete';
  end if;

  if to_regprocedure('public.activate_canonical_payment_subscriptions(text)') is null
     or to_regprocedure('public.approve_manual_payment(text,text)') is null then
    raise exception 'Phase 3 payment RPCs are missing';
  end if;

  if to_regclass('public.subscriptions') is null then
    raise exception 'Expected legacy subscriptions table is missing; stop and inspect schema';
  end if;
end $$;

-- RESTRICT is deliberate: if an unexpected database object still depends on a
-- legacy ledger, abort the whole transaction instead of silently dropping it.
drop table if exists public."bulkPayments" restrict;
drop table if exists public.invoices restrict;
drop table if exists public.receipts restrict;
drop table if exists public.geidea_payments restrict;
drop table if exists public.payment_results restrict;

-- Replace the legacy subscription table with the canonical normalized table.
drop table public.subscriptions restrict;
alter table public.subscriptions_v2 rename to subscriptions;

-- Recreate activation against the FINAL relation name. PL/pgSQL relation names
-- in function bodies must not be left pointing at subscriptions_v2 after rename.
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
  v_target_count integer := 0;
begin
  select * into v_payment from public.payments p where p.id=p_payment_id for update;
  if not found then raise exception 'payment not found'; end if;
  if v_payment.status <> 'paid' then raise exception 'only paid payments can activate subscriptions'; end if;
  if v_payment.plan_id is null then raise exception 'payment has no subscription plan'; end if;

  select sp.id, sp.period, sp."isActive" into v_plan
  from public.subscription_plans sp where sp.id=v_payment.plan_id;
  if not found or v_plan."isActive" is false then raise exception 'subscription plan is invalid or inactive'; end if;

  v_months := case
    when v_plan.id='subscription_annual' then 12
    when v_plan.id='subscription_6months' then 6
    when v_plan.id='subscription_3months' then 3
    when lower(coalesce(v_plan.period,'')) ~ '(12|year|annual|سنة|عام)' then 12
    when lower(coalesce(v_plan.period,'')) ~ '(6|ستة|ست)' then 6
    when lower(coalesce(v_plan.period,'')) ~ '(3|ثلاث)' then 3
    else null end;
  if v_months is null then raise exception 'subscription plan duration is not supported'; end if;

  v_start := coalesce(v_payment.paid_at,v_now);
  if v_payment.amount < 0 then raise exception 'payment amount is invalid'; end if;

  select count(*) into v_target_count from public.payment_targets pt where pt.payment_id=p_payment_id;
  if v_target_count=0 then raise exception 'payment has no target players'; end if;

  for v_target in
    select pt.id,pt.target_player_id,pt.amount_allocated
    from public.payment_targets pt where pt.payment_id=p_payment_id
    for update of pt
  loop
    v_subscription_id := 'sub:'||p_payment_id||':'||v_target.target_player_id;
    v_end := v_start + make_interval(months=>v_months);

    insert into public.subscriptions(
      id,player_id,plan_id,payment_id,status,starts_at,expires_at,activated_at,
      cancelled_at,auto_renew,amount,currency,metadata,created_at,updated_at
    ) values (
      v_subscription_id,v_target.target_player_id,v_payment.plan_id,p_payment_id,
      'active',v_start,v_end,v_now,null,false,
      coalesce(v_target.amount_allocated,v_payment.amount),v_payment.currency,
      jsonb_build_object('activation_source','canonical_payment_rpc'),v_now,v_now
    )
    on conflict (payment_id,player_id)
      where payment_id is not null and player_id is not null
    do update set
      status='active',starts_at=excluded.starts_at,expires_at=excluded.expires_at,
      activated_at=coalesce(public.subscriptions.activated_at,excluded.activated_at),
      cancelled_at=null,amount=excluded.amount,currency=excluded.currency,updated_at=v_now
    returning id into v_subscription_id;

    update public.payment_targets pt set status='active',updated_at=v_now where pt.id=v_target.id;
    target_player_id := v_target.target_player_id;
    subscription_id := v_subscription_id;
    return next;
  end loop;
end;
$$;

revoke all on function public.activate_canonical_payment_subscriptions(text) from public,anon,authenticated;
grant execute on function public.activate_canonical_payment_subscriptions(text) to service_role;

commit;

select
  to_regclass('public.payments') as payments,
  to_regclass('public.payment_targets') as payment_targets,
  to_regclass('public.subscriptions') as subscriptions,
  to_regclass('public.subscriptions_v2') as subscriptions_v2,
  to_regclass('public."bulkPayments"') as legacy_bulk,
  to_regclass('public.invoices') as legacy_invoices,
  to_regclass('public.receipts') as legacy_receipts,
  to_regclass('public.geidea_payments') as legacy_geidea,
  to_regclass('public.payment_results') as legacy_results,
  to_regprocedure('public.activate_canonical_payment_subscriptions(text)') as activate_rpc,
  to_regprocedure('public.approve_manual_payment(text,text)') as approve_rpc;
