-- ============================================================================
-- Migration: Fix RLS policies for legacy role normalization
-- Date: 2026-09-10
-- Issue: Users with legacy roles (head, admin, resident) in their JWT
--        user_metadata are denied SELECT on the seniors table because the
--        RLS policies only check for canonical roles (osca_head, osca_staff,
--        etc.). The middleware normalizes these, but get_user_role() reads
--        the RAW JWT.
--
-- Active legacy aliases normalized: head → osca_head, admin → osca_staff,
--                                    resident → senior_citizen
-- Deprecated (no longer in system): mswd_officer, official, para_social_worker
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- STEP 1: DIAGNOSTIC — Run this first to see which users are affected
-- ──────────────────────────────────────────────────────────────────────────────
-- Copy and run this block in the SQL Editor BEFORE running the fix below.
-- It shows every user's raw JWT role and the canonical normalized role.

/*
SELECT
  au.id,
  au.email,
  au.raw_user_meta_data ->> 'role' AS raw_jwt_role,
  CASE au.raw_user_meta_data ->> 'role'
    WHEN 'head'             THEN 'osca_head'
    WHEN 'admin'            THEN 'osca_staff'
    WHEN 'resident'         THEN 'senior_citizen'
    ELSE au.raw_user_meta_data ->> 'role'
  END AS normalized_role,
  p.role AS profile_role,
  CASE
    WHEN au.raw_user_meta_data ->> 'role' IN ('head','admin','resident')
    THEN 'NEEDS FIX'
    ELSE 'ok'
  END AS status
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
ORDER BY status DESC, au.email;
*/

-- ──────────────────────────────────────────────────────────────────────────────
-- STEP 2: Update get_user_role() to normalize legacy aliases in SQL
-- ──────────────────────────────────────────────────────────────────────────────
-- This is the belt-and-suspenders fix: even if the JWT contains a legacy
-- role, get_user_role() will return the canonical equivalent.

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
DECLARE
  raw_role TEXT;
BEGIN
  raw_role := current_setting('request.jwt.claims', true)::jsonb
                -> 'user_metadata' ->> 'role';

  RETURN CASE raw_role
    WHEN 'head'               THEN 'osca_head'
    WHEN 'admin'              THEN 'osca_staff'
    WHEN 'resident'           THEN 'senior_citizen'
    ELSE COALESCE(raw_role, 'anon')
  END;
END;
$$ LANGUAGE plpgsql STABLE;

-- ──────────────────────────────────────────────────────────────────────────────
-- STEP 3: Drop ALL existing seniors RLS policies (clean slate)
-- ──────────────────────────────────────────────────────────────────────────────
-- Uses dynamic SQL to drop EVERY policy on public.seniors by name, so we
-- don't miss any from older migrations with unexpected names.

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'seniors'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.seniors', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- STEP 4: Recreate RLS policies with canonical + legacy role coverage
-- ──────────────────────────────────────────────────────────────────────────────
-- get_user_role() now normalizes, so these policies use the canonical names.
-- We also add `super_admin` which was missing from all previous policies.

-- 4a. City-wide admin: full CRUD on all seniors
CREATE POLICY "admin_full_access_seniors" ON public.seniors
  FOR ALL
  USING (
    (select auth.role()) = 'authenticated'
    AND get_user_role() IN (
      'super_admin', 'osca_head', 'osca_staff', 'mayor'
    )
  );

-- 4b. Sector-locked staff: full CRUD on their own barangay only
CREATE POLICY "sector_staff_access_seniors" ON public.seniors
  FOR ALL
  USING (
    (select auth.role()) = 'authenticated'
    AND get_user_role() IN ('barangay_official', 'barangay_president')
    AND barangay = get_user_barangay()
  );

-- 4c. Sector-locked staff INSERT: allow NULL barangay (for pre-registration)
CREATE POLICY "sector_staff_insert_seniors" ON public.seniors
  FOR INSERT
  WITH CHECK (
    (select auth.role()) = 'authenticated'
    AND get_user_role() IN ('barangay_official', 'barangay_president')
    AND (barangay = get_user_barangay() OR get_user_barangay() IS NULL)
  );

-- 4d. Residents: read own record only
CREATE POLICY "resident_read_seniors" ON public.seniors
  FOR SELECT
  USING (
    (select auth.role()) = 'authenticated'
    AND get_user_role() = 'senior_citizen'
    AND id = get_user_senior_id()
  );

-- 4e. Anonymous pre-registration INSERT (restricted to clean Pending rows)
CREATE POLICY "anon_public_preregistration_insert" ON public.seniors
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    COALESCE(status, '') = 'Pending'
    AND id_number IS NULL
    AND registration_id IS NOT NULL
    AND registration_id LIKE 'REF-%'
    AND is_pensioner IS NOT TRUE
    AND pensioner_type IS NULL
    AND decision_reason IS NULL
    AND decision_note IS NULL
    AND disapproved_by IS NULL
    AND disapproved_at IS NULL
    AND disqualified_by IS NULL
    AND disqualified_at IS NULL
    AND inactive_reason IS NULL
    AND inactive_at IS NULL
    AND inactive_by IS NULL
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- STEP 5: Ensure GRANTs are correct
-- ──────────────────────────────────────────────────────────────────────────────

REVOKE SELECT ON public.seniors FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.seniors TO authenticated;
GRANT INSERT ON public.seniors TO anon;

-- ──────────────────────────────────────────────────────────────────────────────
-- STEP 6: Verify — Run this AFTER the migration to confirm policies work
-- ──────────────────────────────────────────────────────────────────────────────

/*
-- List all current policies on seniors
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'seniors'
ORDER BY policyname;

-- Test: impersonate head@gmail.com and check if SELECT works
-- (Replace the UUID with the actual user ID from the diagnostic query above)
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"USER_UUID_HERE","user_metadata":{"role":"head"}}', true);
SELECT set_config('role', 'authenticated', true);
SELECT count(*) FROM public.seniors;  -- Should return all seniors, not 0
*/
