-- ============================================
-- OSCALink: Mobile Senior Login Lookup RPC
-- ============================================
-- ROOT CAUSE
-- ----------
-- The mobile app (senior app) authenticates with an in-app session held in
-- AsyncStorage and uses the Supabase ANON key. RLS on `seniors` was tightened
-- in 20260524000001_rls_security_fix.sql, which DROPPED the public read policy
-- and replaced it with role-gated policies (is_city_wide_role /
-- sector_locked / mayor / resident). For the ANON role those policies all
-- evaluate to FALSE, so `.select('*')` on `seniors` returns zero rows even
-- though the web admin (service_role / authenticated) reads the record fine.
--
-- FIX
-- ----
-- Provide a SECURITY DEFINER function that runs with the table owner's
-- privileges (bypassing RLS) and performs ONLY a strict reference/id lookup.
-- ANON is granted EXECUTE so the mobile login works without opening up an
-- unrestricted public SELECT on the whole `seniors` table.
--
-- NOTE: A previous migration (20260524000003_secure_auth_rpcs.sql) created
--       verify_senior_login(TEXT, TEXT) but never granted EXECUTE to anon,
--       so it was unusable from the mobile app. We replace it with a single
--       clean identifier lookup and grant it properly.
-- ============================================

-- 1. Drop the old unusable two-argument variant (nothing in the codebase
--    references it; the mobile app needs an identifier-only lookup).
DROP FUNCTION IF EXISTS verify_senior_login(TEXT, TEXT);

-- 2. Create the identifier lookup RPC. SECURITY DEFINER bypasses RLS so the
--    anon mobile client can resolve a registration reference / OSCA id, while
--    still returning the full senior row for the client to validate birthdate.
CREATE OR REPLACE FUNCTION verify_senior_login(p_identifier TEXT)
RETURNS SETOF public.seniors
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT s.*
  FROM public.seniors s
  WHERE UPPER(TRIM(COALESCE(s.registration_id, ''))) = UPPER(TRIM(p_identifier))
     OR UPPER(TRIM(COALESCE(s.id_number, ''))) = UPPER(TRIM(p_identifier))
  LIMIT 1;
END;
$$;

-- 3. Restrict execution to anon + authenticated only (not PUBLIC).
REVOKE EXECUTE ON FUNCTION verify_senior_login(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION verify_senior_login(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION verify_senior_login(TEXT) TO authenticated;

SELECT 'verify_senior_login RPC created and granted to anon.' AS result;
