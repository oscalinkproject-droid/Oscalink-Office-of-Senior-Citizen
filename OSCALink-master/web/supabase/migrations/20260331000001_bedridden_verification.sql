-- ==========================================
-- OSCALink: Bedridden Verification Workflow
-- ==========================================
-- Implements specialized workflow for bedridden/ill
-- senior verification per RA 9257 and DILG MC 2005-63
-- ==========================================

-- 1. ADD BEDRIDDEN FLAG TO SENIORS
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS is_bedridden BOOLEAN DEFAULT FALSE;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS bedridden_notes TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE;

-- 2. BEDRIDDEN VERIFICATION TABLE
CREATE TABLE IF NOT EXISTS bedridden_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    senior_id UUID NOT NULL REFERENCES seniors(id) ON DELETE CASCADE,
    assigned_official_id UUID REFERENCES auth.users(id),
    
    -- Field Visit Details
    visit_date DATE,
    visit_status TEXT DEFAULT 'Pending' CHECK (visit_status IN ('Pending', 'Scheduled', 'Completed', 'Failed')),
    
    -- Proof of Life / Medical Condition
    proof_photo_url TEXT,
    proof_photo_uploaded_at TIMESTAMP WITH TIME ZONE,
    
    -- Barangay Certification
    barangay_cert_url TEXT,
    barangay_cert_uploaded_at TIMESTAMP WITH TIME ZONE,
    barangay_cert_number TEXT,
    barangay_cert_date DATE,
    
    -- Medical Certificate (if available)
    medical_cert_url TEXT,
    
    -- Verification Status
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Uploaded', 'Validated', 'Rejected', 'Expired')),
    validation_notes TEXT,
    validated_by UUID REFERENCES auth.users(id),
    validated_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE bedridden_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bedridden_verifications
CREATE POLICY "Allow read access to bedridden_verifications" ON bedridden_verifications
    FOR SELECT USING (true);

CREATE POLICY "Allow insert access to bedridden_verifications" ON bedridden_verifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to bedridden_verifications" ON bedridden_verifications
    FOR UPDATE USING (true);

CREATE POLICY "Allow delete access to bedridden_verifications" ON bedridden_verifications
    FOR DELETE USING (true);

-- 3. ADD PMRF ATTACHMENT TO ASSISTANCE REQUESTS
ALTER TABLE assistance_requests ADD COLUMN IF NOT EXISTS pmrf_attachment_url TEXT;
ALTER TABLE assistance_requests ADD COLUMN IF NOT EXISTS pmrf_uploaded_at TIMESTAMP WITH TIME ZONE;

-- 4. ENHANCE ASSISTANCE REQUEST STATUSES
ALTER TABLE assistance_requests DROP CONSTRAINT IF EXISTS assistance_requests_status_check;
ALTER TABLE assistance_requests ADD CONSTRAINT assistance_requests_status_check 
    CHECK (status IN ('Pending', 'Processing', 'Approved', 'Released', 'Rejected', 'On Hold'));

-- 5. ADD SECTOR FIELD TO PROFILES (for RLS)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS assigned_sector TEXT;

-- 6. ADD VERIFICATION_QUEUE TABLE FOR APPROVALS
CREATE TABLE IF NOT EXISTS verification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    senior_id UUID NOT NULL REFERENCES seniors(id) ON DELETE CASCADE,
    verification_type TEXT NOT NULL CHECK (verification_type IN ('Registration', 'Bedridden', 'IDIssuance', 'Transfer')),
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')),
    
    -- Request Details
    requested_by UUID REFERENCES auth.users(id),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Approval Details
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    
    -- Digital Signature
    signature_url TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE verification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to verification_queue" ON verification_queue
    FOR SELECT USING (true);

CREATE POLICY "Allow insert access to verification_queue" ON verification_queue
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to verification_queue" ON verification_queue
    FOR UPDATE USING (true);

-- 7. ADD DISCOUNT VIOLATIONS LOG
CREATE TABLE IF NOT EXISTS discount_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    senior_id UUID REFERENCES seniors(id) ON DELETE SET NULL,
    
    -- Establishment Info
    establishment_name TEXT NOT NULL,
    establishment_address TEXT,
    establishment_type TEXT CHECK (establishment_type IN ('Restaurant', 'Hotel', 'Medical', 'Transportation', 'Retail', 'Other')),
    
    -- Violation Details
    violation_type TEXT NOT NULL CHECK (violation_type IN ('Refusal of Discount', 'Partial Discount', 'Required Minimum Purchase', 'Other')),
    violation_date DATE NOT NULL,
    violation_description TEXT,
    
    -- Resolution
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Investigating', 'Resolved', 'Escalated', 'Closed')),
    resolution_notes TEXT,
    fines_imposed NUMERIC(10,2),
    
    -- complainant
    complainant_name TEXT,
    complainant_contact TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE discount_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to discount_violations" ON discount_violations
    FOR SELECT USING (true);

CREATE POLICY "Allow insert access to discount_violations" ON discount_violations
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to discount_violations" ON discount_violations
    FOR UPDATE USING (true);

-- 8. ADD ID ISSUANCE LOG TABLE
CREATE TABLE IF NOT EXISTS id_issuance_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    senior_id UUID NOT NULL REFERENCES seniors(id) ON DELETE CASCADE,
    id_type TEXT NOT NULL CHECK (id_type IN ('OSCA ID', 'PhilHealth ID', 'Pension ID', 'Booklet')),
    
    -- Serial Numbers
    serial_number TEXT,
    booklet_serial TEXT,
    
    -- Issuance Details
    issued_date DATE NOT NULL,
    issued_by UUID REFERENCES auth.users(id),
    received_by TEXT,
    received_signature TEXT,
    
    -- Status
    status TEXT DEFAULT 'Issued' CHECK (status IN ('Issued', 'Lost', 'Replaced', 'Expired', 'Returned')),
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE id_issuance_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to id_issuance_log" ON id_issuance_log
    FOR SELECT USING (true);

CREATE POLICY "Allow insert access to id_issuance_log" ON id_issuance_log
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to id_issuance_log" ON id_issuance_log
    FOR UPDATE USING (true);

SELECT 'OSCALink: Bedridden Verification & Enhanced Schema Complete.';
