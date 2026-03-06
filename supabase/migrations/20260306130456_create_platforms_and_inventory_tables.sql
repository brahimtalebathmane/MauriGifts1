/*
  # Create Platforms and Product Codes (Inventory) Tables

  ## New Tables
  
  ### `platforms`
  Platform providers (e.g., PUBG, iTunes, PlayStation, etc.)
  - `id` (uuid, primary key) - Unique platform identifier
  - `name` (text, not null) - Platform name (e.g., "PUBG Mobile", "iTunes")
  - `logo_url` (text) - URL to platform logo image
  - `website_url` (text) - Official website URL
  - `tutorial_video_url` (text) - Video tutorial URL (YouTube/direct)
  - `active` (boolean, default true) - Platform visibility status
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `product_codes`
  Digital code inventory for instant delivery
  - `id` (uuid, primary key) - Unique code identifier
  - `product_id` (uuid, foreign key) - References products table
  - `code_value` (text, not null) - The actual gift card/game code
  - `is_sold` (boolean, default false) - Sold status flag
  - `order_id` (uuid, foreign key, nullable) - Linked order when sold
  - `created_at` (timestamptz) - Creation timestamp
  - `sold_at` (timestamptz, nullable) - Timestamp when sold

  ## Security
  
  1. Row Level Security (RLS)
    - Enable RLS on both tables
    - Platforms: Public read, admin-only write
    - Product codes: Admin-only access (codes are sensitive)
  
  2. Policies
    - Public users can view active platforms
    - Only admins can create/update platforms
    - Only admins can access product_codes table
    - Strict ownership and role checks

  ## Important Notes
  - Uses `IF NOT EXISTS` to prevent conflicts
  - Includes indexes for performance optimization
  - Foreign keys ensure data integrity
  - Default values prevent null issues
*/

-- Create platforms table
CREATE TABLE IF NOT EXISTS platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  website_url text,
  tutorial_video_url text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create product_codes (inventory) table
CREATE TABLE IF NOT EXISTS product_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  code_value text NOT NULL,
  is_sold boolean DEFAULT false,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  sold_at timestamptz
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_platforms_active ON platforms(active);
CREATE INDEX IF NOT EXISTS idx_product_codes_product_id ON product_codes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_codes_is_sold ON product_codes(is_sold);
CREATE INDEX IF NOT EXISTS idx_product_codes_order_id ON product_codes(order_id);

-- Enable RLS
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_codes ENABLE ROW LEVEL SECURITY;

-- Platforms policies: Public can read active platforms
CREATE POLICY "Anyone can view active platforms"
  ON platforms
  FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can view all platforms"
  ON platforms
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert platforms"
  ON platforms
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update platforms"
  ON platforms
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete platforms"
  ON platforms
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Product codes policies: Admin-only access (sensitive data)
CREATE POLICY "Admins can view product codes"
  ON product_codes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert product codes"
  ON product_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update product codes"
  ON product_codes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete product codes"
  ON product_codes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );