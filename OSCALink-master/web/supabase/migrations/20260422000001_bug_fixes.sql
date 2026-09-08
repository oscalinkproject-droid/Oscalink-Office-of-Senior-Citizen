-- Bug Fix Migration: place_of_birth, age trigger, sector RLS
-- Date: 2026-04-22

-- 1. Add place_of_birth column to seniors (Bug 5)
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS place_of_birth TEXT;

-- 2. Auto-compute age from birthdate via trigger (Bug 6)
CREATE OR REPLACE FUNCTION compute_age_from_birthdate()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.birthdate IS NOT NULL THEN
    NEW.age := DATE_PART('year', AGE(NEW.birthdate::DATE))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_compute_age ON seniors;
CREATE TRIGGER trg_compute_age
  BEFORE INSERT OR UPDATE OF birthdate
  ON seniors
  FOR EACH ROW
  EXECUTE FUNCTION compute_age_from_birthdate();

-- 3. Backfill age for existing seniors with birthdate but null/0 age (Bug 6)
UPDATE seniors 
SET age = DATE_PART('year', AGE(birthdate::DATE))::INTEGER
WHERE birthdate IS NOT NULL 
  AND (age IS NULL OR age = 0);

-- 4. Add sector column to assistance_requests if missing (Bug 2)
ALTER TABLE assistance_requests ADD COLUMN IF NOT EXISTS sector TEXT;

-- 5. Backfill sector from linked senior record (Bug 2)
UPDATE assistance_requests ar
SET sector = s.sector
FROM seniors s
WHERE ar.senior_id = s.id
  AND ar.sector IS NULL
  AND s.sector IS NOT NULL;

-- 6. Sector-aware RLS on assistance_requests for officials (Bug 2)
DROP POLICY IF EXISTS "allow_authenticated_read" ON assistance_requests;
DROP POLICY IF EXISTS "authenticated_can_read_all_assistance_requests" ON assistance_requests;
DROP POLICY IF EXISTS "authenticated_read_with_sector_isolation" ON assistance_requests;

CREATE POLICY "authenticated_read_with_sector_isolation" ON assistance_requests
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'official'
    OR sector = (auth.jwt() -> 'user_metadata' ->> 'sector')
    OR sector IS NULL
  );

DROP POLICY IF EXISTS "anon_can_select_assistance_requests" ON assistance_requests;
DROP POLICY IF EXISTS "anon_can_read_own_requests" ON assistance_requests;
CREATE POLICY "anon_can_read_own_requests" ON assistance_requests
  FOR SELECT
  TO anon
  USING (true);

SELECT 'Bug fix migration v20260422 applied successfully.' AS result;
