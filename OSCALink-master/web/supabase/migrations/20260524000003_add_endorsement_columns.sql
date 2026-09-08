-- OSCALink: Add missing columns to endorsements table for PSW mobile app
ALTER TABLE endorsements ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE endorsements ADD COLUMN IF NOT EXISTS barangay TEXT;
ALTER TABLE endorsements ADD COLUMN IF NOT EXISTS notes TEXT;

-- RLS: Allow users to only see endorsements from their barangay
DROP POLICY IF EXISTS "Allow authenticated read endorsements" ON endorsements;
CREATE POLICY "Allow authenticated read endorsements" ON endorsements
    FOR SELECT USING (
        auth.role() = 'authenticated'
        AND (
            barangay IS NULL
            OR barangay = (SELECT raw_user_meta_data->>'barangay' FROM auth.users WHERE id = auth.uid())
        )
    );

-- RLS: Allow authenticated users to insert endorsements
DROP POLICY IF EXISTS "Allow authenticated insert endorsements" ON endorsements;
CREATE POLICY "Allow authenticated insert endorsements" ON endorsements
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
