-- ============================================================
-- OSCALink: DELETE old Pending records still holding "OSC-" identifiers
-- ============================================================
-- DESTRUCTIVE: Permanently removes Pending (pre-approval) records whose
-- registration_id or id_number still uses the legacy official-OSCA-ID format
-- ("OSC-..."). New registrations always store a Temporary Reference Number
-- (REF-...) and a NULL id_number, so only the old, inconsistent Pending rows
-- are targeted here.
--
-- Run in the Supabase SQL Editor, or via `supabase db push`. Use it only once
-- you have verified the affected rows (e.g. via the matching SELECT below).
-- ============================================================

BEGIN;

-- --------------------------------------------------------------------------
-- Preview (run first to confirm scope): the rows this script will DELETE.
-- --------------------------------------------------------------------------
SELECT id, full_name, status, registration_id, id_number
FROM public.seniors
WHERE status IN ('Pending', 'Pending Barangay', 'Pending OSCA', 'Pending Mayor')
  AND (registration_id LIKE 'OSC-%' OR id_number LIKE 'OSC-%');

-- --------------------------------------------------------------------------
-- Actual deletion.
-- --------------------------------------------------------------------------
DELETE FROM public.seniors
WHERE status IN ('Pending', 'Pending Barangay', 'Pending OSCA', 'Pending Mayor')
  AND (registration_id LIKE 'OSC-%' OR id_number LIKE 'OSC-%');

-- --------------------------------------------------------------------------
-- Verification: remaining Pending counts.
-- --------------------------------------------------------------------------
SELECT
  count(*) FILTER (WHERE status IN ('Pending', 'Pending Barangay', 'Pending OSCA', 'Pending Mayor')
                   AND (registration_id LIKE 'OSC-%' OR id_number LIKE 'OSC-%')) AS still_osc_pending,
  count(*) FILTER (WHERE status IN ('Pending', 'Pending Barangay', 'Pending OSCA', 'Pending Mayor')) AS remaining_pending_total
FROM public.seniors;

COMMIT;
