-- ============================================================================
-- Fix: Normalize legacy roles in auth.users JWT metadata
-- Run this AFTER the RLS migration (20260910000000_fix_rls_role_normalization.sql)
--
-- WHY: The get_user_role() fix handles normalization at the RLS layer, but
--      the JWT metadata should also be canonical so the middleware, client
--      code, and RLS all agree on the role without any translation.
--
-- Active legacy aliases normalized: head → osca_head, admin → osca_staff,
--                                    resident → senior_citizen
-- Deprecated (no longer in system): mswd_officer, official, para_social_worker
--
-- HOW: This script updates auth.users.raw_user_meta_data for every user
--      whose role is a legacy alias. Run in Supabase SQL Editor (service
--      role access required for auth.users).
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- PART A: Preview — See what will change (safe, read-only)
-- ──────────────────────────────────────────────────────────────────────────────

SELECT
  au.id,
  au.email,
  au.raw_user_meta_data ->> 'role' AS current_role,
  CASE au.raw_user_meta_data ->> 'role'
    WHEN 'head'                 THEN 'osca_head'
    WHEN 'admin'                THEN 'osca_staff'
    WHEN 'resident'             THEN 'senior_citizen'
    ELSE '(no change)'
  END AS will_become
FROM auth.users au
WHERE au.raw_user_meta_data ->> 'role' IN (
  'head', 'admin', 'resident'
);

-- ──────────────────────────────────────────────────────────────────────────────
-- PART B: Apply — Update auth.users JWT metadata (uncomment to execute)
-- ──────────────────────────────────────────────────────────────────────────────
-- Review the preview above first! Then uncomment the block below and run it.

/*
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{role}',
  to_jsonb(
    CASE raw_user_meta_data ->> 'role'
      WHEN 'head'                 THEN 'osca_head'
      WHEN 'admin'                THEN 'osca_staff'
      WHEN 'resident'             THEN 'senior_citizen'
      ELSE raw_user_meta_data ->> 'role'
    END
  )
)
WHERE raw_user_meta_data ->> 'role' IN (
  'head', 'admin', 'resident'
);

-- Verify the fix
SELECT
  au.email,
  au.raw_user_meta_data ->> 'role' AS fixed_role
FROM auth.users au
ORDER BY au.email;
*/

-- ──────────────────────────────────────────────────────────────────────────────
-- PART C: Also sync profiles table (if it has stale legacy roles)
-- ──────────────────────────────────────────────────────────────────────────────

UPDATE public.profiles
SET role = CASE role
    WHEN 'head'                 THEN 'osca_head'
    WHEN 'admin'                THEN 'osca_staff'
    WHEN 'resident'             THEN 'senior_citizen'
    ELSE role
  END,
  updated_at = now()
WHERE role IN (
  'head', 'admin', 'resident'
);
