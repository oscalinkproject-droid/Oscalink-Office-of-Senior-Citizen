-- ==========================================
-- OSCALink: Rename sector → barangay
-- ==========================================
-- Standardizes terminology across the entire
-- system. PhilHealth Circular 033-2017, OSCA
-- registration forms, and legal references all
-- use "Barangay" — not "sector".
-- ==========================================

-- 1. RENAME COLUMNS
ALTER TABLE seniors RENAME COLUMN sector TO barangay;
ALTER TABLE profiles RENAME COLUMN sector TO barangay;
ALTER TABLE assistance_requests RENAME COLUMN sector TO barangay;

-- 2. CONSOLIDATE assigned_sector INTO barangay
UPDATE profiles SET barangay = COALESCE(assigned_sector, barangay) WHERE assigned_sector IS NOT NULL;
ALTER TABLE profiles DROP COLUMN IF EXISTS assigned_sector;

-- 3. RENAME RLS FUNCTIONS
DROP FUNCTION IF EXISTS public.get_user_sector();
CREATE OR REPLACE FUNCTION public.get_user_barangay()
RETURNS TEXT AS $$
DECLARE
  metadata_barangay TEXT;
  profile_barangay TEXT;
BEGIN
  metadata_barangay := current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'barangay';
  IF metadata_barangay IS NULL THEN
    SELECT barangay INTO profile_barangay FROM public.profiles WHERE id = auth.uid();
    RETURN COALESCE(profile_barangay, 'NONE');
  END IF;
  RETURN metadata_barangay;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. UPDATE RLS POLICIES: seniors
DROP POLICY IF EXISTS "Sector isolated access to seniors" ON seniors;
DROP POLICY IF EXISTS "Admins can view all seniors" ON seniors;
DROP POLICY IF EXISTS "Admins can insert seniors" ON seniors;
DROP POLICY IF EXISTS "Admins can update seniors" ON seniors;
DROP POLICY IF EXISTS "Admins can delete seniors" ON seniors;
DROP POLICY IF EXISTS "Officials can view seniors in their sector" ON seniors;
DROP POLICY IF EXISTS "anon_can_read_seniors" ON seniors;
DROP POLICY IF EXISTS "authenticated_can_read_all_seniors" ON seniors;
DROP POLICY IF EXISTS "public_can_insert_seniors" ON seniors;
DROP POLICY IF EXISTS "Admin full access to seniors" ON seniors;

CREATE POLICY "admin_full_access_seniors" ON seniors FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'osca_head'))
  );

CREATE POLICY "staff_read_seniors" ON seniors FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'osca_head', 'mswd_officer', 'mayor'))
    OR (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'official' AND profiles.barangay IS NOT NULL AND seniors.barangay = profiles.barangay))
  );

CREATE POLICY "staff_insert_seniors" ON seniors FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'osca_head'))
  );

CREATE POLICY "staff_update_seniors" ON seniors FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'osca_head', 'mswd_officer'))
  );

CREATE POLICY "public_insert_seniors" ON seniors FOR INSERT
  WITH CHECK (true);

CREATE POLICY "anon_read_seniors" ON seniors FOR SELECT
  USING (true);

-- 5. UPDATE RLS POLICIES: assistance_requests
DROP POLICY IF EXISTS "Sector isolated access to requests" ON assistance_requests;
DROP POLICY IF EXISTS "authenticated_read_with_sector_isolation" ON assistance_requests;
DROP POLICY IF EXISTS "allow_authenticated_update" ON assistance_requests;
DROP POLICY IF EXISTS "allow_authenticated_read" ON assistance_requests;
DROP POLICY IF EXISTS "allow_authenticated_insert" ON assistance_requests;
DROP POLICY IF EXISTS "allow_anon_read" ON assistance_requests;
DROP POLICY IF EXISTS "allow_anon_insert" ON assistance_requests;
DROP POLICY IF EXISTS "Admin full access to requests" ON assistance_requests;

CREATE POLICY "staff_update_assistance" ON assistance_requests
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "staff_read_assistance" ON assistance_requests
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (
      (auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'official'
      OR barangay = (auth.jwt() -> 'user_metadata' ->> 'barangay')
      OR barangay IS NULL
    )
  );

CREATE POLICY "staff_insert_assistance" ON assistance_requests
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "anon_read_assistance" ON assistance_requests
  FOR SELECT USING (senior_id IS NOT NULL);

CREATE POLICY "anon_insert_assistance" ON assistance_requests
  FOR INSERT WITH CHECK (senior_id IS NOT NULL);

-- 6. UPDATE RLS POLICIES: appointments
DROP POLICY IF EXISTS "Sector isolated access to appointments" ON appointments;
DROP POLICY IF EXISTS "Admin full access to appointments" ON appointments;
DROP POLICY IF EXISTS "anon_can_read_appointments" ON appointments;
DROP POLICY IF EXISTS "anon_can_insert_appointments" ON appointments;
DROP POLICY IF EXISTS "authenticated_can_read_all_appointments" ON appointments;
DROP POLICY IF EXISTS "authenticated_can_update_appointments" ON appointments;

CREATE POLICY "staff_read_appointments" ON appointments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "staff_update_appointments" ON appointments FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "anon_read_appointments" ON appointments FOR SELECT
  USING (senior_id IS NOT NULL);

CREATE POLICY "anon_insert_appointments" ON appointments FOR INSERT
  WITH CHECK (senior_id IS NOT NULL);

-- 7. UPDATE RLS POLICIES: profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON profiles;

CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (true);

CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- 8. UPDATE TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, barangay)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      COALESCE((NEW.raw_user_meta_data->>'role')::text, 'official'),
      COALESCE(NEW.raw_user_meta_data->>'barangay', NULL)
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      barangay = EXCLUDED.barangay,
      updated_at = now();
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'OSCALink: Profile sync failed for user %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. UPDATE INDEXES
DROP INDEX IF EXISTS idx_seniors_sector;
CREATE INDEX IF NOT EXISTS idx_seniors_barangay ON seniors(barangay);
CREATE INDEX IF NOT EXISTS idx_profiles_barangay ON profiles(barangay);

-- 10. BACKFILL METADATA FOR EXISTING USERS (barangay key)
-- This migrates existing user_metadata from sector → barangay
DO $$
DECLARE
  user_rec RECORD;
BEGIN
  FOR user_rec IN SELECT id, raw_user_meta_data FROM auth.users
    WHERE raw_user_meta_data->>'sector' IS NOT NULL
      AND raw_user_meta_data->>'barangay' IS NULL
  LOOP
    UPDATE auth.users
    SET raw_user_meta_data = raw_user_meta_data || 
      jsonb_build_object('barangay', raw_user_meta_data->>'sector')
    WHERE id = user_rec.id;
  END LOOP;
END $$;

-- 11. GRANT PERMISSIONS
GRANT SELECT, INSERT ON assistance_requests TO anon;
GRANT SELECT ON seniors TO anon;
GRANT SELECT, INSERT ON appointments TO anon;
GRANT UPDATE ON assistance_requests TO authenticated;

SELECT 'OSCALink: sector → barangay rename complete.' AS result;
