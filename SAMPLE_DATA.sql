-- MauriPlay Sample Data for Testing
-- Run this SQL to populate the database with sample platforms, categories, and products

-- ===================================
-- 1. INSERT SAMPLE PLATFORMS
-- ===================================

INSERT INTO platforms (name, logo_url, website_url, tutorial_video_url, active) VALUES
('PUBG Mobile', 'https://example.com/logos/pubg.png', 'https://www.pubgmobile.com', 'https://www.youtube.com/watch?v=sample', true),
('Free Fire', 'https://example.com/logos/freefire.png', 'https://ff.garena.com', 'https://www.youtube.com/watch?v=sample', true),
('iTunes', 'https://example.com/logos/itunes.png', 'https://www.apple.com/itunes', 'https://www.youtube.com/watch?v=sample', true),
('PlayStation Network', 'https://example.com/logos/psn.png', 'https://www.playstation.com', 'https://www.youtube.com/watch?v=sample', true),
('Google Play', 'https://example.com/logos/googleplay.png', 'https://play.google.com', 'https://www.youtube.com/watch?v=sample', true)
ON CONFLICT DO NOTHING;

-- ===================================
-- 2. LINK EXISTING CATEGORIES TO PLATFORMS
-- ===================================

-- Get platform IDs and update categories
-- Note: Replace the category names with your actual category names

DO $$
DECLARE
  pubg_platform_id uuid;
  freefire_platform_id uuid;
  itunes_platform_id uuid;
  psn_platform_id uuid;
  googleplay_platform_id uuid;
BEGIN
  -- Get platform IDs
  SELECT id INTO pubg_platform_id FROM platforms WHERE name = 'PUBG Mobile' LIMIT 1;
  SELECT id INTO freefire_platform_id FROM platforms WHERE name = 'Free Fire' LIMIT 1;
  SELECT id INTO itunes_platform_id FROM platforms WHERE name = 'iTunes' LIMIT 1;
  SELECT id INTO psn_platform_id FROM platforms WHERE name = 'PlayStation Network' LIMIT 1;
  SELECT id INTO googleplay_platform_id FROM platforms WHERE name = 'Google Play' LIMIT 1;

  -- Update categories with platform_id (adjust category names as needed)
  UPDATE categories SET platform_id = pubg_platform_id WHERE name ILIKE '%pubg%';
  UPDATE categories SET platform_id = freefire_platform_id WHERE name ILIKE '%free fire%';
  UPDATE categories SET platform_id = itunes_platform_id WHERE name ILIKE '%itunes%' OR name ILIKE '%apple%';
  UPDATE categories SET platform_id = psn_platform_id WHERE name ILIKE '%playstation%' OR name ILIKE '%psn%';
  UPDATE categories SET platform_id = googleplay_platform_id WHERE name ILIKE '%google%' OR name ILIKE '%play store%';
END $$;

-- ===================================
-- 3. INSERT SAMPLE PRODUCT CODES (for testing)
-- ===================================

-- First, let's get a sample product ID
-- You'll need to replace this with actual product IDs from your database

DO $$
DECLARE
  sample_product_id uuid;
BEGIN
  -- Get the first active product
  SELECT id INTO sample_product_id FROM products WHERE active = true LIMIT 1;

  -- Insert 10 sample codes for this product
  IF sample_product_id IS NOT NULL THEN
    INSERT INTO product_codes (product_id, code_value, is_sold) VALUES
    (sample_product_id, 'AAAA-BBBB-CCCC-DD01', false),
    (sample_product_id, 'AAAA-BBBB-CCCC-DD02', false),
    (sample_product_id, 'AAAA-BBBB-CCCC-DD03', false),
    (sample_product_id, 'AAAA-BBBB-CCCC-DD04', false),
    (sample_product_id, 'AAAA-BBBB-CCCC-DD05', false),
    (sample_product_id, 'AAAA-BBBB-CCCC-DD06', false),
    (sample_product_id, 'AAAA-BBBB-CCCC-DD07', false),
    (sample_product_id, 'AAAA-BBBB-CCCC-DD08', false),
    (sample_product_id, 'AAAA-BBBB-CCCC-DD09', false),
    (sample_product_id, 'AAAA-BBBB-CCCC-DD10', false)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Inserted 10 sample codes for product: %', sample_product_id;
  ELSE
    RAISE NOTICE 'No active products found. Please create products first.';
  END IF;
END $$;

-- ===================================
-- 4. VERIFICATION QUERIES
-- ===================================

-- Check platforms
SELECT 'Platforms Count' as info, COUNT(*) as count FROM platforms;

-- Check categories with platforms
SELECT 'Categories with Platform' as info, COUNT(*) as count
FROM categories WHERE platform_id IS NOT NULL;

-- Check product codes
SELECT 'Available Product Codes' as info, COUNT(*) as count
FROM product_codes WHERE is_sold = false;

-- Detailed view of inventory
SELECT
  p.name as platform,
  c.name as category,
  pr.name as product,
  pr.sku,
  COUNT(pc.id) as available_codes
FROM platforms p
LEFT JOIN categories c ON c.platform_id = p.id
LEFT JOIN products pr ON pr.category_id = c.id
LEFT JOIN product_codes pc ON pc.product_id = pr.id AND pc.is_sold = false
GROUP BY p.name, c.name, pr.name, pr.sku
ORDER BY p.name, c.name, pr.name;

-- ===================================
-- NOTES
-- ===================================

-- To insert codes for a specific product, use this pattern:
/*
INSERT INTO product_codes (product_id, code_value, is_sold) VALUES
('your-product-uuid-here', 'CODE-HERE-0001', false),
('your-product-uuid-here', 'CODE-HERE-0002', false),
('your-product-uuid-here', 'CODE-HERE-0003', false);
*/

-- To check stock for a specific product:
/*
SELECT COUNT(*) as available_stock
FROM product_codes
WHERE product_id = 'your-product-uuid' AND is_sold = false;
*/

-- To see which codes have been sold:
/*
SELECT
  pc.code_value,
  pc.sold_at,
  o.id as order_id,
  o.status,
  u.name as customer_name
FROM product_codes pc
JOIN orders o ON o.id = pc.order_id
JOIN users u ON u.id = o.user_id
WHERE pc.is_sold = true
ORDER BY pc.sold_at DESC;
*/
