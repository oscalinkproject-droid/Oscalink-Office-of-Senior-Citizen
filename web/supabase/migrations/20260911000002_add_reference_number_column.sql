-- Add a dedicated reference_number column to the seniors table so that the
-- temporary REF-YYYYMMDD-XXXX tracking number (given to the applicant for
-- mobile-app status tracking) is stored separately from the final OSCA ID
-- number.  registration_id continues to hold the same REF value for backward
-- compatibility with the mobile-login RPC and any existing queries, but
-- reference_number is the canonical source of truth for the temporary ref.

ALTER TABLE seniors
  ADD COLUMN IF NOT EXISTS reference_number TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uni_seniors_reference_number
  ON seniors (reference_number)
  WHERE reference_number IS NOT NULL;

COMMENT ON COLUMN seniors.reference_number IS
  'Temporary reference number (REF-YYYYMMDD-XXXX) issued to the applicant for mobile-app tracking. Set by OSCA Staff; immutable after creation.';
