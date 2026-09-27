-- Payments clean-cutover verification and legacy retirement
-- RUN ONLY after payments-phase-3-atomic-activation.sql succeeds and app is deployed.
-- User explicitly chose a clean start: legacy payment/subscription history is not migrated.

begin;

-- Hard guards: canonical foundation and RPCs must exist.
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
end $$;

-- Preserve independent/config/audit tables:
-- subscription_plans, payment_settings, geidea_settings, payment_action_logs, store_orders.

-- Legacy ledgers/history intentionally retired after application cutover.
drop table if exists public."bulkPayments" cascade;
drop table if exists public.invoices cascade;
drop table if exists public.receipts cascade;
drop table if exists public.geidea_payments cascade;
drop table if exists public.payment_results cascade;

-- Old subscriptions is replaced by subscriptions_v2.
drop table if exists public.subscriptions cascade;
alter table public.subscriptions_v2 rename to subscriptions;

-- Rename common indexes if their old names exist is optional; PostgreSQL index
-- names do not affect runtime. Keep them to avoid risky cosmetic DDL.

commit;

-- Verification
select to_regclass('public.payments') as payments,
       to_regclass('public.payment_targets') as payment_targets,
       to_regclass('public.subscriptions') as subscriptions,
       to_regclass('public.subscriptions_v2') as subscriptions_v2,
       to_regclass('public."bulkPayments"') as legacy_bulk,
       to_regclass('public.invoices') as legacy_invoices,
       to_regclass('public.receipts') as legacy_receipts,
       to_regclass('public.geidea_payments') as legacy_geidea,
       to_regclass('public.payment_results') as legacy_results;
