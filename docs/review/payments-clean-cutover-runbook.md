# Payments Clean Cutover Runbook

Status: READY FOR PRODUCTION EXECUTION — NOT YET EXECUTED.

## Preconditions
- Deploy the cutover application build in the same maintenance window as the SQL.
- SUPABASE_SERVICE_ROLE_KEY must be configured server-side.
- Do not deploy the final build while Production still exposes only subscriptions_v2.

## 1. Verify country routing before changing data
Run:
```sql
select id, "countryCode", currency, methods
from public.payment_settings
order by "countryCode";
```
Expected business contract:
- EG card provider resolves to geidea.
- QA card provider resolves to skipcash.
If the JSON shape in methods does not encode these providers, STOP and normalize payment_settings first.

## 2. Install atomic activation
Execute:
- docs/review/payments-phase-3-atomic-activation.sql

Verify:
```sql
select
  to_regprocedure('public.activate_canonical_payment_subscriptions(text)') as activate_rpc,
  to_regprocedure('public.approve_manual_payment(text,text)') as approve_rpc;
```
Both must be non-null.

## 3. Deploy cutover application build
The build expects the final canonical table name public.subscriptions.

## 4. Immediately execute clean cutover DDL
Execute:
- docs/review/payments-phase-4-clean-cutover.sql

This intentionally deletes old payment/subscription history per the approved clean-start decision.

## 5. Verify final schema
Expected:
- payments: present
- payment_targets: present
- subscriptions: present
- subscriptions_v2: absent
- bulkPayments: absent
- invoices: absent
- receipts: absent
- geidea_payments: absent
- payment_results: absent
- subscription_plans/payment_settings/geidea_settings/payment_action_logs/store_orders: preserved

## 6. Smoke tests
1. Player reads subscription status.
2. Player cannot submit payment for another player.
3. Club/academy/trainer/agent can submit only for linked players.
4. Egypt card checkout accepts only Geidea routing.
5. Qatar card checkout accepts only SkipCash routing.
6. Manual payment stays pending_review until authenticated admin approval.
7. Admin approval creates one subscription per payment target.
8. Repeating provider callback/approval does not duplicate subscriptions.
9. Admin payments page and financial report load canonical payments only.
10. Legacy admin /payments and /invoices routes redirect to /payments-v2.

## Rollback
Before step 4, rollback is application-only.
After step 4, legacy history is intentionally deleted and cannot be restored unless an external DB backup exists. Do not execute step 4 without a Production backup/snapshot.
