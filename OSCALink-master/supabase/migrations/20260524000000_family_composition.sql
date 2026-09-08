-- OSCALink: Family Composition Table
-- Standard OSCA registration requires tracking dependents and family income.
-- The base table was already created in an earlier migration with columns:
--   id, senior_id, member_name, relationship, birthdate, occupation, monthly_income, created_at
-- This migration adds the civil_status column and ensures RLS is properly applied.

-- Add civil_status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'family_composition' AND column_name = 'civil_status'
  ) THEN
    ALTER TABLE public.family_composition ADD COLUMN civil_status TEXT;
  END IF;
END $$;

-- Ensure monthly_income defaults to 0
ALTER TABLE public.family_composition ALTER COLUMN monthly_income SET DEFAULT 0;

-- Index for faster lookups by senior
CREATE INDEX IF NOT EXISTS idx_family_composition_senior_id ON public.family_composition(senior_id);

-- Enable RLS
ALTER TABLE public.family_composition ENABLE ROW LEVEL SECURITY;

-- RLS policies (comprehensive — will be enhanced in subsequent migration)
-- City-wide roles: full access
CREATE POLICY "city_wide_select_family_composition" ON public.family_composition
  FOR SELECT USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );

CREATE POLICY "city_wide_insert_family_composition" ON public.family_composition
  FOR INSERT WITH CHECK (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );

CREATE POLICY "city_wide_update_family_composition" ON public.family_composition
  FOR UPDATE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );

CREATE POLICY "city_wide_delete_family_composition" ON public.family_composition
  FOR DELETE USING (
    auth.jwt() -> 'user_metadata' ->> 'role' IN ('osca_head', 'admin', 'mswd_officer')
  );

-- Sector-locked roles: access only within their barangay (via the senior's barangay)
CREATE POLICY "sector_locked_select_family_composition" ON public.family_composition
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.seniors
      WHERE seniors.id = family_composition.senior_id
      AND seniors.barangay = auth.jwt() -> 'user_metadata' ->> 'barangay'
    )
    AND auth.jwt() -> 'user_metadata' ->> 'role' IN ('official', 'para_social_worker')
  );

CREATE POLICY "sector_locked_insert_family_composition" ON public.family_composition
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.seniors
      WHERE seniors.id = family_composition.senior_id
      AND seniors.barangay = auth.jwt() -> 'user_metadata' ->> 'barangay'
    )
    AND auth.jwt() -> 'user_metadata' ->> 'role' IN ('official', 'para_social_worker')
  );

CREATE POLICY "sector_locked_update_family_composition" ON public.family_composition
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.seniors
      WHERE seniors.id = family_composition.senior_id
      AND seniors.barangay = auth.jwt() -> 'user_metadata' ->> 'barangay'
    )
    AND auth.jwt() -> 'user_metadata' ->> 'role' IN ('official', 'para_social_worker')
  );

CREATE POLICY "sector_locked_delete_family_composition" ON public.family_composition
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.seniors
      WHERE seniors.id = family_composition.senior_id
      AND seniors.barangay = auth.jwt() -> 'user_metadata' ->> 'barangay'
    )
    AND auth.jwt() -> 'user_metadata' ->> 'role' IN ('official', 'para_social_worker')
  );

SELECT 'OSCALink: family_composition table updated successfully.' AS result;
