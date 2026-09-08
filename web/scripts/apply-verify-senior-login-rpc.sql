-- ============================================================
-- OSCALink: Apply `verify_senior_login` lookup RPC
-- Run this in: Supabase Dashboard -> SQL Editor -> New query -> Run
--
-- WHY: The mobile app logs in with the (public) ANON key. RLS on `seniors`
-- was tightened so the anon role has NO SELECT access, so a direct
-- `.from('seniors')` query returns zero rows (404). This SECURITY DEFINER
-- function runs with the table owner's privileges (bypasses RLS) and performs
-- ONLY a strict, case-insensitive, trimmed lookup, so PENDING records with
-- id_number = NULL can be found by registration_id alone.
-- ============================================================

-- Drop the old unusable two-argument variant (nothing references it).
DROP FUNCTION IF EXISTS verify_senior_login(TEXT, TEXT);

-- Identifier lookup RPC. SECURITY DEFINER bypasses RLS so the anon mobile
-- client can resolve a registration reference / OSCA id. It compares both
-- `registration_id` AND `id_number` case-insensitively after trimming, which
-- is what makes PENDING (id_number = NULL) REF-number records resolve.
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

-- Restrict execution to anon + authenticated only (not PUBLIC).
REVOKE EXECUTE ON FUNCTION verify_senior_login(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION verify_senior_login(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION verify_senior_login(TEXT) TO authenticated;

SELECT 'verify_senior_login RPC created and granted to anon.' AS result;
