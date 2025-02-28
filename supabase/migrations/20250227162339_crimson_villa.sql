/*
  # Initial Schema for Dellas Salon System

  1. New Tables
    - `profiles` - Staff member profiles
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `name` (text)
      - `created_at` (timestamp)
    
    - `clients` - Salon clients
      - `id` (uuid, primary key)
      - `name` (text)
      - `phone` (text)
      - `created_at` (timestamp)
      - `created_by` (uuid, references profiles.id)
    
    - `services` - Available salon services
      - `id` (uuid, primary key)
      - `name` (text)
      - `price` (numeric)
      - `duration` (integer) - in minutes
      - `created_at` (timestamp)
      - `created_by` (uuid, references profiles.id)
    
    - `appointments` - Client appointments
      - `id` (uuid, primary key)
      - `client_id` (uuid, references clients.id)
      - `start_time` (timestamp)
      - `end_time` (timestamp)
      - `status` (text) - 'scheduled', 'completed', 'cancelled'
      - `notes` (text)
      - `created_at` (timestamp)
      - `created_by` (uuid, references profiles.id)
    
    - `appointment_services` - Services included in appointments
      - `id` (uuid, primary key)
      - `appointment_id` (uuid, references appointments.id)
      - `service_id` (uuid, references services.id)
      - `price` (numeric) - price at time of booking
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create profiles table (for staff members)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text,
  created_at timestamptz DEFAULT now()
);

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  duration integer NOT NULL DEFAULT 60,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Create appointment_services junction table
CREATE TABLE IF NOT EXISTS appointment_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES services(id) NOT NULL,
  price numeric NOT NULL
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_services ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Clients policies
CREATE POLICY "Staff can view all clients"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can insert clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can update clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (true);

-- Services policies
CREATE POLICY "Staff can view all services"
  ON services FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can insert services"
  ON services FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can update services"
  ON services FOR UPDATE
  TO authenticated
  USING (true);

-- Appointments policies
CREATE POLICY "Staff can view all appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can insert appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can update appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (true);

-- Appointment services policies
CREATE POLICY "Staff can view all appointment services"
  ON appointment_services FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can insert appointment services"
  ON appointment_services FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can update appointment services"
  ON appointment_services FOR UPDATE
  TO authenticated
  USING (true);

-- Create trigger to create profile after user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();