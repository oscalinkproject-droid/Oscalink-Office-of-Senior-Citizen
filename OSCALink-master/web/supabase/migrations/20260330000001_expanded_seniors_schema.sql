-- ==========================================
-- OSCALink: PhilHealth & Legal Compliance Schema
-- ==========================================
-- Implements PhilHealth Circular 033-2017,
-- RA 9257 (Senior Citizens Act) requirements,
-- and Memorandum Circular 2005-63 mandates.
-- ==========================================

-- 1. PHILHEALTH-MANDATED ADDRESS BREAKDOWN
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS address_unit TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS address_building TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS address_lot_block TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS address_street TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS address_subdivision TEXT;

-- 2. GOVERNMENT IDENTIFIERS
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS gsis_no TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS sss_no TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS tin TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS philhealth_no TEXT;

-- 3. SOCIO-ECONOMIC CLASSIFICATION
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS classification TEXT CHECK (classification IN ('Pensioner', 'Indigent', 'Supported', 'Private'));
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS monthly_income NUMERIC(10,2);
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS income_range TEXT;

-- 4. ADVANCED DEMOGRAPHICS
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS blood_type TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS religion TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS education TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS employment_status TEXT;

-- 5. UPDATE STATUS TO INCLUDE TRANSFERRED
ALTER TABLE seniors DROP CONSTRAINT IF EXISTS seniors_status_check;
ALTER TABLE seniors ADD CONSTRAINT seniors_status_check 
    CHECK (status IN ('Active', 'Pending', 'Archived', 'Deceased', 'Transferred'));

-- 6. DIGITAL ARCHIVING (CLOUDINARY URLs)
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS birth_certificate_url TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS voter_id_url TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- 7. VERIFICATION & DIGITAL SIGNATURE
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id);
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS digital_signature_url TEXT;

-- ==========================================
-- FAMILY COMPOSITION TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS family_composition (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    senior_id UUID NOT NULL REFERENCES seniors(id) ON DELETE CASCADE,
    member_name TEXT NOT NULL,
    relationship TEXT NOT NULL,
    birthdate DATE,
    occupation TEXT,
    monthly_income NUMERIC(10,2),
    is_dependent BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE family_composition ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to family composition" ON family_composition
    FOR SELECT USING (true);

CREATE POLICY "Allow insert access to family composition" ON family_composition
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to family composition" ON family_composition
    FOR UPDATE USING (true);

CREATE POLICY "Allow delete access to family composition" ON family_composition
    FOR DELETE USING (true);

-- ==========================================
-- COMPLAINTS & VIOLATIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    senior_id UUID REFERENCES seniors(id) ON DELETE SET NULL,
    complainant_name TEXT NOT NULL,
    complainant_contact TEXT,
    respondent_name TEXT NOT NULL,
    respondent_address TEXT,
    violation_type TEXT NOT NULL CHECK (violation_type IN (
        'Refusal of Discount', 
        'Refusal of Privilege', 
        'Discrimination',
        'Unfair Practice',
        'Other'
    )),
    incident_date DATE NOT NULL,
    incident_location TEXT,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Investigating', 'Resolved', 'Escalated', 'Closed')),
    priority TEXT DEFAULT 'Routine' CHECK (priority IN ('Urgent', 'Routine')),
    assigned_to UUID REFERENCES auth.users(id),
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to complaints" ON complaints
    FOR SELECT USING (true);

CREATE POLICY "Allow insert access to complaints" ON complaints
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to complaints" ON complaints
    FOR UPDATE USING (true);

CREATE POLICY "Allow delete access to complaints" ON complaints
    FOR DELETE USING (true);

-- ==========================================
-- ID & BOOKLET INVENTORY TABLE
-- ==========================================
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
    received_signature TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE id_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to id_inventory" ON id_inventory
    FOR SELECT USING (true);

CREATE POLICY "Allow insert access to id_inventory" ON id_inventory
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to id_inventory" ON id_inventory
    FOR UPDATE USING (true);

CREATE POLICY "Allow delete access to id_inventory" ON id_inventory
    FOR DELETE USING (true);

-- ==========================================
-- QUARTERLY MAINTENANCE LOG
-- ==========================================
CREATE TABLE IF NOT EXISTS quarterly_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quarter TEXT NOT NULL CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
    year INTEGER NOT NULL,
    total_seniors INTEGER,
    active_seniors INTEGER,
    transferred_seniors INTEGER,
    deceased_seniors INTEGER,
    new_registrations INTEGER,
    dropped_seniors INTEGER,
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Verified', 'Submitted')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE quarterly_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to quarterly_updates" ON quarterly_updates
    FOR SELECT USING (true);

CREATE POLICY "Allow insert access to quarterly_updates" ON quarterly_updates
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to quarterly_updates" ON quarterly_updates
    FOR UPDATE USING (true);

-- ==========================================
-- UPDATE PROFILES TABLE FOR EXPANDED ROLES
-- ==========================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'official';
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('admin', 'osca_head', 'mswd_officer', 'mayor', 'official', 'resident'));

-- ==========================================
-- NEWS & ANNOUNCEMENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT CHECK (category IN ('News', 'Activity', 'Announcement', 'Alert')),
    is_published BOOLEAN DEFAULT FALSE,
    publish_date TIMESTAMP WITH TIME ZONE,
    author_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to published news" ON news
    FOR SELECT USING (is_published = true);

CREATE POLICY "Allow insert access to news" ON news
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to news" ON news
    FOR UPDATE USING (true);

-- ==========================================
-- DOWNLOADS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS downloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    category TEXT CHECK (category IN ('PMRF', 'Forms', 'Guidelines', 'Reports', 'Other')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to downloads" ON downloads
    FOR SELECT USING (is_active = true);

CREATE POLICY "Allow insert access to downloads" ON downloads
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to downloads" ON downloads
    FOR UPDATE USING (true);

-- ==========================================
-- GOVERNMENT LINKS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS government_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_name TEXT NOT NULL,
    description TEXT,
    website_url TEXT NOT NULL,
    icon TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE government_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to government_links" ON government_links
    FOR SELECT USING (is_active = true);

-- Insert default government links
INSERT INTO government_links (agency_name, description, website_url, icon, display_order) VALUES
    ('DSWD', 'Department of Social Welfare and Development', 'https://dswd.gov.ph', 'shield', 1),
    ('PhilHealth', 'Philippine Health Insurance Corporation', 'https://philhealth.gov.ph', 'health_and_safety', 2),
    ('DILG', 'Department of the Interior and Local Government', 'https://dilg.gov.ph', 'account_balance', 3),
    ('OSCA National', 'National Council on Senior Citizens Affairs', 'https://ncsca.gov.ph', 'groups', 4),
    ('SSS', 'Social Security System', 'https://sss.gov.ph', 'savings', 5),
    ('GSIS', 'Government Service Insurance System', 'https://gsis.gov.ph', 'account_balance_wallet', 6)
ON CONFLICT DO NOTHING;

SELECT 'OSCALink: Complete Schema Expansion Complete.';
