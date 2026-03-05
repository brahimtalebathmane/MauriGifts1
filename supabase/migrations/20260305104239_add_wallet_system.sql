/*
  # Add Wallet System to MauriPlay

  1. Database Changes
    - Add wallet fields to users table
      - `is_wallet_active` (boolean) - Controls whether user can use wallet
      - `wallet_balance` (numeric) - Current wallet balance
    
    - Update settings table
      - Add `wallet_global_limits` key with min/max values
  
  2. Security
    - Add check constraint to ensure wallet_balance >= 0
    - RLS policies already exist for users and settings tables
  
  3. Important Notes
    - Default wallet state is inactive (false)
    - Default balance is 0.00
    - Admin can activate/deactivate wallets
    - Global limits stored in settings for easy management
*/

-- Add wallet fields to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_wallet_active'
  ) THEN
    ALTER TABLE users ADD COLUMN is_wallet_active boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'wallet_balance'
  ) THEN
    ALTER TABLE users ADD COLUMN wallet_balance numeric(10,2) DEFAULT 0.00 NOT NULL;
  END IF;
END $$;

-- Add check constraint for wallet balance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_wallet_balance_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_wallet_balance_check CHECK (wallet_balance >= 0);
  END IF;
END $$;

-- Insert wallet global limits into settings
INSERT INTO settings (key, value)
VALUES (
  'wallet_global_limits',
  '{"min_deposit": 100, "max_balance": 5000}'::jsonb
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value;

-- Create index on wallet_active for faster queries
CREATE INDEX IF NOT EXISTS idx_users_wallet_active ON users(is_wallet_active);
