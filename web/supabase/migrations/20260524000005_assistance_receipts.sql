-- Migration: Add Official Receipt verification fields to assistance_requests
-- Supports uploading photo of the OR and tracking verification by MSWD and merchant contact

ALTER TABLE assistance_requests
ADD COLUMN IF NOT EXISTS receipt_url TEXT,
ADD COLUMN IF NOT EXISTS receipt_number TEXT,
ADD COLUMN IF NOT EXISTS receipt_amount NUMERIC,
ADD COLUMN IF NOT EXISTS receipt_contact TEXT,
ADD COLUMN IF NOT EXISTS receipt_mswd_validated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS receipt_mswd_validated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS receipt_mswd_validated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS receipt_contact_validated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS receipt_contact_validated_at TIMESTAMPTZ;

-- Re-enable schema caching/re-read
COMMENT ON COLUMN assistance_requests.receipt_url IS 'Cloudinary secure URL of the uploaded image of the Official Receipt';
COMMENT ON COLUMN assistance_requests.receipt_contact IS 'Merchant contact number printed on the receipt, to be dialed for verification';
