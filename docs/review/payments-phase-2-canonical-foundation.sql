-- EL7LM Payments Phase 2 — Canonical Foundation
-- REVIEW ONLY. DO NOT EXECUTE UNTIL APPROVED.
-- Non-destructive foundation: no legacy live ledger is dropped or migrated here.
BEGIN;

-- Environment guards
DO $$
BEGIN
  IF to_regclass('public.players') IS NULL
     OR to_regclass('public.users') IS NULL
     OR to_regclass('public.payments') IS NULL
     OR to_regclass('public.subscriptions') IS NULL
     OR to_regclass('public.subscription_plans') IS NULL
     OR to_regclass('public.payment_settings') IS NULL
     OR to_regclass('public.invoices') IS NULL
     OR to_regclass('public.geidea_payments') IS NULL
     OR to_regclass('public."bulkPayments"') IS NULL THEN
    RAISE EXCEPTION 'Payments Phase 2 guard failed: expected production tables are missing';
  END IF;

  IF EXISTS (SELECT 1 FROM public.payments LIMIT 1) THEN
    RAISE EXCEPTION 'Payments Phase 2 guard failed: public.payments is no longer empty';
  END IF;

  IF (SELECT count(*) FROM public.players) <> 1027 THEN
    RAISE EXCEPTION 'Payments Phase 2 guard failed: players count changed; re-audit identity contract';
  END IF;

  IF EXISTS (
    SELECT id FROM public.players
    GROUP BY id HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Payments Phase 2 guard failed: players.id is not unique';
  END IF;
END $$;

-- 1) Rebuild the EMPTY payments table as the canonical ledger.
DROP TABLE public.payments;

CREATE TABLE public.payments (
  id text PRIMARY KEY,
  payer_id text NOT NULL,
  payer_type text NOT NULL CHECK (payer_type IN ('player','club','academy','trainer','agent')),
  plan_id text NULL REFERENCES public.subscription_plans(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  country_code text NULL,
  amount numeric(18,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL,
  method text NOT NULL,
  provider text NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','pending_review','processing','paid','failed','rejected','cancelled','refunded')),
  provider_transaction_id text NULL,
  provider_reference_id text NULL,
  receipt_url text NULL,
  review_status text NULL
    CHECK (review_status IS NULL OR review_status IN ('pending','approved','rejected')),
  reviewed_by text NULL,
  reviewed_at timestamptz NULL,
  rejection_reason text NULL,
  paid_at timestamptz NULL,
  source_table text NULL,
  source_id text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_source_identity_unique UNIQUE (source_table, source_id)
);

CREATE INDEX idx_payments_payer ON public.payments(payer_type, payer_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_plan_id ON public.payments(plan_id);
CREATE INDEX idx_payments_provider_reference ON public.payments(provider, provider_reference_id)
  WHERE provider_reference_id IS NOT NULL;
CREATE INDEX idx_payments_created_at ON public.payments(created_at DESC);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 2) One payment can benefit one or many players.
CREATE TABLE public.payment_targets (
  id text PRIMARY KEY,
  payment_id text NOT NULL REFERENCES public.payments(id) ON UPDATE CASCADE ON DELETE CASCADE,
  target_player_id text NOT NULL REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  amount_allocated numeric(18,2) NULL CHECK (amount_allocated IS NULL OR amount_allocated >= 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','failed','cancelled','refunded')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_targets_payment_player_unique UNIQUE (payment_id, target_player_id)
);

CREATE INDEX idx_payment_targets_player ON public.payment_targets(target_player_id);
CREATE INDEX idx_payment_targets_payment ON public.payment_targets(payment_id);
ALTER TABLE public.payment_targets ENABLE ROW LEVEL SECURITY;

-- 3) Build normalized subscription history alongside the legacy table.
-- We intentionally do NOT rename/drop public.subscriptions yet.
CREATE TABLE public.subscriptions_v2 (
  id text PRIMARY KEY,
  player_id text NULL REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  plan_id text NULL REFERENCES public.subscription_plans(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  payment_id text NULL REFERENCES public.payments(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending','active','expired','cancelled','refunded')),
  starts_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  activated_at timestamptz NULL,
  cancelled_at timestamptz NULL,
  auto_renew boolean NOT NULL DEFAULT false,
  amount numeric(18,2) NULL CHECK (amount IS NULL OR amount >= 0),
  currency text NULL,
  legacy_subscription_id text NULL UNIQUE,
  legacy_subject_id text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_v2_dates_valid CHECK (expires_at > starts_at)
);

CREATE INDEX idx_subscriptions_v2_player_status ON public.subscriptions_v2(player_id, status);
CREATE INDEX idx_subscriptions_v2_payment ON public.subscriptions_v2(payment_id);
CREATE INDEX idx_subscriptions_v2_expires ON public.subscriptions_v2(expires_at);
ALTER TABLE public.subscriptions_v2 ENABLE ROW LEVEL SECURITY;

-- No subscription data is copied in Phase 2 foundation.
-- Reason: 27/30 legacy IDs map directly to players.id; 3 must be preserved and classified
-- before any canonical subscription backfill.

-- Verification before commit
DO $$
BEGIN
  IF to_regclass('public.payment_targets') IS NULL
     OR to_regclass('public.subscriptions_v2') IS NULL THEN
    RAISE EXCEPTION 'Payments Phase 2 verification failed: canonical foundation tables missing';
  END IF;

  IF EXISTS (SELECT 1 FROM public.payments LIMIT 1)
     OR EXISTS (SELECT 1 FROM public.payment_targets LIMIT 1)
     OR EXISTS (SELECT 1 FROM public.subscriptions_v2 LIMIT 1) THEN
    RAISE EXCEPTION 'Payments Phase 2 verification failed: foundation tables must start empty';
  END IF;

  IF (SELECT count(*) FROM public.subscriptions) <> 30 THEN
    RAISE EXCEPTION 'Payments Phase 2 verification failed: legacy subscriptions count changed';
  END IF;

  IF (SELECT count(*) FROM public."bulkPayments") <> 49
     OR (SELECT count(*) FROM public.geidea_payments) <> 99
     OR (SELECT count(*) FROM public.invoices) <> 22 THEN
    RAISE EXCEPTION 'Payments Phase 2 verification failed: protected payment ledger counts changed';
  END IF;
END $$;

COMMIT;
