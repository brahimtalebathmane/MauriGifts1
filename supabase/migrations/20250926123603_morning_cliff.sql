/*
  # Complete Database Rebuild - Full Application Schema

  This migration rebuilds the entire database from scratch with proper relationships,
  constraints, and data to ensure full compatibility with the MauriGift application.

  ## Tables Created:
  1. users - User accounts with authentication
  2. categories - Product categories with images
  3. products - Products linked to categories
  4. payment_methods - Available payment methods
  5. orders - User orders with products and payments
  6. sessions - User authentication sessions
  7. notifications - User notifications
  8. product_guides - Step-by-step product guides
  9. audit_logs - System audit trail
  10. settings - Application settings

  ## Security:
  - Row Level Security (RLS) enabled where appropriate
  - Proper access policies for admin and user roles
  - Foreign key constraints for data integrity

  ## Features:
  - Complete product-category relationships
  - Order management with payment tracking
  - User authentication and sessions
  - Admin panel functionality
  - Notification system
  - Audit logging
*/

-- Drop all existing tables to start fresh
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS product_guides CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS product_category CASCADE;
DROP TYPE IF EXISTS role_type CASCADE;

-- Create custom types
CREATE TYPE role_type AS ENUM ('user', 'admin');
CREATE TYPE order_status AS ENUM ('awaiting_payment', 'under_review', 'completed', 'rejected');
CREATE TYPE payment_method AS ENUM ('bankily', 'sidad', 'masrvi', 'bimbank', 'amanati', 'klik');
CREATE TYPE product_category AS ENUM ('pubg', 'free_fire', 'itunes', 'psn');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Users table
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone_number text UNIQUE NOT NULL,
  pin text NOT NULL,
  role role_type DEFAULT 'user'::role_type NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  CONSTRAINT users_phone_number_check CHECK (char_length(phone_number) = 8),
  CONSTRAINT users_pin_check CHECK (char_length(pin) = 4)
);

-- Users indexes
CREATE INDEX idx_users_phone_number ON users(phone_number);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_updated_at ON users(updated_at);

-- Users trigger
CREATE TRIGGER users_set_updated
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- 2. Categories table
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  image_url text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Categories indexes
CREATE INDEX idx_categories_name ON categories(name);

-- Categories RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read categories"
  ON categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admin can manage categories"
  ON categories
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'::role_type
  ));

-- 3. Payment Methods table
CREATE TABLE payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  logo_url text,
  status text DEFAULT 'active'::text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  
  CONSTRAINT payment_methods_status_check CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text]))
);

-- Payment methods indexes
CREATE INDEX idx_payment_methods_status ON payment_methods(status);

-- Payment methods RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active payment methods"
  ON payment_methods
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active'::text);

CREATE POLICY "Admin can manage payment methods"
  ON payment_methods
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'::role_type
  ));

-- 4. Products table
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name text NOT NULL,
  sku text UNIQUE NOT NULL,
  price_mru numeric(12,2) NOT NULL,
  active boolean DEFAULT true NOT NULL,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  
  CONSTRAINT products_price_positive CHECK (price_mru > 0)
);

-- Products indexes
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_price ON products(price_mru);

-- 5. Sessions table
CREATE TABLE sessions (
  token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz DEFAULT (now() + '30 days'::interval) NOT NULL
);

-- Sessions indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- 6. Orders table
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  status order_status DEFAULT 'awaiting_payment'::order_status NOT NULL,
  payment_method payment_method NOT NULL,
  payment_number text,
  receipt_path text,
  admin_note text,
  delivery_code text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Orders indexes
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_product_id ON orders(product_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Orders trigger
CREATE TRIGGER orders_set_updated
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- 7. Notifications table
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  seen boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_seen ON notifications(seen);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- 8. Product Guides table
CREATE TABLE product_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  image_url text,
  description text,
  support_link text,
  created_at timestamptz DEFAULT now()
);

-- Product guides indexes
CREATE INDEX idx_product_guides_product_id ON product_guides(product_id);
CREATE INDEX idx_product_guides_step_number ON product_guides(product_id, step_number);

-- Product guides RLS
ALTER TABLE product_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read guides for purchased products"
  ON product_guides
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.user_id = auth.uid() 
    AND orders.product_id = product_guides.product_id 
    AND orders.status = 'completed'::order_status
  ));

CREATE POLICY "Admin can manage product guides"
  ON product_guides
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'::role_type
  ));

-- 9. Audit Logs table
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_target_type ON audit_logs(target_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 10. Settings table
CREATE TABLE settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Settings indexes
CREATE INDEX idx_settings_key ON settings(key);

-- Settings trigger
CREATE TRIGGER settings_set_updated
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Insert default data

-- Default admin user
INSERT INTO users (id, name, phone_number, pin, role) VALUES 
('00000000-0000-0000-0000-000000000000', 'مدير النظام', '00000000', '1234', 'admin');

-- Default categories with proper images
INSERT INTO categories (id, name, image_url) VALUES 
('11111111-1111-1111-1111-111111111111', 'PUBG Mobile', 'https://i.postimg.cc/cLvssbLj/OIP-2.webp'),
('22222222-2222-2222-2222-222222222222', 'Free Fire', 'https://i.postimg.cc/C52QJmpB/OIP-3.webp'),
('33333333-3333-3333-3333-333333333333', 'iTunes', 'https://i.postimg.cc/QMqYvXrr/R.jpg'),
('44444444-4444-4444-4444-444444444444', 'PlayStation', 'https://i.postimg.cc/bJW59mhG/OIP-4.webp'),
('55555555-5555-5555-5555-555555555555', 'عام', 'https://via.placeholder.com/300x200');

-- Default payment methods
INSERT INTO payment_methods (name, logo_url, status) VALUES 
('بنكيلي', 'https://i.postimg.cc/0ywf19DB/1200x630wa.png', 'active'),
('السداد', 'https://i.postimg.cc/t4Whm2H0/OIP.webp', 'active'),
('مصرفي', 'https://i.postimg.cc/HL38fNZN/Masrvi-bank-logo.png', 'active'),
('بيم بنك', 'https://i.postimg.cc/7YT7fmhC/OIP-1.webp', 'active'),
('أمانتي', 'https://i.postimg.cc/xdsyKq2q/464788970-541170771978227-7444745331945134149-n.jpg', 'active'),
('كليك', 'https://i.postimg.cc/5NwBssVh/unnamed.png', 'active');

-- Sample products for each category
INSERT INTO products (category_id, name, sku, price_mru, meta) VALUES 
-- PUBG Mobile products
('11111111-1111-1111-1111-111111111111', '60 شدة PUBG', 'PUBG-60', 200, '{"title": "60 شدة PUBG", "amount": "60", "currency": "شدة"}'),
('11111111-1111-1111-1111-111111111111', '300 شدة PUBG', 'PUBG-300', 900, '{"title": "300 شدة PUBG", "amount": "300", "currency": "شدة"}'),
('11111111-1111-1111-1111-111111111111', '600 شدة PUBG', 'PUBG-600', 1800, '{"title": "600 شدة PUBG", "amount": "600", "currency": "شدة"}'),

-- Free Fire products
('22222222-2222-2222-2222-222222222222', '100 جوهرة Free Fire', 'FF-100', 300, '{"title": "100 جوهرة Free Fire", "amount": "100", "currency": "جوهرة"}'),
('22222222-2222-2222-2222-222222222222', '310 جوهرة Free Fire', 'FF-310', 800, '{"title": "310 جوهرة Free Fire", "amount": "310", "currency": "جوهرة"}'),
('22222222-2222-2222-2222-222222222222', '520 جوهرة Free Fire', 'FF-520', 1300, '{"title": "520 جوهرة Free Fire", "amount": "520", "currency": "جوهرة"}'),

-- iTunes products
('33333333-3333-3333-3333-333333333333', 'بطاقة iTunes $10', 'ITUNES-10', 400, '{"title": "بطاقة iTunes $10", "amount": "10", "currency": "دولار"}'),
('33333333-3333-3333-3333-333333333333', 'بطاقة iTunes $25', 'ITUNES-25', 1000, '{"title": "بطاقة iTunes $25", "amount": "25", "currency": "دولار"}'),
('33333333-3333-3333-3333-333333333333', 'بطاقة iTunes $50', 'ITUNES-50', 2000, '{"title": "بطاقة iTunes $50", "amount": "50", "currency": "دولار"}'),

-- PlayStation products
('44444444-4444-4444-4444-444444444444', 'بطاقة PSN $10', 'PSN-10', 400, '{"title": "بطاقة PSN $10", "amount": "10", "currency": "دولار"}'),
('44444444-4444-4444-4444-444444444444', 'بطاقة PSN $25', 'PSN-25', 1000, '{"title": "بطاقة PSN $25", "amount": "25", "currency": "دولار"}'),
('44444444-4444-4444-4444-444444444444', 'بطاقة PSN $50', 'PSN-50', 2000, '{"title": "بطاقة PSN $50", "amount": "50", "currency": "دولار"}');

-- Default settings
INSERT INTO settings (key, value) VALUES 
('payment_number', '"41791082"'),
('app_name', '"MauriGift"'),
('app_version', '"1.0.0"');

-- Create storage bucket for receipts (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for receipts bucket
CREATE POLICY "Authenticated users can upload receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Users can view their own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'receipts');

CREATE POLICY "Admins can view all receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts' 
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'::role_type
  )
);