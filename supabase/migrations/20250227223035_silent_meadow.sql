/*
  # Add product categories, sales, and financial management

  1. New Features
    - Add category field to inventory items
    - Create sales system for product sales
    - Create financial transactions system
    - Add automatic transaction creation for sales and completed appointments

  2. Tables
    - Modified: inventory (added category column)
    - New: sales, sale_items, financial_transactions

  3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users
*/

-- Add category to inventory table
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS category text DEFAULT 'Geral';

-- Create sales table for product sales
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date timestamptz NOT NULL DEFAULT now(),
  total_amount numeric NOT NULL DEFAULT 0,
  payment_method text,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Create sale_items table to track individual items in a sale
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
  inventory_id uuid REFERENCES inventory(id) NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0
);

-- Create financial_transactions table for financial management
CREATE TABLE IF NOT EXISTS financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date timestamptz NOT NULL DEFAULT now(),
  description text NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL, -- 'income' or 'expense'
  category text,
  related_sale_id uuid REFERENCES sales(id),
  related_appointment_id uuid REFERENCES appointments(id),
  payment_method text,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Enable Row Level Security for new tables
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for sales (check if they exist first)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sales' AND policyname = 'Staff can view all sales'
  ) THEN
    CREATE POLICY "Staff can view all sales"
      ON sales FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sales' AND policyname = 'Staff can insert sales'
  ) THEN
    CREATE POLICY "Staff can insert sales"
      ON sales FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sales' AND policyname = 'Staff can update sales'
  ) THEN
    CREATE POLICY "Staff can update sales"
      ON sales FOR UPDATE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Create policies for sale_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sale_items' AND policyname = 'Staff can view all sale_items'
  ) THEN
    CREATE POLICY "Staff can view all sale_items"
      ON sale_items FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sale_items' AND policyname = 'Staff can insert sale_items'
  ) THEN
    CREATE POLICY "Staff can insert sale_items"
      ON sale_items FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sale_items' AND policyname = 'Staff can update sale_items'
  ) THEN
    CREATE POLICY "Staff can update sale_items"
      ON sale_items FOR UPDATE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Create policies for financial_transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'financial_transactions' AND policyname = 'Staff can view all financial_transactions'
  ) THEN
    CREATE POLICY "Staff can view all financial_transactions"
      ON financial_transactions FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'financial_transactions' AND policyname = 'Staff can insert financial_transactions'
  ) THEN
    CREATE POLICY "Staff can insert financial_transactions"
      ON financial_transactions FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'financial_transactions' AND policyname = 'Staff can update financial_transactions'
  ) THEN
    CREATE POLICY "Staff can update financial_transactions"
      ON financial_transactions FOR UPDATE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Create or replace function to handle new sales
CREATE OR REPLACE FUNCTION public.handle_new_sale()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.financial_transactions (
    transaction_date,
    description,
    amount,
    type,
    category,
    related_sale_id,
    payment_method
  )
  VALUES (
    new.sale_date,
    'Venda de produtos',
    new.total_amount,
    'income',
    'Vendas',
    new.id,
    new.payment_method
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists and create a new one
DROP TRIGGER IF EXISTS on_sale_created ON sales;
CREATE TRIGGER on_sale_created
  AFTER INSERT ON sales
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_sale();

-- Create or replace function to handle completed appointments
CREATE OR REPLACE FUNCTION public.handle_completed_appointment()
RETURNS trigger AS $$
BEGIN
  IF new.status = 'completed' AND (old.status IS NULL OR old.status <> 'completed') THEN
    INSERT INTO public.financial_transactions (
      transaction_date,
      description,
      amount,
      type,
      category,
      related_appointment_id
    )
    VALUES (
      new.start_time,
      'Serviço realizado',
      new.final_price,
      'income',
      'Serviços',
      new.id
    );
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists and create a new one
DROP TRIGGER IF EXISTS on_appointment_completed ON appointments;
CREATE TRIGGER on_appointment_completed
  AFTER UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION public.handle_completed_appointment();

-- Create function to decrement inventory quantity
CREATE OR REPLACE FUNCTION public.decrement(x integer)
RETURNS integer AS $$
BEGIN
  RETURN quantity - x;
END;
$$ LANGUAGE plpgsql STABLE;