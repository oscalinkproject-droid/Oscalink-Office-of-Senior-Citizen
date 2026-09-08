-- ==========================================
-- OSCALink: Clean Up Stale Mock / Seed Data
-- ==========================================
-- Removes all placeholder and sample data inserted
-- by migration scripts and security test artifacts
-- that are not connected to any real senior resident.
-- Based on actual DB audit conducted 2026-05-26.
-- Does NOT touch the profiles table.
-- ==========================================

-- IDENTIFIED MOCK/TEST SENIOR RECORDS
-- These are identified by:
--   - registration_id pattern (AX-*, MOCK-*, HACK-*, BREACH-*, BACKDOOR-*, TEST-*, MAYOR-*, COL*-)
--   - Suspicious name patterns (RLS_TEST_DO_NOT_KEEP, n a, N A)
--   - Security test artifacts (HACK, BREACH, BACKDOOR prefixed)

-- 1. Delete orphan assistance_requests (no senior_id linkage)
DELETE FROM public.assistance_requests
WHERE senior_id IS NULL;

-- 2. Delete orphan endorsements (no senior_id linkage)
DELETE FROM public.endorsements
WHERE senior_id IS NULL;

-- 3. Delete test appointments (linked to mock/stale seniors)
DELETE FROM public.appointments
WHERE senior_id IN (
  SELECT id FROM public.seniors
  WHERE registration_id LIKE 'AX-%'
     OR registration_id LIKE 'MOCK-%'
     OR registration_id LIKE 'HACK-%'
     OR registration_id LIKE 'BREACH-%'
     OR registration_id LIKE 'BACKDOOR-%'
     OR registration_id LIKE 'TEST-%'
     OR registration_id LIKE 'DEL-%'
     OR registration_id LIKE 'MAYOR-%'
     OR registration_id LIKE 'COL%'
     OR registration_id = '123'
     OR full_name IN (
       'RLS_TEST_DO_NOT_KEEP', 'n a', 'N A'
     )
);

-- 4. Delete test appointments by known title
DELETE FROM public.appointments
WHERE service_type = 'TEST_DELETE_CAPABILITY'
   OR service_type = 'Malicious Consultation';

-- 5. Clean up id_inventory (FKs to seniors)
DELETE FROM public.id_inventory
WHERE senior_id IN (
  SELECT id FROM public.seniors
  WHERE registration_id LIKE 'AX-%'
     OR registration_id LIKE 'MOCK-%'
     OR registration_id LIKE 'HACK-%'
     OR registration_id LIKE 'BREACH-%'
     OR registration_id LIKE 'BACKDOOR-%'
     OR registration_id LIKE 'TEST-%'
     OR registration_id LIKE 'DEL-%'
     OR registration_id LIKE 'MAYOR-%'
     OR registration_id LIKE 'COL%'
     OR registration_id = '123'
     OR full_name IN (
       'RLS_TEST_DO_NOT_KEEP', 'n a', 'N A'
     )
);

-- 6. Clean up family_composition (FKs to seniors)
DELETE FROM public.family_composition
WHERE senior_id IN (
  SELECT id FROM public.seniors
  WHERE registration_id LIKE 'AX-%'
     OR registration_id LIKE 'MOCK-%'
     OR registration_id LIKE 'HACK-%'
     OR registration_id LIKE 'BREACH-%'
     OR registration_id LIKE 'BACKDOOR-%'
     OR registration_id LIKE 'TEST-%'
     OR registration_id LIKE 'DEL-%'
     OR registration_id LIKE 'MAYOR-%'
     OR registration_id LIKE 'COL%'
     OR registration_id = '123'
     OR full_name IN (
       'RLS_TEST_DO_NOT_KEEP', 'n a', 'N A'
     )
);

-- 7. Clean up bedridden_verifications (FKs to seniors)
DELETE FROM public.bedridden_verifications
WHERE senior_id IN (
  SELECT id FROM public.seniors
  WHERE registration_id LIKE 'AX-%'
     OR registration_id LIKE 'MOCK-%'
     OR registration_id LIKE 'HACK-%'
     OR registration_id LIKE 'BREACH-%'
     OR registration_id LIKE 'BACKDOOR-%'
     OR registration_id LIKE 'TEST-%'
     OR registration_id LIKE 'DEL-%'
     OR registration_id LIKE 'MAYOR-%'
     OR registration_id LIKE 'COL%'
     OR registration_id = '123'
     OR full_name IN (
       'RLS_TEST_DO_NOT_KEEP', 'n a', 'N A'
     )
);

-- 8. Clean up complaints (FKs to seniors)
DELETE FROM public.complaints
WHERE senior_id IN (
  SELECT id FROM public.seniors
  WHERE registration_id LIKE 'AX-%'
     OR registration_id LIKE 'MOCK-%'
     OR registration_id LIKE 'HACK-%'
     OR registration_id LIKE 'BREACH-%'
     OR registration_id LIKE 'BACKDOOR-%'
     OR registration_id LIKE 'TEST-%'
     OR registration_id LIKE 'DEL-%'
     OR registration_id LIKE 'MAYOR-%'
     OR registration_id LIKE 'COL%'
     OR registration_id = '123'
     OR full_name IN (
       'RLS_TEST_DO_NOT_KEEP', 'n a', 'N A'
     )
);

-- 9. Clean up batch_endorsement_items (FKs to seniors)
DELETE FROM public.batch_endorsement_items
WHERE senior_id IN (
  SELECT id FROM public.seniors
  WHERE registration_id LIKE 'AX-%'
     OR registration_id LIKE 'MOCK-%'
     OR registration_id LIKE 'HACK-%'
     OR registration_id LIKE 'BREACH-%'
     OR registration_id LIKE 'BACKDOOR-%'
     OR registration_id LIKE 'TEST-%'
     OR registration_id LIKE 'DEL-%'
     OR registration_id LIKE 'MAYOR-%'
     OR registration_id LIKE 'COL%'
     OR registration_id = '123'
     OR full_name IN (
       'RLS_TEST_DO_NOT_KEEP', 'n a', 'N A'
     )
);

-- 10. Clean up verification_queue (FKs to seniors)
DELETE FROM public.verification_queue
WHERE senior_id IN (
  SELECT id FROM public.seniors
  WHERE registration_id LIKE 'AX-%'
     OR registration_id LIKE 'MOCK-%'
     OR registration_id LIKE 'HACK-%'
     OR registration_id LIKE 'BREACH-%'
     OR registration_id LIKE 'BACKDOOR-%'
     OR registration_id LIKE 'TEST-%'
     OR registration_id LIKE 'DEL-%'
     OR registration_id LIKE 'MAYOR-%'
     OR registration_id LIKE 'COL%'
     OR registration_id = '123'
     OR full_name IN (
       'RLS_TEST_DO_NOT_KEEP', 'n a', 'N A'
     )
);

-- 11. Clean up discount_violations (FKs to seniors)
DELETE FROM public.discount_violations
WHERE senior_id IN (
  SELECT id FROM public.seniors
  WHERE registration_id LIKE 'AX-%'
     OR registration_id LIKE 'MOCK-%'
     OR registration_id LIKE 'HACK-%'
     OR registration_id LIKE 'BREACH-%'
     OR registration_id LIKE 'BACKDOOR-%'
     OR registration_id LIKE 'TEST-%'
     OR registration_id LIKE 'DEL-%'
     OR registration_id LIKE 'MAYOR-%'
     OR registration_id LIKE 'COL%'
     OR registration_id = '123'
     OR full_name IN (
       'RLS_TEST_DO_NOT_KEEP', 'n a', 'N A'
     )
);

-- 12. Clean up id_issuance_log (FKs to seniors)
DELETE FROM public.id_issuance_log
WHERE senior_id IN (
  SELECT id FROM public.seniors
  WHERE registration_id LIKE 'AX-%'
     OR registration_id LIKE 'MOCK-%'
     OR registration_id LIKE 'HACK-%'
     OR registration_id LIKE 'BREACH-%'
     OR registration_id LIKE 'BACKDOOR-%'
     OR registration_id LIKE 'TEST-%'
     OR registration_id LIKE 'DEL-%'
     OR registration_id LIKE 'MAYOR-%'
     OR registration_id LIKE 'COL%'
     OR registration_id = '123'
     OR full_name IN (
       'RLS_TEST_DO_NOT_KEEP', 'n a', 'N A'
     )
);

-- 13. Delete test news articles
DELETE FROM public.news
WHERE is_published = false
  AND (title LIKE 'Anon Test%'
    OR title LIKE 'Test%'
    OR title LIKE 'Test2%');

-- 14. Finally, delete the mock/test seniors themselves
DELETE FROM public.seniors
WHERE registration_id LIKE 'AX-%'
   OR registration_id LIKE 'MOCK-%'
   OR registration_id LIKE 'HACK-%'
   OR registration_id LIKE 'BREACH-%'
   OR registration_id LIKE 'BACKDOOR-%'
   OR registration_id LIKE 'TEST-%'
   OR registration_id LIKE 'DEL-%'
   OR registration_id LIKE 'MAYOR-%'
   OR registration_id LIKE 'COL%'
   OR registration_id = '123'
   OR full_name IN (
     'RLS_TEST_DO_NOT_KEEP', 'n a', 'N A'
   );

-- 15. Update municipal_config placeholder values
UPDATE public.municipal_config
SET
  mayor_name = 'Mayor',
  osca_head_name = 'OSCA Head',
  municipality_name = 'Cotabato City'
WHERE id = 1
  AND (mayor_name = 'Hon. Mayor Name'
    OR municipality_name = 'Pangil, Laguna');

SELECT 'OSCALink: Mock data cleanup complete.' AS result;
