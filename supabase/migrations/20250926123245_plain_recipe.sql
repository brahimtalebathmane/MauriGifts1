/*
  # Migrate Product Categories

  1. Data Migration
    - Create default category for uncategorized products
    - Link existing products to categories based on legacy category field
    - Update products without category_id to use proper category relationships

  2. Database Constraints
    - Make category_id NOT NULL after migration
    - Add foreign key constraint to ensure data integrity
    - Add index for better query performance

  3. Data Cleanup
    - Remove legacy category column after migration
    - Ensure all products have valid category relationships
*/

-- Create default category if it doesn't exist
INSERT INTO categories (id, name, image_url, created_at)
SELECT 
  gen_random_uuid(),
  'عام',
  'https://i.postimg.cc/cLvssbLj/OIP-2.webp',
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM categories WHERE name = 'عام'
);

-- Get the default category ID
DO $$
DECLARE
  default_category_id uuid;
  pubg_category_id uuid;
  free_fire_category_id uuid;
  itunes_category_id uuid;
  psn_category_id uuid;
BEGIN
  -- Get or create category IDs
  SELECT id INTO default_category_id FROM categories WHERE name = 'عام' LIMIT 1;
  
  -- Create missing categories if they don't exist
  INSERT INTO categories (id, name, image_url, created_at)
  SELECT gen_random_uuid(), 'PUBG Mobile', 'https://i.postimg.cc/cLvssbLj/OIP-2.webp', now()
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'PUBG Mobile');
  
  INSERT INTO categories (id, name, image_url, created_at)
  SELECT gen_random_uuid(), 'Free Fire', 'https://i.postimg.cc/C52QJmpB/OIP-3.webp', now()
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Free Fire');
  
  INSERT INTO categories (id, name, image_url, created_at)
  SELECT gen_random_uuid(), 'iTunes', 'https://i.postimg.cc/QMqYvXrr/R.jpg', now()
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'iTunes');
  
  INSERT INTO categories (id, name, image_url, created_at)
  SELECT gen_random_uuid(), 'PlayStation', 'https://i.postimg.cc/bJW59mhG/OIP-4.webp', now()
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'PlayStation');
  
  -- Get category IDs
  SELECT id INTO pubg_category_id FROM categories WHERE name = 'PUBG Mobile' LIMIT 1;
  SELECT id INTO free_fire_category_id FROM categories WHERE name = 'Free Fire' LIMIT 1;
  SELECT id INTO itunes_category_id FROM categories WHERE name = 'iTunes' LIMIT 1;
  SELECT id INTO psn_category_id FROM categories WHERE name = 'PlayStation' LIMIT 1;
  
  -- Update products based on legacy category field
  UPDATE products 
  SET category_id = pubg_category_id 
  WHERE category_id IS NULL AND (category = 'pubg' OR LOWER(name) LIKE '%pubg%' OR LOWER(name) LIKE '%uc%');
  
  UPDATE products 
  SET category_id = free_fire_category_id 
  WHERE category_id IS NULL AND (category = 'free_fire' OR LOWER(name) LIKE '%free fire%' OR LOWER(name) LIKE '%diamond%');
  
  UPDATE products 
  SET category_id = itunes_category_id 
  WHERE category_id IS NULL AND (category = 'itunes' OR LOWER(name) LIKE '%itunes%' OR LOWER(name) LIKE '%apple%');
  
  UPDATE products 
  SET category_id = psn_category_id 
  WHERE category_id IS NULL AND (category = 'psn' OR LOWER(name) LIKE '%playstation%' OR LOWER(name) LIKE '%psn%');
  
  -- Update remaining products without category_id to default category
  UPDATE products 
  SET category_id = default_category_id 
  WHERE category_id IS NULL;
END $$;

-- Add foreign key constraint after migration
ALTER TABLE products 
ADD CONSTRAINT products_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

-- Make category_id NOT NULL after migration (with default)
ALTER TABLE products 
ALTER COLUMN category_id SET NOT NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- Remove legacy category column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'category'
  ) THEN
    ALTER TABLE products DROP COLUMN category;
  END IF;
END $$;