-- ==========================================
-- Resident Self-Locked Access RLS Policies
-- ==========================================
-- Allows residents to view ONLY their own data
-- through the auth.users -> seniors relationship
-- Resident auth stores senior_id in user_metadata
-- ==========================================

-- 1. Add columns to seniors table
DO $$ BEGIN
    ALTER TABLE seniors ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    ALTER TABLE seniors ADD COLUMN IF NOT EXISTS address TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- 2. Add senior_id to assistance_requests (check if exists first)
DO $$ BEGIN
    ALTER TABLE assistance_requests ADD COLUMN IF NOT EXISTS senior_id UUID REFERENCES seniors(id) ON DELETE SET NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- 3. Add senior_id to appointments (check if exists first)
DO $$ BEGIN
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS senior_id UUID REFERENCES seniors(id) ON DELETE SET NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- 4. Helper function to get resident's senior_id from auth
CREATE OR REPLACE FUNCTION get_resident_senior_id()
RETURNS UUID AS $$
  SELECT (
    current_setting('request.jwt.claims', true)::jsonb ->> 'senior_id'
  )::UUID;
$$ LANGUAGE sql STABLE;

-- 5. Helper function to check if user is resident (has senior_id)
CREATE OR REPLACE FUNCTION is_resident()
RETURNS BOOLEAN AS $$
  SELECT (
    current_setting('request.jwt.claims', true)::jsonb ->> 'senior_id'
  ) IS NOT NULL;
$$ LANGUAGE sql STABLE;

-- ==========================================
-- SENIORS TABLE - Resident Self-Locked Policy
-- ==========================================
DROP POLICY IF EXISTS "Resident can view own senior data" ON seniors;
CREATE POLICY "Resident can view own senior data" ON seniors
FOR SELECT
USING (
  (auth.jwt() -> 'user_metadata' ->> 'senior_id')::UUID = id
);

DROP POLICY IF EXISTS "Allow lookup for registration" ON seniors;
CREATE POLICY "Allow lookup for registration" ON seniors
FOR SELECT
USING (auth.uid() IS NULL);

DROP POLICY IF EXISTS "Public can register as senior" ON seniors;
CREATE POLICY "Public can register as senior" ON seniors
FOR INSERT
WITH CHECK (true);

-- ==========================================
-- Update staff_role enum to include resident
-- ==========================================
DO $$ BEGIN
    ALTER TYPE public.staff_role ADD VALUE IF NOT EXISTS 'resident';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==========================================
-- ASSISTANCE_REQUESTS TABLE - Resident Self-Locked Policy
-- ==========================================
DROP POLICY IF EXISTS "Resident can view own assistance requests" ON assistance_requests;

CREATE POLICY "Resident can view own assistance requests" ON assistance_requests
FOR SELECT
USING (
  senior_id IS NOT NULL
  AND
  (auth.jwt() -> 'user_metadata' ->> 'senior_id')::UUID = senior_id
);

-- ==========================================
-- APPOINTMENTS TABLE - Resident Self-Locked Policy
-- ==========================================
DROP POLICY IF EXISTS "Resident can view own appointments" ON appointments;

CREATE POLICY "Resident can view own appointments" ON appointments
FOR SELECT
USING (
  senior_id IS NOT NULL
  AND
  (auth.jwt() -> 'user_metadata' ->> 'senior_id')::UUID = senior_id
);

-- ==========================================
-- Insert test resident user for verification
-- ==========================================
-- INSERT INTO auth.users (id, email, raw_user_meta_data)
-- VALUES (
--   '00000000-0000-0000-0000-000000000001',
--   'resident@test.com',
--   '{"senior_id": "REPLACE_WITH_SENIOR_UUID", "role": "resident"}'::jsonb
-- )
-- ON CONFLICT (id) DO UPDATE SET
--   raw_user_meta_data = EXCLUDED.raw_user_meta_data;

SELECT 'OSCALink: Resident Self-Locked RLS Policies Created.';