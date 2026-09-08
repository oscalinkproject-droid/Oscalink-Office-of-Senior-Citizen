-- OSCALink Revisions — OSCA Head decision workflow for pre-registrations
-- 1. New terminal statuses 'APPROVED' and 'REJECTED'. The OSCA Head may only
--    decide on records awaiting head approval (status 'FOR_HEAD_APPROVAL'),
--    forwarding them to 'APPROVED' (accepted) or 'REJECTED' (refused). The Head
--    does not edit fields, activate records, or issue OSCA ID numbers — those
--    capabilities are removed from the Head dashboard.
-- 2. Tracking columns for who/when a record received a Head decision.

-- ---------------------------------------------------------------------------
-- 1. Status vocabulary
-- ---------------------------------------------------------------------------
ALTER TABLE public.seniors DROP CONSTRAINT IF EXISTS seniors_status_check;
ALTER TABLE public.seniors
  ADD CONSTRAINT seniors_status_check
  CHECK (status = ANY (ARRAY[
    'Active','Pending','Pending Barangay','Pending OSCA','Pending Mayor',
    'FOR_HEAD_APPROVAL','APPROVED','REJECTED','Archived','Deceased',
    'Transferred','Inactive','Disqualified','Cancelled','Disapproved'
  ]::text[]));

-- ---------------------------------------------------------------------------
-- 2. Head decision tracking columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.seniors ADD COLUMN IF NOT EXISTS head_decision_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.seniors ADD COLUMN IF NOT EXISTS head_decision_at timestamptz;