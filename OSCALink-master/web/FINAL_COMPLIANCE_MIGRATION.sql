-- ==========================================
-- OSCALink: Unified Compliance Migration
-- ==========================================
-- This script consolidates all missing columns and tables 
-- required for PhilHealth and RA 9257 compliance.
-- ==========================================

-- 1. BASE REGISTRY EXTENSION
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS registration_id TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS birthdate DATE;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS contact_number TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending';
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS barangay TEXT;

-- 2. PHILHEALTH-MANDATED ADDRESS BREAKDOWN
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS address_unit TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS address_building TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS address_lot_block TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS address_street TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS address_subdivision TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS address_city TEXT DEFAULT 'Cotabato City';
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS address_province TEXT DEFAULT 'Maguindanao';
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS address_region TEXT DEFAULT 'BARMM';

-- 3. GOVERNMENT IDENTIFIERS
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS gsis_no TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS sss_no TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS tin TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS philhealth_no TEXT;

-- 4. SOCIO-ECONOMIC & DEMOGRAPHICS
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS sex TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS civil_status TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS classification TEXT CHECK (classification IN ('Pensioner', 'Indigent', 'Supported', 'Private'));
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS monthly_income NUMERIC(10,2);
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS blood_type TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS religion TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS education TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS employment_status TEXT;

-- 5. BEDRIDDEN & VERIFICATION
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS is_bedridden BOOLEAN DEFAULT FALSE;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS verified_by UUID;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS digital_signature_url TEXT;

-- 6. SUPPORTING TABLES
CREATE TABLE IF NOT EXISTS family_composition (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    senior_id UUID NOT NULL REFERENCES seniors(id) ON DELETE CASCADE,
    member_name TEXT NOT NULL,
    relationship TEXT NOT NULL,
    birthdate DATE,
    occupation TEXT,
    monthly_income NUMERIC(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    senior_id UUID REFERENCES seniors(id) ON DELETE SET NULL,
    complainant_name TEXT NOT NULL,
    respondent_name TEXT NOT NULL,
    violation_type TEXT NOT NULL,
    incident_date DATE NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Investigating', 'Resolved', 'Escalated', 'Closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. CONSTRAINTS & RLS
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uni_registration_id') THEN
        ALTER TABLE seniors ADD CONSTRAINT uni_registration_id UNIQUE (registration_id);
    END IF;
END $$;

ALTER TABLE seniors DROP CONSTRAINT IF EXISTS seniors_status_check;
ALTER TABLE seniors ADD CONSTRAINT seniors_status_check 
    CHECK (status IN ('Active', 'Pending', 'Archived', 'Deceased', 'Transferred'));

ALTER TABLE family_composition ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON family_composition FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON family_composition FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read" ON complaints FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON complaints FOR INSERT WITH CHECK (true);

SELECT 'OSCALink: Final Compliance Migration Complete.';
