-- ==========================================
-- OSCALink: Final Compliance Gaps
-- ==========================================
-- RA 9257 (Senior Citizens Act) - Bedridden tracking
-- PhilHealth Circular 033-2017 - City/Province/Region for transmittal
-- DILG MC 2005-63 - Escalated complaints oversight
-- ==========================================

-- 1. BEDRIDDEN STATUS (RA 9257 Compliance)
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS is_bedridden BOOLEAN DEFAULT FALSE;

-- 2. PHILHEALTH ADDRESS FIELDS FOR TRANSMITTAL (PhilHealth Circular 033-2017)
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS address_region TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS address_province TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS address_city TEXT;

-- 3. COMPLAINTS STATUS IS ALREADY 'Escalated' - CHECK
-- The schema already includes Escalated in line 98, but let's ensure it
ALTER TABLE complaints DROP CONSTRAINT IF EXISTS complaints_status_check;
ALTER TABLE complaints ADD CONSTRAINT complaints_status_check 
    CHECK (status IN ('Pending', 'Investigating', 'Resolved', 'Escalated', 'Closed'));

-- 4. ADD BEDRIDDEN VERIFICATION FIELDS
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS bedridden_verified_by UUID REFERENCES auth.users(id);
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS bedridden_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS bedridden_certificate_url TEXT;

-- 5. ADD ESCALATED COMPLAINTS TRACKING
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS escalated_to TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS escalation_reason TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS mayor_notified BOOLEAN DEFAULT FALSE;

-- 6. ENSURE SEX FIELD EXISTS (Critical for PhilHealth)
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS sex TEXT;

SELECT 'OSCALink: Final Compliance Gaps Migration Complete.';
