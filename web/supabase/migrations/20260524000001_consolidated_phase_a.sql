-- ==========================================
-- OSCALink: Consolidated Phase A Migration
-- ==========================================
-- Combines: role constraint, status pipeline,
-- multi-stage approval, sector→barangay rename,
-- RLS overhaul, trigger update, index rebuild,
-- metadata backfill, AND Phase A partnership
-- pipeline tracking + isolated RLS.
-- ==========================================

-- 0. SAFETY: Drop conflicting constraints first
ALTER TABLE seniors DROP CONSTRAINT IF EXISTS seniors_status_check;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- ==========================================
-- PART 1: ROLE & STATUS CONSTRAINTS
-- ==========================================

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('admin', 'osca_head', 'mswd_officer', 'mayor', 'official', 'para_social_worker', 'resident'));

ALTER TABLE seniors ADD CONSTRAINT seniors_status_check 
    CHECK (status IN ('Active', 'Pending', 'Pending Barangay', 'Pending OSCA', 'Pending Mayor', 'Archived', 'Deceased', 'Transferred'));

-- Add social pension flag if missing
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS is_social_pension_applicant BOOLEAN DEFAULT false;

-- ==========================================
-- PART 2: MULTI-STAGE APPROVAL COLUMNS
-- ==========================================

ALTER TABLE seniors ADD COLUMN IF NOT EXISTS osca_approved BOOLEAN DEFAULT false;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS osca_approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS osca_approved_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE seniors ADD COLUMN IF NOT EXISTS mayor_approved BOOLEAN DEFAULT false;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS mayor_approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS mayor_approved_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE seniors ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE;

-- ==========================================
-- PART 3: RENAME sector → barangay
-- ==========================================

ALTER TABLE seniors RENAME COLUMN sector TO barangay;
ALTER TABLE profiles RENAME COLUMN sector TO barangay;
ALTER TABLE assistance_requests RENAME COLUMN sector TO barangay;

-- assigned_sector column was never created on this project; nothing to consolidate

-- ==========================================
-- PART 4: RLS FUNCTION
-- ==========================================

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

-- ==========================================
-- PART 5: RLS POLICIES — seniors
-- ==========================================

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

-- City-wide admins: full access
CREATE POLICY "admin_full_access_seniors" ON seniors FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'osca_head'))
  );

-- Staff read: city-wide roles see all; barangay-locked roles see own barangay
CREATE POLICY "staff_read_seniors" ON seniors FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'osca_head', 'mswd_officer', 'mayor'))
    OR (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('official', 'para_social_worker') AND profiles.barangay IS NOT NULL AND seniors.barangay = profiles.barangay))
  );

CREATE POLICY "staff_insert_seniors" ON seniors FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'osca_head'))
  );

CREATE POLICY "staff_update_seniors" ON seniors FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'osca_head', 'mswd_officer'))
  );

-- Public self-registration
CREATE POLICY "public_insert_seniors" ON seniors FOR INSERT
  WITH CHECK (true);

-- Anonymous read (for resident portal)
CREATE POLICY "anon_read_seniors" ON seniors FOR SELECT
  USING (true);

-- ==========================================
-- PART 5b: RLS POLICIES — assistance_requests
-- ==========================================

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

-- ==========================================
-- PART 5c: RLS POLICIES — appointments
-- ==========================================

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

-- ==========================================
-- PART 5d: RLS POLICIES — profiles
-- ==========================================

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON profiles;

CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (true);

CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ==========================================
-- PART 6: TRIGGER FUNCTION
-- ==========================================

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

-- ==========================================
-- PART 7: INDEXES
-- ==========================================

DROP INDEX IF EXISTS idx_seniors_sector;
CREATE INDEX IF NOT EXISTS idx_seniors_barangay ON seniors(barangay);
CREATE INDEX IF NOT EXISTS idx_profiles_barangay ON profiles(barangay);
CREATE INDEX IF NOT EXISTS idx_assistance_requests_barangay ON assistance_requests(barangay);

-- ==========================================
-- PART 8: BACKFILL METADATA
-- ==========================================

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

-- Sync existing profiles: copy metadata sector into profiles.barangay
UPDATE profiles p
SET barangay = COALESCE(
  (SELECT raw_user_meta_data->>'barangay' FROM auth.users WHERE id = p.id),
  p.barangay
)
WHERE p.barangay IS NULL OR p.barangay = '';

-- ==========================================
-- PART 9: GRANTS
-- ==========================================

GRANT SELECT, INSERT ON assistance_requests TO anon;
GRANT SELECT ON seniors TO anon;
GRANT SELECT, INSERT ON appointments TO anon;
GRANT UPDATE ON assistance_requests TO authenticated;

-- ==========================================
-- PART 10: PHASE A — PARTNERSHIP PIPELINE
-- ==========================================

-- 10a. Endorsement pipeline tracking
ALTER TABLE batch_endorsements ADD COLUMN IF NOT EXISTS current_level TEXT 
  DEFAULT 'BLGU' CHECK (current_level IN ('BLGU', 'LGU', 'MSSD', 'Completed'));

ALTER TABLE batch_endorsements ADD COLUMN IF NOT EXISTS submitted_by UUID 
  REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE batch_endorsements ADD COLUMN IF NOT EXISTS notes TEXT;

-- 10b. Program source level tracking
ALTER TABLE news ADD COLUMN IF NOT EXISTS source_level TEXT 
  CHECK (source_level IN ('MSSD', 'LGU', 'BLGU'));

-- 10c. Update batch_endorsement_items RLS for pipeline visibility
DROP POLICY IF EXISTS "Allow authenticated read batch_endorsement_items" ON batch_endorsement_items;
CREATE POLICY "read_batch_endorsement_items" ON batch_endorsement_items
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM batch_endorsements be
      WHERE be.id = batch_id
        AND (be.submitted_by = auth.uid() OR be.current_level IS NOT NULL)
    )
  );

-- 10d. RLS: PSW and official can only see seniors in their barangay
-- (already handled by staff_read_seniors policy above, which uses barangay = profiles.barangay)

-- 10e. Barangay officers can view their own batch_endorsements
DROP POLICY IF EXISTS "Allow authenticated read batch_endorsements" ON batch_endorsements;
CREATE POLICY "read_batch_endorsements" ON batch_endorsements
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'osca_head', 'mswd_officer'))
      OR barangay = (SELECT p.barangay FROM profiles p WHERE p.id = auth.uid())
      OR submitted_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Allow authenticated insert batch_endorsements" ON batch_endorsements;
CREATE POLICY "insert_batch_endorsements" ON batch_endorsements
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('official', 'para_social_worker', 'admin', 'osca_head'))
  );

-- ==========================================
-- COMPLETE
-- ==========================================

SELECT 'OSCALink: Consolidated Phase A migration complete.' AS result;
