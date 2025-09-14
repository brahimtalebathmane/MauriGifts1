/*
# MauriGift Database Schema

Complete database schema for MauriGift gift card application including:

1. New Tables
   - `users` - User accounts with phone/PIN authentication
   - `sessions` - Custom session management (no Supabase Auth)
   - `products` - Gift card products by category
   - `orders` - Purchase orders with payment tracking
   - `notifications` - User notifications
   - `audit_logs` - Admin action tracking

2. Security
   - Disabled RLS (authorization handled in Edge Functions)
   - Input validation via constraints
   - Foreign key relationships

3. Data Seeding
   - Admin user account
   - Product catalog for all categories
*/

-- Create custom types
CREATE TYPE role_type AS ENUM ('user', 'admin');
CREATE TYPE order_status AS ENUM ('awaiting_payment', 'under_review', 'completed', 'rejected');
CREATE TYPE payment_method AS ENUM ('bankily', 'sidad', 'masrvi', 'bimbank', 'amanati', 'klik');
CREATE TYPE product_category AS ENUM ('pubg', 'free_fire', 'itunes', 'psn');

-- Users table with plain-text PIN storage as requested
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL UNIQUE CHECK (char_length(phone_number) = 8),
  pin TEXT NOT NULL CHECK (char_length(pin) = 4),
  role role_type NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Custom session management (not using Supabase Auth)
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days')
);

-- Product catalog
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category product_category NOT NULL,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  price_mru NUMERIC(12,2) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Order management
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  status order_status NOT NULL DEFAULT 'awaiting_payment',
  payment_method payment_method NOT NULL,
  payment_number TEXT,
  receipt_path TEXT,
  admin_note TEXT,
  delivery_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  seen BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admin audit trail
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for updating timestamps
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

-- Apply triggers
DROP TRIGGER IF EXISTS users_set_updated ON users;
CREATE TRIGGER users_set_updated 
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS orders_set_updated ON orders;
CREATE TRIGGER orders_set_updated 
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed admin user
INSERT INTO users (id, name, phone_number, pin, role)
VALUES (gen_random_uuid(), 'Admin', '00000000', '1234', 'admin')
ON CONFLICT (phone_number) DO NOTHING;

-- Seed product catalog
INSERT INTO products (category, name, sku, price_mru, active, meta) VALUES
-- PUBG Products
('pubg', 'PUBG 30 شدة', 'PUBG-30', 100.00, true, '{"amount": 30, "currency": "UC"}'),
('pubg', 'PUBG 60 شدة', 'PUBG-60', 200.00, true, '{"amount": 60, "currency": "UC"}'),
('pubg', 'PUBG 120 شدة', 'PUBG-120', 400.00, true, '{"amount": 120, "currency": "UC"}'),
('pubg', 'PUBG 240 شدة', 'PUBG-240', 800.00, true, '{"amount": 240, "currency": "UC"}'),

-- Free Fire Products
('free_fire', 'Free Fire 30 جوهرة', 'FF-30', 100.00, true, '{"amount": 30, "currency": "Diamonds"}'),
('free_fire', 'Free Fire 60 جوهرة', 'FF-60', 200.00, true, '{"amount": 60, "currency": "Diamonds"}'),
('free_fire', 'Free Fire 120 جوهرة', 'FF-120', 400.00, true, '{"amount": 120, "currency": "Diamonds"}'),
('free_fire', 'Free Fire 240 جوهرة', 'FF-240', 800.00, true, '{"amount": 240, "currency": "Diamonds"}'),

-- PlayStation Products
('psn', 'PlayStation US Card', 'PSN-US', 1000.00, true, '{"region": "US", "currency": "USD"}'),
('psn', 'PlayStation EU Card', 'PSN-EU', 1000.00, true, '{"region": "EU", "currency": "EUR"}'),

-- iTunes Products
('itunes', 'iTunes US Card', 'ITUNES-US', 1000.00, true, '{"region": "US", "currency": "USD"}')

ON CONFLICT (sku) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_seen ON notifications(seen);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);

-- Disable RLS (authorization handled in Edge Functions)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;