-- Payments Phase 4 preflight — READ ONLY.
-- Run before the clean cutover. This script changes nothing.

-- 1) Confirm exact table presence and current row counts.
select 'bulkPayments' as table_name,
       to_regclass('public."bulkPayments"')::text as relation,
       case when to_regclass('public."bulkPayments"') is null then null
            else (select count(*) from public."bulkPayments") end as row_count
union all
select 'invoices', to_regclass('public.invoices')::text,
       case when to_regclass('public.invoices') is null then null else (select count(*) from public.invoices) end
union all
select 'receipts', to_regclass('public.receipts')::text,
       case when to_regclass('public.receipts') is null then null else (select count(*) from public.receipts) end
union all
select 'geidea_payments', to_regclass('public.geidea_payments')::text,
       case when to_regclass('public.geidea_payments') is null then null else (select count(*) from public.geidea_payments) end
union all
select 'payment_results', to_regclass('public.payment_results')::text,
       case when to_regclass('public.payment_results') is null then null else (select count(*) from public.payment_results) end
union all
select 'subscriptions', to_regclass('public.subscriptions')::text,
       case when to_regclass('public.subscriptions') is null then null else (select count(*) from public.subscriptions) end
union all
select 'subscriptions_v2', to_regclass('public.subscriptions_v2')::text,
       case when to_regclass('public.subscriptions_v2') is null then null else (select count(*) from public.subscriptions_v2) end;

-- 2) Foreign keys FROM other tables INTO legacy tables.
select
  tc.table_schema as dependent_schema,
  tc.table_name as dependent_table,
  tc.constraint_name,
  ccu.table_schema as referenced_schema,
  ccu.table_name as referenced_table,
  ccu.column_name as referenced_column
from information_schema.table_constraints tc
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name=tc.constraint_name
 and ccu.constraint_schema=tc.constraint_schema
where tc.constraint_type='FOREIGN KEY'
  and ccu.table_schema='public'
  and ccu.table_name in ('bulkPayments','invoices','receipts','geidea_payments','payment_results','subscriptions')
order by ccu.table_name,tc.table_name,tc.constraint_name;

-- 3) Views/materialized views that reference legacy tables.
select distinct
  n.nspname as dependent_schema,
  c.relname as dependent_object,
  case c.relkind when 'v' then 'view' when 'm' then 'materialized_view' else c.relkind::text end as object_type,
  rn.nspname as referenced_schema,
  rc.relname as referenced_table
from pg_depend d
join pg_rewrite r on r.oid=d.objid
join pg_class c on c.oid=r.ev_class
join pg_namespace n on n.oid=c.relnamespace
join pg_class rc on rc.oid=d.refobjid
join pg_namespace rn on rn.oid=rc.relnamespace
where rn.nspname='public'
  and rc.relname in ('bulkPayments','invoices','receipts','geidea_payments','payment_results','subscriptions')
  and c.oid<>rc.oid
order by referenced_table,dependent_schema,dependent_object;

-- 4) Functions whose stored definition mentions a legacy relation name.
-- This catches SQL/PLpgSQL bodies that pg_depend may not expose as a relation dependency.
select
  n.nspname as function_schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname not in ('pg_catalog','information_schema')
  and p.prokind = 'f'
  and (
    pg_get_functiondef(p.oid) ilike '%bulkPayments%'
    or pg_get_functiondef(p.oid) ilike '%geidea_payments%'
    or pg_get_functiondef(p.oid) ilike '%payment_results%'
    or pg_get_functiondef(p.oid) ilike '%public.invoices%'
    or pg_get_functiondef(p.oid) ilike '%public.receipts%'
    or pg_get_functiondef(p.oid) ilike '%public.subscriptions%'
  )
order by function_schema,function_name;

-- 5) Canonical objects must already exist.
select
  to_regclass('public.payments') as payments,
  to_regclass('public.payment_targets') as payment_targets,
  to_regclass('public.subscriptions_v2') as subscriptions_v2,
  to_regprocedure('public.activate_canonical_payment_subscriptions(text)') as activate_rpc,
  to_regprocedure('public.approve_manual_payment(text,text)') as approve_rpc;
