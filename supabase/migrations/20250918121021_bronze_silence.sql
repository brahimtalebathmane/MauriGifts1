/*
  # Update existing products with proper titles and meta data

  1. Updates
    - Add proper titles to existing products in meta field
    - Add amount and currency information for gaming products
    - Ensure all products have proper display titles

  2. Data Updates
    - PUBG products get UC amounts and titles
    - Free Fire products get Diamonds amounts and titles
    - iTunes and PSN products get proper titles
*/

-- Update PUBG products
UPDATE products 
SET meta = jsonb_build_object(
  'title', CASE 
    WHEN name LIKE '%30%' THEN '30 شدة'
    WHEN name LIKE '%60%' THEN '60 شدة'
    WHEN name LIKE '%120%' THEN '120 شدة'
    WHEN name LIKE '%240%' THEN '240 شدة'
    ELSE name
  END,
  'amount', CASE 
    WHEN name LIKE '%30%' THEN '30'
    WHEN name LIKE '%60%' THEN '60'
    WHEN name LIKE '%120%' THEN '120'
    WHEN name LIKE '%240%' THEN '240'
    ELSE '0'
  END,
  'currency', 'UC'
)
WHERE category = 'pubg';

-- Update Free Fire products
UPDATE products 
SET meta = jsonb_build_object(
  'title', CASE 
    WHEN name LIKE '%30%' THEN '30 جوهرة'
    WHEN name LIKE '%60%' THEN '60 جوهرة'
    WHEN name LIKE '%120%' THEN '120 جوهرة'
    WHEN name LIKE '%240%' THEN '240 جوهرة'
    ELSE name
  END,
  'amount', CASE 
    WHEN name LIKE '%30%' THEN '30'
    WHEN name LIKE '%60%' THEN '60'
    WHEN name LIKE '%120%' THEN '120'
    WHEN name LIKE '%240%' THEN '240'
    ELSE '0'
  END,
  'currency', 'Diamonds'
)
WHERE category = 'free_fire';

-- Update iTunes products
UPDATE products 
SET meta = jsonb_build_object(
  'title', CASE 
    WHEN name LIKE '%US%' THEN 'بطاقة iTunes أمريكية'
    ELSE 'بطاقة iTunes'
  END,
  'region', CASE 
    WHEN name LIKE '%US%' THEN 'US'
    ELSE 'Global'
  END
)
WHERE category = 'itunes';

-- Update PSN products
UPDATE products 
SET meta = jsonb_build_object(
  'title', CASE 
    WHEN name LIKE '%US%' THEN 'بطاقة PlayStation أمريكية'
    WHEN name LIKE '%EU%' THEN 'بطاقة PlayStation أوروبية'
    ELSE 'بطاقة PlayStation'
  END,
  'region', CASE 
    WHEN name LIKE '%US%' THEN 'US'
    WHEN name LIKE '%EU%' THEN 'EU'
    ELSE 'Global'
  END
)
WHERE category = 'psn';