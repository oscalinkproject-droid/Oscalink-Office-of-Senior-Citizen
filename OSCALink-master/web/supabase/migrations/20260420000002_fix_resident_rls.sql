-- ==========================================
-- Fix Resident RLS for localStorage-based auth
-- ==========================================
-- The resident portal uses localStorage for session, not Supabase Auth
-- This migration creates policies that work with anonymous access
-- The client-side code filters by senior_id from localStorage
-- ==========================================

-- ==========================================
-- Senior_id column must exist in these tables
-- ==========================================
DO $$ BEGIN
    ALTER TABLE assistance_requests ADD COLUMN IF NOT EXISTS senior_id UUID REFERENCES seniors(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS senior_id UUID REFERENCES seniors(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ==========================================
-- assistance_requests: Replace old policies with permissive one for anon
-- ==========================================
DROP POLICY IF EXISTS "Resident can view own assistance_requests" ON assistance_requests;
DROP POLICY IF EXISTS "Requests auth access" ON assistance_requests;

-- Allow INSERT for creating new requests (from resident portal)
CREATE POLICY "anon_can_insert_assistance_requests" ON assistance_requests
FOR INSERT
WITH CHECK (senior_id IS NOT NULL);

-- Allow SELECT for reading requests (from resident portal)
CREATE POLICY "anon_can_select_assistance_requests" ON assistance_requests
FOR SELECT
USING (senior_id IS NOT NULL);

-- Allow authenticated users (staff/admin) to read all requests
CREATE POLICY "authenticated_can_read_all_assistance_requests" ON assistance_requests
FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow authenticated users to update requests (for status changes)
CREATE POLICY "authenticated_can_update_assistance_requests" ON assistance_requests
FOR UPDATE
USING (auth.role() = 'authenticated');

-- ==========================================
-- seniors: Replace old policies with permissive one for anon
-- ==========================================
DROP POLICY IF EXISTS "Resident can view own senior data" ON seniors;
DROP POLICY IF EXISTS "Allow authenticated read all" ON seniors;
DROP POLICY IF EXISTS "Admins can view all seniors" ON seniors;
DROP POLICY IF EXISTS "Officials can view seniors in their sector" ON seniors;
DROP POLICY IF EXISTS "Allow lookup for registration" ON seniors;
DROP POLICY IF EXISTS "Public can register as senior" ON seniors;

-- Allow read for residents (with status)
CREATE POLICY "anon_can_read_seniors" ON seniors
FOR SELECT
USING (status IS NOT NULL);

-- Allow authenticated users (staff/admin) to read all seniors
CREATE POLICY "authenticated_can_read_all_seniors" ON seniors
FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow anyone to register (public registration)
CREATE POLICY "public_can_insert_seniors" ON seniors
FOR INSERT
WITH CHECK (true);

-- ==========================================
-- appointments: Replace old policies with permissive one for anon
-- ==========================================
DROP POLICY IF EXISTS "Resident can view own appointments" ON appointments;

-- Allow SELECT for reading appointments (resident portal)
CREATE POLICY "anon_can_read_appointments" ON appointments
FOR SELECT
USING (senior_id IS NOT NULL);

-- Allow INSERT for creating appointments (resident portal)
CREATE POLICY "anon_can_insert_appointments" ON appointments
FOR INSERT
WITH CHECK (senior_id IS NOT NULL);

-- Allow authenticated users to read all appointments
CREATE POLICY "authenticated_can_read_all_appointments" ON appointments
FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow authenticated users to update appointments
CREATE POLICY "authenticated_can_update_appointments" ON appointments
FOR UPDATE
USING (auth.role() = 'authenticated');

-- ==========================================
-- Grant permissions to anon role
-- ==========================================
GRANT SELECT, INSERT ON assistance_requests TO anon;
GRANT SELECT ON seniors TO anon;
GRANT SELECT, INSERT ON appointments TO anon;
GRANT UPDATE ON assistance_requests TO authenticated;

SELECT 'OSCALink: Fixed Resident RLS Policies for localStorage auth.' AS result;
