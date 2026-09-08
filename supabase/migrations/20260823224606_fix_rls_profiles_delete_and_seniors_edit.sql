-- Migration: Fix RLS policies for staff deletion and senior editing
-- Issue 1: Add DELETE policy for profiles so OSCA Head/Staff can delete staff accounts
-- Issue 2: Fix deprecated auth.role() in seniors policy that silently blocks updates

-- ==========================================
-- 0. Ensure helper functions exist
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
-- 1. PROFILES: Add DELETE policy for staff management
-- ==========================================

DROP POLICY IF EXISTS "staff_delete_profiles" ON profiles;
CREATE POLICY "staff_delete_profiles" ON profiles
  FOR DELETE
  USING (
    (select auth.role()) = 'authenticated'
    AND get_user_role() IN ('admin', 'osca_head')
  );

-- ==========================================
-- 2. SENIORS: Fix deprecated auth.role() in admin policy
-- ==========================================

DROP POLICY IF EXISTS "admin_full_access_seniors" ON seniors;
CREATE POLICY "admin_full_access_seniors" ON seniors
  FOR ALL
  USING (
    (select auth.role()) = 'authenticated'
    AND get_user_role() IN ('admin', 'osca_head', 'osca_staff', 'mswd_officer', 'mayor')
  );

DROP POLICY IF EXISTS "sector_staff_access_seniors" ON seniors;
CREATE POLICY "sector_staff_access_seniors" ON seniors
  FOR ALL
  USING (
    (select auth.role()) = 'authenticated'
    AND get_user_role() IN ('para_social_worker', 'official')
    AND barangay = get_user_barangay()
  );

DROP POLICY IF EXISTS "sector_staff_insert_seniors" ON seniors;
CREATE POLICY "sector_staff_insert_seniors" ON seniors
  FOR INSERT
  WITH CHECK (
    (select auth.role()) = 'authenticated'
    AND get_user_role() IN ('para_social_worker', 'official')
    AND (barangay = get_user_barangay() OR get_user_barangay() IS NULL)
  );

DROP POLICY IF EXISTS "resident_read_seniors" ON seniors;
CREATE POLICY "resident_read_seniors" ON seniors
  FOR SELECT
  USING (
    (select auth.role()) = 'authenticated'
    AND get_user_role() = 'resident'
    AND id = get_user_senior_id()
  );

-- ==========================================
-- 3. PROFILES: Fix other policies using deprecated auth.role()
-- ==========================================

DROP POLICY IF EXISTS "authenticated_read_profiles" ON profiles;
CREATE POLICY "authenticated_read_profiles" ON profiles
  FOR SELECT
  USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "staff_update_profiles" ON profiles;
CREATE POLICY "staff_update_profiles" ON profiles
  FOR UPDATE
  USING (
    (select auth.role()) = 'authenticated'
    AND get_user_role() IN ('admin', 'osca_head', 'osca_staff', 'mswd_officer')
  );
