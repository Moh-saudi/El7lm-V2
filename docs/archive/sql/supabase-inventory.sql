-- Inventory table for store products

CREATE TABLE IF NOT EXISTS "inventory" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'other',
  "sku" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "brand" TEXT,
  "model" TEXT,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "minStock" INTEGER NOT NULL DEFAULT 0,
  "maxStock" INTEGER NOT NULL DEFAULT 0,
  "price" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "cost" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "description" TEXT,
  "image" TEXT,
  "images" TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  "featured" BOOLEAN NOT NULL DEFAULT FALSE,
  "location" TEXT,
  "supplier" TEXT,
  "status" TEXT NOT NULL DEFAULT 'in_stock',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_inventory_sku" ON "inventory" ("sku");
CREATE INDEX IF NOT EXISTS "idx_inventory_category" ON "inventory" ("category");
CREATE INDEX IF NOT EXISTS "idx_inventory_status" ON "inventory" ("status");
CREATE INDEX IF NOT EXISTS "idx_inventory_featured" ON "inventory" ("featured");
CREATE INDEX IF NOT EXISTS "idx_inventory_created_at" ON "inventory" ("createdAt" DESC);

ALTER TABLE IF EXISTS "inventory" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'SAR';
ALTER TABLE IF EXISTS "inventory" ADD COLUMN IF NOT EXISTS "brand" TEXT;
ALTER TABLE IF EXISTS "inventory" ADD COLUMN IF NOT EXISTS "model" TEXT;
ALTER TABLE IF EXISTS "inventory" ADD COLUMN IF NOT EXISTS "images" TEXT[] DEFAULT '{}'::TEXT[];

UPDATE "inventory"
SET "currency" = 'SAR'
WHERE "currency" IS NULL OR TRIM("currency") = '';

ALTER TABLE "inventory" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_select_authenticated" ON "inventory";
CREATE POLICY "inventory_select_authenticated"
ON "inventory"
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "inventory_insert_admin_only" ON "inventory";
CREATE POLICY "inventory_insert_admin_only"
ON "inventory"
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "inventory_update_admin_only" ON "inventory";
CREATE POLICY "inventory_update_admin_only"
ON "inventory"
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "inventory_delete_admin_only" ON "inventory";
CREATE POLICY "inventory_delete_admin_only"
ON "inventory"
FOR DELETE
TO authenticated
USING (true);
