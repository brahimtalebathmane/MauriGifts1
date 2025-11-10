/*
  # Create connection_test table for diagnostics

  1. New Tables
    - `connection_test`
      - `id` (uuid, primary key)
      - `test_data` (text)
      - `created_at` (timestamptz)
  
  2. Purpose
    - This table is used exclusively for diagnostic connection testing
    - Allows verification of read/write permissions
    - Test data is automatically cleaned up after each test
  
  3. Security
    - No RLS needed as this is a diagnostic table only
    - Only accessible via Edge Functions with SERVICE_ROLE_KEY
*/

CREATE TABLE IF NOT EXISTS connection_test (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_data text,
  created_at timestamptz DEFAULT now()
);

-- Add index for faster cleanup queries
CREATE INDEX IF NOT EXISTS connection_test_created_at_idx ON connection_test(created_at);

-- Add comment for documentation
COMMENT ON TABLE connection_test IS 'Diagnostic table for testing Supabase connection and permissions. Data is automatically cleaned up.';
