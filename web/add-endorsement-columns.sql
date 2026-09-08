-- RUN IN SUPABASE DASHBOARD SQL EDITOR
-- https://supabase.com/dashboard/project/qbdbxwcsvitlmikmdhso/sql/new

-- 1. Add columns
ALTER TABLE endorsements ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE endorsements ADD COLUMN IF NOT EXISTS barangay TEXT;
ALTER TABLE endorsements ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Update RLS policies
DROP POLICY IF EXISTS "Allow authenticated read endorsements" ON endorsements;
CREATE POLICY "Allow authenticated read endorsements" ON endorsements
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated insert endorsements" ON endorsements;
CREATE POLICY "Allow authenticated insert endorsements" ON endorsements
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. Verify
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'endorsements' ORDER BY ordinal_position;
