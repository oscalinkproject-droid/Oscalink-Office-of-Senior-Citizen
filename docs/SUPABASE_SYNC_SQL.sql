-- ==========================================
-- OSCALINK: FULL SYSTEM SYNCHRONIZATION
-- ==========================================

-- 1. BASE REGISTRY (seniors)
CREATE TABLE IF NOT EXISTS seniors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ensure all compliance and demographic columns exist
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS registration_id TEXT UNIQUE;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS birthdate DATE;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS sex TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS civil_status TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS barangay TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS contact_number TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS address_unit TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS address_building TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS address_lot_block TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS address_street TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS address_subdivision TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS address_city TEXT DEFAULT 'Cotabato City';
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS address_province TEXT DEFAULT 'Maguindanao';
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS address_region TEXT DEFAULT 'BARMM';
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS philhealth_no TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS sss_no TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS gsis_no TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS tin TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS classification TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS monthly_income NUMERIC(10,2);
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS blood_type TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS religion TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS education TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS employment_status TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS is_bedridden BOOLEAN DEFAULT FALSE;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS verified_by UUID;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending';
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS birth_certificate_url TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS voter_id_url TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS digital_signature_url TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add constraints
DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE seniors ADD CONSTRAINT seniors_status_check 
            CHECK (status IN ('Active', 'Pending', 'Pending Barangay', 'Pending OSCA', 'Pending Mayor', 'Archived', 'Deceased', 'Transferred'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER TABLE seniors ADD CONSTRAINT seniors_classification_check 
            CHECK (classification IN ('Pensioner', 'Indigent', 'Supported', 'Private'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- 2. USER PROFILES
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'official';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS barangay TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
            CHECK (role IN ('admin', 'osca_head', 'mswd_officer', 'mayor', 'official', 'para_social_worker', 'resident'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- 3. ID & BOOKLET INVENTORY
CREATE TABLE IF NOT EXISTS id_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    senior_id UUID NOT NULL REFERENCES seniors(id) ON DELETE CASCADE,
    id_card_serial TEXT,
    id_issued_date DATE,
    id_expiry_date DATE,
    id_status TEXT DEFAULT 'Pending' CHECK (id_status IN ('Pending', 'Issued', 'Lost', 'Expired', 'Returned')),
    booklet_serial TEXT,
    booklet_issued_date DATE,
    booklet_status TEXT DEFAULT 'Pending' CHECK (booklet_status IN ('Pending', 'Issued', 'Lost', 'Returned')),
    issued_by UUID REFERENCES auth.users(id),
    received_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. COMPLAINTS & VIOLATIONS
CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    senior_id UUID REFERENCES seniors(id) ON DELETE SET NULL,
    complainant_name TEXT NOT NULL,
    complainant_contact TEXT,
    respondent_name TEXT NOT NULL,
    respondent_address TEXT,
    violation_type TEXT NOT NULL,
    incident_date DATE NOT NULL,
    incident_location TEXT,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Investigating', 'Resolved', 'Escalated', 'Closed')),
    priority TEXT DEFAULT 'Routine' CHECK (priority IN ('Routine', 'Urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. FAMILY COMPOSITION
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

-- 6. SECURITY POLICIES (RLS)
ALTER TABLE seniors ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE id_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_composition ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN 
    DROP POLICY IF EXISTS "Allow authenticated read all" ON seniors;
    DROP POLICY IF EXISTS "Allow authenticated insert all" ON seniors;
    DROP POLICY IF EXISTS "Allow authenticated update all" ON seniors;
    DROP POLICY IF EXISTS "Public profile read" ON profiles;
    DROP POLICY IF EXISTS "Profile self update" ON profiles;
    DROP POLICY IF EXISTS "Inventory auth access" ON id_inventory;
    DROP POLICY IF EXISTS "Complaints auth access" ON complaints;
    DROP POLICY IF EXISTS "Family auth access" ON family_composition;
END $$;

-- Create fresh policies
CREATE POLICY "Allow authenticated read all" ON seniors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert all" ON seniors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update all" ON seniors FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Public profile read" ON profiles FOR SELECT USING (true);
CREATE POLICY "Profile self update" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Inventory auth access" ON id_inventory FOR ALL TO authenticated USING (true);
CREATE POLICY "Complaints auth access" ON complaints FOR ALL TO authenticated USING (true);
CREATE POLICY "Family auth access" ON family_composition FOR ALL TO authenticated USING (true);

SELECT 'OSCALink: Database Schema Synchronized Successfully.';
