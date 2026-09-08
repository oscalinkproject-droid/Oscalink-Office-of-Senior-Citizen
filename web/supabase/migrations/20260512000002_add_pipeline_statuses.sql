-- Phase 3: Multi-step pipeline & missing tables

-- 1. Extend seniors status check to include pipeline statuses
ALTER TABLE seniors DROP CONSTRAINT IF EXISTS seniors_status_check;
ALTER TABLE seniors ADD CONSTRAINT seniors_status_check 
    CHECK (status IN ('Active', 'Pending', 'Pending Barangay', 'Pending OSCA', 'Pending Mayor', 'Archived', 'Deceased', 'Transferred'));

-- 2. Add is_social_pension_applicant column if missing (used by dashboard endorsements)
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS is_social_pension_applicant BOOLEAN DEFAULT false;

-- 3. Create batch_endorsements table if missing (used by dashboard endorsements page)
CREATE TABLE IF NOT EXISTS batch_endorsements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number TEXT NOT NULL,
    barangay TEXT NOT NULL DEFAULT 'All Sectors',
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Approved', 'Rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE batch_endorsements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read batch_endorsements" ON batch_endorsements;
CREATE POLICY "Allow authenticated read batch_endorsements" ON batch_endorsements
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated insert batch_endorsements" ON batch_endorsements;
CREATE POLICY "Allow authenticated insert batch_endorsements" ON batch_endorsements
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 4. Create batch_endorsement_items table if missing
CREATE TABLE IF NOT EXISTS batch_endorsement_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES batch_endorsements(id) ON DELETE CASCADE,
    senior_id UUID REFERENCES seniors(id) ON DELETE SET NULL
);

ALTER TABLE batch_endorsement_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read batch_endorsement_items" ON batch_endorsement_items;
CREATE POLICY "Allow authenticated read batch_endorsement_items" ON batch_endorsement_items
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated insert batch_endorsement_items" ON batch_endorsement_items;
CREATE POLICY "Allow authenticated insert batch_endorsement_items" ON batch_endorsement_items
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
