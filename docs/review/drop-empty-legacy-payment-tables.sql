-- ==============================================================================
-- Production Cleanup: Atomic DROP of 5 Empty Legacy Payment Tables
-- File: docs/review/drop-empty-legacy-payment-tables.sql
-- Target Tables:
--   1. public.bulk_payments
--   2. public.wallet
--   3. public.instapay
--   4. public.vodafone_cash
--   5. public.tournament_payments
-- Protected Live Tables (Guarded, NOT touched):
--   - public."bulkPayments"
--   - public.geidea_payments
--   - public.invoices
--   - public.subscriptions
--   - public.subscription_plans
--   - public.payment_settings
-- Mode: Strictly Atomic Transaction — Rollback on ANY assertion failure
-- CASCADE: Strictly FORBIDDEN (No CASCADE)
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  -- Target table existence flags
  v_bulk_payments_exists BOOLEAN;
  v_wallet_exists BOOLEAN;
  v_instapay_exists BOOLEAN;
  v_vodafone_cash_exists BOOLEAN;
  v_tournament_payments_exists BOOLEAN;

  -- Protected table existence flags
  v_bulkPayments_exists BOOLEAN;
  v_geidea_payments_exists BOOLEAN;
  v_invoices_exists BOOLEAN;
  v_subscriptions_exists BOOLEAN;
  v_subscription_plans_exists BOOLEAN;
  v_payment_settings_exists BOOLEAN;

  -- Target table row counts
  v_bulk_payments_count INT;
  v_wallet_count INT;
  v_instapay_count INT;
  v_vodafone_cash_count INT;
  v_tournament_payments_count INT;
BEGIN
  -- ----------------------------------------------------------------------------
  -- 1. PROTECTED LIVE TABLES EXISTENCE CHECK (Environment & Schema sanity)
  -- ----------------------------------------------------------------------------
  SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bulkPayments') INTO v_bulkPayments_exists;
  IF NOT v_bulkPayments_exists THEN
    RAISE EXCEPTION 'Safety Guard Failed: Protected table public."bulkPayments" is missing!';
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'geidea_payments') INTO v_geidea_payments_exists;
  IF NOT v_geidea_payments_exists THEN
    RAISE EXCEPTION 'Safety Guard Failed: Protected table public.geidea_payments is missing!';
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoices') INTO v_invoices_exists;
  IF NOT v_invoices_exists THEN
    RAISE EXCEPTION 'Safety Guard Failed: Protected table public.invoices is missing!';
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscriptions') INTO v_subscriptions_exists;
  IF NOT v_subscriptions_exists THEN
    RAISE EXCEPTION 'Safety Guard Failed: Protected table public.subscriptions is missing!';
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscription_plans') INTO v_subscription_plans_exists;
  IF NOT v_subscription_plans_exists THEN
    RAISE EXCEPTION 'Safety Guard Failed: Protected table public.subscription_plans is missing!';
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payment_settings') INTO v_payment_settings_exists;
  IF NOT v_payment_settings_exists THEN
    RAISE EXCEPTION 'Safety Guard Failed: Protected table public.payment_settings is missing!';
  END IF;

  -- ----------------------------------------------------------------------------
  -- 2. TARGET TABLES EXISTENCE CHECK
  -- ----------------------------------------------------------------------------
  SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bulk_payments') INTO v_bulk_payments_exists;
  IF NOT v_bulk_payments_exists THEN
    RAISE EXCEPTION 'Safety Guard Failed: Target table public.bulk_payments does not exist';
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'wallet') INTO v_wallet_exists;
  IF NOT v_wallet_exists THEN
    RAISE EXCEPTION 'Safety Guard Failed: Target table public.wallet does not exist';
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'instapay') INTO v_instapay_exists;
  IF NOT v_instapay_exists THEN
    RAISE EXCEPTION 'Safety Guard Failed: Target table public.instapay does not exist';
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vodafone_cash') INTO v_vodafone_cash_exists;
  IF NOT v_vodafone_cash_exists THEN
    RAISE EXCEPTION 'Safety Guard Failed: Target table public.vodafone_cash does not exist';
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tournament_payments') INTO v_tournament_payments_exists;
  IF NOT v_tournament_payments_exists THEN
    RAISE EXCEPTION 'Safety Guard Failed: Target table public.tournament_payments does not exist';
  END IF;

  -- ----------------------------------------------------------------------------
  -- 3. TARGET TABLES ROW COUNT CHECK (Must be EXACTLY 0 rows)
  -- ----------------------------------------------------------------------------
  SELECT count(*) INTO v_bulk_payments_count FROM public.bulk_payments;
  IF v_bulk_payments_count != 0 THEN
    RAISE EXCEPTION 'Safety Guard Failed: public.bulk_payments has % rows (expected exactly 0)', v_bulk_payments_count;
  END IF;

  SELECT count(*) INTO v_wallet_count FROM public.wallet;
  IF v_wallet_count != 0 THEN
    RAISE EXCEPTION 'Safety Guard Failed: public.wallet has % rows (expected exactly 0)', v_wallet_count;
  END IF;

  SELECT count(*) INTO v_instapay_count FROM public.instapay;
  IF v_instapay_count != 0 THEN
    RAISE EXCEPTION 'Safety Guard Failed: public.instapay has % rows (expected exactly 0)', v_instapay_count;
  END IF;

  SELECT count(*) INTO v_vodafone_cash_count FROM public.vodafone_cash;
  IF v_vodafone_cash_count != 0 THEN
    RAISE EXCEPTION 'Safety Guard Failed: public.vodafone_cash has % rows (expected exactly 0)', v_vodafone_cash_count;
  END IF;

  SELECT count(*) INTO v_tournament_payments_count FROM public.tournament_payments;
  IF v_tournament_payments_count != 0 THEN
    RAISE EXCEPTION 'Safety Guard Failed: public.tournament_payments has % rows (expected exactly 0)', v_tournament_payments_count;
  END IF;

  RAISE NOTICE 'All Safety Guards PASSED: 6 protected tables verified, 5 target tables confirmed present and 100%% empty (0 rows). Proceeding to atomic DROP...';
END $$;

-- ------------------------------------------------------------------------------
-- 4. ATOMIC DROP TABLE STATEMENTS (Strictly NO CASCADE, NO IF EXISTS)
-- ------------------------------------------------------------------------------
DROP TABLE public.bulk_payments;
DROP TABLE public.wallet;
DROP TABLE public.instapay;
DROP TABLE public.vodafone_cash;
DROP TABLE public.tournament_payments;

COMMIT;
