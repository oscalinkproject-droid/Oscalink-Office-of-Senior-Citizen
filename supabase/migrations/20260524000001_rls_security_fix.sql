-- OSCALink: Comprehensive RLS Security Fix
-- Enables RLS on ALL tables, drops permissive public policies,
-- and creates strict role-based policies using auth.jwt() -> 'user_metadata'.

-- ============================================================
-- Helper: Role check functions (used in policies to reduce duplication)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_city_wide_role()
RETURNS BOOLEAN
LANGUAGE SQL STABLE
AS $$
  SELECT auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer');
$$;

CREATE OR REPLACE FUNCTION public.is_sector_locked_role()
RETURNS BOOLEAN
LANGUAGE SQL STABLE
AS $$
  SELECT auth.jwt() -> 'user_metadata' ->> 'role' IN ('official', 'para_social_worker');
$$;

CREATE OR REPLACE FUNCTION public.is_mayor_role()
RETURNS BOOLEAN
LANGUAGE SQL STABLE
AS $$
  SELECT auth.jwt() -> 'user_metadata' ->> 'role' = 'mayor';
$$;

CREATE OR REPLACE FUNCTION public.user_barangay()
RETURNS TEXT
LANGUAGE SQL STABLE
AS $$
  SELECT auth.jwt() -> 'user_metadata' ->> 'barangay';
$$;

-- ============================================================
-- 1. seniors
-- ============================================================

ALTER TABLE public.seniors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON public.seniors;

-- City-wide: full access
CREATE POLICY "city_wide_select_seniors" ON public.seniors
  FOR SELECT USING (public.is_city_wide_role());

CREATE POLICY "city_wide_insert_seniors" ON public.seniors
  FOR INSERT WITH CHECK (public.is_city_wide_role());

CREATE POLICY "city_wide_update_seniors" ON public.seniors
  FOR UPDATE USING (public.is_city_wide_role());

CREATE POLICY "city_wide_delete_seniors" ON public.seniors
  FOR DELETE USING (public.is_city_wide_role());

-- Sector-locked: their own barangay only
CREATE POLICY "sector_locked_select_seniors" ON public.seniors
  FOR SELECT USING (
    public.is_sector_locked_role()
    AND seniors.barangay = public.user_barangay()
  );

CREATE POLICY "sector_locked_insert_seniors" ON public.seniors
  FOR INSERT WITH CHECK (
    public.is_sector_locked_role()
  );

CREATE POLICY "sector_locked_update_seniors" ON public.seniors
  FOR UPDATE USING (
    public.is_sector_locked_role()
    AND seniors.barangay = public.user_barangay()
  );

-- Mayor: read-only on all records
CREATE POLICY "mayor_select_seniors" ON public.seniors
  FOR SELECT USING (public.is_mayor_role());

-- Residents: own record only (via auth.uid() matching)
-- Note: Resident portal currently uses localStorage-based auth.
-- This policy covers residents with proper Supabase Auth sessions.
CREATE POLICY "resident_select_seniors" ON public.seniors
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'resident'
    AND seniors.id = auth.uid()
  );

CREATE POLICY "resident_update_seniors" ON public.seniors
  FOR UPDATE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'resident'
    AND seniors.id = auth.uid()
  );

-- ============================================================
-- 2. profiles
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- City-wide: full access
CREATE POLICY "city_wide_select_profiles" ON public.profiles
  FOR SELECT USING (public.is_city_wide_role());

CREATE POLICY "city_wide_insert_profiles" ON public.profiles
  FOR INSERT WITH CHECK (public.is_city_wide_role());

CREATE POLICY "city_wide_update_profiles" ON public.profiles
  FOR UPDATE USING (public.is_city_wide_role());

CREATE POLICY "city_wide_delete_profiles" ON public.profiles
  FOR DELETE USING (public.is_city_wide_role());

-- Sector-locked: select within their barangay only, update own profile only
CREATE POLICY "sector_locked_select_profiles" ON public.profiles
  FOR SELECT USING (
    public.is_sector_locked_role()
    AND profiles.barangay = public.user_barangay()
  );

CREATE POLICY "sector_locked_update_own_profile" ON public.profiles
  FOR UPDATE USING (
    public.is_sector_locked_role()
    AND profiles.id = auth.uid()
  );

-- All authenticated users: select own profile
CREATE POLICY "authenticated_select_own_profile" ON public.profiles
  FOR SELECT USING (auth.uid() = profiles.id);

CREATE POLICY "authenticated_update_own_profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = profiles.id);

-- ============================================================
-- 3. assistance_requests
-- ============================================================

ALTER TABLE public.assistance_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON public.assistance_requests;

-- City-wide: full access
CREATE POLICY "city_wide_select_assistance_requests" ON public.assistance_requests
  FOR SELECT USING (public.is_city_wide_role());

CREATE POLICY "city_wide_insert_assistance_requests" ON public.assistance_requests
  FOR INSERT WITH CHECK (public.is_city_wide_role());

CREATE POLICY "city_wide_update_assistance_requests" ON public.assistance_requests
  FOR UPDATE USING (public.is_city_wide_role());

CREATE POLICY "city_wide_delete_assistance_requests" ON public.assistance_requests
  FOR DELETE USING (public.is_city_wide_role());

-- Sector-locked: their barangay only
CREATE POLICY "sector_locked_select_assistance_requests" ON public.assistance_requests
  FOR SELECT USING (
    public.is_sector_locked_role()
    AND assistance_requests.barangay = public.user_barangay()
  );

CREATE POLICY "sector_locked_insert_assistance_requests" ON public.assistance_requests
  FOR INSERT WITH CHECK (
    public.is_sector_locked_role()
  );

CREATE POLICY "sector_locked_update_assistance_requests" ON public.assistance_requests
  FOR UPDATE USING (
    public.is_sector_locked_role()
    AND assistance_requests.barangay = public.user_barangay()
  );

-- Residents: own requests only (via senior_id matching)
CREATE POLICY "resident_select_assistance_requests" ON public.assistance_requests
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'resident'
    AND assistance_requests.senior_id = auth.uid()
  );

-- ============================================================
-- 4. appointments
-- ============================================================

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON public.appointments;

-- City-wide: full access
CREATE POLICY "city_wide_select_appointments" ON public.appointments
  FOR SELECT USING (public.is_city_wide_role());

CREATE POLICY "city_wide_insert_appointments" ON public.appointments
  FOR INSERT WITH CHECK (public.is_city_wide_role());

CREATE POLICY "city_wide_update_appointments" ON public.appointments
  FOR UPDATE USING (public.is_city_wide_role());

CREATE POLICY "city_wide_delete_appointments" ON public.appointments
  FOR DELETE USING (public.is_city_wide_role());

-- Sector-locked: read only (appointments tied to their barangay seniors)
CREATE POLICY "sector_locked_select_appointments" ON public.appointments
  FOR SELECT USING (
    public.is_sector_locked_role()
    AND EXISTS (
      SELECT 1 FROM public.seniors
      WHERE seniors.id = appointments.senior_id
      AND seniors.barangay = public.user_barangay()
    )
  );

-- Residents: own appointments
CREATE POLICY "resident_select_appointments" ON public.appointments
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'resident'
    AND appointments.senior_id = auth.uid()
  );

CREATE POLICY "resident_insert_appointments" ON public.appointments
  FOR INSERT WITH CHECK (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'resident'
  );

CREATE POLICY "resident_update_appointments" ON public.appointments
  FOR UPDATE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'resident'
    AND appointments.senior_id = auth.uid()
  );

CREATE POLICY "resident_delete_appointments" ON public.appointments
  FOR DELETE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'resident'
    AND appointments.senior_id = auth.uid()
  );

-- ============================================================
-- 5. complaints
-- ============================================================

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- City-wide with canManageComplaints: full access
CREATE POLICY "city_wide_select_complaints" ON public.complaints
  FOR SELECT USING (public.is_city_wide_role());

CREATE POLICY "city_wide_insert_complaints" ON public.complaints
  FOR INSERT WITH CHECK (public.is_city_wide_role());

CREATE POLICY "city_wide_update_complaints" ON public.complaints
  FOR UPDATE USING (public.is_city_wide_role());

CREATE POLICY "city_wide_delete_complaints" ON public.complaints
  FOR DELETE USING (public.is_city_wide_role());

-- Sector-locked: read only within barangay
CREATE POLICY "sector_locked_select_complaints" ON public.complaints
  FOR SELECT USING (
    public.is_sector_locked_role()
    AND EXISTS (
      SELECT 1 FROM public.seniors
      WHERE seniors.id = complaints.senior_id
      AND seniors.barangay = public.user_barangay()
    )
  );

-- Residents: view own complaints
CREATE POLICY "resident_select_complaints" ON public.complaints
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'resident'
    AND complaints.senior_id = auth.uid()
  );

-- ============================================================
-- 6. id_inventory
-- ============================================================

ALTER TABLE public.id_inventory ENABLE ROW LEVEL SECURITY;

-- City-wide: full access
CREATE POLICY "city_wide_select_id_inventory" ON public.id_inventory
  FOR SELECT USING (public.is_city_wide_role());

CREATE POLICY "city_wide_insert_id_inventory" ON public.id_inventory
  FOR INSERT WITH CHECK (public.is_city_wide_role());

CREATE POLICY "city_wide_update_id_inventory" ON public.id_inventory
  FOR UPDATE USING (public.is_city_wide_role());

CREATE POLICY "city_wide_delete_id_inventory" ON public.id_inventory
  FOR DELETE USING (public.is_city_wide_role());

-- Sector-locked: read within barangay
CREATE POLICY "sector_locked_select_id_inventory" ON public.id_inventory
  FOR SELECT USING (
    public.is_sector_locked_role()
    AND EXISTS (
      SELECT 1 FROM public.seniors
      WHERE seniors.id = id_inventory.senior_id
      AND seniors.barangay = public.user_barangay()
    )
  );

-- ============================================================
-- 7. bedridden_verifications
-- ============================================================

ALTER TABLE public.bedridden_verifications ENABLE ROW LEVEL SECURITY;

-- City-wide: full access
CREATE POLICY "city_wide_select_bedridden" ON public.bedridden_verifications
  FOR SELECT USING (public.is_city_wide_role());

CREATE POLICY "city_wide_insert_bedridden" ON public.bedridden_verifications
  FOR INSERT WITH CHECK (public.is_city_wide_role());

CREATE POLICY "city_wide_update_bedridden" ON public.bedridden_verifications
  FOR UPDATE USING (public.is_city_wide_role());

CREATE POLICY "city_wide_delete_bedridden" ON public.bedridden_verifications
  FOR DELETE USING (public.is_city_wide_role());

-- Sector-locked: read/update verifications assigned to them or within barangay
CREATE POLICY "sector_locked_select_bedridden" ON public.bedridden_verifications
  FOR SELECT USING (
    public.is_sector_locked_role()
    AND (
      bedridden_verifications.assigned_official_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.seniors
        WHERE seniors.id = bedridden_verifications.senior_id
        AND seniors.barangay = public.user_barangay()
      )
    )
  );

CREATE POLICY "sector_locked_update_bedridden" ON public.bedridden_verifications
  FOR UPDATE USING (
    public.is_sector_locked_role()
    AND bedridden_verifications.assigned_official_id = auth.uid()
  );

-- ============================================================
-- 8. quarterly_updates
-- ============================================================

ALTER TABLE public.quarterly_updates ENABLE ROW LEVEL SECURITY;

-- City-wide: full access
CREATE POLICY "city_wide_select_quarterly" ON public.quarterly_updates
  FOR SELECT USING (public.is_city_wide_role());

CREATE POLICY "city_wide_insert_quarterly" ON public.quarterly_updates
  FOR INSERT WITH CHECK (public.is_city_wide_role());

CREATE POLICY "city_wide_update_quarterly" ON public.quarterly_updates
  FOR UPDATE USING (public.is_city_wide_role());

CREATE POLICY "city_wide_delete_quarterly" ON public.quarterly_updates
  FOR DELETE USING (public.is_city_wide_role());

-- ============================================================
-- 9. endorsements (individual)
-- ============================================================

ALTER TABLE public.endorsements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read endorsements" ON public.endorsements;
DROP POLICY IF EXISTS "Allow authenticated insert endorsements" ON public.endorsements;

-- City-wide: full access
CREATE POLICY "city_wide_select_endorsements" ON public.endorsements
  FOR SELECT USING (public.is_city_wide_role());

CREATE POLICY "city_wide_insert_endorsements" ON public.endorsements
  FOR INSERT WITH CHECK (public.is_city_wide_role());

CREATE POLICY "city_wide_update_endorsements" ON public.endorsements
  FOR UPDATE USING (public.is_city_wide_role());

-- Sector-locked: insert and select within their barangay
CREATE POLICY "sector_locked_select_endorsements" ON public.endorsements
  FOR SELECT USING (
    public.is_sector_locked_role()
    AND endorsements.barangay = public.user_barangay()
  );

CREATE POLICY "sector_locked_insert_endorsements" ON public.endorsements
  FOR INSERT WITH CHECK (
    public.is_sector_locked_role()
  );

-- ============================================================
-- 10. batch_endorsements
-- ============================================================

ALTER TABLE public.batch_endorsements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read batch_endorsements" ON public.batch_endorsements;

CREATE POLICY "city_wide_select_batch" ON public.batch_endorsements
  FOR SELECT USING (public.is_city_wide_role());

CREATE POLICY "city_wide_insert_batch" ON public.batch_endorsements
  FOR INSERT WITH CHECK (public.is_city_wide_role());

CREATE POLICY "city_wide_update_batch" ON public.batch_endorsements
  FOR UPDATE USING (public.is_city_wide_role());

CREATE POLICY "sector_locked_select_batch" ON public.batch_endorsements
  FOR SELECT USING (
    public.is_sector_locked_role()
    AND batch_endorsements.barangay = public.user_barangay()
  );

CREATE POLICY "sector_locked_insert_batch" ON public.batch_endorsements
  FOR INSERT WITH CHECK (
    public.is_sector_locked_role()
  );

-- ============================================================
-- 11. batch_endorsement_items
-- ============================================================

ALTER TABLE public.batch_endorsement_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read batch_endorsement_items" ON public.batch_endorsement_items;

CREATE POLICY "city_wide_select_batch_items" ON public.batch_endorsement_items
  FOR SELECT USING (public.is_city_wide_role());

CREATE POLICY "city_wide_insert_batch_items" ON public.batch_endorsement_items
  FOR INSERT WITH CHECK (public.is_city_wide_role());

CREATE POLICY "city_wide_update_batch_items" ON public.batch_endorsement_items
  FOR UPDATE USING (public.is_city_wide_role());

-- ============================================================
-- 12. municipal_config (retain public read, restrict write)
-- ============================================================

-- Recreate more specific policy
DROP POLICY IF EXISTS "Allow public read municipal_config" ON public.municipal_config;
DROP POLICY IF EXISTS "Allow service_role full access municipal_config" ON public.municipal_config;

CREATE POLICY "public_read_municipal_config" ON public.municipal_config
  FOR SELECT USING (true);

CREATE POLICY "city_wide_update_municipal_config" ON public.municipal_config
  FOR UPDATE USING (public.is_city_wide_role());

-- ============================================================
-- 13. news (retain published read, restrict write)
-- ============================================================

DROP POLICY IF EXISTS "Allow public read access to published news" ON public.news;
DROP POLICY IF EXISTS "Allow insert access to news" ON public.news;
DROP POLICY IF EXISTS "Allow update access to news" ON public.news;

CREATE POLICY "public_read_published_news" ON public.news
  FOR SELECT USING (is_published = true);

CREATE POLICY "city_wide_insert_news" ON public.news
  FOR INSERT WITH CHECK (public.is_city_wide_role());

CREATE POLICY "city_wide_update_news" ON public.news
  FOR UPDATE USING (public.is_city_wide_role());

CREATE POLICY "city_wide_delete_news" ON public.news
  FOR DELETE USING (public.is_city_wide_role());

-- ============================================================
-- 14. downloads (retain public read, restrict write)
-- ============================================================

DROP POLICY IF EXISTS "Allow public read access to downloads" ON public.downloads;
DROP POLICY IF EXISTS "Allow insert access to downloads" ON public.downloads;
DROP POLICY IF EXISTS "Allow update access to downloads" ON public.downloads;

CREATE POLICY "public_read_active_downloads" ON public.downloads
  FOR SELECT USING (is_active = true);

CREATE POLICY "city_wide_insert_downloads" ON public.downloads
  FOR INSERT WITH CHECK (public.is_city_wide_role());

CREATE POLICY "city_wide_update_downloads" ON public.downloads
  FOR UPDATE USING (public.is_city_wide_role());

CREATE POLICY "city_wide_delete_downloads" ON public.downloads
  FOR DELETE USING (public.is_city_wide_role());

-- ============================================================
-- 15. government_links (retain public read)
-- ============================================================

-- Already has public read; no changes needed

-- ============================================================
-- 16. family_composition (retain/replace if already created)
-- ============================================================

-- Note: If family_composition was already created by the previous migration
-- with its own policies, those policies remain. An ALTER TABLE ensures RLS is on.
ALTER TABLE public.family_composition ENABLE ROW LEVEL SECURITY;

SELECT 'OSCALink: Comprehensive RLS policies applied successfully.' AS result;
