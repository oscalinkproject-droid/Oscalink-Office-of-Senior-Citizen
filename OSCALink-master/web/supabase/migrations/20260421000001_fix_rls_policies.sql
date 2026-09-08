-- Fix RLS policies on assistance_requests
-- Drop conflicting/duplicate policies that block updates

DROP POLICY IF EXISTS "Authenticated staff can manage all requests" ON assistance_requests;
DROP POLICY IF EXISTS "authenticated_can_update_assistance_requests" ON assistance_requests;
DROP POLICY IF EXISTS "authenticated_can_read_all_assistance_requests" ON assistance_requests;
DROP POLICY IF EXISTS "Resident can view own assistance requests" ON assistance_requests;
DROP POLICY IF EXISTS "Resident can create assistance requests" ON assistance_requests;
DROP POLICY IF EXISTS "anon_can_insert_assistance_requests" ON assistance_requests;
DROP POLICY IF EXISTS "anon_can_select_assistance_requests" ON assistance_requests;

-- Create clean policies
-- Allow all authenticated users to update requests
CREATE POLICY "allow_authenticated_update" ON assistance_requests
FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to read requests
CREATE POLICY "allow_authenticated_read" ON assistance_requests
FOR SELECT USING (auth.role() = 'authenticated');

-- Allow all authenticated users to insert
CREATE POLICY "allow_authenticated_insert" ON assistance_requests
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow anonymous users with senior_id to read
CREATE POLICY "allow_anon_read" ON assistance_requests
FOR SELECT USING (senior_id IS NOT NULL);

-- Allow anonymous users to insert with senior_id
CREATE POLICY "allow_anon_insert" ON assistance_requests
FOR INSERT WITH CHECK (senior_id IS NOT NULL);

SELECT 'Fixed RLS policies on assistance_requests' AS result;