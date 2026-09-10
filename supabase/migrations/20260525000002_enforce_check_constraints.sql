-- ==========================================
-- OSCALink: CHECK Constraint Enforcement
-- ==========================================
-- Adds strict CHECK constraints to the seniors table
-- to prevent bad data at the database level.
-- Includes default value cleanup for boolean fields.
-- ==========================================

-- 0. SAFETY: Drop any pre-existing constraints we're about to redefine
ALTER TABLE seniors DROP CONSTRAINT IF EXISTS seniors_barangay_check;
ALTER TABLE seniors DROP CONSTRAINT IF EXISTS seniors_sex_check;
ALTER TABLE seniors DROP CONSTRAINT IF EXISTS seniors_civil_status_check;
ALTER TABLE seniors DROP CONSTRAINT IF EXISTS seniors_blood_type_check;
ALTER TABLE seniors DROP CONSTRAINT IF EXISTS seniors_age_check;

-- Column guards: ensure columns referenced below exist on public.seniors
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS barangay TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS sex TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS civil_status TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS blood_type TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS classification TEXT;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS is_bedridden BOOLEAN;
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS is_social_pension_applicant BOOLEAN;

-- ==========================================
-- 1. BARANGAY CHECK CONSTRAINT
-- Only allow the 37 official Cotabato City barangays
-- ==========================================

-- Normalize existing data: set barangay to NULL if it doesn't match (will be caught by constraint)
UPDATE seniors SET barangay = NULL WHERE barangay IS NOT NULL AND TRIM(barangay) != ''
  AND LOWER(TRIM(barangay)) NOT IN (
    'bagua i', 'bagua ii', 'bagua iii', 'mother bagua',
    'kalanganan i', 'kalanganan ii', 'mother kalanganan',
    'poblacion i', 'poblacion ii', 'poblacion iii', 'poblacion iv', 'poblacion v',
    'poblacion vi', 'poblacion vii', 'poblacion viii', 'poblacion ix', 'mother poblacion',
    'rosary heights i', 'rosary heights ii', 'rosary heights iii', 'rosary heights iv',
    'rosary heights v', 'rosary heights vi', 'rosary heights vii', 'rosary heights viii',
    'rosary heights ix', 'rosary heights x', 'rosary heights xi', 'rosary heights xii',
    'rosary heights xiii', 'mother rosary heights',
    'tamontaka i', 'tamontaka ii', 'tamontaka iii', 'tamontaka iv', 'tamontaka v', 'mother tamontaka'
  );

ALTER TABLE seniors ADD CONSTRAINT seniors_barangay_check
  CHECK (
    barangay IS NULL OR
    barangay IN (
      'Bagua I', 'Bagua II', 'Bagua III', 'Mother Bagua',
      'Kalanganan I', 'Kalanganan II', 'Mother Kalanganan',
      'Poblacion I', 'Poblacion II', 'Poblacion III', 'Poblacion IV', 'Poblacion V',
      'Poblacion VI', 'Poblacion VII', 'Poblacion VIII', 'Poblacion IX', 'Mother Poblacion',
      'Rosary Heights I', 'Rosary Heights II', 'Rosary Heights III', 'Rosary Heights IV',
      'Rosary Heights V', 'Rosary Heights VI', 'Rosary Heights VII', 'Rosary Heights VIII',
      'Rosary Heights IX', 'Rosary Heights X', 'Rosary Heights XI', 'Rosary Heights XII',
      'Rosary Heights XIII', 'Mother Rosary Heights',
      'Tamontaka I', 'Tamontaka II', 'Tamontaka III', 'Tamontaka IV', 'Tamontaka V', 'Mother Tamontaka'
    )
  );

-- ==========================================
-- 2. SEX CHECK CONSTRAINT
-- Strictly 'M' or 'F'
-- ==========================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seniors' AND column_name = 'sex'
  ) THEN
    EXECUTE 'UPDATE seniors SET sex = NULL WHERE sex IS NOT NULL AND sex NOT IN (''M'', ''F'')';
  END IF;
END $$;

ALTER TABLE seniors ADD CONSTRAINT seniors_sex_check
  CHECK (sex IS NULL OR sex IN ('M', 'F'));

-- ==========================================
-- 3. CIVIL STATUS CHECK CONSTRAINT
-- ==========================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seniors' AND column_name = 'civil_status'
  ) THEN
    EXECUTE 'UPDATE seniors SET civil_status = NULL WHERE civil_status IS NOT NULL AND civil_status NOT IN (''Single'', ''Married'', ''Separated'', ''Divorced'', ''Widowed'')';
  END IF;
END $$;

ALTER TABLE seniors ADD CONSTRAINT seniors_civil_status_check
  CHECK (civil_status IS NULL OR civil_status IN ('Single', 'Married', 'Separated', 'Divorced', 'Widowed'));

-- ==========================================
-- 4. BLOOD TYPE CHECK CONSTRAINT
-- ==========================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seniors' AND column_name = 'blood_type'
  ) THEN
    EXECUTE 'UPDATE seniors SET blood_type = NULL WHERE blood_type IS NOT NULL AND blood_type NOT IN (''A+'', ''A-'', ''B+'', ''B-'', ''AB+'', ''AB-'', ''O+'', ''O-'', ''Unknown'')';
  END IF;
END $$;

ALTER TABLE seniors ADD CONSTRAINT seniors_blood_type_check
  CHECK (blood_type IS NULL OR blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'));

-- ==========================================
-- 5. AGE CHECK CONSTRAINT
-- Enforce minimum age of 60 for senior citizens per RA 9994
-- ==========================================

UPDATE seniors SET age = GREATEST(age, 60) WHERE age IS NOT NULL AND age < 60;

ALTER TABLE seniors ADD CONSTRAINT seniors_age_check
  CHECK (age IS NULL OR age >= 60);

-- ==========================================
-- 6. DEFAULT VALUE CLEANUP
-- Ensure boolean fields default to FALSE not NULL
-- ==========================================

ALTER TABLE seniors ALTER COLUMN is_bedridden SET DEFAULT FALSE;
ALTER TABLE seniors ALTER COLUMN is_social_pension_applicant SET DEFAULT FALSE;

-- Add has_other_pension column if it doesn't exist yet, with default FALSE
ALTER TABLE seniors ADD COLUMN IF NOT EXISTS has_other_pension BOOLEAN DEFAULT FALSE;
ALTER TABLE seniors ALTER COLUMN has_other_pension SET DEFAULT FALSE;

-- Backfill any NULL boolean values to FALSE
UPDATE seniors SET is_bedridden = FALSE WHERE is_bedridden IS NULL;
UPDATE seniors SET is_social_pension_applicant = FALSE WHERE is_social_pension_applicant IS NULL;
UPDATE seniors SET has_other_pension = FALSE WHERE has_other_pension IS NULL;

-- ==========================================
-- 7. CLASSIFICATION CHECK CONSTRAINT
-- ==========================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seniors' AND column_name = 'classification'
  ) THEN
    EXECUTE 'UPDATE seniors SET classification = NULL WHERE classification IS NOT NULL AND classification NOT IN (''Pensioner'', ''Indigent'', ''Supported'', ''Private'')';
  END IF;
END $$;

ALTER TABLE seniors ADD CONSTRAINT seniors_classification_check
  CHECK (classification IS NULL OR classification IN ('Pensioner', 'Indigent', 'Supported', 'Private'));

-- ==========================================
-- COMPLETE
-- ==========================================

SELECT 'OSCALink: CHECK constraints and defaults enforced successfully.' AS result;
