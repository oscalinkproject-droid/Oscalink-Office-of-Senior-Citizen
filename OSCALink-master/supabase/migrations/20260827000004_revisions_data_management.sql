-- OSCALink Revisions — Data Management & Member Status
-- 1. Benefits/disqualification tracking (criteria + indicators)
-- 2. Reference-marker timestamps for Deceased / Cancelled / Transferred
-- 3. Returnee linkage (new record -> cancelled old record)

ALTER TABLE public.seniors ADD COLUMN IF NOT EXISTS benefits_eligible boolean NOT NULL DEFAULT true;
ALTER TABLE public.seniors ADD COLUMN IF NOT EXISTS disqualification_indicators text;
ALTER TABLE public.seniors ADD COLUMN IF NOT EXISTS deceased_at timestamptz;
ALTER TABLE public.seniors ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE public.seniors ADD COLUMN IF NOT EXISTS transferred_at timestamptz;
ALTER TABLE public.seniors ADD COLUMN IF NOT EXISTS replaces_senior_id uuid REFERENCES public.seniors(id) ON DELETE SET NULL;
