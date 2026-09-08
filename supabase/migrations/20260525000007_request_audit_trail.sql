-- ==========================================
-- OSCALink: Request Process Audit Trail
-- Tracks who approved/released each request
-- ==========================================

ALTER TABLE assistance_requests
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by_role TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS released_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS released_by_role TEXT,
  ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ;

SELECT 'Request audit trail columns added.' AS result;
