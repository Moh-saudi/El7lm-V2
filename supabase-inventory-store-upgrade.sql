-- ══════════════════════════════════════════════════════════════
--  Migration: Store Upgrade — Flash Sale, Discount & Featured
--  Run this in: Supabase Dashboard → SQL Editor → New Query
--  Date: 2026-04-17
-- ══════════════════════════════════════════════════════════════

-- ── STEP 1: Handle "featured" → "is_featured" safely ──────────
-- Check if old column exists and rename it, otherwise add fresh
DO $$
BEGIN
  -- If old name "featured" exists → rename it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'inventory'
      AND column_name  = 'featured'
  ) THEN
    ALTER TABLE public.inventory RENAME COLUMN featured TO is_featured;
    RAISE NOTICE 'Column "featured" renamed to "is_featured"';

  -- If neither exists → add it fresh
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'inventory'
      AND column_name  = 'is_featured'
  ) THEN
    ALTER TABLE public.inventory ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT FALSE;
    RAISE NOTICE 'Column "is_featured" added fresh';

  ELSE
    RAISE NOTICE 'Column "is_featured" already exists — skipping';
  END IF;
END $$;

-- ── STEP 2: Original price (السعر الأصلي قبل الخصم) ──────────
ALTER TABLE IF EXISTS public.inventory
  ADD COLUMN IF NOT EXISTS original_price NUMERIC(12,2);

-- ── STEP 3: Discount percentage (نسبة الخصم %) ──────────────
ALTER TABLE IF EXISTS public.inventory
  ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 0
    CONSTRAINT chk_discount_range CHECK (discount_percent >= 0 AND discount_percent <= 100);

-- ── STEP 4: Flash sale end timestamp (وقت انتهاء الفلاش سيل) ─
ALTER TABLE IF EXISTS public.inventory
  ADD COLUMN IF NOT EXISTS flash_sale_end_at TIMESTAMPTZ;

-- ── STEP 5: Performance indexes ─────────────────────────────
CREATE INDEX IF NOT EXISTS idx_inventory_is_featured
  ON public.inventory (is_featured)
  WHERE is_featured = TRUE;

CREATE INDEX IF NOT EXISTS idx_inventory_flash_sale
  ON public.inventory (flash_sale_end_at)
  WHERE flash_sale_end_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_discount
  ON public.inventory (discount_percent)
  WHERE discount_percent > 0;

-- ── STEP 6: Verify result ─────────────────────────────────────
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'inventory'
ORDER BY ordinal_position;
