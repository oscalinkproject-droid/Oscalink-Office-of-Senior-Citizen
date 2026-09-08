-- ============================================================
-- OSCALink: Ensure OSCA ID number (id_number) is UNIQUE
-- ============================================================
-- The core requirement is that `seniors.id_number` never holds
-- duplicate values, so OSCA ID conflicts can't occur.
--
-- This creates a UNIQUE index on id_number (partial: applies only
-- to non-null rows, so PENDING records with NULL are untouched).
--
-- It also re-generates the ACTIVE records to the new format:
--     OSC-[YYYYMMDD]-[SEQUENTIAL_NUMBER]   (e.g. OSC-20260901-0001)
-- ordered chronologically (oldest -> newest), then re-applies the
-- UNIQUE index so the regenerated values are enforced as unique.
--
-- NOTE: `id_number` is NOT a foreign key. Dependent tables
-- reference `seniors.id` (UUID). In-app lookups (verify, mobile
-- login, ID card, reports) all read `seniors.id_number`, so the
-- values stay consistent app-wide.
-- ============================================================

-- Guard: abort if the column is missing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'seniors' AND column_name = 'id_number'
  ) THEN
    RAISE EXCEPTION 'seniors.id_number column not found; aborting migration';
  END IF;
END $$;

-- Drop any existing unique constraint/index so regeneration can't
-- trip over transient duplicates. Recreated at the end.
ALTER TABLE public.seniors DROP CONSTRAINT IF EXISTS uni_seniors_id_number;
DROP INDEX IF EXISTS public.seniors_id_number_key;
DROP INDEX IF EXISTS public.idx_seniors_id_number_unique;
DROP INDEX IF EXISTS public.uni_seniors_id_number;

-- ============================================================
-- Regenerate ACTIVE records to OSC-[YYYYMMDD]-[SEQUENCE]
-- (oldest -> newest) in a temp snapshot.
-- ============================================================
CREATE TEMP TABLE _new_osca_ids ON COMMIT DROP AS
WITH ordered_active AS (
  SELECT
    id,
    COALESCE(osca_approved_at, created_at) AS issue_datetime,
    ROW_NUMBER() OVER (
      ORDER BY
        COALESCE(osca_approved_at, created_at) ASC NULLS LAST,
        created_at ASC NULLS LAST,
        id ASC
    ) AS seq
  FROM public.seniors
  WHERE status = 'Active'
)
SELECT
  oa.id,
  COALESCE(oa.issue_datetime, NOW()) AS issue_datetime,
  (
    'OSC-'
    || TO_CHAR(COALESCE(oa.issue_datetime, NOW()), 'YYYYMMDD')
    || '-'
    || LPAD(oa.seq::TEXT, 4, '0')
  ) AS new_id_number
FROM ordered_active oa;

UPDATE public.seniors AS s
SET id_number = t.new_id_number
FROM _new_osca_ids t
WHERE s.id = t.id;

-- Backfill issue date only if the column exists (won't fail otherwise).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'seniors' AND column_name = 'id_issue_date'
  ) THEN
    EXECUTE format(
      'UPDATE public.seniors AS s
         SET id_issue_date = t.issue_datetime::DATE
       FROM %I t
       WHERE s.id = t.id',
      '_new_osca_ids'
    );
  END IF;
END $$;

-- ============================================================
-- THE KEY GUARANTEE: UNIQUE index on id_number
-- ============================================================
-- Prevents any future duplicate OSCA ID (conflict) at the DB level.
-- Partial: only non-null id_number values are constrained.
CREATE UNIQUE INDEX IF NOT EXISTS uni_seniors_id_number
  ON public.seniors (id_number)
  WHERE id_number IS NOT NULL;

SELECT
  count(*) FILTER (WHERE status = 'Active') AS active_count,
  count(*) FILTER (WHERE status = 'Active' AND id_number IS NOT NULL) AS active_with_id
FROM public.seniors;
