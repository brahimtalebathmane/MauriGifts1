/*
  # Fix Product Category Relationships

  1. Data Migration
    - Update products without category_id to link them to existing categories
    - Ensure all products have proper category relationships
  
  2. Data Integrity
    - Add constraints to prevent orphaned products
    - Ensure category_id references valid categories
*/

-- First, let's see if we have products without category_id that have the old 'category' field
UPDATE products 
SET category_id = (
  SELECT c.id 
  FROM categories c 
  WHERE c.name = products.category
)
WHERE category_id IS NULL 
AND category IS NOT NULL
AND EXISTS (
  SELECT 1 FROM categories c WHERE c.name = products.category
);

-- For any remaining products without category_id, create a default category if needed
DO $$
BEGIN
  -- Check if we have a default/general category
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'عام') THEN
    INSERT INTO categories (name, image_url) 
    VALUES ('عام', 'https://via.placeholder.com/300x200?text=General');
  END IF;
END $$;

-- Link remaining uncategorized products to the general category
UPDATE products 
SET category_id = (
  SELECT id FROM categories WHERE name = 'عام' LIMIT 1
)
WHERE category_id IS NULL;

-- Ensure all products have a valid category_id (make it NOT NULL)
ALTER TABLE products 
ALTER COLUMN category_id SET NOT NULL;

-- Add a foreign key constraint to ensure data integrity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'products_category_id_fkey' 
    AND table_name = 'products'
  ) THEN
    ALTER TABLE products 
    ADD CONSTRAINT products_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_products_category_id_active 
ON products(category_id, active) 
WHERE active = true;