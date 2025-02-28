/*
  # Schema update for salon system enhancements
  
  1. New Tables
    - `inventory` - For managing salon products/merchandise
      - `id` (uuid, primary key)
      - `name` (text, product name)
      - `quantity` (integer, current stock)
      - `cost_price` (numeric, purchase price)
      - `selling_price` (numeric, retail price)
      - `created_at` (timestamp)
      - `created_by` (uuid, references profiles)
  
  2. Changes
    - Update `appointments` table:
      - Add `status` column with options ('scheduled', 'completed', 'cancelled')
      - Add `final_price` column to store the actual price after service completion
    - Update `appointment_services` table:
      - Add `final_price` column to store the actual price of each service
  
  3. Security
    - Enable RLS on new tables
    - Add policies for authenticated users
*/

-- Create inventory table for merchandise management
CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  cost_price numeric NOT NULL DEFAULT 0,
  selling_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Add final_price to appointments table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'final_price'
  ) THEN
    ALTER TABLE appointments ADD COLUMN final_price numeric DEFAULT 0;
  END IF;
END $$;

-- Add final_price to appointment_services table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointment_services' AND column_name = 'final_price'
  ) THEN
    ALTER TABLE appointment_services ADD COLUMN final_price numeric DEFAULT 0;
  END IF;
END $$;

-- Enable Row Level Security for inventory
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Create policies for inventory
CREATE POLICY "Staff can view all inventory"
  ON inventory FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can insert inventory"
  ON inventory FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can update inventory"
  ON inventory FOR UPDATE
  TO authenticated
  USING (true);