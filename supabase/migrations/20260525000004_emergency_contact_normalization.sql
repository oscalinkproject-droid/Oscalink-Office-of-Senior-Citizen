-- ==========================================
-- OSCALink: Emergency Contact Normalization
-- ==========================================
-- Standardizes emergency contact across all platforms:
-- Web, Mobile (Senior App), Mobile-Parasocial (PSW App)
-- All now use emergency_contact_name + emergency_contact_number.
-- Old emergency_contact column retained as deprecated fallback.
-- ==========================================

-- 1. Add standardized structured columns
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS emergency_contact_number TEXT;

-- 2. Data migration: best-effort parse of old emergency_contact values
-- Supports formats: "Name - 09171234567", "Name 09171234567", "Name-09171234567"
UPDATE seniors
SET
  emergency_contact_name = CASE
    WHEN emergency_contact IS NOT NULL AND emergency_contact != '' THEN
      TRIM(REGEXP_REPLACE(emergency_contact, '\s*[-–—]+\s*', '|'))
    ELSE NULL
  END,
  emergency_contact_number = CASE
    WHEN emergency_contact IS NOT NULL AND emergency_contact != '' THEN
      NULLIF(
        (REGEXP_MATCHES(emergency_contact, '(09\d{9})'))[1],
        ''
      )
    ELSE NULL
  END
WHERE emergency_contact IS NOT NULL AND emergency_contact != '';

-- Clean up name column: extract the name part (before any phone number)
UPDATE seniors
SET emergency_contact_name = TRIM(REGEXP_REPLACE(emergency_contact_name, '\s*\|?\s*09\d{9}\s*$', ''))
WHERE emergency_contact_name IS NOT NULL
  AND emergency_contact_name ~ '09\d{9}';

-- If the name was entirely just the number, set to NULL
UPDATE seniors
SET emergency_contact_name = NULL
WHERE emergency_contact_name IS NOT NULL
  AND TRIM(emergency_contact_name) = '';

-- 3. Add CHECK constraint for Philippine mobile format (09XXXXXXXXX)
ALTER TABLE seniors DROP CONSTRAINT IF EXISTS seniors_emergency_contact_number_check;
ALTER TABLE seniors ADD CONSTRAINT seniors_emergency_contact_number_check
  CHECK (emergency_contact_number IS NULL OR emergency_contact_number ~ '^09\d{9}$');

-- 4. Add comments marking the old column as deprecated
COMMENT ON COLUMN seniors.emergency_contact IS 'DEPRECATED: Use emergency_contact_name and emergency_contact_number instead.';
COMMENT ON COLUMN seniors.emergency_contact_name IS 'Full name of the emergency contact person';
COMMENT ON COLUMN seniors.emergency_contact_number IS 'Philippine mobile number of emergency contact (format: 09XXXXXXXXX)';

SELECT 'OSCALink: Emergency contact normalization complete.' AS result;
