/*
  # Admin Dashboard Features

  1. New Tables
    - `categories` - Product categories management
    - `payment_methods` - Payment methods management  
    - `product_guides` - Post-sale support guides per product

  2. Security
    - Enable RLS on all new tables
    - Add policies for admin-only access

  3. Updates
    - Add category_id to products table
    - Update existing data structure
*/

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text,
  created_at timestamptz DEFAULT now()
);

-- Payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

-- Product guides table
CREATE TABLE IF NOT EXISTS product_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  image_url text,
  description text,
  support_link text,
  created_at timestamptz DEFAULT now()
);

-- Add category_id to products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE products ADD COLUMN category_id uuid REFERENCES categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_guides ENABLE ROW LEVEL SECURITY;

-- Admin-only policies for categories
CREATE POLICY "Admin can manage categories"
  ON categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Admin-only policies for payment methods
CREATE POLICY "Admin can manage payment methods"
  ON payment_methods
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Admin-only policies for product guides
CREATE POLICY "Admin can manage product guides"
  ON product_guides
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Public read access for active payment methods
CREATE POLICY "Public can read active payment methods"
  ON payment_methods
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

-- Public read access for categories
CREATE POLICY "Public can read categories"
  ON categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Users can read product guides for purchased products
CREATE POLICY "Users can read guides for purchased products"
  ON product_guides
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.user_id = auth.uid() 
      AND orders.product_id = product_guides.product_id
      AND orders.status = 'completed'
    )
  );

-- Insert default categories
INSERT INTO categories (name) VALUES 
  ('PUBG Mobile'),
  ('Free Fire'),
  ('iTunes'),
  ('PlayStation'),
  ('Uncategorized')
ON CONFLICT DO NOTHING;

-- Insert default payment methods
INSERT INTO payment_methods (name, logo_url, status) VALUES 
  ('بنكيلي', 'https://i.postimg.cc/0ywf19DB/1200x630wa.png', 'active'),
  ('السداد', 'https://i.postimg.cc/t4Whm2H0/OIP.webp', 'active'),
  ('بيم بنك', 'https://i.postimg.cc/7YT7fmhC/OIP-1.webp', 'active'),
  ('مصرفي', 'https://i.postimg.cc/HL38fNZN/Masrvi-bank-logo.png', 'active'),
  ('أمانتي', 'https://i.postimg.cc/xdsyKq2q/464788970-541170771978227-7444745331945134149-n.jpg', 'active'),
  ('كليك', 'https://i.postimg.cc/5NwBssVh/unnamed.png', 'active')
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_payment_methods_status ON payment_methods(status);
CREATE INDEX IF NOT EXISTS idx_product_guides_product_id ON product_guides(product_id);
CREATE INDEX IF NOT EXISTS idx_product_guides_step_number ON product_guides(product_id, step_number);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);