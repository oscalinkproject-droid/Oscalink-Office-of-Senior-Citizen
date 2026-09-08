-- OSCALink Revisions — Wave 8: archiving / data bank
-- 1. Separate archive (data bank) table for Inactive / Deceased / Transferred / Cancelled records.
-- 2. Auto-sync trigger so the data bank stays current when a status changes.
-- 3. Partial index to keep Active-member lookups fast.
-- 4. RLS on the archive (OSCA roles only).

CREATE TABLE IF NOT EXISTS public.seniors_archive (
  senior_id uuid PRIMARY KEY REFERENCES public.seniors(id) ON DELETE CASCADE,
  full_name text,
  registration_id text,
  id_number text,
  birthdate date,
  sex text,
  barangay text,
  purok text,
  status text,
  classification text,
  is_pensioner boolean,
  contact_number text,
  address text,
  archive_reason text,
  archived_at timestamptz NOT NULL DEFAULT now(),
  snapshot jsonb
);

CREATE OR REPLACE FUNCTION public.sync_senior_archive()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.status IN ('Inactive','Deceased','Transferred','Cancelled') THEN
    INSERT INTO public.seniors_archive
      (senior_id, full_name, registration_id, id_number, birthdate, sex, barangay,
       purok, status, classification, is_pensioner, contact_number, address,
       archive_reason, snapshot)
    VALUES
      (NEW.id, NEW.full_name, NEW.registration_id, NEW.id_number, NEW.birthdate, NEW.sex, NEW.barangay,
       NEW.purok, NEW.status, NEW.classification, NEW.is_pensioner, NEW.contact_number, NEW.address,
       NEW.decision_reason, to_jsonb(NEW))
    ON CONFLICT (senior_id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      registration_id = EXCLUDED.registration_id,
      id_number = EXCLUDED.id_number,
      birthdate = EXCLUDED.birthdate,
      sex = EXCLUDED.sex,
      barangay = EXCLUDED.barangay,
      purok = EXCLUDED.purok,
      status = EXCLUDED.status,
      classification = EXCLUDED.classification,
      is_pensioner = EXCLUDED.is_pensioner,
      contact_number = EXCLUDED.contact_number,
      address = EXCLUDED.address,
      archive_reason = EXCLUDED.archive_reason,
      archived_at = now(),
      snapshot = EXCLUDED.snapshot;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_senior_archive ON public.seniors;
CREATE TRIGGER trg_sync_senior_archive
AFTER INSERT OR UPDATE OF status ON public.seniors
FOR EACH ROW EXECUTE FUNCTION public.sync_senior_archive();

REVOKE EXECUTE ON FUNCTION public.sync_senior_archive() FROM PUBLIC, anon, authenticated;

-- Fast lookups for Active members
CREATE INDEX IF NOT EXISTS seniors_status_active_idx ON public.seniors (full_name) WHERE status = 'Active';

-- RLS: archive is only readable by OSCA municipal staff
ALTER TABLE public.seniors_archive ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_read_seniors_archive ON public.seniors_archive;
CREATE POLICY admin_read_seniors_archive
  ON public.seniors_archive
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('super_admin','admin','osca_head','osca_staff')
  ));
