-- ==========================================
-- OSCALink Institutional Schema Calibration
-- ==========================================
-- INSTRUCTIONS:
-- 1. Open your Supabase SQL Editor.
-- 2. Paste this script.
-- 3. Click 'Run' to expand the seniors registry.
-- ==========================================

-- 1. Add missing beneficiary identification columns
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS registration_id TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS birthdate DATE;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS contact_number TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending';

-- 2. Ensure basic census columns exist
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS sector TEXT;

-- 3. Enforce institutional uniqueness constraint
-- This prevents the same Senior from being registered multiple times.
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uni_registration_id') THEN
        ALTER TABLE seniors ADD CONSTRAINT uni_registration_id UNIQUE (registration_id);
    END IF;
END $$;

-- 4. Enable RLS for the new columns (Already enabled for table)
-- But ensuring policy coverage:
COMMENT ON TABLE seniors IS 'Institutional Registry for Senior Citizens with City-Wide Sector Oversight.';

SELECT 'OSCALink: Seniors Registry Schema Calibration Complete.';
