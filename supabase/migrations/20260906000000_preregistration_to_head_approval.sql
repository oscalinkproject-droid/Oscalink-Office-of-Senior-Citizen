-- OSCALink Revisions — pre-registration completion workflow
-- 1. New status 'FOR_HEAD_APPROVAL' (OSCA staff completed a mobile pre-registration;
--    forwarded to the OSCA Head / approvals queue)
-- 2. Tracking columns for who/when a pre-registration was completed
-- 3. pre_register_senior now mints a provisional REF-prefixed registration_id so
--    Pending records never carry an OSC- prefix (portable to mobile login after completion)

-- ---------------------------------------------------------------------------
-- 1. Status vocabulary
-- ---------------------------------------------------------------------------
ALTER TABLE public.seniors DROP CONSTRAINT IF EXISTS seniors_status_check;
ALTER TABLE public.seniors
  ADD CONSTRAINT seniors_status_check
  CHECK (status = ANY (ARRAY[
    'Active','Pending','Pending Barangay','Pending OSCA','Pending Mayor',
    'FOR_HEAD_APPROVAL','Archived','Deceased','Transferred','Inactive',
    'Disqualified','Cancelled','Disapproved'
  ]::text[]));

-- ---------------------------------------------------------------------------
-- 2. Completion tracking columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.seniors ADD COLUMN IF NOT EXISTS completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.seniors ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- ---------------------------------------------------------------------------
-- 3. Provisional reference number from the mobile pre-registration RPC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pre_register_senior(
  p_full_name text,
  p_birthdate text,
  p_sex text,
  p_barangay text,
  p_purok text DEFAULT NULL,
  p_contact_number text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_is_pensioner boolean DEFAULT false,
  p_pensioner_type text DEFAULT NULL,
  p_place_of_birth text DEFAULT NULL
)
RETURNS TABLE (id uuid, registration_id text, full_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_reg_id text;
  v_new_id uuid;
  v_random int;
  v_birthdate_clean text;
  v_age int;
BEGIN
  v_birthdate_clean := split_part(TRIM(p_birthdate), 'T', 1);
  v_age := EXTRACT(YEAR FROM age(v_birthdate_clean::date));

  v_random := floor(1000 + random() * 9000)::int;
  v_reg_id := 'REF-' || to_char(now(), 'YYYYMMDD') || '-' || to_char(v_random, 'FM0000');

  INSERT INTO public.seniors (
    full_name, registration_id, birthdate, age, sex, barangay, purok,
    contact_number, address, place_of_birth, status, is_pensioner, pensioner_type, classification
  ) VALUES (
    TRIM(p_full_name), v_reg_id, v_birthdate_clean::date, v_age, p_sex, p_barangay, p_purok,
    p_contact_number, p_address, p_place_of_birth, 'Pending', p_is_pensioner, p_pensioner_type,
    CASE WHEN p_is_pensioner THEN 'Pensioner' ELSE 'Indigent' END
  )
  RETURNING id, registration_id, full_name INTO v_new_id, v_reg_id, p_full_name;

  RETURN QUERY SELECT v_new_id, v_reg_id, TRIM(p_full_name);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.pre_register_senior(text,text,text,text,text,text,text,boolean,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pre_register_senior(text,text,text,text,text,text,text,boolean,text,text) TO anon, authenticated;