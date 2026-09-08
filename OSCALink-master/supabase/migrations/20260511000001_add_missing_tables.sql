-- Apply missing tables from expanded schema that weren't created

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

DROP POLICY IF EXISTS "Allow public read access to published news" ON news;
CREATE POLICY "Allow public read access to published news" ON news
    FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "Allow insert access to news" ON news;
CREATE POLICY "Allow insert access to news" ON news
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update access to news" ON news;
CREATE POLICY "Allow update access to news" ON news
    FOR UPDATE USING (true);

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

DROP POLICY IF EXISTS "Allow public read access to downloads" ON downloads;
CREATE POLICY "Allow public read access to downloads" ON downloads
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Allow insert access to downloads" ON downloads;
CREATE POLICY "Allow insert access to downloads" ON downloads
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update access to downloads" ON downloads;
CREATE POLICY "Allow update access to downloads" ON downloads
    FOR UPDATE USING (true);

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

DROP POLICY IF EXISTS "Allow public read access to government_links" ON government_links;
CREATE POLICY "Allow public read access to government_links" ON government_links
    FOR SELECT USING (is_active = true);

INSERT INTO government_links (agency_name, description, website_url, icon, display_order) VALUES
    ('DSWD', 'Department of Social Welfare and Development', 'https://dswd.gov.ph', 'shield', 1),
    ('PhilHealth', 'Philippine Health Insurance Corporation', 'https://philhealth.gov.ph', 'health_and_safety', 2),
    ('DILG', 'Department of the Interior and Local Government', 'https://dilg.gov.ph', 'account_balance', 3),
    ('OSCA National', 'National Council on Senior Citizens Affairs', 'https://ncsca.gov.ph', 'groups', 4),
    ('SSS', 'Social Security System', 'https://sss.gov.ph', 'savings', 5),
    ('GSIS', 'Government Service Insurance System', 'https://gsis.gov.ph', 'account_balance_wallet', 6)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS endorsements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    senior_id UUID REFERENCES seniors(id) ON DELETE SET NULL,
    endorsement_type TEXT NOT NULL,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Revoked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE endorsements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read endorsements" ON endorsements;
CREATE POLICY "Allow authenticated read endorsements" ON endorsements
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated insert endorsements" ON endorsements;
CREATE POLICY "Allow authenticated insert endorsements" ON endorsements
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

SELECT 'OSCALink: Missing tables created successfully.' AS result;
