-- Unified store setup for El7lm
-- Creates inventory and store_orders, then ensures featured support exists.
-- Safe to run multiple times.

BEGIN;

CREATE TABLE IF NOT EXISTS public.inventory (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  sku text NOT NULL,
  currency text NOT NULL DEFAULT 'SAR',
  brand text,
  model text,
  stock integer NOT NULL DEFAULT 0,
  "minStock" integer NOT NULL DEFAULT 0,
  "maxStock" integer NOT NULL DEFAULT 0,
  price numeric(12,2) NOT NULL DEFAULT 0,
  cost numeric(12,2) NOT NULL DEFAULT 0,
  description text,
  image text,
  images text[] NOT NULL DEFAULT '{}'::text[],
  featured boolean NOT NULL DEFAULT false,
  location text,
  supplier text,
  status text NOT NULL DEFAULT 'in_stock',
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_sku ON public.inventory (sku);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.inventory (category);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON public.inventory (status);
CREATE INDEX IF NOT EXISTS idx_inventory_featured ON public.inventory (featured);
CREATE INDEX IF NOT EXISTS idx_inventory_created_at ON public.inventory ("createdAt" DESC);

ALTER TABLE IF EXISTS public.inventory
ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false;

ALTER TABLE IF EXISTS public.inventory
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'SAR';

ALTER TABLE IF EXISTS public.inventory
ADD COLUMN IF NOT EXISTS brand text;

ALTER TABLE IF EXISTS public.inventory
ADD COLUMN IF NOT EXISTS model text;

ALTER TABLE IF EXISTS public.inventory
ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}'::text[];

UPDATE public.inventory
SET featured = false
WHERE featured IS NULL;

UPDATE public.inventory
SET currency = 'SAR'
WHERE currency IS NULL OR trim(currency) = '';

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_select_authenticated ON public.inventory;
CREATE POLICY inventory_select_authenticated
ON public.inventory
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS inventory_insert_admin_only ON public.inventory;
CREATE POLICY inventory_insert_admin_only
ON public.inventory
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS inventory_update_admin_only ON public.inventory;
CREATE POLICY inventory_update_admin_only
ON public.inventory
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS inventory_delete_admin_only ON public.inventory;
CREATE POLICY inventory_delete_admin_only
ON public.inventory
FOR DELETE
TO authenticated
USING (true);

CREATE TABLE IF NOT EXISTS public.store_orders (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  buyer_name text NOT NULL,
  buyer_email text,
  buyer_phone text,
  buyer_account_type text,
  product_id text NOT NULL,
  product_name text NOT NULL,
  product_category text,
  product_brand text,
  product_model text,
  product_image text,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  total_price numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'SAR',
  payment_method text,
  payment_provider text,
  payment_type text,
  installment_months integer,
  status text NOT NULL DEFAULT 'pending',
  shipping_address text,
  shipping_city text,
  shipping_country text,
  notes text,
  admin_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_orders_user_id ON public.store_orders (user_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_status ON public.store_orders (status);
CREATE INDEX IF NOT EXISTS idx_store_orders_created_at ON public.store_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_orders_payment_method ON public.store_orders (payment_method);

ALTER TABLE IF EXISTS public.store_orders
ADD COLUMN IF NOT EXISTS product_brand text;

ALTER TABLE IF EXISTS public.store_orders
ADD COLUMN IF NOT EXISTS product_model text;

ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS store_orders_select_own ON public.store_orders;
CREATE POLICY store_orders_select_own
ON public.store_orders
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS store_orders_insert_own ON public.store_orders;
CREATE POLICY store_orders_insert_own
ON public.store_orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS store_orders_update_admin_only ON public.store_orders;
CREATE POLICY store_orders_update_admin_only
ON public.store_orders
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

COMMIT;
