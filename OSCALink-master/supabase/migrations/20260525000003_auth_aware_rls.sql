-- ==========================================
-- OSCALink: Auth-Aware Row-Level Security
-- ==========================================
-- Applied AFTER the Auth Bridge (Task 1) is live.
-- Mobile senior residents now authenticate via
-- Supabase Auth sessions, making RLS safe to enforce.
-- ==========================================

-- 0. APPOINTMENTS: Add 'Cancelled' status for soft deletion
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('Scheduled', 'Completed', 'Missed', 'Cancelled'));

-- ==========================================
-- 1. DROP UNSAFE PUBLIC POLICIES
-- ==========================================

-- Seniors: remove anonymous/everyone access
DROP POLICY IF EXISTS "Allow public read access" ON seniors;
DROP POLICY IF EXISTS "public_insert_seniors" ON seniors;
DROP POLICY IF EXISTS "anon_read_seniors" ON seniors;
DROP POLICY IF EXISTS "Allow anon read access" ON seniors;

-- Assistance requests: remove anonymous access
DROP POLICY IF EXISTS "anon_read_assistance" ON assistance_requests;
DROP POLICY IF EXISTS "anon_insert_assistance" ON assistance_requests;
DROP POLICY IF EXISTS "Allow anon read" ON assistance_requests;
DROP POLICY IF EXISTS "Allow anon insert" ON assistance_requests;

-- Appointments: remove anonymous access
DROP POLICY IF EXISTS "Allow public read access" ON appointments;
DROP POLICY IF EXISTS "anon_read_appointments" ON appointments;
DROP POLICY IF EXISTS "anon_insert_appointments" ON appointments;

-- Profiles: remove fully open select
DROP POLICY IF EXISTS "Allow public read" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;

-- Complaints: remove anonymous policies
DROP POLICY IF EXISTS "Allow read access to complaints" ON complaints;
DROP POLICY IF EXISTS "Allow insert access to complaints" ON complaints;
DROP POLICY IF EXISTS "Allow update access to complaints" ON complaints;
DROP POLICY IF EXISTS "Allow delete access to complaints" ON complaints;
DROP POLICY IF EXISTS "anon_can_read_complaints" ON complaints;
DROP POLICY IF EXISTS "anon_can_insert_complaints" ON complaints;

-- ID Inventory: remove anonymous policies
DROP POLICY IF EXISTS "Allow read access to id_inventory" ON id_inventory;
DROP POLICY IF EXISTS "Allow insert access to id_inventory" ON id_inventory;
DROP POLICY IF EXISTS "Allow update access to id_inventory" ON id_inventory;
DROP POLICY IF EXISTS "Allow delete access to id_inventory" ON id_inventory;

-- Bedridden verifications: remove anonymous policies
DROP POLICY IF EXISTS "Allow public read access to bedridden_verifications" ON bedridden_verifications;
DROP POLICY IF EXISTS "Allow insert to bedridden_verifications" ON bedridden_verifications;
DROP POLICY IF EXISTS "Allow update to bedridden_verifications" ON bedridden_verifications;

-- Quarterly updates: remove anonymous policies
DROP POLICY IF EXISTS "Allow read access to quarterly_updates" ON quarterly_updates;
DROP POLICY IF EXISTS "Allow insert access to quarterly_updates" ON quarterly_updates;
DROP POLICY IF EXISTS "Allow update access to quarterly_updates" ON quarterly_updates;

-- Family composition: remove anonymous policies
DROP POLICY IF EXISTS "Allow read access to family composition" ON family_composition;
DROP POLICY IF EXISTS "Allow insert access to family composition" ON family_composition;
DROP POLICY IF EXISTS "Allow update access to family composition" ON family_composition;
DROP POLICY IF EXISTS "Allow delete access to family composition" ON family_composition;

-- ==========================================
-- 2. HELPER FUNCTION: Get user's JWT role
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role',
    'anon'
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ==========================================
-- 3. HELPER FUNCTION: Get user's JWT senior_id
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_user_senior_id()
RETURNS UUID AS $$
DECLARE
  senior_id_text TEXT;
BEGIN
  senior_id_text := current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'senior_id';
  IF senior_id_text IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN senior_id_text::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

-- ==========================================
-- 4. SENIORS POLICIES
-- ==========================================

-- City-wide staff: full access to all seniors
DROP POLICY IF EXISTS "admin_full_access_seniors" ON seniors;
CREATE POLICY "admin_full_access_seniors" ON seniors
  FOR ALL
  USING (
    auth.role() = 'authenticated'
    AND get_user_role() IN ('admin', 'osca_head', 'mswd_officer', 'mayor')
  );

-- Sector-locked staff: read/update seniors in their barangay
DROP POLICY IF EXISTS "sector_staff_access_seniors" ON seniors;
CREATE POLICY "sector_staff_access_seniors" ON seniors
  FOR ALL
  USING (
    auth.role() = 'authenticated'
    AND get_user_role() IN ('para_social_worker', 'official')
    AND barangay = get_user_barangay()
  );

-- Sector-locked staff: can insert seniors (they register in their barangay)
DROP POLICY IF EXISTS "sector_staff_insert_seniors" ON seniors;
CREATE POLICY "sector_staff_insert_seniors" ON seniors
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND get_user_role() IN ('para_social_worker', 'official')
    AND (barangay = get_user_barangay() OR get_user_barangay() IS NULL)
  );

-- Residents: read their own record
DROP POLICY IF EXISTS "resident_read_seniors" ON seniors;
CREATE POLICY "resident_read_seniors" ON seniors
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND get_user_role() = 'resident'
    AND id = get_user_senior_id()
  );

-- Staff read (for directory listings, reports, etc.)
DROP POLICY IF EXISTS "staff_read_seniors" ON seniors;
DROP POLICY IF EXISTS "staff_insert_seniors" ON seniors;
DROP POLICY IF EXISTS "staff_update_seniors" ON seniors;

-- ==========================================
-- 5. ASSISTANCE REQUESTS POLICIES
-- ==========================================

-- City-wide staff: full access
DROP POLICY IF EXISTS "staff_update_assistance" ON assistance_requests;
DROP POLICY IF EXISTS "staff_read_assistance" ON assistance_requests;
DROP POLICY IF EXISTS "staff_insert_assistance" ON assistance_requests;
DROP POLICY IF EXISTS "admin_full_access_assistance" ON assistance_requests;

CREATE POLICY "admin_full_access_assistance" ON assistance_requests
  FOR ALL
  USING (
    auth.role() = 'authenticated'
    AND get_user_role() IN ('admin', 'osca_head', 'mswd_officer', 'mayor')
  );

-- Sector-locked staff: read/update within barangay
CREATE POLICY "sector_staff_read_assistance" ON assistance_requests
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND get_user_role() IN ('para_social_worker', 'official')
    AND barangay = get_user_barangay()
  );

CREATE POLICY "sector_staff_update_assistance" ON assistance_requests
  FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND get_user_role() IN ('para_social_worker', 'official')
    AND barangay = get_user_barangay()
  );

CREATE POLICY "sector_staff_insert_assistance" ON assistance_requests
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND get_user_role() IN ('para_social_worker', 'official', 'admin', 'osca_head', 'mswd_officer')
  );

-- Residents: read their own requests
CREATE POLICY "resident_read_assistance" ON assistance_requests
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND get_user_role() = 'resident'
    AND senior_id = get_user_senior_id()
  );

-- Residents: create their own requests
CREATE POLICY "resident_insert_assistance" ON assistance_requests
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND get_user_role() = 'resident'
    AND senior_id = get_user_senior_id()
  );

-- ==========================================
-- 6. APPOINTMENTS POLICIES
-- ==========================================

-- City-wide staff: full access
CREATE POLICY "admin_full_access_appointments" ON appointments
  FOR ALL
  USING (
    auth.role() = 'authenticated'
    AND get_user_role() IN ('admin', 'osca_head', 'mswd_officer', 'mayor', 'para_social_worker', 'official')
  );

-- Residents: read their own appointments
CREATE POLICY "resident_read_appointments" ON appointments
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND get_user_role() = 'resident'
    AND senior_id = get_user_senior_id()
  );

-- Residents: create their own appointments
CREATE POLICY "resident_insert_appointments" ON appointments
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND get_user_role() = 'resident'
    AND senior_id = get_user_senior_id()
  );

-- ==========================================
-- 7. PROFILES POLICIES
-- ==========================================

-- All authenticated users can read profiles
CREATE POLICY "authenticated_read_profiles" ON profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can update their own profile
CREATE POLICY "self_update_profiles" ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Staff can update any profile (for role/barangay management)
CREATE POLICY "staff_update_profiles" ON profiles
  FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND get_user_role() IN ('admin', 'osca_head', 'mswd_officer')
  );

-- ==========================================
-- 8. COMPLAINTS POLICIES
-- ==========================================

-- City-wide staff: full access
CREATE POLICY "admin_full_access_complaints" ON complaints
  FOR ALL
  USING (
    auth.role() = 'authenticated'
    AND get_user_role() IN ('admin', 'osca_head', 'mswd_officer', 'mayor', 'para_social_worker', 'official')
  );

-- Residents: read their own complaints
CREATE POLICY "resident_read_complaints" ON complaints
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND get_user_role() = 'resident'
    AND senior_id = get_user_senior_id()
  );

-- Residents: create complaints
CREATE POLICY "resident_insert_complaints" ON complaints
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND get_user_role() = 'resident'
    AND senior_id = get_user_senior_id()
  );

-- ==========================================
-- 9. ID INVENTORY POLICIES
-- ==========================================

-- City-wide staff: full access
CREATE POLICY "admin_full_access_id_inventory" ON id_inventory
  FOR ALL
  USING (
    auth.role() = 'authenticated'
    AND get_user_role() IN ('admin', 'osca_head', 'mswd_officer', 'mayor', 'para_social_worker', 'official')
  );

-- Residents: read their own inventory
CREATE POLICY "resident_read_id_inventory" ON id_inventory
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND get_user_role() = 'resident'
    AND senior_id = get_user_senior_id()
  );

-- ==========================================
-- 10. BEDRIDDEN VERIFICATIONS POLICIES
-- ==========================================

-- City-wide staff: full access
CREATE POLICY "admin_full_access_bedridden" ON bedridden_verifications
  FOR ALL
  USING (
    auth.role() = 'authenticated'
    AND get_user_role() IN ('admin', 'osca_head', 'mswd_officer', 'mayor', 'para_social_worker', 'official')
  );

-- Residents: read their own verifications
CREATE POLICY "resident_read_bedridden" ON bedridden_verifications
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND get_user_role() = 'resident'
    AND senior_id = get_user_senior_id()
  );

-- ==========================================
-- 11. QUARTERLY UPDATES POLICIES
-- ==========================================

-- Staff only: quarterly reports are internal
CREATE POLICY "staff_access_quarterly" ON quarterly_updates
  FOR ALL
  USING (
    auth.role() = 'authenticated'
    AND get_user_role() IN ('admin', 'osca_head', 'mswd_officer', 'mayor', 'para_social_worker', 'official')
  );

-- ==========================================
-- 12. FAMILY COMPOSITION POLICIES
-- ==========================================

-- City-wide staff: full access
CREATE POLICY "admin_full_access_family" ON family_composition
  FOR ALL
  USING (
    auth.role() = 'authenticated'
    AND get_user_role() IN ('admin', 'osca_head', 'mswd_officer', 'mayor', 'para_social_worker', 'official')
  );

-- Residents: read their own family composition
CREATE POLICY "resident_read_family" ON family_composition
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND get_user_role() = 'resident'
    AND senior_id = get_user_senior_id()
  );

-- ==========================================
-- 13. AUDIT LOGS TABLE (pre-creation for Task 5)
-- ==========================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only staff can read audit logs
CREATE POLICY "staff_read_audit_logs" ON audit_logs
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND get_user_role() IN ('admin', 'osca_head', 'mswd_officer')
  );

-- System/service role can insert (trigger-based)
CREATE POLICY "system_insert_audit_logs" ON audit_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

COMMENT ON TABLE audit_logs IS 'Stores audit trail for sensitive operations (approvals, overrides, deletions)';

-- ==========================================
-- 14. GRANTS
-- ==========================================

-- Revoke anonymous access grants
REVOKE SELECT, INSERT ON assistance_requests FROM anon;
REVOKE SELECT ON seniors FROM anon;
REVOKE SELECT, INSERT ON appointments FROM anon;

-- Grant authenticated access
GRANT SELECT, INSERT, UPDATE ON seniors TO authenticated;
GRANT SELECT, INSERT, UPDATE ON assistance_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON appointments TO authenticated;
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT, INSERT ON complaints TO authenticated;
GRANT SELECT, INSERT ON id_inventory TO authenticated;
GRANT SELECT ON bedridden_verifications TO authenticated;
GRANT SELECT, INSERT ON audit_logs TO authenticated;
GRANT SELECT, INSERT ON family_composition TO authenticated;
GRANT SELECT, INSERT, UPDATE ON quarterly_updates TO authenticated;

-- ==========================================
-- COMPLETE
-- ==========================================

SELECT 'OSCALink: Auth-aware RLS migration complete.' AS result;
