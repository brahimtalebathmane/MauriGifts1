/*
  # Complete Database Reset and Rebuild
  
  This migration completely drops all existing tables and rebuilds the entire database
  from scratch to ensure full compatibility with the MauriGift application.
  
  ## What this migration does:
  1. Drops all existing tables, functions, and policies
  2. Creates fresh schema with proper relationships
  3. Inserts default data for immediate functionality
  4. Sets up proper security policies
  5. Creates optimized indexes
  
  ## Tables Created:
  - users (authentication and user management)
  - categories (product categories)
  - products (linked to categories)
  - payment_methods (available payment options)
  - orders (user orders with proper relationships)
  - sessions (user authentication sessions)
  - notifications (user notifications)
  - product_guides (step-by-step product guides)
  - audit_logs (system activity tracking)
  - settings (application configuration)
*/

-- Drop all existing tables and dependencies
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

-- Drop existing functions
DROP FUNCTION IF EXISTS set_updated_at() CASCADE;

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

-- 2. Categories table
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  image_url text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 3. Payment Methods table
CREATE TABLE payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  logo_url text,
  status text DEFAULT 'active'::text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  
  CONSTRAINT payment_methods_status_check CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text]))
);

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

-- 5. Sessions table
CREATE TABLE sessions (
  token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz DEFAULT (now() + '30 days'::interval) NOT NULL
);

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

-- 8. Product Guides table
CREATE TABLE product_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  image_url text,
  description text,
  support_link text,
  created_at timestamptz DEFAULT now() NOT NULL
);

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

-- 10. Settings table
CREATE TABLE settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_users_phone_number ON users(phone_number);
CREATE INDEX idx_users_updated_at ON users(updated_at);
CREATE INDEX idx_categories_name ON categories(name);
CREATE INDEX idx_payment_methods_status ON payment_methods(status);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_product_id ON orders(product_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_seen ON notifications(seen);
CREATE INDEX idx_product_guides_product_id ON product_guides(product_id);
CREATE INDEX idx_product_guides_step_number ON product_guides(product_id, step_number);
CREATE INDEX idx_settings_key ON settings(key);

-- Create updated_at triggers
CREATE TRIGGER users_set_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER orders_set_updated BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER settings_set_updated BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_guides ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Public can read categories" ON categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin can manage categories" ON categories FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'::role_type)
);

CREATE POLICY "Public can read active payment methods" ON payment_methods FOR SELECT TO anon, authenticated USING (status = 'active'::text);
CREATE POLICY "Admin can manage payment methods" ON payment_methods FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'::role_type)
);

CREATE POLICY "Users can read guides for purchased products" ON product_guides FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.user_id = auth.uid() AND orders.product_id = product_guides.product_id AND orders.status = 'completed'::order_status)
);
CREATE POLICY "Admin can manage product guides" ON product_guides FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'::role_type)
);

-- Insert default data

-- 1. Insert default admin user
INSERT INTO users (name, phone_number, pin, role) VALUES 
('مدير النظام', '00000000', '1234', 'admin');

-- 2. Insert categories with proper images
INSERT INTO categories (name, image_url) VALUES 
('PUBG Mobile', 'https://i.postimg.cc/cLvssbLj/OIP-2.webp'),
('Free Fire', 'https://i.postimg.cc/C52QJmpB/OIP-3.webp'),
('iTunes', 'https://i.postimg.cc/QMqYvXrr/R.jpg'),
('PlayStation', 'https://i.postimg.cc/bJW59mhG/OIP-4.webp'),
('عام', 'https://via.placeholder.com/300x200?text=General');

-- 3. Insert payment methods with logos
INSERT INTO payment_methods (name, logo_url, status) VALUES 
('بنكيلي', 'https://i.postimg.cc/0ywf19DB/1200x630wa.png', 'active'),
('السداد', 'https://i.postimg.cc/t4Whm2H0/OIP.webp', 'active'),
('مصرفي', 'https://i.postimg.cc/HL38fNZN/Masrvi-bank-logo.png', 'active'),
('بيم بنك', 'https://i.postimg.cc/7YT7fmhC/OIP-1.webp', 'active'),
('أمانتي', 'https://i.postimg.cc/xdsyKq2q/464788970-541170771978227-7444745331945134149-n.jpg', 'active'),
('كليك', 'https://i.postimg.cc/5NwBssVh/unnamed.png', 'active');

-- 4. Insert sample products for each category
WITH category_ids AS (
  SELECT id, name FROM categories
)
INSERT INTO products (category_id, name, sku, price_mru, meta, active) 
SELECT 
  c.id,
  CASE 
    WHEN c.name = 'PUBG Mobile' THEN p.name
    WHEN c.name = 'Free Fire' THEN p.name
    WHEN c.name = 'iTunes' THEN p.name
    WHEN c.name = 'PlayStation' THEN p.name
    ELSE p.name
  END,
  p.sku,
  p.price,
  p.meta::jsonb,
  true
FROM category_ids c
CROSS JOIN (
  VALUES 
    ('60 شدة', 'PUBG-60', 200, '{"title": "60 شدة", "amount": "60", "currency": "شدة"}'),
    ('300 شدة', 'PUBG-300', 800, '{"title": "300 شدة", "amount": "300", "currency": "شدة"}'),
    ('600 شدة', 'PUBG-600', 1500, '{"title": "600 شدة", "amount": "600", "currency": "شدة"}')
) AS p(name, sku, price, meta)
WHERE c.name = 'PUBG Mobile'

UNION ALL

SELECT 
  c.id,
  p.name,
  p.sku,
  p.price,
  p.meta::jsonb,
  true
FROM category_ids c
CROSS JOIN (
  VALUES 
    ('100 جوهرة', 'FF-100', 250, '{"title": "100 جوهرة", "amount": "100", "currency": "جوهرة"}'),
    ('500 جوهرة', 'FF-500', 1000, '{"title": "500 جوهرة", "amount": "500", "currency": "جوهرة"}'),
    ('1000 جوهرة', 'FF-1000', 1800, '{"title": "1000 جوهرة", "amount": "1000", "currency": "جوهرة"}')
) AS p(name, sku, price, meta)
WHERE c.name = 'Free Fire'

UNION ALL

SELECT 
  c.id,
  p.name,
  p.sku,
  p.price,
  p.meta::jsonb,
  true
FROM category_ids c
CROSS JOIN (
  VALUES 
    ('بطاقة iTunes 10$', 'ITUNES-10', 400, '{"title": "بطاقة iTunes 10$", "amount": "10", "currency": "دولار"}'),
    ('بطاقة iTunes 25$', 'ITUNES-25', 900, '{"title": "بطاقة iTunes 25$", "amount": "25", "currency": "دولار"}'),
    ('بطاقة iTunes 50$', 'ITUNES-50', 1700, '{"title": "بطاقة iTunes 50$", "amount": "50", "currency": "دولار"}')
) AS p(name, sku, price, meta)
WHERE c.name = 'iTunes'

UNION ALL

SELECT 
  c.id,
  p.name,
  p.sku,
  p.price,
  p.meta::jsonb,
  true
FROM category_ids c
CROSS JOIN (
  VALUES 
    ('بطاقة PSN 10$', 'PSN-10', 400, '{"title": "بطاقة PSN 10$", "amount": "10", "currency": "دولار"}'),
    ('بطاقة PSN 25$', 'PSN-25', 900, '{"title": "بطاقة PSN 25$", "amount": "25", "currency": "دولار"}'),
    ('بطاقة PSN 50$', 'PSN-50', 1700, '{"title": "بطاقة PSN 50$", "amount": "50", "currency": "دولار"}')
) AS p(name, sku, price, meta)
WHERE c.name = 'PlayStation';

-- 5. Insert default settings
INSERT INTO settings (key, value) VALUES 
('payment_number', '"41791082"'),
('app_name', '"MauriGift"'),
('app_version', '"1.0.0"');

-- Create storage bucket for receipts (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for receipts
CREATE POLICY "Users can upload receipts" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own receipts" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all receipts" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'receipts' AND EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'::role_type
  )
);