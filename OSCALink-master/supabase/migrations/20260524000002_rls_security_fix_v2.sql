-- OSCALink: RLS Security Fix v2
-- Drops ALL legacy permissive policies from consolidated_phase_a.sql
-- and recreates with inlined auth.jwt() checks.
--
-- Tables WITH barangay column: seniors, profiles, assistance_requests,
--   endorsements, batch_endorsements -> full sector-locked policies
-- Tables WITHOUT barangay column: appointments, complaints, id_inventory,
--   bedridden_verifications, quarterly_updates, batch_endorsement_items,
--   family_composition -> only city-wide + mayor policies (no sector-locked)

-- ============================================================
-- 1. Drop ALL old policies (any naming convention, any schema)
-- ============================================================

-- seniors
DROP POLICY IF EXISTS "public_insert_seniors" ON seniors;
DROP POLICY IF EXISTS "anon_read_seniors" ON seniors;
DROP POLICY IF EXISTS "staff_read_seniors" ON seniors;
DROP POLICY IF EXISTS "staff_insert_seniors" ON seniors;
DROP POLICY IF EXISTS "staff_update_seniors" ON seniors;
DROP POLICY IF EXISTS "admin_full_access_seniors" ON seniors;
DROP POLICY IF EXISTS "Allow public read access" ON seniors;
DROP POLICY IF EXISTS "city_wide_select_seniors" ON seniors;
DROP POLICY IF EXISTS "city_wide_insert_seniors" ON seniors;
DROP POLICY IF EXISTS "city_wide_update_seniors" ON seniors;
DROP POLICY IF EXISTS "city_wide_delete_seniors" ON seniors;
DROP POLICY IF EXISTS "sector_locked_select_seniors" ON seniors;
DROP POLICY IF EXISTS "sector_locked_insert_seniors" ON seniors;
DROP POLICY IF EXISTS "sector_locked_update_seniors" ON seniors;
DROP POLICY IF EXISTS "mayor_select_seniors" ON seniors;
DROP POLICY IF EXISTS "resident_select_seniors" ON seniors;
DROP POLICY IF EXISTS "resident_update_seniors" ON seniors;

-- profiles
DROP POLICY IF EXISTS "public_insert_profiles" ON profiles;
DROP POLICY IF EXISTS "anon_read_profiles" ON profiles;
DROP POLICY IF EXISTS "staff_read_profiles" ON profiles;
DROP POLICY IF EXISTS "staff_insert_profiles" ON profiles;
DROP POLICY IF EXISTS "staff_update_profiles" ON profiles;
DROP POLICY IF EXISTS "admin_full_access_profiles" ON profiles;
DROP POLICY IF EXISTS "Allow public read access" ON profiles;
DROP POLICY IF EXISTS "city_wide_select_profiles" ON profiles;
DROP POLICY IF EXISTS "city_wide_insert_profiles" ON profiles;
DROP POLICY IF EXISTS "city_wide_update_profiles" ON profiles;
DROP POLICY IF EXISTS "city_wide_delete_profiles" ON profiles;
DROP POLICY IF EXISTS "sector_locked_select_profiles" ON profiles;
DROP POLICY IF EXISTS "sector_locked_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "authenticated_select_own_profile" ON profiles;
DROP POLICY IF EXISTS "authenticated_update_own_profile" ON profiles;

-- assistance_requests
DROP POLICY IF EXISTS "public_insert_assistance_requests" ON assistance_requests;
DROP POLICY IF EXISTS "anon_read_assistance_requests" ON assistance_requests;
DROP POLICY IF EXISTS "staff_read_assistance_requests" ON assistance_requests;
DROP POLICY IF EXISTS "staff_insert_assistance_requests" ON assistance_requests;
DROP POLICY IF EXISTS "staff_update_assistance_requests" ON assistance_requests;
DROP POLICY IF EXISTS "admin_full_access_assistance_requests" ON assistance_requests;
DROP POLICY IF EXISTS "Allow public read access" ON assistance_requests;
DROP POLICY IF EXISTS "city_wide_select_assistance_requests" ON assistance_requests;
DROP POLICY IF EXISTS "city_wide_insert_assistance_requests" ON assistance_requests;
DROP POLICY IF EXISTS "city_wide_update_assistance_requests" ON assistance_requests;
DROP POLICY IF EXISTS "city_wide_delete_assistance_requests" ON assistance_requests;
DROP POLICY IF EXISTS "sector_locked_select_assistance_requests" ON assistance_requests;
DROP POLICY IF EXISTS "sector_locked_insert_assistance_requests" ON assistance_requests;
DROP POLICY IF EXISTS "sector_locked_update_assistance_requests" ON assistance_requests;
DROP POLICY IF EXISTS "mayor_select_assistance_requests" ON assistance_requests;

-- appointments
DROP POLICY IF EXISTS "public_insert_appointments" ON appointments;
DROP POLICY IF EXISTS "anon_read_appointments" ON appointments;
DROP POLICY IF EXISTS "Allow public read access" ON appointments;
DROP POLICY IF EXISTS "city_wide_select_appointments" ON appointments;
DROP POLICY IF EXISTS "city_wide_insert_appointments" ON appointments;
DROP POLICY IF EXISTS "city_wide_update_appointments" ON appointments;
DROP POLICY IF EXISTS "city_wide_delete_appointments" ON appointments;
DROP POLICY IF EXISTS "sector_locked_select_appointments" ON appointments;
DROP POLICY IF EXISTS "sector_locked_insert_appointments" ON appointments;
DROP POLICY IF EXISTS "sector_locked_update_appointments" ON appointments;
DROP POLICY IF EXISTS "mayor_select_appointments" ON appointments;

-- complaints
DROP POLICY IF EXISTS "public_insert_complaints" ON complaints;
DROP POLICY IF EXISTS "anon_read_complaints" ON complaints;
DROP POLICY IF EXISTS "Allow public read access" ON complaints;
DROP POLICY IF EXISTS "city_wide_select_complaints" ON complaints;
DROP POLICY IF EXISTS "city_wide_insert_complaints" ON complaints;
DROP POLICY IF EXISTS "city_wide_update_complaints" ON complaints;
DROP POLICY IF EXISTS "city_wide_delete_complaints" ON complaints;
DROP POLICY IF EXISTS "sector_locked_select_complaints" ON complaints;
DROP POLICY IF EXISTS "sector_locked_insert_complaints" ON complaints;
DROP POLICY IF EXISTS "sector_locked_update_complaints" ON complaints;
DROP POLICY IF EXISTS "mayor_select_complaints" ON complaints;

-- id_inventory
DROP POLICY IF EXISTS "public_insert_id_inventory" ON id_inventory;
DROP POLICY IF EXISTS "anon_read_id_inventory" ON id_inventory;
DROP POLICY IF EXISTS "Allow public read access" ON id_inventory;
DROP POLICY IF EXISTS "city_wide_select_id_inventory" ON id_inventory;
DROP POLICY IF EXISTS "city_wide_insert_id_inventory" ON id_inventory;
DROP POLICY IF EXISTS "city_wide_update_id_inventory" ON id_inventory;
DROP POLICY IF EXISTS "city_wide_delete_id_inventory" ON id_inventory;
DROP POLICY IF EXISTS "sector_locked_select_id_inventory" ON id_inventory;
DROP POLICY IF EXISTS "sector_locked_insert_id_inventory" ON id_inventory;
DROP POLICY IF EXISTS "sector_locked_update_id_inventory" ON id_inventory;
DROP POLICY IF EXISTS "mayor_select_id_inventory" ON id_inventory;

-- bedridden_verifications
DROP POLICY IF EXISTS "public_insert_bedridden_verifications" ON bedridden_verifications;
DROP POLICY IF EXISTS "anon_read_bedridden_verifications" ON bedridden_verifications;
DROP POLICY IF EXISTS "Allow public read access" ON bedridden_verifications;
DROP POLICY IF EXISTS "city_wide_select_bedridden_verifications" ON bedridden_verifications;
DROP POLICY IF EXISTS "city_wide_insert_bedridden_verifications" ON bedridden_verifications;
DROP POLICY IF EXISTS "city_wide_update_bedridden_verifications" ON bedridden_verifications;
DROP POLICY IF EXISTS "city_wide_delete_bedridden_verifications" ON bedridden_verifications;
DROP POLICY IF EXISTS "sector_locked_select_bedridden_verifications" ON bedridden_verifications;
DROP POLICY IF EXISTS "sector_locked_insert_bedridden_verifications" ON bedridden_verifications;
DROP POLICY IF EXISTS "sector_locked_update_bedridden_verifications" ON bedridden_verifications;
DROP POLICY IF EXISTS "mayor_select_bedridden_verifications" ON bedridden_verifications;

-- quarterly_updates
DROP POLICY IF EXISTS "public_insert_quarterly_updates" ON quarterly_updates;
DROP POLICY IF EXISTS "anon_read_quarterly_updates" ON quarterly_updates;
DROP POLICY IF EXISTS "Allow public read access" ON quarterly_updates;
DROP POLICY IF EXISTS "city_wide_select_quarterly_updates" ON quarterly_updates;
DROP POLICY IF EXISTS "city_wide_insert_quarterly_updates" ON quarterly_updates;
DROP POLICY IF EXISTS "city_wide_update_quarterly_updates" ON quarterly_updates;
DROP POLICY IF EXISTS "city_wide_delete_quarterly_updates" ON quarterly_updates;
DROP POLICY IF EXISTS "sector_locked_select_quarterly_updates" ON quarterly_updates;
DROP POLICY IF EXISTS "sector_locked_insert_quarterly_updates" ON quarterly_updates;
DROP POLICY IF EXISTS "sector_locked_update_quarterly_updates" ON quarterly_updates;
DROP POLICY IF EXISTS "mayor_select_quarterly_updates" ON quarterly_updates;

-- endorsements
DROP POLICY IF EXISTS "public_insert_endorsements" ON endorsements;
DROP POLICY IF EXISTS "anon_read_endorsements" ON endorsements;
DROP POLICY IF EXISTS "Allow public read access" ON endorsements;
DROP POLICY IF EXISTS "city_wide_select_endorsements" ON endorsements;
DROP POLICY IF EXISTS "city_wide_insert_endorsements" ON endorsements;
DROP POLICY IF EXISTS "city_wide_update_endorsements" ON endorsements;
DROP POLICY IF EXISTS "city_wide_delete_endorsements" ON endorsements;
DROP POLICY IF EXISTS "sector_locked_select_endorsements" ON endorsements;
DROP POLICY IF EXISTS "sector_locked_insert_endorsements" ON endorsements;
DROP POLICY IF EXISTS "sector_locked_update_endorsements" ON endorsements;
DROP POLICY IF EXISTS "mayor_select_endorsements" ON endorsements;

-- batch_endorsements
DROP POLICY IF EXISTS "public_insert_batch_endorsements" ON batch_endorsements;
DROP POLICY IF EXISTS "anon_read_batch_endorsements" ON batch_endorsements;
DROP POLICY IF EXISTS "Allow public read access" ON batch_endorsements;
DROP POLICY IF EXISTS "city_wide_select_batch_endorsements" ON batch_endorsements;
DROP POLICY IF EXISTS "city_wide_insert_batch_endorsements" ON batch_endorsements;
DROP POLICY IF EXISTS "city_wide_update_batch_endorsements" ON batch_endorsements;
DROP POLICY IF EXISTS "city_wide_delete_batch_endorsements" ON batch_endorsements;
DROP POLICY IF EXISTS "sector_locked_select_batch_endorsements" ON batch_endorsements;
DROP POLICY IF EXISTS "sector_locked_insert_batch_endorsements" ON batch_endorsements;
DROP POLICY IF EXISTS "sector_locked_update_batch_endorsements" ON batch_endorsements;
DROP POLICY IF EXISTS "mayor_select_batch_endorsements" ON batch_endorsements;

-- batch_endorsement_items
DROP POLICY IF EXISTS "public_insert_batch_endorsement_items" ON batch_endorsement_items;
DROP POLICY IF EXISTS "anon_read_batch_endorsement_items" ON batch_endorsement_items;
DROP POLICY IF EXISTS "Allow public read access" ON batch_endorsement_items;
DROP POLICY IF EXISTS "city_wide_select_batch_endorsement_items" ON batch_endorsement_items;
DROP POLICY IF EXISTS "city_wide_insert_batch_endorsement_items" ON batch_endorsement_items;
DROP POLICY IF EXISTS "city_wide_update_batch_endorsement_items" ON batch_endorsement_items;
DROP POLICY IF EXISTS "city_wide_delete_batch_endorsement_items" ON batch_endorsement_items;
DROP POLICY IF EXISTS "sector_locked_select_batch_endorsement_items" ON batch_endorsement_items;
DROP POLICY IF EXISTS "sector_locked_insert_batch_endorsement_items" ON batch_endorsement_items;
DROP POLICY IF EXISTS "sector_locked_update_batch_endorsement_items" ON batch_endorsement_items;
DROP POLICY IF EXISTS "mayor_select_batch_endorsement_items" ON batch_endorsement_items;

-- family_composition
DROP POLICY IF EXISTS "public_insert_family_composition" ON family_composition;
DROP POLICY IF EXISTS "anon_read_family_composition" ON family_composition;
DROP POLICY IF EXISTS "Allow public read access" ON family_composition;
DROP POLICY IF EXISTS "sector_locked_select_family_composition" ON family_composition;
DROP POLICY IF EXISTS "sector_locked_insert_family_composition" ON family_composition;
DROP POLICY IF EXISTS "sector_locked_update_family_composition" ON family_composition;
DROP POLICY IF EXISTS "city_wide_select_family_composition" ON family_composition;
DROP POLICY IF EXISTS "city_wide_insert_family_composition" ON family_composition;
DROP POLICY IF EXISTS "city_wide_update_family_composition" ON family_composition;
DROP POLICY IF EXISTS "city_wide_delete_family_composition" ON family_composition;
DROP POLICY IF EXISTS "mayor_select_family_composition" ON family_composition;

-- news
DROP POLICY IF EXISTS "Allow public read access to published news" ON news;
DROP POLICY IF EXISTS "Allow insert access to news" ON news;
DROP POLICY IF EXISTS "Allow update access to news" ON news;
DROP POLICY IF EXISTS "public_read_published_news" ON news;
DROP POLICY IF EXISTS "city_wide_insert_news" ON news;
DROP POLICY IF EXISTS "city_wide_update_news" ON news;
DROP POLICY IF EXISTS "city_wide_delete_news" ON news;

-- downloads
DROP POLICY IF EXISTS "Allow public read access to downloads" ON downloads;
DROP POLICY IF EXISTS "Allow insert access to downloads" ON downloads;
DROP POLICY IF EXISTS "Allow update access to downloads" ON downloads;
DROP POLICY IF EXISTS "public_read_active_downloads" ON downloads;
DROP POLICY IF EXISTS "city_wide_insert_downloads" ON downloads;
DROP POLICY IF EXISTS "city_wide_update_downloads" ON downloads;
DROP POLICY IF EXISTS "city_wide_delete_downloads" ON downloads;

-- ============================================================
-- 2. Recreate all policies with INLINED role checks
-- ============================================================

-- -------------------------------------------------------
-- seniors (HAS barangay) — full policies
-- -------------------------------------------------------
CREATE POLICY "city_wide_select_seniors" ON seniors
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_insert_seniors" ON seniors
  FOR INSERT WITH CHECK (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_update_seniors" ON seniors
  FOR UPDATE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_delete_seniors" ON seniors
  FOR DELETE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );

CREATE POLICY "sector_locked_select_seniors" ON seniors
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('official', 'para_social_worker')
    AND seniors.barangay = (auth.jwt() -> 'user_metadata' ->> 'barangay')
  );
CREATE POLICY "sector_locked_insert_seniors" ON seniors
  FOR INSERT WITH CHECK (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('official', 'para_social_worker')
  );
CREATE POLICY "sector_locked_update_seniors" ON seniors
  FOR UPDATE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('official', 'para_social_worker')
    AND seniors.barangay = (auth.jwt() -> 'user_metadata' ->> 'barangay')
  );

CREATE POLICY "mayor_select_seniors" ON seniors
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'mayor'
  );

CREATE POLICY "resident_select_seniors" ON seniors
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'resident'
    AND seniors.id = auth.uid()
  );
CREATE POLICY "resident_update_seniors" ON seniors
  FOR UPDATE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'resident'
    AND seniors.id = auth.uid()
  );

-- -------------------------------------------------------
-- profiles (HAS barangay) — full policies
-- -------------------------------------------------------
CREATE POLICY "city_wide_select_profiles" ON profiles
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_insert_profiles" ON profiles
  FOR INSERT WITH CHECK (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_update_profiles" ON profiles
  FOR UPDATE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_delete_profiles" ON profiles
  FOR DELETE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );

CREATE POLICY "sector_locked_select_profiles" ON profiles
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('official', 'para_social_worker')
    AND profiles.barangay = (auth.jwt() -> 'user_metadata' ->> 'barangay')
  );
CREATE POLICY "sector_locked_update_own_profile" ON profiles
  FOR UPDATE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('official', 'para_social_worker')
    AND profiles.id = auth.uid()
  );

CREATE POLICY "authenticated_select_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = profiles.id);
CREATE POLICY "authenticated_update_own_profile" ON profiles
  FOR UPDATE USING (auth.uid() = profiles.id);

-- -------------------------------------------------------
-- assistance_requests (HAS barangay) — full policies
-- -------------------------------------------------------
CREATE POLICY "city_wide_select_assistance_requests" ON assistance_requests
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_insert_assistance_requests" ON assistance_requests
  FOR INSERT WITH CHECK (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_update_assistance_requests" ON assistance_requests
  FOR UPDATE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_delete_assistance_requests" ON assistance_requests
  FOR DELETE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "sector_locked_select_assistance_requests" ON assistance_requests
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('official', 'para_social_worker')
    AND assistance_requests.barangay = (auth.jwt() -> 'user_metadata' ->> 'barangay')
  );
CREATE POLICY "sector_locked_insert_assistance_requests" ON assistance_requests
  FOR INSERT WITH CHECK (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('official', 'para_social_worker')
  );
CREATE POLICY "sector_locked_update_assistance_requests" ON assistance_requests
  FOR UPDATE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('official', 'para_social_worker')
    AND assistance_requests.barangay = (auth.jwt() -> 'user_metadata' ->> 'barangay')
  );
CREATE POLICY "mayor_select_assistance_requests" ON assistance_requests
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'mayor'
  );

-- -------------------------------------------------------
-- appointments (NO barangay) — city-wide + mayor only
-- -------------------------------------------------------
CREATE POLICY "city_wide_select_appointments" ON appointments
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_insert_appointments" ON appointments
  FOR INSERT WITH CHECK (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_update_appointments" ON appointments
  FOR UPDATE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_delete_appointments" ON appointments
  FOR DELETE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "mayor_select_appointments" ON appointments
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'mayor'
  );

-- -------------------------------------------------------
-- complaints (NO barangay) — city-wide + mayor only
-- -------------------------------------------------------
CREATE POLICY "city_wide_select_complaints" ON complaints
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_insert_complaints" ON complaints
  FOR INSERT WITH CHECK (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_update_complaints" ON complaints
  FOR UPDATE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_delete_complaints" ON complaints
  FOR DELETE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "mayor_select_complaints" ON complaints
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'mayor'
  );

-- -------------------------------------------------------
-- id_inventory (NO barangay) — city-wide + mayor only
-- -------------------------------------------------------
CREATE POLICY "city_wide_select_id_inventory" ON id_inventory
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_insert_id_inventory" ON id_inventory
  FOR INSERT WITH CHECK (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_update_id_inventory" ON id_inventory
  FOR UPDATE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_delete_id_inventory" ON id_inventory
  FOR DELETE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "mayor_select_id_inventory" ON id_inventory
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'mayor'
  );

-- -------------------------------------------------------
-- bedridden_verifications (NO barangay) — city-wide + mayor only
-- -------------------------------------------------------
CREATE POLICY "city_wide_select_bedridden_verifications" ON bedridden_verifications
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_insert_bedridden_verifications" ON bedridden_verifications
  FOR INSERT WITH CHECK (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_update_bedridden_verifications" ON bedridden_verifications
  FOR UPDATE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_delete_bedridden_verifications" ON bedridden_verifications
  FOR DELETE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "mayor_select_bedridden_verifications" ON bedridden_verifications
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'mayor'
  );

-- -------------------------------------------------------
-- quarterly_updates (NO barangay) — city-wide + mayor only
-- -------------------------------------------------------
CREATE POLICY "city_wide_select_quarterly_updates" ON quarterly_updates
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_insert_quarterly_updates" ON quarterly_updates
  FOR INSERT WITH CHECK (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_update_quarterly_updates" ON quarterly_updates
  FOR UPDATE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_delete_quarterly_updates" ON quarterly_updates
  FOR DELETE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "mayor_select_quarterly_updates" ON quarterly_updates
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'mayor'
  );

-- -------------------------------------------------------
-- endorsements (HAS barangay) — full policies
-- -------------------------------------------------------
CREATE POLICY "city_wide_select_endorsements" ON endorsements
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_insert_endorsements" ON endorsements
  FOR INSERT WITH CHECK (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_update_endorsements" ON endorsements
  FOR UPDATE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_delete_endorsements" ON endorsements
  FOR DELETE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "sector_locked_select_endorsements" ON endorsements
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('official', 'para_social_worker')
    AND endorsements.barangay = (auth.jwt() -> 'user_metadata' ->> 'barangay')
  );
CREATE POLICY "sector_locked_insert_endorsements" ON endorsements
  FOR INSERT WITH CHECK (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('official', 'para_social_worker')
  );
CREATE POLICY "sector_locked_update_endorsements" ON endorsements
  FOR UPDATE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('official', 'para_social_worker')
    AND endorsements.barangay = (auth.jwt() -> 'user_metadata' ->> 'barangay')
  );
CREATE POLICY "mayor_select_endorsements" ON endorsements
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'mayor'
  );

-- -------------------------------------------------------
-- batch_endorsements (HAS barangay) — full policies
-- -------------------------------------------------------
CREATE POLICY "city_wide_select_batch_endorsements" ON batch_endorsements
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_insert_batch_endorsements" ON batch_endorsements
  FOR INSERT WITH CHECK (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_update_batch_endorsements" ON batch_endorsements
  FOR UPDATE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_delete_batch_endorsements" ON batch_endorsements
  FOR DELETE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "sector_locked_select_batch_endorsements" ON batch_endorsements
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('official', 'para_social_worker')
    AND batch_endorsements.barangay = (auth.jwt() -> 'user_metadata' ->> 'barangay')
  );
CREATE POLICY "sector_locked_insert_batch_endorsements" ON batch_endorsements
  FOR INSERT WITH CHECK (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('official', 'para_social_worker')
  );
CREATE POLICY "sector_locked_update_batch_endorsements" ON batch_endorsements
  FOR UPDATE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('official', 'para_social_worker')
    AND batch_endorsements.barangay = (auth.jwt() -> 'user_metadata' ->> 'barangay')
  );
CREATE POLICY "mayor_select_batch_endorsements" ON batch_endorsements
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'mayor'
  );

-- -------------------------------------------------------
-- batch_endorsement_items (NO barangay) — city-wide + mayor only
-- -------------------------------------------------------
CREATE POLICY "city_wide_select_batch_endorsement_items" ON batch_endorsement_items
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_insert_batch_endorsement_items" ON batch_endorsement_items
  FOR INSERT WITH CHECK (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_update_batch_endorsement_items" ON batch_endorsement_items
  FOR UPDATE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_delete_batch_endorsement_items" ON batch_endorsement_items
  FOR DELETE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "mayor_select_batch_endorsement_items" ON batch_endorsement_items
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'mayor'
  );

-- -------------------------------------------------------
-- family_composition (NO barangay) — city-wide + mayor only
-- -------------------------------------------------------
CREATE POLICY "city_wide_select_family_composition" ON family_composition
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_insert_family_composition" ON family_composition
  FOR INSERT WITH CHECK (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_update_family_composition" ON family_composition
  FOR UPDATE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_delete_family_composition" ON family_composition
  FOR DELETE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "mayor_select_family_composition" ON family_composition
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'mayor'
  );

-- -------------------------------------------------------
-- news (NO barangay) — public read, city-wide + mayor write
-- -------------------------------------------------------
CREATE POLICY "public_read_published_news" ON news
  FOR SELECT USING (is_published = true);
CREATE POLICY "city_wide_insert_news" ON news
  FOR INSERT WITH CHECK (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_update_news" ON news
  FOR UPDATE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_delete_news" ON news
  FOR DELETE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );

-- -------------------------------------------------------
-- downloads (NO barangay) — public read, city-wide + mayor write
-- -------------------------------------------------------
CREATE POLICY "public_read_active_downloads" ON downloads
  FOR SELECT USING (is_active = true);
CREATE POLICY "city_wide_insert_downloads" ON downloads
  FOR INSERT WITH CHECK (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_update_downloads" ON downloads
  FOR UPDATE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );
CREATE POLICY "city_wide_delete_downloads" ON downloads
  FOR DELETE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );

SELECT 'OSCALink: RLS v2 applied - inlined role checks' AS result;
