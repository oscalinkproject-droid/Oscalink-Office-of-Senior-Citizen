-- ============================================================
-- OSCALink: Profile Corrections & Appeals Module
-- ============================================================
-- Creates the profile_corrections table to track senior
-- profile correction and appeal requests submitted through
-- the mobile app or dashboard.
-- ============================================================

-- 1. Create profile_corrections table
CREATE TABLE IF NOT EXISTS public.profile_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    senior_id UUID NOT NULL REFERENCES public.seniors(id) ON DELETE CASCADE,
    issue_type TEXT NOT NULL CHECK (issue_type IN (
        'misspelled_name',
        'wrong_birthdate',
        'address_update',
        'appeal'
    )),
    field_to_correct TEXT NOT NULL,
    original_value TEXT NOT NULL,
    requested_correction TEXT NOT NULL,
    remarks_reason TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED_UPDATED', 'REJECTED')),
    processed_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- 2. Enable Row Level Security
ALTER TABLE public.profile_corrections ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Authenticated users (staff) can view all correction requests
CREATE POLICY "Staff can view correction requests"
    ON public.profile_corrections FOR SELECT
    TO authenticated
    USING (true);

-- 4. Policy: Authenticated users can insert correction requests
-- (Seniors via mobile app, or staff manually creating requests)
CREATE POLICY "Can create correction requests"
    ON public.profile_corrections FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 5. Policy: Staff can update correction requests (approve/reject)
CREATE POLICY "Staff can update correction requests"
    ON public.profile_corrections FOR UPDATE
    TO authenticated
    USING (true);

-- 6. Comment for documentation
COMMENT ON TABLE public.profile_corrections IS 'Profile Corrections & Appeals registry for OSCALink. Tracks senior-initiated or staff-initiated profile correction and appeal requests with status tracking and audit logging.';

-- 7. Verification query
SELECT 'OSCALink: Profile Corrections & Appeals table ready.' AS migration_status;