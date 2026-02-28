/*
  # Fix Enums, Indexes, and Row Level Security (v4)

  1. Enum Types
    - Creates missing enum types: `order_status`, `role_type`, `payment_method_type`
    - Drops ALL conflicting policies (including storage schema) before converting columns
    - Converts existing columns to use proper enum types

  2. Performance Improvements
    - Adds indexes on foreign keys for better query performance

  3. Auto-Update Timestamps
    - Creates trigger function to automatically update `updated_at` column
    - Adds triggers to relevant tables

  4. Security (RLS)
    - Enables Row Level Security on all tables
    - Recreates all policies after enum conversion
*/

-- =============================
-- 1) CREATE MISSING ENUM TYPES
-- =============================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM (
      'awaiting_payment',
      'paid',
      'processing',
      'delivered',
      'cancelled'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_type') THEN
    CREATE TYPE role_type AS ENUM (
      'user',
      'admin'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_type') THEN
    CREATE TYPE payment_method_type AS ENUM (
      'bankily',
      'sedad',
      'cash'
    );
  END IF;
END$$;

-- =============================
-- 2) DROP ALL POLICIES THAT DEPEND ON COLUMNS WE'LL CHANGE
-- =============================

-- Drop all policies on public schema tables
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname IN ('public', 'storage')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
      r.policyname, r.schemaname, r.tablename);
  END LOOP;
END$$;

-- =============================
-- 3) FIX COLUMNS USING ENUMS
-- =============================

ALTER TABLE public.users
  ALTER COLUMN role TYPE role_type
  USING role::text::role_type;

ALTER TABLE public.orders
  ALTER COLUMN status TYPE order_status
  USING status::text::order_status;

ALTER TABLE public.orders
  ALTER COLUMN payment_method TYPE payment_method_type
  USING payment_method::text::payment_method_type;

-- =============================
-- 4) PERFORMANCE INDEXES
-- =============================

CREATE INDEX IF NOT EXISTS idx_sessions_user_id
  ON public.sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_orders_user_id
  ON public.orders(user_id);

CREATE INDEX IF NOT EXISTS idx_orders_product_id
  ON public.orders(product_id);

CREATE INDEX IF NOT EXISTS idx_products_category_id
  ON public.products(category_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON public.notifications(user_id);

-- =============================
-- 5) AUTO UPDATE updated_at
-- =============================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_settings_updated_at ON public.settings;
CREATE TRIGGER trg_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================
-- 6) ENABLE ROW LEVEL SECURITY
-- =============================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- =============================
-- 7) HELPER FUNCTION FOR ADMIN CHECK
-- =============================

CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id AND role = 'admin'::role_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================
-- 8) RECREATE ALL POLICIES
-- =============================

-- users policies
CREATE POLICY "Users can view own data"
ON public.users
FOR SELECT
USING (auth.uid() = id OR is_admin(auth.uid()));

CREATE POLICY "Users can update own data"
ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND role = 'user'::role_type);

CREATE POLICY "Admin can manage all users"
ON public.users
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- sessions policies
CREATE POLICY "Users can manage own sessions"
ON public.sessions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- orders policies
CREATE POLICY "Users can view own orders"
ON public.orders
FOR SELECT
USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Users can create own orders"
ON public.orders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can update orders"
ON public.orders
FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admin can delete orders"
ON public.orders
FOR DELETE
USING (is_admin(auth.uid()));

-- notifications policies
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- categories policies
CREATE POLICY "Anyone can view categories"
ON public.categories
FOR SELECT
USING (true);

CREATE POLICY "Admin can manage categories"
ON public.categories
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- products policies
CREATE POLICY "Anyone can view products"
ON public.products
FOR SELECT
USING (true);

CREATE POLICY "Admin can manage products"
ON public.products
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- product_guides policies
CREATE POLICY "Anyone can view product guides"
ON public.product_guides
FOR SELECT
USING (true);

CREATE POLICY "Admin can manage product guides"
ON public.product_guides
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- payment_methods policies
CREATE POLICY "Anyone can view payment methods"
ON public.payment_methods
FOR SELECT
USING (true);

CREATE POLICY "Admin can manage payment methods"
ON public.payment_methods
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- settings policies
CREATE POLICY "Anyone can view settings"
ON public.settings
FOR SELECT
USING (true);

CREATE POLICY "Admin can manage settings"
ON public.settings
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- storage policies (recreate the receipts policy)
CREATE POLICY "Users can upload own receipts"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'receipts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own receipts"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'receipts' AND
  (auth.uid()::text = (storage.foldername(name))[1] OR is_admin(auth.uid()))
);

CREATE POLICY "Admins can view all receipts"
ON storage.objects
FOR SELECT
USING (bucket_id = 'receipts' AND is_admin(auth.uid()));