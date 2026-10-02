-- Payments Phase 3 smoke test. Safe by design: always rolls back.
-- Run only AFTER payments-phase-3-atomic-activation.sql succeeds.

begin;

do $$
declare
  v_player_id text;
  v_plan_id text;
  v_currency text;
  v_payment_id text := '__payment_phase3_smoke__';
  v_count integer;
begin
  select id into v_player_id from public.players order by id limit 1;
  if v_player_id is null then raise exception 'No player available for smoke test'; end if;

  select id, coalesce(base_currency,'EGP') into v_plan_id, v_currency
  from public.subscription_plans
  where "isActive" is distinct from false
  order by "order" nulls last, id
  limit 1;
  if v_plan_id is null then raise exception 'No active subscription plan available'; end if;

  delete from public.payment_targets where payment_id=v_payment_id;
  delete from public.subscriptions_v2 where payment_id=v_payment_id;
  delete from public.payments where id=v_payment_id;

  insert into public.payments(
    id,payer_id,payer_type,plan_id,country_code,amount,currency,method,provider,
    status,paid_at,metadata,created_at,updated_at
  ) values (
    v_payment_id,v_player_id,'player',v_plan_id,'EG',1,v_currency,'card','smoke_test',
    'paid',now(),'{"smoke_test":true}'::jsonb,now(),now()
  );

  insert into public.payment_targets(
    id,payment_id,target_player_id,amount_allocated,status,metadata,created_at,updated_at
  ) values (
    '__payment_phase3_smoke_target__',v_payment_id,v_player_id,1,'pending',
    '{"smoke_test":true}'::jsonb,now(),now()
  );

  perform * from public.activate_canonical_payment_subscriptions(v_payment_id);
  perform * from public.activate_canonical_payment_subscriptions(v_payment_id);

  select count(*) into v_count
  from public.subscriptions_v2
  where payment_id=v_payment_id and player_id=v_player_id;
  if v_count <> 1 then raise exception 'Idempotency failed: expected 1 subscription, found %',v_count; end if;

  if not exists (
    select 1 from public.payment_targets
    where payment_id=v_payment_id and target_player_id=v_player_id and status='active'
  ) then raise exception 'Target activation failed'; end if;

  raise notice 'PASS: atomic activation is idempotent for payment % / player %',v_payment_id,v_player_id;
end $$;

rollback;
