-- OSCALink Revisions — anonymous pre-registration direct insert
--
-- The Senior Citizen mobile app now submits pre-registration by inserting
-- directly into `seniors` as the `anon` role (no pre_register_senior RPC).
-- Previously the anon role had NO INSERT policy on `seniors`, so every direct
-- insert failed with "new row violates row-level security policy" — the RLS
-- conflict this migration fixes.
--
-- 1. A BEFORE INSERT trigger normalizes the client payload:
--      • status 'PENDING' -> 'Pending' (seniors_status_check only accepts
--        'Pending'; the client sends the uppercase marker per the submission
--        spec, the trigger canonicalizes it before constraints/RLS evaluate)
--      • mints a provisional REF- registration_id when the legacy 'AX-' column
--        default would otherwise have applied — keeps fresh Pending records in
--        the REF- format that mobile login depends on after OSCA completion
--      • derives age (NOT NULL) from birthdate when omitted
--      • derives classification to match pre_register_senior
--        (Indigent / Pensioner)
-- 2. A permissive-but-restricted INSERT policy for anon/authenticated: allows
--    writes only for a clean Pending pre-registration row — no official
--    `id_number` and no restricted system fields (pensioner flags, approval /
--    disqualification / inactivity audit columns).
-- 3. Reloads the PostgREST schema cache.

-- ---------------------------------------------------------------------------
-- 1. Payload normalization trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_preregistration_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Canonicalize the explicit uppercase 'PENDING' marker. BEFORE trigger runs
  -- ahead of seniors_status_check and the RLS WITH CHECK, which see 'Pending'.
  IF UPPER(TRIM(COALESCE(NEW.status, ''))) = 'PENDING' THEN
    NEW.status := 'Pending';
  END IF;

  -- Mint a provisional REF- reference when no portable id was provided. The
  -- table default ('AX-...') is legacy; new Pending rows must carry REF- ids so
  -- the OSCA office can finalize them into portable login credentials.
  IF NEW.registration_id IS NULL OR NEW.registration_id LIKE 'AX-%' THEN
    NEW.registration_id := 'REF-' || to_char(now(), 'YYYYMMDD') || '-' ||
      to_char((1000 + floor(random() * 9000))::int, 'FM0000');
  END IF;

  -- age is NOT NULL; derive it from birthdate when the client omitted it.
  IF NEW.age IS NULL AND NEW.birthdate IS NOT NULL THEN
    NEW.age := GREATEST(EXTRACT(YEAR FROM age(NEW.birthdate::date))::int, 60);
  END IF;
  IF NEW.age IS NULL THEN
    NEW.age := 60;
  END IF;

  -- Match the pre_register_senior classification derivation when omitted.
  IF NEW.classification IS NULL THEN
    NEW.classification :=
      CASE WHEN NEW.is_pensioner IS TRUE THEN 'Pensioner' ELSE 'Indigent' END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_preregistration_insert ON public.seniors;
CREATE TRIGGER trg_normalize_preregistration_insert
  BEFORE INSERT ON public.seniors
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_preregistration_insert();

-- ---------------------------------------------------------------------------
-- 2. anon/authenticated INSERT policy (restricted to clean Pending rows)
--    Note: policies for a role combine with OR, so staff rows written under
--    city_wide_insert_seniors / sector_locked_insert_seniors are unaffected.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "anon_public_preregistration_insert" ON public.seniors;
CREATE POLICY "anon_public_preregistration_insert" ON public.seniors
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    COALESCE(status, '') = 'Pending'
    AND id_number IS NULL
    AND registration_id IS NOT NULL
    AND registration_id LIKE 'REF-%'
    AND is_pensioner IS NOT TRUE
    AND pensioner_type IS NULL
    AND decision_reason IS NULL
    AND decision_note IS NULL
    AND disapproved_by IS NULL
    AND disapproved_at IS NULL
    AND disqualified_by IS NULL
    AND disqualified_at IS NULL
    AND inactive_reason IS NULL
    AND inactive_at IS NULL
    AND inactive_by IS NULL
  );

-- PostgREST as anon/authenticated needs explicit INSERT table privilege.
GRANT INSERT ON TABLE public.seniors TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Reload the PostgREST schema cache.
-- ---------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';