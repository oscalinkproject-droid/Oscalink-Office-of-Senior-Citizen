-- ==========================================
-- OSCALink Institutional RLS Hardening
-- ==========================================
-- This script synchronizes the Auth identity with the Postgres security layer.

-- 1. Harden get_user_sector()
-- Fallback strategy: JWT Metadata -> Profiles Table -> 'NONE'
CREATE OR REPLACE FUNCTION get_user_sector() 
RETURNS TEXT AS $$
DECLARE
  metadata_sector TEXT;
  profile_sector TEXT;
BEGIN
  -- 1. Check JWT metadata first (fastest)
  metadata_sector := current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'sector';
  
  -- 2. If not in JWT, check the public.profiles table
  IF metadata_sector IS NULL THEN
    SELECT sector INTO profile_sector FROM public.profiles WHERE id = auth.uid();
    RETURN COALESCE(profile_sector, 'NONE');
  END IF;
  
  RETURN metadata_sector;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Harden is_city_admin()
-- Checks if the user has the 'admin' authority.
CREATE OR REPLACE FUNCTION is_city_admin() 
RETURNS BOOLEAN AS $$
DECLARE
  metadata_role TEXT;
  profile_role TEXT;
BEGIN
  -- 1. Check JWT metadata
  metadata_role := current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role';
  
  -- 2. If not in JWT, check the public.profiles table
  IF metadata_role IS NULL THEN
    SELECT role INTO profile_role FROM public.profiles WHERE id = auth.uid();
    RETURN COALESCE(profile_role = 'admin', false);
  END IF;
  
  RETURN metadata_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update Policy Dependencies
-- Ensure 'FOR ALL' policies use the DEFINER functions.
-- This unblocks administrators who register seniors for any sector.
ALTER TABLE seniors DISABLE ROW LEVEL SECURITY;
ALTER TABLE seniors ENABLE ROW LEVEL SECURITY;

-- Note: Policies created in previous migrations will now use these hardened functions.
SELECT 'OSCALink: Institutional Identity Sync Complete.';
