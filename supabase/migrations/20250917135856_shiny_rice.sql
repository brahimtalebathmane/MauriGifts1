/*
  # Update products with proper meta data

  1. Changes
    - Update existing products with proper meta information
    - Add amount and currency information for better display
*/

-- Update PUBG products
UPDATE products SET meta = jsonb_build_object('amount', 30, 'currency', 'UC') WHERE sku = 'PUBG-30';
UPDATE products SET meta = jsonb_build_object('amount', 60, 'currency', 'UC') WHERE sku = 'PUBG-60';
UPDATE products SET meta = jsonb_build_object('amount', 120, 'currency', 'UC') WHERE sku = 'PUBG-120';
UPDATE products SET meta = jsonb_build_object('amount', 240, 'currency', 'UC') WHERE sku = 'PUBG-240';

-- Update Free Fire products
UPDATE products SET meta = jsonb_build_object('amount', 30, 'currency', 'Diamonds') WHERE sku = 'FF-30';
UPDATE products SET meta = jsonb_build_object('amount', 60, 'currency', 'Diamonds') WHERE sku = 'FF-60';
UPDATE products SET meta = jsonb_build_object('amount', 120, 'currency', 'Diamonds') WHERE sku = 'FF-120';
UPDATE products SET meta = jsonb_build_object('amount', 240, 'currency', 'Diamonds') WHERE sku = 'FF-240';

-- Update PSN and iTunes products
UPDATE products SET meta = jsonb_build_object('region', 'US', 'currency', 'USD') WHERE sku = 'PSN-US';
UPDATE products SET meta = jsonb_build_object('region', 'EU', 'currency', 'EUR') WHERE sku = 'PSN-EU';
UPDATE products SET meta = jsonb_build_object('region', 'US', 'currency', 'USD') WHERE sku = 'ITUNES-US';