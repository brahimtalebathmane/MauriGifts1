/*
  # Add updated_at trigger for users table

  1. Changes
    - Add updated_at column to users table if not exists
    - Create trigger to automatically update updated_at on user changes
    - Add settings table for global app configuration
*/

-- Add updated_at column to users if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE users ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

-- Create trigger for users table
DROP TRIGGER IF EXISTS users_set_updated ON users;
CREATE TRIGGER users_set_updated 
  BEFORE UPDATE ON users
  FOR EACH ROW 
  EXECUTE FUNCTION set_updated_at();

-- Create settings table for global configuration
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert default settings
INSERT INTO settings (key, value) VALUES
  ('payment_number', '"41791082"'),
  ('app_name', '"MauriGift"'),
  ('app_version', '"1.0.0"')
ON CONFLICT (key) DO NOTHING;

-- Add trigger for settings
DROP TRIGGER IF EXISTS settings_set_updated ON settings;
CREATE TRIGGER settings_set_updated 
  BEFORE UPDATE ON settings
  FOR EACH ROW 
  EXECUTE FUNCTION set_updated_at();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_seen ON notifications(seen);