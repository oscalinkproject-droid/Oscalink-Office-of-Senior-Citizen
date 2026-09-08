-- ============================================================
-- INSERT TEST/PENDING SENIOR CITIZEN RECORD
-- Run this in: Supabase Dashboard -> SQL Editor -> New query
-- ============================================================

INSERT INTO public.seniors (
  registration_id,
  id_number,
  full_name,
  birthdate,
  status,
  barangay
) VALUES (
  'REF-19660901-6461',
  NULL,
  'Wee Go Kan',
  '1966-09-01',
  'Pending',
  'Bagua I'
)
RETURNING id, registration_id, id_number, full_name, birthdate, status, barangay, created_at;
