/*
  # Add Platform Association to Categories

  ## Changes
  
  ### `categories` table modifications
  - Add `platform_id` (uuid, foreign key) - Links category to a platform
  - Add index for performance optimization
  
  ## Important Notes
  - Uses `IF NOT EXISTS` to prevent conflicts with existing data
  - Foreign key references platforms table with CASCADE delete
  - Nullable to maintain compatibility with existing categories
  - When a platform is deleted, associated categories are also deleted
*/

-- Add platform_id column to categories table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'platform_id'
  ) THEN
    ALTER TABLE categories ADD COLUMN platform_id uuid REFERENCES platforms(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_categories_platform_id ON categories(platform_id);