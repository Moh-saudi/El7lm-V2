-- Store orders table for shared marketplace

CREATE TABLE IF NOT EXISTS "store_orders" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "buyer_name" TEXT NOT NULL,
  "buyer_email" TEXT,
  "buyer_phone" TEXT,
  "buyer_account_type" TEXT,
  "product_id" TEXT NOT NULL,
  "product_name" TEXT NOT NULL,
  "product_category" TEXT,
  "product_brand" TEXT,
  "product_model" TEXT,
  "product_image" TEXT,
  "unit_price" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "total_price" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "payment_method" TEXT,
  "payment_provider" TEXT,
  "payment_type" TEXT,
  "installment_months" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "shipping_address" TEXT,
  "shipping_city" TEXT,
  "shipping_country" TEXT,
  "notes" TEXT,
  "admin_notes" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_store_orders_user_id" ON "store_orders" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_store_orders_status" ON "store_orders" ("status");
CREATE INDEX IF NOT EXISTS "idx_store_orders_created_at" ON "store_orders" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_store_orders_payment_method" ON "store_orders" ("payment_method");

ALTER TABLE IF EXISTS "store_orders" ADD COLUMN IF NOT EXISTS "product_brand" TEXT;
ALTER TABLE IF EXISTS "store_orders" ADD COLUMN IF NOT EXISTS "product_model" TEXT;

ALTER TABLE "store_orders" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_orders_select_own" ON "store_orders";
CREATE POLICY "store_orders_select_own"
ON "store_orders"
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "store_orders_insert_own" ON "store_orders";
CREATE POLICY "store_orders_insert_own"
ON "store_orders"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "store_orders_update_admin_only" ON "store_orders";
CREATE POLICY "store_orders_update_admin_only"
ON "store_orders"
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);
