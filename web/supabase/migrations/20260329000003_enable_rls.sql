-- 1. Enable RLS on all tables
ALTER TABLE seniors ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- 2. Define Helper Function for User Sector
-- We use the 'sector' claim from the user_metadata if available.
-- Defaults to 'City-Wide' for Admins.
CREATE OR REPLACE FUNCTION get_user_sector() 
RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'sector',
    'NONE'
  );
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION is_city_admin() 
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role' = 'admin',
    false
  );
$$ LANGUAGE sql STABLE;

-- 3. Seniors Policies
CREATE POLICY "Admin full access to seniors" 
ON seniors FOR ALL 
USING (is_city_admin());

CREATE POLICY "Sector isolated access to seniors" 
ON seniors FOR ALL 
USING (sector = get_user_sector());

-- 4. Assistance Requests Policies
CREATE POLICY "Admin full access to requests" 
ON assistance_requests FOR ALL 
USING (is_city_admin());

CREATE POLICY "Sector isolated access to requests" 
ON assistance_requests FOR ALL 
USING (sector = get_user_sector());

-- 5. Appointments Policies (Linked to Seniors Sector)
CREATE POLICY "Admin full access to appointments" 
ON appointments FOR ALL 
USING (is_city_admin());

CREATE POLICY "Sector isolated access to appointments" 
ON appointments FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM seniors 
    WHERE seniors.id = appointments.senior_id 
    AND seniors.sector = get_user_sector()
  )
);
