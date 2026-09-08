-- ============================================================
-- OSCALink: Enforce "No OSCA ID while Pending" (FIXED FOR OLD RECORDS)
-- ============================================================

CREATE TEMP TABLE _pending_statuses (
  value TEXT
) ON COMMIT DROP;

INSERT INTO _pending_statuses (value)
VALUES 
  ('Pending'),
  ('Pending Barangay'),
  ('Pending OSCA'),
  ('Pending Mayor');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'seniors' AND column_name = 'id_number'
  ) THEN
    RAISE EXCEPTION 'seniors.id_number column not found; aborting migration';
  END IF;
END $$;

-- 1. Tanggalin ang id_number sa lahat ng Pending (Clean state)
UPDATE public.seniors
SET id_number      = NULL,
    id_issue_date  = NULL,
    osca_approved  = false
WHERE status IN (SELECT value FROM _pending_statuses)
  AND (id_number IS NOT NULL OR osca_approved IS TRUE);

-- 2. DITO ANG FIX: Direktang palitan ang 'OSC-' ng 'REF-' sa mga LUMANG Pending records
UPDATE public.seniors
SET registration_id = REPLACE(registration_id, 'OSC-', 'REF-')
WHERE status IN (SELECT value FROM _pending_statuses)
  AND registration_id LIKE 'OSC-%';

-- 3. Lagyan ng panibagong REF- ID ang mga Pending na TALAGANG walang registration_id (NULL or Empty)
DO $$
DECLARE
  r RECORD;
  birth_col TEXT;
  ref_date_str TEXT;
  ref_candidate TEXT;
  inserted BOOLEAN;
  attempts INT;
BEGIN
  SELECT column_name INTO birth_col
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'seniors'
    AND column_name IN ('birthdate', 'date_of_birth')
  ORDER BY CASE column_name WHEN 'birthdate' THEN 0 ELSE 1 END
  LIMIT 1;

  FOR r IN
    SELECT id, created_at
    FROM public.seniors
    WHERE status IN (SELECT value FROM _pending_statuses)
      AND (registration_id IS NULL OR registration_id = '')
  LOOP
    IF birth_col IS NOT NULL THEN
      EXECUTE format('SELECT TO_CHAR(COALESCE(%I::date, $1::date), ''YYYYMMDD'') FROM public.seniors WHERE id = $2', birth_col)
      INTO ref_date_str
      USING r.created_at, r.id;
    ELSE
      ref_date_str := TO_CHAR(COALESCE(r.created_at, CURRENT_DATE), 'YYYYMMDD');
    END IF;

    inserted := FALSE;
    attempts := 0;

    WHILE NOT inserted AND attempts < 10 LOOP
      attempts := attempts + 1;
      ref_candidate := 'REF-'
        || ref_date_str
        || '-'
        || LPAD(floor(random() * 9000 + 1000)::int::text, 4, '0');

      BEGIN
        UPDATE public.seniors
        SET registration_id = ref_candidate
        WHERE id = r.id;

        IF FOUND THEN
          inserted := TRUE;
        END IF;
      EXCEPTION
        WHEN unique_violation THEN
          inserted := FALSE;
      END;
    END LOOP;
  END LOOP;
END $$;

-- 4. Constraint Enforcement
ALTER TABLE public.seniors
  DROP CONSTRAINT IF EXISTS seniors_id_number_requires_approval;

ALTER TABLE public.seniors
  ADD CONSTRAINT seniors_id_number_requires_approval
  CHECK (status NOT IN ('Pending', 'Pending Barangay', 'Pending OSCA', 'Pending Mayor')
         OR id_number IS NULL);

-- 5. Final Verification Query
SELECT
  count(*) FILTER (WHERE status = 'Pending') AS pending_count,
  count(*) FILTER (WHERE status = 'Pending' AND id_number IS NOT NULL) AS pending_with_osca_id,
  count(*) FILTER (WHERE status = 'Pending' AND registration_id LIKE 'OSC-%') AS pending_still_has_osc_prefix,
  count(*) FILTER (WHERE status = 'Pending' AND (registration_id IS NULL OR registration_id = '')) AS pending_missing_ref
FROM public.seniors;
