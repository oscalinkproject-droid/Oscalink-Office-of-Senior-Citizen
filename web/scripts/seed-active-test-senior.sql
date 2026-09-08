-- ============================================================
-- OPTIONAL: Seed a temporary ACTIVE test senior with an OSCA ID
-- so you can verify the Active login routing (must use OSCA ID).
-- Run in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- NOTE: DELETES this test-record cascade on re-run (idempotent-ish).
-- ============================================================

-- Clean up any previous copy of this test record (safe, no-op if absent)
DELETE FROM public.seniors
WHERE registration_id = 'REF-ACTIVE-TEST-0001';

INSERT INTO public.seniors (
  registration_id,
  id_number,
  full_name,
  birthdate,
  status,
  barangay
) VALUES (
  'REF-ACTIVE-TEST-0001',
  'OSC-1966-0001',
  'Active Test Senior',
  '1966-09-01',
  'Active',
  'Bagua I'
)
RETURNING id, registration_id, id_number, full_name, status;
