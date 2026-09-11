-- ============================================================================
-- Migration: Fix handle_new_user() trigger and profiles role constraint
-- Date: 2026-09-10
-- Issue: "Database error querying schema" on login caused by:
--   1. handle_new_user() trigger writes raw JWT role (e.g. "head") into
--      profiles.role, but the CHECK constraint only allows canonical roles.
--      The INSERT fails silently (EXCEPTION WHEN OTHERS), leaving the user
--      with NO profile row. Subsequent profiles queries return null/error.
--   2. profiles.role CHECK constraint is missing "super_admin" and
--      "senior_citizen" — valid canonical roles that will fail the constraint.
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- STEP 1: DIAGNOSTIC — Check current state
-- ──────────────────────────────────────────────────────────────────────────────

-- 1a. What does the current handle_new_user() function look like?
SELECT
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'handle_new_user';

-- 1b. What triggers are attached to auth.users?
SELECT
  t.tgname AS trigger_name,
  CASE t.tgtype::bit(8)::int
    WHEN 2 THEN 'BEFORE'
    WHEN 6 THEN 'AFTER'
    ELSE 'OTHER (' || t.tgtype::text || ')'
  END AS timing,
  CASE
    WHEN t.tgtype & 2 = 2 THEN 'INSERT'
    WHEN t.tgtype & 4 = 4 THEN 'DELETE'
    WHEN t.tgtype & 8 = 8 THEN 'UPDATE'
    WHEN t.tgtype & 16 = 16 THEN 'TRUNCATE'
    ELSE t.tgtype::text
  END AS event,
  CASE WHEN t.tgfoid::regproc = 'handle_new_user' THEN 'handle_new_user()' ELSE t.tgfoid::regproc::text END AS function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' AND c.relname = 'users' AND NOT t.tgisinternal;

-- 1c. What is the profiles.role CHECK constraint?
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass
  AND contype = 'c';

-- 1d. Does the staff_role enum type still exist?
SELECT
  t.typname,
  e.enumlabel AS allowed_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'staff_role'
ORDER BY e.enumsortorder;

-- 1e. What roles currently exist in profiles?
SELECT role, count(*) AS cnt
FROM public.profiles
GROUP BY role
ORDER BY cnt DESC;

-- 1f. Does head@gmail.com have a profile row?
SELECT
  au.email,
  au.raw_user_meta_data ->> 'role' AS jwt_role,
  p.id AS profile_id,
  p.role AS profile_role,
  CASE WHEN p.id IS NULL THEN 'NO PROFILE' ELSE 'profile exists' END AS status
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE au.email = 'head@gmail.com';

-- ──────────────────────────────────────────────────────────────────────────────
-- STEP 2: Drop the stale staff_role enum type (if it still exists)
-- ──────────────────────────────────────────────────────────────────────────────
-- The original profiles table used an enum: staff_role('admin','official','observer').
-- This was later replaced by a TEXT column + CHECK constraint. The enum may still
-- exist and cause implicit cast failures in older trigger versions.

DO $$
BEGIN
  -- Only drop if no column still depends on it
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'staff_role') THEN
    -- Check if any column uses this enum type
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE udt_name = 'staff_role' AND table_schema = 'public'
    ) THEN
      DROP TYPE public.staff_role CASCADE;
      RAISE NOTICE 'Dropped stale enum type: public.staff_role';
    ELSE
      RAISE NOTICE 'Skipping staff_role drop — a column still depends on it';
    END IF;
  ELSE
    RAISE NOTICE 'Enum type staff_role does not exist (already cleaned up)';
  END IF;
END
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- STEP 3: Fix profiles.role CHECK constraint
-- ──────────────────────────────────────────────────────────────────────────────
-- Drop old constraint (may have stale role list) and recreate with all current
-- canonical roles. The handle_new_user() trigger will normalize legacy aliases
-- BEFORE inserting, so only canonical roles should ever appear in this column.

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'super_admin',
    'osca_head',
    'osca_staff',
    'barangay_president',
    'barangay_official',
    'senior_citizen',
    'mayor'
  ));

-- ──────────────────────────────────────────────────────────────────────────────
-- STEP 4: Fix handle_new_user() to normalize legacy roles before INSERT
-- ──────────────────────────────────────────────────────────────────────────────
-- The trigger fires on BOTH INSERT and UPDATE of auth.users. It reads the
-- raw role from raw_user_meta_data and writes it to profiles.role.
-- If the raw role is a legacy alias (head, admin, resident), the CHECK
-- constraint rejects it and the EXCEPTION block swallows the error silently.
-- FIX: Normalize the role inside the trigger before writing.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  raw_role TEXT;
  canonical_role TEXT;
BEGIN
  -- Normalize legacy role aliases before writing to profiles
  raw_role := NEW.raw_user_meta_data ->> 'role';
  canonical_role := CASE raw_role
    WHEN 'head'               THEN 'osca_head'
    WHEN 'admin'              THEN 'osca_staff'
    WHEN 'resident'           THEN 'senior_citizen'
    ELSE COALESCE(raw_role, 'osca_staff')
  END;

  BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, barangay, contact_number)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      canonical_role,
      COALESCE(NEW.raw_user_meta_data->>'barangay', NULL),
      COALESCE(NEW.raw_user_meta_data->>'contact_number', NULL)
    )
    ON CONFLICT (id) DO UPDATE SET
      email = COALESCE(NEW.raw_user_meta_data->>'email', NEW.email),
      full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      role = canonical_role,
      barangay = COALESCE(NEW.raw_user_meta_data->>'barangay', NULL),
      contact_number = COALESCE(NEW.raw_user_meta_data->>'contact_number', NULL),
      updated_at = now();
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'OSCALink: Profile sync failed for user %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────────────────
-- STEP 5: Ensure the trigger exists on auth.users
-- ──────────────────────────────────────────────────────────────────────────────
-- Re-create the trigger to be safe (in case it was dropped or renamed).

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ──────────────────────────────────────────────────────────────────────────────
-- STEP 6: Backfill — Fix existing profiles with legacy roles
-- ──────────────────────────────────────────────────────────────────────────────

UPDATE public.profiles
SET role = CASE role
    WHEN 'head'               THEN 'osca_head'
    WHEN 'admin'              THEN 'osca_staff'
    WHEN 'resident'           THEN 'senior_citizen'
    WHEN 'mswd_officer'       THEN 'osca_staff'
    WHEN 'official'           THEN 'barangay_official'
    WHEN 'para_social_worker' THEN 'barangay_official'
    ELSE role
  END,
  updated_at = now()
WHERE role IN ('head', 'admin', 'resident', 'mswd_officer', 'official', 'para_social_worker');

-- ──────────────────────────────────────────────────────────────────────────────
-- STEP 7: Backfill — Ensure head@gmail.com has a profile row
-- ──────────────────────────────────────────────────────────────────────────────
-- If the trigger failed silently before, the profile may not exist.
-- Insert it now if missing.

INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data ->> 'full_name', au.email),
  'osca_head',
  now(),
  now()
FROM auth.users au
WHERE au.email = 'head@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = au.id)
ON CONFLICT (id) DO UPDATE SET
  role = 'osca_head',
  updated_at = now();

-- ──────────────────────────────────────────────────────────────────────────────
-- STEP 8: Verify — Run AFTER the migration
-- ──────────────────────────────────────────────────────────────────────────────

/*
-- 8a. Confirm handle_new_user() was updated
SELECT pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'handle_new_user';

-- 8b. Confirm trigger exists
SELECT t.tgname, t.tgfoid::regproc AS func
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' AND c.relname = 'users' AND NOT t.tgisinternal;

-- 8c. Confirm profiles.role constraint
SELECT pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass AND contype = 'c';

-- 8d. Confirm head@gmail.com has a profile
SELECT au.email, p.role, p.full_name
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE au.email = 'head@gmail.com';

-- 8e. Check for any profiles with stale legacy roles
SELECT email, role FROM public.profiles
WHERE role IN ('head', 'admin', 'resident', 'mswd_officer', 'official', 'para_social_worker');
-- Should return 0 rows after the backfill.
*/
