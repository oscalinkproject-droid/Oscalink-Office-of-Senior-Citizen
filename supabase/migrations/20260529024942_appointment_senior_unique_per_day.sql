-- Prevent a senior from having more than one non-cancelled appointment per day
-- (in Philippines timezone, matching the mobile app's duplicate check logic)

-- First, clean up any existing duplicates (keep earliest, cancel rest)
WITH dup_ids AS (
  SELECT a.id, ROW_NUMBER() OVER (
    PARTITION BY a.senior_id, (a.appointment_date AT TIME ZONE 'Asia/Manila')::date
    ORDER BY a.created_at ASC
  ) AS rn
  FROM public.appointments a
  WHERE a.status != 'Cancelled'
)
UPDATE public.appointments
SET status = 'Cancelled',
    notes = COALESCE(notes || ' | ', '') || 'Auto-cancelled: duplicate per-day booking'
WHERE id IN (SELECT id FROM dup_ids WHERE rn > 1);

-- Partial unique index so each senior can only have one non-cancelled appointment per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_senior_date
ON public.appointments (senior_id, ((appointment_date AT TIME ZONE 'Asia/Manila')::date))
WHERE status != 'Cancelled';
