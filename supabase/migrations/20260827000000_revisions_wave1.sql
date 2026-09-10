-- OSCALink Revisions — Wave 1: schema foundations
-- 1. Expanded senior status vocabulary
-- 2. Approval decision + inactivity columns
-- 3. Pensioner sub-type
-- 4. Official ID number + annual-reset sequence
-- 5. Notification channel split (announcement vs status update)
-- 6. Dedup on full_name + birthdate
-- 7. Role taxonomy: super_admin / admin

-- Ensure notifications table exists before ALTER/INDEX statements reference it
CREATE TABLE IF NOT EXISTS public.notifications (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  title                 text        NOT NULL,
  message               text        NOT NULL,
  type                  text        NOT NULL DEFAULT 'info',
  read                  boolean     NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  status                text,
  category              text,
  notification_category text,
  broadcast_id          uuid,
  send_at               timestamptz,
  link                  text,
  reporter_id           uuid,
  parent_id             uuid
);

-- Ensure seniors.birthdate exists before the unique index below references it
ALTER TABLE public.seniors ADD COLUMN IF NOT EXISTS birthdate DATE;

-- ---------------------------------------------------------------------------
-- 1. Status vocabulary
-- ---------------------------------------------------------------------------
ALTER TABLE public.seniors DROP CONSTRAINT IF EXISTS seniors_status_check;
ALTER TABLE public.seniors
  ADD CONSTRAINT seniors_status_check
  CHECK (status = ANY (ARRAY[
    'Active','Pending','Pending Barangay','Pending OSCA','Archived',
    'Deceased','Transferred','Inactive','Disqualified','Cancelled','Disapproved'
  ]::text[]));

-- ---------------------------------------------------------------------------
-- 2. Approval decision + inactivity tracking columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.seniors ADD COLUMN IF NOT EXISTS decision_reason text;
ALTER TABLE public.seniors ADD COLUMN IF NOT EXISTS decision_note text;
ALTER TABLE public.seniors ADD COLUMN IF NOT EXISTS disapproved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.seniors ADD COLUMN IF NOT EXISTS disapproved_at timestamptz;
ALTER TABLE public.seniors ADD COLUMN IF NOT EXISTS disqualified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.seniors ADD COLUMN IF NOT EXISTS disqualified_at timestamptz;
ALTER TABLE public.seniors ADD COLUMN IF NOT EXISTS inactive_reason text;
ALTER TABLE public.seniors ADD COLUMN IF NOT EXISTS inactive_at timestamptz;
ALTER TABLE public.seniors ADD COLUMN IF NOT EXISTS inactive_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 3. Pensioner sub-type
-- ---------------------------------------------------------------------------
ALTER TABLE public.seniors ADD COLUMN IF NOT EXISTS pensioner_type text;
ALTER TABLE public.seniors DROP CONSTRAINT IF EXISTS seniors_pensioner_type_check;
ALTER TABLE public.seniors
  ADD CONSTRAINT seniors_pensioner_type_check
  CHECK (pensioner_type IS NULL OR pensioner_type = ANY (ARRAY['subsidized','government','private']::text[]));

-- ---------------------------------------------------------------------------
-- 4. Official ID number + annual-reset sequence
-- ---------------------------------------------------------------------------
ALTER TABLE public.seniors ADD COLUMN IF NOT EXISTS id_number text;
ALTER TABLE public.seniors ADD COLUMN IF NOT EXISTS id_issue_date date;
CREATE UNIQUE INDEX IF NOT EXISTS seniors_id_number_key
  ON public.seniors (id_number) WHERE id_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.id_sequences (
  year integer PRIMARY KEY,
  last_sequence integer NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION public.next_senior_id_number(p_issue_date date DEFAULT CURRENT_DATE)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_year  int  := extract(year  FROM p_issue_date);
  v_month text := to_char(p_issue_date, 'MM');
  v_seq   int;
BEGIN
  INSERT INTO public.id_sequences (year, last_sequence)
  VALUES (v_year, 1)
  ON CONFLICT (year)
  DO UPDATE SET last_sequence = public.id_sequences.last_sequence + 1
  RETURNING last_sequence INTO v_seq;

  RETURN v_year || '-' || v_month || '-' || v_seq;
END;
$$;

REVOKE ALL ON public.id_sequences FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.next_senior_id_number(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_senior_id_number(date) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Notification channel split
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS notification_category text;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_category_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_category_check
  CHECK (notification_category IS NULL OR notification_category = ANY (ARRAY['announcement','status_update']::text[]));

-- ---------------------------------------------------------------------------
-- 6. Dedup: prevent duplicate profiles by full name + birthdate.
--    Returnees (Cancelled / Transferred) are treated as new applicants,
--    so they are excluded from the dedup index.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS seniors_dedup_name_birthdate
  ON public.seniors (full_name, birthdate)
  WHERE status NOT IN ('Cancelled','Transferred');

-- ---------------------------------------------------------------------------
-- 7. Role taxonomy: super_admin / admin (Admin Staff)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY[
    'super_admin','admin','osca_head','osca_staff',
    'barangay_president','barangay_official','senior_citizen'
  ]::text[]));
