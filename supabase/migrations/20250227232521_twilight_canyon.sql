/*
  # Add client_id to sales table

  1. Changes
    - Add client_id column to sales table to track which client made the purchase
    - Add foreign key constraint to clients table
*/

-- Add client_id column to sales table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE sales ADD COLUMN client_id uuid REFERENCES clients(id);
  END IF;
END $$;