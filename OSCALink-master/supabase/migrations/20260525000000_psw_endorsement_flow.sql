-- Migration: Add PSW endorsement document fields and Mayor's executive override
-- Supports PSW case study uploads, clearance cert, countersignature, and Mayor override for financial assistance

-- Add PSW document fields to endorsements
ALTER TABLE endorsements
ADD COLUMN IF NOT EXISTS case_study_report_url TEXT,
ADD COLUMN IF NOT EXISTS clearance_cert_url TEXT,
ADD COLUMN IF NOT EXISTS president_countersignature_url TEXT,
ADD COLUMN IF NOT EXISTS recommended_amount NUMERIC;

COMMENT ON COLUMN endorsements.case_study_report_url IS 'Cloudinary URL of the PSW social case study report';
COMMENT ON COLUMN endorsements.clearance_cert_url IS 'Cloudinary URL of the Certificate of Indigency/Residency';
COMMENT ON COLUMN endorsements.president_countersignature_url IS 'Cloudinary URL of the Barangay SC President countersignature';
COMMENT ON COLUMN endorsements.recommended_amount IS 'PSW assessed recommended budget amount';

-- Add Mayor's override fields to assistance_requests
ALTER TABLE assistance_requests
ADD COLUMN IF NOT EXISTS granted_amount NUMERIC,
ADD COLUMN IF NOT EXISTS is_mayor_override BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN assistance_requests.granted_amount IS 'Final disbursed cash amount approved';
COMMENT ON COLUMN assistance_requests.is_mayor_override IS 'Flag indicating Mayor overrode the standard 10k limit up to 20k';
