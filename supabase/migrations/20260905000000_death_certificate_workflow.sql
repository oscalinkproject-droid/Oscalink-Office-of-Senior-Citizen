-- OSCALink Revisions — Wave: Deceased Certificate workflow
-- Stores the senior's OSCA registration ID on vault documents so the
-- Document Vault can display the Death Certificate alongside the OSCA ID.

ALTER TABLE public.legacy_documents
  ADD COLUMN IF NOT EXISTS registration_id text;

-- Backfill existing vault rows from their linked senior records.
UPDATE public.legacy_documents d
SET registration_id = s.registration_id
FROM public.seniors s
WHERE d.senior_id = s.id
  AND d.registration_id IS NULL;